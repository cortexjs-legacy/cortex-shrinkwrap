var _globalNS = {
    
};



define = function(name, deps, fn) {
    var module = {
        exports: {

        }
    };

    
    var localNS = {};
    if(deps.length) {
        
    }

    var require  = function(name) {
        
    };

    fn(require, exports, module);
    
    
};


fucntion pkgName(package) {
    if(!package) throw new Error("The package name should not be empty!");
}
