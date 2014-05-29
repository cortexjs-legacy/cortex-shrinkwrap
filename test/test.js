var shrinkwrap = require('../lib');
var assert = require('assert');

describe('test shrinkwrap package', function() {
  it('simple package', function(done) {
    shrinkwrap({
      name: 'test-pkg', 
      version: "0.1.0",
      dependencies: {}
    }, function(err, shrinked) {
      assert.equal(shrinked.name, 'test-pkg');
      assert.equal(shrinked.version, '0.1.0');
      done(err);
    });
  });
});
