'use strict';

var defaultRenderer = require('./defaultcellrenderer.js');

var Column = function(grid, field, label, type, width, renderer) {

    renderer = renderer || defaultRenderer;

    this.getGrid = function() {
        return grid;
    };

    this.setGrid = function(newGrid) {
        grid = newGrid;
    };

    this.getField = function() {
        return field;
    };

    this.setField = function(newField) {
        field = newField;
    };

    this.getLabel = function() {
        return label;
    };

    this.setLabel = function(newLabel) {
        label = newLabel;
    };

    this.getType = function() {
        return type;
    };

    this.setType = function(newType) {
        type = newType;
    };

    this.getRenderer = function() {
        return renderer;
    };

    this.setRenderer = function(newRenderer) {
        renderer = newRenderer;
    };

    this.getWidth = function() {
        return width;
    };

    this.setWidth = function(newWidth) {
        width = newWidth;
    };
};



module.exports = Column;