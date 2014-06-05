var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var semver = require('semver');
var sortedObject = require('sorted-object');
var async = require('async');

module.exports = function(pkg, cache_root, options, callback) {
  if (!pkg || !cache_root) {
    return callback(new Error("Must provide pkg and cache_root"));
  }

  if (typeof options == 'function' && arguments.length == 3) {
    callback = options;
    options = undefined;
  }

  options = options || {};

  var readjson = require('read-cortex-json');

  var rootName = pkg.name,
    rootVersion = pkg.version,
    enableDev = options.dev,
    enableAsync = options.async,
    enablePrerelease = options.enablePrerelease === true;

  var holder = new EventEmitter();
  var depCache = {}, verCache = {};

  process.nextTick(function() {
    depCache[rootName + '@' + rootVersion] = mergeDependencies(pkg, true);

    shrinkPackage(rootName, rootVersion, function(name, range, callback) {
        if (name == rootName && range == rootVersion) {
          return process.nextTick(callback.bind(null, null, range, depCache[name + '@' + range]));
        }

        readVersions(name, function(err, versions) {
          if (err) return callback(err);

          var ver = semver.maxSatisfying(versions, range);
          if (!ver) {
            // TODO: whether go to registry, issue #1
            return callback({
              message: "Can not resolve package " + name + " from range: " + range + " in available versions: " + versions
            });
          }


          var pkgDir = path.join(cache_root, name, ver, 'package');
          var swPath = path.join(pkgDir, 'cortex-shrinkwrap.json');
          fs.exists(swPath, function(exists) {
            if (exists) {
              fs.readFile(swPath, 'utf8', function(err, content) {
                var s;
                try {
                  s = JSON.parse(content);
                } catch (e) {
                  e.message = "Error when read: " + swPath + " " + e.message;
                  return callback(e);
                }

                callback(null, ver, s.dependencies, true);
              });
            } else {
              readjson.get_original_package(pkgDir, function(err, pkg) {
                if (err) return callback(err);
                callback(null, ver, depCache[name + "@" + ver] = mergeDependencies(pkg));
              });
            }
          });
        });

      },
      function(err, shrinked) {
        if (err) return callback(err);

        // resolve engines
        var engines;
        var taskEngs = {};

        for (var name in (pkg.engines || {})) {
          (function(range) {
            taskEngs[name] = function(cb) {
              readVersions(name, function(err, versions) {
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
          rs.name = rootName;
          rs.version = rootVersion;

          if (!isEmptyObject(results)) {
            rs.engines = results;
          }

          if (!isEmptyObject(shrinked.dependencies))
            if (!isEmptyObject(shrinked.dependencies))
              rs.dependencies = shrinked.dependencies;

          callback(err, rs);
        });
      });
  });

  return holder;


  function readVersions(name, cb) {
    // no multi process
    if (verCache[name]) {
      cb(null, verCache[name]);
    } else {
      var pkg_root = path.join(cache_root, name);
      fs.exists(pkg_root, function(exists) {
        if (!exists)
          return cb({
            message: "No pacakge '" + name + "' installed, please run 'cortex install' first"
          });
        fs.readdir(pkg_root, function(err, files) {
          if (err) return cb(err);

          var vers = files.filter(semver.valid);
          if (!enablePrerelease) {
            vers = vers.filter(function(ver) {
              return ver.indexOf('-') == -1;
            });
          }

          cb(null, verCache[name] = vers);
        });
      });
    }
  }

  function mergeDependencies(pkg, isRoot) {
    var dependencies = {};
    if (pkg.dependencies) {
      for (var d in pkg.dependencies) {
        dependencies[d] = pkg.dependencies[d];
      }
    }

    if (isRoot) {
      if (enableDev) {
        var devDependencies = pkg.devDependencies || {};
        for (var d in devDependencies) {
          dependencies[d] = devDependencies[d];
        }
      } else if (!isEmptyObject(pkg.devDependencies)) {
        for (var d in pkg.devDependencies) {
          holder.emit("ignoreDev", d);
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
        holder.emit("ignoreAsync", ad);
      }
    }

    return sortedObject(dependencies);
  }
};


function shrinkPackage(pkgName, range, findDeps, callback) {
  var tasks = {};

  findDeps(pkgName, range, function(err, version, dependencies, nested) {
    if (err) return callback(err);
    if (nested) {

      if (isEmptyObject(dependencies)) {
        return callback(null, {
          from: pkgName + '@' + range,
          version: version
        });
      } else {
        return callback(null, {
          from: pkgName + '@' + range,
          version: version,
          dependencies: dependencies
        });
      }
    }

    for (var name in dependencies) {
      (function(name, range) {
        tasks[name] = function(cb) {
          shrinkPackage(name, range, findDeps, function(err, shrink) {
            cb(err, shrink);
          });
        };
      })(name, dependencies[name]);
    }

    async.parallel(tasks, function(err, rs) {
      if (err) return callback(err);
      if (isEmptyObject(rs)) {
        callback(null, {
          from: pkgName + '@' + range,
          version: version
        });
      } else {
        callback(null, {
          from: pkgName + '@' + range,
          version: version,
          dependencies: rs
        });
      }
    });
  });
}


function isEmptyObject(obj) {
  if (!obj) return true;
  for (var p in obj) {
    if (obj.hasOwnProperty(p))
      return false;
  }

  return true;
}
