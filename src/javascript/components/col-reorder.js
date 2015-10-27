/**
 * given an array of numbers, return the index at which the value would fall
 * summing the array as you go
 * @param  {array} arr array of numbers
 * @param  {number} val get the index where this would fall
 * @return {number}     index or -1 if not found
 */
function contains(arr, val) {
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

/**
 * sum until the given index
 * @param  {array} arr array to partial sum
 * @param  {number} idx index
 * @return {number}     partial sum
 */
function partialSum(arr, idx) {
    var subset = arr.slice(0, idx);

    return subset.reduce(add, 0);
}


/**
 * map over an array returning an array of the same length containing the
 * sum at each place
 * @param  {array} arr an array of numbers
 * @return {array}     the array of sums
 */
function runningSums(arr) {
    var sum = 0;

    return arr.map(function(item) {
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
function genFuzzyBorders(arr, thresh) {
    var len = arr.length,
        borders = [
            [0, thresh]
        ],
        maxRight = arr.reduce(add, 0),
        sums = runningSums(arr),
        i, curr;

    for (i = 0; i < len; i++) {
        curr = sums[i];

        borders.push([
            Math.max(0, curr - thresh),
            Math.min(curr + thresh, maxRight)
        ]);
    }

    return borders
}


/**
 * A version of the findIndex polyfill found here:
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


function inRange(range, value) {
    return value >= range[0] && value <= range[1];
}

/**
 * return whatever gets passed in. can be useful in a filter function where
 * truthy values are the only valid ones
 * @param  {any} arg any value
 * @return {any}     whatever was passed in
 */
function identity(arg) {
    return arg;
}

/**
 * move an array index to the 'border' passed in. the borders are not array
 * indexes, they are the numbers in the following diagram:
 *
 * |0|____val____|1|_____val_____|2|_____val____|3| etc
 *
 * ** All column values are assumed to be truthy (objects in mind...) **
 *
 * @param  {array} arr      array to reorder, not mutated
 * @param  {number} from     normal index of column to move
 * @param  {number} toBorder border index
 * @return {array}          new array in new order
 */
function moveIdx(arr, from, toBorder) {
    var reorderd = arr.slice(),
        mover = reorderd.splice(from, 1, undefined)[0];

    reorderd.splice(toBorder, 1, mover, reorderd[toBorder]);

    return reorderd.filter(identity);
}



function init(self, divHeader) {


    var widths = self.getColumns().map(function(col) {
        return col.getWidth();
    }),
        resizeThresh = 5,
        fuzzyBorders = genFuzzyBorders(widths, resizeThresh),
        inserter = document.createElement('div'),
        headerCanvas = self.getHeaderCanvas(),
        headerRect = headerCanvas.getBoundingClientRect(),
        dragHeader, mouseDown, x, y, startingTrans, resizing,
        resizingCols, clickedCol, borderHit, reordering;



    inserter.style.height = '20px';
    inserter.style.width = '5px';
    inserter.style.backgroundColor = 'goldenrod';
    inserter.style.position = 'absolute';
    inserter.style.display = 'none';
    inserter.top = 0;
    inserter.left = 0;

    document.body.appendChild(inserter);


    document.addEventListener('mousemove', function(e) {

        var xMovement, yMovement, movementString,
            left = headerRect.left,
            rangeFunc, normalizedBorders,
            inserterLeft, activeCol, activeColWidth,
            colResizeIndex;

        widths = self.getColumns().map(function(col) {
            return col.getWidth();
        });

        fuzzyBorders = genFuzzyBorders(widths, resizeThresh),

        rangeFunc = function(range) {
            return inRange(range, e.x);
        }

        normalizedBorders = fuzzyBorders.map(function(item) {
            return item.map(add.bind(null, left));
        })

        if (!resizing) {
            borderHit = findIndex(normalizedBorders, rangeFunc);
        }

        if ((resizing || (borderHit !== -1)) && !reordering) {
            divHeader.style.cursor = 'col-resize';
            resizingCols = true;

            if (mouseDown) {
                if (borderHit > 0) {
                    console.log('ree')
                    colResizeIndex = clickedCol;
                    activeCol = self.getColumns()[colResizeIndex];
                    activeColWidth = activeCol.getWidth();
                    activeCol.setWidth(Math.max(0, activeColWidth + (e.x - x)));
                    self.paintAll();
                    resizing = true;
                    x = e.x;
                }


            }
        } else if (mouseDown && dragHeader && (e.x >= headerRect.left) && (e.x <= (headerRect.left + headerRect.width)) && !resizingCols) {

            reordering = true;

            xMovement = startingTrans[0] - (x - e.x);
            yMovement = 0;

            movementString = ['translateX(',
                xMovement,
                'px) translateY(',
                yMovement,
                'px)'
            ].join('');

            dragHeader.style.transform = movementString;
            dragHeader.style.zIndex = 10;

            if (borderHit !== -1) {
                inserterLeft = normalizedBorders[borderHit][0];
                inserter.style.left = inserterLeft;
                inserter.style.top = headerRect.top;
                inserter.style.display = 'block';
            } else {
                inserter.style.display = 'none';
            }
        } else {
            divHeader.style.cursor = 'auto';
            resizingCols = false;
        }
    })

    document.addEventListener('mouseup', function(evnt) {
        var reordered;

        x = y = 0;

        if (dragHeader) {
            dragHeader.parentNode.removeChild(dragHeader);
        }

        dragHeader = null;
        startingTrans = [0, 0];
        mouseDown = false;
        resizing = false;
        reordering = false;

        if (borderHit !== -1) {
            reordered = moveIdx(self.getColumns(), clickedCol, borderHit);
            self.setColumns(reordered);
            self.paintAll();
        }

        inserter.style.display = 'none';
        headerRect = headerCanvas.getBoundingClientRect();
        fuzzyBorders = genFuzzyBorders(widths, resizeThresh);
        widths = self.getColumns().map(function(col) {
            return col.getWidth();
        });

    })


    divHeader.addEventListener('mousedown', function(evnt) {
        mouseDown = true;

        widths = self.getColumns().map(function(col) {
            return col.getWidth();
        });

        clickedCol = contains(widths, evnt.offsetX);

        x = evnt.x;
        y = evnt.y;


        if (resizingCols) {
            // always resize l to r 
            clickedCol = contains(widths, evnt.offsetX - resizeThresh);
            return; // gross....
        }

        var colOffset = partialSum(widths, clickedCol),
            image = new Image(),
            subCanvas = document.createElement('canvas'),
            subCtx = subCanvas.getContext('2d'),
            clickedColWidth = widths[clickedCol],
            transform, ctx;

        // body is prob not the best spot for this... 
        document.body.appendChild(subCanvas);

        headerRect = headerCanvas.getBoundingClientRect();
        fuzzyBorders = genFuzzyBorders(widths, resizeThresh);

        ctx = headerCanvas.getContext('2d');

        subCanvas.width = clickedColWidth;
        subCanvas.height = 20;
        subCanvas.style.opacity = '.45';
        subCanvas.style.position = 'absolute';
        subCanvas.style.left = evnt.x - (evnt.offsetX - colOffset);
        subCanvas.style.top = headerRect.top;
        subCanvas.style.cursor = 'pointer';

        subCtx.drawImage(
            headerCanvas,
            colOffset, // sx, 
            0, // sy, 
            clickedColWidth, // sWidth, 
            20, // sHeight, 
            0, // dx, 
            0, // dy, 
            clickedColWidth,
            20);


        dragHeader = subCanvas;

        transform = dragHeader.style.transform;

        startingTrans = transform.match(/([^(]?\d+)/g) || [0, 0];
    });

}

exports.init = init;