var fs = require('fs'),
    path = require('path');


module.exports = readJSON;

function readFile(file, field, callback) {
    var pkg = {};
    try {
        pkg = require(file);
    } catch (e) {
        e.message = "Error when read '" + file + "': " + e.message;
        return callback(e);
    }

    if (field)
        pkg = pkg[field] || {};

    callback(null, pkg);
}


function readJSON(cwd, callback) {
    var filePath = path.join(cwd, 'cortex.json');
    fs.exists(filePath, function(exists) {
        if (exists) {
            return readFile(filePath, null, callback);
        }

        filePath = path.join(cwd, 'package.json');
        fs.exists(filePath, function(exists) {
            if (exists) {
                return readFile(filePath, 'cortex', callback);
            }

            callback(new Error('Can not find cortex.json or package.json either'));
        });
    });
}