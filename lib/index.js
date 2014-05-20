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
  var logger = options.logger || require('loggie')({
    // export CORTEX_LOG_LEVEL=debug,info,error,warn
    level: process.env['CORTEX_LOG_LEVEL'] || ['info', 'error', 'fatal', 'warn'],
    // if the current process exit before `logger.end()` called, there will throw an error message
    use_exit: false,
    catch_exception: false,
    colors: profile.get('colors')
  });

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

      readVersions(function(err, versions) {
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

      function readVersions(cb) {
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
    },
    function(err, shrinked) {
      // console.log(JSON.stringify(shrinked, null, 4));
      Object.keys(ignoredDevs).forEach(function(d) {
        logger.warn('Exclude devDependencies: ' + d);
      });

      Object.keys(ignoredAsyncs).forEach(function(ad) {
        logger.warn('Exclude asyncDependencies: ' + ad);
      });

      callback(err, {
        name: rootName,
        version: rootVersion,
        dependencies: shrinked.dependencies
      });
    });


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
      console.log(pkg.name, pkg.version);
      for (var d in pkg.devDependencies) {
        ignoredDevs[d] = true;
      }
    }

    if (async) {
      var asyncDependencies = pkg.asyncDependencies || {};
      for (var ad in asyncDependencies) {
        dependencies[d] = asyncDependencies[d];
      }
    } else if (pkg.asyncDependencies) {
      for (var ad in pkg.devDependencies) {
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