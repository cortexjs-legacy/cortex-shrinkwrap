var async = require('async');

module.exports = function(pkg, options, callback) {
    if (typeof options == 'function' && arguments.length == 2) {
        callback = options;
        options = undefined;
    }

    var profile = require('cortex-profile')().init();
    var built_root = profile.get('built_root');



    var name = pkg.name,
        version = pkg.version,
        dependencies = pkg.dependencies || [],
        devDependencies = pkg.devDependencies || [];

    var shrinkwrap = {
        name: name,
        version: version
    };

    callback(null, {});


};


function shrinkPackage(shrink, dependencies, callback) {
    shrink.dependencies = {};

    async.parallel(Object.keys(dependencies).map(function(name) {
        return function(cb) {
            // read data
            var shirnk = {
                from: dependencies[name]
            };

            // read dependencies
            shrinkPackage(shrink, [], function(err, shrink) {
                cb(null, shrink);
            });
        };
    }), function(err, rs) {
        // add dependencies
        shrink.dependencies;

        callback(null, shrink);
    });
}