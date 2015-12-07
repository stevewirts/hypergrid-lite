(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./components/grid.js":9,"./components/gridmodel.js":10,"underscore":5}],2:[function(require,module,exports){
'use strict';

/* eslint-env browser */

/** @namespace cssInjector */

/**
 * @summary Insert base stylesheet into DOM
 *
 * @desc Creates a new `<style>...</style>` element from the named text string(s) and inserts it but only if it does not already exist in the specified container as per `referenceElement`.
 *
 * > Caveat: If stylesheet is for use in a shadow DOM, you must specify a local `referenceElement`.
 *
 * @returns A reference to the newly created `<style>...</style>` element.
 *
 * @param {string|string[]} cssRules
 * @param {string} [ID]
 * @param {undefined|null|Element|string} [referenceElement] - Container for insertion. Overloads:
 * * `undefined` type (or omitted): injects stylesheet at top of `<head>...</head>` element
 * * `null` value: injects stylesheet at bottom of `<head>...</head>` element
 * * `Element` type: injects stylesheet immediately before given element, wherever it is found.
 * * `string` type: injects stylesheet immediately before given first element found that matches the given css selector.
 *
 * @memberOf cssInjector
 */
function cssInjector(cssRules, ID, referenceElement) {
    if (typeof referenceElement === 'string') {
        referenceElement = document.querySelector(referenceElement);
        if (!referenceElement) {
            throw 'Cannot find reference element for CSS injection.';
        }
    } else if (referenceElement && !(referenceElement instanceof Element)) {
        throw 'Given value not a reference element.';
    }

    var container = referenceElement && referenceElement.parentNode || document.head || document.getElementsByTagName('head')[0];

    if (ID) {
        ID = cssInjector.idPrefix + ID;

        if (container.querySelector('#' + ID)) {
            return; // stylesheet already in DOM
        }
    }

    var style = document.createElement('style');
    style.type = 'text/css';
    if (ID) {
        style.id = ID;
    }
    if (cssRules instanceof Array) {
        cssRules = cssRules.join('\n');
    }
    cssRules = '\n' + cssRules + '\n';
    if (style.styleSheet) {
        style.styleSheet.cssText = cssRules;
    } else {
        style.appendChild(document.createTextNode(cssRules));
    }

    if (referenceElement === undefined) {
        referenceElement = container.firstChild;
    }

    container.insertBefore(style, referenceElement);

    return style;
}

/**
 * @summary Optional prefix for `<style>` tag IDs.
 * @desc Defaults to `'injected-stylesheet-'`.
 * @type {string}
 * @memberOf cssInjector
 */
cssInjector.idPrefix = 'injected-stylesheet-';

// Interface
module.exports = cssInjector;

},{}],3:[function(require,module,exports){
'use strict';

/* eslint-env node, browser */

var cssInjector = require('css-injector');

/**
 * @constructor FinBar
 * @summary Create a scrollbar object.
 * @desc Creating a scrollbar is a three-step process:
 *
 * 1. Instantiate the scrollbar object by calling this constructor function. Upon instantiation, the DOM element for the scrollbar (with a single child element for the scrollbar "thumb") is created but is not insert it into the DOM.
 * 2. After instantiation, it is the caller's responsibility to insert the scrollbar, {@link FinBar#bar|this.bar}, into the DOM.
 * 3. After insertion, the caller must call {@link FinBar#resize|resize()} at least once to size and position the scrollbar and its thumb. After that, `resize()` should also be called repeatedly on resize events (as the content element is being resized).
 *
 * Suggested configurations:
 * * _**Unbound**_<br/>
 * The scrollbar serves merely as a simple range (slider) control. Omit both `options.onchange` and `options.content`.
 * * _**Bound to virtual content element**_<br/>
 * Virtual content is projected into the element using a custom event handler supplied by the programmer in `options.onchange`. A typical use case would be to handle scrolling of the virtual content. Other use cases include data transformations, graphics transformations, _etc._
 * * _**Bound to real content**_<br/>
 * Set `options.content` to the "real" content element but omit `options.onchange`. This will cause the scrollbar to use the built-in event handler (`this.scrollRealContent`) which implements smooth scrolling of the content element within the container.
 *
 * @param {finbarOptions} [options={}] - Options object. See the type definition for member details.
 */
function FinBar(options) {

    // make bound versions of all the mouse event handler
    var bound = this._bound = {};
    for (key in handlersToBeBound) {
        bound[key] = handlersToBeBound[key].bind(this);
    }

    /**
     * @name thumb
     * @summary The generated scrollbar thumb element.
     * @desc The thumb element's parent element is always the {@link FinBar#bar|bar} element.
     *
     * This property is typically referenced internally only. The size and position of the thumb element is maintained by `_calcThumb()`.
     * @type {Element}
     * @memberOf FinBar.prototype
     */
    var thumb = document.createElement('div');
    thumb.classList.add('thumb');
    thumb.onclick = bound.shortStop;
    thumb.onmouseover = bound.onmouseover;
    this.thumb = thumb;

    /**
     * @name bar
     * @summary The generated scrollbar element.
     * @desc The caller inserts this element into the DOM (typically into the content container) and then calls its {@link FinBar#resize|resize()} method.
     *
     * Thus the node tree is typically:
     * * A **content container** element, which contains:
     *    * The content element(s)
     *    * This **scrollbar element**, which in turn contains:
     *        * The **thumb element**
     *
     * @type {Element}
     * @memberOf FinBar.prototype
     */
    var bar = document.createElement('div');

    bar.classList.add('finbar-vertical');

    bar.appendChild(thumb);
    if (this.paging) {
        bar.onclick = bound.onclick;
    }
    this.bar = bar;

    options = options || {};

    // presets
    this.orientation = 'vertical';
    this._min = this._index = 0;
    this._max = 100;

    // options
    for (var key in options) {
        if (options.hasOwnProperty(key)) {
            var option = options[key];
            switch (key) {

            case 'index':
                this._index = option;
                break;

            case 'range':
                validRange(option);
                this._min = option.min;
                this._max = option.max;
                this.contentSize = option.max - option.min + 1;
                break;

            default:
                if (
                    key.charAt(0) !== '_' &&
                    typeof FinBar.prototype[key] !== 'function'
                ) {
                    // override prototype defaults for standard ;
                    // extend with additional properties (for use in onchange event handlers)
                    this[key] = option;
                }
                break;

            }
        }
    }

    cssInjector(cssFinBars, 'finbar-base', options.cssStylesheetReferenceElement);
}

FinBar.prototype = {

    /**
     * @summary The scrollbar orientation.
     * @desc Set by the constructor to either `'vertical'` or `'horizontal'`. See the similarly named property in the {@link finbarOptions} object.
     *
     * Useful values are `'vertical'` (the default) or `'horizontal'`.
     *
     * Setting this property resets `this.oh` and `this.deltaProp` and changes the class names so as to reposition the scrollbar as per the CSS rules for the new orientation.
     * @default 'vertical'
     * @type {string}
     * @memberOf FinBar.prototype
     */
    set orientation(orientation) {
        if (orientation === this._orientation) {
            return;
        }

        this._orientation = orientation;

        /**
         * @readonly
         * @name oh
         * @summary <u>O</u>rientation <u>h</u>ash for this scrollbar.
         * @desc Set by the `orientation` setter to either the vertical or the horizontal orientation hash. The property should always be synchronized with `orientation`; do not update directly!
         *
         * This object is used internally to access scrollbars' DOM element properties in a generalized way without needing to constantly query the scrollbar orientation. For example, instead of explicitly coding `this.bar.top` for a vertical scrollbar and `this.bar.left` for a horizontal scrollbar, simply code `this.bar[this.oh.leading]` instead. See the {@link orientationHashType} definition for details.
         *
         * This object is useful externally for coding generalized {@link finbarOnChange} event handler functions that serve both horizontal and vertical scrollbars.
         * @type {orientationHashType}
         * @memberOf FinBar.prototype
         */
        this.oh = orientationHashes[this._orientation];

        if (!this.oh) {
            error('Invalid value for `options._orientation.');
        }

        /**
         * @name deltaProp
         * @summary The name of the `WheelEvent` property this scrollbar should listen to.
         * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
         *
         * Useful values are `'deltaX'`, `'deltaY'`, or `'deltaZ'`. A value of `null` means to ignore mouse wheel events entirely.
         *
         * The mouse wheel is one-dimensional and only emits events with `deltaY` data. This property is provided so that you can override the default of `'deltaX'` with a value of `'deltaY'` on your horizontal scrollbar primarily to accommodate certain "panoramic" interface designs where the mouse wheel should control horizontal rather than vertical scrolling. Just give `{ deltaProp: 'deltaY' }` in your horizontal scrollbar instantiation.
         *
         * Caveat: Note that a 2-finger drag on an Apple trackpad emits events with _both_ `deltaX ` and `deltaY` data so you might want to delay making the above adjustment until you can determine that you are getting Y data only with no X data at all (which is a sure bet you on a mouse wheel rather than a trackpad).

         * @type {object|null}
         * @memberOf FinBar.prototype
         */
        this.deltaProp = this.oh.delta;

        this.bar.className = this.bar.className.replace(/(vertical|horizontal)/g, orientation);

        if (this.bar.style.cssText || this.thumb.style.cssText) {
            this.bar.removeAttribute('style');
            this.thumb.removeAttribute('style');
            this.resize();
        }
    },
    get orientation() {
        return this._orientation;
    },

    /**
     * @summary Callback for scroll events.
     * @desc Set by the constructor via the similarly named property in the {@link finbarOptions} object. After instantiation, `this.onchange` may be updated directly.
     *
     * This event handler is called whenever the value of the scrollbar is changed through user interaction. The typical use case is when the content is scrolled. It is called with the `FinBar` object as its context and the current value of the scrollbar (its index, rounded) as the only parameter.
     *
     * Set this property to `null` to stop emitting such events.
     * @type {function(number)|null}
     * @memberOf FinBar.prototype
     */
    onchange: null,

    /**
     * @summary Add a CSS class name to the bar element's class list.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * The bar element's class list will always include `finbar-vertical` (or `finbar-horizontal` based on the current orientation). Whenever this property is set to some value, first the old prefix+orientation is removed from the bar element's class list; then the new prefix+orientation is added to the bar element's class list. This property causes _an additional_ class name to be added to the bar element's class list. Therefore, this property will only add at most one additional class name to the list.
     *
     * To remove _classname-orientation_ from the bar element's class list, set this property to a falsy value, such as `null`.
     *
     * > NOTE: You only need to specify an additional class name when you need to have mulltiple different styles of scrollbars on the same page. If this is not a requirement, then you don't need to make a new class; you would just create some additional rules using the same selectors in the built-in stylesheet (../css/finbars.css):
     * *`div.finbar-vertical` (or `div.finbar-horizontal`) for the scrollbar
     * *`div.finbar-vertical > div` (or `div.finbar-horizontal > div`) for the "thumb."
     *
     * Of course, your rules should come after the built-ins.
     * @type {string}
     * @memberOf FinBar.prototype
     */
    set classPrefix(prefix) {
        if (this._classPrefix) {
            this.bar.classList.remove(this._classPrefix + this.orientation);
        }

        this._classPrefix = prefix;

        if (prefix) {
            this.bar.classList.add(prefix + '-' + this.orientation);
        }
    },
    get classPrefix() {
        return this._classPrefix;
    },

    /**
     * @name increment
     * @summary Number of scrollbar index units representing a pageful. Used exclusively for paging up and down and for setting thumb size relative to content size.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * Can also be given as a parameter to the {@link FinBar#resize|resize} method, which is pertinent because content area size changes affect the definition of a "pageful." However, you only need to do this if this value is being used. It not used when:
     * * you define `paging.up` and `paging.down`
     * * your scrollbar is using `scrollRealContent`
     * @type {number}
     * @memberOf FinBar.prototype
     */
    increment: 1,

    /**
     * @name barStyles
     * @summary Scrollbar styles to be applied by {@link FinBar#resize|resize()}.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * This is a value to be assigned to {@link FinBar#styles|styles} on each call to {@link FinBar#resize|resize()}. That is, a hash of values to be copied to the scrollbar element's style object on resize; or `null` for none.
     *
     * @see {@link FinBar#style|style}
     * @type {finbarStyles|null}
     * @memberOf FinBar.prototype
     */
    barStyles: null,

    /**
     * @name style
     * @summary Additional scrollbar styles.
     * @desc See type definition for more details. These styles are applied directly to the scrollbar's `bar` element.
     *
     * Values are adjusted as follows before being applied to the element:
     * 1. Included "pseudo-property" names from the scrollbar's orientation hash, {@link FinBar#oh|oh}, are translated to actual property names before being applied.
     * 2. When there are margins, percentages are translated to absolute pixel values because CSS ignores margins in its percentage calculations.
     * 3. If you give a value without a unit (a raw number), "px" unit is appended.
     *
     * General notes:
     * 1. It is always preferable to specify styles via a stylesheet. Only set this property when you need to specifically override (a) stylesheet value(s).
     * 2. Can be set directly or via calls to the {@link FinBar#resize|resize} method.
     * 3. Should only be set after the scrollbar has been inserted into the DOM.
     * 4. Before applying these new values to the element, _all_ in-line style values are reset (by removing the element's `style` attribute), exposing inherited values (from stylesheets).
     * 5. Empty object has no effect.
     * 6. Falsey value in place of object has no effect.
     *
     * > CAVEAT: Do not attempt to treat the object you assign to this property as if it were `this.bar.style`. Specifically, changing this object after assigning it will have no effect on the scrollbar. You must assign it again if you want it to have an effect.
     *
     * @see {@link FinBar#barStyles|barStyles}
     * @type {finbarStyles}
     * @memberOf FinBar.prototype
     */
    set style(styles) {
        var keys = Object.keys(styles = extend({}, styles, this._auxStyles));

        if (keys.length) {
            var bar = this.bar,
                barRect = bar.getBoundingClientRect(),
                container = this.container || bar.parentElement,
                containerRect = container.getBoundingClientRect(),
                oh = this.oh;

            // Before applying new styles, revert all styles to values inherited from stylesheets
            bar.removeAttribute('style');

            keys.forEach(function (key) {
                var val = styles[key];

                if (key in oh) {
                    key = oh[key];
                }

                if (!isNaN(Number(val))) {
                    val = (val || 0) + 'px';
                } else if (/%$/.test(val)) {
                    // When bar size given as percentage of container, if bar has margins, restate size in pixels less margins.
                    // (If left as percentage, CSS's calculation will not exclude margins.)
                    var oriented = axis[key],
                        margins = barRect[oriented.marginLeading] + barRect[oriented.marginTrailing];
                    if (margins) {
                        val = parseInt(val, 10) / 100 * containerRect[oriented.size] - margins + 'px';
                    }
                }

                bar.style[key] = val;
            });
        }
    },

    /**
     * @readonly
     * @name paging
     * @summary Enable page up/dn clicks.
     * @desc Set by the constructor. See the similarly named property in the {@link finbarOptions} object.
     *
     * If truthy, listen for clicks in page-up and page-down regions of scrollbar.
     *
     * If an object, call `.paging.up()` on page-up clicks and `.paging.down()` will be called on page-down clicks.
     *
     * Changing the truthiness of this value after instantiation currently has no effect.
     * @type {boolean|object}
     * @memberOf FinBar.prototype
     */
    paging: true,

    /**
     * @name range
     * @summary Setter for the minimum and maximum scroll values.
     * @desc Set by the constructor. These values are the limits for {@link FooBar#index|index}.
     *
     * The setter accepts an object with exactly two numeric properties: `.min` which must be less than `.max`. The values are extracted and the object is discarded.
     *
     * The getter returns a new object with `.min` and '.max`.
     *
     * @type {rangeType}
     * @memberOf FinBar.prototype
     */
    set range(range) {
        validRange(range);
        this._min = range.min;
        this._max = range.max;
        this.contentSize = range.max - range.min + 1;
        this.index = this.index; // re-clamp
    },
    get range() {
        return {
            min: this._min,
            max: this._max
        };
    },

    /**
     * @summary Index value of the scrollbar.
     * @desc This is the position of the scroll thumb.
     *
     * Setting this value clamps it to {@link FinBar#min|min}..{@link FinBar#max|max}, scroll the content, and moves thumb.
     *
     * Getting this value returns the current index. The returned value will be in the range `min`..`max`. It is intentionally not rounded.
     *
     * Use this value as an alternative to (or in addition to) using the {@link FinBar#onchange|onchange} callback function.
     *
     * @see {@link FinBar#_setScroll|_setScroll}
     * @type {number}
     * @memberOf FinBar.prototype
     */
    set index(idx) {
        idx = Math.min(this._max, Math.max(this._min, idx)); // clamp it
        this._setScroll(idx);
        // this._setThumbSize();
    },
    get index() {
        return this._index;
    },

    /**
     * @private
     * @summary Move the thumb.
     * @desc Also displays the index value in the test panel and invokes the callback.
     * @param idx - The new scroll index, a value in the range `min`..`max`.
     * @param [scaled=f(idx)] - The new thumb position in pixels and scaled relative to the containing {@link FinBar#bar|bar} element, i.e., a proportional number in the range `0`..`thumbMax`. When omitted, a function of `idx` is used.
     * @memberOf FinBar.prototype
     */
    _setScroll: function (idx, scaled) {
        this._index = idx;

        // Display the index value in the test panel
        if (this.testPanelItem && this.testPanelItem.index instanceof Element) {
            this.testPanelItem.index.innerHTML = Math.round(idx);
        }

        // Call the callback
        if (this.onchange) {
            this.onchange.call(this, Math.round(idx));
        }

        // Move the thumb
        if (scaled === undefined) {
            scaled = (idx - this._min) / (this._max - this._min) * this._thumbMax;
        }
        this.thumb.style[this.oh.leading] = scaled + 'px';
    },

    scrollRealContent: function (idx) {
        var containerRect = this.content.parentElement.getBoundingClientRect(),
            sizeProp = this.oh.size,
            maxScroll = Math.max(0, this.content[sizeProp] - containerRect[sizeProp]),
            //scroll = Math.min(idx, maxScroll);
            scroll = (idx - this._min) / (this._max - this._min) * maxScroll;
        //console.log('scroll: ' + scroll);
        this.content.style[this.oh.leading] = -scroll + 'px';
    },

    /**
     * @summary Recalculate thumb position.
     *
     * @desc This method recalculates the thumb size and position. Call it once after inserting your scrollbar into the DOM, and repeatedly while resizing the scrollbar (which typically happens when the scrollbar's parent is resized by user.
     *
     * > This function shifts args if first arg omitted.
     *
     * @param {number} [increment=this.increment] - Resets {@link FooBar#increment|increment} (see).
     *
     * @param {finbarStyles} [barStyles=this.barStyles] - (See type definition for details.) Scrollbar styles to be applied to the bar element.
     *
     * Only specify a `barStyles` object when you need to override stylesheet values. If provided, becomes the new default (`this.barStyles`), for use as a default on subsequent calls.
     *
     * It is generally the case that the scrollbar's new position is sufficiently described by the current styles. Therefore, it is unusual to need to provide a `barStyles` object on every call to `resize`.
     *
     * @returns {FinBar} Self for chaining.
     * @memberOf FinBar.prototype
     */
    resize: function (increment, barStyles) {
        var bar = this.bar;

        if (!bar.parentNode) {
            return; // not in DOM yet so nothing to do
        }

        var container = this.container || bar.parentElement,
            containerRect = container.getBoundingClientRect();

        // shift args if if 1st arg omitted
        if (typeof increment === 'object') {
            barStyles = increment;
            increment = undefined;
        }

        this.style = this.barStyles = barStyles || this.barStyles;

        // Bound to real content: Content was given but no onchange handler.
        // Set up .onchange, .containerSize, and .increment.
        // Note this only makes sense if your index unit is pixels.
        if (this.content) {
            if (!this.onchange) {
                this.onchange = this.scrollRealContent;
                this.contentSize = this.content[this.oh.size];
                this._min = 0;
                this._max = this.contentSize - 1;
            }
        }
        if (this.onchange === this.scrollRealContent) {
            this.containerSize = containerRect[this.oh.size];
            this.increment = this.containerSize / (this.contentSize - this.containerSize) * (this._max - this._min);
        } else {
            this.containerSize = 1;
            this.increment = increment || this.increment;
        }

        var index = this.index;
        this.testPanelItem = this.testPanelItem || this._addTestPanelItem();
        this._setThumbSize();
        this.index = index;

        if (this.deltaProp !== null) {
            container.addEventListener('wheel', this._bound.onwheel);
        }

        return this;
    },

    /**
     * @summary Shorten trailing end of scrollbar by thickness of some other scrollbar.
     * @desc In the "classical" scenario where vertical scroll bar is on the right and horizontal scrollbar is on the bottom, you want to shorten the "trailing end" (bottom and right ends, respectively) of at least one of them so they don't overlay.
     *
     * This convenience function is an programmatic alternative to hardcoding the correct style with the correct value in your stylesheet; or setting the correct style with the correct value in the {@link FinBar#barStyles|barStyles} object.
     *
     * @see {@link FinBar#foreshortenBy|foreshortenBy}.
     *
     * @param {FinBar|null} otherFinBar - Other scrollbar to avoid by shortening this one; `null` removes the trailing space
     * @returns {FinBar} For chaining
     */
    shortenBy: function (otherFinBar) { return this.shortenEndBy('trailing', otherFinBar); },

    /**
     * @summary Shorten leading end of scrollbar by thickness of some other scrollbar.
     * @desc Supports non-classical scrollbar scenarios where vertical scroll bar may be on left and horizontal scrollbar may be on top, in which case you want to shorten the "leading end" rather than the trailing end.
     * @see {@link FinBar#shortenBy|shortenBy}.
     * @param {FinBar|null} otherFinBar - Other scrollbar to avoid by shortening this one; `null` removes the trailing space
     * @returns {FinBar} For chaining
     */
    foreshortenBy: function (otherFinBar) { return this.shortenEndBy('leading', otherFinBar); },

    /**
     * @summary Generalized shortening function.
     * @see {@link FinBar#shortenBy|shortenBy}.
     * @see {@link FinBar#foreshortenBy|foreshortenBy}.
     * @param {string} whichEnd - a CSS style property name or an orientation hash name that translates to a CSS style property name.
     * @param {FinBar|null} otherFinBar - Other scrollbar to avoid by shortening this one; `null` removes the trailing space
     * @returns {FinBar} For chaining
     */
    shortenEndBy: function (whichEnd, otherFinBar) {
        if (!otherFinBar) {
            delete this._auxStyles;
        } else if (otherFinBar instanceof FinBar && otherFinBar.orientation !== this.orientation) {
            var otherStyle = window.getComputedStyle(otherFinBar.bar),
                ooh = orientationHashes[otherFinBar.orientation];
            this._auxStyles = {};
            this._auxStyles[whichEnd] = otherStyle[ooh.thickness];
        }
        return this; // for chaining
    },

    /**
     * @private
     * @summary Sets the proportional thumb size and hides thumb when 100%.
     * @desc The thumb size has an absolute minimum of 20 (pixels).
     * @memberOf FinBar.prototype
     */
    _setThumbSize: function () {
        var oh = this.oh,
            thumbComp = window.getComputedStyle(this.thumb),
            thumbMarginLeading = parseInt(thumbComp[oh.marginLeading]),
            thumbMarginTrailing = parseInt(thumbComp[oh.marginTrailing]),
            thumbMargins = thumbMarginLeading + thumbMarginTrailing,
            barSize = this.bar.getBoundingClientRect()[oh.size],
            thumbSize = Math.max(20, barSize * this.containerSize / this.contentSize);

        if (this.containerSize < this.contentSize) {
            this.bar.style.visibility = 'visible';
            this.thumb.style[oh.size] = thumbSize + 'px';
        } else {
            this.bar.style.visibility = 'hidden';
        }

        /**
         * @private
         * @name _thumbMax
         * @summary Maximum offset of thumb's leading edge.
         * @desc This is the pixel offset within the scrollbar of the thumb when it is at its maximum position at the extreme end of its range.
         *
         * This value takes into account the newly calculated size of the thumb element (including its margins) and the inner size of the scrollbar (the thumb's containing element, including _its_ margins).
         *
         * NOTE: Scrollbar padding is not taken into account and assumed to be 0 in the current implementation and is assumed to be `0`; use thumb margins in place of scrollbar padding.
         * @type {number}
         * @memberOf FinBar.prototype
         */
        this._thumbMax = barSize - thumbSize - thumbMargins;

        this._thumbMarginLeading = thumbMarginLeading; // used in mousedown
    },

    /**
     * @summary Remove the scrollbar.
     * @desc Unhooks all the event handlers and then removes the element from the DOM. Always call this method prior to disposing of the scrollbar object.
     * @memberOf FinBar.prototype
     */
    remove: function () {
        this._removeEvt('mousedown');
        this._removeEvt('mousemove');
        this._removeEvt('mouseup');

        (this.container || this.bar.parentElement)._removeEvt('wheel', this._bound.onwheel);

        this.bar.onclick =
            this.thumb.onclick =
                this.thumb.onmouseover =
                    this.thumb.transitionend =
                        this.thumb.onmouseout = null;

        this.bar.remove();
    },

    /**
     * @private
     * @function _addTestPanelItem
     * @summary Append a test panel element.
     * @desc If there is a test panel in the DOM (typically an `<ol>...</ol>` element) with class names of both `this.classPrefix` and `'test-panel'` (or, barring that, any element with class name `'test-panel'`), an `<li>...</li>` element will be created and appended to it. This new element will contain a span for each class name given.
     *
     * You should define a CSS selector `.listening` for these spans. This class will be added to the spans to alter their appearance when a listener is added with that class name (prefixed with 'on').
     *
     * (This is an internal function that is called once by the constructor on every instantiation.)
     * @returns {Element|undefined} The appended `<li>...</li>` element or `undefined` if there is no test panel.
     * @memberOf FinBar.prototype
     */
    _addTestPanelItem: function () {
        var testPanelItem,
            testPanelElement = document.querySelector('.' + this._classPrefix + '.test-panel') || document.querySelector('.test-panel');

        if (testPanelElement) {
            var testPanelItemPartNames = [ 'mousedown', 'mousemove', 'mouseup', 'index' ],
                item = document.createElement('li');

            testPanelItemPartNames.forEach(function (partName) {
                item.innerHTML += '<span class="' + partName + '">' + partName.replace('mouse', '') + '</span>';
            });

            testPanelElement.appendChild(item);

            testPanelItem = {};
            testPanelItemPartNames.forEach(function (partName) {
                testPanelItem[partName] = item.getElementsByClassName(partName)[0];
            });
        }

        return testPanelItem;
    },

    _addEvt: function (evtName) {
        var spy = this.testPanelItem && this.testPanelItem[evtName];
        if (spy) { spy.classList.add('listening'); }
        window.addEventListener(evtName, this._bound['on' + evtName]);
    },

    _removeEvt: function (evtName) {
        var spy = this.testPanelItem && this.testPanelItem[evtName];
        if (spy) { spy.classList.remove('listening'); }
        window.removeEventListener(evtName, this._bound['on' + evtName]);
    }
};

function extend(obj) {
    for (var i = 1; i < arguments.length; ++i) {
        var objn = arguments[i];
        if (objn) {
            for (var key in objn) {
                obj[key] = objn[key];
            }
        }
    }
    return obj;
}

function validRange(range) {
    var keys = Object.keys(range),
        valid =  keys.length === 2 &&
            typeof range.min === 'number' &&
            typeof range.max === 'number' &&
            range.min <= range.max;

    if (!valid) {
        error('Invalid .range object.');
    }
}

/**
 * @private
 * @name handlersToBeBound
 * @type {object}
 * @desc The functions defined in this object are all DOM event handlers that are bound by the FinBar constructor to each new instance. In other words, the `this` value of these handlers, once bound, refer to the FinBar object and not to the event emitter. "Do not consume raw."
 */
var handlersToBeBound = {
    shortStop: function (evt) {
        evt.stopPropagation();
    },

    onwheel: function (evt) {
        this.index += evt[this.deltaProp];
        evt.stopPropagation();
        evt.preventDefault();
    },

    onclick: function (evt) {
        var thumbBox = this.thumb.getBoundingClientRect(),
            goingUp = evt[this.oh.coordinate] < thumbBox[this.oh.leading];

        if (typeof this.paging === 'object') {
            this.index = this.paging[goingUp ? 'up' : 'down'](Math.round(this.index));
        } else {
            this.index += goingUp ? -this.increment : this.increment;
        }

        // make the thumb glow momentarily
        this.thumb.classList.add('hover');
        var self = this;
        this.thumb.addEventListener('transitionend', function waitForIt() {
            this.removeEventListener('transitionend', waitForIt);
            self._bound.onmouseup(evt);
        });

        evt.stopPropagation();
    },

    onmouseover: function () {
        this.thumb.classList.add('hover');
        this.thumb.onmouseout = this._bound.onmouseout;
        this._addEvt('mousedown');
    },

    onmouseout: function () {
        this._removeEvt('mousedown');
        this.thumb.onmouseover = this._bound.onmouseover;
        this.thumb.classList.remove('hover');
    },

    onmousedown: function (evt) {
        this._removeEvt('mousedown');
        this.thumb.onmouseover = this.thumb.onmouseout = null;

        var thumbBox = this.thumb.getBoundingClientRect();
        this.pinOffset = evt[this.oh.axis] - thumbBox[this.oh.leading] + this.bar.getBoundingClientRect()[this.oh.leading] + this._thumbMarginLeading;
        document.documentElement.style.cursor = 'default';

        this._addEvt('mousemove');
        this._addEvt('mouseup');

        evt.stopPropagation();
        evt.preventDefault();
    },

    onmousemove: function (evt) {
        var scaled = Math.min(this._thumbMax, Math.max(0, evt[this.oh.axis] - this.pinOffset));
        var idx = scaled / this._thumbMax * (this._max - this._min) + this._min;

        this._setScroll(idx, scaled);

        evt.stopPropagation();
        evt.preventDefault();
    },

    onmouseup: function (evt) {
        this._removeEvt('mousemove');
        this._removeEvt('mouseup');

        document.documentElement.style.cursor = 'auto';

        var thumbBox = this.thumb.getBoundingClientRect();
        if (
            thumbBox.left <= evt.clientX && evt.clientX <= thumbBox.right &&
            thumbBox.top <= evt.clientY && evt.clientY <= thumbBox.bottom
        ) {
            this._bound.onmouseover(evt);
        } else {
            this._bound.onmouseout(evt);
        }

        evt.stopPropagation();
        evt.preventDefault();
    }
};

var orientationHashes = {
    vertical: {
        coordinate:     'clientY',
        axis:           'pageY',
        size:           'height',
        outside:        'right',
        inside:         'left',
        leading:        'top',
        trailing:       'bottom',
        marginLeading:  'marginTop',
        marginTrailing: 'marginBottom',
        thickness:      'width',
        delta:          'deltaY'
    },
    horizontal: {
        coordinate:     'clientX',
        axis:           'pageX',
        size:           'width',
        outside:        'bottom',
        inside:         'top',
        leading:        'left',
        trailing:       'right',
        marginLeading:  'marginLeft',
        marginTrailing: 'marginRight',
        thickness:      'height',
        delta:          'deltaX'
    }
};

var axis = {
    top:    'vertical',
    bottom: 'vertical',
    height: 'vertical',
    left:   'horizontal',
    right:  'horizontal',
    width:  'horizontal'
};

var cssFinBars; // definition inserted by gulpfile between following comments
/* inject:css */
cssFinBars = 'div.finbar-horizontal,div.finbar-vertical{position:absolute;margin:3px}div.finbar-horizontal>.thumb,div.finbar-vertical>.thumb{position:absolute;background-color:#d3d3d3;-webkit-box-shadow:0 0 1px #000;-moz-box-shadow:0 0 1px #000;box-shadow:0 0 1px #000;border-radius:4px;margin:2px;opacity:.4;transition:opacity .5s}div.finbar-horizontal>.thumb.hover,div.finbar-vertical>.thumb.hover{opacity:1;transition:opacity .5s}div.finbar-vertical{top:0;bottom:0;right:0;width:11px}div.finbar-vertical>.thumb{top:0;right:0;width:7px}div.finbar-horizontal{left:0;right:0;bottom:0;height:11px}div.finbar-horizontal>.thumb{left:0;bottom:0;height:7px}';
/* endinject */

function error(msg) {
    throw 'finbars: ' + msg;
}

// Interface
module.exports = FinBar;

},{"css-injector":2}],4:[function(require,module,exports){
;(function () { // closure for web browsers

if (typeof module === 'object' && module.exports) {
  module.exports = LRUCache
} else {
  // just set the global for non-node platforms.
  this.LRUCache = LRUCache
}

function hOP (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function naiveLength () { return 1 }

var didTypeWarning = false
function typeCheckKey(key) {
  if (!didTypeWarning && typeof key !== 'string' && typeof key !== 'number') {
    didTypeWarning = true
    console.error(new TypeError("LRU: key must be a string or number. Almost certainly a bug! " + typeof key).stack)
  }
}

function LRUCache (options) {
  if (!(this instanceof LRUCache))
    return new LRUCache(options)

  if (typeof options === 'number')
    options = { max: options }

  if (!options)
    options = {}

  this._max = options.max
  // Kind of weird to have a default max of Infinity, but oh well.
  if (!this._max || !(typeof this._max === "number") || this._max <= 0 )
    this._max = Infinity

  this._lengthCalculator = options.length || naiveLength
  if (typeof this._lengthCalculator !== "function")
    this._lengthCalculator = naiveLength

  this._allowStale = options.stale || false
  this._maxAge = options.maxAge || null
  this._dispose = options.dispose
  this.reset()
}

// resize the cache when the max changes.
Object.defineProperty(LRUCache.prototype, "max",
  { set : function (mL) {
      if (!mL || !(typeof mL === "number") || mL <= 0 ) mL = Infinity
      this._max = mL
      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._max }
  , enumerable : true
  })

// resize the cache when the lengthCalculator changes.
Object.defineProperty(LRUCache.prototype, "lengthCalculator",
  { set : function (lC) {
      if (typeof lC !== "function") {
        this._lengthCalculator = naiveLength
        this._length = this._itemCount
        for (var key in this._cache) {
          this._cache[key].length = 1
        }
      } else {
        this._lengthCalculator = lC
        this._length = 0
        for (var key in this._cache) {
          this._cache[key].length = this._lengthCalculator(this._cache[key].value)
          this._length += this._cache[key].length
        }
      }

      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._lengthCalculator }
  , enumerable : true
  })

Object.defineProperty(LRUCache.prototype, "length",
  { get : function () { return this._length }
  , enumerable : true
  })


Object.defineProperty(LRUCache.prototype, "itemCount",
  { get : function () { return this._itemCount }
  , enumerable : true
  })

LRUCache.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this
  var i = 0
  var itemCount = this._itemCount

  for (var k = this._mru - 1; k >= 0 && i < itemCount; k--) if (this._lruList[k]) {
    i++
    var hit = this._lruList[k]
    if (isStale(this, hit)) {
      del(this, hit)
      if (!this._allowStale) hit = undefined
    }
    if (hit) {
      fn.call(thisp, hit.value, hit.key, this)
    }
  }
}

LRUCache.prototype.keys = function () {
  var keys = new Array(this._itemCount)
  var i = 0
  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    var hit = this._lruList[k]
    keys[i++] = hit.key
  }
  return keys
}

LRUCache.prototype.values = function () {
  var values = new Array(this._itemCount)
  var i = 0
  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    var hit = this._lruList[k]
    values[i++] = hit.value
  }
  return values
}

LRUCache.prototype.reset = function () {
  if (this._dispose && this._cache) {
    for (var k in this._cache) {
      this._dispose(k, this._cache[k].value)
    }
  }

  this._cache = Object.create(null) // hash of items by key
  this._lruList = Object.create(null) // list of items in order of use recency
  this._mru = 0 // most recently used
  this._lru = 0 // least recently used
  this._length = 0 // number of items in the list
  this._itemCount = 0
}

LRUCache.prototype.dump = function () {
  var arr = []
  var i = 0

  for (var k = this._mru - 1; k >= 0 && i < this._itemCount; k--) if (this._lruList[k]) {
    var hit = this._lruList[k]
    if (!isStale(this, hit)) {
      //Do not store staled hits
      ++i
      arr.push({
        k: hit.key,
        v: hit.value,
        e: hit.now + (hit.maxAge || 0)
      });
    }
  }
  //arr has the most read first
  return arr
}

LRUCache.prototype.dumpLru = function () {
  return this._lruList
}

LRUCache.prototype.set = function (key, value, maxAge) {
  maxAge = maxAge || this._maxAge
  typeCheckKey(key)

  var now = maxAge ? Date.now() : 0
  var len = this._lengthCalculator(value)

  if (hOP(this._cache, key)) {
    if (len > this._max) {
      del(this, this._cache[key])
      return false
    }
    // dispose of the old one before overwriting
    if (this._dispose)
      this._dispose(key, this._cache[key].value)

    this._cache[key].now = now
    this._cache[key].maxAge = maxAge
    this._cache[key].value = value
    this._length += (len - this._cache[key].length)
    this._cache[key].length = len
    this.get(key)

    if (this._length > this._max)
      trim(this)

    return true
  }

  var hit = new Entry(key, value, this._mru++, len, now, maxAge)

  // oversized objects fall out of cache automatically.
  if (hit.length > this._max) {
    if (this._dispose) this._dispose(key, value)
    return false
  }

  this._length += hit.length
  this._lruList[hit.lu] = this._cache[key] = hit
  this._itemCount ++

  if (this._length > this._max)
    trim(this)

  return true
}

LRUCache.prototype.has = function (key) {
  typeCheckKey(key)
  if (!hOP(this._cache, key)) return false
  var hit = this._cache[key]
  if (isStale(this, hit)) {
    return false
  }
  return true
}

LRUCache.prototype.get = function (key) {
  typeCheckKey(key)
  return get(this, key, true)
}

LRUCache.prototype.peek = function (key) {
  typeCheckKey(key)
  return get(this, key, false)
}

LRUCache.prototype.pop = function () {
  var hit = this._lruList[this._lru]
  del(this, hit)
  return hit || null
}

LRUCache.prototype.del = function (key) {
  typeCheckKey(key)
  del(this, this._cache[key])
}

LRUCache.prototype.load = function (arr) {
  //reset the cache
  this.reset();

  var now = Date.now()
  //A previous serialized cache has the most recent items first
  for (var l = arr.length - 1; l >= 0; l-- ) {
    var hit = arr[l]
    typeCheckKey(hit.k)
    var expiresAt = hit.e || 0
    if (expiresAt === 0) {
      //the item was created without expiration in a non aged cache
      this.set(hit.k, hit.v)
    } else {
      var maxAge = expiresAt - now
      //dont add already expired items
      if (maxAge > 0) this.set(hit.k, hit.v, maxAge)
    }
  }
}

function get (self, key, doUse) {
  typeCheckKey(key)
  var hit = self._cache[key]
  if (hit) {
    if (isStale(self, hit)) {
      del(self, hit)
      if (!self._allowStale) hit = undefined
    } else {
      if (doUse) use(self, hit)
    }
    if (hit) hit = hit.value
  }
  return hit
}

function isStale(self, hit) {
  if (!hit || (!hit.maxAge && !self._maxAge)) return false
  var stale = false;
  var diff = Date.now() - hit.now
  if (hit.maxAge) {
    stale = diff > hit.maxAge
  } else {
    stale = self._maxAge && (diff > self._maxAge)
  }
  return stale;
}

function use (self, hit) {
  shiftLU(self, hit)
  hit.lu = self._mru ++
  self._lruList[hit.lu] = hit
}

function trim (self) {
  while (self._lru < self._mru && self._length > self._max)
    del(self, self._lruList[self._lru])
}

function shiftLU (self, hit) {
  delete self._lruList[ hit.lu ]
  while (self._lru < self._mru && !self._lruList[self._lru]) self._lru ++
}

function del (self, hit) {
  if (hit) {
    if (self._dispose) self._dispose(hit.key, hit.value)
    self._length -= hit.length
    self._itemCount --
    delete self._cache[ hit.key ]
    shiftLU(self, hit)
  }
}

// classy, since V8 prefers predictable objects.
function Entry (key, value, lu, length, now, maxAge) {
  this.key = key
  this.value = value
  this.lu = lu
  this.length = length
  this.now = now
  if (maxAge) this.maxAge = maxAge
}

})()

},{}],5:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
},{"./defaultcellrenderer.js":8}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
    this.boundsInitialized = false;

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
    this.boundsInitialized = false;
};

Grid.prototype.initialize = function() {
    var self = this;
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
    divMain.style.right = 0;
    divMain.style.bottom = 0;
    divMain.style.left = 0;

    // divMain.style.overflow = 'auto';
    // divMain.style.msOverflowStyle = '-ms-autohiding-scrollbar';
    // divMain.addEventListener("scroll", function(e) {
    //     divHeader.scrollLeft = e.target.scrollLeft;
    // });
    divMain.style.overflow = 'hidden';

    if (this.resolveProperty('scrollingEnabled') === true) {
        this.initScrollbars();
        container.appendChild(this.scrollbarsDiv);
    }

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
            if (!self.ignoreScrollEvents) {
                self.setScrollX(idx);
            }
        },
        cssStylesheetReferenceElement: document.body,
        container: this.getContainer(),
    });

    var vertBar = new FinBar({
        orientation: 'vertical',
        onchange: function(idx) {
            if (!self.ignoreScrollEvents) {
                self.setScrollY(idx);
            }
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
    if (this.scrollX !== value) {
        this.scrollX = value;
        this.trigger('renderedrowrangechanged');
        this.paintAll();
    }
};

Grid.prototype.setScrollY = function(value) {
    if (this.scrollY !== value) {
        this.scrollY = value;
        this.trigger('renderedrowrangechanged');
        this.paintAll();
    }
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
    var fixedRowHeight = this.getFixedRowHeight();
    var outer = document.createElement('div');
    var strVar="";
    strVar += "<div style=\"top:" + fixedRowHeight + "px;right:0px;bottom:0px;left:0px;position:absolute\">";
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

    if (!this.boundsInitialized || canvas.getAttribute('width') !== ('' + viewport.width)
        || canvas.getAttribute('height') !== ('' + (viewport.height - headerHeight))) {

        headerCanvas.style.position = 'relative';

        canvas.parentElement.style.top = headerHeight + 'px';
        canvas.style.position = 'relative';
        canvas.style.top = '1px';

        this.setDpi(headerCanvas, viewport.width, headerHeight);
        this.setDpi(canvas, viewport.width, (viewport.height - headerHeight));
    } else {
        // If the dimensions haven't changed, no need to do anything.
        return;
    }

    this.boundsInitialized = true;

    this.checkScrollbars();

    this.paintAll();

    return true;
};

Grid.prototype.setDpi = function(canvas, width, height) {
    var context = canvas.getContext('2d'),
        devicePixelRatio = window.devicePixelRatio || 1,
        backingStoreRatio = context.webkitBackingStorePixelRatio ||
                        context.mozBackingStorePixelRatio ||
                        context.msBackingStorePixelRatio ||
                        context.oBackingStorePixelRatio ||
                        context.backingStorePixelRatio || 1,
        ratio = this.resolveProperty('highDpiEnabled') ? devicePixelRatio / backingStoreRatio : 1;

    canvas.setAttribute('width', width * ratio);
    canvas.setAttribute('height', height * ratio);

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    context.scale(ratio, ratio);
};

Grid.prototype.updateRowCount = function() {
    this.checkScrollbars();
    this.paintAll();
};

Grid.prototype.checkScrollbars = function() {
    if (this.resolveProperty('scrollingEnabled') === true) {
        this.ignoreScrollEvents = true;
        //the model may have changed, lets
        //recompute the scrolling coordinates
        var oldScrollX = this.scrollX,
            oldScrollY = this.scrollY;

        this.finalPageLocation = undefined;
        var finalPageLocation = this.getFinalPageLocation();
        this.setHScrollbarValues(finalPageLocation.x);
        this.setVScrollbarValues(finalPageLocation.y);

        this.resizeScrollbars();

        this.setScrollX(oldScrollX);
        this.setScrollY(oldScrollY);
        this.ignoreScrollEvents = false;
    }
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
    this.paintAll();
};

Grid.prototype.addEventListener = function() {
    var canvas = this.getCanvas();
    return canvas.addEventListener.apply(canvas, arguments);
};

Grid.prototype.removeEventListener = function() {
    var canvas = this.getCanvas();
    return canvas.removeEventListener.apply(canvas, arguments);
};

Grid.prototype.trigger = function(eventType) {
    var canvas = this.getCanvas();
    var evt = document.createEvent('HTMLEvents');
    evt.initEvent(eventType, true, true);
    canvas.dispatchEvent(evt);
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
        var x, y, dx, dy = 0;

        context.save();

        context.fillStyle = '#999999';
        context.fillRect(0, 0, bounds.width, bounds.height);

        for (x = 0; (x + scrollX) < numCols && totalWidth < bounds.width; x++) {
            var rowHeight = 0;
            totalHeight = 0;
            for (y = 0; (y + scrollY) < numRows && totalHeight < bounds.height; y++) {
                var dx = x + scrollX;
                var dy = y + scrollY;
                this.paintCell(context, dx, dy, config);
                rowHeight = this.getRowHeight(dy);
                totalHeight = totalHeight + rowHeight;
            }
            var colWidth = this.getColumnWidth(dx);
            totalWidth = totalWidth + colWidth;
        }

        this.renderedRange = {
            left: scrollX,
            right: x + scrollX - 1,
            top: scrollY,
            bottom: y + scrollY - 1
        }

    } catch (e) {
        context.restore();
        console.error(e);
    }
};


Grid.prototype.paintHeaders = function(config, numCols, numRows) {
    try {
    	config.halign = 'center';
    	config.cellPadding = '0px';
        var self = this;
        var context = this.getHeaderContext();
        var bounds = this.getHeaderCanvas().getBoundingClientRect();

        context.save();

        context.fillStyle = '#bbbbbb';
        context.fillRect(0, 0, bounds.width, bounds.height);

        for (var x = 0; x < numCols; x++) {
            this.paintHeaderCell(context, x, config);
        }

    } catch (e) {
        context.restore();
        console.error(e);
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
    var maxY = Math.max(maxX, this.getRowCount() - numRows);
    return {x: maxX, y: maxY}
};

Grid.prototype.getRenderedRowRange = function() {
    return this.renderedRange;
};

Grid.prototype.getDefaultCellRenderer = function() {
    return defaultcellrenderer;
}

module.exports = function(domElement, model, options) {
    return new Grid(domElement, model, options);
};


},{"../../../node_modules/finbars/index.js":3,"../../../node_modules/lru-cache/lib/lru-cache.js":4,"./col-reorder.js":6,"./column.js":7,"./defaultcellrenderer.js":8}],10:[function(require,module,exports){
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvamF2YXNjcmlwdC9tYWluLmpzIiwibm9kZV9tb2R1bGVzL2Nzcy1pbmplY3Rvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9maW5iYXJzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xydS1jYWNoZS9saWIvbHJ1LWNhY2hlLmpzIiwibm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUvdW5kZXJzY29yZS5qcyIsInNyYy9qYXZhc2NyaXB0L2NvbXBvbmVudHMvY29sLXJlb3JkZXIuanMiLCJzcmMvamF2YXNjcmlwdC9jb21wb25lbnRzL2NvbHVtbi5qcyIsInNyYy9qYXZhc2NyaXB0L2NvbXBvbmVudHMvZGVmYXVsdGNlbGxyZW5kZXJlci5qcyIsInNyYy9qYXZhc2NyaXB0L2NvbXBvbmVudHMvZ3JpZC5qcyIsInNyYy9qYXZhc2NyaXB0L2NvbXBvbmVudHMvZ3JpZG1vZGVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Z0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbnVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG52YXIgZ3JpZCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9ncmlkLmpzJyk7XG52YXIgR3JpZE1vZGVsID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dyaWRtb2RlbC5qcycpO1xuXG5pZiAoIXdpbmRvdy5maW4pIHtcbiAgICB3aW5kb3cuZmluID0ge307XG59XG5cbndpbmRvdy5maW4uaHlwZXJncmlkbGl0ZSA9IHtcbiAgICBjcmVhdGVPbjogZ3JpZCxcbiAgICBHcmlkTW9kZWw6IEdyaWRNb2RlbFxufTtcblxubW9kdWxlLmV4cG9ydHMuZm9vID0gJ2Zvbyc7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQtZW52IGJyb3dzZXIgKi9cblxuLyoqIEBuYW1lc3BhY2UgY3NzSW5qZWN0b3IgKi9cblxuLyoqXG4gKiBAc3VtbWFyeSBJbnNlcnQgYmFzZSBzdHlsZXNoZWV0IGludG8gRE9NXG4gKlxuICogQGRlc2MgQ3JlYXRlcyBhIG5ldyBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50IGZyb20gdGhlIG5hbWVkIHRleHQgc3RyaW5nKHMpIGFuZCBpbnNlcnRzIGl0IGJ1dCBvbmx5IGlmIGl0IGRvZXMgbm90IGFscmVhZHkgZXhpc3QgaW4gdGhlIHNwZWNpZmllZCBjb250YWluZXIgYXMgcGVyIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiA+IENhdmVhdDogSWYgc3R5bGVzaGVldCBpcyBmb3IgdXNlIGluIGEgc2hhZG93IERPTSwgeW91IG11c3Qgc3BlY2lmeSBhIGxvY2FsIGByZWZlcmVuY2VFbGVtZW50YC5cbiAqXG4gKiBAcmV0dXJucyBBIHJlZmVyZW5jZSB0byB0aGUgbmV3bHkgY3JlYXRlZCBgPHN0eWxlPi4uLjwvc3R5bGU+YCBlbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBjc3NSdWxlc1xuICogQHBhcmFtIHtzdHJpbmd9IFtJRF1cbiAqIEBwYXJhbSB7dW5kZWZpbmVkfG51bGx8RWxlbWVudHxzdHJpbmd9IFtyZWZlcmVuY2VFbGVtZW50XSAtIENvbnRhaW5lciBmb3IgaW5zZXJ0aW9uLiBPdmVybG9hZHM6XG4gKiAqIGB1bmRlZmluZWRgIHR5cGUgKG9yIG9taXR0ZWQpOiBpbmplY3RzIHN0eWxlc2hlZXQgYXQgdG9wIG9mIGA8aGVhZD4uLi48L2hlYWQ+YCBlbGVtZW50XG4gKiAqIGBudWxsYCB2YWx1ZTogaW5qZWN0cyBzdHlsZXNoZWV0IGF0IGJvdHRvbSBvZiBgPGhlYWQ+Li4uPC9oZWFkPmAgZWxlbWVudFxuICogKiBgRWxlbWVudGAgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBlbGVtZW50LCB3aGVyZXZlciBpdCBpcyBmb3VuZC5cbiAqICogYHN0cmluZ2AgdHlwZTogaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBmaXJzdCBlbGVtZW50IGZvdW5kIHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gY3NzIHNlbGVjdG9yLlxuICpcbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5mdW5jdGlvbiBjc3NJbmplY3Rvcihjc3NSdWxlcywgSUQsIHJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICBpZiAodHlwZW9mIHJlZmVyZW5jZUVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJlZmVyZW5jZUVsZW1lbnQpO1xuICAgICAgICBpZiAoIXJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRocm93ICdDYW5ub3QgZmluZCByZWZlcmVuY2UgZWxlbWVudCBmb3IgQ1NTIGluamVjdGlvbi4nO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChyZWZlcmVuY2VFbGVtZW50ICYmICEocmVmZXJlbmNlRWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgICAgIHRocm93ICdHaXZlbiB2YWx1ZSBub3QgYSByZWZlcmVuY2UgZWxlbWVudC4nO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXIgPSByZWZlcmVuY2VFbGVtZW50ICYmIHJlZmVyZW5jZUVsZW1lbnQucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICBpZiAoSUQpIHtcbiAgICAgICAgSUQgPSBjc3NJbmplY3Rvci5pZFByZWZpeCArIElEO1xuXG4gICAgICAgIGlmIChjb250YWluZXIucXVlcnlTZWxlY3RvcignIycgKyBJRCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gc3R5bGVzaGVldCBhbHJlYWR5IGluIERPTVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICBpZiAoSUQpIHtcbiAgICAgICAgc3R5bGUuaWQgPSBJRDtcbiAgICB9XG4gICAgaWYgKGNzc1J1bGVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3NzUnVsZXMgPSBjc3NSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9XG4gICAgY3NzUnVsZXMgPSAnXFxuJyArIGNzc1J1bGVzICsgJ1xcbic7XG4gICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzUnVsZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzUnVsZXMpKTtcbiAgICB9XG5cbiAgICBpZiAocmVmZXJlbmNlRWxlbWVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBjb250YWluZXIuZmlyc3RDaGlsZDtcbiAgICB9XG5cbiAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKHN0eWxlLCByZWZlcmVuY2VFbGVtZW50KTtcblxuICAgIHJldHVybiBzdHlsZTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBPcHRpb25hbCBwcmVmaXggZm9yIGA8c3R5bGU+YCB0YWcgSURzLlxuICogQGRlc2MgRGVmYXVsdHMgdG8gYCdpbmplY3RlZC1zdHlsZXNoZWV0LSdgLlxuICogQHR5cGUge3N0cmluZ31cbiAqIEBtZW1iZXJPZiBjc3NJbmplY3RvclxuICovXG5jc3NJbmplY3Rvci5pZFByZWZpeCA9ICdpbmplY3RlZC1zdHlsZXNoZWV0LSc7XG5cbi8vIEludGVyZmFjZVxubW9kdWxlLmV4cG9ydHMgPSBjc3NJbmplY3RvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50LWVudiBub2RlLCBicm93c2VyICovXG5cbnZhciBjc3NJbmplY3RvciA9IHJlcXVpcmUoJ2Nzcy1pbmplY3RvcicpO1xuXG4vKipcbiAqIEBjb25zdHJ1Y3RvciBGaW5CYXJcbiAqIEBzdW1tYXJ5IENyZWF0ZSBhIHNjcm9sbGJhciBvYmplY3QuXG4gKiBAZGVzYyBDcmVhdGluZyBhIHNjcm9sbGJhciBpcyBhIHRocmVlLXN0ZXAgcHJvY2VzczpcbiAqXG4gKiAxLiBJbnN0YW50aWF0ZSB0aGUgc2Nyb2xsYmFyIG9iamVjdCBieSBjYWxsaW5nIHRoaXMgY29uc3RydWN0b3IgZnVuY3Rpb24uIFVwb24gaW5zdGFudGlhdGlvbiwgdGhlIERPTSBlbGVtZW50IGZvciB0aGUgc2Nyb2xsYmFyICh3aXRoIGEgc2luZ2xlIGNoaWxkIGVsZW1lbnQgZm9yIHRoZSBzY3JvbGxiYXIgXCJ0aHVtYlwiKSBpcyBjcmVhdGVkIGJ1dCBpcyBub3QgaW5zZXJ0IGl0IGludG8gdGhlIERPTS5cbiAqIDIuIEFmdGVyIGluc3RhbnRpYXRpb24sIGl0IGlzIHRoZSBjYWxsZXIncyByZXNwb25zaWJpbGl0eSB0byBpbnNlcnQgdGhlIHNjcm9sbGJhciwge0BsaW5rIEZpbkJhciNiYXJ8dGhpcy5iYXJ9LCBpbnRvIHRoZSBET00uXG4gKiAzLiBBZnRlciBpbnNlcnRpb24sIHRoZSBjYWxsZXIgbXVzdCBjYWxsIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfSBhdCBsZWFzdCBvbmNlIHRvIHNpemUgYW5kIHBvc2l0aW9uIHRoZSBzY3JvbGxiYXIgYW5kIGl0cyB0aHVtYi4gQWZ0ZXIgdGhhdCwgYHJlc2l6ZSgpYCBzaG91bGQgYWxzbyBiZSBjYWxsZWQgcmVwZWF0ZWRseSBvbiByZXNpemUgZXZlbnRzIChhcyB0aGUgY29udGVudCBlbGVtZW50IGlzIGJlaW5nIHJlc2l6ZWQpLlxuICpcbiAqIFN1Z2dlc3RlZCBjb25maWd1cmF0aW9uczpcbiAqICogXyoqVW5ib3VuZCoqXzxici8+XG4gKiBUaGUgc2Nyb2xsYmFyIHNlcnZlcyBtZXJlbHkgYXMgYSBzaW1wbGUgcmFuZ2UgKHNsaWRlcikgY29udHJvbC4gT21pdCBib3RoIGBvcHRpb25zLm9uY2hhbmdlYCBhbmQgYG9wdGlvbnMuY29udGVudGAuXG4gKiAqIF8qKkJvdW5kIHRvIHZpcnR1YWwgY29udGVudCBlbGVtZW50KipfPGJyLz5cbiAqIFZpcnR1YWwgY29udGVudCBpcyBwcm9qZWN0ZWQgaW50byB0aGUgZWxlbWVudCB1c2luZyBhIGN1c3RvbSBldmVudCBoYW5kbGVyIHN1cHBsaWVkIGJ5IHRoZSBwcm9ncmFtbWVyIGluIGBvcHRpb25zLm9uY2hhbmdlYC4gQSB0eXBpY2FsIHVzZSBjYXNlIHdvdWxkIGJlIHRvIGhhbmRsZSBzY3JvbGxpbmcgb2YgdGhlIHZpcnR1YWwgY29udGVudC4gT3RoZXIgdXNlIGNhc2VzIGluY2x1ZGUgZGF0YSB0cmFuc2Zvcm1hdGlvbnMsIGdyYXBoaWNzIHRyYW5zZm9ybWF0aW9ucywgX2V0Yy5fXG4gKiAqIF8qKkJvdW5kIHRvIHJlYWwgY29udGVudCoqXzxici8+XG4gKiBTZXQgYG9wdGlvbnMuY29udGVudGAgdG8gdGhlIFwicmVhbFwiIGNvbnRlbnQgZWxlbWVudCBidXQgb21pdCBgb3B0aW9ucy5vbmNoYW5nZWAuIFRoaXMgd2lsbCBjYXVzZSB0aGUgc2Nyb2xsYmFyIHRvIHVzZSB0aGUgYnVpbHQtaW4gZXZlbnQgaGFuZGxlciAoYHRoaXMuc2Nyb2xsUmVhbENvbnRlbnRgKSB3aGljaCBpbXBsZW1lbnRzIHNtb290aCBzY3JvbGxpbmcgb2YgdGhlIGNvbnRlbnQgZWxlbWVudCB3aXRoaW4gdGhlIGNvbnRhaW5lci5cbiAqXG4gKiBAcGFyYW0ge2ZpbmJhck9wdGlvbnN9IFtvcHRpb25zPXt9XSAtIE9wdGlvbnMgb2JqZWN0LiBTZWUgdGhlIHR5cGUgZGVmaW5pdGlvbiBmb3IgbWVtYmVyIGRldGFpbHMuXG4gKi9cbmZ1bmN0aW9uIEZpbkJhcihvcHRpb25zKSB7XG5cbiAgICAvLyBtYWtlIGJvdW5kIHZlcnNpb25zIG9mIGFsbCB0aGUgbW91c2UgZXZlbnQgaGFuZGxlclxuICAgIHZhciBib3VuZCA9IHRoaXMuX2JvdW5kID0ge307XG4gICAgZm9yIChrZXkgaW4gaGFuZGxlcnNUb0JlQm91bmQpIHtcbiAgICAgICAgYm91bmRba2V5XSA9IGhhbmRsZXJzVG9CZUJvdW5kW2tleV0uYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSB0aHVtYlxuICAgICAqIEBzdW1tYXJ5IFRoZSBnZW5lcmF0ZWQgc2Nyb2xsYmFyIHRodW1iIGVsZW1lbnQuXG4gICAgICogQGRlc2MgVGhlIHRodW1iIGVsZW1lbnQncyBwYXJlbnQgZWxlbWVudCBpcyBhbHdheXMgdGhlIHtAbGluayBGaW5CYXIjYmFyfGJhcn0gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIFRoaXMgcHJvcGVydHkgaXMgdHlwaWNhbGx5IHJlZmVyZW5jZWQgaW50ZXJuYWxseSBvbmx5LiBUaGUgc2l6ZSBhbmQgcG9zaXRpb24gb2YgdGhlIHRodW1iIGVsZW1lbnQgaXMgbWFpbnRhaW5lZCBieSBgX2NhbGNUaHVtYigpYC5cbiAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHZhciB0aHVtYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRodW1iLmNsYXNzTGlzdC5hZGQoJ3RodW1iJyk7XG4gICAgdGh1bWIub25jbGljayA9IGJvdW5kLnNob3J0U3RvcDtcbiAgICB0aHVtYi5vbm1vdXNlb3ZlciA9IGJvdW5kLm9ubW91c2VvdmVyO1xuICAgIHRoaXMudGh1bWIgPSB0aHVtYjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIGJhclxuICAgICAqIEBzdW1tYXJ5IFRoZSBnZW5lcmF0ZWQgc2Nyb2xsYmFyIGVsZW1lbnQuXG4gICAgICogQGRlc2MgVGhlIGNhbGxlciBpbnNlcnRzIHRoaXMgZWxlbWVudCBpbnRvIHRoZSBET00gKHR5cGljYWxseSBpbnRvIHRoZSBjb250ZW50IGNvbnRhaW5lcikgYW5kIHRoZW4gY2FsbHMgaXRzIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfSBtZXRob2QuXG4gICAgICpcbiAgICAgKiBUaHVzIHRoZSBub2RlIHRyZWUgaXMgdHlwaWNhbGx5OlxuICAgICAqICogQSAqKmNvbnRlbnQgY29udGFpbmVyKiogZWxlbWVudCwgd2hpY2ggY29udGFpbnM6XG4gICAgICogICAgKiBUaGUgY29udGVudCBlbGVtZW50KHMpXG4gICAgICogICAgKiBUaGlzICoqc2Nyb2xsYmFyIGVsZW1lbnQqKiwgd2hpY2ggaW4gdHVybiBjb250YWluczpcbiAgICAgKiAgICAgICAgKiBUaGUgKip0aHVtYiBlbGVtZW50KipcbiAgICAgKlxuICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgdmFyIGJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgYmFyLmNsYXNzTGlzdC5hZGQoJ2ZpbmJhci12ZXJ0aWNhbCcpO1xuXG4gICAgYmFyLmFwcGVuZENoaWxkKHRodW1iKTtcbiAgICBpZiAodGhpcy5wYWdpbmcpIHtcbiAgICAgICAgYmFyLm9uY2xpY2sgPSBib3VuZC5vbmNsaWNrO1xuICAgIH1cbiAgICB0aGlzLmJhciA9IGJhcjtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gcHJlc2V0c1xuICAgIHRoaXMub3JpZW50YXRpb24gPSAndmVydGljYWwnO1xuICAgIHRoaXMuX21pbiA9IHRoaXMuX2luZGV4ID0gMDtcbiAgICB0aGlzLl9tYXggPSAxMDA7XG5cbiAgICAvLyBvcHRpb25zXG4gICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ2luZGV4JzpcbiAgICAgICAgICAgICAgICB0aGlzLl9pbmRleCA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAncmFuZ2UnOlxuICAgICAgICAgICAgICAgIHZhbGlkUmFuZ2Uob3B0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9taW4gPSBvcHRpb24ubWluO1xuICAgICAgICAgICAgICAgIHRoaXMuX21heCA9IG9wdGlvbi5tYXg7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50U2l6ZSA9IG9wdGlvbi5tYXggLSBvcHRpb24ubWluICsgMTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgIGtleS5jaGFyQXQoMCkgIT09ICdfJyAmJlxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgRmluQmFyLnByb3RvdHlwZVtrZXldICE9PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG92ZXJyaWRlIHByb3RvdHlwZSBkZWZhdWx0cyBmb3Igc3RhbmRhcmQgO1xuICAgICAgICAgICAgICAgICAgICAvLyBleHRlbmQgd2l0aCBhZGRpdGlvbmFsIHByb3BlcnRpZXMgKGZvciB1c2UgaW4gb25jaGFuZ2UgZXZlbnQgaGFuZGxlcnMpXG4gICAgICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNzc0luamVjdG9yKGNzc0ZpbkJhcnMsICdmaW5iYXItYmFzZScsIG9wdGlvbnMuY3NzU3R5bGVzaGVldFJlZmVyZW5jZUVsZW1lbnQpO1xufVxuXG5GaW5CYXIucHJvdG90eXBlID0ge1xuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgVGhlIHNjcm9sbGJhciBvcmllbnRhdGlvbi5cbiAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yIHRvIGVpdGhlciBgJ3ZlcnRpY2FsJ2Agb3IgYCdob3Jpem9udGFsJ2AuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogVXNlZnVsIHZhbHVlcyBhcmUgYCd2ZXJ0aWNhbCdgICh0aGUgZGVmYXVsdCkgb3IgYCdob3Jpem9udGFsJ2AuXG4gICAgICpcbiAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgcmVzZXRzIGB0aGlzLm9oYCBhbmQgYHRoaXMuZGVsdGFQcm9wYCBhbmQgY2hhbmdlcyB0aGUgY2xhc3MgbmFtZXMgc28gYXMgdG8gcmVwb3NpdGlvbiB0aGUgc2Nyb2xsYmFyIGFzIHBlciB0aGUgQ1NTIHJ1bGVzIGZvciB0aGUgbmV3IG9yaWVudGF0aW9uLlxuICAgICAqIEBkZWZhdWx0ICd2ZXJ0aWNhbCdcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgc2V0IG9yaWVudGF0aW9uKG9yaWVudGF0aW9uKSB7XG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA9PT0gdGhpcy5fb3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX29yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZWFkb25seVxuICAgICAgICAgKiBAbmFtZSBvaFxuICAgICAgICAgKiBAc3VtbWFyeSA8dT5PPC91PnJpZW50YXRpb24gPHU+aDwvdT5hc2ggZm9yIHRoaXMgc2Nyb2xsYmFyLlxuICAgICAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGBvcmllbnRhdGlvbmAgc2V0dGVyIHRvIGVpdGhlciB0aGUgdmVydGljYWwgb3IgdGhlIGhvcml6b250YWwgb3JpZW50YXRpb24gaGFzaC4gVGhlIHByb3BlcnR5IHNob3VsZCBhbHdheXMgYmUgc3luY2hyb25pemVkIHdpdGggYG9yaWVudGF0aW9uYDsgZG8gbm90IHVwZGF0ZSBkaXJlY3RseSFcbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBvYmplY3QgaXMgdXNlZCBpbnRlcm5hbGx5IHRvIGFjY2VzcyBzY3JvbGxiYXJzJyBET00gZWxlbWVudCBwcm9wZXJ0aWVzIGluIGEgZ2VuZXJhbGl6ZWQgd2F5IHdpdGhvdXQgbmVlZGluZyB0byBjb25zdGFudGx5IHF1ZXJ5IHRoZSBzY3JvbGxiYXIgb3JpZW50YXRpb24uIEZvciBleGFtcGxlLCBpbnN0ZWFkIG9mIGV4cGxpY2l0bHkgY29kaW5nIGB0aGlzLmJhci50b3BgIGZvciBhIHZlcnRpY2FsIHNjcm9sbGJhciBhbmQgYHRoaXMuYmFyLmxlZnRgIGZvciBhIGhvcml6b250YWwgc2Nyb2xsYmFyLCBzaW1wbHkgY29kZSBgdGhpcy5iYXJbdGhpcy5vaC5sZWFkaW5nXWAgaW5zdGVhZC4gU2VlIHRoZSB7QGxpbmsgb3JpZW50YXRpb25IYXNoVHlwZX0gZGVmaW5pdGlvbiBmb3IgZGV0YWlscy5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBvYmplY3QgaXMgdXNlZnVsIGV4dGVybmFsbHkgZm9yIGNvZGluZyBnZW5lcmFsaXplZCB7QGxpbmsgZmluYmFyT25DaGFuZ2V9IGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25zIHRoYXQgc2VydmUgYm90aCBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBzY3JvbGxiYXJzLlxuICAgICAgICAgKiBAdHlwZSB7b3JpZW50YXRpb25IYXNoVHlwZX1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMub2ggPSBvcmllbnRhdGlvbkhhc2hlc1t0aGlzLl9vcmllbnRhdGlvbl07XG5cbiAgICAgICAgaWYgKCF0aGlzLm9oKSB7XG4gICAgICAgICAgICBlcnJvcignSW52YWxpZCB2YWx1ZSBmb3IgYG9wdGlvbnMuX29yaWVudGF0aW9uLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuYW1lIGRlbHRhUHJvcFxuICAgICAgICAgKiBAc3VtbWFyeSBUaGUgbmFtZSBvZiB0aGUgYFdoZWVsRXZlbnRgIHByb3BlcnR5IHRoaXMgc2Nyb2xsYmFyIHNob3VsZCBsaXN0ZW4gdG8uXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBVc2VmdWwgdmFsdWVzIGFyZSBgJ2RlbHRhWCdgLCBgJ2RlbHRhWSdgLCBvciBgJ2RlbHRhWidgLiBBIHZhbHVlIG9mIGBudWxsYCBtZWFucyB0byBpZ25vcmUgbW91c2Ugd2hlZWwgZXZlbnRzIGVudGlyZWx5LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGUgbW91c2Ugd2hlZWwgaXMgb25lLWRpbWVuc2lvbmFsIGFuZCBvbmx5IGVtaXRzIGV2ZW50cyB3aXRoIGBkZWx0YVlgIGRhdGEuIFRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQgc28gdGhhdCB5b3UgY2FuIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9mIGAnZGVsdGFYJ2Agd2l0aCBhIHZhbHVlIG9mIGAnZGVsdGFZJ2Agb24geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBwcmltYXJpbHkgdG8gYWNjb21tb2RhdGUgY2VydGFpbiBcInBhbm9yYW1pY1wiIGludGVyZmFjZSBkZXNpZ25zIHdoZXJlIHRoZSBtb3VzZSB3aGVlbCBzaG91bGQgY29udHJvbCBob3Jpem9udGFsIHJhdGhlciB0aGFuIHZlcnRpY2FsIHNjcm9sbGluZy4gSnVzdCBnaXZlIGB7IGRlbHRhUHJvcDogJ2RlbHRhWScgfWAgaW4geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBpbnN0YW50aWF0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBDYXZlYXQ6IE5vdGUgdGhhdCBhIDItZmluZ2VyIGRyYWcgb24gYW4gQXBwbGUgdHJhY2twYWQgZW1pdHMgZXZlbnRzIHdpdGggX2JvdGhfIGBkZWx0YVggYCBhbmQgYGRlbHRhWWAgZGF0YSBzbyB5b3UgbWlnaHQgd2FudCB0byBkZWxheSBtYWtpbmcgdGhlIGFib3ZlIGFkanVzdG1lbnQgdW50aWwgeW91IGNhbiBkZXRlcm1pbmUgdGhhdCB5b3UgYXJlIGdldHRpbmcgWSBkYXRhIG9ubHkgd2l0aCBubyBYIGRhdGEgYXQgYWxsICh3aGljaCBpcyBhIHN1cmUgYmV0IHlvdSBvbiBhIG1vdXNlIHdoZWVsIHJhdGhlciB0aGFuIGEgdHJhY2twYWQpLlxuXG4gICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVsdGFQcm9wID0gdGhpcy5vaC5kZWx0YTtcblxuICAgICAgICB0aGlzLmJhci5jbGFzc05hbWUgPSB0aGlzLmJhci5jbGFzc05hbWUucmVwbGFjZSgvKHZlcnRpY2FsfGhvcml6b250YWwpL2csIG9yaWVudGF0aW9uKTtcblxuICAgICAgICBpZiAodGhpcy5iYXIuc3R5bGUuY3NzVGV4dCB8fCB0aGlzLnRodW1iLnN0eWxlLmNzc1RleHQpIHtcbiAgICAgICAgICAgIHRoaXMuYmFyLnJlbW92ZUF0dHJpYnV0ZSgnc3R5bGUnKTtcbiAgICAgICAgICAgIHRoaXMudGh1bWIucmVtb3ZlQXR0cmlidXRlKCdzdHlsZScpO1xuICAgICAgICAgICAgdGhpcy5yZXNpemUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0IG9yaWVudGF0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fb3JpZW50YXRpb247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IENhbGxiYWNrIGZvciBzY3JvbGwgZXZlbnRzLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IgdmlhIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuIEFmdGVyIGluc3RhbnRpYXRpb24sIGB0aGlzLm9uY2hhbmdlYCBtYXkgYmUgdXBkYXRlZCBkaXJlY3RseS5cbiAgICAgKlxuICAgICAqIFRoaXMgZXZlbnQgaGFuZGxlciBpcyBjYWxsZWQgd2hlbmV2ZXIgdGhlIHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgaXMgY2hhbmdlZCB0aHJvdWdoIHVzZXIgaW50ZXJhY3Rpb24uIFRoZSB0eXBpY2FsIHVzZSBjYXNlIGlzIHdoZW4gdGhlIGNvbnRlbnQgaXMgc2Nyb2xsZWQuIEl0IGlzIGNhbGxlZCB3aXRoIHRoZSBgRmluQmFyYCBvYmplY3QgYXMgaXRzIGNvbnRleHQgYW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgKGl0cyBpbmRleCwgcm91bmRlZCkgYXMgdGhlIG9ubHkgcGFyYW1ldGVyLlxuICAgICAqXG4gICAgICogU2V0IHRoaXMgcHJvcGVydHkgdG8gYG51bGxgIHRvIHN0b3AgZW1pdHRpbmcgc3VjaCBldmVudHMuXG4gICAgICogQHR5cGUge2Z1bmN0aW9uKG51bWJlcil8bnVsbH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIG9uY2hhbmdlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgQWRkIGEgQ1NTIGNsYXNzIG5hbWUgdG8gdGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdC5cbiAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yLiBTZWUgdGhlIHNpbWlsYXJseSBuYW1lZCBwcm9wZXJ0eSBpbiB0aGUge0BsaW5rIGZpbmJhck9wdGlvbnN9IG9iamVjdC5cbiAgICAgKlxuICAgICAqIFRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3Qgd2lsbCBhbHdheXMgaW5jbHVkZSBgZmluYmFyLXZlcnRpY2FsYCAob3IgYGZpbmJhci1ob3Jpem9udGFsYCBiYXNlZCBvbiB0aGUgY3VycmVudCBvcmllbnRhdGlvbikuIFdoZW5ldmVyIHRoaXMgcHJvcGVydHkgaXMgc2V0IHRvIHNvbWUgdmFsdWUsIGZpcnN0IHRoZSBvbGQgcHJlZml4K29yaWVudGF0aW9uIGlzIHJlbW92ZWQgZnJvbSB0aGUgYmFyIGVsZW1lbnQncyBjbGFzcyBsaXN0OyB0aGVuIHRoZSBuZXcgcHJlZml4K29yaWVudGF0aW9uIGlzIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoaXMgcHJvcGVydHkgY2F1c2VzIF9hbiBhZGRpdGlvbmFsXyBjbGFzcyBuYW1lIHRvIGJlIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoZXJlZm9yZSwgdGhpcyBwcm9wZXJ0eSB3aWxsIG9ubHkgYWRkIGF0IG1vc3Qgb25lIGFkZGl0aW9uYWwgY2xhc3MgbmFtZSB0byB0aGUgbGlzdC5cbiAgICAgKlxuICAgICAqIFRvIHJlbW92ZSBfY2xhc3NuYW1lLW9yaWVudGF0aW9uXyBmcm9tIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QsIHNldCB0aGlzIHByb3BlcnR5IHRvIGEgZmFsc3kgdmFsdWUsIHN1Y2ggYXMgYG51bGxgLlxuICAgICAqXG4gICAgICogPiBOT1RFOiBZb3Ugb25seSBuZWVkIHRvIHNwZWNpZnkgYW4gYWRkaXRpb25hbCBjbGFzcyBuYW1lIHdoZW4geW91IG5lZWQgdG8gaGF2ZSBtdWxsdGlwbGUgZGlmZmVyZW50IHN0eWxlcyBvZiBzY3JvbGxiYXJzIG9uIHRoZSBzYW1lIHBhZ2UuIElmIHRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQsIHRoZW4geW91IGRvbid0IG5lZWQgdG8gbWFrZSBhIG5ldyBjbGFzczsgeW91IHdvdWxkIGp1c3QgY3JlYXRlIHNvbWUgYWRkaXRpb25hbCBydWxlcyB1c2luZyB0aGUgc2FtZSBzZWxlY3RvcnMgaW4gdGhlIGJ1aWx0LWluIHN0eWxlc2hlZXQgKC4uL2Nzcy9maW5iYXJzLmNzcyk6XG4gICAgICogKmBkaXYuZmluYmFyLXZlcnRpY2FsYCAob3IgYGRpdi5maW5iYXItaG9yaXpvbnRhbGApIGZvciB0aGUgc2Nyb2xsYmFyXG4gICAgICogKmBkaXYuZmluYmFyLXZlcnRpY2FsID4gZGl2YCAob3IgYGRpdi5maW5iYXItaG9yaXpvbnRhbCA+IGRpdmApIGZvciB0aGUgXCJ0aHVtYi5cIlxuICAgICAqXG4gICAgICogT2YgY291cnNlLCB5b3VyIHJ1bGVzIHNob3VsZCBjb21lIGFmdGVyIHRoZSBidWlsdC1pbnMuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHNldCBjbGFzc1ByZWZpeChwcmVmaXgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NsYXNzUHJlZml4KSB7XG4gICAgICAgICAgICB0aGlzLmJhci5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuX2NsYXNzUHJlZml4ICsgdGhpcy5vcmllbnRhdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9jbGFzc1ByZWZpeCA9IHByZWZpeDtcblxuICAgICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgICAgICB0aGlzLmJhci5jbGFzc0xpc3QuYWRkKHByZWZpeCArICctJyArIHRoaXMub3JpZW50YXRpb24pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXQgY2xhc3NQcmVmaXgoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jbGFzc1ByZWZpeDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgaW5jcmVtZW50XG4gICAgICogQHN1bW1hcnkgTnVtYmVyIG9mIHNjcm9sbGJhciBpbmRleCB1bml0cyByZXByZXNlbnRpbmcgYSBwYWdlZnVsLiBVc2VkIGV4Y2x1c2l2ZWx5IGZvciBwYWdpbmcgdXAgYW5kIGRvd24gYW5kIGZvciBzZXR0aW5nIHRodW1iIHNpemUgcmVsYXRpdmUgdG8gY29udGVudCBzaXplLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogQ2FuIGFsc28gYmUgZ2l2ZW4gYXMgYSBwYXJhbWV0ZXIgdG8gdGhlIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZX0gbWV0aG9kLCB3aGljaCBpcyBwZXJ0aW5lbnQgYmVjYXVzZSBjb250ZW50IGFyZWEgc2l6ZSBjaGFuZ2VzIGFmZmVjdCB0aGUgZGVmaW5pdGlvbiBvZiBhIFwicGFnZWZ1bC5cIiBIb3dldmVyLCB5b3Ugb25seSBuZWVkIHRvIGRvIHRoaXMgaWYgdGhpcyB2YWx1ZSBpcyBiZWluZyB1c2VkLiBJdCBub3QgdXNlZCB3aGVuOlxuICAgICAqICogeW91IGRlZmluZSBgcGFnaW5nLnVwYCBhbmQgYHBhZ2luZy5kb3duYFxuICAgICAqICogeW91ciBzY3JvbGxiYXIgaXMgdXNpbmcgYHNjcm9sbFJlYWxDb250ZW50YFxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBpbmNyZW1lbnQ6IDEsXG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBiYXJTdHlsZXNcbiAgICAgKiBAc3VtbWFyeSBTY3JvbGxiYXIgc3R5bGVzIHRvIGJlIGFwcGxpZWQgYnkge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9LlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAqXG4gICAgICogVGhpcyBpcyBhIHZhbHVlIHRvIGJlIGFzc2lnbmVkIHRvIHtAbGluayBGaW5CYXIjc3R5bGVzfHN0eWxlc30gb24gZWFjaCBjYWxsIHRvIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfS4gVGhhdCBpcywgYSBoYXNoIG9mIHZhbHVlcyB0byBiZSBjb3BpZWQgdG8gdGhlIHNjcm9sbGJhciBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IG9uIHJlc2l6ZTsgb3IgYG51bGxgIGZvciBub25lLlxuICAgICAqXG4gICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3N0eWxlfHN0eWxlfVxuICAgICAqIEB0eXBlIHtmaW5iYXJTdHlsZXN8bnVsbH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIGJhclN0eWxlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHN0eWxlXG4gICAgICogQHN1bW1hcnkgQWRkaXRpb25hbCBzY3JvbGxiYXIgc3R5bGVzLlxuICAgICAqIEBkZXNjIFNlZSB0eXBlIGRlZmluaXRpb24gZm9yIG1vcmUgZGV0YWlscy4gVGhlc2Ugc3R5bGVzIGFyZSBhcHBsaWVkIGRpcmVjdGx5IHRvIHRoZSBzY3JvbGxiYXIncyBgYmFyYCBlbGVtZW50LlxuICAgICAqXG4gICAgICogVmFsdWVzIGFyZSBhZGp1c3RlZCBhcyBmb2xsb3dzIGJlZm9yZSBiZWluZyBhcHBsaWVkIHRvIHRoZSBlbGVtZW50OlxuICAgICAqIDEuIEluY2x1ZGVkIFwicHNldWRvLXByb3BlcnR5XCIgbmFtZXMgZnJvbSB0aGUgc2Nyb2xsYmFyJ3Mgb3JpZW50YXRpb24gaGFzaCwge0BsaW5rIEZpbkJhciNvaHxvaH0sIGFyZSB0cmFuc2xhdGVkIHRvIGFjdHVhbCBwcm9wZXJ0eSBuYW1lcyBiZWZvcmUgYmVpbmcgYXBwbGllZC5cbiAgICAgKiAyLiBXaGVuIHRoZXJlIGFyZSBtYXJnaW5zLCBwZXJjZW50YWdlcyBhcmUgdHJhbnNsYXRlZCB0byBhYnNvbHV0ZSBwaXhlbCB2YWx1ZXMgYmVjYXVzZSBDU1MgaWdub3JlcyBtYXJnaW5zIGluIGl0cyBwZXJjZW50YWdlIGNhbGN1bGF0aW9ucy5cbiAgICAgKiAzLiBJZiB5b3UgZ2l2ZSBhIHZhbHVlIHdpdGhvdXQgYSB1bml0IChhIHJhdyBudW1iZXIpLCBcInB4XCIgdW5pdCBpcyBhcHBlbmRlZC5cbiAgICAgKlxuICAgICAqIEdlbmVyYWwgbm90ZXM6XG4gICAgICogMS4gSXQgaXMgYWx3YXlzIHByZWZlcmFibGUgdG8gc3BlY2lmeSBzdHlsZXMgdmlhIGEgc3R5bGVzaGVldC4gT25seSBzZXQgdGhpcyBwcm9wZXJ0eSB3aGVuIHlvdSBuZWVkIHRvIHNwZWNpZmljYWxseSBvdmVycmlkZSAoYSkgc3R5bGVzaGVldCB2YWx1ZShzKS5cbiAgICAgKiAyLiBDYW4gYmUgc2V0IGRpcmVjdGx5IG9yIHZpYSBjYWxscyB0byB0aGUge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplfSBtZXRob2QuXG4gICAgICogMy4gU2hvdWxkIG9ubHkgYmUgc2V0IGFmdGVyIHRoZSBzY3JvbGxiYXIgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAqIDQuIEJlZm9yZSBhcHBseWluZyB0aGVzZSBuZXcgdmFsdWVzIHRvIHRoZSBlbGVtZW50LCBfYWxsXyBpbi1saW5lIHN0eWxlIHZhbHVlcyBhcmUgcmVzZXQgKGJ5IHJlbW92aW5nIHRoZSBlbGVtZW50J3MgYHN0eWxlYCBhdHRyaWJ1dGUpLCBleHBvc2luZyBpbmhlcml0ZWQgdmFsdWVzIChmcm9tIHN0eWxlc2hlZXRzKS5cbiAgICAgKiA1LiBFbXB0eSBvYmplY3QgaGFzIG5vIGVmZmVjdC5cbiAgICAgKiA2LiBGYWxzZXkgdmFsdWUgaW4gcGxhY2Ugb2Ygb2JqZWN0IGhhcyBubyBlZmZlY3QuXG4gICAgICpcbiAgICAgKiA+IENBVkVBVDogRG8gbm90IGF0dGVtcHQgdG8gdHJlYXQgdGhlIG9iamVjdCB5b3UgYXNzaWduIHRvIHRoaXMgcHJvcGVydHkgYXMgaWYgaXQgd2VyZSBgdGhpcy5iYXIuc3R5bGVgLiBTcGVjaWZpY2FsbHksIGNoYW5naW5nIHRoaXMgb2JqZWN0IGFmdGVyIGFzc2lnbmluZyBpdCB3aWxsIGhhdmUgbm8gZWZmZWN0IG9uIHRoZSBzY3JvbGxiYXIuIFlvdSBtdXN0IGFzc2lnbiBpdCBhZ2FpbiBpZiB5b3Ugd2FudCBpdCB0byBoYXZlIGFuIGVmZmVjdC5cbiAgICAgKlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNiYXJTdHlsZXN8YmFyU3R5bGVzfVxuICAgICAqIEB0eXBlIHtmaW5iYXJTdHlsZXN9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBzZXQgc3R5bGUoc3R5bGVzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc3R5bGVzID0gZXh0ZW5kKHt9LCBzdHlsZXMsIHRoaXMuX2F1eFN0eWxlcykpO1xuXG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdmFyIGJhciA9IHRoaXMuYmFyLFxuICAgICAgICAgICAgICAgIGJhclJlY3QgPSBiYXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyID0gdGhpcy5jb250YWluZXIgfHwgYmFyLnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY29udGFpbmVyUmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgICAgICBvaCA9IHRoaXMub2g7XG5cbiAgICAgICAgICAgIC8vIEJlZm9yZSBhcHBseWluZyBuZXcgc3R5bGVzLCByZXZlcnQgYWxsIHN0eWxlcyB0byB2YWx1ZXMgaW5oZXJpdGVkIGZyb20gc3R5bGVzaGVldHNcbiAgICAgICAgICAgIGJhci5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG5cbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IHN0eWxlc1trZXldO1xuXG4gICAgICAgICAgICAgICAgaWYgKGtleSBpbiBvaCkge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBvaFtrZXldO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHZhbCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbCA9ICh2YWwgfHwgMCkgKyAncHgnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoLyUkLy50ZXN0KHZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBiYXIgc2l6ZSBnaXZlbiBhcyBwZXJjZW50YWdlIG9mIGNvbnRhaW5lciwgaWYgYmFyIGhhcyBtYXJnaW5zLCByZXN0YXRlIHNpemUgaW4gcGl4ZWxzIGxlc3MgbWFyZ2lucy5cbiAgICAgICAgICAgICAgICAgICAgLy8gKElmIGxlZnQgYXMgcGVyY2VudGFnZSwgQ1NTJ3MgY2FsY3VsYXRpb24gd2lsbCBub3QgZXhjbHVkZSBtYXJnaW5zLilcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWVudGVkID0gYXhpc1trZXldLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2lucyA9IGJhclJlY3Rbb3JpZW50ZWQubWFyZ2luTGVhZGluZ10gKyBiYXJSZWN0W29yaWVudGVkLm1hcmdpblRyYWlsaW5nXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1hcmdpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHBhcnNlSW50KHZhbCwgMTApIC8gMTAwICogY29udGFpbmVyUmVjdFtvcmllbnRlZC5zaXplXSAtIG1hcmdpbnMgKyAncHgnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYmFyLnN0eWxlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcmVhZG9ubHlcbiAgICAgKiBAbmFtZSBwYWdpbmdcbiAgICAgKiBAc3VtbWFyeSBFbmFibGUgcGFnZSB1cC9kbiBjbGlja3MuXG4gICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICpcbiAgICAgKiBJZiB0cnV0aHksIGxpc3RlbiBmb3IgY2xpY2tzIGluIHBhZ2UtdXAgYW5kIHBhZ2UtZG93biByZWdpb25zIG9mIHNjcm9sbGJhci5cbiAgICAgKlxuICAgICAqIElmIGFuIG9iamVjdCwgY2FsbCBgLnBhZ2luZy51cCgpYCBvbiBwYWdlLXVwIGNsaWNrcyBhbmQgYC5wYWdpbmcuZG93bigpYCB3aWxsIGJlIGNhbGxlZCBvbiBwYWdlLWRvd24gY2xpY2tzLlxuICAgICAqXG4gICAgICogQ2hhbmdpbmcgdGhlIHRydXRoaW5lc3Mgb2YgdGhpcyB2YWx1ZSBhZnRlciBpbnN0YW50aWF0aW9uIGN1cnJlbnRseSBoYXMgbm8gZWZmZWN0LlxuICAgICAqIEB0eXBlIHtib29sZWFufG9iamVjdH1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHBhZ2luZzogdHJ1ZSxcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHJhbmdlXG4gICAgICogQHN1bW1hcnkgU2V0dGVyIGZvciB0aGUgbWluaW11bSBhbmQgbWF4aW11bSBzY3JvbGwgdmFsdWVzLlxuICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFRoZXNlIHZhbHVlcyBhcmUgdGhlIGxpbWl0cyBmb3Ige0BsaW5rIEZvb0JhciNpbmRleHxpbmRleH0uXG4gICAgICpcbiAgICAgKiBUaGUgc2V0dGVyIGFjY2VwdHMgYW4gb2JqZWN0IHdpdGggZXhhY3RseSB0d28gbnVtZXJpYyBwcm9wZXJ0aWVzOiBgLm1pbmAgd2hpY2ggbXVzdCBiZSBsZXNzIHRoYW4gYC5tYXhgLiBUaGUgdmFsdWVzIGFyZSBleHRyYWN0ZWQgYW5kIHRoZSBvYmplY3QgaXMgZGlzY2FyZGVkLlxuICAgICAqXG4gICAgICogVGhlIGdldHRlciByZXR1cm5zIGEgbmV3IG9iamVjdCB3aXRoIGAubWluYCBhbmQgJy5tYXhgLlxuICAgICAqXG4gICAgICogQHR5cGUge3JhbmdlVHlwZX1cbiAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAqL1xuICAgIHNldCByYW5nZShyYW5nZSkge1xuICAgICAgICB2YWxpZFJhbmdlKHJhbmdlKTtcbiAgICAgICAgdGhpcy5fbWluID0gcmFuZ2UubWluO1xuICAgICAgICB0aGlzLl9tYXggPSByYW5nZS5tYXg7XG4gICAgICAgIHRoaXMuY29udGVudFNpemUgPSByYW5nZS5tYXggLSByYW5nZS5taW4gKyAxO1xuICAgICAgICB0aGlzLmluZGV4ID0gdGhpcy5pbmRleDsgLy8gcmUtY2xhbXBcbiAgICB9LFxuICAgIGdldCByYW5nZSgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1pbjogdGhpcy5fbWluLFxuICAgICAgICAgICAgbWF4OiB0aGlzLl9tYXhcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgSW5kZXggdmFsdWUgb2YgdGhlIHNjcm9sbGJhci5cbiAgICAgKiBAZGVzYyBUaGlzIGlzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc2Nyb2xsIHRodW1iLlxuICAgICAqXG4gICAgICogU2V0dGluZyB0aGlzIHZhbHVlIGNsYW1wcyBpdCB0byB7QGxpbmsgRmluQmFyI21pbnxtaW59Li57QGxpbmsgRmluQmFyI21heHxtYXh9LCBzY3JvbGwgdGhlIGNvbnRlbnQsIGFuZCBtb3ZlcyB0aHVtYi5cbiAgICAgKlxuICAgICAqIEdldHRpbmcgdGhpcyB2YWx1ZSByZXR1cm5zIHRoZSBjdXJyZW50IGluZGV4LiBUaGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBiZSBpbiB0aGUgcmFuZ2UgYG1pbmAuLmBtYXhgLiBJdCBpcyBpbnRlbnRpb25hbGx5IG5vdCByb3VuZGVkLlxuICAgICAqXG4gICAgICogVXNlIHRoaXMgdmFsdWUgYXMgYW4gYWx0ZXJuYXRpdmUgdG8gKG9yIGluIGFkZGl0aW9uIHRvKSB1c2luZyB0aGUge0BsaW5rIEZpbkJhciNvbmNoYW5nZXxvbmNoYW5nZX0gY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICpcbiAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjX3NldFNjcm9sbHxfc2V0U2Nyb2xsfVxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBzZXQgaW5kZXgoaWR4KSB7XG4gICAgICAgIGlkeCA9IE1hdGgubWluKHRoaXMuX21heCwgTWF0aC5tYXgodGhpcy5fbWluLCBpZHgpKTsgLy8gY2xhbXAgaXRcbiAgICAgICAgdGhpcy5fc2V0U2Nyb2xsKGlkeCk7XG4gICAgICAgIC8vIHRoaXMuX3NldFRodW1iU2l6ZSgpO1xuICAgIH0sXG4gICAgZ2V0IGluZGV4KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN1bW1hcnkgTW92ZSB0aGUgdGh1bWIuXG4gICAgICogQGRlc2MgQWxzbyBkaXNwbGF5cyB0aGUgaW5kZXggdmFsdWUgaW4gdGhlIHRlc3QgcGFuZWwgYW5kIGludm9rZXMgdGhlIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSBpZHggLSBUaGUgbmV3IHNjcm9sbCBpbmRleCwgYSB2YWx1ZSBpbiB0aGUgcmFuZ2UgYG1pbmAuLmBtYXhgLlxuICAgICAqIEBwYXJhbSBbc2NhbGVkPWYoaWR4KV0gLSBUaGUgbmV3IHRodW1iIHBvc2l0aW9uIGluIHBpeGVscyBhbmQgc2NhbGVkIHJlbGF0aXZlIHRvIHRoZSBjb250YWluaW5nIHtAbGluayBGaW5CYXIjYmFyfGJhcn0gZWxlbWVudCwgaS5lLiwgYSBwcm9wb3J0aW9uYWwgbnVtYmVyIGluIHRoZSByYW5nZSBgMGAuLmB0aHVtYk1heGAuIFdoZW4gb21pdHRlZCwgYSBmdW5jdGlvbiBvZiBgaWR4YCBpcyB1c2VkLlxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgX3NldFNjcm9sbDogZnVuY3Rpb24gKGlkeCwgc2NhbGVkKSB7XG4gICAgICAgIHRoaXMuX2luZGV4ID0gaWR4O1xuXG4gICAgICAgIC8vIERpc3BsYXkgdGhlIGluZGV4IHZhbHVlIGluIHRoZSB0ZXN0IHBhbmVsXG4gICAgICAgIGlmICh0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtLmluZGV4IGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgdGhpcy50ZXN0UGFuZWxJdGVtLmluZGV4LmlubmVySFRNTCA9IE1hdGgucm91bmQoaWR4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAgIGlmICh0aGlzLm9uY2hhbmdlKSB7XG4gICAgICAgICAgICB0aGlzLm9uY2hhbmdlLmNhbGwodGhpcywgTWF0aC5yb3VuZChpZHgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1vdmUgdGhlIHRodW1iXG4gICAgICAgIGlmIChzY2FsZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2NhbGVkID0gKGlkeCAtIHRoaXMuX21pbikgLyAodGhpcy5fbWF4IC0gdGhpcy5fbWluKSAqIHRoaXMuX3RodW1iTWF4O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudGh1bWIuc3R5bGVbdGhpcy5vaC5sZWFkaW5nXSA9IHNjYWxlZCArICdweCc7XG4gICAgfSxcblxuICAgIHNjcm9sbFJlYWxDb250ZW50OiBmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgIHZhciBjb250YWluZXJSZWN0ID0gdGhpcy5jb250ZW50LnBhcmVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICBzaXplUHJvcCA9IHRoaXMub2guc2l6ZSxcbiAgICAgICAgICAgIG1heFNjcm9sbCA9IE1hdGgubWF4KDAsIHRoaXMuY29udGVudFtzaXplUHJvcF0gLSBjb250YWluZXJSZWN0W3NpemVQcm9wXSksXG4gICAgICAgICAgICAvL3Njcm9sbCA9IE1hdGgubWluKGlkeCwgbWF4U2Nyb2xsKTtcbiAgICAgICAgICAgIHNjcm9sbCA9IChpZHggLSB0aGlzLl9taW4pIC8gKHRoaXMuX21heCAtIHRoaXMuX21pbikgKiBtYXhTY3JvbGw7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ3Njcm9sbDogJyArIHNjcm9sbCk7XG4gICAgICAgIHRoaXMuY29udGVudC5zdHlsZVt0aGlzLm9oLmxlYWRpbmddID0gLXNjcm9sbCArICdweCc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFJlY2FsY3VsYXRlIHRodW1iIHBvc2l0aW9uLlxuICAgICAqXG4gICAgICogQGRlc2MgVGhpcyBtZXRob2QgcmVjYWxjdWxhdGVzIHRoZSB0aHVtYiBzaXplIGFuZCBwb3NpdGlvbi4gQ2FsbCBpdCBvbmNlIGFmdGVyIGluc2VydGluZyB5b3VyIHNjcm9sbGJhciBpbnRvIHRoZSBET00sIGFuZCByZXBlYXRlZGx5IHdoaWxlIHJlc2l6aW5nIHRoZSBzY3JvbGxiYXIgKHdoaWNoIHR5cGljYWxseSBoYXBwZW5zIHdoZW4gdGhlIHNjcm9sbGJhcidzIHBhcmVudCBpcyByZXNpemVkIGJ5IHVzZXIuXG4gICAgICpcbiAgICAgKiA+IFRoaXMgZnVuY3Rpb24gc2hpZnRzIGFyZ3MgaWYgZmlyc3QgYXJnIG9taXR0ZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2luY3JlbWVudD10aGlzLmluY3JlbWVudF0gLSBSZXNldHMge0BsaW5rIEZvb0JhciNpbmNyZW1lbnR8aW5jcmVtZW50fSAoc2VlKS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZmluYmFyU3R5bGVzfSBbYmFyU3R5bGVzPXRoaXMuYmFyU3R5bGVzXSAtIChTZWUgdHlwZSBkZWZpbml0aW9uIGZvciBkZXRhaWxzLikgU2Nyb2xsYmFyIHN0eWxlcyB0byBiZSBhcHBsaWVkIHRvIHRoZSBiYXIgZWxlbWVudC5cbiAgICAgKlxuICAgICAqIE9ubHkgc3BlY2lmeSBhIGBiYXJTdHlsZXNgIG9iamVjdCB3aGVuIHlvdSBuZWVkIHRvIG92ZXJyaWRlIHN0eWxlc2hlZXQgdmFsdWVzLiBJZiBwcm92aWRlZCwgYmVjb21lcyB0aGUgbmV3IGRlZmF1bHQgKGB0aGlzLmJhclN0eWxlc2ApLCBmb3IgdXNlIGFzIGEgZGVmYXVsdCBvbiBzdWJzZXF1ZW50IGNhbGxzLlxuICAgICAqXG4gICAgICogSXQgaXMgZ2VuZXJhbGx5IHRoZSBjYXNlIHRoYXQgdGhlIHNjcm9sbGJhcidzIG5ldyBwb3NpdGlvbiBpcyBzdWZmaWNpZW50bHkgZGVzY3JpYmVkIGJ5IHRoZSBjdXJyZW50IHN0eWxlcy4gVGhlcmVmb3JlLCBpdCBpcyB1bnVzdWFsIHRvIG5lZWQgdG8gcHJvdmlkZSBhIGBiYXJTdHlsZXNgIG9iamVjdCBvbiBldmVyeSBjYWxsIHRvIGByZXNpemVgLlxuICAgICAqXG4gICAgICogQHJldHVybnMge0ZpbkJhcn0gU2VsZiBmb3IgY2hhaW5pbmcuXG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICByZXNpemU6IGZ1bmN0aW9uIChpbmNyZW1lbnQsIGJhclN0eWxlcykge1xuICAgICAgICB2YXIgYmFyID0gdGhpcy5iYXI7XG5cbiAgICAgICAgaWYgKCFiYXIucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub3QgaW4gRE9NIHlldCBzbyBub3RoaW5nIHRvIGRvXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5jb250YWluZXIgfHwgYmFyLnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICBjb250YWluZXJSZWN0ID0gY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIC8vIHNoaWZ0IGFyZ3MgaWYgaWYgMXN0IGFyZyBvbWl0dGVkXG4gICAgICAgIGlmICh0eXBlb2YgaW5jcmVtZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgYmFyU3R5bGVzID0gaW5jcmVtZW50O1xuICAgICAgICAgICAgaW5jcmVtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHlsZSA9IHRoaXMuYmFyU3R5bGVzID0gYmFyU3R5bGVzIHx8IHRoaXMuYmFyU3R5bGVzO1xuXG4gICAgICAgIC8vIEJvdW5kIHRvIHJlYWwgY29udGVudDogQ29udGVudCB3YXMgZ2l2ZW4gYnV0IG5vIG9uY2hhbmdlIGhhbmRsZXIuXG4gICAgICAgIC8vIFNldCB1cCAub25jaGFuZ2UsIC5jb250YWluZXJTaXplLCBhbmQgLmluY3JlbWVudC5cbiAgICAgICAgLy8gTm90ZSB0aGlzIG9ubHkgbWFrZXMgc2Vuc2UgaWYgeW91ciBpbmRleCB1bml0IGlzIHBpeGVscy5cbiAgICAgICAgaWYgKHRoaXMuY29udGVudCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLm9uY2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9IHRoaXMuc2Nyb2xsUmVhbENvbnRlbnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250ZW50U2l6ZSA9IHRoaXMuY29udGVudFt0aGlzLm9oLnNpemVdO1xuICAgICAgICAgICAgICAgIHRoaXMuX21pbiA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWF4ID0gdGhpcy5jb250ZW50U2l6ZSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMub25jaGFuZ2UgPT09IHRoaXMuc2Nyb2xsUmVhbENvbnRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyU2l6ZSA9IGNvbnRhaW5lclJlY3RbdGhpcy5vaC5zaXplXTtcbiAgICAgICAgICAgIHRoaXMuaW5jcmVtZW50ID0gdGhpcy5jb250YWluZXJTaXplIC8gKHRoaXMuY29udGVudFNpemUgLSB0aGlzLmNvbnRhaW5lclNpemUpICogKHRoaXMuX21heCAtIHRoaXMuX21pbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRhaW5lclNpemUgPSAxO1xuICAgICAgICAgICAgdGhpcy5pbmNyZW1lbnQgPSBpbmNyZW1lbnQgfHwgdGhpcy5pbmNyZW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmluZGV4O1xuICAgICAgICB0aGlzLnRlc3RQYW5lbEl0ZW0gPSB0aGlzLnRlc3RQYW5lbEl0ZW0gfHwgdGhpcy5fYWRkVGVzdFBhbmVsSXRlbSgpO1xuICAgICAgICB0aGlzLl9zZXRUaHVtYlNpemUoKTtcbiAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuXG4gICAgICAgIGlmICh0aGlzLmRlbHRhUHJvcCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3doZWVsJywgdGhpcy5fYm91bmQub253aGVlbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQHN1bW1hcnkgU2hvcnRlbiB0cmFpbGluZyBlbmQgb2Ygc2Nyb2xsYmFyIGJ5IHRoaWNrbmVzcyBvZiBzb21lIG90aGVyIHNjcm9sbGJhci5cbiAgICAgKiBAZGVzYyBJbiB0aGUgXCJjbGFzc2ljYWxcIiBzY2VuYXJpbyB3aGVyZSB2ZXJ0aWNhbCBzY3JvbGwgYmFyIGlzIG9uIHRoZSByaWdodCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxiYXIgaXMgb24gdGhlIGJvdHRvbSwgeW91IHdhbnQgdG8gc2hvcnRlbiB0aGUgXCJ0cmFpbGluZyBlbmRcIiAoYm90dG9tIGFuZCByaWdodCBlbmRzLCByZXNwZWN0aXZlbHkpIG9mIGF0IGxlYXN0IG9uZSBvZiB0aGVtIHNvIHRoZXkgZG9uJ3Qgb3ZlcmxheS5cbiAgICAgKlxuICAgICAqIFRoaXMgY29udmVuaWVuY2UgZnVuY3Rpb24gaXMgYW4gcHJvZ3JhbW1hdGljIGFsdGVybmF0aXZlIHRvIGhhcmRjb2RpbmcgdGhlIGNvcnJlY3Qgc3R5bGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSBpbiB5b3VyIHN0eWxlc2hlZXQ7IG9yIHNldHRpbmcgdGhlIGNvcnJlY3Qgc3R5bGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSBpbiB0aGUge0BsaW5rIEZpbkJhciNiYXJTdHlsZXN8YmFyU3R5bGVzfSBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjZm9yZXNob3J0ZW5CeXxmb3Jlc2hvcnRlbkJ5fS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RmluQmFyfG51bGx9IG90aGVyRmluQmFyIC0gT3RoZXIgc2Nyb2xsYmFyIHRvIGF2b2lkIGJ5IHNob3J0ZW5pbmcgdGhpcyBvbmU7IGBudWxsYCByZW1vdmVzIHRoZSB0cmFpbGluZyBzcGFjZVxuICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IEZvciBjaGFpbmluZ1xuICAgICAqL1xuICAgIHNob3J0ZW5CeTogZnVuY3Rpb24gKG90aGVyRmluQmFyKSB7IHJldHVybiB0aGlzLnNob3J0ZW5FbmRCeSgndHJhaWxpbmcnLCBvdGhlckZpbkJhcik7IH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBTaG9ydGVuIGxlYWRpbmcgZW5kIG9mIHNjcm9sbGJhciBieSB0aGlja25lc3Mgb2Ygc29tZSBvdGhlciBzY3JvbGxiYXIuXG4gICAgICogQGRlc2MgU3VwcG9ydHMgbm9uLWNsYXNzaWNhbCBzY3JvbGxiYXIgc2NlbmFyaW9zIHdoZXJlIHZlcnRpY2FsIHNjcm9sbCBiYXIgbWF5IGJlIG9uIGxlZnQgYW5kIGhvcml6b250YWwgc2Nyb2xsYmFyIG1heSBiZSBvbiB0b3AsIGluIHdoaWNoIGNhc2UgeW91IHdhbnQgdG8gc2hvcnRlbiB0aGUgXCJsZWFkaW5nIGVuZFwiIHJhdGhlciB0aGFuIHRoZSB0cmFpbGluZyBlbmQuXG4gICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3Nob3J0ZW5CeXxzaG9ydGVuQnl9LlxuICAgICAqIEBwYXJhbSB7RmluQmFyfG51bGx9IG90aGVyRmluQmFyIC0gT3RoZXIgc2Nyb2xsYmFyIHRvIGF2b2lkIGJ5IHNob3J0ZW5pbmcgdGhpcyBvbmU7IGBudWxsYCByZW1vdmVzIHRoZSB0cmFpbGluZyBzcGFjZVxuICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IEZvciBjaGFpbmluZ1xuICAgICAqL1xuICAgIGZvcmVzaG9ydGVuQnk6IGZ1bmN0aW9uIChvdGhlckZpbkJhcikgeyByZXR1cm4gdGhpcy5zaG9ydGVuRW5kQnkoJ2xlYWRpbmcnLCBvdGhlckZpbkJhcik7IH0sXG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBHZW5lcmFsaXplZCBzaG9ydGVuaW5nIGZ1bmN0aW9uLlxuICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNzaG9ydGVuQnl8c2hvcnRlbkJ5fS5cbiAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjZm9yZXNob3J0ZW5CeXxmb3Jlc2hvcnRlbkJ5fS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gd2hpY2hFbmQgLSBhIENTUyBzdHlsZSBwcm9wZXJ0eSBuYW1lIG9yIGFuIG9yaWVudGF0aW9uIGhhc2ggbmFtZSB0aGF0IHRyYW5zbGF0ZXMgdG8gYSBDU1Mgc3R5bGUgcHJvcGVydHkgbmFtZS5cbiAgICAgKiBAcGFyYW0ge0ZpbkJhcnxudWxsfSBvdGhlckZpbkJhciAtIE90aGVyIHNjcm9sbGJhciB0byBhdm9pZCBieSBzaG9ydGVuaW5nIHRoaXMgb25lOyBgbnVsbGAgcmVtb3ZlcyB0aGUgdHJhaWxpbmcgc3BhY2VcbiAgICAgKiBAcmV0dXJucyB7RmluQmFyfSBGb3IgY2hhaW5pbmdcbiAgICAgKi9cbiAgICBzaG9ydGVuRW5kQnk6IGZ1bmN0aW9uICh3aGljaEVuZCwgb3RoZXJGaW5CYXIpIHtcbiAgICAgICAgaWYgKCFvdGhlckZpbkJhcikge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2F1eFN0eWxlcztcbiAgICAgICAgfSBlbHNlIGlmIChvdGhlckZpbkJhciBpbnN0YW5jZW9mIEZpbkJhciAmJiBvdGhlckZpbkJhci5vcmllbnRhdGlvbiAhPT0gdGhpcy5vcmllbnRhdGlvbikge1xuICAgICAgICAgICAgdmFyIG90aGVyU3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShvdGhlckZpbkJhci5iYXIpLFxuICAgICAgICAgICAgICAgIG9vaCA9IG9yaWVudGF0aW9uSGFzaGVzW290aGVyRmluQmFyLm9yaWVudGF0aW9uXTtcbiAgICAgICAgICAgIHRoaXMuX2F1eFN0eWxlcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5fYXV4U3R5bGVzW3doaWNoRW5kXSA9IG90aGVyU3R5bGVbb29oLnRoaWNrbmVzc107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmluZ1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdW1tYXJ5IFNldHMgdGhlIHByb3BvcnRpb25hbCB0aHVtYiBzaXplIGFuZCBoaWRlcyB0aHVtYiB3aGVuIDEwMCUuXG4gICAgICogQGRlc2MgVGhlIHRodW1iIHNpemUgaGFzIGFuIGFic29sdXRlIG1pbmltdW0gb2YgMjAgKHBpeGVscykuXG4gICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgKi9cbiAgICBfc2V0VGh1bWJTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvaCA9IHRoaXMub2gsXG4gICAgICAgICAgICB0aHVtYkNvbXAgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLnRodW1iKSxcbiAgICAgICAgICAgIHRodW1iTWFyZ2luTGVhZGluZyA9IHBhcnNlSW50KHRodW1iQ29tcFtvaC5tYXJnaW5MZWFkaW5nXSksXG4gICAgICAgICAgICB0aHVtYk1hcmdpblRyYWlsaW5nID0gcGFyc2VJbnQodGh1bWJDb21wW29oLm1hcmdpblRyYWlsaW5nXSksXG4gICAgICAgICAgICB0aHVtYk1hcmdpbnMgPSB0aHVtYk1hcmdpbkxlYWRpbmcgKyB0aHVtYk1hcmdpblRyYWlsaW5nLFxuICAgICAgICAgICAgYmFyU2l6ZSA9IHRoaXMuYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW29oLnNpemVdLFxuICAgICAgICAgICAgdGh1bWJTaXplID0gTWF0aC5tYXgoMjAsIGJhclNpemUgKiB0aGlzLmNvbnRhaW5lclNpemUgLyB0aGlzLmNvbnRlbnRTaXplKTtcblxuICAgICAgICBpZiAodGhpcy5jb250YWluZXJTaXplIDwgdGhpcy5jb250ZW50U2l6ZSkge1xuICAgICAgICAgICAgdGhpcy5iYXIuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgIHRoaXMudGh1bWIuc3R5bGVbb2guc2l6ZV0gPSB0aHVtYlNpemUgKyAncHgnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5iYXIuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEBuYW1lIF90aHVtYk1heFxuICAgICAgICAgKiBAc3VtbWFyeSBNYXhpbXVtIG9mZnNldCBvZiB0aHVtYidzIGxlYWRpbmcgZWRnZS5cbiAgICAgICAgICogQGRlc2MgVGhpcyBpcyB0aGUgcGl4ZWwgb2Zmc2V0IHdpdGhpbiB0aGUgc2Nyb2xsYmFyIG9mIHRoZSB0aHVtYiB3aGVuIGl0IGlzIGF0IGl0cyBtYXhpbXVtIHBvc2l0aW9uIGF0IHRoZSBleHRyZW1lIGVuZCBvZiBpdHMgcmFuZ2UuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgdmFsdWUgdGFrZXMgaW50byBhY2NvdW50IHRoZSBuZXdseSBjYWxjdWxhdGVkIHNpemUgb2YgdGhlIHRodW1iIGVsZW1lbnQgKGluY2x1ZGluZyBpdHMgbWFyZ2lucykgYW5kIHRoZSBpbm5lciBzaXplIG9mIHRoZSBzY3JvbGxiYXIgKHRoZSB0aHVtYidzIGNvbnRhaW5pbmcgZWxlbWVudCwgaW5jbHVkaW5nIF9pdHNfIG1hcmdpbnMpLlxuICAgICAgICAgKlxuICAgICAgICAgKiBOT1RFOiBTY3JvbGxiYXIgcGFkZGluZyBpcyBub3QgdGFrZW4gaW50byBhY2NvdW50IGFuZCBhc3N1bWVkIHRvIGJlIDAgaW4gdGhlIGN1cnJlbnQgaW1wbGVtZW50YXRpb24gYW5kIGlzIGFzc3VtZWQgdG8gYmUgYDBgOyB1c2UgdGh1bWIgbWFyZ2lucyBpbiBwbGFjZSBvZiBzY3JvbGxiYXIgcGFkZGluZy5cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3RodW1iTWF4ID0gYmFyU2l6ZSAtIHRodW1iU2l6ZSAtIHRodW1iTWFyZ2lucztcblxuICAgICAgICB0aGlzLl90aHVtYk1hcmdpbkxlYWRpbmcgPSB0aHVtYk1hcmdpbkxlYWRpbmc7IC8vIHVzZWQgaW4gbW91c2Vkb3duXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IFJlbW92ZSB0aGUgc2Nyb2xsYmFyLlxuICAgICAqIEBkZXNjIFVuaG9va3MgYWxsIHRoZSBldmVudCBoYW5kbGVycyBhbmQgdGhlbiByZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlIERPTS4gQWx3YXlzIGNhbGwgdGhpcyBtZXRob2QgcHJpb3IgdG8gZGlzcG9zaW5nIG9mIHRoZSBzY3JvbGxiYXIgb2JqZWN0LlxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2Vkb3duJyk7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgICh0aGlzLmNvbnRhaW5lciB8fCB0aGlzLmJhci5wYXJlbnRFbGVtZW50KS5fcmVtb3ZlRXZ0KCd3aGVlbCcsIHRoaXMuX2JvdW5kLm9ud2hlZWwpO1xuXG4gICAgICAgIHRoaXMuYmFyLm9uY2xpY2sgPVxuICAgICAgICAgICAgdGhpcy50aHVtYi5vbmNsaWNrID1cbiAgICAgICAgICAgICAgICB0aGlzLnRodW1iLm9ubW91c2VvdmVyID1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aHVtYi50cmFuc2l0aW9uZW5kID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGh1bWIub25tb3VzZW91dCA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5iYXIucmVtb3ZlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uIF9hZGRUZXN0UGFuZWxJdGVtXG4gICAgICogQHN1bW1hcnkgQXBwZW5kIGEgdGVzdCBwYW5lbCBlbGVtZW50LlxuICAgICAqIEBkZXNjIElmIHRoZXJlIGlzIGEgdGVzdCBwYW5lbCBpbiB0aGUgRE9NICh0eXBpY2FsbHkgYW4gYDxvbD4uLi48L29sPmAgZWxlbWVudCkgd2l0aCBjbGFzcyBuYW1lcyBvZiBib3RoIGB0aGlzLmNsYXNzUHJlZml4YCBhbmQgYCd0ZXN0LXBhbmVsJ2AgKG9yLCBiYXJyaW5nIHRoYXQsIGFueSBlbGVtZW50IHdpdGggY2xhc3MgbmFtZSBgJ3Rlc3QtcGFuZWwnYCksIGFuIGA8bGk+Li4uPC9saT5gIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkIGFuZCBhcHBlbmRlZCB0byBpdC4gVGhpcyBuZXcgZWxlbWVudCB3aWxsIGNvbnRhaW4gYSBzcGFuIGZvciBlYWNoIGNsYXNzIG5hbWUgZ2l2ZW4uXG4gICAgICpcbiAgICAgKiBZb3Ugc2hvdWxkIGRlZmluZSBhIENTUyBzZWxlY3RvciBgLmxpc3RlbmluZ2AgZm9yIHRoZXNlIHNwYW5zLiBUaGlzIGNsYXNzIHdpbGwgYmUgYWRkZWQgdG8gdGhlIHNwYW5zIHRvIGFsdGVyIHRoZWlyIGFwcGVhcmFuY2Ugd2hlbiBhIGxpc3RlbmVyIGlzIGFkZGVkIHdpdGggdGhhdCBjbGFzcyBuYW1lIChwcmVmaXhlZCB3aXRoICdvbicpLlxuICAgICAqXG4gICAgICogKFRoaXMgaXMgYW4gaW50ZXJuYWwgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgb25jZSBieSB0aGUgY29uc3RydWN0b3Igb24gZXZlcnkgaW5zdGFudGlhdGlvbi4pXG4gICAgICogQHJldHVybnMge0VsZW1lbnR8dW5kZWZpbmVkfSBUaGUgYXBwZW5kZWQgYDxsaT4uLi48L2xpPmAgZWxlbWVudCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBpcyBubyB0ZXN0IHBhbmVsLlxuICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICovXG4gICAgX2FkZFRlc3RQYW5lbEl0ZW06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRlc3RQYW5lbEl0ZW0sXG4gICAgICAgICAgICB0ZXN0UGFuZWxFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLl9jbGFzc1ByZWZpeCArICcudGVzdC1wYW5lbCcpIHx8IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50ZXN0LXBhbmVsJyk7XG5cbiAgICAgICAgaWYgKHRlc3RQYW5lbEVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzID0gWyAnbW91c2Vkb3duJywgJ21vdXNlbW92ZScsICdtb3VzZXVwJywgJ2luZGV4JyBdLFxuICAgICAgICAgICAgICAgIGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXG4gICAgICAgICAgICB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHBhcnROYW1lKSB7XG4gICAgICAgICAgICAgICAgaXRlbS5pbm5lckhUTUwgKz0gJzxzcGFuIGNsYXNzPVwiJyArIHBhcnROYW1lICsgJ1wiPicgKyBwYXJ0TmFtZS5yZXBsYWNlKCdtb3VzZScsICcnKSArICc8L3NwYW4+JztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0ZXN0UGFuZWxFbGVtZW50LmFwcGVuZENoaWxkKGl0ZW0pO1xuXG4gICAgICAgICAgICB0ZXN0UGFuZWxJdGVtID0ge307XG4gICAgICAgICAgICB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHBhcnROYW1lKSB7XG4gICAgICAgICAgICAgICAgdGVzdFBhbmVsSXRlbVtwYXJ0TmFtZV0gPSBpdGVtLmdldEVsZW1lbnRzQnlDbGFzc05hbWUocGFydE5hbWUpWzBdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGVzdFBhbmVsSXRlbTtcbiAgICB9LFxuXG4gICAgX2FkZEV2dDogZnVuY3Rpb24gKGV2dE5hbWUpIHtcbiAgICAgICAgdmFyIHNweSA9IHRoaXMudGVzdFBhbmVsSXRlbSAmJiB0aGlzLnRlc3RQYW5lbEl0ZW1bZXZ0TmFtZV07XG4gICAgICAgIGlmIChzcHkpIHsgc3B5LmNsYXNzTGlzdC5hZGQoJ2xpc3RlbmluZycpOyB9XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIHRoaXMuX2JvdW5kWydvbicgKyBldnROYW1lXSk7XG4gICAgfSxcblxuICAgIF9yZW1vdmVFdnQ6IGZ1bmN0aW9uIChldnROYW1lKSB7XG4gICAgICAgIHZhciBzcHkgPSB0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtW2V2dE5hbWVdO1xuICAgICAgICBpZiAoc3B5KSB7IHNweS5jbGFzc0xpc3QucmVtb3ZlKCdsaXN0ZW5pbmcnKTsgfVxuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihldnROYW1lLCB0aGlzLl9ib3VuZFsnb24nICsgZXZ0TmFtZV0pO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmopIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgb2JqbiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaWYgKG9iam4pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmpuKSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0gPSBvYmpuW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gdmFsaWRSYW5nZShyYW5nZSkge1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocmFuZ2UpLFxuICAgICAgICB2YWxpZCA9ICBrZXlzLmxlbmd0aCA9PT0gMiAmJlxuICAgICAgICAgICAgdHlwZW9mIHJhbmdlLm1pbiA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgIHR5cGVvZiByYW5nZS5tYXggPT09ICdudW1iZXInICYmXG4gICAgICAgICAgICByYW5nZS5taW4gPD0gcmFuZ2UubWF4O1xuXG4gICAgaWYgKCF2YWxpZCkge1xuICAgICAgICBlcnJvcignSW52YWxpZCAucmFuZ2Ugb2JqZWN0LicpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgaGFuZGxlcnNUb0JlQm91bmRcbiAqIEB0eXBlIHtvYmplY3R9XG4gKiBAZGVzYyBUaGUgZnVuY3Rpb25zIGRlZmluZWQgaW4gdGhpcyBvYmplY3QgYXJlIGFsbCBET00gZXZlbnQgaGFuZGxlcnMgdGhhdCBhcmUgYm91bmQgYnkgdGhlIEZpbkJhciBjb25zdHJ1Y3RvciB0byBlYWNoIG5ldyBpbnN0YW5jZS4gSW4gb3RoZXIgd29yZHMsIHRoZSBgdGhpc2AgdmFsdWUgb2YgdGhlc2UgaGFuZGxlcnMsIG9uY2UgYm91bmQsIHJlZmVyIHRvIHRoZSBGaW5CYXIgb2JqZWN0IGFuZCBub3QgdG8gdGhlIGV2ZW50IGVtaXR0ZXIuIFwiRG8gbm90IGNvbnN1bWUgcmF3LlwiXG4gKi9cbnZhciBoYW5kbGVyc1RvQmVCb3VuZCA9IHtcbiAgICBzaG9ydFN0b3A6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0sXG5cbiAgICBvbndoZWVsOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHRoaXMuaW5kZXggKz0gZXZ0W3RoaXMuZGVsdGFQcm9wXTtcbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuXG4gICAgb25jbGljazogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICB2YXIgdGh1bWJCb3ggPSB0aGlzLnRodW1iLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICAgICAgZ29pbmdVcCA9IGV2dFt0aGlzLm9oLmNvb3JkaW5hdGVdIDwgdGh1bWJCb3hbdGhpcy5vaC5sZWFkaW5nXTtcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMucGFnaW5nID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IHRoaXMucGFnaW5nW2dvaW5nVXAgPyAndXAnIDogJ2Rvd24nXShNYXRoLnJvdW5kKHRoaXMuaW5kZXgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggKz0gZ29pbmdVcCA/IC10aGlzLmluY3JlbWVudCA6IHRoaXMuaW5jcmVtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbWFrZSB0aGUgdGh1bWIgZ2xvdyBtb21lbnRhcmlseVxuICAgICAgICB0aGlzLnRodW1iLmNsYXNzTGlzdC5hZGQoJ2hvdmVyJyk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy50aHVtYi5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgZnVuY3Rpb24gd2FpdEZvckl0KCkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgd2FpdEZvckl0KTtcbiAgICAgICAgICAgIHNlbGYuX2JvdW5kLm9ubW91c2V1cChldnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSxcblxuICAgIG9ubW91c2VvdmVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudGh1bWIuY2xhc3NMaXN0LmFkZCgnaG92ZXInKTtcbiAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3V0ID0gdGhpcy5fYm91bmQub25tb3VzZW91dDtcbiAgICAgICAgdGhpcy5fYWRkRXZ0KCdtb3VzZWRvd24nKTtcbiAgICB9LFxuXG4gICAgb25tb3VzZW91dDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlZG93bicpO1xuICAgICAgICB0aGlzLnRodW1iLm9ubW91c2VvdmVyID0gdGhpcy5fYm91bmQub25tb3VzZW92ZXI7XG4gICAgICAgIHRoaXMudGh1bWIuY2xhc3NMaXN0LnJlbW92ZSgnaG92ZXInKTtcbiAgICB9LFxuXG4gICAgb25tb3VzZWRvd246IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZ0KCdtb3VzZWRvd24nKTtcbiAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3ZlciA9IHRoaXMudGh1bWIub25tb3VzZW91dCA9IG51bGw7XG5cbiAgICAgICAgdmFyIHRodW1iQm94ID0gdGhpcy50aHVtYi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdGhpcy5waW5PZmZzZXQgPSBldnRbdGhpcy5vaC5heGlzXSAtIHRodW1iQm94W3RoaXMub2gubGVhZGluZ10gKyB0aGlzLmJhci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVt0aGlzLm9oLmxlYWRpbmddICsgdGhpcy5fdGh1bWJNYXJnaW5MZWFkaW5nO1xuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY3Vyc29yID0gJ2RlZmF1bHQnO1xuXG4gICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcblxuICAgIG9ubW91c2Vtb3ZlOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIHZhciBzY2FsZWQgPSBNYXRoLm1pbih0aGlzLl90aHVtYk1heCwgTWF0aC5tYXgoMCwgZXZ0W3RoaXMub2guYXhpc10gLSB0aGlzLnBpbk9mZnNldCkpO1xuICAgICAgICB2YXIgaWR4ID0gc2NhbGVkIC8gdGhpcy5fdGh1bWJNYXggKiAodGhpcy5fbWF4IC0gdGhpcy5fbWluKSArIHRoaXMuX21pbjtcblxuICAgICAgICB0aGlzLl9zZXRTY3JvbGwoaWR4LCBzY2FsZWQpO1xuXG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcblxuICAgIG9ubW91c2V1cDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlbW92ZScpO1xuICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNldXAnKTtcblxuICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY3Vyc29yID0gJ2F1dG8nO1xuXG4gICAgICAgIHZhciB0aHVtYkJveCA9IHRoaXMudGh1bWIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHRodW1iQm94LmxlZnQgPD0gZXZ0LmNsaWVudFggJiYgZXZ0LmNsaWVudFggPD0gdGh1bWJCb3gucmlnaHQgJiZcbiAgICAgICAgICAgIHRodW1iQm94LnRvcCA8PSBldnQuY2xpZW50WSAmJiBldnQuY2xpZW50WSA8PSB0aHVtYkJveC5ib3R0b21cbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aGlzLl9ib3VuZC5vbm1vdXNlb3ZlcihldnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fYm91bmQub25tb3VzZW91dChldnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG59O1xuXG52YXIgb3JpZW50YXRpb25IYXNoZXMgPSB7XG4gICAgdmVydGljYWw6IHtcbiAgICAgICAgY29vcmRpbmF0ZTogICAgICdjbGllbnRZJyxcbiAgICAgICAgYXhpczogICAgICAgICAgICdwYWdlWScsXG4gICAgICAgIHNpemU6ICAgICAgICAgICAnaGVpZ2h0JyxcbiAgICAgICAgb3V0c2lkZTogICAgICAgICdyaWdodCcsXG4gICAgICAgIGluc2lkZTogICAgICAgICAnbGVmdCcsXG4gICAgICAgIGxlYWRpbmc6ICAgICAgICAndG9wJyxcbiAgICAgICAgdHJhaWxpbmc6ICAgICAgICdib3R0b20nLFxuICAgICAgICBtYXJnaW5MZWFkaW5nOiAgJ21hcmdpblRvcCcsXG4gICAgICAgIG1hcmdpblRyYWlsaW5nOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgdGhpY2tuZXNzOiAgICAgICd3aWR0aCcsXG4gICAgICAgIGRlbHRhOiAgICAgICAgICAnZGVsdGFZJ1xuICAgIH0sXG4gICAgaG9yaXpvbnRhbDoge1xuICAgICAgICBjb29yZGluYXRlOiAgICAgJ2NsaWVudFgnLFxuICAgICAgICBheGlzOiAgICAgICAgICAgJ3BhZ2VYJyxcbiAgICAgICAgc2l6ZTogICAgICAgICAgICd3aWR0aCcsXG4gICAgICAgIG91dHNpZGU6ICAgICAgICAnYm90dG9tJyxcbiAgICAgICAgaW5zaWRlOiAgICAgICAgICd0b3AnLFxuICAgICAgICBsZWFkaW5nOiAgICAgICAgJ2xlZnQnLFxuICAgICAgICB0cmFpbGluZzogICAgICAgJ3JpZ2h0JyxcbiAgICAgICAgbWFyZ2luTGVhZGluZzogICdtYXJnaW5MZWZ0JyxcbiAgICAgICAgbWFyZ2luVHJhaWxpbmc6ICdtYXJnaW5SaWdodCcsXG4gICAgICAgIHRoaWNrbmVzczogICAgICAnaGVpZ2h0JyxcbiAgICAgICAgZGVsdGE6ICAgICAgICAgICdkZWx0YVgnXG4gICAgfVxufTtcblxudmFyIGF4aXMgPSB7XG4gICAgdG9wOiAgICAndmVydGljYWwnLFxuICAgIGJvdHRvbTogJ3ZlcnRpY2FsJyxcbiAgICBoZWlnaHQ6ICd2ZXJ0aWNhbCcsXG4gICAgbGVmdDogICAnaG9yaXpvbnRhbCcsXG4gICAgcmlnaHQ6ICAnaG9yaXpvbnRhbCcsXG4gICAgd2lkdGg6ICAnaG9yaXpvbnRhbCdcbn07XG5cbnZhciBjc3NGaW5CYXJzOyAvLyBkZWZpbml0aW9uIGluc2VydGVkIGJ5IGd1bHBmaWxlIGJldHdlZW4gZm9sbG93aW5nIGNvbW1lbnRzXG4vKiBpbmplY3Q6Y3NzICovXG5jc3NGaW5CYXJzID0gJ2Rpdi5maW5iYXItaG9yaXpvbnRhbCxkaXYuZmluYmFyLXZlcnRpY2Fse3Bvc2l0aW9uOmFic29sdXRlO21hcmdpbjozcHh9ZGl2LmZpbmJhci1ob3Jpem9udGFsPi50aHVtYixkaXYuZmluYmFyLXZlcnRpY2FsPi50aHVtYntwb3NpdGlvbjphYnNvbHV0ZTtiYWNrZ3JvdW5kLWNvbG9yOiNkM2QzZDM7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAxcHggIzAwMDstbW96LWJveC1zaGFkb3c6MCAwIDFweCAjMDAwO2JveC1zaGFkb3c6MCAwIDFweCAjMDAwO2JvcmRlci1yYWRpdXM6NHB4O21hcmdpbjoycHg7b3BhY2l0eTouNDt0cmFuc2l0aW9uOm9wYWNpdHkgLjVzfWRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWIuaG92ZXIsZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWIuaG92ZXJ7b3BhY2l0eToxO3RyYW5zaXRpb246b3BhY2l0eSAuNXN9ZGl2LmZpbmJhci12ZXJ0aWNhbHt0b3A6MDtib3R0b206MDtyaWdodDowO3dpZHRoOjExcHh9ZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWJ7dG9wOjA7cmlnaHQ6MDt3aWR0aDo3cHh9ZGl2LmZpbmJhci1ob3Jpem9udGFse2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO2hlaWdodDoxMXB4fWRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWJ7bGVmdDowO2JvdHRvbTowO2hlaWdodDo3cHh9Jztcbi8qIGVuZGluamVjdCAqL1xuXG5mdW5jdGlvbiBlcnJvcihtc2cpIHtcbiAgICB0aHJvdyAnZmluYmFyczogJyArIG1zZztcbn1cblxuLy8gSW50ZXJmYWNlXG5tb2R1bGUuZXhwb3J0cyA9IEZpbkJhcjtcbiIsIjsoZnVuY3Rpb24gKCkgeyAvLyBjbG9zdXJlIGZvciB3ZWIgYnJvd3NlcnNcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gTFJVQ2FjaGVcbn0gZWxzZSB7XG4gIC8vIGp1c3Qgc2V0IHRoZSBnbG9iYWwgZm9yIG5vbi1ub2RlIHBsYXRmb3Jtcy5cbiAgdGhpcy5MUlVDYWNoZSA9IExSVUNhY2hlXG59XG5cbmZ1bmN0aW9uIGhPUCAob2JqLCBrZXkpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSlcbn1cblxuZnVuY3Rpb24gbmFpdmVMZW5ndGggKCkgeyByZXR1cm4gMSB9XG5cbnZhciBkaWRUeXBlV2FybmluZyA9IGZhbHNlXG5mdW5jdGlvbiB0eXBlQ2hlY2tLZXkoa2V5KSB7XG4gIGlmICghZGlkVHlwZVdhcm5pbmcgJiYgdHlwZW9mIGtleSAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIGtleSAhPT0gJ251bWJlcicpIHtcbiAgICBkaWRUeXBlV2FybmluZyA9IHRydWVcbiAgICBjb25zb2xlLmVycm9yKG5ldyBUeXBlRXJyb3IoXCJMUlU6IGtleSBtdXN0IGJlIGEgc3RyaW5nIG9yIG51bWJlci4gQWxtb3N0IGNlcnRhaW5seSBhIGJ1ZyEgXCIgKyB0eXBlb2Yga2V5KS5zdGFjaylcbiAgfVxufVxuXG5mdW5jdGlvbiBMUlVDYWNoZSAob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTFJVQ2FjaGUpKVxuICAgIHJldHVybiBuZXcgTFJVQ2FjaGUob3B0aW9ucylcblxuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdudW1iZXInKVxuICAgIG9wdGlvbnMgPSB7IG1heDogb3B0aW9ucyB9XG5cbiAgaWYgKCFvcHRpb25zKVxuICAgIG9wdGlvbnMgPSB7fVxuXG4gIHRoaXMuX21heCA9IG9wdGlvbnMubWF4XG4gIC8vIEtpbmQgb2Ygd2VpcmQgdG8gaGF2ZSBhIGRlZmF1bHQgbWF4IG9mIEluZmluaXR5LCBidXQgb2ggd2VsbC5cbiAgaWYgKCF0aGlzLl9tYXggfHwgISh0eXBlb2YgdGhpcy5fbWF4ID09PSBcIm51bWJlclwiKSB8fCB0aGlzLl9tYXggPD0gMCApXG4gICAgdGhpcy5fbWF4ID0gSW5maW5pdHlcblxuICB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yID0gb3B0aW9ucy5sZW5ndGggfHwgbmFpdmVMZW5ndGhcbiAgaWYgKHR5cGVvZiB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yICE9PSBcImZ1bmN0aW9uXCIpXG4gICAgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciA9IG5haXZlTGVuZ3RoXG5cbiAgdGhpcy5fYWxsb3dTdGFsZSA9IG9wdGlvbnMuc3RhbGUgfHwgZmFsc2VcbiAgdGhpcy5fbWF4QWdlID0gb3B0aW9ucy5tYXhBZ2UgfHwgbnVsbFxuICB0aGlzLl9kaXNwb3NlID0gb3B0aW9ucy5kaXNwb3NlXG4gIHRoaXMucmVzZXQoKVxufVxuXG4vLyByZXNpemUgdGhlIGNhY2hlIHdoZW4gdGhlIG1heCBjaGFuZ2VzLlxuT2JqZWN0LmRlZmluZVByb3BlcnR5KExSVUNhY2hlLnByb3RvdHlwZSwgXCJtYXhcIixcbiAgeyBzZXQgOiBmdW5jdGlvbiAobUwpIHtcbiAgICAgIGlmICghbUwgfHwgISh0eXBlb2YgbUwgPT09IFwibnVtYmVyXCIpIHx8IG1MIDw9IDAgKSBtTCA9IEluZmluaXR5XG4gICAgICB0aGlzLl9tYXggPSBtTFxuICAgICAgaWYgKHRoaXMuX2xlbmd0aCA+IHRoaXMuX21heCkgdHJpbSh0aGlzKVxuICAgIH1cbiAgLCBnZXQgOiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9tYXggfVxuICAsIGVudW1lcmFibGUgOiB0cnVlXG4gIH0pXG5cbi8vIHJlc2l6ZSB0aGUgY2FjaGUgd2hlbiB0aGUgbGVuZ3RoQ2FsY3VsYXRvciBjaGFuZ2VzLlxuT2JqZWN0LmRlZmluZVByb3BlcnR5KExSVUNhY2hlLnByb3RvdHlwZSwgXCJsZW5ndGhDYWxjdWxhdG9yXCIsXG4gIHsgc2V0IDogZnVuY3Rpb24gKGxDKSB7XG4gICAgICBpZiAodHlwZW9mIGxDICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciA9IG5haXZlTGVuZ3RoXG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IHRoaXMuX2l0ZW1Db3VudFxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5fY2FjaGUpIHtcbiAgICAgICAgICB0aGlzLl9jYWNoZVtrZXldLmxlbmd0aCA9IDFcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciA9IGxDXG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IDBcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuX2NhY2hlKSB7XG4gICAgICAgICAgdGhpcy5fY2FjaGVba2V5XS5sZW5ndGggPSB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yKHRoaXMuX2NhY2hlW2tleV0udmFsdWUpXG4gICAgICAgICAgdGhpcy5fbGVuZ3RoICs9IHRoaXMuX2NhY2hlW2tleV0ubGVuZ3RoXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2xlbmd0aCA+IHRoaXMuX21heCkgdHJpbSh0aGlzKVxuICAgIH1cbiAgLCBnZXQgOiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yIH1cbiAgLCBlbnVtZXJhYmxlIDogdHJ1ZVxuICB9KVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTFJVQ2FjaGUucHJvdG90eXBlLCBcImxlbmd0aFwiLFxuICB7IGdldCA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aCB9XG4gICwgZW51bWVyYWJsZSA6IHRydWVcbiAgfSlcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTFJVQ2FjaGUucHJvdG90eXBlLCBcIml0ZW1Db3VudFwiLFxuICB7IGdldCA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2l0ZW1Db3VudCB9XG4gICwgZW51bWVyYWJsZSA6IHRydWVcbiAgfSlcblxuTFJVQ2FjaGUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiAoZm4sIHRoaXNwKSB7XG4gIHRoaXNwID0gdGhpc3AgfHwgdGhpc1xuICB2YXIgaSA9IDBcbiAgdmFyIGl0ZW1Db3VudCA9IHRoaXMuX2l0ZW1Db3VudFxuXG4gIGZvciAodmFyIGsgPSB0aGlzLl9tcnUgLSAxOyBrID49IDAgJiYgaSA8IGl0ZW1Db3VudDsgay0tKSBpZiAodGhpcy5fbHJ1TGlzdFtrXSkge1xuICAgIGkrK1xuICAgIHZhciBoaXQgPSB0aGlzLl9scnVMaXN0W2tdXG4gICAgaWYgKGlzU3RhbGUodGhpcywgaGl0KSkge1xuICAgICAgZGVsKHRoaXMsIGhpdClcbiAgICAgIGlmICghdGhpcy5fYWxsb3dTdGFsZSkgaGl0ID0gdW5kZWZpbmVkXG4gICAgfVxuICAgIGlmIChoaXQpIHtcbiAgICAgIGZuLmNhbGwodGhpc3AsIGhpdC52YWx1ZSwgaGl0LmtleSwgdGhpcylcbiAgICB9XG4gIH1cbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBrZXlzID0gbmV3IEFycmF5KHRoaXMuX2l0ZW1Db3VudClcbiAgdmFyIGkgPSAwXG4gIGZvciAodmFyIGsgPSB0aGlzLl9tcnUgLSAxOyBrID49IDAgJiYgaSA8IHRoaXMuX2l0ZW1Db3VudDsgay0tKSBpZiAodGhpcy5fbHJ1TGlzdFtrXSkge1xuICAgIHZhciBoaXQgPSB0aGlzLl9scnVMaXN0W2tdXG4gICAga2V5c1tpKytdID0gaGl0LmtleVxuICB9XG4gIHJldHVybiBrZXlzXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkodGhpcy5faXRlbUNvdW50KVxuICB2YXIgaSA9IDBcbiAgZm9yICh2YXIgayA9IHRoaXMuX21ydSAtIDE7IGsgPj0gMCAmJiBpIDwgdGhpcy5faXRlbUNvdW50OyBrLS0pIGlmICh0aGlzLl9scnVMaXN0W2tdKSB7XG4gICAgdmFyIGhpdCA9IHRoaXMuX2xydUxpc3Rba11cbiAgICB2YWx1ZXNbaSsrXSA9IGhpdC52YWx1ZVxuICB9XG4gIHJldHVybiB2YWx1ZXNcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fZGlzcG9zZSAmJiB0aGlzLl9jYWNoZSkge1xuICAgIGZvciAodmFyIGsgaW4gdGhpcy5fY2FjaGUpIHtcbiAgICAgIHRoaXMuX2Rpc3Bvc2UoaywgdGhpcy5fY2FjaGVba10udmFsdWUpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5fY2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpIC8vIGhhc2ggb2YgaXRlbXMgYnkga2V5XG4gIHRoaXMuX2xydUxpc3QgPSBPYmplY3QuY3JlYXRlKG51bGwpIC8vIGxpc3Qgb2YgaXRlbXMgaW4gb3JkZXIgb2YgdXNlIHJlY2VuY3lcbiAgdGhpcy5fbXJ1ID0gMCAvLyBtb3N0IHJlY2VudGx5IHVzZWRcbiAgdGhpcy5fbHJ1ID0gMCAvLyBsZWFzdCByZWNlbnRseSB1c2VkXG4gIHRoaXMuX2xlbmd0aCA9IDAgLy8gbnVtYmVyIG9mIGl0ZW1zIGluIHRoZSBsaXN0XG4gIHRoaXMuX2l0ZW1Db3VudCA9IDBcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmR1bXAgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBhcnIgPSBbXVxuICB2YXIgaSA9IDBcblxuICBmb3IgKHZhciBrID0gdGhpcy5fbXJ1IC0gMTsgayA+PSAwICYmIGkgPCB0aGlzLl9pdGVtQ291bnQ7IGstLSkgaWYgKHRoaXMuX2xydUxpc3Rba10pIHtcbiAgICB2YXIgaGl0ID0gdGhpcy5fbHJ1TGlzdFtrXVxuICAgIGlmICghaXNTdGFsZSh0aGlzLCBoaXQpKSB7XG4gICAgICAvL0RvIG5vdCBzdG9yZSBzdGFsZWQgaGl0c1xuICAgICAgKytpXG4gICAgICBhcnIucHVzaCh7XG4gICAgICAgIGs6IGhpdC5rZXksXG4gICAgICAgIHY6IGhpdC52YWx1ZSxcbiAgICAgICAgZTogaGl0Lm5vdyArIChoaXQubWF4QWdlIHx8IDApXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgLy9hcnIgaGFzIHRoZSBtb3N0IHJlYWQgZmlyc3RcbiAgcmV0dXJuIGFyclxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUuZHVtcExydSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2xydUxpc3Rcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlLCBtYXhBZ2UpIHtcbiAgbWF4QWdlID0gbWF4QWdlIHx8IHRoaXMuX21heEFnZVxuICB0eXBlQ2hlY2tLZXkoa2V5KVxuXG4gIHZhciBub3cgPSBtYXhBZ2UgPyBEYXRlLm5vdygpIDogMFxuICB2YXIgbGVuID0gdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvcih2YWx1ZSlcblxuICBpZiAoaE9QKHRoaXMuX2NhY2hlLCBrZXkpKSB7XG4gICAgaWYgKGxlbiA+IHRoaXMuX21heCkge1xuICAgICAgZGVsKHRoaXMsIHRoaXMuX2NhY2hlW2tleV0pXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgLy8gZGlzcG9zZSBvZiB0aGUgb2xkIG9uZSBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgICBpZiAodGhpcy5fZGlzcG9zZSlcbiAgICAgIHRoaXMuX2Rpc3Bvc2Uoa2V5LCB0aGlzLl9jYWNoZVtrZXldLnZhbHVlKVxuXG4gICAgdGhpcy5fY2FjaGVba2V5XS5ub3cgPSBub3dcbiAgICB0aGlzLl9jYWNoZVtrZXldLm1heEFnZSA9IG1heEFnZVxuICAgIHRoaXMuX2NhY2hlW2tleV0udmFsdWUgPSB2YWx1ZVxuICAgIHRoaXMuX2xlbmd0aCArPSAobGVuIC0gdGhpcy5fY2FjaGVba2V5XS5sZW5ndGgpXG4gICAgdGhpcy5fY2FjaGVba2V5XS5sZW5ndGggPSBsZW5cbiAgICB0aGlzLmdldChrZXkpXG5cbiAgICBpZiAodGhpcy5fbGVuZ3RoID4gdGhpcy5fbWF4KVxuICAgICAgdHJpbSh0aGlzKVxuXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIHZhciBoaXQgPSBuZXcgRW50cnkoa2V5LCB2YWx1ZSwgdGhpcy5fbXJ1KyssIGxlbiwgbm93LCBtYXhBZ2UpXG5cbiAgLy8gb3ZlcnNpemVkIG9iamVjdHMgZmFsbCBvdXQgb2YgY2FjaGUgYXV0b21hdGljYWxseS5cbiAgaWYgKGhpdC5sZW5ndGggPiB0aGlzLl9tYXgpIHtcbiAgICBpZiAodGhpcy5fZGlzcG9zZSkgdGhpcy5fZGlzcG9zZShrZXksIHZhbHVlKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgdGhpcy5fbGVuZ3RoICs9IGhpdC5sZW5ndGhcbiAgdGhpcy5fbHJ1TGlzdFtoaXQubHVdID0gdGhpcy5fY2FjaGVba2V5XSA9IGhpdFxuICB0aGlzLl9pdGVtQ291bnQgKytcblxuICBpZiAodGhpcy5fbGVuZ3RoID4gdGhpcy5fbWF4KVxuICAgIHRyaW0odGhpcylcblxuICByZXR1cm4gdHJ1ZVxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24gKGtleSkge1xuICB0eXBlQ2hlY2tLZXkoa2V5KVxuICBpZiAoIWhPUCh0aGlzLl9jYWNoZSwga2V5KSkgcmV0dXJuIGZhbHNlXG4gIHZhciBoaXQgPSB0aGlzLl9jYWNoZVtrZXldXG4gIGlmIChpc1N0YWxlKHRoaXMsIGhpdCkpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICByZXR1cm4gdHJ1ZVxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICB0eXBlQ2hlY2tLZXkoa2V5KVxuICByZXR1cm4gZ2V0KHRoaXMsIGtleSwgdHJ1ZSlcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIHR5cGVDaGVja0tleShrZXkpXG4gIHJldHVybiBnZXQodGhpcywga2V5LCBmYWxzZSlcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLnBvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGhpdCA9IHRoaXMuX2xydUxpc3RbdGhpcy5fbHJ1XVxuICBkZWwodGhpcywgaGl0KVxuICByZXR1cm4gaGl0IHx8IG51bGxcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmRlbCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgdHlwZUNoZWNrS2V5KGtleSlcbiAgZGVsKHRoaXMsIHRoaXMuX2NhY2hlW2tleV0pXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKGFycikge1xuICAvL3Jlc2V0IHRoZSBjYWNoZVxuICB0aGlzLnJlc2V0KCk7XG5cbiAgdmFyIG5vdyA9IERhdGUubm93KClcbiAgLy9BIHByZXZpb3VzIHNlcmlhbGl6ZWQgY2FjaGUgaGFzIHRoZSBtb3N0IHJlY2VudCBpdGVtcyBmaXJzdFxuICBmb3IgKHZhciBsID0gYXJyLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tICkge1xuICAgIHZhciBoaXQgPSBhcnJbbF1cbiAgICB0eXBlQ2hlY2tLZXkoaGl0LmspXG4gICAgdmFyIGV4cGlyZXNBdCA9IGhpdC5lIHx8IDBcbiAgICBpZiAoZXhwaXJlc0F0ID09PSAwKSB7XG4gICAgICAvL3RoZSBpdGVtIHdhcyBjcmVhdGVkIHdpdGhvdXQgZXhwaXJhdGlvbiBpbiBhIG5vbiBhZ2VkIGNhY2hlXG4gICAgICB0aGlzLnNldChoaXQuaywgaGl0LnYpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBtYXhBZ2UgPSBleHBpcmVzQXQgLSBub3dcbiAgICAgIC8vZG9udCBhZGQgYWxyZWFkeSBleHBpcmVkIGl0ZW1zXG4gICAgICBpZiAobWF4QWdlID4gMCkgdGhpcy5zZXQoaGl0LmssIGhpdC52LCBtYXhBZ2UpXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldCAoc2VsZiwga2V5LCBkb1VzZSkge1xuICB0eXBlQ2hlY2tLZXkoa2V5KVxuICB2YXIgaGl0ID0gc2VsZi5fY2FjaGVba2V5XVxuICBpZiAoaGl0KSB7XG4gICAgaWYgKGlzU3RhbGUoc2VsZiwgaGl0KSkge1xuICAgICAgZGVsKHNlbGYsIGhpdClcbiAgICAgIGlmICghc2VsZi5fYWxsb3dTdGFsZSkgaGl0ID0gdW5kZWZpbmVkXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChkb1VzZSkgdXNlKHNlbGYsIGhpdClcbiAgICB9XG4gICAgaWYgKGhpdCkgaGl0ID0gaGl0LnZhbHVlXG4gIH1cbiAgcmV0dXJuIGhpdFxufVxuXG5mdW5jdGlvbiBpc1N0YWxlKHNlbGYsIGhpdCkge1xuICBpZiAoIWhpdCB8fCAoIWhpdC5tYXhBZ2UgJiYgIXNlbGYuX21heEFnZSkpIHJldHVybiBmYWxzZVxuICB2YXIgc3RhbGUgPSBmYWxzZTtcbiAgdmFyIGRpZmYgPSBEYXRlLm5vdygpIC0gaGl0Lm5vd1xuICBpZiAoaGl0Lm1heEFnZSkge1xuICAgIHN0YWxlID0gZGlmZiA+IGhpdC5tYXhBZ2VcbiAgfSBlbHNlIHtcbiAgICBzdGFsZSA9IHNlbGYuX21heEFnZSAmJiAoZGlmZiA+IHNlbGYuX21heEFnZSlcbiAgfVxuICByZXR1cm4gc3RhbGU7XG59XG5cbmZ1bmN0aW9uIHVzZSAoc2VsZiwgaGl0KSB7XG4gIHNoaWZ0TFUoc2VsZiwgaGl0KVxuICBoaXQubHUgPSBzZWxmLl9tcnUgKytcbiAgc2VsZi5fbHJ1TGlzdFtoaXQubHVdID0gaGl0XG59XG5cbmZ1bmN0aW9uIHRyaW0gKHNlbGYpIHtcbiAgd2hpbGUgKHNlbGYuX2xydSA8IHNlbGYuX21ydSAmJiBzZWxmLl9sZW5ndGggPiBzZWxmLl9tYXgpXG4gICAgZGVsKHNlbGYsIHNlbGYuX2xydUxpc3Rbc2VsZi5fbHJ1XSlcbn1cblxuZnVuY3Rpb24gc2hpZnRMVSAoc2VsZiwgaGl0KSB7XG4gIGRlbGV0ZSBzZWxmLl9scnVMaXN0WyBoaXQubHUgXVxuICB3aGlsZSAoc2VsZi5fbHJ1IDwgc2VsZi5fbXJ1ICYmICFzZWxmLl9scnVMaXN0W3NlbGYuX2xydV0pIHNlbGYuX2xydSArK1xufVxuXG5mdW5jdGlvbiBkZWwgKHNlbGYsIGhpdCkge1xuICBpZiAoaGl0KSB7XG4gICAgaWYgKHNlbGYuX2Rpc3Bvc2UpIHNlbGYuX2Rpc3Bvc2UoaGl0LmtleSwgaGl0LnZhbHVlKVxuICAgIHNlbGYuX2xlbmd0aCAtPSBoaXQubGVuZ3RoXG4gICAgc2VsZi5faXRlbUNvdW50IC0tXG4gICAgZGVsZXRlIHNlbGYuX2NhY2hlWyBoaXQua2V5IF1cbiAgICBzaGlmdExVKHNlbGYsIGhpdClcbiAgfVxufVxuXG4vLyBjbGFzc3ksIHNpbmNlIFY4IHByZWZlcnMgcHJlZGljdGFibGUgb2JqZWN0cy5cbmZ1bmN0aW9uIEVudHJ5IChrZXksIHZhbHVlLCBsdSwgbGVuZ3RoLCBub3csIG1heEFnZSkge1xuICB0aGlzLmtleSA9IGtleVxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5sdSA9IGx1XG4gIHRoaXMubGVuZ3RoID0gbGVuZ3RoXG4gIHRoaXMubm93ID0gbm93XG4gIGlmIChtYXhBZ2UpIHRoaXMubWF4QWdlID0gbWF4QWdlXG59XG5cbn0pKClcbiIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuOC4zXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQsXG4gICAgbmF0aXZlQ3JlYXRlICAgICAgID0gT2JqZWN0LmNyZWF0ZTtcblxuICAvLyBOYWtlZCBmdW5jdGlvbiByZWZlcmVuY2UgZm9yIHN1cnJvZ2F0ZS1wcm90b3R5cGUtc3dhcHBpbmcuXG4gIHZhciBDdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdC5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS44LjMnO1xuXG4gIC8vIEludGVybmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhbiBlZmZpY2llbnQgKGZvciBjdXJyZW50IGVuZ2luZXMpIHZlcnNpb25cbiAgLy8gb2YgdGhlIHBhc3NlZC1pbiBjYWxsYmFjaywgdG8gYmUgcmVwZWF0ZWRseSBhcHBsaWVkIGluIG90aGVyIFVuZGVyc2NvcmVcbiAgLy8gZnVuY3Rpb25zLlxuICB2YXIgb3B0aW1pemVDYiA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQsIGFyZ0NvdW50KSB7XG4gICAgaWYgKGNvbnRleHQgPT09IHZvaWQgMCkgcmV0dXJuIGZ1bmM7XG4gICAgc3dpdGNoIChhcmdDb3VudCA9PSBudWxsID8gMyA6IGFyZ0NvdW50KSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgb3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwgb3RoZXIpO1xuICAgICAgfTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICB9O1xuICAgICAgY2FzZSA0OiByZXR1cm4gZnVuY3Rpb24oYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEEgbW9zdGx5LWludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGNhbGxiYWNrcyB0aGF0IGNhbiBiZSBhcHBsaWVkXG4gIC8vIHRvIGVhY2ggZWxlbWVudCBpbiBhIGNvbGxlY3Rpb24sIHJldHVybmluZyB0aGUgZGVzaXJlZCByZXN1bHQg4oCUIGVpdGhlclxuICAvLyBpZGVudGl0eSwgYW4gYXJiaXRyYXJ5IGNhbGxiYWNrLCBhIHByb3BlcnR5IG1hdGNoZXIsIG9yIGEgcHJvcGVydHkgYWNjZXNzb3IuXG4gIHZhciBjYiA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXy5pZGVudGl0eTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkgcmV0dXJuIG9wdGltaXplQ2IodmFsdWUsIGNvbnRleHQsIGFyZ0NvdW50KTtcbiAgICBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHJldHVybiBfLm1hdGNoZXIodmFsdWUpO1xuICAgIHJldHVybiBfLnByb3BlcnR5KHZhbHVlKTtcbiAgfTtcbiAgXy5pdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGNiKHZhbHVlLCBjb250ZXh0LCBJbmZpbml0eSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFzc2lnbmVyIGZ1bmN0aW9ucy5cbiAgdmFyIGNyZWF0ZUFzc2lnbmVyID0gZnVuY3Rpb24oa2V5c0Z1bmMsIHVuZGVmaW5lZE9ubHkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggPCAyIHx8IG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XSxcbiAgICAgICAgICAgIGtleXMgPSBrZXlzRnVuYyhzb3VyY2UpLFxuICAgICAgICAgICAgbCA9IGtleXMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIGlmICghdW5kZWZpbmVkT25seSB8fCBvYmpba2V5XSA9PT0gdm9pZCAwKSBvYmpba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGEgbmV3IG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gYW5vdGhlci5cbiAgdmFyIGJhc2VDcmVhdGUgPSBmdW5jdGlvbihwcm90b3R5cGUpIHtcbiAgICBpZiAoIV8uaXNPYmplY3QocHJvdG90eXBlKSkgcmV0dXJuIHt9O1xuICAgIGlmIChuYXRpdmVDcmVhdGUpIHJldHVybiBuYXRpdmVDcmVhdGUocHJvdG90eXBlKTtcbiAgICBDdG9yLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IEN0b3I7XG4gICAgQ3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgdmFyIHByb3BlcnR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiA9PSBudWxsID8gdm9pZCAwIDogb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBIZWxwZXIgZm9yIGNvbGxlY3Rpb24gbWV0aG9kcyB0byBkZXRlcm1pbmUgd2hldGhlciBhIGNvbGxlY3Rpb25cbiAgLy8gc2hvdWxkIGJlIGl0ZXJhdGVkIGFzIGFuIGFycmF5IG9yIGFzIGFuIG9iamVjdFxuICAvLyBSZWxhdGVkOiBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy10b2xlbmd0aFxuICAvLyBBdm9pZHMgYSB2ZXJ5IG5hc3R5IGlPUyA4IEpJVCBidWcgb24gQVJNLTY0LiAjMjA5NFxuICB2YXIgTUFYX0FSUkFZX0lOREVYID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgdmFyIGdldExlbmd0aCA9IHByb3BlcnR5KCdsZW5ndGgnKTtcbiAgdmFyIGlzQXJyYXlMaWtlID0gZnVuY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHZhciBsZW5ndGggPSBnZXRMZW5ndGgoY29sbGVjdGlvbik7XG4gICAgcmV0dXJuIHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicgJiYgbGVuZ3RoID49IDAgJiYgbGVuZ3RoIDw9IE1BWF9BUlJBWV9JTkRFWDtcbiAgfTtcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIHJhdyBvYmplY3RzIGluIGFkZGl0aW9uIHRvIGFycmF5LWxpa2VzLiBUcmVhdHMgYWxsXG4gIC8vIHNwYXJzZSBhcnJheS1saWtlcyBhcyBpZiB0aGV5IHdlcmUgZGVuc2UuXG4gIF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBpLCBsZW5ndGg7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcbiAgICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpbaV0sIGksIG9iaik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGl0ZXJhdGVlKG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudC5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIHJlc3VsdHMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICByZXN1bHRzW2luZGV4XSA9IGl0ZXJhdGVlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgcmVkdWNpbmcgZnVuY3Rpb24gaXRlcmF0aW5nIGxlZnQgb3IgcmlnaHQuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZShkaXIpIHtcbiAgICAvLyBPcHRpbWl6ZWQgaXRlcmF0b3IgZnVuY3Rpb24gYXMgdXNpbmcgYXJndW1lbnRzLmxlbmd0aFxuICAgIC8vIGluIHRoZSBtYWluIGZ1bmN0aW9uIHdpbGwgZGVvcHRpbWl6ZSB0aGUsIHNlZSAjMTk5MS5cbiAgICBmdW5jdGlvbiBpdGVyYXRvcihvYmosIGl0ZXJhdGVlLCBtZW1vLCBrZXlzLCBpbmRleCwgbGVuZ3RoKSB7XG4gICAgICBmb3IgKDsgaW5kZXggPj0gMCAmJiBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gZGlyKSB7XG4gICAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRlZShtZW1vLCBvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKGl0ZXJhdGVlLCBjb250ZXh0LCA0KTtcbiAgICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgICAgaW5kZXggPSBkaXIgPiAwID8gMCA6IGxlbmd0aCAtIDE7XG4gICAgICAvLyBEZXRlcm1pbmUgdGhlIGluaXRpYWwgdmFsdWUgaWYgbm9uZSBpcyBwcm92aWRlZC5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICBtZW1vID0gb2JqW2tleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4XTtcbiAgICAgICAgaW5kZXggKz0gZGlyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGtleXMsIGluZGV4LCBsZW5ndGgpO1xuICAgIH07XG4gIH1cblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gY3JlYXRlUmVkdWNlKDEpO1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGNyZWF0ZVJlZHVjZSgtMSk7XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIGtleTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSkge1xuICAgICAga2V5ID0gXy5maW5kSW5kZXgob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBrZXkgPSBfLmZpbmRLZXkob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAoa2V5ICE9PSB2b2lkIDAgJiYga2V5ICE9PSAtMSkgcmV0dXJuIG9ialtrZXldO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5uZWdhdGUoY2IocHJlZGljYXRlKSksIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIGlmICghcHJlZGljYXRlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gaXRlbSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlc2AgYW5kIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZXMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIGl0ZW0sIGZyb21JbmRleCwgZ3VhcmQpIHtcbiAgICBpZiAoIWlzQXJyYXlMaWtlKG9iaikpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgaWYgKHR5cGVvZiBmcm9tSW5kZXggIT0gJ251bWJlcicgfHwgZ3VhcmQpIGZyb21JbmRleCA9IDA7XG4gICAgcmV0dXJuIF8uaW5kZXhPZihvYmosIGl0ZW0sIGZyb21JbmRleCkgPj0gMDtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIGZ1bmMgPSBpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdO1xuICAgICAgcmV0dXJuIGZ1bmMgPT0gbnVsbCA/IGZ1bmMgOiBmdW5jLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXIoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXIoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSAtSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IC1JbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBpc0FycmF5TGlrZShvYmopID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA+IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkID4gbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSAtSW5maW5pdHkgJiYgcmVzdWx0ID09PSAtSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5LFxuICAgICAgICB2YWx1ZSwgY29tcHV0ZWQ7XG4gICAgaWYgKGl0ZXJhdGVlID09IG51bGwgJiYgb2JqICE9IG51bGwpIHtcbiAgICAgIG9iaiA9IGlzQXJyYXlMaWtlKG9iaikgPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IG9ialtpXTtcbiAgICAgICAgaWYgKHZhbHVlIDwgcmVzdWx0KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQgfHwgY29tcHV0ZWQgPT09IEluZmluaXR5ICYmIHJlc3VsdCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBtb2Rlcm4gdmVyc2lvbiBvZiB0aGVcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2V0ID0gaXNBcnJheUxpa2Uob2JqKSA/IG9iaiA6IF8udmFsdWVzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IHNldC5sZW5ndGg7XG4gICAgdmFyIHNodWZmbGVkID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDAsIHJhbmQ7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oMCwgaW5kZXgpO1xuICAgICAgaWYgKHJhbmQgIT09IGluZGV4KSBzaHVmZmxlZFtpbmRleF0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gc2V0W2luZGV4XTtcbiAgICB9XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAoIWlzQXJyYXlMaWtlKG9iaikpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdGVlLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIHZhbHVlLCBrZXkpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgaWYgKF8uaGFzKHJlc3VsdCwga2V5KSkgcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSk7IGVsc2UgcmVzdWx0W2tleV0gPSBbdmFsdWVdO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldKys7IGVsc2UgcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSkgcmV0dXJuIF8ubWFwKG9iaiwgXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIF8udmFsdWVzKG9iaik7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gYW4gb2JqZWN0LlxuICBfLnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAwO1xuICAgIHJldHVybiBpc0FycmF5TGlrZShvYmopID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBTcGxpdCBhIGNvbGxlY3Rpb24gaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIHBhc3MgPSBbXSwgZmFpbCA9IFtdO1xuICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iaikge1xuICAgICAgKHByZWRpY2F0ZSh2YWx1ZSwga2V5LCBvYmopID8gcGFzcyA6IGZhaWwpLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICByZXR1cm4gXy5pbml0aWFsKGFycmF5LCBhcnJheS5sZW5ndGggLSBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIE1hdGgubWF4KDAsIGFycmF5Lmxlbmd0aCAtIChuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbikpKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gXy5yZXN0KGFycmF5LCBNYXRoLm1heCgwLCBhcnJheS5sZW5ndGggLSBuKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBzdHJpY3QsIHN0YXJ0SW5kZXgpIHtcbiAgICB2YXIgb3V0cHV0ID0gW10sIGlkeCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0SW5kZXggfHwgMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGlucHV0KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdmFsdWUgPSBpbnB1dFtpXTtcbiAgICAgIGlmIChpc0FycmF5TGlrZSh2YWx1ZSkgJiYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpKSB7XG4gICAgICAgIC8vZmxhdHRlbiBjdXJyZW50IGxldmVsIG9mIGFycmF5IG9yIGFyZ3VtZW50cyBvYmplY3RcbiAgICAgICAgaWYgKCFzaGFsbG93KSB2YWx1ZSA9IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIHN0cmljdCk7XG4gICAgICAgIHZhciBqID0gMCwgbGVuID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICBvdXRwdXQubGVuZ3RoICs9IGxlbjtcbiAgICAgICAgd2hpbGUgKGogPCBsZW4pIHtcbiAgICAgICAgICBvdXRwdXRbaWR4KytdID0gdmFsdWVbaisrXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghc3RyaWN0KSB7XG4gICAgICAgIG91dHB1dFtpZHgrK10gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIGZhbHNlKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSB2ZXJzaW9uIG9mIHRoZSBhcnJheSB0aGF0IGRvZXMgbm90IGNvbnRhaW4gdGhlIHNwZWNpZmllZCB2YWx1ZShzKS5cbiAgXy53aXRob3V0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGFycmF5LCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKCFfLmlzQm9vbGVhbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRlZTtcbiAgICAgIGl0ZXJhdGVlID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXRlcmF0ZWUgIT0gbnVsbCkgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChhcnJheSk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaV0sXG4gICAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSA/IGl0ZXJhdGVlKHZhbHVlLCBpLCBhcnJheSkgOiB2YWx1ZTtcbiAgICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgICBpZiAoIWkgfHwgc2VlbiAhPT0gY29tcHV0ZWQpIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgc2VlbiA9IGNvbXB1dGVkO1xuICAgICAgfSBlbHNlIGlmIChpdGVyYXRlZSkge1xuICAgICAgICBpZiAoIV8uY29udGFpbnMoc2VlbiwgY29tcHV0ZWQpKSB7XG4gICAgICAgICAgc2Vlbi5wdXNoKGNvbXB1dGVkKTtcbiAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIV8uY29udGFpbnMocmVzdWx0LCB2YWx1ZSkpIHtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoZmxhdHRlbihhcmd1bWVudHMsIHRydWUsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGFyZ3NMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpdGVtID0gYXJyYXlbaV07XG4gICAgICBpZiAoXy5jb250YWlucyhyZXN1bHQsIGl0ZW0pKSBjb250aW51ZTtcbiAgICAgIGZvciAodmFyIGogPSAxOyBqIDwgYXJnc0xlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghXy5jb250YWlucyhhcmd1bWVudHNbal0sIGl0ZW0pKSBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChqID09PSBhcmdzTGVuZ3RoKSByZXN1bHQucHVzaChpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBmbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgdHJ1ZSwgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW56aXAoYXJndW1lbnRzKTtcbiAgfTtcblxuICAvLyBDb21wbGVtZW50IG9mIF8uemlwLiBVbnppcCBhY2NlcHRzIGFuIGFycmF5IG9mIGFycmF5cyBhbmQgZ3JvdXBzXG4gIC8vIGVhY2ggYXJyYXkncyBlbGVtZW50cyBvbiBzaGFyZWQgaW5kaWNlc1xuICBfLnVuemlwID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgbGVuZ3RoID0gYXJyYXkgJiYgXy5tYXgoYXJyYXksIGdldExlbmd0aCkubGVuZ3RoIHx8IDA7XG4gICAgdmFyIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICByZXN1bHRbaW5kZXhdID0gXy5wbHVjayhhcnJheSwgaW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChsaXN0KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gR2VuZXJhdG9yIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgZmluZEluZGV4IGFuZCBmaW5kTGFzdEluZGV4IGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBjcmVhdGVQcmVkaWNhdGVJbmRleEZpbmRlcihkaXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyYXksIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICAgIHZhciBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpO1xuICAgICAgdmFyIGluZGV4ID0gZGlyID4gMCA/IDAgOiBsZW5ndGggLSAxO1xuICAgICAgZm9yICg7IGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IGRpcikge1xuICAgICAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkgcmV0dXJuIGluZGV4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG4gIH1cblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBpbmRleCBvbiBhbiBhcnJheS1saWtlIHRoYXQgcGFzc2VzIGEgcHJlZGljYXRlIHRlc3RcbiAgXy5maW5kSW5kZXggPSBjcmVhdGVQcmVkaWNhdGVJbmRleEZpbmRlcigxKTtcbiAgXy5maW5kTGFzdEluZGV4ID0gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoLTEpO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0LCAxKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRlZShvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IE1hdGguZmxvb3IoKGxvdyArIGhpZ2gpIC8gMik7XG4gICAgICBpZiAoaXRlcmF0ZWUoYXJyYXlbbWlkXSkgPCB2YWx1ZSkgbG93ID0gbWlkICsgMTsgZWxzZSBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIEdlbmVyYXRvciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4T2YgYW5kIGxhc3RJbmRleE9mIGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBjcmVhdGVJbmRleEZpbmRlcihkaXIsIHByZWRpY2F0ZUZpbmQsIHNvcnRlZEluZGV4KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpZHgpIHtcbiAgICAgIHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICAgIGlmICh0eXBlb2YgaWR4ID09ICdudW1iZXInKSB7XG4gICAgICAgIGlmIChkaXIgPiAwKSB7XG4gICAgICAgICAgICBpID0gaWR4ID49IDAgPyBpZHggOiBNYXRoLm1heChpZHggKyBsZW5ndGgsIGkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGVuZ3RoID0gaWR4ID49IDAgPyBNYXRoLm1pbihpZHggKyAxLCBsZW5ndGgpIDogaWR4ICsgbGVuZ3RoICsgMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzb3J0ZWRJbmRleCAmJiBpZHggJiYgbGVuZ3RoKSB7XG4gICAgICAgIGlkeCA9IHNvcnRlZEluZGV4KGFycmF5LCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFycmF5W2lkeF0gPT09IGl0ZW0gPyBpZHggOiAtMTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtICE9PSBpdGVtKSB7XG4gICAgICAgIGlkeCA9IHByZWRpY2F0ZUZpbmQoc2xpY2UuY2FsbChhcnJheSwgaSwgbGVuZ3RoKSwgXy5pc05hTik7XG4gICAgICAgIHJldHVybiBpZHggPj0gMCA/IGlkeCArIGkgOiAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAoaWR4ID0gZGlyID4gMCA/IGkgOiBsZW5ndGggLSAxOyBpZHggPj0gMCAmJiBpZHggPCBsZW5ndGg7IGlkeCArPSBkaXIpIHtcbiAgICAgICAgaWYgKGFycmF5W2lkeF0gPT09IGl0ZW0pIHJldHVybiBpZHg7XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW4gaXRlbSBpbiBhbiBhcnJheSxcbiAgLy8gb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKDEsIF8uZmluZEluZGV4LCBfLnNvcnRlZEluZGV4KTtcbiAgXy5sYXN0SW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKC0xLCBfLmZpbmRMYXN0SW5kZXgpO1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKHN0b3AgPT0gbnVsbCkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBzdGVwIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciByYW5nZSA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBsZW5ndGg7IGlkeCsrLCBzdGFydCArPSBzdGVwKSB7XG4gICAgICByYW5nZVtpZHhdID0gc3RhcnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIHRvIGV4ZWN1dGUgYSBmdW5jdGlvbiBhcyBhIGNvbnN0cnVjdG9yXG4gIC8vIG9yIGEgbm9ybWFsIGZ1bmN0aW9uIHdpdGggdGhlIHByb3ZpZGVkIGFyZ3VtZW50c1xuICB2YXIgZXhlY3V0ZUJvdW5kID0gZnVuY3Rpb24oc291cmNlRnVuYywgYm91bmRGdW5jLCBjb250ZXh0LCBjYWxsaW5nQ29udGV4dCwgYXJncykge1xuICAgIGlmICghKGNhbGxpbmdDb250ZXh0IGluc3RhbmNlb2YgYm91bmRGdW5jKSkgcmV0dXJuIHNvdXJjZUZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgdmFyIHNlbGYgPSBiYXNlQ3JlYXRlKHNvdXJjZUZ1bmMucHJvdG90eXBlKTtcbiAgICB2YXIgcmVzdWx0ID0gc291cmNlRnVuYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICBpZiAoXy5pc09iamVjdChyZXN1bHQpKSByZXR1cm4gcmVzdWx0O1xuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQmluZCBtdXN0IGJlIGNhbGxlZCBvbiBhIGZ1bmN0aW9uJyk7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCBjb250ZXh0LCB0aGlzLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDAsIGxlbmd0aCA9IGJvdW5kQXJncy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IEFycmF5KGxlbmd0aCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFyZ3NbaV0gPSBib3VuZEFyZ3NbaV0gPT09IF8gPyBhcmd1bWVudHNbcG9zaXRpb24rK10gOiBib3VuZEFyZ3NbaV07XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9zaXRpb24gPCBhcmd1bWVudHMubGVuZ3RoKSBhcmdzLnB1c2goYXJndW1lbnRzW3Bvc2l0aW9uKytdKTtcbiAgICAgIHJldHVybiBleGVjdXRlQm91bmQoZnVuYywgYm91bmQsIHRoaXMsIHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gICAgcmV0dXJuIGJvdW5kO1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaSwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCwga2V5O1xuICAgIGlmIChsZW5ndGggPD0gMSkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBhcmd1bWVudHNbaV07XG4gICAgICBvYmpba2V5XSA9IF8uYmluZChvYmpba2V5XSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtb2l6ZSA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGNhY2hlID0gbWVtb2l6ZS5jYWNoZTtcbiAgICAgIHZhciBhZGRyZXNzID0gJycgKyAoaGFzaGVyID8gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBrZXkpO1xuICAgICAgaWYgKCFfLmhhcyhjYWNoZSwgYWRkcmVzcykpIGNhY2hlW2FkZHJlc3NdID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGNhY2hlW2FkZHJlc3NdO1xuICAgIH07XG4gICAgbWVtb2l6ZS5jYWNoZSA9IHt9O1xuICAgIHJldHVybiBtZW1vaXplO1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IF8ucGFydGlhbChfLmRlbGF5LCBfLCAxKTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gXy5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xuICAgICAgICBpZiAodGltZW91dCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuXG4gICAgICBpZiAobGFzdCA8IHdhaXQgJiYgbGFzdCA+PSAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IF8ubm93KCk7XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIG5lZ2F0ZWQgdmVyc2lvbiBvZiB0aGUgcGFzc2VkLWluIHByZWRpY2F0ZS5cbiAgXy5uZWdhdGUgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgdmFyIHN0YXJ0ID0gYXJncy5sZW5ndGggLSAxO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpID0gc3RhcnQ7XG4gICAgICB2YXIgcmVzdWx0ID0gYXJnc1tzdGFydF0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHdoaWxlIChpLS0pIHJlc3VsdCA9IGFyZ3NbaV0uY2FsbCh0aGlzLCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBvbiBhbmQgYWZ0ZXIgdGhlIE50aCBjYWxsLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCB1cCB0byAoYnV0IG5vdCBpbmNsdWRpbmcpIHRoZSBOdGggY2FsbC5cbiAgXy5iZWZvcmUgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHZhciBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzID4gMCkge1xuICAgICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgICAgaWYgKHRpbWVzIDw9IDEpIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gXy5wYXJ0aWFsKF8uYmVmb3JlLCAyKTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBLZXlzIGluIElFIDwgOSB0aGF0IHdvbid0IGJlIGl0ZXJhdGVkIGJ5IGBmb3Iga2V5IGluIC4uLmAgYW5kIHRodXMgbWlzc2VkLlxuICB2YXIgaGFzRW51bUJ1ZyA9ICF7dG9TdHJpbmc6IG51bGx9LnByb3BlcnR5SXNFbnVtZXJhYmxlKCd0b1N0cmluZycpO1xuICB2YXIgbm9uRW51bWVyYWJsZVByb3BzID0gWyd2YWx1ZU9mJywgJ2lzUHJvdG90eXBlT2YnLCAndG9TdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICdwcm9wZXJ0eUlzRW51bWVyYWJsZScsICdoYXNPd25Qcm9wZXJ0eScsICd0b0xvY2FsZVN0cmluZyddO1xuXG4gIGZ1bmN0aW9uIGNvbGxlY3ROb25FbnVtUHJvcHMob2JqLCBrZXlzKSB7XG4gICAgdmFyIG5vbkVudW1JZHggPSBub25FbnVtZXJhYmxlUHJvcHMubGVuZ3RoO1xuICAgIHZhciBjb25zdHJ1Y3RvciA9IG9iai5jb25zdHJ1Y3RvcjtcbiAgICB2YXIgcHJvdG8gPSAoXy5pc0Z1bmN0aW9uKGNvbnN0cnVjdG9yKSAmJiBjb25zdHJ1Y3Rvci5wcm90b3R5cGUpIHx8IE9ialByb3RvO1xuXG4gICAgLy8gQ29uc3RydWN0b3IgaXMgYSBzcGVjaWFsIGNhc2UuXG4gICAgdmFyIHByb3AgPSAnY29uc3RydWN0b3InO1xuICAgIGlmIChfLmhhcyhvYmosIHByb3ApICYmICFfLmNvbnRhaW5zKGtleXMsIHByb3ApKSBrZXlzLnB1c2gocHJvcCk7XG5cbiAgICB3aGlsZSAobm9uRW51bUlkeC0tKSB7XG4gICAgICBwcm9wID0gbm9uRW51bWVyYWJsZVByb3BzW25vbkVudW1JZHhdO1xuICAgICAgaWYgKHByb3AgaW4gb2JqICYmIG9ialtwcm9wXSAhPT0gcHJvdG9bcHJvcF0gJiYgIV8uY29udGFpbnMoa2V5cywgcHJvcCkpIHtcbiAgICAgICAga2V5cy5wdXNoKHByb3ApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJldHJpZXZlIHRoZSBuYW1lcyBvZiBhbiBvYmplY3QncyBvd24gcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgLy8gQWhlbSwgSUUgPCA5LlxuICAgIGlmIChoYXNFbnVtQnVnKSBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgYWxsIHRoZSBwcm9wZXJ0eSBuYW1lcyBvZiBhbiBvYmplY3QuXG4gIF8uYWxsS2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgICAvLyBBaGVtLCBJRSA8IDkuXG4gICAgaWYgKGhhc0VudW1CdWcpIGNvbGxlY3ROb25FbnVtUHJvcHMob2JqLCBrZXlzKTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudCBvZiB0aGUgb2JqZWN0XG4gIC8vIEluIGNvbnRyYXN0IHRvIF8ubWFwIGl0IHJldHVybnMgYW4gb2JqZWN0XG4gIF8ubWFwT2JqZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIF8ua2V5cyhvYmopLFxuICAgICAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoLFxuICAgICAgICAgIHJlc3VsdHMgPSB7fSxcbiAgICAgICAgICBjdXJyZW50S2V5O1xuICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5c1tpbmRleF07XG4gICAgICAgIHJlc3VsdHNbY3VycmVudEtleV0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGNyZWF0ZUFzc2lnbmVyKF8uYWxsS2V5cyk7XG5cbiAgLy8gQXNzaWducyBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgb3duIHByb3BlcnRpZXMgaW4gdGhlIHBhc3NlZC1pbiBvYmplY3QocylcbiAgLy8gKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9hc3NpZ24pXG4gIF8uZXh0ZW5kT3duID0gXy5hc3NpZ24gPSBjcmVhdGVBc3NpZ25lcihfLmtleXMpO1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGtleSBvbiBhbiBvYmplY3QgdGhhdCBwYXNzZXMgYSBwcmVkaWNhdGUgdGVzdFxuICBfLmZpbmRLZXkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKSwga2V5O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZShvYmpba2V5XSwga2V5LCBvYmopKSByZXR1cm4ga2V5O1xuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmplY3QsIG9pdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSB7fSwgb2JqID0gb2JqZWN0LCBpdGVyYXRlZSwga2V5cztcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihvaXRlcmF0ZWUpKSB7XG4gICAgICBrZXlzID0gXy5hbGxLZXlzKG9iaik7XG4gICAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2Iob2l0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5cyA9IGZsYXR0ZW4oYXJndW1lbnRzLCBmYWxzZSwgZmFsc2UsIDEpO1xuICAgICAgaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmopIHsgcmV0dXJuIGtleSBpbiBvYmo7IH07XG4gICAgICBvYmogPSBPYmplY3Qob2JqKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgdmFyIHZhbHVlID0gb2JqW2tleV07XG4gICAgICBpZiAoaXRlcmF0ZWUodmFsdWUsIGtleSwgb2JqKSkgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IHdpdGhvdXQgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ub21pdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGl0ZXJhdGVlKSkge1xuICAgICAgaXRlcmF0ZWUgPSBfLm5lZ2F0ZShpdGVyYXRlZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5tYXAoZmxhdHRlbihhcmd1bWVudHMsIGZhbHNlLCBmYWxzZSwgMSksIFN0cmluZyk7XG4gICAgICBpdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKGtleXMsIGtleSk7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gXy5waWNrKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBjcmVhdGVBc3NpZ25lcihfLmFsbEtleXMsIHRydWUpO1xuXG4gIC8vIENyZWF0ZXMgYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGUgZ2l2ZW4gcHJvdG90eXBlIG9iamVjdC5cbiAgLy8gSWYgYWRkaXRpb25hbCBwcm9wZXJ0aWVzIGFyZSBwcm92aWRlZCB0aGVuIHRoZXkgd2lsbCBiZSBhZGRlZCB0byB0aGVcbiAgLy8gY3JlYXRlZCBvYmplY3QuXG4gIF8uY3JlYXRlID0gZnVuY3Rpb24ocHJvdG90eXBlLCBwcm9wcykge1xuICAgIHZhciByZXN1bHQgPSBiYXNlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgaWYgKHByb3BzKSBfLmV4dGVuZE93bihyZXN1bHQsIHByb3BzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIChzaGFsbG93LWNsb25lZCkgZHVwbGljYXRlIG9mIGFuIG9iamVjdC5cbiAgXy5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiBfLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogXy5leHRlbmQoe30sIG9iaik7XG4gIH07XG5cbiAgLy8gSW52b2tlcyBpbnRlcmNlcHRvciB3aXRoIHRoZSBvYmosIGFuZCB0aGVuIHJldHVybnMgb2JqLlxuICAvLyBUaGUgcHJpbWFyeSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiwgaW5cbiAgLy8gb3JkZXIgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGludGVybWVkaWF0ZSByZXN1bHRzIHdpdGhpbiB0aGUgY2hhaW4uXG4gIF8udGFwID0gZnVuY3Rpb24ob2JqLCBpbnRlcmNlcHRvcikge1xuICAgIGludGVyY2VwdG9yKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHdoZXRoZXIgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHNldCBvZiBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5pc01hdGNoID0gZnVuY3Rpb24ob2JqZWN0LCBhdHRycykge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKGF0dHJzKSwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gIWxlbmd0aDtcbiAgICB2YXIgb2JqID0gT2JqZWN0KG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICBpZiAoYXR0cnNba2V5XSAhPT0gb2JqW2tleV0gfHwgIShrZXkgaW4gb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PT0gMSAvIGI7XG4gICAgLy8gQSBzdHJpY3QgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkgYmVjYXVzZSBgbnVsbCA9PSB1bmRlZmluZWRgLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gYSA9PT0gYjtcbiAgICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgICBpZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAgIGlmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gICAgLy8gQ29tcGFyZSBgW1tDbGFzc11dYCBuYW1lcy5cbiAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbChhKTtcbiAgICBpZiAoY2xhc3NOYW1lICE9PSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIHJlZ3VsYXIgZXhwcmVzc2lvbnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvZXJjZWQgdG8gc3RyaW5ncyBmb3IgY29tcGFyaXNvbiAoTm90ZTogJycgKyAvYS9pID09PSAnL2EvaScpXG4gICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgICAvLyBQcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCB3cmFwcGVycyBhcmUgZXF1aXZhbGVudDsgdGh1cywgYFwiNVwiYCBpc1xuICAgICAgICAvLyBlcXVpdmFsZW50IHRvIGBuZXcgU3RyaW5nKFwiNVwiKWAuXG4gICAgICAgIHJldHVybiAnJyArIGEgPT09ICcnICsgYjtcbiAgICAgIGNhc2UgJ1tvYmplY3QgTnVtYmVyXSc6XG4gICAgICAgIC8vIGBOYU5gcyBhcmUgZXF1aXZhbGVudCwgYnV0IG5vbi1yZWZsZXhpdmUuXG4gICAgICAgIC8vIE9iamVjdChOYU4pIGlzIGVxdWl2YWxlbnQgdG8gTmFOXG4gICAgICAgIGlmICgrYSAhPT0gK2EpIHJldHVybiArYiAhPT0gK2I7XG4gICAgICAgIC8vIEFuIGBlZ2FsYCBjb21wYXJpc29uIGlzIHBlcmZvcm1lZCBmb3Igb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICAgIHJldHVybiArYSA9PT0gMCA/IDEgLyArYSA9PT0gMSAvIGIgOiArYSA9PT0gK2I7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT09ICtiO1xuICAgIH1cblxuICAgIHZhciBhcmVBcnJheXMgPSBjbGFzc05hbWUgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgaWYgKCFhcmVBcnJheXMpIHtcbiAgICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHMgb3IgYEFycmF5YHNcbiAgICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgICB2YXIgYUN0b3IgPSBhLmNvbnN0cnVjdG9yLCBiQ3RvciA9IGIuY29uc3RydWN0b3I7XG4gICAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiBhQ3RvciBpbnN0YW5jZW9mIGFDdG9yICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiBiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2NvbnN0cnVjdG9yJyBpbiBhICYmICdjb25zdHJ1Y3RvcicgaW4gYikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gICAgLy8gc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMywgYWJzdHJhY3Qgb3BlcmF0aW9uIGBKT2AuXG5cbiAgICAvLyBJbml0aWFsaXppbmcgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgLy8gSXQncyBkb25lIGhlcmUgc2luY2Ugd2Ugb25seSBuZWVkIHRoZW0gZm9yIG9iamVjdHMgYW5kIGFycmF5cyBjb21wYXJpc29uLlxuICAgIGFTdGFjayA9IGFTdGFjayB8fCBbXTtcbiAgICBiU3RhY2sgPSBiU3RhY2sgfHwgW107XG4gICAgdmFyIGxlbmd0aCA9IGFTdGFjay5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAvLyBMaW5lYXIgc2VhcmNoLiBQZXJmb3JtYW5jZSBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2ZcbiAgICAgIC8vIHVuaXF1ZSBuZXN0ZWQgc3RydWN0dXJlcy5cbiAgICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09PSBiO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcblxuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChhcmVBcnJheXMpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgbGVuZ3RoID0gYS5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICBpZiAoIWVxKGFbbGVuZ3RoXSwgYltsZW5ndGhdLCBhU3RhY2ssIGJTdGFjaykpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhhKSwga2V5O1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcyBiZWZvcmUgY29tcGFyaW5nIGRlZXAgZXF1YWxpdHkuXG4gICAgICBpZiAoXy5rZXlzKGIpLmxlbmd0aCAhPT0gbGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyXG4gICAgICAgIGtleSA9IGtleXNbbGVuZ3RoXTtcbiAgICAgICAgaWYgKCEoXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopICYmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikgfHwgXy5pc0FyZ3VtZW50cyhvYmopKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgcmV0dXJuIF8ua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIG9iajtcbiAgICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09PSAnb2JqZWN0JyAmJiAhIW9iajtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cCwgaXNFcnJvci5cbiAgXy5lYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnLCAnRXJyb3InXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFIDwgOSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIF8uaGFzKG9iaiwgJ2NhbGxlZScpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuIFdvcmsgYXJvdW5kIHNvbWUgdHlwZW9mIGJ1Z3MgaW4gb2xkIHY4LFxuICAvLyBJRSAxMSAoIzE2MjEpLCBhbmQgaW4gU2FmYXJpIDggKCMxOTI5KS5cbiAgaWYgKHR5cGVvZiAvLi8gIT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgSW50OEFycmF5ICE9ICdvYmplY3QnKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIG9iaiAhPSBudWxsICYmIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0ZWVzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLy8gUHJlZGljYXRlLWdlbmVyYXRpbmcgZnVuY3Rpb25zLiBPZnRlbiB1c2VmdWwgb3V0c2lkZSBvZiBVbmRlcnNjb3JlLlxuICBfLmNvbnN0YW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLm5vb3AgPSBmdW5jdGlvbigpe307XG5cbiAgXy5wcm9wZXJ0eSA9IHByb3BlcnR5O1xuXG4gIC8vIEdlbmVyYXRlcyBhIGZ1bmN0aW9uIGZvciBhIGdpdmVuIG9iamVjdCB0aGF0IHJldHVybnMgYSBnaXZlbiBwcm9wZXJ0eS5cbiAgXy5wcm9wZXJ0eU9mID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PSBudWxsID8gZnVuY3Rpb24oKXt9IDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2ZcbiAgLy8gYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlciA9IF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBfLmV4dGVuZE93bih7fSwgYXR0cnMpO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmlzTWF0Y2gob2JqLCBhdHRycyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0ZWUoaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlc2NhcGVNYXAgPSB7XG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiN4Mjc7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG4gIH07XG4gIHZhciB1bmVzY2FwZU1hcCA9IF8uaW52ZXJ0KGVzY2FwZU1hcCk7XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICB2YXIgY3JlYXRlRXNjYXBlciA9IGZ1bmN0aW9uKG1hcCkge1xuICAgIHZhciBlc2NhcGVyID0gZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG4gICAgLy8gUmVnZXhlcyBmb3IgaWRlbnRpZnlpbmcgYSBrZXkgdGhhdCBuZWVkcyB0byBiZSBlc2NhcGVkXG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsgXy5rZXlzKG1hcCkuam9pbignfCcpICsgJyknO1xuICAgIHZhciB0ZXN0UmVnZXhwID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgdmFyIHJlcGxhY2VSZWdleHAgPSBSZWdFeHAoc291cmNlLCAnZycpO1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgIHJldHVybiB0ZXN0UmVnZXhwLnRlc3Qoc3RyaW5nKSA/IHN0cmluZy5yZXBsYWNlKHJlcGxhY2VSZWdleHAsIGVzY2FwZXIpIDogc3RyaW5nO1xuICAgIH07XG4gIH07XG4gIF8uZXNjYXBlID0gY3JlYXRlRXNjYXBlcihlc2NhcGVNYXApO1xuICBfLnVuZXNjYXBlID0gY3JlYXRlRXNjYXBlcih1bmVzY2FwZU1hcCk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSwgZmFsbGJhY2spIHtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3QgPT0gbnVsbCA/IHZvaWQgMCA6IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgaWYgKHZhbHVlID09PSB2b2lkIDApIHtcbiAgICAgIHZhbHVlID0gZmFsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHUyMDI4fFxcdTIwMjkvZztcblxuICB2YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdO1xuICB9O1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIC8vIE5COiBgb2xkU2V0dGluZ3NgIG9ubHkgZXhpc3RzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIHNldHRpbmdzLCBvbGRTZXR0aW5ncykge1xuICAgIGlmICghc2V0dGluZ3MgJiYgb2xkU2V0dGluZ3MpIHNldHRpbmdzID0gb2xkU2V0dGluZ3M7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KS5yZXBsYWNlKGVzY2FwZXIsIGVzY2FwZUNoYXIpO1xuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH0gZWxzZSBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkb2JlIFZNcyBuZWVkIHRoZSBtYXRjaCByZXR1cm5lZCB0byBwcm9kdWNlIHRoZSBjb3JyZWN0IG9mZmVzdC5cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArICdyZXR1cm4gX19wO1xcbic7XG5cbiAgICB0cnkge1xuICAgICAgdmFyIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB2YXIgYXJndW1lbnQgPSBzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJztcbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIGFyZ3VtZW50ICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24uIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBpbnN0YW5jZSA9IF8ob2JqKTtcbiAgICBpbnN0YW5jZS5fY2hhaW4gPSB0cnVlO1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24oaW5zdGFuY2UsIG9iaikge1xuICAgIHJldHVybiBpbnN0YW5jZS5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBfLmVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PT0gJ3NoaWZ0JyB8fCBuYW1lID09PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgXy5lYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0KHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgXy5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgfTtcblxuICAvLyBQcm92aWRlIHVud3JhcHBpbmcgcHJveHkgZm9yIHNvbWUgbWV0aG9kcyB1c2VkIGluIGVuZ2luZSBvcGVyYXRpb25zXG4gIC8vIHN1Y2ggYXMgYXJpdGhtZXRpYyBhbmQgSlNPTiBzdHJpbmdpZmljYXRpb24uXG4gIF8ucHJvdG90eXBlLnZhbHVlT2YgPSBfLnByb3RvdHlwZS50b0pTT04gPSBfLnByb3RvdHlwZS52YWx1ZTtcblxuICBfLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnJyArIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gQU1EIHJlZ2lzdHJhdGlvbiBoYXBwZW5zIGF0IHRoZSBlbmQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQgbG9hZGVyc1xuICAvLyB0aGF0IG1heSBub3QgZW5mb3JjZSBuZXh0LXR1cm4gc2VtYW50aWNzIG9uIG1vZHVsZXMuIEV2ZW4gdGhvdWdoIGdlbmVyYWxcbiAgLy8gcHJhY3RpY2UgZm9yIEFNRCByZWdpc3RyYXRpb24gaXMgdG8gYmUgYW5vbnltb3VzLCB1bmRlcnNjb3JlIHJlZ2lzdGVyc1xuICAvLyBhcyBhIG5hbWVkIG1vZHVsZSBiZWNhdXNlLCBsaWtlIGpRdWVyeSwgaXQgaXMgYSBiYXNlIGxpYnJhcnkgdGhhdCBpc1xuICAvLyBwb3B1bGFyIGVub3VnaCB0byBiZSBidW5kbGVkIGluIGEgdGhpcmQgcGFydHkgbGliLCBidXQgbm90IGJlIHBhcnQgb2ZcbiAgLy8gYW4gQU1EIGxvYWQgcmVxdWVzdC4gVGhvc2UgY2FzZXMgY291bGQgZ2VuZXJhdGUgYW4gZXJyb3Igd2hlbiBhblxuICAvLyBhbm9ueW1vdXMgZGVmaW5lKCkgaXMgY2FsbGVkIG91dHNpZGUgb2YgYSBsb2FkZXIgcmVxdWVzdC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59LmNhbGwodGhpcykpO1xuIiwiLyoqXG4gKiByZXR1cm4gd2hhdGV2ZXIgZ2V0cyBwYXNzZWQgaW4uIGNhbiBiZSB1c2VmdWwgaW4gYSBmaWx0ZXIgZnVuY3Rpb24gd2hlcmVcbiAqIHRydXRoeSB2YWx1ZXMgYXJlIHRoZSBvbmx5IHZhbGlkIG9uZXNcbiAqIEBwYXJhbSAge2FueX0gYXJnIGFueSB2YWx1ZVxuICogQHJldHVybiB7YW55fSAgICAgd2hhdGV2ZXIgd2FzIHBhc3NlZCBpblxuICovXG5mdW5jdGlvbiBpZGVudGl0eShhcmcpIHtcbiAgICByZXR1cm4gYXJnO1xufVxuXG4vKipcbiAqIG1vdmUgYW4gYXJyYXkgaW5kZXggdG8gdGhlICdib3JkZXInIHBhc3NlZCBpbi4gdGhlIGJvcmRlcnMgYXJlIG5vdCBhcnJheVxuICogaW5kZXhlcywgdGhleSBhcmUgdGhlIG51bWJlcnMgaW4gdGhlIGZvbGxvd2luZyBkaWFncmFtOlxuICpcbiAqIHwwfF9fX192YWxfX19ffDF8X19fX192YWxfX19fX3wyfF9fX19fdmFsX19fX3wzfCBldGNcbiAqXG4gKiAqKiBBbGwgY29sdW1uIHZhbHVlcyBhcmUgYXNzdW1lZCB0byBiZSB0cnV0aHkgKG9iamVjdHMgaW4gbWluZC4uLikgKipcbiAqXG4gKiBAcGFyYW0gIHthcnJheX0gYXJyICAgICAgYXJyYXkgdG8gcmVvcmRlciwgbm90IG11dGF0ZWRcbiAqIEBwYXJhbSAge251bWJlcn0gZnJvbSAgICAgbm9ybWFsIGluZGV4IG9mIGNvbHVtbiB0byBtb3ZlXG4gKiBAcGFyYW0gIHtudW1iZXJ9IHRvQm9yZGVyIGJvcmRlciBpbmRleFxuICogQHJldHVybiB7YXJyYXl9ICAgICAgICAgIG5ldyBhcnJheSBpbiBuZXcgb3JkZXJcbiAqL1xuZnVuY3Rpb24gbW92ZUlkeChhcnIsIGZyb20sIHRvQm9yZGVyKSB7XG4gICAgdmFyIHJlb3JkZXJkID0gYXJyLnNsaWNlKCksXG4gICAgICAgIG1vdmVyID0gcmVvcmRlcmQuc3BsaWNlKGZyb20sIDEsIHVuZGVmaW5lZClbMF07XG5cbiAgICByZW9yZGVyZC5zcGxpY2UodG9Cb3JkZXIsIDEsIG1vdmVyLCByZW9yZGVyZFt0b0JvcmRlcl0pO1xuXG4gICAgcmV0dXJuIHJlb3JkZXJkLmZpbHRlcihpZGVudGl0eSk7XG59XG5cbi8qXG4gKiBkZXRlY3Qgd2hpY2ggY29sdW1uIGlzIG5lYXJlc3QgdG8gYSBtb3VzZSBldmVudFxuICogQHBhcmFtICB7R3JpZH0gICBncmlkIHRoZSBoeXBlcmdyaWQtbGl0ZSBvYmplY3RcbiAqIEBwYXJhbSAge0V2ZW50fSAgZXZ0ICB0aGUgbW91c2UgZXZlbnQgdG8gbG9vayBuZWFyXG4gKiBAcmV0dXJuIHtvYmplY3R9ICAgICAgb2JqZWN0IHdpdGggbmVhcmVzdCBjb2x1bW4sIGl0cyBkaW1lbnNpb25zIGFuZCBpbmRleFxuICovXG5mdW5jdGlvbiBkZXRlY3ROZWFyZXN0Q29sdW1uKGdyaWQsIGV2dCkge1xuICAgIHZhciBjb2x1bW47XG4gICAgdmFyIGNvbHVtbnMgPSBncmlkLmdldENvbHVtbnMoKTtcbiAgICB2YXIgaGVhZGVyQ2FudmFzID0gZ3JpZC5nZXRIZWFkZXJDYW52YXMoKTtcbiAgICB2YXIgcmVuZGVyZWRSYW5nZSA9IGdyaWQuZ2V0UmVuZGVyZWRSb3dSYW5nZSgpO1xuICAgIHZhciBoZWFkZXJSZWN0ID0gZ2V0T2Zmc2V0UmVjdChoZWFkZXJDYW52YXMpO1xuICAgIHZhciBjb2x1bW5MZWZ0ID0gaGVhZGVyUmVjdC5sZWZ0O1xuICAgIHZhciBjb2x1bW5SaWdodCA9IGhlYWRlclJlY3QubGVmdDtcbiAgICB2YXIgaW5kZXhPZk5lYXJlc3RDb2x1bW4gPSBjb2x1bW5zLmxlbmd0aCAtIDE7XG5cbiAgICBmb3IodmFyIGMgPSByZW5kZXJlZFJhbmdlLmxlZnQ7IGMgPCBjb2x1bW5zLmxlbmd0aDsgYysrKSB7XG4gICAgICAgIGNvbHVtbiA9IGNvbHVtbnNbY107XG4gICAgICAgIGNvbHVtbkxlZnQgPSBjb2x1bW5SaWdodDtcbiAgICAgICAgY29sdW1uUmlnaHQgKz0gY29sdW1uLmdldFdpZHRoKCk7XG4gICAgICAgIC8vIE5vdGU6IHdoZW4gbm8gY29sdW1uIG1hdGNoZXMgdGhpcyBjb25kaXRpb24sXG4gICAgICAgIC8vIGBpbmRleE9mTmVhcmVzdENvbHVtbmAgd2lsbCBiZSB0aGUgbGFzdCBjb2x1bW4uXG4gICAgICAgIGlmKGV2dC5wYWdlWCA8IGNvbHVtblJpZ2h0KSB7XG4gICAgICAgICAgICBpbmRleE9mTmVhcmVzdENvbHVtbiA9IGM7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGNvbHVtbjogY29sdW1uLFxuICAgICAgICBjb2x1bW5MZWZ0OiBjb2x1bW5MZWZ0LFxuICAgICAgICBjb2x1bW5SaWdodDogY29sdW1uUmlnaHQsXG4gICAgICAgIGluZGV4OiBpbmRleE9mTmVhcmVzdENvbHVtblxuICAgIH1cbn1cblxuLypcbiAqIGRldGVjdCBpZiBhIG1vdXNlIGV2ZW50IGlzIGluIGEgY29sdW1uJ3MgcmVzaXplIGFyZWFcbiAqIEBwYXJhbSAge0dyaWR9ICAgZ3JpZCB0aGUgaHlwZXJncmlkLWxpdGUgb2JqZWN0XG4gKiBAcGFyYW0gIHtFdmVudH0gIGV2dCAgdGhlIG1vdXNlIGV2ZW50IHRvIGxvb2sgbmVhclxuICogQHJldHVybiB7Q29sdW1ufSAgICAgIHRoZSBjb2x1bW4gd2hvc2UgcmVzaXplIGFyZWEgdGhlIG1vdXNlIGlzIGluLCBvciBudWxsXG4gKi9cbmZ1bmN0aW9uIGRldGVjdFJlc2l6aW5nQXJlYUNvbHVtbihncmlkLCBldnQpIHtcbiAgICAvLyBgdGhyZXNob2xkYCBkZXRlcm1pbmVzIHRoZSBzaXplIG9mIHRoZSByZXNpemUgYXJlYS5cbiAgICAvLyBDbGlja2luZyBpbiB0aGlzIGFyZWEgdHJpZ2dlcnMgYSByZXNpemUuXG4gICAgdmFyIHRocmVzaG9sZCA9IDU7XG4gICAgdmFyIG5lYXJlc3QgPSBkZXRlY3ROZWFyZXN0Q29sdW1uKGdyaWQsIGV2dCk7XG5cbiAgICBkcmFnU3RhcnRYID0gZXZ0LnBhZ2VYO1xuXG4gICAgLy8gRGV0ZWN0IGlmIHdlIGNsaWNrZWQgbmVhciB0aGUgbGVmdCBvciByaWdodCBib3JkZXIgb2YgYSBoZWFkZXIgY2VsbFxuICAgIGlmKE1hdGguYWJzKGV2dC5wYWdlWCAtIG5lYXJlc3QuY29sdW1uTGVmdCkgPD0gdGhyZXNob2xkKSB7XG4gICAgICAgIC8vIFRoZSB1c2VyIGNsaWNrZWQgbmVhciB0aGUgbGVmdCBib3JkZXIuXG4gICAgICAgIC8vIFJlc2l6ZSB0aGUgcHJldmlvdXMgY29sdW1uLCBvciBlbHNlIHRoZSBmaXJzdCBjb2x1bW4uXG4gICAgICAgIHJldHVybiBncmlkLmdldENvbHVtbnMoKVtNYXRoLm1heChuZWFyZXN0LmluZGV4IC0gMSwgMCldO1xuICAgIH0gZWxzZSBpZihNYXRoLmFicyhldnQucGFnZVggLSBuZWFyZXN0LmNvbHVtblJpZ2h0KSA8PSB0aHJlc2hvbGQpIHtcbiAgICAgICAgLy8gVGhlIHVzZXIgY2xpY2tlZCBuZWFyIHRoZSByaWdodCBib3JkZXIuXG4gICAgICAgIC8vIFJlc2l6ZSB0aGUgY3VycmVudCBjb2x1bW4uXG4gICAgICAgIHJldHVybiBncmlkLmdldENvbHVtbnMoKVtuZWFyZXN0LmluZGV4XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cblxuLypcbiAqIEdldCBlbGVtZW50IGJvdW5kaW5nQ2xpZW50UmVjdCBvZmZzZXQgb2Zmc2V0IGJ5IHBhZ2Ugc2Nyb2xsXG4gKiBAcGFyYW0ge0RPTUVsZW1lbnR9IGVsZW1lbnQgd2hvc2Ugb2Zmc2V0IHJlY3RhbmdsZSB0byBnZXRcbiAqIEByZXR1cm4ge29iamVjdH0gICAgICAgICAgICBvZmZzZXQgYm91bmRpbmcgcmVjdGFuZ2xlXG4gKi9cbmZ1bmN0aW9uIGdldE9mZnNldFJlY3QoZWxlbWVudCkge1xuICAgIHZhciByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0b3A6IHJlY3QudG9wICsgd2luZG93LnBhZ2VZT2Zmc2V0LFxuICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyB3aW5kb3cucGFnZVhPZmZzZXQsXG4gICAgICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gaW5pdChzZWxmLCBkaXZIZWFkZXIpIHtcblxuICAgIC8vIE1vdXNlIGV2ZW50IGNsaWVudFggd2hlcmUgdGhlIGRyYWcgc3RhcnRzLlxuICAgIC8vIFRoaXMgaXMgdXNlZCBpbiBib3RoIHJlc2l6aW5nIGFuZCByZW9yZGVyaW5nLlxuICAgIHZhciBkcmFnU3RhcnRYO1xuXG4gICAgLy8gVGhlc2UgdmFyaWFibGVzIGFyZSB1c2VkIG9ubHkgZHVyaW5nIHJlc2l6aW5nLlxuICAgIHZhciByZXNpemVDb2x1bW47XG4gICAgdmFyIHJlc2l6ZUNvbHVtbkluaXRpYWxXaWR0aDtcblxuICAgIC8vIFRoZXNlIHZhcmlhYmxlcyBhcmUgdXNlZCBvbmx5IGR1cmluZyByZW9yZGVyaW5nLlxuICAgIHZhciByZW9yZGVyaW5nQ29sdW1uO1xuICAgIHZhciByZW9yZGVyaW5nQ29sdW1uTGVmdFN0YXJ0O1xuXG4gICAgLy8gYGRyYWdIZWFkZXJgIGlzIGEgdHJhbnNwYXJlbnQgY29weSBvZiB0aGUgaGVhZGVyIGNlbGwgYmVpbmcgZHJhZ2dlZCxcbiAgICAvLyBkdXJpbmcgYSByZW9yZGVyIG9wZXJhdGlvbi5cbiAgICB2YXIgZHJhZ0hlYWRlcjtcblxuICAgIC8vIFRoaXMgaXMgdXNlZCB0byByZXN0b3JlIHRoZSBzdGF0ZSBvZiB0aGUgY3Vyc29yIG9uIGRvY3VtZW50LmJvZHlcbiAgICAvLyB3aGVuIGEgZHJhZyBvcGVyYXRpb24gZW5kcy5cbiAgICB2YXIgYm9keUN1cnNvckJlZm9yZURyYWc7XG5cbiAgICAvLyBgaW5zZXJ0ZXJgIGlzIGEgeWVsbG93IGJhciBiZXR3ZWVuIHRoYXQgYXBwZWFycyBiZXR3ZWVuIGhlYWRlciBjZWxsc1xuICAgIC8vIHdoZW4geW91IGFyZSByZW9yZGVyaW5nIGNlbGxzLlxuICAgIC8vIEl0IHNob3dzIHlvdSB3aGVyZSB5b3VyIGhlYWRlciBjZWxsIGlzIGdvaW5nIHRvIGdvLlxuICAgIHZhciBpbnNlcnRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGluc2VydGVyLnN0eWxlLmhlaWdodCA9ICcyMHB4JztcbiAgICBpbnNlcnRlci5zdHlsZS53aWR0aCA9ICc1cHgnO1xuICAgIGluc2VydGVyLnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdnb2xkZW5yb2QnO1xuICAgIGluc2VydGVyLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICBpbnNlcnRlci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIGluc2VydGVyLnN0eWxlLnpJbmRleCA9IDEwMDAwO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaW5zZXJ0ZXIpO1xuXG4gICAgLy8gV2Ugc3RhcnQgb3V0IGluIGEgbm9uLWRyYWdnaW5nIHN0YXRlLlxuICAgIC8vIFNvIGxldCdzIGFkZCB0aGUgbm9uLWRyYWdnaW5nIGV2ZW50IGxpc3RlbmVycy5cbiAgICBhdHRhY2hOb25EcmFnZ2luZ0V2ZW50TGlzdGVuZXJzKCk7XG5cbiAgICAvKlxuICAgICAqIEhlbHBlcnMgZm9yIGFkZGluZy9yZW1vdmluZyB0aGUgbm9uLWRyYWdnaW5nIGV2ZW50IGxpc3RlbmVyc1xuICAgICAqL1xuXG4gICAgZnVuY3Rpb24gYXR0YWNoTm9uRHJhZ2dpbmdFdmVudExpc3RlbmVycygpIHtcbiAgICAgICAgLy8gVXBkYXRlIHRoZSBjdXJzb3Igb24gbW91c2UgbW92ZS5cbiAgICAgICAgZGl2SGVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG9uTm9uRHJhZ2dpbmdNb3VzZU1vdmUpO1xuXG4gICAgICAgIC8vIFN0YXJ0IGEgZHJhZyBvcGVyYXRpb24gKHJlc2l6ZSBvciByZW9yZGVyKSBvbiBtb3VzZWRvd24uXG4gICAgICAgIGRpdkhlYWRlci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBvbkRyYWdTdGFydCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlTm9uRHJhZ2dpbmdFdmVudExpc3RlbmVycygpIHtcbiAgICAgICAgLy8gVGhlc2UgZXZlbnQgbGlzdGVuZXJzIGFyZSByZW1vdmVkXG4gICAgICAgIC8vIGF0IHRoZSBzdGFydCBvZiBlYWNoIGRyYWcgb3BlcmF0aW9uIChyZXNpemUgb3IgcmVvcmRlcikuXG4gICAgICAgIGRpdkhlYWRlci5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBvbkRyYWdTdGFydCk7XG4gICAgICAgIGRpdkhlYWRlci5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvbk5vbkRyYWdnaW5nTW91c2VNb3ZlKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIEV2ZW50IGxpc3RlbmVycyBpbiBwbGFjZSB3aGVuIG5vIGRyYWdnaW5nIGlzIGhhcHBlbmluZ1xuICAgICAqL1xuXG4gICAgZnVuY3Rpb24gb25Ob25EcmFnZ2luZ01vdXNlTW92ZShldnQpIHtcbiAgICAgICAgLy8gVXBkYXRlIHRoZSBjdXJzb3IuXG4gICAgICAgIGlmKGRldGVjdFJlc2l6aW5nQXJlYUNvbHVtbihzZWxmLCBldnQpKSB7XG4gICAgICAgICAgICBkaXZIZWFkZXIuc3R5bGUuY3Vyc29yID0gJ2NvbC1yZXNpemUnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGl2SGVhZGVyLnN0eWxlLmN1cnNvciA9ICdtb3ZlJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uRHJhZ1N0YXJ0KGV2dCkge1xuXG4gICAgICAgIC8vIGB0aHJlc2hvbGRgIGlzIHRoZSBhcmVhIGFyb3VuZCB0aGUgbGVmdCBhbmQgcmlnaHQgYm9yZGVyXG4gICAgICAgIC8vIG9mIGVhY2ggaGVhZGVyIGNlbGwuXG4gICAgICAgIC8vIENsaWNraW5nIGluIHRoaXMgYXJlYSB0cmlnZ2VycyBhIHJlc2l6ZS5cbiAgICAgICAgdmFyIHRocmVzaG9sZCA9IDU7XG4gICAgICAgIHZhciBuZWFyZXN0ID0gZGV0ZWN0TmVhcmVzdENvbHVtbihzZWxmLCBldnQpO1xuICAgICAgICB2YXIgcmVzaXppbmdBcmVhQ29sdW1uID0gZGV0ZWN0UmVzaXppbmdBcmVhQ29sdW1uKHNlbGYsIGV2dCk7XG5cbiAgICAgICAgZHJhZ1N0YXJ0WCA9IGV2dC5wYWdlWDtcblxuICAgICAgICBpZihyZXNpemluZ0FyZWFDb2x1bW4pIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGNsaWNrZWQgbmVhciBhIGJvcmRlci5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHJlc2l6aW5nLlxuICAgICAgICAgICAgc3RhcnRSZXNpemUocmVzaXppbmdBcmVhQ29sdW1uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGRpZG4ndCBjbGljayBuZWFyIGFueSBib3JkZXIuXG4gICAgICAgICAgICAvLyBTdGFydCByZW9yZGVyaW5nLlxuICAgICAgICAgICAgc3RhcnRSZW9yZGVyKG5lYXJlc3QuY29sdW1uLCBuZWFyZXN0LmNvbHVtbkxlZnQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBSZXNpemluZyBvcGVyYXRpb25cbiAgICAgKi9cblxuICAgIGZ1bmN0aW9uIHN0YXJ0UmVzaXplKG5lYXJlc3RDb2x1bW4pIHtcbiAgICAgICAgLy8gU2V0IHVwIG91ciBzdGF0ZS5cbiAgICAgICAgcmVzaXplQ29sdW1uID0gbmVhcmVzdENvbHVtbjtcbiAgICAgICAgcmVzaXplQ29sdW1uSW5pdGlhbFdpZHRoID0gcmVzaXplQ29sdW1uLmdldFdpZHRoKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSBjdXJzb3Igc3R5bGUuXG4gICAgICAgIGJvZHlDdXJzb3JCZWZvcmVEcmFnID0gZG9jdW1lbnQuYm9keS5zdHlsZS5jdXJzb3I7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuY3Vyc29yID0gJ2NvbC1yZXNpemUnO1xuXG4gICAgICAgIC8vIFNldCB1cCBldmVudCBsaXN0ZW5lcnMuXG4gICAgICAgIHJlbW92ZU5vbkRyYWdnaW5nRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgb25SZXNpemVEcmFnKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG9uUmVzaXplRHJhZ0VuZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZXNpemVEcmFnKGV2dCkge1xuICAgICAgICAvLyBVcGRhdGUgdGhlIGNvbHVtbiB3aWR0aC5cbiAgICAgICAgdmFyIGNoYW5nZUluWCA9IGV2dC5wYWdlWCAtIGRyYWdTdGFydFg7XG4gICAgICAgIHZhciBuZXdXaWR0aCA9IE1hdGgubWF4KDEwLCByZXNpemVDb2x1bW5Jbml0aWFsV2lkdGggKyBjaGFuZ2VJblgpO1xuICAgICAgICByZXNpemVDb2x1bW4uc2V0V2lkdGgobmV3V2lkdGgpO1xuXG4gICAgICAgIHNlbGYudHJpZ2dlcignY29sdW1uc3Jlc2l6aW5nJyk7XG4gICAgICAgIHNlbGYucGFpbnRBbGwoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvblJlc2l6ZURyYWdFbmQoZXZ0KSB7XG4gICAgICAgIC8vIENsZWFyIG91ciBzdGF0ZS5cbiAgICAgICAgZHJhZ1N0YXJ0WCA9IG51bGw7XG4gICAgICAgIHJlc2l6ZUNvbHVtbiA9IG51bGw7XG4gICAgICAgIHJlc2l6ZUNvbHVtbkluaXRpYWxXaWR0aCA9IG51bGw7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgY3Vyc29yIHN0eWxlLlxuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmN1cnNvciA9IGJvZHlDdXJzb3JCZWZvcmVEcmFnO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIGV2ZW50IGxpc3RlbmVycy5cbiAgICAgICAgYXR0YWNoTm9uRHJhZ2dpbmdFdmVudExpc3RlbmVycygpO1xuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvblJlc2l6ZURyYWcpO1xuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25SZXNpemVEcmFnRW5kKTtcblxuICAgICAgICAvLyBQcmV2ZW50IHVzZXItc2VsZWN0LlxuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBzZWxmLmNoZWNrU2Nyb2xsYmFycygpO1xuICAgICAgICBzZWxmLnRyaWdnZXIoJ2NvbHVtbnNyZXNpemVkJyk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBSZW9yZGVyaW5nIG9wZXJhdGlvblxuICAgICAqL1xuXG4gICAgZnVuY3Rpb24gc3RhcnRSZW9yZGVyKG5lYXJlc3RDb2x1bW4sIG5lYXJlc3RDb2x1bW5MZWZ0KSB7XG4gICAgICAgIC8vIFNldCB1cCBgZHJhZ0hlYWRlcmAuXG4gICAgICAgIHZhciBoZWFkZXJDYW52YXMgPSBzZWxmLmdldEhlYWRlckNhbnZhcygpO1xuICAgICAgICB2YXIgaGVhZGVyUmVjdCA9IGdldE9mZnNldFJlY3QoaGVhZGVyQ2FudmFzKTtcbiAgICAgICAgdmFyIG5lYXJlc3RDb2x1bW5XaWR0aCA9IG5lYXJlc3RDb2x1bW4uZ2V0V2lkdGgoKTtcbiAgICAgICAgZHJhZ0hlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBkcmFnSGVhZGVyLndpZHRoID0gbmVhcmVzdENvbHVtbldpZHRoO1xuICAgICAgICBkcmFnSGVhZGVyLmhlaWdodCA9IDIwO1xuICAgICAgICBkcmFnSGVhZGVyLnN0eWxlLm9wYWNpdHkgPSAnLjQ1JztcbiAgICAgICAgZHJhZ0hlYWRlci5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIGRyYWdIZWFkZXIuc3R5bGUubGVmdCA9IG5lYXJlc3RDb2x1bW5MZWZ0ICsgJ3B4JztcbiAgICAgICAgZHJhZ0hlYWRlci5zdHlsZS50b3AgPSBoZWFkZXJSZWN0LnRvcCArICdweCc7XG4gICAgICAgIGRyYWdIZWFkZXIuc3R5bGUuekluZGV4ID0gMTAwMDA7XG4gICAgICAgIGRyYWdIZWFkZXIuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2UoXG4gICAgICAgICAgICBzZWxmLmdldEhlYWRlckNhbnZhcygpLFxuICAgICAgICAgICAgbmVhcmVzdENvbHVtbkxlZnQgLSBoZWFkZXJSZWN0LmxlZnQsIC8vIHN4LCBcbiAgICAgICAgICAgIDAsIC8vIHN5LCBcbiAgICAgICAgICAgIG5lYXJlc3RDb2x1bW5XaWR0aCwgLy8gc1dpZHRoLCBcbiAgICAgICAgICAgIDIwLCAvLyBzSGVpZ2h0LCBcbiAgICAgICAgICAgIDAsIC8vIGR4LCBcbiAgICAgICAgICAgIDAsIC8vIGR5LCBcbiAgICAgICAgICAgIG5lYXJlc3RDb2x1bW5XaWR0aCxcbiAgICAgICAgICAgIDIwKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkcmFnSGVhZGVyKTtcblxuICAgICAgICAvLyBTZXQgdXAgb3VyIHN0YXRlLlxuICAgICAgICByZW9yZGVyaW5nQ29sdW1uID0gbmVhcmVzdENvbHVtbjtcbiAgICAgICAgcmVvcmRlcmluZ0NvbHVtbkxlZnRTdGFydCA9IG5lYXJlc3RDb2x1bW5MZWZ0O1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgY3Vyc29yIHN0eWxlLlxuICAgICAgICBib2R5Q3Vyc29yQmVmb3JlRHJhZyA9IGRvY3VtZW50LmJvZHkuc3R5bGUuY3Vyc29yO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmN1cnNvciA9ICdtb3ZlJztcblxuICAgICAgICAvLyBTZXQgdXAgZXZlbnQgbGlzdGVuZXJzLlxuICAgICAgICByZW1vdmVOb25EcmFnZ2luZ0V2ZW50TGlzdGVuZXJzKCk7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG9uUmVvcmRlckRyYWcpO1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgb25SZW9yZGVyRHJhZ0VuZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZW9yZGVyRHJhZyhldnQpIHtcbiAgICAgICAgLy8gRmluZCB4T2ZOZWFyZXN0Qm9yZGVyLlxuICAgICAgICB2YXIgbmVhcmVzdCA9IGRldGVjdE5lYXJlc3RDb2x1bW4oc2VsZiwgZXZ0KTtcbiAgICAgICAgdmFyIGNvbHVtbkxlZnQgPSBuZWFyZXN0LmNvbHVtbkxlZnQ7XG4gICAgICAgIHZhciBjb2x1bW5SaWdodCA9IG5lYXJlc3QuY29sdW1uUmlnaHQ7XG4gICAgICAgIHZhciBpc0xlZnRPZkNlbnRlciA9IGV2dC5wYWdlWCA8IChjb2x1bW5MZWZ0ICsgY29sdW1uUmlnaHQpICogMC41O1xuICAgICAgICB2YXIgeE9mTmVhcmVzdEJvcmRlciA9IGlzTGVmdE9mQ2VudGVyID8gY29sdW1uTGVmdCA6IGNvbHVtblJpZ2h0O1xuXG4gICAgICAgIC8vIFVwZGF0ZSBgaW5zZXJ0ZXJgLlxuICAgICAgICB2YXIgaGVhZGVyQ2FudmFzID0gc2VsZi5nZXRIZWFkZXJDYW52YXMoKTtcbiAgICAgICAgdmFyIGhlYWRlclJlY3QgPSBnZXRPZmZzZXRSZWN0KGhlYWRlckNhbnZhcyk7XG4gICAgICAgIC8vIFN1YnRyYWN0IDIgcGl4ZWxzIHRvIG1ha2UgYGluc2VydGVyYCBhcHBlYXIgT04gdGhlIGJvcmRlci5cbiAgICAgICAgaW5zZXJ0ZXIuc3R5bGUubGVmdCA9ICh4T2ZOZWFyZXN0Qm9yZGVyIC0gMikgKyAncHgnO1xuICAgICAgICBpbnNlcnRlci5zdHlsZS50b3AgPSBoZWFkZXJSZWN0LnRvcCArICdweCc7XG4gICAgICAgIGluc2VydGVyLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBgZHJhZ0hlYWRlcmAuXG4gICAgICAgIHZhciBjaGFuZ2VJblggPSBldnQucGFnZVggLSBkcmFnU3RhcnRYO1xuICAgICAgICAvLyBEaXNhbGxvdyBkcmFnZ2luZyBwYXN0IHRoZSBsZWZ0IG9mIHRoZSBoZWFkZXIuXG4gICAgICAgIHZhciBtaW5pbXVtID0gaGVhZGVyUmVjdC5sZWZ0IC0gcmVvcmRlcmluZ0NvbHVtbkxlZnRTdGFydDtcbiAgICAgICAgY2hhbmdlSW5YID0gTWF0aC5tYXgobWluaW11bSwgY2hhbmdlSW5YKTtcbiAgICAgICAgLy8gRGlzYWxsb3cgZHJhZ2dpbmcgcGFzdCB0aGUgcmlnaHQgb2YgdGhlIGhlYWRlci5cbiAgICAgICAgdmFyIGhlYWRlclJpZ2h0ID0gaGVhZGVyUmVjdC5sZWZ0ICsgaGVhZGVyUmVjdC53aWR0aFxuICAgICAgICB2YXIgbWF4aW11bSA9IGhlYWRlclJpZ2h0XG4gICAgICAgICAgICAtIHJlb3JkZXJpbmdDb2x1bW4uZ2V0V2lkdGgoKVxuICAgICAgICAgICAgLSByZW9yZGVyaW5nQ29sdW1uTGVmdFN0YXJ0O1xuICAgICAgICBjaGFuZ2VJblggPSBNYXRoLm1pbihtYXhpbXVtLCBjaGFuZ2VJblgpO1xuICAgICAgICB2YXIgdHJhbnNmb3JtID0gJ3RyYW5zbGF0ZVgoJyArIGNoYW5nZUluWCArICdweCkgdHJhbnNsYXRlWSgwcHgpJztcbiAgICAgICAgZHJhZ0hlYWRlci5zdHlsZS50cmFuc2Zvcm0gPSB0cmFuc2Zvcm07XG5cbiAgICAgICAgLy8gUHJldmVudCB1c2VyLXNlbGVjdC5cbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25SZW9yZGVyRHJhZ0VuZChldnQpIHtcbiAgICAgICAgLy8gRmluZCB0aGUgbmVhcmVzdEJvcmRlckluZGV4LlxuICAgICAgICB2YXIgbmVhcmVzdCA9IGRldGVjdE5lYXJlc3RDb2x1bW4oc2VsZiwgZXZ0KTtcbiAgICAgICAgdmFyIGNvbHVtbkxlZnQgPSBuZWFyZXN0LmNvbHVtbkxlZnQ7XG4gICAgICAgIHZhciBjb2x1bW5SaWdodCA9IG5lYXJlc3QuY29sdW1uUmlnaHQ7XG4gICAgICAgIHZhciBuZWFyZXN0Qm9yZGVySW5kZXggPSBldnQucGFnZVggPCAoY29sdW1uTGVmdCArIGNvbHVtblJpZ2h0KSAqIDAuNVxuICAgICAgICAgICAgPyBuZWFyZXN0LmluZGV4XG4gICAgICAgICAgICA6IG5lYXJlc3QuaW5kZXggKyAxO1xuXG4gICAgICAgIC8vIE1vdmUgdGhlIGNvbHVtbiBpbiB0aGUgZ3JpZC5cbiAgICAgICAgdmFyIGNvbHVtbnMgPSBzZWxmLmdldENvbHVtbnMoKTtcbiAgICAgICAgdmFyIGZyb20gPSBjb2x1bW5zLmluZGV4T2YocmVvcmRlcmluZ0NvbHVtbik7XG4gICAgICAgIHZhciB0byA9IG5lYXJlc3RCb3JkZXJJbmRleDtcbiAgICAgICAgdmFyIHJlb3JkZXJlZCA9IG1vdmVJZHgoY29sdW1ucywgZnJvbSwgdG8pO1xuICAgICAgICBzZWxmLnNldENvbHVtbnMocmVvcmRlcmVkKTtcblxuICAgICAgICAvLyBDbGVhciBvdXIgc3RhdGUuXG4gICAgICAgIGRyYWdTdGFydFggPSBudWxsO1xuICAgICAgICByZW9yZGVyaW5nQ29sdW1uID0gbnVsbDtcbiAgICAgICAgcmVvcmRlcmluZ0NvbHVtbkxlZnRTdGFydCA9IG51bGw7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB0aGUgY3Vyc29yIHN0eWxlLlxuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmN1cnNvciA9IGJvZHlDdXJzb3JCZWZvcmVEcmFnO1xuXG4gICAgICAgIC8vIFJlbW92ZSBvdXIgZGl2cy5cbiAgICAgICAgZHJhZ0hlYWRlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRyYWdIZWFkZXIpO1xuICAgICAgICBpbnNlcnRlci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gICAgICAgIC8vIFJlc3RvcmUgdGhlIGV2ZW50IGxpc3RlbmVycy5cbiAgICAgICAgYXR0YWNoTm9uRHJhZ2dpbmdFdmVudExpc3RlbmVycygpO1xuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBvblJlb3JkZXJEcmFnKTtcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG9uUmVvcmRlckRyYWdFbmQpO1xuXG4gICAgICAgIHNlbGYudHJpZ2dlcignY29sdW1uc3Jlb3JkZXJlZCcpO1xuXG4gICAgICAgIHNlbGYucGFpbnRBbGwoKTtcbiAgICB9XG59XG5cbmV4cG9ydHMuaW5pdCA9IGluaXQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0UmVuZGVyZXIgPSByZXF1aXJlKCcuL2RlZmF1bHRjZWxscmVuZGVyZXIuanMnKTtcblxudmFyIENvbHVtbiA9IGZ1bmN0aW9uKGdyaWQsIGZpZWxkLCBsYWJlbCwgdHlwZSwgd2lkdGgsIHJlbmRlcmVyKSB7XG5cbiAgICByZW5kZXJlciA9IHJlbmRlcmVyIHx8IGRlZmF1bHRSZW5kZXJlcjtcblxuICAgIHRoaXMuZ2V0R3JpZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZ3JpZDtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRHcmlkID0gZnVuY3Rpb24obmV3R3JpZCkge1xuICAgICAgICBncmlkID0gbmV3R3JpZDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaWVsZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZmllbGQ7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0RmllbGQgPSBmdW5jdGlvbihuZXdGaWVsZCkge1xuICAgICAgICBmaWVsZCA9IG5ld0ZpZWxkO1xuICAgIH07XG5cbiAgICB0aGlzLmdldExhYmVsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBsYWJlbDtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRMYWJlbCA9IGZ1bmN0aW9uKG5ld0xhYmVsKSB7XG4gICAgICAgIGxhYmVsID0gbmV3TGFiZWw7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VHlwZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdHlwZTtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRUeXBlID0gZnVuY3Rpb24obmV3VHlwZSkge1xuICAgICAgICB0eXBlID0gbmV3VHlwZTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gcmVuZGVyZXI7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0UmVuZGVyZXIgPSBmdW5jdGlvbihuZXdSZW5kZXJlcikge1xuICAgICAgICByZW5kZXJlciA9IG5ld1JlbmRlcmVyO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFdpZHRoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB3aWR0aDtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRXaWR0aCA9IGZ1bmN0aW9uKG5ld1dpZHRoKSB7XG4gICAgICAgIHdpZHRoID0gbmV3V2lkdGg7XG4gICAgfTtcbn07XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbHVtbjsiLCIndXNlIHN0cmljdCc7XG5cblxudmFyIHBhaW50ID0gZnVuY3Rpb24oZ2MsIGNvbmZpZykge1xuXG4gICAgdmFyIHZhbHVlID0gY29uZmlnLnZhbHVlO1xuICAgIHZhciBib3VuZHMgPSBjb25maWcuYm91bmRzO1xuXG4gICAgdmFyIHggPSBib3VuZHMueDtcbiAgICB2YXIgeSA9IGJvdW5kcy55O1xuICAgIHZhciB3aWR0aCA9IGJvdW5kcy53aWR0aDtcbiAgICB2YXIgaGVpZ2h0ID0gYm91bmRzLmhlaWdodDtcbiAgICB2YXIgZm9udCA9IGNvbmZpZy5mb250O1xuXG4gICAgdmFyIGhhbGlnbiA9IGNvbmZpZy5oYWxpZ24gfHwgJ3JpZ2h0JztcbiAgICB2YXIgdmFsaWduT2Zmc2V0ID0gY29uZmlnLnZvZmZzZXQgfHwgMDtcblxuICAgIHZhciBjZWxsUGFkZGluZyA9IGNvbmZpZy5jZWxsUGFkZGluZyB8fCAwO1xuICAgIHZhciBoYWxpZ25PZmZzZXQgPSAwO1xuICAgIHZhciB0ZXh0V2lkdGg7XG4gICAgdmFyIGZvbnRNZXRyaWNzO1xuXG4gICAgaWYgKGdjLmZvbnQgIT09IGNvbmZpZy5mb250KSB7XG4gICAgICAgIGdjLmZvbnQgPSBjb25maWcuZm9udDtcbiAgICB9XG4gICAgaWYgKGdjLnRleHRBbGlnbiAhPT0gJ2xlZnQnKSB7XG4gICAgICAgIGdjLnRleHRBbGlnbiA9ICdsZWZ0JztcbiAgICB9XG4gICAgaWYgKGdjLnRleHRCYXNlbGluZSAhPT0gJ21pZGRsZScpIHtcbiAgICAgICAgZ2MudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XG4gICAgfVxuXG4gICAgdGV4dFdpZHRoID0gY29uZmlnLmdldFRleHRXaWR0aChnYywgdmFsdWUpO1xuICAgIGZvbnRNZXRyaWNzID0gY29uZmlnLmdldFRleHRIZWlnaHQoZm9udCk7XG5cbiAgICBpZiAoaGFsaWduID09PSAncmlnaHQnKSB7XG4gICAgICAgIC8vdGV4dFdpZHRoID0gY29uZmlnLmdldFRleHRXaWR0aChnYywgY29uZmlnLnZhbHVlKTtcbiAgICAgICAgaGFsaWduT2Zmc2V0ID0gd2lkdGggLSBjZWxsUGFkZGluZyAtIHRleHRXaWR0aDtcbiAgICB9IGVsc2UgaWYgKGhhbGlnbiA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgLy90ZXh0V2lkdGggPSBjb25maWcuZ2V0VGV4dFdpZHRoKGdjLCBjb25maWcudmFsdWUpO1xuICAgICAgICBoYWxpZ25PZmZzZXQgPSAod2lkdGggLSB0ZXh0V2lkdGgpIC8gMjtcbiAgICB9IGVsc2UgaWYgKGhhbGlnbiA9PT0gJ2xlZnQnKSB7XG4gICAgICAgIGhhbGlnbk9mZnNldCA9IGNlbGxQYWRkaW5nO1xuICAgIH1cblxuICAgIGhhbGlnbk9mZnNldCA9IE1hdGgubWF4KDAsIGhhbGlnbk9mZnNldCk7XG4gICAgdmFsaWduT2Zmc2V0ID0gdmFsaWduT2Zmc2V0ICsgTWF0aC5jZWlsKGhlaWdodCAvIDIpO1xuXG4gICAgLy9maWxsIGJhY2tncm91bmQgb25seSBpZiBvdXIgYmFja2dyb3VuZENvbG9yIGlzIHBvcHVsYXRlZCBvciB3ZSBhcmUgYSBzZWxlY3RlZCBjZWxsXG4gICAgaWYgKGNvbmZpZy5iYWNrZ3JvdW5kQ29sb3IgfHwgY29uZmlnLmlzU2VsZWN0ZWQpIHtcbiAgICAgICAgZ2MuZmlsbFN0eWxlID0gY29uZmlnLmlzU2VsZWN0ZWQgPyBjb25maWcuYmdTZWxDb2xvciA6IGNvbmZpZy5iYWNrZ3JvdW5kQ29sb3I7XG4gICAgICAgIGdjLmZpbGxSZWN0KHgsIHksIHdpZHRoLCBoZWlnaHQpO1xuICAgIH1cblxuICAgIC8vZHJhdyB0ZXh0XG4gICAgdmFyIHRoZUNvbG9yID0gY29uZmlnLmlzU2VsZWN0ZWQgPyBjb25maWcuZmdTZWxDb2xvciA6IGNvbmZpZy5jb2xvcjtcbiAgICBpZiAoZ2MuZmlsbFN0eWxlICE9PSB0aGVDb2xvcikge1xuICAgICAgICBnYy5maWxsU3R5bGUgPSB0aGVDb2xvcjtcbiAgICAgICAgZ2Muc3Ryb2tlU3R5bGUgPSB0aGVDb2xvcjtcbiAgICB9XG4gICAgaWYgKHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgIGdjLmZpbGxUZXh0KHZhbHVlLCB4ICsgaGFsaWduT2Zmc2V0LCB5ICsgdmFsaWduT2Zmc2V0KTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcGFpbnQ7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29sdW1uID0gcmVxdWlyZSgnLi9jb2x1bW4uanMnKTtcbnZhciBMUlVDYWNoZSA9IHJlcXVpcmUoJy4uLy4uLy4uL25vZGVfbW9kdWxlcy9scnUtY2FjaGUvbGliL2xydS1jYWNoZS5qcycpO1xudmFyIEZpbkJhciA9IHJlcXVpcmUoJy4uLy4uLy4uL25vZGVfbW9kdWxlcy9maW5iYXJzL2luZGV4LmpzJyk7XG52YXIgZGVmYXVsdGNlbGxyZW5kZXJlciA9IHJlcXVpcmUoJy4vZGVmYXVsdGNlbGxyZW5kZXJlci5qcycpO1xudmFyIHJlc2l6YWJsZXMgPSBbXTtcbnZhciByZXNpemVMb29wUnVubmluZyA9IHRydWU7XG52YXIgZm9udERhdGEgPSB7fTtcbnZhciB0ZXh0V2lkdGhDYWNoZSA9IG5ldyBMUlVDYWNoZSh7IG1heDogMTAwMDAgfSk7XG5cblxudmFyIHJlc2l6YWJsZXNMb29wRnVuY3Rpb24gPSBmdW5jdGlvbihub3cpIHtcbiAgICBpZiAoIXJlc2l6ZUxvb3BSdW5uaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXNpemFibGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXNpemFibGVzW2ldKG5vdyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxufTtcbnNldEludGVydmFsKHJlc2l6YWJsZXNMb29wRnVuY3Rpb24sIDIwMCk7XG5cblxuZnVuY3Rpb24gR3JpZChkb21FbGVtZW50LCBtb2RlbCwgcHJvcGVydGllcykge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLmdldERlZmF1bHRQcm9wZXJ0aWVzKCk7XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHZhciBoZWFkZXJDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGhlYWRlckNvbnRleHQgPSBoZWFkZXJDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIHZhciBjb2x1bW5zID0gW107XG4gICAgdGhpcy5zY3JvbGxYID0gMDtcbiAgICB0aGlzLnNjcm9sbFkgPSAwO1xuICAgIHRoaXMuYm91bmRzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAgIG1vZGVsLmNoYW5nZWQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHNlbGYucGFpbnQoeCwgeSk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0Q2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjYW52YXM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SGVhZGVyQ2FudmFzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBoZWFkZXJDYW52YXM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0Q29udGFpbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkb21FbGVtZW50O1xuICAgIH07XG5cbiAgICB0aGlzLmdldENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0SGVhZGVyQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaGVhZGVyQ29udGV4dDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0TW9kZWwgPSBmdW5jdGlvbihncmlkTW9kZWwpIHtcbiAgICAgICAgbW9kZWwgPSBncmlkTW9kZWw7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0Q29sdW1ucyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29sdW1ucztcbiAgICB9XG5cbiAgICB0aGlzLnNldENvbHVtbnMgPSBmdW5jdGlvbiAoY29scykge1xuICAgICAgICBjb2x1bW5zID0gY29scztcbiAgICB9XG5cbiAgICB0aGlzLmdldE9wdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uKG5ld09wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG5ld09wdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuYWRkUHJvcGVydGllcyhwcm9wZXJ0aWVzKTtcblxuICAgIHRoaXMuaW5pdGlhbGl6ZSgpXG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXREZWZhdWx0UHJvcGVydGllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGZvbnQ6ICcxM3B4IFRhaG9tYSwgR2VuZXZhLCBzYW5zLXNlcmlmJyxcbiAgICAgICAgY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgYmFja2dyb3VuZENvbG9yOiAnIzUwNTA1MCcsXG4gICAgICAgIGZvcmVncm91bmRTZWxDb2xvcjogJ3JnYigyNSwgMjUsIDI1KScsXG4gICAgICAgIGJhY2tncm91bmRTZWxDb2xvcjogJ3JnYigxODMsIDIxOSwgMjU1KScsXG5cbiAgICAgICAgdG9wTGVmdEZvbnQ6ICcxNHB4IFRhaG9tYSwgR2VuZXZhLCBzYW5zLXNlcmlmJyxcbiAgICAgICAgdG9wTGVmdENvbG9yOiAncmdiKDI1LCAyNSwgMjUpJyxcbiAgICAgICAgdG9wTGVmdEJhY2tncm91bmRDb2xvcjogJ3JnYigyMjMsIDIyNywgMjMyKScsXG4gICAgICAgIHRvcExlZnRGR1NlbENvbG9yOiAncmdiKDI1LCAyNSwgMjUpJyxcbiAgICAgICAgdG9wTGVmdEJHU2VsQ29sb3I6ICdyZ2IoMjU1LCAyMjAsIDk3KScsXG5cbiAgICAgICAgZml4ZWRDb2x1bW5Gb250OiAnMTRweCBUYWhvbWEsIEdlbmV2YSwgc2Fucy1zZXJpZicsXG4gICAgICAgIGZpeGVkQ29sdW1uQ29sb3I6ICdyZ2IoMjUsIDI1LCAyNSknLFxuICAgICAgICBmaXhlZENvbHVtbkJhY2tncm91bmRDb2xvcjogJ3JnYigyMjMsIDIyNywgMjMyKScsXG4gICAgICAgIGZpeGVkQ29sdW1uRkdTZWxDb2xvcjogJ3JnYigyNSwgMjUsIDI1KScsXG4gICAgICAgIGZpeGVkQ29sdW1uQkdTZWxDb2xvcjogJ3JnYigyNTUsIDIyMCwgOTcpJyxcblxuICAgICAgICBmaXhlZFJvd0ZvbnQ6ICcxMXB4IFRhaG9tYSwgR2VuZXZhLCBzYW5zLXNlcmlmJyxcbiAgICAgICAgZml4ZWRSb3dDb2xvcjogJyNmZmZmZmYnLFxuICAgICAgICBmaXhlZFJvd0JhY2tncm91bmRDb2xvcjogJyMzMDMwMzAnLFxuICAgICAgICBmaXhlZFJvd0ZHU2VsQ29sb3I6ICdyZ2IoMjUsIDI1LCAyNSknLFxuICAgICAgICBmaXhlZFJvd0JHU2VsQ29sb3I6ICdyZ2IoMjU1LCAyMjAsIDk3KScsXG5cbiAgICAgICAgYmFja2dyb3VuZENvbG9yMjogJyMzMDMwMzAnLFxuICAgICAgICBsaW5lQ29sb3I6ICcjNzA3MDcwJyxcbiAgICAgICAgdm9mZnNldDogMCxcbiAgICAgICAgc2Nyb2xsaW5nRW5hYmxlZDogZmFsc2UsXG4gICAgICAgIHZTY3JvbGxiYXJDbGFzc1ByZWZpeDogJ2Zpbi1zYi11c2VyJyxcbiAgICAgICAgaFNjcm9sbGJhckNsYXNzUHJlZml4OiAnZmluLXNiLXVzZXInLFxuXG4gICAgICAgIGRlZmF1bHRSb3dIZWlnaHQ6IDI1LFxuICAgICAgICBkZWZhdWx0Rml4ZWRSb3dIZWlnaHQ6IDIwLFxuICAgICAgICBkZWZhdWx0Q29sdW1uV2lkdGg6IDEwMCxcbiAgICAgICAgZGVmYXVsdEZpeGVkQ29sdW1uV2lkdGg6IDEwMCxcbiAgICAgICAgY2VsbFBhZGRpbmc6IDVcbiAgICB9O1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0UGFpbnRDb25maWcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29uZmlnID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmdldE9wdGlvbnMoKSk7XG5cbiAgICBjb25maWcuZ2V0VGV4dEhlaWdodCA9IGZ1bmN0aW9uKGZvbnQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZ2V0VGV4dEhlaWdodChmb250KTtcbiAgICB9O1xuXG4gICAgY29uZmlnLmdldFRleHRXaWR0aCA9IGZ1bmN0aW9uKGdjLCB0ZXh0KSB7XG4gICAgICAgIHJldHVybiBzZWxmLmdldFRleHRXaWR0aChnYywgdGV4dCk7XG4gICAgfTtcblxuICAgIHJldHVybiBjb25maWc7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRUZXh0V2lkdGggPSBmdW5jdGlvbihnYywgc3RyaW5nKSB7XG4gICAgaWYgKHN0cmluZyA9PT0gbnVsbCB8fCBzdHJpbmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgc3RyaW5nID0gc3RyaW5nICsgJyc7XG4gICAgaWYgKHN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHZhciBrZXkgPSBnYy5mb250ICsgc3RyaW5nO1xuICAgIHZhciB3aWR0aCA9IHRleHRXaWR0aENhY2hlLmdldChrZXkpO1xuICAgIGlmICghd2lkdGgpIHtcbiAgICAgICAgd2lkdGggPSBnYy5tZWFzdXJlVGV4dChzdHJpbmcpLndpZHRoO1xuICAgICAgICB0ZXh0V2lkdGhDYWNoZS5zZXQoa2V5LCB3aWR0aCk7XG4gICAgfVxuICAgIHJldHVybiB3aWR0aDtcbn07XG5cblxuR3JpZC5wcm90b3R5cGUuZ2V0VGV4dEhlaWdodCA9IGZ1bmN0aW9uKGZvbnQpIHtcblxuICAgIHZhciByZXN1bHQgPSBmb250RGF0YVtmb250XTtcbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIHJlc3VsdCA9IHt9O1xuICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHRleHQudGV4dENvbnRlbnQgPSAnSGcnO1xuICAgIHRleHQuc3R5bGUuZm9udCA9IGZvbnQ7XG5cbiAgICB2YXIgYmxvY2sgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBibG9jay5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZS1ibG9jayc7XG4gICAgYmxvY2suc3R5bGUud2lkdGggPSAnMXB4JztcbiAgICBibG9jay5zdHlsZS5oZWlnaHQgPSAnMHB4JztcblxuICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkaXYuYXBwZW5kQ2hpbGQodGV4dCk7XG4gICAgZGl2LmFwcGVuZENoaWxkKGJsb2NrKTtcblxuICAgIGRpdi5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChkaXYpO1xuXG4gICAgdHJ5IHtcblxuICAgICAgICBibG9jay5zdHlsZS52ZXJ0aWNhbEFsaWduID0gJ2Jhc2VsaW5lJztcblxuICAgICAgICB2YXIgYmxvY2tSZWN0ID0gYmxvY2suZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHZhciB0ZXh0UmVjdCA9IHRleHQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgcmVzdWx0LmFzY2VudCA9IGJsb2NrUmVjdC50b3AgLSB0ZXh0UmVjdC50b3A7XG5cbiAgICAgICAgYmxvY2suc3R5bGUudmVydGljYWxBbGlnbiA9ICdib3R0b20nO1xuICAgICAgICByZXN1bHQuaGVpZ2h0ID0gYmxvY2tSZWN0LnRvcCAtIHRleHRSZWN0LnRvcDtcblxuICAgICAgICByZXN1bHQuZGVzY2VudCA9IHJlc3VsdC5oZWlnaHQgLSByZXN1bHQuYXNjZW50O1xuXG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChkaXYpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0LmhlaWdodCAhPT0gMCkge1xuICAgICAgICBmb250RGF0YVtmb250XSA9IHJlc3VsdDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkdyaWQucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24ocHJvcGVydGllczEsIHByb3BlcnRpZXMyKSB7XG4gICAgZm9yICh2YXIga2V5IGluIHByb3BlcnRpZXMyKSB7XG4gICAgICAgIGlmIChwcm9wZXJ0aWVzMi5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzMVtrZXldID0gcHJvcGVydGllczJba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbkdyaWQucHJvdG90eXBlLmFkZFByb3BlcnRpZXMgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgdGhpcy5tZXJnZSh0aGlzLmdldE9wdGlvbnMoKSwgcHJvcGVydGllcyk7XG4gICAgdGhpcy5ib3VuZHNJbml0aWFsaXplZCA9IGZhbHNlO1xufTtcblxuR3JpZC5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgY29udGFpbmVyID0gdGhpcy5nZXRDb250YWluZXIoKTtcbiAgICB2YXIgZGl2SGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2SGVhZGVyLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICBkaXZIZWFkZXIuc3R5bGUudG9wID0gMDtcbiAgICBkaXZIZWFkZXIuc3R5bGUucmlnaHQgPSAwO1xuICAgIGRpdkhlYWRlci5zdHlsZS5sZWZ0ID0gMDtcbiAgICBkaXZIZWFkZXIuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcblxuICAgIGRpdkhlYWRlci5hcHBlbmRDaGlsZCh0aGlzLmdldEhlYWRlckNhbnZhcygpKTtcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZGl2SGVhZGVyKTtcblxuICAgIHJlcXVpcmUoJy4vY29sLXJlb3JkZXIuanMnKS5pbml0KHNlbGYsIGRpdkhlYWRlcik7XG5cbiAgICB2YXIgZGl2TWFpbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdk1haW4uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIGRpdk1haW4uc3R5bGUucmlnaHQgPSAwO1xuICAgIGRpdk1haW4uc3R5bGUuYm90dG9tID0gMDtcbiAgICBkaXZNYWluLnN0eWxlLmxlZnQgPSAwO1xuXG4gICAgLy8gZGl2TWFpbi5zdHlsZS5vdmVyZmxvdyA9ICdhdXRvJztcbiAgICAvLyBkaXZNYWluLnN0eWxlLm1zT3ZlcmZsb3dTdHlsZSA9ICctbXMtYXV0b2hpZGluZy1zY3JvbGxiYXInO1xuICAgIC8vIGRpdk1haW4uYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBmdW5jdGlvbihlKSB7XG4gICAgLy8gICAgIGRpdkhlYWRlci5zY3JvbGxMZWZ0ID0gZS50YXJnZXQuc2Nyb2xsTGVmdDtcbiAgICAvLyB9KTtcbiAgICBkaXZNYWluLnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG5cbiAgICBpZiAodGhpcy5yZXNvbHZlUHJvcGVydHkoJ3Njcm9sbGluZ0VuYWJsZWQnKSA9PT0gdHJ1ZSkge1xuICAgICAgICB0aGlzLmluaXRTY3JvbGxiYXJzKCk7XG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLnNjcm9sbGJhcnNEaXYpO1xuICAgIH1cblxuICAgIGRpdk1haW4uYXBwZW5kQ2hpbGQodGhpcy5nZXRDYW52YXMoKSk7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGRpdk1haW4pO1xuICAgIFxuXG4gICAgdGhpcy5jaGVja0NhbnZhc0JvdW5kcygpO1xuICAgIHRoaXMuYmVnaW5SZXNpemluZygpO1xuXG59O1xuXG5HcmlkLnByb3RvdHlwZS5pbml0U2Nyb2xsYmFycyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIHRoaXMuc2Nyb2xsYmFyc0RpdiA9IHRoaXMuZ2V0U2Nyb2xsYmFyRGl2KCk7XG4gICAgXG4gICAgdmFyIGhvcnpCYXIgPSBuZXcgRmluQmFyKHtcbiAgICAgICAgb3JpZW50YXRpb246ICdob3Jpem9udGFsJyxcbiAgICAgICAgb25jaGFuZ2U6IGZ1bmN0aW9uKGlkeCkge1xuICAgICAgICAgICAgaWYgKCFzZWxmLmlnbm9yZVNjcm9sbEV2ZW50cykge1xuICAgICAgICAgICAgICAgIHNlbGYuc2V0U2Nyb2xsWChpZHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjc3NTdHlsZXNoZWV0UmVmZXJlbmNlRWxlbWVudDogZG9jdW1lbnQuYm9keSxcbiAgICAgICAgY29udGFpbmVyOiB0aGlzLmdldENvbnRhaW5lcigpLFxuICAgIH0pO1xuXG4gICAgdmFyIHZlcnRCYXIgPSBuZXcgRmluQmFyKHtcbiAgICAgICAgb3JpZW50YXRpb246ICd2ZXJ0aWNhbCcsXG4gICAgICAgIG9uY2hhbmdlOiBmdW5jdGlvbihpZHgpIHtcbiAgICAgICAgICAgIGlmICghc2VsZi5pZ25vcmVTY3JvbGxFdmVudHMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnNldFNjcm9sbFkoaWR4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGFnaW5nOiB7XG4gICAgICAgICAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYucGFnZVVwKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYucGFnZURvd24oKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhaW5lcjogdGhpcy5nZXRDb250YWluZXIoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuc2JIU2Nyb2xsZXIgPSBob3J6QmFyO1xuICAgIHRoaXMuc2JWU2Nyb2xsZXIgPSB2ZXJ0QmFyO1xuXG4gICAgdGhpcy5zYkhTY3JvbGxlci5jbGFzc1ByZWZpeCA9IHRoaXMucmVzb2x2ZVByb3BlcnR5KCdoU2Nyb2xsYmFyQ2xhc3NQcmVmaXgnKTtcbiAgICB0aGlzLnNiVlNjcm9sbGVyLmNsYXNzUHJlZml4ID0gdGhpcy5yZXNvbHZlUHJvcGVydHkoJ3ZTY3JvbGxiYXJDbGFzc1ByZWZpeCcpO1xuXG4gICAgdGhpcy5zY3JvbGxiYXJzRGl2LmFwcGVuZENoaWxkKGhvcnpCYXIuYmFyKTtcbiAgICB0aGlzLnNjcm9sbGJhcnNEaXYuYXBwZW5kQ2hpbGQodmVydEJhci5iYXIpO1xuXG59O1xuXG5HcmlkLnByb3RvdHlwZS5wYWdlRG93biA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAxO1xufTtcblxuR3JpZC5wcm90b3R5cGUucGFnZVVwID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDE7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXRTY3JvbGxYID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodGhpcy5zY3JvbGxYICE9PSB2YWx1ZSkge1xuICAgICAgICB0aGlzLnNjcm9sbFggPSB2YWx1ZTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyZW5kZXJlZHJvd3JhbmdlY2hhbmdlZCcpO1xuICAgICAgICB0aGlzLnBhaW50QWxsKCk7XG4gICAgfVxufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0U2Nyb2xsWSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuc2Nyb2xsWSAhPT0gdmFsdWUpIHtcbiAgICAgICAgdGhpcy5zY3JvbGxZID0gdmFsdWU7XG4gICAgICAgIHRoaXMudHJpZ2dlcigncmVuZGVyZWRyb3dyYW5nZWNoYW5nZWQnKTtcbiAgICAgICAgdGhpcy5wYWludEFsbCgpO1xuICAgIH1cbn07XG5cbkdyaWQucHJvdG90eXBlLnJlc2l6ZVNjcm9sbGJhcnMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNiSFNjcm9sbGVyLnNob3J0ZW5CeSh0aGlzLnNiVlNjcm9sbGVyKS5yZXNpemUoKTtcbiAgICB0aGlzLnNiVlNjcm9sbGVyLnNob3J0ZW5CeSh0aGlzLnNiSFNjcm9sbGVyKS5yZXNpemUoKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnNldFZTY3JvbGxiYXJWYWx1ZXMgPSBmdW5jdGlvbihtYXgpIHtcbiAgICB0aGlzLnNiVlNjcm9sbGVyLnJhbmdlID0ge1xuICAgICAgICBtaW46IDAsXG4gICAgICAgIG1heDogbWF4XG4gICAgfTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnNldEhTY3JvbGxiYXJWYWx1ZXMgPSBmdW5jdGlvbihtYXgpIHtcbiAgICB0aGlzLnNiSFNjcm9sbGVyLnJhbmdlID0ge1xuICAgICAgICBtaW46IDAsXG4gICAgICAgIG1heDogbWF4XG4gICAgfTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFNjcm9sbGJhckRpdiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaXhlZFJvd0hlaWdodCA9IHRoaXMuZ2V0Rml4ZWRSb3dIZWlnaHQoKTtcbiAgICB2YXIgb3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB2YXIgc3RyVmFyPVwiXCI7XG4gICAgc3RyVmFyICs9IFwiPGRpdiBzdHlsZT1cXFwidG9wOlwiICsgZml4ZWRSb3dIZWlnaHQgKyBcInB4O3JpZ2h0OjBweDtib3R0b206MHB4O2xlZnQ6MHB4O3Bvc2l0aW9uOmFic29sdXRlXFxcIj5cIjtcbiAgICBzdHJWYXIgKz0gXCIgIDxzdHlsZT5cIjtcbiAgICBzdHJWYXIgKz0gXCIgIGRpdi5maW5iYXItaG9yaXpvbnRhbCxcIjtcbiAgICBzdHJWYXIgKz0gXCIgIGRpdi5maW5iYXItdmVydGljYWwge1wiO1xuICAgIHN0clZhciArPSBcIiAgICB6LWluZGV4OiA1O1wiO1xuICAgIHN0clZhciArPSBcIiAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSk7XCI7XG4gICAgc3RyVmFyICs9IFwiICAgIGJveC1zaGFkb3c6IDAgMCAzcHggIzAwMCwgMCAwIDNweCAjMDAwLCAwIDAgM3B4ICMwMDA7XCI7XG4gICAgc3RyVmFyICs9IFwiICB9XCI7XG4gICAgc3RyVmFyICs9IFwiICBcIjtcbiAgICBzdHJWYXIgKz0gXCIgIGRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWIsXCI7XG4gICAgc3RyVmFyICs9IFwiICBkaXYuZmluYmFyLXZlcnRpY2FsPi50aHVtYiB7XCI7XG4gICAgc3RyVmFyICs9IFwiICAgIG9wYWNpdHk6IC44NTtcIjtcbiAgICBzdHJWYXIgKz0gXCIgICAgYm94LXNoYWRvdzogMCAwIDNweCAjMDAwLCAwIDAgM3B4ICMwMDAsIDAgMCAzcHggIzAwMDtcIjtcbiAgICBzdHJWYXIgKz0gXCIgIH1cIjtcbiAgICBzdHJWYXIgKz0gXCIgIDxcXC9zdHlsZT5cIjtcbiAgICBzdHJWYXIgKz0gXCI8XFwvZGl2PlwiO1xuICAgIG91dGVyLmlubmVySFRNTCA9IHN0clZhcjtcbiAgICB2YXIgaW5uZXIgPSBvdXRlci5maXJzdENoaWxkO1xuICAgIHJldHVybiBpbm5lcjtcbn07XG5cbkdyaWQucHJvdG90eXBlLmNoZWNrQ2FudmFzQm91bmRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbnRhaW5lciA9IHRoaXMuZ2V0Q29udGFpbmVyKCk7XG4gICAgdmFyIGhlYWRlckhlaWdodCA9IHRoaXMuZ2V0Rml4ZWRSb3dIZWlnaHQoKTtcblxuICAgIHZhciB2aWV3cG9ydCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIHZhciBoZWFkZXJDYW52YXMgPSB0aGlzLmdldEhlYWRlckNhbnZhcygpO1xuICAgIHZhciBjYW52YXMgPSB0aGlzLmdldENhbnZhcygpO1xuXG4gICAgaWYgKCF0aGlzLmJvdW5kc0luaXRpYWxpemVkIHx8IGNhbnZhcy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykgIT09ICgnJyArIHZpZXdwb3J0LndpZHRoKVxuICAgICAgICB8fCBjYW52YXMuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSAhPT0gKCcnICsgKHZpZXdwb3J0LmhlaWdodCAtIGhlYWRlckhlaWdodCkpKSB7XG5cbiAgICAgICAgaGVhZGVyQ2FudmFzLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcblxuICAgICAgICBjYW52YXMucGFyZW50RWxlbWVudC5zdHlsZS50b3AgPSBoZWFkZXJIZWlnaHQgKyAncHgnO1xuICAgICAgICBjYW52YXMuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICBjYW52YXMuc3R5bGUudG9wID0gJzFweCc7XG5cbiAgICAgICAgdGhpcy5zZXREcGkoaGVhZGVyQ2FudmFzLCB2aWV3cG9ydC53aWR0aCwgaGVhZGVySGVpZ2h0KTtcbiAgICAgICAgdGhpcy5zZXREcGkoY2FudmFzLCB2aWV3cG9ydC53aWR0aCwgKHZpZXdwb3J0LmhlaWdodCAtIGhlYWRlckhlaWdodCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBkaW1lbnNpb25zIGhhdmVuJ3QgY2hhbmdlZCwgbm8gbmVlZCB0byBkbyBhbnl0aGluZy5cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYm91bmRzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5jaGVja1Njcm9sbGJhcnMoKTtcblxuICAgIHRoaXMucGFpbnRBbGwoKTtcblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0RHBpID0gZnVuY3Rpb24oY2FudmFzLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgZGV2aWNlUGl4ZWxSYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDEsXG4gICAgICAgIGJhY2tpbmdTdG9yZVJhdGlvID0gY29udGV4dC53ZWJraXRCYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0Lm1vekJhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQubXNCYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0Lm9CYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmJhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHwgMSxcbiAgICAgICAgcmF0aW8gPSB0aGlzLnJlc29sdmVQcm9wZXJ0eSgnaGlnaERwaUVuYWJsZWQnKSA/IGRldmljZVBpeGVsUmF0aW8gLyBiYWNraW5nU3RvcmVSYXRpbyA6IDE7XG5cbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoICogcmF0aW8pO1xuICAgIGNhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCAqIHJhdGlvKTtcblxuICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcblxuICAgIGNvbnRleHQuc2NhbGUocmF0aW8sIHJhdGlvKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnVwZGF0ZVJvd0NvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jaGVja1Njcm9sbGJhcnMoKTtcbiAgICB0aGlzLnBhaW50QWxsKCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5jaGVja1Njcm9sbGJhcnMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5yZXNvbHZlUHJvcGVydHkoJ3Njcm9sbGluZ0VuYWJsZWQnKSA9PT0gdHJ1ZSkge1xuICAgICAgICB0aGlzLmlnbm9yZVNjcm9sbEV2ZW50cyA9IHRydWU7XG4gICAgICAgIC8vdGhlIG1vZGVsIG1heSBoYXZlIGNoYW5nZWQsIGxldHNcbiAgICAgICAgLy9yZWNvbXB1dGUgdGhlIHNjcm9sbGluZyBjb29yZGluYXRlc1xuICAgICAgICB2YXIgb2xkU2Nyb2xsWCA9IHRoaXMuc2Nyb2xsWCxcbiAgICAgICAgICAgIG9sZFNjcm9sbFkgPSB0aGlzLnNjcm9sbFk7XG5cbiAgICAgICAgdGhpcy5maW5hbFBhZ2VMb2NhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgdmFyIGZpbmFsUGFnZUxvY2F0aW9uID0gdGhpcy5nZXRGaW5hbFBhZ2VMb2NhdGlvbigpO1xuICAgICAgICB0aGlzLnNldEhTY3JvbGxiYXJWYWx1ZXMoZmluYWxQYWdlTG9jYXRpb24ueCk7XG4gICAgICAgIHRoaXMuc2V0VlNjcm9sbGJhclZhbHVlcyhmaW5hbFBhZ2VMb2NhdGlvbi55KTtcblxuICAgICAgICB0aGlzLnJlc2l6ZVNjcm9sbGJhcnMoKTtcblxuICAgICAgICB0aGlzLnNldFNjcm9sbFgob2xkU2Nyb2xsWCk7XG4gICAgICAgIHRoaXMuc2V0U2Nyb2xsWShvbGRTY3JvbGxZKTtcbiAgICAgICAgdGhpcy5pZ25vcmVTY3JvbGxFdmVudHMgPSBmYWxzZTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5jb21wdXRlTWFpbkFyZWFGdWxsSGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJvd0hlaWdodCA9IHRoaXMuZ2V0Um93SGVpZ2h0KDApO1xuICAgIHZhciBudW1Sb3dzID0gdGhpcy5nZXRSb3dDb3VudCgpO1xuICAgIHZhciB0b3RhbEhlaWdodCA9IHJvd0hlaWdodCAqIG51bVJvd3M7XG4gICAgcmV0dXJuIHRvdGFsSGVpZ2h0O1xufTtcblxuR3JpZC5wcm90b3R5cGUuY29tcHV0ZU1haW5BcmVhRnVsbFdpZHRoID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG51bUNvbHMgPSB0aGlzLmdldENvbHVtbkNvdW50KCk7XG4gICAgdmFyIHdpZHRoID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNvbHM7IGkrKykge1xuICAgICAgICB3aWR0aCA9IHdpZHRoICsgdGhpcy5nZXRDb2x1bW5XaWR0aChpKTtcbiAgICB9XG4gICAgcmV0dXJuIHdpZHRoO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc3RvcFJlc2l6ZVRocmVhZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJlc2l6ZUxvb3BSdW5uaW5nID0gZmFsc2U7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5yZXN0YXJ0UmVzaXplVGhyZWFkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHJlc2l6ZUxvb3BSdW5uaW5nKSB7XG4gICAgICAgIHJldHVybjsgLy8gYWxyZWFkeSBydW5uaW5nXG4gICAgfVxuICAgIHJlc2l6ZUxvb3BSdW5uaW5nID0gdHJ1ZTtcbiAgICBzZXRJbnRlcnZhbChyZXNpemFibGVzTG9vcEZ1bmN0aW9uLCAyMDApO1xufTtcblxuR3JpZC5wcm90b3R5cGUuYmVnaW5SZXNpemluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnRpY2tSZXNpemVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuY2hlY2tDYW52YXNCb3VuZHMoKTtcbiAgICB9O1xuICAgIHJlc2l6YWJsZXMucHVzaCh0aGlzLnRpY2tSZXNpemVyKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnN0b3BSZXNpemluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJlc2l6YWJsZXMuc3BsaWNlKHJlc2l6YWJsZXMuaW5kZXhPZih0aGlzLnRpY2tSZXNpemVyKSwgMSk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRDb2x1bW4gPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIGNvbHVtbiA9IHRoaXMuZ2V0Q29sdW1ucygpW3hdO1xuICAgIHJldHVybiBjb2x1bW47XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2YXIgbW9kZWwgPSB0aGlzLmdldE1vZGVsKCk7XG4gICAgdmFyIGNvbHVtbiA9IHRoaXMuZ2V0Q29sdW1ucygpW3hdO1xuICAgIHZhciBmaWVsZCA9IGNvbHVtbi5nZXRGaWVsZCgpO1xuICAgIHZhciB2YWx1ZSA9IG1vZGVsLmdldFZhbHVlKGZpZWxkLCB5KTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRCb3VuZHNPZkNlbGwgPSBmdW5jdGlvbih4LCB5LCB4T2Zmc2V0LCB5T2Zmc2V0KSB7XG4gICAgeE9mZnNldCA9IHhPZmZzZXQgfHwgMDtcbiAgICB5T2Zmc2V0ID0geU9mZnNldCB8fCAwO1xuICAgIHZhciByeCwgcnksIHJ3aWR0aCwgcmhlaWdodDtcbiAgICB2YXIgcm93SGVpZ2h0ID0gdGhpcy5nZXRSb3dIZWlnaHQoMCk7XG5cbiAgICByeCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAoeCAtIHhPZmZzZXQpOyBpKyspIHtcbiAgICAgICAgcnggPSByeCArIHRoaXMuZ2V0Q29sdW1uV2lkdGgoaSArIHhPZmZzZXQpO1xuICAgIH1cbiAgICByeSA9IHJvd0hlaWdodCAqICh5IC0geU9mZnNldCk7XG4gICAgcndpZHRoID0gdGhpcy5nZXRDb2x1bW5XaWR0aCh4KTtcbiAgICByaGVpZ2h0ID0gcm93SGVpZ2h0O1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHg6IHJ4LFxuICAgICAgICB5OiByeSxcbiAgICAgICAgd2lkdGg6IHJ3aWR0aCxcbiAgICAgICAgaGVpZ2h0OiByaGVpZ2h0XG4gICAgfTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0Rml4ZWRSb3dIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLnJlc29sdmVQcm9wZXJ0eSgnZGVmYXVsdEZpeGVkUm93SGVpZ2h0Jyk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0Q29sdW1uV2lkdGggPSBmdW5jdGlvbih4KSB7XG4gICAgdmFyIGNvbHVtbiA9IHRoaXMuZ2V0Q29sdW1uKHgpO1xuICAgIGlmICghY29sdW1uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVQcm9wZXJ0eSgnZGVmYXVsdENvbHVtbldpZHRoJyk7XG4gICAgfVxuICAgIHZhciB2YWx1ZSA9IGNvbHVtbi5nZXRXaWR0aCgpO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFJvd0hlaWdodCA9IGZ1bmN0aW9uKHkpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLnJlc29sdmVQcm9wZXJ0eSgnZGVmYXVsdFJvd0hlaWdodCcpO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnJlc29sdmVQcm9wZXJ0eSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmdldE9wdGlvbnMoKVtuYW1lXTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRDb2x1bW5Db3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb2x1bW5zID0gdGhpcy5nZXRDb2x1bW5zKCk7XG4gICAgcmV0dXJuIGNvbHVtbnMubGVuZ3RoXG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRSb3dDb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBtb2RlbCA9IHRoaXMuZ2V0TW9kZWwoKTtcbiAgICByZXR1cm4gbW9kZWwuZ2V0Um93Q291bnQoKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmFkZENvbHVtbiA9IGZ1bmN0aW9uKGZpZWxkLCBsYWJlbCwgdHlwZSwgd2lkdGgsIHJlbmRlcmVyKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldENvbHVtbnMoKTtcbiAgICB2YXIgbmV3Q29sID0gbmV3IENvbHVtbih0aGlzLCBmaWVsZCwgbGFiZWwsIHR5cGUsIHdpZHRoLCByZW5kZXJlcik7XG4gICAgY29sdW1ucy5wdXNoKG5ld0NvbCk7XG4gICAgdGhpcy5wYWludEFsbCgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYW52YXMgPSB0aGlzLmdldENhbnZhcygpO1xuICAgIHJldHVybiBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lci5hcHBseShjYW52YXMsIGFyZ3VtZW50cyk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuZ2V0Q2FudmFzKCk7XG4gICAgcmV0dXJuIGNhbnZhcy5yZW1vdmVFdmVudExpc3RlbmVyLmFwcGx5KGNhbnZhcywgYXJndW1lbnRzKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihldmVudFR5cGUpIHtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5nZXRDYW52YXMoKTtcbiAgICB2YXIgZXZ0ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0hUTUxFdmVudHMnKTtcbiAgICBldnQuaW5pdEV2ZW50KGV2ZW50VHlwZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgY2FudmFzLmRpc3BhdGNoRXZlbnQoZXZ0KTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnBhaW50QWxsID0gZnVuY3Rpb24oKSB7XG4gICAgLy92YXIgdmlld3BvcnQgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBjb25maWcgPSB0aGlzLmdldFBhaW50Q29uZmlnKCk7XG4gICAgdmFyIG51bUNvbHMgPSB0aGlzLmdldENvbHVtbkNvdW50KCk7XG4gICAgdmFyIG51bVJvd3MgPSB0aGlzLmdldFJvd0NvdW50KCk7XG5cdHRoaXMucGFpbnRNYWluQXJlYShjb25maWcsIG51bUNvbHMsIG51bVJvd3MpO1xuXHR0aGlzLnBhaW50SGVhZGVycyhjb25maWcsIG51bUNvbHMsIDEpO1xufVxuXG5HcmlkLnByb3RvdHlwZS5wYWludE1haW5BcmVhID0gZnVuY3Rpb24oY29uZmlnLCBudW1Db2xzLCBudW1Sb3dzKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuZ2V0Q29udGV4dCgpO1xuICAgICAgICB2YXIgc2Nyb2xsWCA9IHRoaXMuc2Nyb2xsWDtcbiAgICAgICAgdmFyIHNjcm9sbFkgPSB0aGlzLnNjcm9sbFk7XG4gICAgICAgIHZhciBib3VuZHMgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIHZhciB0b3RhbEhlaWdodCA9IDA7XG4gICAgICAgIHZhciB0b3RhbFdpZHRoID0gMDtcbiAgICAgICAgdmFyIHgsIHksIGR4LCBkeSA9IDA7XG5cbiAgICAgICAgY29udGV4dC5zYXZlKCk7XG5cbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSAnIzk5OTk5OSc7XG4gICAgICAgIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgYm91bmRzLndpZHRoLCBib3VuZHMuaGVpZ2h0KTtcblxuICAgICAgICBmb3IgKHggPSAwOyAoeCArIHNjcm9sbFgpIDwgbnVtQ29scyAmJiB0b3RhbFdpZHRoIDwgYm91bmRzLndpZHRoOyB4KyspIHtcbiAgICAgICAgICAgIHZhciByb3dIZWlnaHQgPSAwO1xuICAgICAgICAgICAgdG90YWxIZWlnaHQgPSAwO1xuICAgICAgICAgICAgZm9yICh5ID0gMDsgKHkgKyBzY3JvbGxZKSA8IG51bVJvd3MgJiYgdG90YWxIZWlnaHQgPCBib3VuZHMuaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZHggPSB4ICsgc2Nyb2xsWDtcbiAgICAgICAgICAgICAgICB2YXIgZHkgPSB5ICsgc2Nyb2xsWTtcbiAgICAgICAgICAgICAgICB0aGlzLnBhaW50Q2VsbChjb250ZXh0LCBkeCwgZHksIGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgcm93SGVpZ2h0ID0gdGhpcy5nZXRSb3dIZWlnaHQoZHkpO1xuICAgICAgICAgICAgICAgIHRvdGFsSGVpZ2h0ID0gdG90YWxIZWlnaHQgKyByb3dIZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY29sV2lkdGggPSB0aGlzLmdldENvbHVtbldpZHRoKGR4KTtcbiAgICAgICAgICAgIHRvdGFsV2lkdGggPSB0b3RhbFdpZHRoICsgY29sV2lkdGg7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlbmRlcmVkUmFuZ2UgPSB7XG4gICAgICAgICAgICBsZWZ0OiBzY3JvbGxYLFxuICAgICAgICAgICAgcmlnaHQ6IHggKyBzY3JvbGxYIC0gMSxcbiAgICAgICAgICAgIHRvcDogc2Nyb2xsWSxcbiAgICAgICAgICAgIGJvdHRvbTogeSArIHNjcm9sbFkgLSAxXG4gICAgICAgIH1cblxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfVxufTtcblxuXG5HcmlkLnByb3RvdHlwZS5wYWludEhlYWRlcnMgPSBmdW5jdGlvbihjb25maWcsIG51bUNvbHMsIG51bVJvd3MpIHtcbiAgICB0cnkge1xuICAgIFx0Y29uZmlnLmhhbGlnbiA9ICdjZW50ZXInO1xuICAgIFx0Y29uZmlnLmNlbGxQYWRkaW5nID0gJzBweCc7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldEhlYWRlckNvbnRleHQoKTtcbiAgICAgICAgdmFyIGJvdW5kcyA9IHRoaXMuZ2V0SGVhZGVyQ2FudmFzKCkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgY29udGV4dC5zYXZlKCk7XG5cbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSAnI2JiYmJiYic7XG4gICAgICAgIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgYm91bmRzLndpZHRoLCBib3VuZHMuaGVpZ2h0KTtcblxuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IG51bUNvbHM7IHgrKykge1xuICAgICAgICAgICAgdGhpcy5wYWludEhlYWRlckNlbGwoY29udGV4dCwgeCwgY29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5wYWludENlbGwgPSBmdW5jdGlvbihjb250ZXh0LCB4LCB5LCBjb25maWcpIHtcbiAgICB2YXIgbW9kZWwgPSB0aGlzLmdldE1vZGVsKCk7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuZ2V0Qm91bmRzT2ZDZWxsKHgsIHksIHRoaXMuc2Nyb2xsWCwgdGhpcy5zY3JvbGxZKTtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW4oeCk7XG4gICAgdmFyIHJlbmRlcmVyID0gY29sdW1uLmdldFJlbmRlcmVyKCk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5nZXRWYWx1ZSh4LCB5KTtcbiAgICBjb25maWcudmFsdWUgPSB2YWx1ZTtcbiAgICBjb25maWcueCA9IHg7XG4gICAgY29uZmlnLnkgPSB5O1xuICAgIGNvbmZpZy5ib3VuZHMgPSBib3VuZHM7XG4gICAgY29uZmlnLnR5cGUgPSAnY2VsbCc7XG4gICAgcmVuZGVyZXIoY29udGV4dCwgY29uZmlnKTtcbn07XG5cblxuR3JpZC5wcm90b3R5cGUucGFpbnRIZWFkZXJDZWxsID0gZnVuY3Rpb24oY29udGV4dCwgeCwgY29uZmlnKSB7XG4gICAgdmFyIHkgPSAwO1xuICAgIHZhciBib3VuZHMgPSB0aGlzLmdldEJvdW5kc09mQ2VsbCh4LCB5LCB0aGlzLnNjcm9sbFgsIDApO1xuICAgIHZhciBjb2x1bW4gPSB0aGlzLmdldENvbHVtbih4KTtcbiAgICB2YXIgcmVuZGVyZXIgPSBjb2x1bW4uZ2V0UmVuZGVyZXIoKTtcbiAgICB2YXIgdmFsdWUgPSBjb2x1bW4uZ2V0TGFiZWwoKTtcbiAgICBjb25maWcudmFsdWUgPSB2YWx1ZTtcbiAgICBjb25maWcueCA9IHg7XG4gICAgY29uZmlnLnkgPSB5O1xuICAgIGNvbmZpZy5ib3VuZHMgPSBib3VuZHM7XG4gICAgY29uZmlnLnR5cGUgPSAnaGVhZGVyJztcbiAgICByZW5kZXJlcihjb250ZXh0LCBjb25maWcpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0RmluYWxQYWdlTG9jYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5maW5hbFBhZ2VMb2NhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZmluYWxQYWdlTG9jYXRpb24gPSB0aGlzLmdldERlZmF1bHRGaW5hbFBhZ2VMb2NhdGlvbigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maW5hbFBhZ2VMb2NhdGlvbjtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldERlZmF1bHRGaW5hbFBhZ2VMb2NhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBteVNpemUgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBudW1Db2xzID0gdGhpcy5nZXRDb2x1bW5Db3VudCgpO1xuICAgIHZhciByb3dIZWlnaHQgPSB0aGlzLmdldFJvd0hlaWdodCgwKTtcbiAgICB2YXIgdG90YWxXaWR0aCA9IDA7XG4gICAgdmFyIG51bVJvd3MgPSBNYXRoLmZsb29yKG15U2l6ZS5oZWlnaHQvcm93SGVpZ2h0KTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQ29sczsgaSsrKSB7XG4gICAgICAgIHZhciBjID0gbnVtQ29scyAtIGkgLSAxO1xuICAgICAgICB2YXIgZWFjaFdpZHRoID0gdGhpcy5nZXRDb2x1bW5XaWR0aChjKTtcbiAgICAgICAgdG90YWxXaWR0aCA9IHRvdGFsV2lkdGggKyBlYWNoV2lkdGg7XG4gICAgICAgIGlmICh0b3RhbFdpZHRoID49IG15U2l6ZS53aWR0aCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIG1heFggPSBudW1Db2xzIC0gaTtcbiAgICB2YXIgbWF4WSA9IE1hdGgubWF4KG1heFgsIHRoaXMuZ2V0Um93Q291bnQoKSAtIG51bVJvd3MpO1xuICAgIHJldHVybiB7eDogbWF4WCwgeTogbWF4WX1cbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFJlbmRlcmVkUm93UmFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJlZFJhbmdlO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0RGVmYXVsdENlbGxSZW5kZXJlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkZWZhdWx0Y2VsbHJlbmRlcmVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQsIG1vZGVsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBHcmlkKGRvbUVsZW1lbnQsIG1vZGVsLCBvcHRpb25zKTtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgR3JpZE1vZGVsID0gZnVuY3Rpb24oanNvbkRhdGEpIHtcblxuICAgIC8vdGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgb3ZlcnJpZGVuIGJ5IGdyaWQgaXRzZWxmO1xuICAgIC8vaWYgY29vcmRpbmF0ZXMgLTEsIC0xIGFyZSB1c2VkLCBpdCBtZWFucyBcbiAgICAvL3JlcGFpbnQgdGhlIHdob2xlIHZpc2libGUgZ3JpZFxuICAgIHRoaXMuY2hhbmdlZCA9IGZ1bmN0aW9uKHgsIHkpIHt9O1xuXG4gICAgdGhpcy5nZXREYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBqc29uRGF0YTtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXREYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBqc29uRGF0YSA9IGRhdGE7XG4gICAgfVxuXG59O1xuXG5HcmlkTW9kZWwucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oZmllbGQsIHkpIHtcbiAgICB2YXIgb2JqID0gdGhpcy5nZXREYXRhKClbeV07XG4gICAgdmFyIHZhbHVlID0gb2JqW2ZpZWxkXTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5HcmlkTW9kZWwucHJvdG90eXBlLmdldFJvdyA9IGZ1bmN0aW9uKHkpIHtcbiAgICByZXR1cm4gdGhpcy5nZXREYXRhKClbeV07XG59O1xuXG5HcmlkTW9kZWwucHJvdG90eXBlLmdldFJvd0NvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGF0YSgpLmxlbmd0aDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JpZE1vZGVsOyJdfQ==
