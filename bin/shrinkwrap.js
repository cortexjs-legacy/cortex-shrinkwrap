#!/usr/bin/env node

var fs = require('fs'),
  util = require('util'),
  readjson = require('read-cortex-json'),
  path = require('path');


var argv = require('minimist')(process.argv.slice(2));

if (argv.version || argv.v) {
  var pkg = require('../package.json');
  process.stdout.write([pkg.name, 'v' + pkg.version].join(' ') + "\n");
  process.exit(0);
}


if (argv.help || argv.h) {
  // help text
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

readjson.repo_root(process.cwd(), function(cwd) {
  // find cwd
  if (cwd) {
    readjson.get_original_package(cwd, function(err, pkg) {
      err && onError(err);

      require('../lib')(pkg, {
        dev: dev,
        async: async
      }, function(err, shrinkwrap) {
        if (err) {
          onError(err);
        }

        fs.writeFile(path.join(cwd, 'cortex-shrinkwrap.json'), JSON.stringify(shrinkwrap, null, 4), function(err) {
          err && onError(err);
          process.stdout.write('wrote cortex-shrinkwrap.json\n');
        });
      });
    });
  } else {
    onError(new Error("Can not find cortex.json/package.json in path: " + process.cwd()));
  }
});


function onError(err) {
  if (err) {
    process.stderr.write((err.message || err) + "\n");
    err.stack && process.stderr.write(err.stack + "\n");
    process.exit(1);
  }
}