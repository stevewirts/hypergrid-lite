'use strict';


var resizables = [];
var resizeLoopRunning = true;


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


function Grid(domElement) {
	var canvas = document.createElement('canvas');
	var context = canvas.getContext("2d");

	this.getCanvas = function() {
		return canvas;
	};

	this.getContainer = function() {
		return domElement;
	};

	this.getContext = function() {
		return context;
	};

	this.initialize()
};

Grid.prototype.initialize = function() {
	this.getContainer().appendChild(this.getCanvas());
	this.checkCanvasBounds();
	this.beginResizing();
};

Grid.prototype.checkCanvasBounds = function() {
	var canvas = this.getCanvas();
	var container = this.getContainer();
	var containerBounds = container.getBoundingClientRect();
	
	if (this.width === containerBounds.width && this.height === containerBounds.height) {
		return;
	}

	canvas.setAttribute('width', containerBounds.width);
	canvas.setAttribute('height', containerBounds.height);	

	this.width = containerBounds.width;
	this.height = containerBounds.height;

	this.paint();
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

Grid.prototype.paint = function() {
	var self = this;
	requestAnimationFrame(function() {
		self._paint();
	});
};

Grid.prototype._paint = function() {
	try {
		var context = this.getContext();
		context.save();
		context.fillStyle = 'blue';
		context.fillRect(50,25,150,100);
	}
	catch(e) {
		context.restore();
		console.log(e);
	}
};

module.exports = function(domElement) {
    return new Grid(domElement);
};