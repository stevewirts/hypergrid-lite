'use strict';


var GridModel = function(jsonData) {

    //this function should be overriden by grid itself;
    //if coordinates -1, -1 are used, it means 
    //repaint the whole visible grid
    this.changed = function(x, y) {};

    this.getData = function() {
        return jsonData;
    };

    this.setData = function(data) {
        jsonData = data;
    }

};

GridModel.prototype.getValue = function(field, y) {
    var obj = this.getData()[y];
    var value = obj[field];
    return value;
};

GridModel.prototype.getRow = function(y) {
    return this.getData()[y];
};

GridModel.prototype.getRowCount = function() {
    return this.getData().length;
};

module.exports = GridModel;