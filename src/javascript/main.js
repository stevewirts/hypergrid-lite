var _ = require('underscore');

var grid = require('./components/grid.js');
var GridModel = require('./components/gridmodel.js');

if (!window.fin) {
    window.fin = {};
}

window.fin.hypergridlite = {
    createOn: grid,
    GridModel: GridModel
};

module.exports.foo = 'foo';