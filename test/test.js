var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var shrinkwrap = require('../lib');

describe('test shrinkwrap package', function() {
  var built_root = path.resolve(__dirname, './built_root');


  it('cycle', function(done) {
    shrinkwrap({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      dependencies: {
        "a": "~1.0.0",
        "mixed": "*"
      }
    }, built_root, function(err, shrinked) {
      if (err) return done(err);
      assert.equal(shrinked.name, 'test-pkg');
      assert.equal(shrinked.version, '0.1.0');
      // assert(shrinked.engines.neuron);
      // assert.equal(shrinked.engines.neuron.from, "neuron@*");
      // assert.equal(shrinked.engines.neuron.version, "5.0.0");
      done(err);
    });
  });

  it('simple package', function(done) {
    shrinkwrap({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      dependencies: {}
    }, built_root, function(err, shrinked) {
      if (err) return done(err);
      assert.equal(shrinked.name, 'test-pkg');
      // assert.equal(shrinked.version, '0.1.0');
      // assert(shrinked.engines.neuron);
      // assert.equal(shrinked.engines.neuron.from, "neuron@*");
      // assert.equal(shrinked.engines.neuron.version, "5.0.0");
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
    }, built_root, function(err, shrinked) {
      if (err) return done(err);
      assert(shrinked.dependencies);
      var typed = shrinked.dependencies['type-detect'];
      assert.equal(typed.version, "0.1.3-beta");
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
    }, built_root, function(err, shrinked) {
      if (err) return done(err);
      assert.equal(shrinked.name, 'test-pkg');
      // assert.equal(shrinked.version, '0.1.0');
      assert(shrinked.dependencies);

      var util = shrinked.dependencies.util;
      assert.equal(util.from, "util@~1.0.0");
      assert.equal(util.version, "1.0.5");

      var depTest = shrinked.dependencies['dep-test'];
      util = depTest.dependencies.util;

      assert.equal(util.from, "util@~1.0.0");
      assert.equal(util.version, "1.0.4");

      done(err);
    });
  });


  it('stable only', function(done) {
    shrinkwrap({
      name: 'test-pkg',
      version: "0.1.0",
      engines: {
        "neuron": "*"
      },
      dependencies: {},
      asyncDependencies: {
        'type-detect': "~0.1.0"
      }
    }, built_root, {
      async: true
    }, function(err, shrinked) {
      if (err) return done(err);
      // assert(shrinked.engines.neuron);
      // assert.equal(shrinked.engines.neuron.from, "neuron@*");
      // assert.equal(shrinked.engines.neuron.version, "5.1.0-beta");
      assert(!shrinked.dependencies);
      assert(shrinked.asyncDependencies);

      assert(shrinked.asyncDependencies['type-detect']);
      assert.equal(shrinked.asyncDependencies['type-detect'].from, "type-detect@~0.1.0");
      assert.equal(shrinked.asyncDependencies['type-detect'].version, "0.1.3-beta");
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
      }, built_root, {
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

    if (sh) {
      sh.on('ignoreDev', function(d) {
        ignores.push(d);
      });
      sh.on('ignoreAsync', function(d) {
        ignores.push(d);
      });
    }

  });


  it('ignoreDev', function(done) {
    var ignoreDevs = [];
    var sh = shrinkwrap({
      name: 'test-pkg',
      version: "0.1.0",
      devDependencies: {
        "assert": "~1.0.0"
      }
    }, built_root, function(err, shrinked) {
      if (err) return done(err);
      assert.equal(ignoreDevs.length, 1);
      assert.equal(ignoreDevs[0], "assert");
      assert(!shrinked.dependencies);
      done(err);
    });

    if (sh) {
      sh.on('ignoreDev', function(d) {
        ignoreDevs.push(d);
      });
    }

  });
});