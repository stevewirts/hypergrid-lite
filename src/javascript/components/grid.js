'use strict';

var Column = require('./column.js');
var SimpleLRU = require('simple-lru');
var defaultcellrenderer = require('./defaultcellrenderer.js');
var resizables = [];
var resizeLoopRunning = true;
var fontData = {};
var textWidthCache = new SimpleLRU(10000);


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
    this.addProperties(properties);

    var canvas = document.createElement('canvas');
    var headerCanvas = document.createElement('canvas');
    var context = canvas.getContext("2d");
    var headerContext = headerCanvas.getContext("2d");
    var columns = [];

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

        defaultRowHeight: 25,
        defaultFixedRowHeight: 20,
        defaultColumnWidth: 100,
        defaultFixedColumnWidth: 100,
        cellPadding: 5
    };
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
    this.merge(this.options, properties);
};


/**
 * given an array of numbers, return the index at which the value would fall
 * summing the array as you go
 * @param  {array} arr array of numbers
 * @param  {number} val get the index where this would fall
 * @return {number}     index or -1 if not found 
 */
function contains(arr, val){
    var total = 0,
        len = arr.length,
        i;

    for (i = 0; i < len; i++) {
        total += arr[i];

        if (val < total) {
            return i;
        }
    }

    return -1;
}


/**
 * consult the nearest kindergarten teacher...
 */
function add(a, b) {
    return a + b;
}


function offsetTil (arr, idx) {
    var subset = arr.slice(0, idx);

    return subset.reduce(add, 0);   
}


/**
 * map over an array returning an array of the same length containing the 
 * sum at each place
 * @param  {array} arr an array of numbers
 * @return {array}     the array of sums
 */
function runningSums (arr) {
    var sum = 0;

    return arr.map(function (item) {
        return sum += item;
    });
}


/**
 * given an array of boarders, generate a set of x-coords that represents the 
 * the area around the boarders +/- the threshold given
 * @param  {array} arr    array of borders 
 * @param  {number} thresh the threshold around each
 * @return {array}        an array of arrays
 */
function genFuzzyBorders (arr, thresh) {
    var len = arr.length,
        borders = [[0, thresh]],
        maxRight = arr.reduce(add, 0),
        sums = runningSums(arr),
        i, curr;

    for (i = 0; i < len; i++) {
        curr = sums[i];

        borders.push([
            Math.max(0, curr - thresh),
            Math.min(curr + thresh, maxRight)]);
    }

    return borders
}


/**
 * A version of the finIndex polyfill found here: 
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
 *
 * adapted to run as stand alone function  
 */
function findIndex(lst, predicate) {
    
    var list = Object(lst);
    var length = list.length >>> 0;
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(null, value, i, list)) {
        return i;
      }
    }
    return -1;
};


function inRange (range, value) {
    return value >= range[0] && value <= range[1]; 
}

/**
 * return whatever gets passed in. can be useful in a filter function where 
 * truthy values are the only valid ones 
 * @param  {any} arg any value 
 * @return {any}     whatever was passed in 
 */
function identity (arg) {
    return arg;
}

/**
 * move an array index to the 'border' passed in. the borders are not array
 * indexes, they are the numbers in the following diagram: 
 * 
 * |0|____val____|1|_____val_____|2|_____val____|3| etc
 * 
 * @param  {array} arr      array to reorder, not mutated
 * @param  {number} from     index 
 * @param  {number} toBorder border index
 * @return {array}          new array in new order
 */
function moveIdx (arr, from, toBorder) {
    var reorderd = arr.slice(),
        mover = reorderd.splice(from, 1, undefined)[0];

    reorderd.splice(toBorder, 1, mover, reorderd[toBorder]);

    return reorderd.filter(identity);
}

Grid.prototype.initialize = function() {
	var self = this;
	var fixedRowHeight = this.getFixedRowHeight();
    var container = this.getContainer();
    var divHeader = document.createElement('div');
    divHeader.style.position = 'absolute';
	divHeader.style.top = 0;
	divHeader.style.right = 0;
	//divHeader.style.bottom = fixedRowHeight + 'px';
	divHeader.style.left = 0;
	divHeader.style.overflow = 'hidden';

    divHeader.appendChild(this.getHeaderCanvas());
    container.appendChild(divHeader);


  var dragHeader, mouseDown, x, y, startingTrans, hovering, headerRect, fuzzyBorders, widths, clickedCol;

  var inserter = document.createElement('div');

  inserter.style.height = '20px';
  inserter.style.width = '5px';
  inserter.style.backgroundColor = 'goldenrod';
  inserter.style.position = 'absolute';
  inserter.top = 0;
  inserter.left = 0;

  document.body.appendChild(inserter);


  document.addEventListener('mousemove', function(e){
    if (mouseDown && dragHeader && (e.x >= headerRect.left)
        && (e.x <= (headerRect.left + headerRect.width))) {
      
      var xMovement, yMovement, movementString,
        left = headerRect.left;


        xMovement = startingTrans[0] - (x - e.x);
        yMovement = 0; //startingTrans[1] - (y - e.y);

        movementString = ['translateX(',
                          xMovement,
                          'px) translateY(',
                          yMovement,
                          'px)'
                         ].join('');

        dragHeader.style.transform = movementString;
        dragHeader.style.zIndex = 10;


        var rangeFunc = function (range) {
            return inRange(range, e.x);
        }

        var normalizedBorders = fuzzyBorders.map(function (item) {
            return item.map(add.bind(null, left));
        })

        var borderHit = findIndex(normalizedBorders, rangeFunc);

        if (borderHit !== -1) {
            //console.log(normalizedBorders[borderHit])
            var inserterLeft = normalizedBorders[borderHit][0];

            inserter.style.left = inserterLeft;
            inserter.style.top = headerRect.top;
        }   
        //console.log(borderHit, [e.x, headerRect.left]);

        // |___0___|_____1____|________2_____|_______3_____|
        // |___2___|_____1____|________0_____|_______3_____|
        
        // 0___ ___1____ ____ 2________ _____3_______ _____4
        
        [a , b, c, d]
        splice (idx, 1)

        c, a , b ,d 
        


    }

    //evnt.x - (evnt.offsetX - colOffset)

  })

  document.addEventListener('mouseup', function(evnt) {

      //if (evnt.target == divHeader) {
          x = y = 0;
          if (dragHeader) {
            dragHeader.parentNode.removeChild(dragHeader);
          }
          dragHeader = null;
          startingTrans = [0, 0];
          mouseDown = false;
      //}
  })


    divHeader.addEventListener('mouseenter', function(evnt){
        console.log('over');
        hovering = true;
    });
    divHeader.addEventListener('mouseleave', function(evnt){
        hovering = false;
        console.log('and out');
    });


    divHeader.addEventListener('mousedown', function(evnt){
        mouseDown = true;

        widths = self.getColumns().map(function(col){
            return col.getWidth();
        });

        clickedCol = contains(widths, evnt.offsetX);
        var colOffset = offsetTil(widths, clickedCol);
        var headerCanvas = self.getHeaderCanvas();
        var image = new Image();
        var subCanvas = document.createElement('canvas');

        var subCtx = subCanvas.getContext('2d')
        var clickedColWidth = widths[clickedCol];

        //var clickOffset = evnt.offsetX - colOffset;


        headerRect = headerCanvas.getBoundingClientRect();
        fuzzyBorders = genFuzzyBorders(widths, 3);
  
        var ctx = headerCanvas.getContext('2d');

        console.log(colOffset, widths[clickedCol], fuzzyBorders);
        
        subCanvas.width = clickedColWidth;
        subCanvas.height = 20;
        subCanvas.style.opacity = '.45';
        subCanvas.style.position = 'absolute';
        subCanvas.style.left = evnt.x - (evnt.offsetX - colOffset) ;//+ (clickedColWidth / 2);

        subCtx.drawImage(
            //ctx.canvas.toDataURL(), 
            headerCanvas,
            colOffset, // sx, 
            0, // sy, 
            clickedColWidth, // sWidth, 
            20, // sHeight, 
            0, // dx, 
            0, // dy, 
            clickedColWidth, 
            20);


        document.body.appendChild(subCanvas);


      var   transform;

    dragHeader = subCanvas;
        var targetedElement = dragHeader;
        transform = targetedElement.style.transform;
        x = evnt.x;
        y = evnt.y;
        startingTrans = transform.match(/([^(]?\d+)/g) || [0, 0];
  

        //image.src = headerCanvas


    });


    var divMain = document.createElement('div');
    divMain.style.position = 'absolute';
	divMain.style.top = fixedRowHeight + 'px';
	divMain.style.right = 0;
	divMain.style.bottom = 0;
	divMain.style.left = 0;
	divMain.style.overflow = 'auto';
    divMain.style.msOverflowStyle = '-ms-autohiding-scrollbar';
	divMain.addEventListener("scroll", function(e) {
		divHeader.scrollLeft = e.target.scrollLeft;
	});

    

    divMain.appendChild(this.getCanvas());
    container.appendChild(divMain);

    this.checkCanvasBounds();
    this.beginResizing();
};


Grid.prototype.checkCanvasBounds = function() {
    var container = this.getContainer();
    var headerHeight = this.getFixedRowHeight();
    var computedWidth = this.computeMainAreaFullWidth();
    var computedHeight = this.computeMainAreaFullHeight() - headerHeight;

    if (this.width === computedWidth && this.height === computedHeight) {
        return;
    }

    this.viewport = container.getBoundingClientRect();

    var headerCanvas = this.getHeaderCanvas();
    var canvas = this.getCanvas();

    headerCanvas.style.position = 'relative';
    headerCanvas.setAttribute('width', computedWidth);
    headerCanvas.setAttribute('height', headerHeight);

    canvas.style.position = 'relative';
    canvas.style.top = '1px';
    canvas.setAttribute('width', computedWidth);
    canvas.setAttribute('height', computedHeight);

    this.width = computedWidth;
    this.height = computedHeight;

    this.paintAll();
};


Grid.prototype.getViewportVisibleGridCoordinates = function() {
	//this is an important optimization
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

Grid.prototype.getBoundsOfCell = function(x, y) {
    var rx, ry, rwidth, rheight;
    var rowHeight = this.getRowHeight(0);

    rx = 0;
    for (var i = 0; i < x; i++) {
        rx = rx + this.getColumnWidth(i);
    }
    ry = rowHeight * y;
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
	var self = this;
	var config = Object.create(this.getDefaultProperties());

	config.getTextHeight = function(font) {
		return self.getTextHeight(font);
	};

	config.getTextWidth = function(gc, text) {
		return self.getTextWidth(gc, text);
	};


    var numCols = this.getColumnCount();
    var numRows = this.getRowCount();
	this.paintMainArea(config, numCols, numRows);
	this.paintHeaders(config, numCols, 1);
}

Grid.prototype.paintMainArea = function(config, numCols, numRows) {
    try {
        var self = this;
        var context = this.getContext();
        context.save();
        for (var x = 0; x < numCols; x++) {
            for (var y = 0; y < numRows; y++) {
                this.paintCell(context, x, y, config);
            }
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
            for (var y = 0; y < numRows; y++) {
                this.paintHeaderCell(context, x, y, config);
            }
        }

    } catch (e) {
        context.restore();
        console.log(e);
    }
};

Grid.prototype.paintCell = function(context, x, y, config) {
    var model = this.getModel();
    var bounds = this.getBoundsOfCell(x, y);
    var column = this.getColumn(x);
    var renderer = column.getRenderer();
    var value = this.getValue(x, y);
    config.value = value;
    config.x = x;
    config.y = y;
    config.bounds = bounds;
    renderer(context, config);
};


Grid.prototype.paintHeaderCell = function(context, x, y, config) {
    var bounds = this.getBoundsOfCell(x, y);
    var column = this.getColumn(x);
    var renderer = column.getRenderer();
    var value = column.getLabel();
    config.value = value;
    config.x = x;
    config.y = y;
    config.bounds = bounds;
    renderer(context, config);
};

Grid.prototype.getDefaultCellRenderer = function() {
    return defaultcellrenderer;
}

module.exports = function(domElement, model) {
    return new Grid(domElement, model);
};
