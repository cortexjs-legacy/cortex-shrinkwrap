var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var shrinkwrap = require('../lib');

describe('test shrinkwrap package', function() {
  var cache_root = path.resolve(__dirname, './cache_root');

  it('simple package', function(done) {
    shrinkwrap({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      dependencies: {}
    }, cache_root, function(err, shrinked) {
      if (err) return done(err);
      assert.equal(shrinked.name, 'test-pkg');
      assert.equal(shrinked.version, '0.1.0');
      assert(shrinked.engines.neuron);
      assert.equal(shrinked.engines.neuron.from, "neuron@*");
      assert.equal(shrinked.engines.neuron.version, "5.0.0");
      assert(!shrinked.dependencies);
      done(err);
    });
  });


  it('no nested devDependencies', function(done) {
    shrinkwrap({
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
    shrinkwrap({
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
      assert.equal(shrinked.name, 'test-pkg');
      assert.equal(shrinked.version, '0.1.0');
      assert(shrinked.engines.neuron);
      assert.equal(shrinked.engines.neuron.from, "neuron@*");
      assert.equal(shrinked.engines.neuron.version, "5.0.0");
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


  it('enable prerelease', function(done) {
    shrinkwrap({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      dependencies: {},
      asyncDependencies: {
        'util': "~1.0.0"
      }
    }, cache_root, {
      enablePrerelease: true,
      async: true
    }, function(err, shrinked) {
      if (err) return done(err);
      assert(shrinked.engines.neuron);
      assert.equal(shrinked.engines.neuron.from, "neuron@*");
      assert.equal(shrinked.engines.neuron.version, "5.1.0-beta");
      assert(!shrinked.dependencies);
      assert(shrinked.asyncDependencies);

      assert(shrinked.asyncDependencies.util);
      done(err);
    });
  });


  it('ignoreAsync', function(done) {
    var ignores = [];
    var sh = shrinkwrap({
        name: 'test-pkg',
        version: "0.1.0",
        devDependencies: {
          "assert": "~1.0.0"
        },
        asyncDependencies: {
          'util': "~1.0.0"
        }
      }, cache_root, {
        dev: true,
        async: true,
        merge: true
      },
      function(err, shrinked) {
        if (err) return done(err);
        assert.equal(ignores.length, 0);
        assert(shrinked.dependencies);
        var util = shrinked.dependencies.util;
        assert.equal(util.from, "util@~1.0.0");
        assert.equal(util.version, "1.0.5");
        assert(util.dependencies);
        done(err);
      });

    sh.on('ignoreDev', function(d) {
      ignores.push(d);
    });
    sh.on('ignoreAsync', function(d) {
      ignores.push(d);
    });

  });


  it('ignoreDev', function(done) {
    var ignoreDevs = [];
    var sh = shrinkwrap({
      name: 'test-pkg',
      version: "0.1.0",
      devDependencies: {
        "assert": "~1.0.0"
      }
    }, cache_root, function(err, shrinked) {
      if (err) return done(err);
      assert.equal(ignoreDevs.length, 1);
      assert.equal(ignoreDevs[0], "assert");
      assert(!shrinked.dependencies);
      done(err);
    });

    sh.on('ignoreDev', function(d) {
      ignoreDevs.push(d);
    });

  });
});