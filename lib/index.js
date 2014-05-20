var async = require('async'),
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


    var cache_root = profile.get('cache_root');
    var name = pkg.name,
        version = pkg.version,
        dev = options.dev,
        async = options.async;


    var dependencies = mergeDependencies(pkg);

    var shrinked = {
        name: name,
        version: version
    };

    shrinkPackage(name, shrinked, function(name, shrink, callback) {
        if (shrink === shrinked) {
            return process.nextTick(callback.bind(null, null, dependencies));
        }

        var package_path = path.join(cache_root, name);

        console.log(name, shrink, package_path);


        callback(null, {});

    }, function(err, shrinked) {
        console.log(JSON.stringify(shrinked, null, 4));
        callback(err, shrinked);
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
        } else if (pkg.devDependencies) {
            for (var d in pkg.devDependencies) {
                logger.warn('Exclude devDependencies: ' + d);
            }
        }

        if (async) {
            var asyncDependencies = pkg.asyncDependencies || {};
            for (var ad in asyncDependencies) {
                dependencies[d] = asyncDependencies[d];
            }
        } else if (pkg.asyncDependencies) {
            for (var ad in pkg.devDependencies) {
                logger.warn('Exclude asyncDependencies: ' + ad);
            }
        }
        return dependencies;
    }
};



function shrinkPackage(name, shrink, findDeps, callback) {
    var tasks = {},
        range = shrink.version || shrink.from;


    findDeps(name, shrink, function(err, dependencies) {
        for (var name in dependencies) {
            (function(name, from) {
                tasks[name] = function(cb) {
                    shrinkPackage(name, {
                        from: from
                    }, findDeps, function(err, shrink) {
                        cb(err, shrink);
                    });
                }
            })(name, dependencies[name]);
        }

        async.parallel(tasks, function(err, rs) {
            // add dependencies
            shrink.dependencies = rs;
            callback(null, shrink);
        });
    });
}