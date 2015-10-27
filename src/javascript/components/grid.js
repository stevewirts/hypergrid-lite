'use strict';

var Column = require('./column.js');
var LRUCache = require('../../../node_modules/lru-cache/lib/lru-cache.js');
var FinBar = require('../../../node_modules/finbars/index.js');
var defaultcellrenderer = require('./defaultcellrenderer.js');
var resizables = [];
var resizeLoopRunning = true;
var fontData = {};
var textWidthCache = new LRUCache({ max: 10000 });


var resizablesLoopFunction = function(now) {
    if (!resizeLoopRunning) {
        return;
    }
    for (var i = 0; i < resizables.length; i++) {
        try {
            resizables[i](now);
        } catch (e) {}
    }
};
setInterval(resizablesLoopFunction, 200);


function Grid(domElement, model, properties) {

    var self = this;

    var options = this.getDefaultProperties();
    var canvas = document.createElement('canvas');
    var headerCanvas = document.createElement('canvas');
    var context = canvas.getContext("2d");
    var headerContext = headerCanvas.getContext("2d");
    var columns = [];
    this.scrollX = 0;
    this.scrollY = 0;

    model.changed = function(x, y) {
        self.paint(x, y);
    };

    this.getCanvas = function() {
        return canvas;
    };

    this.getHeaderCanvas = function() {
        return headerCanvas;
    };

    this.getContainer = function() {
        return domElement;
    };

    this.getContext = function() {
        return context;
    };

    this.getHeaderContext = function() {
        return headerContext;
    };

    this.getModel = function() {
        return model;
    };

    this.setModel = function(gridModel) {
        model = gridModel;
    };

    this.getColumns = function() {
        return columns;
    }

    this.setColumns = function (cols) {
        columns = cols;
    }

    this.getOptions = function() {
        return options;
    };

    this.setOptions = function(newOptions) {
        options = newOptions;
    };

    this.addProperties(properties);

    this.initialize()
};

Grid.prototype.getDefaultProperties = function() {
    return {
        font: '13px Tahoma, Geneva, sans-serif',
        color: '#ffffff',
        backgroundColor: '#505050',
        foregroundSelColor: 'rgb(25, 25, 25)',
        backgroundSelColor: 'rgb(183, 219, 255)',

        topLeftFont: '14px Tahoma, Geneva, sans-serif',
        topLeftColor: 'rgb(25, 25, 25)',
        topLeftBackgroundColor: 'rgb(223, 227, 232)',
        topLeftFGSelColor: 'rgb(25, 25, 25)',
        topLeftBGSelColor: 'rgb(255, 220, 97)',

        fixedColumnFont: '14px Tahoma, Geneva, sans-serif',
        fixedColumnColor: 'rgb(25, 25, 25)',
        fixedColumnBackgroundColor: 'rgb(223, 227, 232)',
        fixedColumnFGSelColor: 'rgb(25, 25, 25)',
        fixedColumnBGSelColor: 'rgb(255, 220, 97)',

        fixedRowFont: '11px Tahoma, Geneva, sans-serif',
        fixedRowColor: '#ffffff',
        fixedRowBackgroundColor: '#303030',
        fixedRowFGSelColor: 'rgb(25, 25, 25)',
        fixedRowBGSelColor: 'rgb(255, 220, 97)',

        backgroundColor2: '#303030',
        lineColor: '#707070',
        voffset: 0,
        scrollingEnabled: false,
        vScrollbarClassPrefix: 'fin-sb-user',
        hScrollbarClassPrefix: 'fin-sb-user',

        defaultRowHeight: 25,
        defaultFixedRowHeight: 20,
        defaultColumnWidth: 100,
        defaultFixedColumnWidth: 100,
        cellPadding: 5
    };
};

Grid.prototype.getPaintConfig = function() {
    var self = this;

    var config = Object.create(this.getOptions());

    config.getTextHeight = function(font) {
        return self.getTextHeight(font);
    };

    config.getTextWidth = function(gc, text) {
        return self.getTextWidth(gc, text);
    };

    return config;
};

Grid.prototype.getTextWidth = function(gc, string) {
    if (string === null || string === undefined) {
        return 0;
    }
    string = string + '';
    if (string.length === 0) {
        return 0;
    }
    var key = gc.font + string;
    var width = textWidthCache.get(key);
    if (!width) {
        width = gc.measureText(string).width;
        textWidthCache.set(key, width);
    }
    return width;
};


Grid.prototype.getTextHeight = function(font) {

    var result = fontData[font];
    if (result) {
        return result;
    }
    result = {};
    var text = document.createElement('span');
    text.textContent = 'Hg';
    text.style.font = font;

    var block = document.createElement('div');
    block.style.display = 'inline-block';
    block.style.width = '1px';
    block.style.height = '0px';

    var div = document.createElement('div');
    div.appendChild(text);
    div.appendChild(block);

    div.style.position = 'absolute';
    document.body.appendChild(div);

    try {

        block.style.verticalAlign = 'baseline';

        var blockRect = block.getBoundingClientRect();
        var textRect = text.getBoundingClientRect();

        result.ascent = blockRect.top - textRect.top;

        block.style.verticalAlign = 'bottom';
        result.height = blockRect.top - textRect.top;

        result.descent = result.height - result.ascent;

    } finally {
        document.body.removeChild(div);
    }
    if (result.height !== 0) {
        fontData[font] = result;
    }
    return result;
};

Grid.prototype.merge = function(properties1, properties2) {
    for (var key in properties2) {
        if (properties2.hasOwnProperty(key)) {
            properties1[key] = properties2[key];
        }
    }
};

Grid.prototype.addProperties = function(properties) {
    this.merge(this.getOptions(), properties);
};

Grid.prototype.initialize = function() {
    var self = this;
    var fixedRowHeight = this.getFixedRowHeight();
    var container = this.getContainer();
    var divHeader = document.createElement('div');
    divHeader.style.position = 'absolute';
    divHeader.style.top = 0;
    divHeader.style.right = 0;
    divHeader.style.left = 0;
    divHeader.style.overflow = 'hidden';

    divHeader.appendChild(this.getHeaderCanvas());
    container.appendChild(divHeader);

    require('./col-reorder.js').init(self, divHeader);

    var divMain = document.createElement('div');
    divMain.style.position = 'absolute';
    divMain.style.top = fixedRowHeight + 'px';
    divMain.style.right = 0;
    divMain.style.bottom = 0;
    divMain.style.left = 0;
    // divMain.style.overflow = 'auto';
    // divMain.style.msOverflowStyle = '-ms-autohiding-scrollbar';
    // divMain.addEventListener("scroll", function(e) {
    //     divHeader.scrollLeft = e.target.scrollLeft;
    // });
    divMain.style.overflow = 'hidden'

    this.initScrollbars();
    container.appendChild(this.scrollbarsDiv);

    divMain.appendChild(this.getCanvas());
    container.appendChild(divMain);
    

    this.checkCanvasBounds();
    this.beginResizing();

};

Grid.prototype.initScrollbars = function() {

    var self = this;
    
    this.scrollbarsDiv = this.getScrollbarDiv();
    
    var horzBar = new FinBar({
        orientation: 'horizontal',
        onchange: function(idx) {
            self.setScrollX(idx);
        },
        cssStylesheetReferenceElement: document.body,
        container: this.getContainer(),
    });

    var vertBar = new FinBar({
        orientation: 'vertical',
        onchange: function(idx) {
            self.setScrollY(idx);
        },
        paging: {
            up: function() {
                return self.pageUp();
            },
            down: function() {
                return self.pageDown();
            },
        },
        container: this.getContainer(),
    });

    this.sbHScroller = horzBar;
    this.sbVScroller = vertBar;

    this.sbHScroller.classPrefix = this.resolveProperty('hScrollbarClassPrefix');
    this.sbVScroller.classPrefix = this.resolveProperty('vScrollbarClassPrefix');

    this.scrollbarsDiv.appendChild(horzBar.bar);
    this.scrollbarsDiv.appendChild(vertBar.bar);

};

Grid.prototype.pageDown = function() {
    return 1;
};

Grid.prototype.pageUp = function() {
    return 1;
};

Grid.prototype.setScrollX = function(value) {
    this.scrollX = value;
    this.paintAll();
};

Grid.prototype.setScrollY = function(value) {
    this.scrollY = value;
    this.paintAll();
};

Grid.prototype.resizeScrollbars = function() {
    this.sbHScroller.shortenBy(this.sbVScroller).resize();
    this.sbVScroller.shortenBy(this.sbHScroller).resize();
};

Grid.prototype.setVScrollbarValues = function(max) {
    this.sbVScroller.range = {
        min: 0,
        max: max
    };
};

Grid.prototype.setHScrollbarValues = function(max) {
    this.sbHScroller.range = {
        min: 0,
        max: max
    };
};

Grid.prototype.getScrollbarDiv = function() {
    var outer = document.createElement('div');
    var strVar="";
    strVar += "<div style=\"top:0px;right:0px;bottom:0px;left:0px;position:absolute\">";
    strVar += "  <style>";
    strVar += "  div.finbar-horizontal,";
    strVar += "  div.finbar-vertical {";
    strVar += "    z-index: 5;";
    strVar += "    background-color: rgba(255, 255, 255, 0.5);";
    strVar += "    box-shadow: 0 0 3px #000, 0 0 3px #000, 0 0 3px #000;";
    strVar += "  }";
    strVar += "  ";
    strVar += "  div.finbar-horizontal>.thumb,";
    strVar += "  div.finbar-vertical>.thumb {";
    strVar += "    opacity: .85;";
    strVar += "    box-shadow: 0 0 3px #000, 0 0 3px #000, 0 0 3px #000;";
    strVar += "  }";
    strVar += "  <\/style>";
    strVar += "<\/div>";
    outer.innerHTML = strVar;
    var inner = outer.firstChild;
    return inner;
};

Grid.prototype.checkCanvasBounds = function() {
    var container = this.getContainer();
    var headerHeight = this.getFixedRowHeight();
    
    var viewport = container.getBoundingClientRect();

    var headerCanvas = this.getHeaderCanvas();
    var canvas = this.getCanvas();

    headerCanvas.style.position = 'relative';
    headerCanvas.setAttribute('width', viewport.width);
    headerCanvas.setAttribute('height', headerHeight);

    canvas.style.position = 'relative';
    canvas.style.top = '1px';
    canvas.setAttribute('width', viewport.width);
    canvas.setAttribute('height', viewport.height - headerHeight);

    this.width = viewport.width;
    this.height = viewport.height;
    
    //the model may have changed, lets
    //recompute the scrolling coordinates
    this.finalPageLocation = undefined;
    var finalPageLocation = this.getFinalPageLocation();
    this.setHScrollbarValues(finalPageLocation.x);
    this.setVScrollbarValues(finalPageLocation.y);

    this.resizeScrollbars();
    this.paintAll();
};

Grid.prototype.computeMainAreaFullHeight = function() {
    var rowHeight = this.getRowHeight(0);
    var numRows = this.getRowCount();
    var totalHeight = rowHeight * numRows;
    return totalHeight;
};

Grid.prototype.computeMainAreaFullWidth = function() {
    var numCols = this.getColumnCount();
    var width = 0;
    for (var i = 0; i < numCols; i++) {
        width = width + this.getColumnWidth(i);
    }
    return width;
};

Grid.prototype.stopResizeThread = function() {
    resizeLoopRunning = false;
};

Grid.prototype.restartResizeThread = function() {
    if (resizeLoopRunning) {
        return; // already running
    }
    resizeLoopRunning = true;
    setInterval(resizablesLoopFunction, 200);
};

Grid.prototype.beginResizing = function() {
    var self = this;
    this.tickResizer = function() {
        self.checkCanvasBounds();
    };
    resizables.push(this.tickResizer);
};

Grid.prototype.stopResizing = function() {
    resizables.splice(resizables.indexOf(this.tickResizer), 1);
};

Grid.prototype.getColumn = function(x) {
    var column = this.getColumns()[x];
    return column;
};

Grid.prototype.getValue = function(x, y) {
    var model = this.getModel();
    var column = this.getColumns()[x];
    var field = column.getField();
    var value = model.getValue(field, y);
    return value;
};

Grid.prototype.getBoundsOfCell = function(x, y, xOffset, yOffset) {
    xOffset = xOffset || 0;
    yOffset = yOffset || 0;
    var rx, ry, rwidth, rheight;
    var rowHeight = this.getRowHeight(0);

    rx = 0;
    for (var i = 0; i < (x - xOffset); i++) {
        rx = rx + this.getColumnWidth(i + xOffset);
    }
    ry = rowHeight * (y - yOffset);
    rwidth = this.getColumnWidth(x);
    rheight = rowHeight;
    var result = {
        x: rx,
        y: ry,
        width: rwidth,
        height: rheight
    };
    return result;
};

Grid.prototype.getFixedRowHeight = function() {
    var value = this.resolveProperty('defaultFixedRowHeight');
    return value;
};

Grid.prototype.getColumnWidth = function(x) {
    var column = this.getColumn(x);
    if (!column) {
        return this.resolveProperty('defaultColumnWidth');
    }
    var value = column.getWidth();
    return value;
};

Grid.prototype.getRowHeight = function(y) {
    var value = this.resolveProperty('defaultRowHeight');
    return value;
};

Grid.prototype.resolveProperty = function(name) {
    var value = this.getOptions()[name];
    return value;
};

Grid.prototype.getColumnCount = function() {
    var columns = this.getColumns();
    return columns.length
};

Grid.prototype.getRowCount = function() {
    var model = this.getModel();
    return model.getRowCount();
};

Grid.prototype.addColumn = function(field, label, type, width, renderer) {
    var columns = this.getColumns();
    var newCol = new Column(this, field, label, type, width, renderer);
    columns.push(newCol);
};

Grid.prototype.paintAll = function() {
    //var viewport = this.getCanvas().getBoundingClientRect();
    var config = this.getPaintConfig();
    var numCols = this.getColumnCount();
    var numRows = this.getRowCount();
	this.paintMainArea(config, numCols, numRows);
	this.paintHeaders(config, numCols, 1);
}

Grid.prototype.paintMainArea = function(config, numCols, numRows) {
    try {
        var self = this;
        var context = this.getContext();
        var scrollX = this.scrollX;
        var scrollY = this.scrollY;
        var bounds = this.getCanvas().getBoundingClientRect();

        var totalHeight = 0;
        var totalWidth = 0;
        var dx, dy = 0;
        context.save();
        for (var x = 0; (x + scrollX) <= numCols && totalWidth < bounds.width; x++) {
            var rowHeight = 0;
            totalHeight = 0;
            for (var y = 0; (y + scrollY) < numRows && totalHeight < bounds.height; y++) {
                var dx = x + scrollX;
                var dy = y + scrollY;
                this.paintCell(context, dx, dy, config);
                rowHeight = this.getRowHeight(dy);
                totalHeight = totalHeight + rowHeight;
            }
            var colWidth = this.getColumnWidth(dx);
            totalWidth = totalWidth + colWidth;
        }

    } catch (e) {
        context.restore();
        console.log(e);
    }
};


Grid.prototype.paintHeaders = function(config, numCols, numRows) {
    try {
    	config.halign = 'center';
    	config.cellPadding = '0px';
        var self = this;
        var context = this.getHeaderContext();
        context.save();
        for (var x = 0; x < numCols; x++) {
            this.paintHeaderCell(context, x, config);
        }

    } catch (e) {
        context.restore();
        console.log(e);
    }
};

Grid.prototype.paintCell = function(context, x, y, config) {
    var model = this.getModel();
    var bounds = this.getBoundsOfCell(x, y, this.scrollX, this.scrollY);
    var column = this.getColumn(x);
    var renderer = column.getRenderer();
    var value = this.getValue(x, y);
    config.value = value;
    config.x = x;
    config.y = y;
    config.bounds = bounds;
    config.type = 'cell';
    renderer(context, config);
};


Grid.prototype.paintHeaderCell = function(context, x, config) {
    var y = 0;
    var bounds = this.getBoundsOfCell(x, y, this.scrollX, 0);
    var column = this.getColumn(x);
    var renderer = column.getRenderer();
    var value = column.getLabel();
    config.value = value;
    config.x = x;
    config.y = y;
    config.bounds = bounds;
    config.type = 'header';
    renderer(context, config);
};

Grid.prototype.getFinalPageLocation = function() {
    if (this.finalPageLocation === undefined) {
        this.finalPageLocation = this.getDefaultFinalPageLocation();
    }
    return this.finalPageLocation;
};

Grid.prototype.getDefaultFinalPageLocation = function() {
    var mySize = this.getCanvas().getBoundingClientRect();
    var numCols = this.getColumnCount();
    var rowHeight = this.getRowHeight(0);
    var totalWidth = 0;
    var numRows = Math.floor(mySize.height/rowHeight);
    var i;
    for (i = 0; i < numCols; i++) {
        var c = numCols - i - 1;
        var eachWidth = this.getColumnWidth(c);
        totalWidth = totalWidth + eachWidth;
        if (totalWidth >= mySize.width) {
            break;
        }
    }
    var maxX = numCols - i;
    var maxY = this.getRowCount() - numRows; 
    return {x: maxX, y: maxY}
};

Grid.prototype.getDefaultCellRenderer = function() {
    return defaultcellrenderer;
}

module.exports = function(domElement, model) {
    return new Grid(domElement, model);
};

