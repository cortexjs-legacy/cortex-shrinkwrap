var async = require('async');
var fs = require('fs'),
  semver = require('semver'),
  sortedObject = require('sorted-object'),
  path = require('path');

module.exports = function(pkg, options, callback) {
  if (typeof options == 'function' && arguments.length == 2) {
    callback = options;
    options = undefined;
  }

  options = options || {};


  var profile = options.profile || require('cortex-profile')().init();
  var logger = options.logger;
  var readjson = require('read-cortex-json');

  var cache_root = profile.get('cache_root');
  var rootName = pkg.name,
    rootVersion = pkg.version,
    dev = options.dev,
    async = options.async;

  var ignoredDevs = {}, ignoredAsyncs = {};


  var depCache = {}, verCache = {};
  depCache[rootName + '@' + rootVersion] = mergeDependencies(pkg);


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
            message: "Can not resolve range: " + range + " in available versions: " + versions
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
      var ens = [];
      for (var engine in pkg.engines || {}) {
        (function(name, range) {
          ens.push(function(done) {
            readVersions(name, function(err, versions) {
              if (err) return done(err);

              var ver = semver.maxSatisfying(versions, range);
              if (!ver) {
                // TODO: whether go to registry, issue #1
                return done({
                  message: "Can not resolve range: " + range + " in available versions: " + versions
                });
              }

              done(null, name, ver, range);
            });
          });
        })(engine, pkg.engines[engine]);
      }

      var engines;
      (function runEns() {
        var en = ens.pop();
        if (en) {
          engines = engines || {};
          en(function(err, name, version, range) {
            if (err) return callback(err);

            engines[name] = {
              from: [name, range].join('@'),
              version: version
            };

            runEns();
          });
        } else {
          // final
          Object.keys(ignoredDevs).forEach(function(d) {
            logger && logger.warn('Exclude devDependencies: ' + d);
          });

          Object.keys(ignoredAsyncs).forEach(function(ad) {
            logger && logger.warn('Exclude asyncDependencies: ' + ad);
          });

          var rs = {};

          rs.name = rootName;
          rs.version = rootVersion;

          if (!isEmptyObject(engines)) {
            rs.engines = engines;
          }

          if (!isEmptyObject(shrinked.dependencies))
            rs.dependencies = shrinked.dependencies;

          callback(err, rs);
        }
      })();
    });


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
          cb(null, verCache[name] = files.filter(semver.valid));
        });
      });
    }
  }

  function mergeDependencies(pkg) {
    var dependencies = {};
    if (pkg.dependencies) {
      for (var d in pkg.dependencies) {
        dependencies[d] = pkg.dependencies[d];
      }
    }


    if (dev) {
      var devDependencies = pkg.devDependencies || {};
      for (var d in devDependencies) {
        dependencies[d] = devDependencies[d];
      }
    } else if (!isEmptyObject(pkg.devDependencies)) {
      for (var d in pkg.devDependencies) {
        ignoredDevs[d] = true;
      }
    }

    if (async) {
      var asyncDependencies = pkg.asyncDependencies || {};
      for (var ad in asyncDependencies) {
        dependencies[ad] = asyncDependencies[ad];
      }
    } else if (pkg.asyncDependencies) {
      for (var ad in pkg.asyncDependencies) {
        ignoredAsyncs[ad] = true;
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
        }
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