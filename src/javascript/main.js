var _ = require('underscore');

var grid = require('./components/grid.js');

window.data = require('./components/dummydata.js')(1000);

if (!window.fin) {
    window.fin = {};
    window.fin.hypergridlite = {
        createOn: grid
    };
}

module.exports.foo = 'foo';