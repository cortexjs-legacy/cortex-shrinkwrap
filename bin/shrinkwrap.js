#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    path = require('path');


var argv = require('minimist')(process.argv.slice(2));

if (argv.version || argv.v) {
    var pkg = require('../package.json');
    process.stdout.write([pkg.name, 'v' + pkg.version].join(' ') + "\n");
    process.exit(0);
}


if (argv.help || argv.h) {
    var help = ["Usage: cortex shrinkwrap [--dev] [--async] [options]",
        "", "Options:", "  -v, --version\t\tprint version",
        "  -h, --help\tshow help",
        "  --dev, --no-dev\tshrinkwrap devDependencies or not",
        "  --async, --no-async\tshrinkwrap asyncDependencies or not, default is true"
    ];
    process.stdout.write(help.join("\n"));
    process.exit(0);
}


var dev = argv.dev,
    async = argv.async;

if (async === undefined) // async default to true
    async = true;

require('../lib/read-json')(process.cwd(), function(err, pkg) {
    if (err) {
        process.stderr.write(err.message);
        e.stack && process.stderr.write(e.stack + "\n");
        process.exit(1);
    }

    require('../lib')(pkg, {
        dev: dev,
        async: async
    }, function(err, shrinkwrap) {
        if (err) {
            process.stderr.write(e.message + "\n");
            e.stack && process.stderr.write(e.stack + "\n");
            process.exit(1);
        }

        // console.log(JSON.stringify(shrinkwrap, null, 4));
    });
});