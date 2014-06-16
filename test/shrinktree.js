var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var shrinktree = require('../lib').shrinktree;

describe('test shrinkwrap package', function() {
  var cache_root = path.resolve(__dirname, './cache_root');

  it('simple package', function(done) {
    shrinktree('deep-eql', "~0.1.1", cache_root, function(err, tree) {
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
    }, cache_root, function(err, shrinked) {
      if (err) return done(err);
      assert(shrinked.dependencies);
      var typed = shrinked.dependencies['type-detect'];
      assert(!typed.dependencies);
      done(err);
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
      }
    }, cache_root, function(err, shrinked) {
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

      done(err);
    });

  });
});