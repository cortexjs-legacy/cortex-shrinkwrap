var path = require('path');
var assert = require('assert');
var _ = require('underscore');
var shrinktree = require('../lib').shrinktree;

describe('test shrinkwrap cycle', function() {
  var built_root = path.resolve(__dirname, './built_root');


  it('self reference', function(done) {
    shrinktree('cycle', "~1.0.0", built_root, function(err, tree) {
      if (err) return done(err);
      assert.equal(tree.version, '1.0.0');
      assert.equal(tree.from, 'cycle@~1.0.0');
      assert(tree.dependencies);
      assert(tree.dependencies['cycle']);
      done(err);
    });
  });


  it('mixed', function(done) {
    shrinktree('mixed', "~1.0.0", built_root, function(err, tree) {
      if (err) return done(err);

      assert.equal(tree.version, '1.0.0');
      assert.equal(tree.from, 'mixed@~1.0.0');
      assert(tree.dependencies.a);
      assert(tree.dependencies.a.dependencies.b);
      assert(tree.dependencies.a.dependencies.b.dependencies.a);

      assert(tree.dependencies.c);
      assert(tree.dependencies.c.dependencies.d);
      assert(tree.dependencies.c.dependencies.d.dependencies.e);
      assert(tree.dependencies.c.dependencies.d.dependencies.e.dependencies.c);
      assert(tree.dependencies.c.dependencies.d.dependencies.e.dependencies.f);

      assert(tree.dependencies.cycle);
      assert(tree.dependencies.cycle.dependencies.cycle);

      assert(tree.dependencies.f);

      done(err);
    });
  });


  it('three modules on the ring', function(done) {
    shrinktree('c', "~1.0.0", built_root, function(err, tree) {
      if (err) return done(err);
      console.log(JSON.stringify(tree, null, 2));
      assert.equal(tree.version, '1.0.0');
      assert.equal(tree.from, 'c@~1.0.0');
      assert(tree.dependencies && tree.dependencies.d);
      assert(tree.dependencies.d.dependencies.e);
      assert(tree.dependencies.d.dependencies.e.dependencies.c);
      assert(tree.dependencies.d.dependencies.e.dependencies.f);
      done(err);
    });
  });


  it('two modules on the ring', function(done) {
    shrinktree('a', "~1.0.0", built_root, function(err, tree) {
      if (err) return done(err);
      assert.equal(tree.version, '1.0.0');
      assert.equal(tree.from, 'a@~1.0.0');
      assert(tree.dependencies && tree.dependencies.b);
      assert(tree.dependencies.b.dependencies.a);
      done(err);
    });
  });



});