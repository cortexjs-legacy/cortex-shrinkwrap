# Cortex Shrinkwrap

This command will lock down the versions of a package's dependencies and generate a `cortex-shrinkwrap.json` file in your package directory.

## Install 

``` bash
npm install cortex-shrinkwrap -g
```

## Usage

``` bash
cortex shrinkwrap [--dev] [--async|--no-async] [--enable-prerelease]
```

See more info by:

``` bash
cortex shrinkwrap -h
```

## API

Also this lib can be used in nodejs.

```javascript
var shrinkwrap = require('cortex-shrinkwrap');

var sh = shrinkwrap(pkg, cache_root, options, function(err, shrinked) {
    // console.log(shrinked);
});

sh.on('ignoreDev', function(pkgName) {
  
});

sh.on('ignoreAsync', function(pkgName) {
  
});

```

### pkg

Pakcage information stored in cortex.json.

### Options

* dev: whehter include `devDependencies`, default value is =false=
* async: whether incldue `asyncDependencies`
* enablePrerelease: whether include prerelease version in shrinkwrap, default value is =false=


## License

(The MIT License)

    Copyright (c) 2014, Villa.Gao <jky239@gmail.com>;
    All rights reserved.
