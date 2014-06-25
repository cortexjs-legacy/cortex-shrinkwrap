var path = require('path');
var fs = require('fs');
var semver = require('semver');
var async = require('async');
var depTravel = require('cortex-deps-traveller');

var Visitor = depTravel.Visitor;


module.exports = function(name, from, options, callback) {
  var pkg;
  if (arguments.length <= 3 && typeof name != 'string') {
    pkg = name;
    callback = options;
    options = from;
    from = undefined;
  }

  if (typeof options == 'function') {
    callback = options;
    options = undefined;
  }

  options = options || {};

  var cache_root = options.cache_root;
  var built_root = options.built_root;

  if (!cache_root || built_root)
    return callback(new Error("Must provide cache_root and built_root"));

  var merge = !! options.merge;
  delete options.merge;


  var traveller = depTravel(cache_root, options);
  var trees = {};

  async.waterfall([

    function(cb) {
      if (pkg) return cb(null, pkg, null);

      traveller.resolveRange(name, from, function(err, version) {
        var pkgDir = path.join(cache_root, name, version, 'package');
        var swFile = path.join(pkgDir, 'cortex-shrinkwrap.json');
        fs.exists(swFile, function(exists) {
          if (exists) {
            fs.readFile(swFile, 'utf8', function(err, content) {
              if (err) return cb(err);
              try {
                var json = JSON.parse(content);
                delete json.engines;
                delete json.name;
                if (from) json.from = name + '@' + from;
                return cb(null, null, json);
              } catch (err) {
                return cb(err);
              }
            });
          } else {
            traveller.resolvePackage(name, from, function(err, pkg) {
              return cb(err, pkg, null);
            });
          }
        });
      });
    },
    function(pkg, json, cb) {
      if (json) {
        return cb(null, json);
      }

      traveller.visit(pkg, {
        enter: function(node, parent) {
          var ret;
          var key = node.pkg.name + '@' + node.pkg.version + node.from;

          /* jshint eqnull:true */
          if (parent != null) { // not root
            var pkgDir = path.join(this.cache_root, node.pkg.name, node.pkg.version, 'package');
            var swFile = path.join(pkgDir, 'cortex-shrinkwrap.json');
            if (fs.existsSync(swFile)) {
              var swObj;
              try {
                swObj = JSON.parse(fs.readFileSync(swFile, 'utf8'));
              } catch (err) {
                throw err;
              }

              if (!trees[key]) {
                trees[key] = {
                  from: node.pkg.name + '@' + node.from,
                  version: node.pkg.version
                };

                if (swObj.dependencies) {
                  trees[key].dependencies = swObj.dependencies;
                }


                if (swObj.asyncDependencies) {
                  if (merge) {
                    tree[key].dependencies = (tree[key].dependencies || []).concat(swObj.asyncDependencies);
                  } else
                    trees[key].asyncDependencies = swObj.asyncDependencies;
                }
              }

              ret = Visitor.BREAK;
            }
          }

          if (!trees[key]) {
            trees[key] = {
              from: node.pkg.name + '@' + node.from,
              version: node.pkg.version
            };
          }

          var n = trees[key];

          if (parent) {
            var pkey = parent.pkg.name + '@' + parent.pkg.version + parent.from;
            if (!trees[pkey]) {
              trees[pkey] = {
                from: parent.pkg.name + '@' + parent.from,
                version: parent.pkg.version
              };
            }

            var p = trees[pkey];
            p.dependencies = p.dependencies || {};


            if (parent.pkg.dependencies && parent.pkg.dependencies.hasOwnProperty(node.pkg.name)) {
              p.dependencies[node.pkg.name] = n;
            } else if (parent.pkg.asyncDependencies && parent.pkg.asyncDependencies.hasOwnProperty(node.pkg.name)) {
              if (!merge) {
                p.asyncDependencies = p.asyncDependencies || {};
                p.asyncDependencies[node.pkg.name] = n;
              } else {
                p.dependencies[node.pkg.name] = n;
              }
            } else {
              p.dependencies[node.pkg.name] = n;
            }
          }

          return ret;
        }
      }, function(err) {
        if (err) return cb(err);
        var pkgKey = pkg.name + '@' + pkg.version + undefined;
        var json = trees[pkgKey];
        if (from) json.from = pkg.name + '@' + from;
        cb(null, json);
      });
    }
  ], callback);

  return traveller;
};