'use strict';


var paint = function(gc, config) {

    var value = config.value;
    var bounds = config.bounds;

    var x = bounds.x;
    var y = bounds.y;
    var width = bounds.width;
    var height = bounds.height;
    var font = config.font;

    var halign = config.halign || 'right';
    var valignOffset = config.voffset || 0;

    var cellPadding = config.cellPadding || 0;
    var halignOffset = 0;
    var textWidth;
    var fontMetrics;

    if (gc.font !== config.font) {
        gc.font = config.font;
    }
    if (gc.textAlign !== 'left') {
        gc.textAlign = 'left';
    }
    if (gc.textBaseline !== 'middle') {
        gc.textBaseline = 'middle';
    }

    textWidth = config.getTextWidth(gc, value);
    fontMetrics = config.getTextHeight(font);

    if (halign === 'right') {
        //textWidth = config.getTextWidth(gc, config.value);
        halignOffset = width - cellPadding - textWidth;
    } else if (halign === 'center') {
        //textWidth = config.getTextWidth(gc, config.value);
        halignOffset = (width - textWidth) / 2;
    } else if (halign === 'left') {
        halignOffset = cellPadding;
    }

    halignOffset = Math.max(0, halignOffset);
    valignOffset = valignOffset + Math.ceil(height / 2);

    //fill background only if our backgroundColor is populated or we are a selected cell
    if (config.backgroundColor || config.isSelected) {
        gc.fillStyle = config.isSelected ? config.bgSelColor : config.backgroundColor;
        gc.fillRect(x, y, width, height);
    }

    //draw text
    var theColor = config.isSelected ? config.fgSelColor : config.color;
    if (gc.fillStyle !== theColor) {
        gc.fillStyle = theColor;
        gc.strokeStyle = theColor;
    }
    if (value !== null) {
        gc.fillText(value, x + halignOffset, y + valignOffset);
    }
}

module.exports = paint;