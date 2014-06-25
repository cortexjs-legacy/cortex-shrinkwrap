var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var shrinktree = require('../lib').shrinktree;

describe('test shrinkwrap package', function() {
  var cache_root = path.resolve(__dirname, './cache_root');
  var built_root = cache_root;

  it('simple package', function(done) {
    shrinktree('deep-eql', "~0.1.1", {
      cache_root: cache_root,
      built_root: built_root
    }, function(err, tree) {
      if (err) return done(err);
      assert.equal(tree.version, '0.1.3');
      assert.equal(tree.from, 'deep-eql@~0.1.1');
      assert(tree.dependencies);
      assert(tree.dependencies['type-detect']);
      done(err);
    });
  });


  it('no nested devDependencies', function(done) {
    shrinktree({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      dependencies: {
        "type-detect": "~0.1.0"
      },
      devDependencies: {
        "util": "~1.0.0"
      }
    }, {
      cache_root: cache_root,
      built_root: built_root
    }, function(err, shrinked) {
      if (err) return done(err);
      assert(shrinked.dependencies);
      var typed = shrinked.dependencies['type-detect'];
      assert(!typed.dependencies);
      done(err);
    });
  });

  it('nested asyncDependencies', function(done) {
    shrinktree({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      asyncDependencies: {
        "deep-eql": "~0.1.2"
      }
    }, {
      cache_root: cache_root,
      built_root: built_root,
      async: true
    }, function(err, shrinked) {
      if (err) return done(err);
      assert.equal(shrinked.version, "0.1.0");

      assert(shrinked.asyncDependencies['deep-eql']);
      assert(shrinked.asyncDependencies['deep-eql'].asyncDependencies);

      done();
    });
  });

  it('nested shrinkwrap', function(done) {
    shrinktree({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      dependencies: {
        "util": "~1.0.0",
        "dep-test": "~1.0.0"
      },
      asyncDependencies: {
        "json": "~1.0.0"
      }
    }, {
      async: true,
      cache_root: cache_root,
      built_root: built_root
    }, function(err, shrinked) {
      if (err) return done(err);

      assert.equal(shrinked.version, '0.1.0');
      assert(shrinked.dependencies);

      var util = shrinked.dependencies.util;
      assert.equal(util.from, "util@~1.0.0");
      assert.equal(util.version, "1.0.5");

      var depTest = shrinked.dependencies['dep-test'];
      var util = depTest.dependencies.util;

      assert.equal(util.from, "util@~1.0.0");
      assert.equal(util.version, "1.0.4");

      var json = shrinked.asyncDependencies.json;
      assert(json);
      assert.equal(json.from, "json@~1.0.0");
      assert.equal(json.version, "1.0.1");

      done(err);
    });

  });
});