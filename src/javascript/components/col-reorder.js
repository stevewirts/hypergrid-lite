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

/*
 * detect which column is nearest to a mouse event
 * @param  {Grid}   grid the hypergrid-lite object
 * @param  {Event}  evt  the mouse event to look near
 * @return {object}      object with nearest column, its dimensions and index
 */
function detectNearestColumn(grid, evt) {
    var column;
    var columns = grid.getColumns();
    var headerCanvas = grid.getHeaderCanvas();
    var renderedRange = grid.getRenderedRowRange();
    var headerRect = getOffsetRect(headerCanvas);
    var columnLeft = headerRect.left;
    var columnRight = headerRect.left;
    var indexOfNearestColumn = columns.length - 1;

    for(var c = renderedRange.left; c < columns.length; c++) {
        column = columns[c];
        columnLeft = columnRight;
        columnRight += column.getWidth();
        // Note: when no column matches this condition,
        // `indexOfNearestColumn` will be the last column.
        if(evt.pageX < columnRight) {
            indexOfNearestColumn = c;
            break;
        }
    }

    return {
        column: column,
        columnLeft: columnLeft,
        columnRight: columnRight,
        index: indexOfNearestColumn
    }
}

/*
 * detect if a mouse event is in a column's resize area
 * @param  {Grid}   grid the hypergrid-lite object
 * @param  {Event}  evt  the mouse event to look near
 * @return {Column}      the column whose resize area the mouse is in, or null
 */
function detectResizingAreaColumn(grid, evt) {
    // `threshold` determines the size of the resize area.
    // Clicking in this area triggers a resize.
    var threshold = 5;
    var nearest = detectNearestColumn(grid, evt);

    dragStartX = evt.pageX;

    // Detect if we clicked near the left or right border of a header cell
    if(Math.abs(evt.pageX - nearest.columnLeft) <= threshold) {
        // The user clicked near the left border.
        // Resize the previous column, or else the first column.
        return grid.getColumns()[Math.max(nearest.index - 1, 0)];
    } else if(Math.abs(evt.pageX - nearest.columnRight) <= threshold) {
        // The user clicked near the right border.
        // Resize the current column.
        return grid.getColumns()[nearest.index];
    } else {
        return null;
    }
}


/*
 * Get element boundingClientRect offset offset by page scroll
 * @param {DOMElement} element whose offset rectangle to get
 * @return {object}            offset bounding rectangle
 */
function getOffsetRect(element) {
    var rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.pageYOffset,
        left: rect.left + window.pageXOffset,
        width: rect.width,
        height: rect.height
    };
}

function init(self, divHeader) {

    // Mouse event clientX where the drag starts.
    // This is used in both resizing and reordering.
    var dragStartX;

    // These variables are used only during resizing.
    var resizeColumn;
    var resizeColumnInitialWidth;

    // These variables are used only during reordering.
    var reorderingColumn;
    var reorderingColumnLeftStart;

    // `dragHeader` is a transparent copy of the header cell being dragged,
    // during a reorder operation.
    var dragHeader;

    // This is used to restore the state of the cursor on document.body
    // when a drag operation ends.
    var bodyCursorBeforeDrag;

    // `inserter` is a yellow bar between that appears between header cells
    // when you are reordering cells.
    // It shows you where your header cell is going to go.
    var inserter = document.createElement('div');
    inserter.style.height = '20px';
    inserter.style.width = '5px';
    inserter.style.backgroundColor = 'goldenrod';
    inserter.style.position = 'absolute';
    inserter.style.display = 'none';
    inserter.style.zIndex = 10000;
    document.body.appendChild(inserter);

    // We start out in a non-dragging state.
    // So let's add the non-dragging event listeners.
    attachNonDraggingEventListeners();

    /*
     * Helpers for adding/removing the non-dragging event listeners
     */

    function attachNonDraggingEventListeners() {
        // Update the cursor on mouse move.
        divHeader.addEventListener('mousemove', onNonDraggingMouseMove);

        // Start a drag operation (resize or reorder) on mousedown.
        divHeader.addEventListener('mousedown', onDragStart);
    }

    function removeNonDraggingEventListeners() {
        // These event listeners are removed
        // at the start of each drag operation (resize or reorder).
        divHeader.removeEventListener('mousedown', onDragStart);
        divHeader.removeEventListener('mousemove', onNonDraggingMouseMove);
    }

    /*
     * Event listeners in place when no dragging is happening
     */

    function onNonDraggingMouseMove(evt) {
        // Update the cursor.
        if(detectResizingAreaColumn(self, evt)) {
            divHeader.style.cursor = 'col-resize';
        } else {
            divHeader.style.cursor = 'move';
        }
    }

    function onDragStart(evt) {

        // `threshold` is the area around the left and right border
        // of each header cell.
        // Clicking in this area triggers a resize.
        var threshold = 5;
        var nearest = detectNearestColumn(self, evt);
        var resizingAreaColumn = detectResizingAreaColumn(self, evt);

        dragStartX = evt.pageX;

        if(resizingAreaColumn) {
            // The user clicked near a border.
            // Start resizing.
            startResize(resizingAreaColumn);
        } else {
            // The user didn't click near any border.
            // Start reordering.
            startReorder(nearest.column, nearest.columnLeft);
        }
    }

    /*
     * Resizing operation
     */

    function startResize(nearestColumn) {
        // Set up our state.
        resizeColumn = nearestColumn;
        resizeColumnInitialWidth = resizeColumn.getWidth();

        // Update the cursor style.
        bodyCursorBeforeDrag = document.body.style.cursor;
        document.body.style.cursor = 'col-resize';

        // Set up event listeners.
        removeNonDraggingEventListeners();
        document.addEventListener('mousemove', onResizeDrag);
        document.addEventListener('mouseup', onResizeDragEnd);
    }

    function onResizeDrag(evt) {
        // Update the column width.
        var changeInX = evt.pageX - dragStartX;
        var newWidth = Math.max(10, resizeColumnInitialWidth + changeInX);
        resizeColumn.setWidth(newWidth);

        self.trigger('columnsresizing');
        self.paintAll();
    }

    function onResizeDragEnd(evt) {
        // Clear our state.
        dragStartX = null;
        resizeColumn = null;
        resizeColumnInitialWidth = null;

        // Restore the cursor style.
        document.body.style.cursor = bodyCursorBeforeDrag;

        // Restore the event listeners.
        attachNonDraggingEventListeners();
        document.removeEventListener('mousemove', onResizeDrag);
        document.removeEventListener('mouseup', onResizeDragEnd);

        // Prevent user-select.
        evt.preventDefault();

        self.checkScrollbars();
        self.trigger('columnsresized');
    }

    /*
     * Reordering operation
     */

    function startReorder(nearestColumn, nearestColumnLeft) {
        // Set up `dragHeader`.
        var headerCanvas = self.getHeaderCanvas();
        var headerRect = getOffsetRect(headerCanvas);
        var nearestColumnWidth = nearestColumn.getWidth();
        dragHeader = document.createElement('canvas');
        dragHeader.width = nearestColumnWidth;
        dragHeader.height = 20;
        dragHeader.style.opacity = '.45';
        dragHeader.style.position = 'absolute';
        dragHeader.style.left = nearestColumnLeft + 'px';
        dragHeader.style.top = headerRect.top + 'px';
        dragHeader.style.zIndex = 10000;
        dragHeader.getContext('2d').drawImage(
            self.getHeaderCanvas(),
            nearestColumnLeft - headerRect.left, // sx, 
            0, // sy, 
            nearestColumnWidth, // sWidth, 
            20, // sHeight, 
            0, // dx, 
            0, // dy, 
            nearestColumnWidth,
            20);
        document.body.appendChild(dragHeader);

        // Set up our state.
        reorderingColumn = nearestColumn;
        reorderingColumnLeftStart = nearestColumnLeft;

        // Update the cursor style.
        bodyCursorBeforeDrag = document.body.style.cursor;
        document.body.style.cursor = 'move';

        // Set up event listeners.
        removeNonDraggingEventListeners();
        document.addEventListener('mousemove', onReorderDrag);
        document.addEventListener('mouseup', onReorderDragEnd);
    }

    function onReorderDrag(evt) {
        // Find xOfNearestBorder.
        var nearest = detectNearestColumn(self, evt);
        var columnLeft = nearest.columnLeft;
        var columnRight = nearest.columnRight;
        var isLeftOfCenter = evt.pageX < (columnLeft + columnRight) * 0.5;
        var xOfNearestBorder = isLeftOfCenter ? columnLeft : columnRight;

        // Update `inserter`.
        var headerCanvas = self.getHeaderCanvas();
        var headerRect = getOffsetRect(headerCanvas);
        // Subtract 2 pixels to make `inserter` appear ON the border.
        inserter.style.left = (xOfNearestBorder - 2) + 'px';
        inserter.style.top = headerRect.top + 'px';
        inserter.style.display = 'block';

        // Update `dragHeader`.
        var changeInX = evt.pageX - dragStartX;
        // Disallow dragging past the left of the header.
        var minimum = headerRect.left - reorderingColumnLeftStart;
        changeInX = Math.max(minimum, changeInX);
        // Disallow dragging past the right of the header.
        var headerRight = headerRect.left + headerRect.width
        var maximum = headerRight
            - reorderingColumn.getWidth()
            - reorderingColumnLeftStart;
        changeInX = Math.min(maximum, changeInX);
        var transform = 'translateX(' + changeInX + 'px) translateY(0px)';
        dragHeader.style.transform = transform;

        // Prevent user-select.
        evt.preventDefault();
    }

    function onReorderDragEnd(evt) {
        // Find the nearestBorderIndex.
        var nearest = detectNearestColumn(self, evt);
        var columnLeft = nearest.columnLeft;
        var columnRight = nearest.columnRight;
        var nearestBorderIndex = evt.pageX < (columnLeft + columnRight) * 0.5
            ? nearest.index
            : nearest.index + 1;

        // Move the column in the grid.
        var columns = self.getColumns();
        var from = columns.indexOf(reorderingColumn);
        var to = nearestBorderIndex;
        var reordered = moveIdx(columns, from, to);
        self.setColumns(reordered);

        // Clear our state.
        dragStartX = null;
        reorderingColumn = null;
        reorderingColumnLeftStart = null;

        // Restore the cursor style.
        document.body.style.cursor = bodyCursorBeforeDrag;

        // Remove our divs.
        dragHeader.parentNode.removeChild(dragHeader);
        inserter.style.display = 'none';

        // Restore the event listeners.
        attachNonDraggingEventListeners();
        document.removeEventListener('mousemove', onReorderDrag);
        document.removeEventListener('mouseup', onReorderDragEnd);

        self.trigger('columnsreordered');

        self.paintAll();
    }
}

exports.init = init;
