var path = require('path');
var fs = require('fs');
var semver = require('semver');
var async = require('async');
var sortedObject = require('sorted-object');
var depTravel = require('cortex-deps-traveller');
var shrinktree = require('./shrinktree');

var Visitor = depTravel.Visitor;

module.exports = function(pkg, built_root, options, callback) {

  if (typeof options == 'function' && arguments.length == 3) {
    callback = options;
    options = undefined;
  }

  options = options || {};

  if (!pkg || !built_root) {
    return callback(new Error("Must provide pkg and built_root"));
  }

  var enableDev = options.dev;
  var enableAsync = options.async !== false; // default to true
  var stableOnly = options.stable_only !== false; // deafult to true
  var merge = !! options.merge;

  if (options.hasOwnProperty('enablePrerelease'))
    stableOnly = !options.enablePrerelease;


  var firstRoot = true;
  var traveller = shrinktree(pkg, built_root, {
    stable_only: stableOnly,
    merge: merge,
    pkgDeps: function(pkg) {
      var dependencies = {};
      if (pkg.dependencies) {
        for (var d in pkg.dependencies) {
          dependencies[d] = pkg.dependencies[d];
        }
      }

      if (firstRoot) {
        firstRoot = false;
        if (enableDev) {
          var devDependencies = pkg.devDependencies || {};
          for (var d in devDependencies) {
            dependencies[d] = devDependencies[d];
          }
        } else if (!isEmptyObject(pkg.devDependencies)) {
          for (var d in pkg.devDependencies) {
            this.emit("ignoreDev", d);
          }
        }
      }


      if (enableAsync) {
        var asyncDependencies = pkg.asyncDependencies || {};
        for (var ad in asyncDependencies) {
          dependencies[ad] = asyncDependencies[ad];
        }
      } else if (pkg.asyncDependencies) {
        for (var ad in pkg.asyncDependencies) {
          this.emit("ignoreAsync", ad);
        }
      }

      return sortedObject(dependencies);
    }
  }, function(err, json) {
    if (err) return callback(err);
    delete json.from;
    json.name = pkg.name;

    // resolve engines
    var engines;
    var taskEngs = {};

    for (var name in (pkg.engines || {})) {
      (function(range) {
        taskEngs[name] = function(cb) {
          traveller.readVersions(name, function(err, versions) {
            if (err) return cb(err);
            var ver = semver.maxSatisfying(versions, range);
            if (!ver) {
              return cb({
                message: "Can not resolve engine " + name + " from range: " + range + " in available versions: " + versions
              });
            }

            cb(null, {
              from: [name, range].join('@'),
              version: ver
            });
          });
        };
      })(pkg.engines[name]);
    }

    async.parallel(taskEngs, function(err, results) {
      if (err) return callback(err);

      var rs = {};
      rs.name = json.name;
      rs.version = json.version;

      if (!isEmptyObject(results)) {
        rs.engines = results;
      }

      if (!isEmptyObject(json.dependencies))
        rs.dependencies = json.dependencies;

      if (!isEmptyObject(json.asyncDependencies))
        rs.asyncDependencies = json.asyncDependencies;

      callback(err, rs);
    });
  });

  return traveller;
};


module.exports.shrinktree = require('./shrinktree');

function isEmptyObject(obj) {
  if (!obj) return true;
  for (var p in obj) {
    if (obj.hasOwnProperty(p))
      return false;
  }

  return true;
}