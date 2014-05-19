#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    path = require('path');


var argv = require('minimist')(process.argv.slice(2));

if (argv.version || argv.v) {
    var pkg = require('../package.json');
    console.log([pkg.name, 'v' + pkg.version].join(' '));
    process.exit(0);
}


var dev = argv.dev;


var cwd = process.cwd();

// console.log(built_root, cwd, process.argv);

var pkg_file = path.join(cwd, 'package.json');


var pkg_file = path.join(cwd, 'package.json');


fs.exists(pkg_file, function(exists) {
    if (!exists) {
        process.stderr.write("Can not find 'package.json' file in current directory\n");
        process.exit(1);
    }

    var pkg;
    try {
        pkg = require(pkg_file);
    } catch (e) {
        process.stderr.write("Error when read package.json:" + e.message + "\n");
        process.stderr.write(e.stack + "\n");
        process.exit(1);
    }

    require('../lib')(pkg, function(err, shrinkwrap) {
        if (err) {
            process.stderr.write(e.message + "\n");
            process.stderr.write(e.stack + "\n");
            process.exit(1);
        }
    });
});