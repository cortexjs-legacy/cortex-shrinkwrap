#!/usr/bin/env node

var fs = require('fs'),
  util = require('util'),
  readjson = require('read-cortex-json'),
  path = require('path');


var argv = require('minimist')(process.argv.slice(2));

if (argv.version || argv.v) {
  var pkg = require('../package.json');
  process.stdout.write(pkg.version + '\n');
  process.exit(0);
}


if (argv.help || argv.h) {
  // help text
  var help = ["Usage: cortex shrinkwrap [--dev] [--async] [options]",
    "", "Options:", "  -v, --version\t\tprint version",
    "  -h, --help\tshow help",
    "  --dev, --no-dev\tshrinkwrap devDependencies or not",
    "  --async, --no-async\tshrinkwrap asyncDependencies or not, default is true",
    "  --enable-prerelease\tshrinkwrap will accept pre-release version in dependency analyze, default false"
  ];
  process.stdout.write(help.join("\n"));
  process.exit(0);
}


var dev = argv.dev,
  async = argv.async,
  enablePrerelease = argv['enable-prerelease'];

if (async === undefined) // async default to true
  async = true;

readjson.repo_root(process.cwd(), function(cwd) {
  // find cwd
  if (cwd) {
    var profile = require('cortex-profile')().init();
    readjson.get_original_package(cwd, function(err, pkg) {
      err && onError(err);


      var profile = require('cortex-profile')().init(),
        logger = require('loggie')({
          // export CORTEX_LOG_LEVEL=debug,info,error,warn
          /* jshint sub:true */
          level: process.env['CORTEX_LOG_LEVEL'] || ['info', 'error', 'fatal', 'warn'],
          // if the current process exit before `logger.end()` called, there will throw an error message
          use_exit: false,
          catch_exception: false,
          colors: profile.get('colors')
        });

      var sh = require('../lib')(pkg, profile.get('cache_root'), {
        dev: dev,
        async: async,
        profile: profile,
        enablePrerelease: enablePrerelease
      }, function(err, shrinkwrap) {
        if (err) {
          onError(err);
        }


        fs.writeFile(path.join(cwd, 'cortex-shrinkwrap.json'), JSON.stringify(shrinkwrap, null, 2), function(err) {
          err && onError(err);
          process.stdout.write('wrote cortex-shrinkwrap.json\n');
        });
      });

      sh.on('ignoreAsync', function(ad) {
        logger && logger.warn('Exclude asyncDependencies: ' + ad);
      });

      sh.on('ignoreDev', function(d) {
        logger && logger.warn('Exclude devDependencies: ' + d);
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