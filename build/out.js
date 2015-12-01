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
},{"./components/grid.js":8,"./components/gridmodel.js":9,"underscore":4}],2:[function(require,module,exports){
'use strict';

/* eslint-env node, browser */

(function (module) {  // eslint-disable-line no-unused-expressions

    // This closure supports NodeJS-less client side includes with <script> tags. See https://github.com/joneit/mnm.

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
                case 'cssStylesheetReferenceElement':
                    cssInjector(option);
                    break;

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

    /**
     * @summary Insert base stylesheet into DOM
     * @private
     * @param {Element} [referenceElement]
     * if `undefined` (or omitted) or `null`, injects stylesheet at top or bottom of <head>, respectively, but only once;
     * otherwise, injects stylesheet immediately before given element
     */
    function cssInjector(referenceElement) {
        var container, style, ID = 'finbars-base-styles';

        if (
            !cssInjector.text || // no stylesheet data
            document.getElementById(ID) // stylesheet already in DOM
        ) {
            return;
        }

        if (typeof referenceElement === 'string') {
            referenceElement = document.querySelector(referenceElement);
            if (referenceElement) {
                referenceElement = referenceElement[0];
            } else {
                error('Cannot find reference element for CSS injection.');
            }
        }

        if (!(referenceElement instanceof Element)) {
            referenceElement = undefined;
        }
        style = document.createElement('style');
        style.type = 'text/css';
        style.id = ID;
        if (style.styleSheet) {
            style.styleSheet.cssText = cssInjector.text;
        } else {
            style.appendChild(document.createTextNode(cssInjector.text));
        }

        container = referenceElement && referenceElement.parentNode || document.head || document.getElementsByTagName('head')[0];

        if (referenceElement === undefined) {
            referenceElement = container.firstChild;
        }

        container.insertBefore(style, referenceElement);
    }
    /* inject:css */
    cssInjector.text = 'div.finbar-horizontal,div.finbar-vertical{position:absolute;margin:3px}div.finbar-horizontal>.thumb,div.finbar-vertical>.thumb{position:absolute;background-color:#d3d3d3;-webkit-box-shadow:0 0 1px #000;-moz-box-shadow:0 0 1px #000;box-shadow:0 0 1px #000;border-radius:4px;margin:2px;opacity:.4;transition:opacity .5s}div.finbar-horizontal>.thumb.hover,div.finbar-vertical>.thumb.hover{opacity:1;transition:opacity .5s}div.finbar-vertical{top:0;bottom:0;right:0;width:11px}div.finbar-vertical>.thumb{top:0;right:0;width:7px}div.finbar-horizontal{left:0;right:0;bottom:0;height:11px}div.finbar-horizontal>.thumb{left:0;bottom:0;height:7px}';
    /* endinject */

    function error(msg) {
        throw 'finbars: ' + msg;
    }

    // Interface
    module.exports = FinBar;
})(
    typeof module === 'object' && module || (window.FinBar = {}),
    typeof module === 'object' && module.exports || (window.FinBar.exports = {})
) || (
    typeof module === 'object' || (window.FinBar = window.FinBar.exports)
);

/* About the above IIFE:
 * This file is a "modified node module." It functions as usual in Node.js *and* is also usable directly in the browser.
 * 1. Node.js: The IIFE is superfluous but innocuous.
 * 2. In the browser: The IIFE closure serves to keep internal declarations private.
 * 2.a. In the browser as a global: The logic in the actual parameter expressions + the post-invocation expression
 * will put your API in `window.FinBar`.
 * 2.b. In the browser as a module: If you predefine a `window.module` object, the results will be in `module.exports`.
 * The bower component `mnm` makes this easy and also provides a global `require()` function for referencing your module
 * from other closures. In either case, this works with both NodeJs-style export mechanisms -- a single API assignment,
 * `module.exports = yourAPI` *or* a series of individual property assignments, `module.exports.property = property`.
 *
 * Before the IIFE runs, the actual parameter expressions are executed:
 * 1. If `module` object defined, we're in NodeJs so assume there is a `module` object with an `exports` object
 * 2. If `module` object undefined, we're in browser so define a `window.FinBar` object with an `exports` object
 *
 * After the IIFE returns:
 * Because it always returns undefined, the expression after the || will always execute:
 * 1. If `module` object defined, then we're in NodeJs so we're done
 * 2. If `module` object undefined, then we're in browser so redefine`window.FinBar` as its `exports` object
 */

},{}],3:[function(require,module,exports){
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
  if (!hOP(this._cache, key)) return false
  var hit = this._cache[key]
  if (isStale(this, hit)) {
    return false
  }
  return true
}

LRUCache.prototype.get = function (key) {
  return get(this, key, true)
}

LRUCache.prototype.peek = function (key) {
  return get(this, key, false)
}

LRUCache.prototype.pop = function () {
  var hit = this._lruList[this._lru]
  del(this, hit)
  return hit || null
}

LRUCache.prototype.del = function (key) {
  del(this, this._cache[key])
}

LRUCache.prototype.load = function (arr) {
  //reset the cache
  this.reset();

  var now = Date.now()
  //A previous serialized cache has the most recent items first
  for (var l = arr.length - 1; l >= 0; l-- ) {
    var hit = arr[l]
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

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

        if ( ( resizing || (borderHit !== -1)) && !reordering ) {
            divHeader.style.cursor = 'col-resize';
            console.log('col-resize');
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
},{}],6:[function(require,module,exports){
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
},{"./defaultcellrenderer.js":7}],7:[function(require,module,exports){
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
    var textWidth = config.getTextWidth(gc, value);
    var fontMetrics = config.getTextHeight(font);

    if (gc.font !== config.font) {
        gc.font = config.font;
    }
    if (gc.textAlign !== 'left') {
        gc.textAlign = 'left';
    }
    if (gc.textBaseline !== 'middle') {
        gc.textBaseline = 'middle';
    }

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
},{}],8:[function(require,module,exports){
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
        for (var x = 0; (x + scrollX) < numCols && totalWidth < bounds.width; x++) {
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


},{"../../../node_modules/finbars/index.js":2,"../../../node_modules/lru-cache/lib/lru-cache.js":3,"./col-reorder.js":5,"./column.js":6,"./defaultcellrenderer.js":7}],9:[function(require,module,exports){
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

GridModel.prototype.getRowCount = function() {
    return this.getData().length;
};

module.exports = GridModel;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvamF2YXNjcmlwdC9tYWluLmpzIiwibm9kZV9tb2R1bGVzL2ZpbmJhcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbHJ1LWNhY2hlL2xpYi9scnUtY2FjaGUuanMiLCJub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9jb2wtcmVvcmRlci5qcyIsInNyYy9qYXZhc2NyaXB0L2NvbXBvbmVudHMvY29sdW1uLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9kZWZhdWx0Y2VsbHJlbmRlcmVyLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9ncmlkLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9ncmlkbW9kZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDejJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9uQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIF8gPSByZXF1aXJlKCd1bmRlcnNjb3JlJyk7XG5cbnZhciBncmlkID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL2dyaWQuanMnKTtcbnZhciBHcmlkTW9kZWwgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ3JpZG1vZGVsLmpzJyk7XG5cbmlmICghd2luZG93LmZpbikge1xuICAgIHdpbmRvdy5maW4gPSB7fTtcbn1cblxud2luZG93LmZpbi5oeXBlcmdyaWRsaXRlID0ge1xuICAgIGNyZWF0ZU9uOiBncmlkLFxuICAgIEdyaWRNb2RlbDogR3JpZE1vZGVsXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5mb28gPSAnZm9vJzsiLCIndXNlIHN0cmljdCc7XG5cbi8qIGVzbGludC1lbnYgbm9kZSwgYnJvd3NlciAqL1xuXG4oZnVuY3Rpb24gKG1vZHVsZSkgeyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bnVzZWQtZXhwcmVzc2lvbnNcblxuICAgIC8vIFRoaXMgY2xvc3VyZSBzdXBwb3J0cyBOb2RlSlMtbGVzcyBjbGllbnQgc2lkZSBpbmNsdWRlcyB3aXRoIDxzY3JpcHQ+IHRhZ3MuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vam9uZWl0L21ubS5cblxuICAgIC8qKlxuICAgICAqIEBjb25zdHJ1Y3RvciBGaW5CYXJcbiAgICAgKiBAc3VtbWFyeSBDcmVhdGUgYSBzY3JvbGxiYXIgb2JqZWN0LlxuICAgICAqIEBkZXNjIENyZWF0aW5nIGEgc2Nyb2xsYmFyIGlzIGEgdGhyZWUtc3RlcCBwcm9jZXNzOlxuICAgICAqXG4gICAgICogMS4gSW5zdGFudGlhdGUgdGhlIHNjcm9sbGJhciBvYmplY3QgYnkgY2FsbGluZyB0aGlzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLiBVcG9uIGluc3RhbnRpYXRpb24sIHRoZSBET00gZWxlbWVudCBmb3IgdGhlIHNjcm9sbGJhciAod2l0aCBhIHNpbmdsZSBjaGlsZCBlbGVtZW50IGZvciB0aGUgc2Nyb2xsYmFyIFwidGh1bWJcIikgaXMgY3JlYXRlZCBidXQgaXMgbm90IGluc2VydCBpdCBpbnRvIHRoZSBET00uXG4gICAgICogMi4gQWZ0ZXIgaW5zdGFudGlhdGlvbiwgaXQgaXMgdGhlIGNhbGxlcidzIHJlc3BvbnNpYmlsaXR5IHRvIGluc2VydCB0aGUgc2Nyb2xsYmFyLCB7QGxpbmsgRmluQmFyI2Jhcnx0aGlzLmJhcn0sIGludG8gdGhlIERPTS5cbiAgICAgKiAzLiBBZnRlciBpbnNlcnRpb24sIHRoZSBjYWxsZXIgbXVzdCBjYWxsIHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfSBhdCBsZWFzdCBvbmNlIHRvIHNpemUgYW5kIHBvc2l0aW9uIHRoZSBzY3JvbGxiYXIgYW5kIGl0cyB0aHVtYi4gQWZ0ZXIgdGhhdCwgYHJlc2l6ZSgpYCBzaG91bGQgYWxzbyBiZSBjYWxsZWQgcmVwZWF0ZWRseSBvbiByZXNpemUgZXZlbnRzIChhcyB0aGUgY29udGVudCBlbGVtZW50IGlzIGJlaW5nIHJlc2l6ZWQpLlxuICAgICAqXG4gICAgICogU3VnZ2VzdGVkIGNvbmZpZ3VyYXRpb25zOlxuICAgICAqICogXyoqVW5ib3VuZCoqXzxici8+XG4gICAgICogVGhlIHNjcm9sbGJhciBzZXJ2ZXMgbWVyZWx5IGFzIGEgc2ltcGxlIHJhbmdlIChzbGlkZXIpIGNvbnRyb2wuIE9taXQgYm90aCBgb3B0aW9ucy5vbmNoYW5nZWAgYW5kIGBvcHRpb25zLmNvbnRlbnRgLlxuICAgICAqICogXyoqQm91bmQgdG8gdmlydHVhbCBjb250ZW50IGVsZW1lbnQqKl88YnIvPlxuICAgICAqIFZpcnR1YWwgY29udGVudCBpcyBwcm9qZWN0ZWQgaW50byB0aGUgZWxlbWVudCB1c2luZyBhIGN1c3RvbSBldmVudCBoYW5kbGVyIHN1cHBsaWVkIGJ5IHRoZSBwcm9ncmFtbWVyIGluIGBvcHRpb25zLm9uY2hhbmdlYC4gQSB0eXBpY2FsIHVzZSBjYXNlIHdvdWxkIGJlIHRvIGhhbmRsZSBzY3JvbGxpbmcgb2YgdGhlIHZpcnR1YWwgY29udGVudC4gT3RoZXIgdXNlIGNhc2VzIGluY2x1ZGUgZGF0YSB0cmFuc2Zvcm1hdGlvbnMsIGdyYXBoaWNzIHRyYW5zZm9ybWF0aW9ucywgX2V0Yy5fXG4gICAgICogKiBfKipCb3VuZCB0byByZWFsIGNvbnRlbnQqKl88YnIvPlxuICAgICAqIFNldCBgb3B0aW9ucy5jb250ZW50YCB0byB0aGUgXCJyZWFsXCIgY29udGVudCBlbGVtZW50IGJ1dCBvbWl0IGBvcHRpb25zLm9uY2hhbmdlYC4gVGhpcyB3aWxsIGNhdXNlIHRoZSBzY3JvbGxiYXIgdG8gdXNlIHRoZSBidWlsdC1pbiBldmVudCBoYW5kbGVyIChgdGhpcy5zY3JvbGxSZWFsQ29udGVudGApIHdoaWNoIGltcGxlbWVudHMgc21vb3RoIHNjcm9sbGluZyBvZiB0aGUgY29udGVudCBlbGVtZW50IHdpdGhpbiB0aGUgY29udGFpbmVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtmaW5iYXJPcHRpb25zfSBbb3B0aW9ucz17fV0gLSBPcHRpb25zIG9iamVjdC4gU2VlIHRoZSB0eXBlIGRlZmluaXRpb24gZm9yIG1lbWJlciBkZXRhaWxzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEZpbkJhcihvcHRpb25zKSB7XG5cbiAgICAgICAgLy8gbWFrZSBib3VuZCB2ZXJzaW9ucyBvZiBhbGwgdGhlIG1vdXNlIGV2ZW50IGhhbmRsZXJcbiAgICAgICAgdmFyIGJvdW5kID0gdGhpcy5fYm91bmQgPSB7fTtcbiAgICAgICAgZm9yIChrZXkgaW4gaGFuZGxlcnNUb0JlQm91bmQpIHtcbiAgICAgICAgICAgIGJvdW5kW2tleV0gPSBoYW5kbGVyc1RvQmVCb3VuZFtrZXldLmJpbmQodGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQG5hbWUgdGh1bWJcbiAgICAgICAgICogQHN1bW1hcnkgVGhlIGdlbmVyYXRlZCBzY3JvbGxiYXIgdGh1bWIgZWxlbWVudC5cbiAgICAgICAgICogQGRlc2MgVGhlIHRodW1iIGVsZW1lbnQncyBwYXJlbnQgZWxlbWVudCBpcyBhbHdheXMgdGhlIHtAbGluayBGaW5CYXIjYmFyfGJhcn0gZWxlbWVudC5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBwcm9wZXJ0eSBpcyB0eXBpY2FsbHkgcmVmZXJlbmNlZCBpbnRlcm5hbGx5IG9ubHkuIFRoZSBzaXplIGFuZCBwb3NpdGlvbiBvZiB0aGUgdGh1bWIgZWxlbWVudCBpcyBtYWludGFpbmVkIGJ5IGBfY2FsY1RodW1iKClgLlxuICAgICAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHZhciB0aHVtYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aHVtYi5jbGFzc0xpc3QuYWRkKCd0aHVtYicpO1xuICAgICAgICB0aHVtYi5vbmNsaWNrID0gYm91bmQuc2hvcnRTdG9wO1xuICAgICAgICB0aHVtYi5vbm1vdXNlb3ZlciA9IGJvdW5kLm9ubW91c2VvdmVyO1xuICAgICAgICB0aGlzLnRodW1iID0gdGh1bWI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuYW1lIGJhclxuICAgICAgICAgKiBAc3VtbWFyeSBUaGUgZ2VuZXJhdGVkIHNjcm9sbGJhciBlbGVtZW50LlxuICAgICAgICAgKiBAZGVzYyBUaGUgY2FsbGVyIGluc2VydHMgdGhpcyBlbGVtZW50IGludG8gdGhlIERPTSAodHlwaWNhbGx5IGludG8gdGhlIGNvbnRlbnQgY29udGFpbmVyKSBhbmQgdGhlbiBjYWxscyBpdHMge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9IG1ldGhvZC5cbiAgICAgICAgICpcbiAgICAgICAgICogVGh1cyB0aGUgbm9kZSB0cmVlIGlzIHR5cGljYWxseTpcbiAgICAgICAgICogKiBBICoqY29udGVudCBjb250YWluZXIqKiBlbGVtZW50LCB3aGljaCBjb250YWluczpcbiAgICAgICAgICogICAgKiBUaGUgY29udGVudCBlbGVtZW50KHMpXG4gICAgICAgICAqICAgICogVGhpcyAqKnNjcm9sbGJhciBlbGVtZW50KiosIHdoaWNoIGluIHR1cm4gY29udGFpbnM6XG4gICAgICAgICAqICAgICAgICAqIFRoZSAqKnRodW1iIGVsZW1lbnQqKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7RWxlbWVudH1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHZhciBiYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICBiYXIuY2xhc3NMaXN0LmFkZCgnZmluYmFyLXZlcnRpY2FsJyk7XG5cbiAgICAgICAgYmFyLmFwcGVuZENoaWxkKHRodW1iKTtcbiAgICAgICAgaWYgKHRoaXMucGFnaW5nKSB7XG4gICAgICAgICAgICBiYXIub25jbGljayA9IGJvdW5kLm9uY2xpY2s7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5iYXIgPSBiYXI7XG5cbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgLy8gcHJlc2V0c1xuICAgICAgICB0aGlzLm9yaWVudGF0aW9uID0gJ3ZlcnRpY2FsJztcbiAgICAgICAgdGhpcy5fbWluID0gdGhpcy5faW5kZXggPSAwO1xuICAgICAgICB0aGlzLl9tYXggPSAxMDA7XG5cbiAgICAgICAgLy8gb3B0aW9uc1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb24gPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdjc3NTdHlsZXNoZWV0UmVmZXJlbmNlRWxlbWVudCc6XG4gICAgICAgICAgICAgICAgICAgIGNzc0luamVjdG9yKG9wdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnaW5kZXgnOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9pbmRleCA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdyYW5nZSc6XG4gICAgICAgICAgICAgICAgICAgIHZhbGlkUmFuZ2Uob3B0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWluID0gb3B0aW9uLm1pbjtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWF4ID0gb3B0aW9uLm1heDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250ZW50U2l6ZSA9IG9wdGlvbi5tYXggLSBvcHRpb24ubWluICsgMTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkuY2hhckF0KDApICE9PSAnXycgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBGaW5CYXIucHJvdG90eXBlW2tleV0gIT09ICdmdW5jdGlvbidcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvdmVycmlkZSBwcm90b3R5cGUgZGVmYXVsdHMgZm9yIHN0YW5kYXJkIDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGV4dGVuZCB3aXRoIGFkZGl0aW9uYWwgcHJvcGVydGllcyAoZm9yIHVzZSBpbiBvbmNoYW5nZSBldmVudCBoYW5kbGVycylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5XSA9IG9wdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBGaW5CYXIucHJvdG90eXBlID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAc3VtbWFyeSBUaGUgc2Nyb2xsYmFyIG9yaWVudGF0aW9uLlxuICAgICAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yIHRvIGVpdGhlciBgJ3ZlcnRpY2FsJ2Agb3IgYCdob3Jpem9udGFsJ2AuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBVc2VmdWwgdmFsdWVzIGFyZSBgJ3ZlcnRpY2FsJ2AgKHRoZSBkZWZhdWx0KSBvciBgJ2hvcml6b250YWwnYC5cbiAgICAgICAgICpcbiAgICAgICAgICogU2V0dGluZyB0aGlzIHByb3BlcnR5IHJlc2V0cyBgdGhpcy5vaGAgYW5kIGB0aGlzLmRlbHRhUHJvcGAgYW5kIGNoYW5nZXMgdGhlIGNsYXNzIG5hbWVzIHNvIGFzIHRvIHJlcG9zaXRpb24gdGhlIHNjcm9sbGJhciBhcyBwZXIgdGhlIENTUyBydWxlcyBmb3IgdGhlIG5ldyBvcmllbnRhdGlvbi5cbiAgICAgICAgICogQGRlZmF1bHQgJ3ZlcnRpY2FsJ1xuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgc2V0IG9yaWVudGF0aW9uKG9yaWVudGF0aW9uKSB7XG4gICAgICAgICAgICBpZiAob3JpZW50YXRpb24gPT09IHRoaXMuX29yaWVudGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9vcmllbnRhdGlvbiA9IG9yaWVudGF0aW9uO1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEByZWFkb25seVxuICAgICAgICAgICAgICogQG5hbWUgb2hcbiAgICAgICAgICAgICAqIEBzdW1tYXJ5IDx1Pk88L3U+cmllbnRhdGlvbiA8dT5oPC91PmFzaCBmb3IgdGhpcyBzY3JvbGxiYXIuXG4gICAgICAgICAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGBvcmllbnRhdGlvbmAgc2V0dGVyIHRvIGVpdGhlciB0aGUgdmVydGljYWwgb3IgdGhlIGhvcml6b250YWwgb3JpZW50YXRpb24gaGFzaC4gVGhlIHByb3BlcnR5IHNob3VsZCBhbHdheXMgYmUgc3luY2hyb25pemVkIHdpdGggYG9yaWVudGF0aW9uYDsgZG8gbm90IHVwZGF0ZSBkaXJlY3RseSFcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBUaGlzIG9iamVjdCBpcyB1c2VkIGludGVybmFsbHkgdG8gYWNjZXNzIHNjcm9sbGJhcnMnIERPTSBlbGVtZW50IHByb3BlcnRpZXMgaW4gYSBnZW5lcmFsaXplZCB3YXkgd2l0aG91dCBuZWVkaW5nIHRvIGNvbnN0YW50bHkgcXVlcnkgdGhlIHNjcm9sbGJhciBvcmllbnRhdGlvbi4gRm9yIGV4YW1wbGUsIGluc3RlYWQgb2YgZXhwbGljaXRseSBjb2RpbmcgYHRoaXMuYmFyLnRvcGAgZm9yIGEgdmVydGljYWwgc2Nyb2xsYmFyIGFuZCBgdGhpcy5iYXIubGVmdGAgZm9yIGEgaG9yaXpvbnRhbCBzY3JvbGxiYXIsIHNpbXBseSBjb2RlIGB0aGlzLmJhclt0aGlzLm9oLmxlYWRpbmddYCBpbnN0ZWFkLiBTZWUgdGhlIHtAbGluayBvcmllbnRhdGlvbkhhc2hUeXBlfSBkZWZpbml0aW9uIGZvciBkZXRhaWxzLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIFRoaXMgb2JqZWN0IGlzIHVzZWZ1bCBleHRlcm5hbGx5IGZvciBjb2RpbmcgZ2VuZXJhbGl6ZWQge0BsaW5rIGZpbmJhck9uQ2hhbmdlfSBldmVudCBoYW5kbGVyIGZ1bmN0aW9ucyB0aGF0IHNlcnZlIGJvdGggaG9yaXpvbnRhbCBhbmQgdmVydGljYWwgc2Nyb2xsYmFycy5cbiAgICAgICAgICAgICAqIEB0eXBlIHtvcmllbnRhdGlvbkhhc2hUeXBlfVxuICAgICAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5vaCA9IG9yaWVudGF0aW9uSGFzaGVzW3RoaXMuX29yaWVudGF0aW9uXTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLm9oKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoJ0ludmFsaWQgdmFsdWUgZm9yIGBvcHRpb25zLl9vcmllbnRhdGlvbi4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBAbmFtZSBkZWx0YVByb3BcbiAgICAgICAgICAgICAqIEBzdW1tYXJ5IFRoZSBuYW1lIG9mIHRoZSBgV2hlZWxFdmVudGAgcHJvcGVydHkgdGhpcyBzY3JvbGxiYXIgc2hvdWxkIGxpc3RlbiB0by5cbiAgICAgICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIFVzZWZ1bCB2YWx1ZXMgYXJlIGAnZGVsdGFYJ2AsIGAnZGVsdGFZJ2AsIG9yIGAnZGVsdGFaJ2AuIEEgdmFsdWUgb2YgYG51bGxgIG1lYW5zIHRvIGlnbm9yZSBtb3VzZSB3aGVlbCBldmVudHMgZW50aXJlbHkuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogVGhlIG1vdXNlIHdoZWVsIGlzIG9uZS1kaW1lbnNpb25hbCBhbmQgb25seSBlbWl0cyBldmVudHMgd2l0aCBgZGVsdGFZYCBkYXRhLiBUaGlzIHByb3BlcnR5IGlzIHByb3ZpZGVkIHNvIHRoYXQgeW91IGNhbiBvdmVycmlkZSB0aGUgZGVmYXVsdCBvZiBgJ2RlbHRhWCdgIHdpdGggYSB2YWx1ZSBvZiBgJ2RlbHRhWSdgIG9uIHlvdXIgaG9yaXpvbnRhbCBzY3JvbGxiYXIgcHJpbWFyaWx5IHRvIGFjY29tbW9kYXRlIGNlcnRhaW4gXCJwYW5vcmFtaWNcIiBpbnRlcmZhY2UgZGVzaWducyB3aGVyZSB0aGUgbW91c2Ugd2hlZWwgc2hvdWxkIGNvbnRyb2wgaG9yaXpvbnRhbCByYXRoZXIgdGhhbiB2ZXJ0aWNhbCBzY3JvbGxpbmcuIEp1c3QgZ2l2ZSBgeyBkZWx0YVByb3A6ICdkZWx0YVknIH1gIGluIHlvdXIgaG9yaXpvbnRhbCBzY3JvbGxiYXIgaW5zdGFudGlhdGlvbi5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBDYXZlYXQ6IE5vdGUgdGhhdCBhIDItZmluZ2VyIGRyYWcgb24gYW4gQXBwbGUgdHJhY2twYWQgZW1pdHMgZXZlbnRzIHdpdGggX2JvdGhfIGBkZWx0YVggYCBhbmQgYGRlbHRhWWAgZGF0YSBzbyB5b3UgbWlnaHQgd2FudCB0byBkZWxheSBtYWtpbmcgdGhlIGFib3ZlIGFkanVzdG1lbnQgdW50aWwgeW91IGNhbiBkZXRlcm1pbmUgdGhhdCB5b3UgYXJlIGdldHRpbmcgWSBkYXRhIG9ubHkgd2l0aCBubyBYIGRhdGEgYXQgYWxsICh3aGljaCBpcyBhIHN1cmUgYmV0IHlvdSBvbiBhIG1vdXNlIHdoZWVsIHJhdGhlciB0aGFuIGEgdHJhY2twYWQpLlxuXG4gICAgICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLmRlbHRhUHJvcCA9IHRoaXMub2guZGVsdGE7XG5cbiAgICAgICAgICAgIHRoaXMuYmFyLmNsYXNzTmFtZSA9IHRoaXMuYmFyLmNsYXNzTmFtZS5yZXBsYWNlKC8odmVydGljYWx8aG9yaXpvbnRhbCkvZywgb3JpZW50YXRpb24pO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5iYXIuc3R5bGUuY3NzVGV4dCB8fCB0aGlzLnRodW1iLnN0eWxlLmNzc1RleHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJhci5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICAgICAgICAgICAgdGhpcy50aHVtYi5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXNpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0IG9yaWVudGF0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29yaWVudGF0aW9uO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAc3VtbWFyeSBDYWxsYmFjayBmb3Igc2Nyb2xsIGV2ZW50cy5cbiAgICAgICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3RvciB2aWEgdGhlIHNpbWlsYXJseSBuYW1lZCBwcm9wZXJ0eSBpbiB0aGUge0BsaW5rIGZpbmJhck9wdGlvbnN9IG9iamVjdC4gQWZ0ZXIgaW5zdGFudGlhdGlvbiwgYHRoaXMub25jaGFuZ2VgIG1heSBiZSB1cGRhdGVkIGRpcmVjdGx5LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGlzIGV2ZW50IGhhbmRsZXIgaXMgY2FsbGVkIHdoZW5ldmVyIHRoZSB2YWx1ZSBvZiB0aGUgc2Nyb2xsYmFyIGlzIGNoYW5nZWQgdGhyb3VnaCB1c2VyIGludGVyYWN0aW9uLiBUaGUgdHlwaWNhbCB1c2UgY2FzZSBpcyB3aGVuIHRoZSBjb250ZW50IGlzIHNjcm9sbGVkLiBJdCBpcyBjYWxsZWQgd2l0aCB0aGUgYEZpbkJhcmAgb2JqZWN0IGFzIGl0cyBjb250ZXh0IGFuZCB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgc2Nyb2xsYmFyIChpdHMgaW5kZXgsIHJvdW5kZWQpIGFzIHRoZSBvbmx5IHBhcmFtZXRlci5cbiAgICAgICAgICpcbiAgICAgICAgICogU2V0IHRoaXMgcHJvcGVydHkgdG8gYG51bGxgIHRvIHN0b3AgZW1pdHRpbmcgc3VjaCBldmVudHMuXG4gICAgICAgICAqIEB0eXBlIHtmdW5jdGlvbihudW1iZXIpfG51bGx9XG4gICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICBvbmNoYW5nZTogbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHN1bW1hcnkgQWRkIGEgQ1NTIGNsYXNzIG5hbWUgdG8gdGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdC5cbiAgICAgICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3Qgd2lsbCBhbHdheXMgaW5jbHVkZSBgZmluYmFyLXZlcnRpY2FsYCAob3IgYGZpbmJhci1ob3Jpem9udGFsYCBiYXNlZCBvbiB0aGUgY3VycmVudCBvcmllbnRhdGlvbikuIFdoZW5ldmVyIHRoaXMgcHJvcGVydHkgaXMgc2V0IHRvIHNvbWUgdmFsdWUsIGZpcnN0IHRoZSBvbGQgcHJlZml4K29yaWVudGF0aW9uIGlzIHJlbW92ZWQgZnJvbSB0aGUgYmFyIGVsZW1lbnQncyBjbGFzcyBsaXN0OyB0aGVuIHRoZSBuZXcgcHJlZml4K29yaWVudGF0aW9uIGlzIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoaXMgcHJvcGVydHkgY2F1c2VzIF9hbiBhZGRpdGlvbmFsXyBjbGFzcyBuYW1lIHRvIGJlIGFkZGVkIHRvIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3QuIFRoZXJlZm9yZSwgdGhpcyBwcm9wZXJ0eSB3aWxsIG9ubHkgYWRkIGF0IG1vc3Qgb25lIGFkZGl0aW9uYWwgY2xhc3MgbmFtZSB0byB0aGUgbGlzdC5cbiAgICAgICAgICpcbiAgICAgICAgICogVG8gcmVtb3ZlIF9jbGFzc25hbWUtb3JpZW50YXRpb25fIGZyb20gdGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdCwgc2V0IHRoaXMgcHJvcGVydHkgdG8gYSBmYWxzeSB2YWx1ZSwgc3VjaCBhcyBgbnVsbGAuXG4gICAgICAgICAqXG4gICAgICAgICAqID4gTk9URTogWW91IG9ubHkgbmVlZCB0byBzcGVjaWZ5IGFuIGFkZGl0aW9uYWwgY2xhc3MgbmFtZSB3aGVuIHlvdSBuZWVkIHRvIGhhdmUgbXVsbHRpcGxlIGRpZmZlcmVudCBzdHlsZXMgb2Ygc2Nyb2xsYmFycyBvbiB0aGUgc2FtZSBwYWdlLiBJZiB0aGlzIGlzIG5vdCBhIHJlcXVpcmVtZW50LCB0aGVuIHlvdSBkb24ndCBuZWVkIHRvIG1ha2UgYSBuZXcgY2xhc3M7IHlvdSB3b3VsZCBqdXN0IGNyZWF0ZSBzb21lIGFkZGl0aW9uYWwgcnVsZXMgdXNpbmcgdGhlIHNhbWUgc2VsZWN0b3JzIGluIHRoZSBidWlsdC1pbiBzdHlsZXNoZWV0ICguLi9jc3MvZmluYmFycy5jc3MpOlxuICAgICAgICAgKiAqYGRpdi5maW5iYXItdmVydGljYWxgIChvciBgZGl2LmZpbmJhci1ob3Jpem9udGFsYCkgZm9yIHRoZSBzY3JvbGxiYXJcbiAgICAgICAgICogKmBkaXYuZmluYmFyLXZlcnRpY2FsID4gZGl2YCAob3IgYGRpdi5maW5iYXItaG9yaXpvbnRhbCA+IGRpdmApIGZvciB0aGUgXCJ0aHVtYi5cIlxuICAgICAgICAgKlxuICAgICAgICAgKiBPZiBjb3Vyc2UsIHlvdXIgcnVsZXMgc2hvdWxkIGNvbWUgYWZ0ZXIgdGhlIGJ1aWx0LWlucy5cbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHNldCBjbGFzc1ByZWZpeChwcmVmaXgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9jbGFzc1ByZWZpeCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYmFyLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5fY2xhc3NQcmVmaXggKyB0aGlzLm9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fY2xhc3NQcmVmaXggPSBwcmVmaXg7XG5cbiAgICAgICAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJhci5jbGFzc0xpc3QuYWRkKHByZWZpeCArICctJyArIHRoaXMub3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXQgY2xhc3NQcmVmaXgoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY2xhc3NQcmVmaXg7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuYW1lIGluY3JlbWVudFxuICAgICAgICAgKiBAc3VtbWFyeSBOdW1iZXIgb2Ygc2Nyb2xsYmFyIGluZGV4IHVuaXRzIHJlcHJlc2VudGluZyBhIHBhZ2VmdWwuIFVzZWQgZXhjbHVzaXZlbHkgZm9yIHBhZ2luZyB1cCBhbmQgZG93biBhbmQgZm9yIHNldHRpbmcgdGh1bWIgc2l6ZSByZWxhdGl2ZSB0byBjb250ZW50IHNpemUuXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBDYW4gYWxzbyBiZSBnaXZlbiBhcyBhIHBhcmFtZXRlciB0byB0aGUge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplfSBtZXRob2QsIHdoaWNoIGlzIHBlcnRpbmVudCBiZWNhdXNlIGNvbnRlbnQgYXJlYSBzaXplIGNoYW5nZXMgYWZmZWN0IHRoZSBkZWZpbml0aW9uIG9mIGEgXCJwYWdlZnVsLlwiIEhvd2V2ZXIsIHlvdSBvbmx5IG5lZWQgdG8gZG8gdGhpcyBpZiB0aGlzIHZhbHVlIGlzIGJlaW5nIHVzZWQuIEl0IG5vdCB1c2VkIHdoZW46XG4gICAgICAgICAqICogeW91IGRlZmluZSBgcGFnaW5nLnVwYCBhbmQgYHBhZ2luZy5kb3duYFxuICAgICAgICAgKiAqIHlvdXIgc2Nyb2xsYmFyIGlzIHVzaW5nIGBzY3JvbGxSZWFsQ29udGVudGBcbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIGluY3JlbWVudDogMSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQG5hbWUgYmFyU3R5bGVzXG4gICAgICAgICAqIEBzdW1tYXJ5IFNjcm9sbGJhciBzdHlsZXMgdG8gYmUgYXBwbGllZCBieSB7QGxpbmsgRmluQmFyI3Jlc2l6ZXxyZXNpemUoKX0uXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGlzIGlzIGEgdmFsdWUgdG8gYmUgYXNzaWduZWQgdG8ge0BsaW5rIEZpbkJhciNzdHlsZXN8c3R5bGVzfSBvbiBlYWNoIGNhbGwgdG8ge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9LiBUaGF0IGlzLCBhIGhhc2ggb2YgdmFsdWVzIHRvIGJlIGNvcGllZCB0byB0aGUgc2Nyb2xsYmFyIGVsZW1lbnQncyBzdHlsZSBvYmplY3Qgb24gcmVzaXplOyBvciBgbnVsbGAgZm9yIG5vbmUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNzdHlsZXxzdHlsZX1cbiAgICAgICAgICogQHR5cGUge2ZpbmJhclN0eWxlc3xudWxsfVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgYmFyU3R5bGVzOiBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmFtZSBzdHlsZVxuICAgICAgICAgKiBAc3VtbWFyeSBBZGRpdGlvbmFsIHNjcm9sbGJhciBzdHlsZXMuXG4gICAgICAgICAqIEBkZXNjIFNlZSB0eXBlIGRlZmluaXRpb24gZm9yIG1vcmUgZGV0YWlscy4gVGhlc2Ugc3R5bGVzIGFyZSBhcHBsaWVkIGRpcmVjdGx5IHRvIHRoZSBzY3JvbGxiYXIncyBgYmFyYCBlbGVtZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKiBWYWx1ZXMgYXJlIGFkanVzdGVkIGFzIGZvbGxvd3MgYmVmb3JlIGJlaW5nIGFwcGxpZWQgdG8gdGhlIGVsZW1lbnQ6XG4gICAgICAgICAqIDEuIEluY2x1ZGVkIFwicHNldWRvLXByb3BlcnR5XCIgbmFtZXMgZnJvbSB0aGUgc2Nyb2xsYmFyJ3Mgb3JpZW50YXRpb24gaGFzaCwge0BsaW5rIEZpbkJhciNvaHxvaH0sIGFyZSB0cmFuc2xhdGVkIHRvIGFjdHVhbCBwcm9wZXJ0eSBuYW1lcyBiZWZvcmUgYmVpbmcgYXBwbGllZC5cbiAgICAgICAgICogMi4gV2hlbiB0aGVyZSBhcmUgbWFyZ2lucywgcGVyY2VudGFnZXMgYXJlIHRyYW5zbGF0ZWQgdG8gYWJzb2x1dGUgcGl4ZWwgdmFsdWVzIGJlY2F1c2UgQ1NTIGlnbm9yZXMgbWFyZ2lucyBpbiBpdHMgcGVyY2VudGFnZSBjYWxjdWxhdGlvbnMuXG4gICAgICAgICAqIDMuIElmIHlvdSBnaXZlIGEgdmFsdWUgd2l0aG91dCBhIHVuaXQgKGEgcmF3IG51bWJlciksIFwicHhcIiB1bml0IGlzIGFwcGVuZGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBHZW5lcmFsIG5vdGVzOlxuICAgICAgICAgKiAxLiBJdCBpcyBhbHdheXMgcHJlZmVyYWJsZSB0byBzcGVjaWZ5IHN0eWxlcyB2aWEgYSBzdHlsZXNoZWV0LiBPbmx5IHNldCB0aGlzIHByb3BlcnR5IHdoZW4geW91IG5lZWQgdG8gc3BlY2lmaWNhbGx5IG92ZXJyaWRlIChhKSBzdHlsZXNoZWV0IHZhbHVlKHMpLlxuICAgICAgICAgKiAyLiBDYW4gYmUgc2V0IGRpcmVjdGx5IG9yIHZpYSBjYWxscyB0byB0aGUge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplfSBtZXRob2QuXG4gICAgICAgICAqIDMuIFNob3VsZCBvbmx5IGJlIHNldCBhZnRlciB0aGUgc2Nyb2xsYmFyIGhhcyBiZWVuIGluc2VydGVkIGludG8gdGhlIERPTS5cbiAgICAgICAgICogNC4gQmVmb3JlIGFwcGx5aW5nIHRoZXNlIG5ldyB2YWx1ZXMgdG8gdGhlIGVsZW1lbnQsIF9hbGxfIGluLWxpbmUgc3R5bGUgdmFsdWVzIGFyZSByZXNldCAoYnkgcmVtb3ZpbmcgdGhlIGVsZW1lbnQncyBgc3R5bGVgIGF0dHJpYnV0ZSksIGV4cG9zaW5nIGluaGVyaXRlZCB2YWx1ZXMgKGZyb20gc3R5bGVzaGVldHMpLlxuICAgICAgICAgKiA1LiBFbXB0eSBvYmplY3QgaGFzIG5vIGVmZmVjdC5cbiAgICAgICAgICogNi4gRmFsc2V5IHZhbHVlIGluIHBsYWNlIG9mIG9iamVjdCBoYXMgbm8gZWZmZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiA+IENBVkVBVDogRG8gbm90IGF0dGVtcHQgdG8gdHJlYXQgdGhlIG9iamVjdCB5b3UgYXNzaWduIHRvIHRoaXMgcHJvcGVydHkgYXMgaWYgaXQgd2VyZSBgdGhpcy5iYXIuc3R5bGVgLiBTcGVjaWZpY2FsbHksIGNoYW5naW5nIHRoaXMgb2JqZWN0IGFmdGVyIGFzc2lnbmluZyBpdCB3aWxsIGhhdmUgbm8gZWZmZWN0IG9uIHRoZSBzY3JvbGxiYXIuIFlvdSBtdXN0IGFzc2lnbiBpdCBhZ2FpbiBpZiB5b3Ugd2FudCBpdCB0byBoYXZlIGFuIGVmZmVjdC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHNlZSB7QGxpbmsgRmluQmFyI2JhclN0eWxlc3xiYXJTdHlsZXN9XG4gICAgICAgICAqIEB0eXBlIHtmaW5iYXJTdHlsZXN9XG4gICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICBzZXQgc3R5bGUoc3R5bGVzKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHN0eWxlcyA9IGV4dGVuZCh7fSwgc3R5bGVzLCB0aGlzLl9hdXhTdHlsZXMpKTtcblxuICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJhciA9IHRoaXMuYmFyLFxuICAgICAgICAgICAgICAgICAgICBiYXJSZWN0ID0gYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lciB8fCBiYXIucGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyUmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgICAgICAgICAgb2ggPSB0aGlzLm9oO1xuXG4gICAgICAgICAgICAgICAgLy8gQmVmb3JlIGFwcGx5aW5nIG5ldyBzdHlsZXMsIHJldmVydCBhbGwgc3R5bGVzIHRvIHZhbHVlcyBpbmhlcml0ZWQgZnJvbSBzdHlsZXNoZWV0c1xuICAgICAgICAgICAgICAgIGJhci5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG5cbiAgICAgICAgICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gc3R5bGVzW2tleV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSBpbiBvaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5ID0gb2hba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHZhbCkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSAodmFsIHx8IDApICsgJ3B4JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgvJSQvLnRlc3QodmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBiYXIgc2l6ZSBnaXZlbiBhcyBwZXJjZW50YWdlIG9mIGNvbnRhaW5lciwgaWYgYmFyIGhhcyBtYXJnaW5zLCByZXN0YXRlIHNpemUgaW4gcGl4ZWxzIGxlc3MgbWFyZ2lucy5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIChJZiBsZWZ0IGFzIHBlcmNlbnRhZ2UsIENTUydzIGNhbGN1bGF0aW9uIHdpbGwgbm90IGV4Y2x1ZGUgbWFyZ2lucy4pXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3JpZW50ZWQgPSBheGlzW2tleV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2lucyA9IGJhclJlY3Rbb3JpZW50ZWQubWFyZ2luTGVhZGluZ10gKyBiYXJSZWN0W29yaWVudGVkLm1hcmdpblRyYWlsaW5nXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYXJnaW5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gcGFyc2VJbnQodmFsLCAxMCkgLyAxMDAgKiBjb250YWluZXJSZWN0W29yaWVudGVkLnNpemVdIC0gbWFyZ2lucyArICdweCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBiYXIuc3R5bGVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJlYWRvbmx5XG4gICAgICAgICAqIEBuYW1lIHBhZ2luZ1xuICAgICAgICAgKiBAc3VtbWFyeSBFbmFibGUgcGFnZSB1cC9kbiBjbGlja3MuXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFNlZSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiB0cnV0aHksIGxpc3RlbiBmb3IgY2xpY2tzIGluIHBhZ2UtdXAgYW5kIHBhZ2UtZG93biByZWdpb25zIG9mIHNjcm9sbGJhci5cbiAgICAgICAgICpcbiAgICAgICAgICogSWYgYW4gb2JqZWN0LCBjYWxsIGAucGFnaW5nLnVwKClgIG9uIHBhZ2UtdXAgY2xpY2tzIGFuZCBgLnBhZ2luZy5kb3duKClgIHdpbGwgYmUgY2FsbGVkIG9uIHBhZ2UtZG93biBjbGlja3MuXG4gICAgICAgICAqXG4gICAgICAgICAqIENoYW5naW5nIHRoZSB0cnV0aGluZXNzIG9mIHRoaXMgdmFsdWUgYWZ0ZXIgaW5zdGFudGlhdGlvbiBjdXJyZW50bHkgaGFzIG5vIGVmZmVjdC5cbiAgICAgICAgICogQHR5cGUge2Jvb2xlYW58b2JqZWN0fVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgcGFnaW5nOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmFtZSByYW5nZVxuICAgICAgICAgKiBAc3VtbWFyeSBTZXR0ZXIgZm9yIHRoZSBtaW5pbXVtIGFuZCBtYXhpbXVtIHNjcm9sbCB2YWx1ZXMuXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IuIFRoZXNlIHZhbHVlcyBhcmUgdGhlIGxpbWl0cyBmb3Ige0BsaW5rIEZvb0JhciNpbmRleHxpbmRleH0uXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoZSBzZXR0ZXIgYWNjZXB0cyBhbiBvYmplY3Qgd2l0aCBleGFjdGx5IHR3byBudW1lcmljIHByb3BlcnRpZXM6IGAubWluYCB3aGljaCBtdXN0IGJlIGxlc3MgdGhhbiBgLm1heGAuIFRoZSB2YWx1ZXMgYXJlIGV4dHJhY3RlZCBhbmQgdGhlIG9iamVjdCBpcyBkaXNjYXJkZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoZSBnZXR0ZXIgcmV0dXJucyBhIG5ldyBvYmplY3Qgd2l0aCBgLm1pbmAgYW5kICcubWF4YC5cbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge3JhbmdlVHlwZX1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHNldCByYW5nZShyYW5nZSkge1xuICAgICAgICAgICAgdmFsaWRSYW5nZShyYW5nZSk7XG4gICAgICAgICAgICB0aGlzLl9taW4gPSByYW5nZS5taW47XG4gICAgICAgICAgICB0aGlzLl9tYXggPSByYW5nZS5tYXg7XG4gICAgICAgICAgICB0aGlzLmNvbnRlbnRTaXplID0gcmFuZ2UubWF4IC0gcmFuZ2UubWluICsgMTtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggPSB0aGlzLmluZGV4OyAvLyByZS1jbGFtcFxuICAgICAgICB9LFxuICAgICAgICBnZXQgcmFuZ2UoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG1pbjogdGhpcy5fbWluLFxuICAgICAgICAgICAgICAgIG1heDogdGhpcy5fbWF4XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAc3VtbWFyeSBJbmRleCB2YWx1ZSBvZiB0aGUgc2Nyb2xsYmFyLlxuICAgICAgICAgKiBAZGVzYyBUaGlzIGlzIHRoZSBwb3NpdGlvbiBvZiB0aGUgc2Nyb2xsIHRodW1iLlxuICAgICAgICAgKlxuICAgICAgICAgKiBTZXR0aW5nIHRoaXMgdmFsdWUgY2xhbXBzIGl0IHRvIHtAbGluayBGaW5CYXIjbWlufG1pbn0uLntAbGluayBGaW5CYXIjbWF4fG1heH0sIHNjcm9sbCB0aGUgY29udGVudCwgYW5kIG1vdmVzIHRodW1iLlxuICAgICAgICAgKlxuICAgICAgICAgKiBHZXR0aW5nIHRoaXMgdmFsdWUgcmV0dXJucyB0aGUgY3VycmVudCBpbmRleC4gVGhlIHJldHVybmVkIHZhbHVlIHdpbGwgYmUgaW4gdGhlIHJhbmdlIGBtaW5gLi5gbWF4YC4gSXQgaXMgaW50ZW50aW9uYWxseSBub3Qgcm91bmRlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogVXNlIHRoaXMgdmFsdWUgYXMgYW4gYWx0ZXJuYXRpdmUgdG8gKG9yIGluIGFkZGl0aW9uIHRvKSB1c2luZyB0aGUge0BsaW5rIEZpbkJhciNvbmNoYW5nZXxvbmNoYW5nZX0gY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNfc2V0U2Nyb2xsfF9zZXRTY3JvbGx9XG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICBzZXQgaW5kZXgoaWR4KSB7XG4gICAgICAgICAgICBpZHggPSBNYXRoLm1pbih0aGlzLl9tYXgsIE1hdGgubWF4KHRoaXMuX21pbiwgaWR4KSk7IC8vIGNsYW1wIGl0XG4gICAgICAgICAgICB0aGlzLl9zZXRTY3JvbGwoaWR4KTtcbiAgICAgICAgICAgIC8vIHRoaXMuX3NldFRodW1iU2l6ZSgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXQgaW5kZXgoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faW5kZXg7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEBzdW1tYXJ5IE1vdmUgdGhlIHRodW1iLlxuICAgICAgICAgKiBAZGVzYyBBbHNvIGRpc3BsYXlzIHRoZSBpbmRleCB2YWx1ZSBpbiB0aGUgdGVzdCBwYW5lbCBhbmQgaW52b2tlcyB0aGUgY2FsbGJhY2suXG4gICAgICAgICAqIEBwYXJhbSBpZHggLSBUaGUgbmV3IHNjcm9sbCBpbmRleCwgYSB2YWx1ZSBpbiB0aGUgcmFuZ2UgYG1pbmAuLmBtYXhgLlxuICAgICAgICAgKiBAcGFyYW0gW3NjYWxlZD1mKGlkeCldIC0gVGhlIG5ldyB0aHVtYiBwb3NpdGlvbiBpbiBwaXhlbHMgYW5kIHNjYWxlZCByZWxhdGl2ZSB0byB0aGUgY29udGFpbmluZyB7QGxpbmsgRmluQmFyI2JhcnxiYXJ9IGVsZW1lbnQsIGkuZS4sIGEgcHJvcG9ydGlvbmFsIG51bWJlciBpbiB0aGUgcmFuZ2UgYDBgLi5gdGh1bWJNYXhgLiBXaGVuIG9taXR0ZWQsIGEgZnVuY3Rpb24gb2YgYGlkeGAgaXMgdXNlZC5cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIF9zZXRTY3JvbGw6IGZ1bmN0aW9uIChpZHgsIHNjYWxlZCkge1xuICAgICAgICAgICAgdGhpcy5faW5kZXggPSBpZHg7XG5cbiAgICAgICAgICAgIC8vIERpc3BsYXkgdGhlIGluZGV4IHZhbHVlIGluIHRoZSB0ZXN0IHBhbmVsXG4gICAgICAgICAgICBpZiAodGhpcy50ZXN0UGFuZWxJdGVtICYmIHRoaXMudGVzdFBhbmVsSXRlbS5pbmRleCBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRlc3RQYW5lbEl0ZW0uaW5kZXguaW5uZXJIVE1MID0gTWF0aC5yb3VuZChpZHgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKHRoaXMub25jaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uY2hhbmdlLmNhbGwodGhpcywgTWF0aC5yb3VuZChpZHgpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW92ZSB0aGUgdGh1bWJcbiAgICAgICAgICAgIGlmIChzY2FsZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHNjYWxlZCA9IChpZHggLSB0aGlzLl9taW4pIC8gKHRoaXMuX21heCAtIHRoaXMuX21pbikgKiB0aGlzLl90aHVtYk1heDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudGh1bWIuc3R5bGVbdGhpcy5vaC5sZWFkaW5nXSA9IHNjYWxlZCArICdweCc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2Nyb2xsUmVhbENvbnRlbnQ6IGZ1bmN0aW9uIChpZHgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXJSZWN0ID0gdGhpcy5jb250ZW50LnBhcmVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgc2l6ZVByb3AgPSB0aGlzLm9oLnNpemUsXG4gICAgICAgICAgICAgICAgbWF4U2Nyb2xsID0gTWF0aC5tYXgoMCwgdGhpcy5jb250ZW50W3NpemVQcm9wXSAtIGNvbnRhaW5lclJlY3Rbc2l6ZVByb3BdKSxcbiAgICAgICAgICAgICAgICAvL3Njcm9sbCA9IE1hdGgubWluKGlkeCwgbWF4U2Nyb2xsKTtcbiAgICAgICAgICAgICAgICBzY3JvbGwgPSAoaWR4IC0gdGhpcy5fbWluKSAvICh0aGlzLl9tYXggLSB0aGlzLl9taW4pICogbWF4U2Nyb2xsO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnc2Nyb2xsOiAnICsgc2Nyb2xsKTtcbiAgICAgICAgICAgIHRoaXMuY29udGVudC5zdHlsZVt0aGlzLm9oLmxlYWRpbmddID0gLXNjcm9sbCArICdweCc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBzdW1tYXJ5IFJlY2FsY3VsYXRlIHRodW1iIHBvc2l0aW9uLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZGVzYyBUaGlzIG1ldGhvZCByZWNhbGN1bGF0ZXMgdGhlIHRodW1iIHNpemUgYW5kIHBvc2l0aW9uLiBDYWxsIGl0IG9uY2UgYWZ0ZXIgaW5zZXJ0aW5nIHlvdXIgc2Nyb2xsYmFyIGludG8gdGhlIERPTSwgYW5kIHJlcGVhdGVkbHkgd2hpbGUgcmVzaXppbmcgdGhlIHNjcm9sbGJhciAod2hpY2ggdHlwaWNhbGx5IGhhcHBlbnMgd2hlbiB0aGUgc2Nyb2xsYmFyJ3MgcGFyZW50IGlzIHJlc2l6ZWQgYnkgdXNlci5cbiAgICAgICAgICpcbiAgICAgICAgICogPiBUaGlzIGZ1bmN0aW9uIHNoaWZ0cyBhcmdzIGlmIGZpcnN0IGFyZyBvbWl0dGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2luY3JlbWVudD10aGlzLmluY3JlbWVudF0gLSBSZXNldHMge0BsaW5rIEZvb0JhciNpbmNyZW1lbnR8aW5jcmVtZW50fSAoc2VlKS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtmaW5iYXJTdHlsZXN9IFtiYXJTdHlsZXM9dGhpcy5iYXJTdHlsZXNdIC0gKFNlZSB0eXBlIGRlZmluaXRpb24gZm9yIGRldGFpbHMuKSBTY3JvbGxiYXIgc3R5bGVzIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGJhciBlbGVtZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKiBPbmx5IHNwZWNpZnkgYSBgYmFyU3R5bGVzYCBvYmplY3Qgd2hlbiB5b3UgbmVlZCB0byBvdmVycmlkZSBzdHlsZXNoZWV0IHZhbHVlcy4gSWYgcHJvdmlkZWQsIGJlY29tZXMgdGhlIG5ldyBkZWZhdWx0IChgdGhpcy5iYXJTdHlsZXNgKSwgZm9yIHVzZSBhcyBhIGRlZmF1bHQgb24gc3Vic2VxdWVudCBjYWxscy5cbiAgICAgICAgICpcbiAgICAgICAgICogSXQgaXMgZ2VuZXJhbGx5IHRoZSBjYXNlIHRoYXQgdGhlIHNjcm9sbGJhcidzIG5ldyBwb3NpdGlvbiBpcyBzdWZmaWNpZW50bHkgZGVzY3JpYmVkIGJ5IHRoZSBjdXJyZW50IHN0eWxlcy4gVGhlcmVmb3JlLCBpdCBpcyB1bnVzdWFsIHRvIG5lZWQgdG8gcHJvdmlkZSBhIGBiYXJTdHlsZXNgIG9iamVjdCBvbiBldmVyeSBjYWxsIHRvIGByZXNpemVgLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJucyB7RmluQmFyfSBTZWxmIGZvciBjaGFpbmluZy5cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHJlc2l6ZTogZnVuY3Rpb24gKGluY3JlbWVudCwgYmFyU3R5bGVzKSB7XG4gICAgICAgICAgICB2YXIgYmFyID0gdGhpcy5iYXI7XG5cbiAgICAgICAgICAgIGlmICghYmFyLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIG5vdCBpbiBET00geWV0IHNvIG5vdGhpbmcgdG8gZG9cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyIHx8IGJhci5wYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclJlY3QgPSBjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgICAgIC8vIHNoaWZ0IGFyZ3MgaWYgaWYgMXN0IGFyZyBvbWl0dGVkXG4gICAgICAgICAgICBpZiAodHlwZW9mIGluY3JlbWVudCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBiYXJTdHlsZXMgPSBpbmNyZW1lbnQ7XG4gICAgICAgICAgICAgICAgaW5jcmVtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnN0eWxlID0gdGhpcy5iYXJTdHlsZXMgPSBiYXJTdHlsZXMgfHwgdGhpcy5iYXJTdHlsZXM7XG5cbiAgICAgICAgICAgIC8vIEJvdW5kIHRvIHJlYWwgY29udGVudDogQ29udGVudCB3YXMgZ2l2ZW4gYnV0IG5vIG9uY2hhbmdlIGhhbmRsZXIuXG4gICAgICAgICAgICAvLyBTZXQgdXAgLm9uY2hhbmdlLCAuY29udGFpbmVyU2l6ZSwgYW5kIC5pbmNyZW1lbnQuXG4gICAgICAgICAgICAvLyBOb3RlIHRoaXMgb25seSBtYWtlcyBzZW5zZSBpZiB5b3VyIGluZGV4IHVuaXQgaXMgcGl4ZWxzLlxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGVudCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5vbmNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uY2hhbmdlID0gdGhpcy5zY3JvbGxSZWFsQ29udGVudDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250ZW50U2l6ZSA9IHRoaXMuY29udGVudFt0aGlzLm9oLnNpemVdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9taW4gPSAwO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXggPSB0aGlzLmNvbnRlbnRTaXplIC0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5vbmNoYW5nZSA9PT0gdGhpcy5zY3JvbGxSZWFsQ29udGVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGFpbmVyU2l6ZSA9IGNvbnRhaW5lclJlY3RbdGhpcy5vaC5zaXplXTtcbiAgICAgICAgICAgICAgICB0aGlzLmluY3JlbWVudCA9IHRoaXMuY29udGFpbmVyU2l6ZSAvICh0aGlzLmNvbnRlbnRTaXplIC0gdGhpcy5jb250YWluZXJTaXplKSAqICh0aGlzLl9tYXggLSB0aGlzLl9taW4pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRhaW5lclNpemUgPSAxO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5jcmVtZW50ID0gaW5jcmVtZW50IHx8IHRoaXMuaW5jcmVtZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmluZGV4O1xuICAgICAgICAgICAgdGhpcy50ZXN0UGFuZWxJdGVtID0gdGhpcy50ZXN0UGFuZWxJdGVtIHx8IHRoaXMuX2FkZFRlc3RQYW5lbEl0ZW0oKTtcbiAgICAgICAgICAgIHRoaXMuX3NldFRodW1iU2l6ZSgpO1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IGluZGV4O1xuXG4gICAgICAgICAgICBpZiAodGhpcy5kZWx0YVByb3AgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignd2hlZWwnLCB0aGlzLl9ib3VuZC5vbndoZWVsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBzdW1tYXJ5IFNob3J0ZW4gdHJhaWxpbmcgZW5kIG9mIHNjcm9sbGJhciBieSB0aGlja25lc3Mgb2Ygc29tZSBvdGhlciBzY3JvbGxiYXIuXG4gICAgICAgICAqIEBkZXNjIEluIHRoZSBcImNsYXNzaWNhbFwiIHNjZW5hcmlvIHdoZXJlIHZlcnRpY2FsIHNjcm9sbCBiYXIgaXMgb24gdGhlIHJpZ2h0IGFuZCBob3Jpem9udGFsIHNjcm9sbGJhciBpcyBvbiB0aGUgYm90dG9tLCB5b3Ugd2FudCB0byBzaG9ydGVuIHRoZSBcInRyYWlsaW5nIGVuZFwiIChib3R0b20gYW5kIHJpZ2h0IGVuZHMsIHJlc3BlY3RpdmVseSkgb2YgYXQgbGVhc3Qgb25lIG9mIHRoZW0gc28gdGhleSBkb24ndCBvdmVybGF5LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGlzIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGlzIGFuIHByb2dyYW1tYXRpYyBhbHRlcm5hdGl2ZSB0byBoYXJkY29kaW5nIHRoZSBjb3JyZWN0IHN0eWxlIHdpdGggdGhlIGNvcnJlY3QgdmFsdWUgaW4geW91ciBzdHlsZXNoZWV0OyBvciBzZXR0aW5nIHRoZSBjb3JyZWN0IHN0eWxlIHdpdGggdGhlIGNvcnJlY3QgdmFsdWUgaW4gdGhlIHtAbGluayBGaW5CYXIjYmFyU3R5bGVzfGJhclN0eWxlc30gb2JqZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjZm9yZXNob3J0ZW5CeXxmb3Jlc2hvcnRlbkJ5fS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtGaW5CYXJ8bnVsbH0gb3RoZXJGaW5CYXIgLSBPdGhlciBzY3JvbGxiYXIgdG8gYXZvaWQgYnkgc2hvcnRlbmluZyB0aGlzIG9uZTsgYG51bGxgIHJlbW92ZXMgdGhlIHRyYWlsaW5nIHNwYWNlXG4gICAgICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IEZvciBjaGFpbmluZ1xuICAgICAgICAgKi9cbiAgICAgICAgc2hvcnRlbkJ5OiBmdW5jdGlvbiAob3RoZXJGaW5CYXIpIHsgcmV0dXJuIHRoaXMuc2hvcnRlbkVuZEJ5KCd0cmFpbGluZycsIG90aGVyRmluQmFyKTsgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHN1bW1hcnkgU2hvcnRlbiBsZWFkaW5nIGVuZCBvZiBzY3JvbGxiYXIgYnkgdGhpY2tuZXNzIG9mIHNvbWUgb3RoZXIgc2Nyb2xsYmFyLlxuICAgICAgICAgKiBAZGVzYyBTdXBwb3J0cyBub24tY2xhc3NpY2FsIHNjcm9sbGJhciBzY2VuYXJpb3Mgd2hlcmUgdmVydGljYWwgc2Nyb2xsIGJhciBtYXkgYmUgb24gbGVmdCBhbmQgaG9yaXpvbnRhbCBzY3JvbGxiYXIgbWF5IGJlIG9uIHRvcCwgaW4gd2hpY2ggY2FzZSB5b3Ugd2FudCB0byBzaG9ydGVuIHRoZSBcImxlYWRpbmcgZW5kXCIgcmF0aGVyIHRoYW4gdGhlIHRyYWlsaW5nIGVuZC5cbiAgICAgICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3Nob3J0ZW5CeXxzaG9ydGVuQnl9LlxuICAgICAgICAgKiBAcGFyYW0ge0ZpbkJhcnxudWxsfSBvdGhlckZpbkJhciAtIE90aGVyIHNjcm9sbGJhciB0byBhdm9pZCBieSBzaG9ydGVuaW5nIHRoaXMgb25lOyBgbnVsbGAgcmVtb3ZlcyB0aGUgdHJhaWxpbmcgc3BhY2VcbiAgICAgICAgICogQHJldHVybnMge0ZpbkJhcn0gRm9yIGNoYWluaW5nXG4gICAgICAgICAqL1xuICAgICAgICBmb3Jlc2hvcnRlbkJ5OiBmdW5jdGlvbiAob3RoZXJGaW5CYXIpIHsgcmV0dXJuIHRoaXMuc2hvcnRlbkVuZEJ5KCdsZWFkaW5nJywgb3RoZXJGaW5CYXIpOyB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAc3VtbWFyeSBHZW5lcmFsaXplZCBzaG9ydGVuaW5nIGZ1bmN0aW9uLlxuICAgICAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjc2hvcnRlbkJ5fHNob3J0ZW5CeX0uXG4gICAgICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNmb3Jlc2hvcnRlbkJ5fGZvcmVzaG9ydGVuQnl9LlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gd2hpY2hFbmQgLSBhIENTUyBzdHlsZSBwcm9wZXJ0eSBuYW1lIG9yIGFuIG9yaWVudGF0aW9uIGhhc2ggbmFtZSB0aGF0IHRyYW5zbGF0ZXMgdG8gYSBDU1Mgc3R5bGUgcHJvcGVydHkgbmFtZS5cbiAgICAgICAgICogQHBhcmFtIHtGaW5CYXJ8bnVsbH0gb3RoZXJGaW5CYXIgLSBPdGhlciBzY3JvbGxiYXIgdG8gYXZvaWQgYnkgc2hvcnRlbmluZyB0aGlzIG9uZTsgYG51bGxgIHJlbW92ZXMgdGhlIHRyYWlsaW5nIHNwYWNlXG4gICAgICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IEZvciBjaGFpbmluZ1xuICAgICAgICAgKi9cbiAgICAgICAgc2hvcnRlbkVuZEJ5OiBmdW5jdGlvbiAod2hpY2hFbmQsIG90aGVyRmluQmFyKSB7XG4gICAgICAgICAgICBpZiAoIW90aGVyRmluQmFyKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2F1eFN0eWxlcztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3RoZXJGaW5CYXIgaW5zdGFuY2VvZiBGaW5CYXIgJiYgb3RoZXJGaW5CYXIub3JpZW50YXRpb24gIT09IHRoaXMub3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXJTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG90aGVyRmluQmFyLmJhciksXG4gICAgICAgICAgICAgICAgICAgIG9vaCA9IG9yaWVudGF0aW9uSGFzaGVzW290aGVyRmluQmFyLm9yaWVudGF0aW9uXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdXhTdHlsZXMgPSB7fTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hdXhTdHlsZXNbd2hpY2hFbmRdID0gb3RoZXJTdHlsZVtvb2gudGhpY2tuZXNzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzOyAvLyBmb3IgY2hhaW5pbmdcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQHN1bW1hcnkgU2V0cyB0aGUgcHJvcG9ydGlvbmFsIHRodW1iIHNpemUgYW5kIGhpZGVzIHRodW1iIHdoZW4gMTAwJS5cbiAgICAgICAgICogQGRlc2MgVGhlIHRodW1iIHNpemUgaGFzIGFuIGFic29sdXRlIG1pbmltdW0gb2YgMjAgKHBpeGVscykuXG4gICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICBfc2V0VGh1bWJTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb2ggPSB0aGlzLm9oLFxuICAgICAgICAgICAgICAgIHRodW1iQ29tcCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMudGh1bWIpLFxuICAgICAgICAgICAgICAgIHRodW1iTWFyZ2luTGVhZGluZyA9IHBhcnNlSW50KHRodW1iQ29tcFtvaC5tYXJnaW5MZWFkaW5nXSksXG4gICAgICAgICAgICAgICAgdGh1bWJNYXJnaW5UcmFpbGluZyA9IHBhcnNlSW50KHRodW1iQ29tcFtvaC5tYXJnaW5UcmFpbGluZ10pLFxuICAgICAgICAgICAgICAgIHRodW1iTWFyZ2lucyA9IHRodW1iTWFyZ2luTGVhZGluZyArIHRodW1iTWFyZ2luVHJhaWxpbmcsXG4gICAgICAgICAgICAgICAgYmFyU2l6ZSA9IHRoaXMuYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW29oLnNpemVdLFxuICAgICAgICAgICAgICAgIHRodW1iU2l6ZSA9IE1hdGgubWF4KDIwLCBiYXJTaXplICogdGhpcy5jb250YWluZXJTaXplIC8gdGhpcy5jb250ZW50U2l6ZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnRhaW5lclNpemUgPCB0aGlzLmNvbnRlbnRTaXplKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5iYXIuc3R5bGUudmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgICAgICAgICAgICB0aGlzLnRodW1iLnN0eWxlW29oLnNpemVdID0gdGh1bWJTaXplICsgJ3B4JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5iYXIuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKiBAbmFtZSBfdGh1bWJNYXhcbiAgICAgICAgICAgICAqIEBzdW1tYXJ5IE1heGltdW0gb2Zmc2V0IG9mIHRodW1iJ3MgbGVhZGluZyBlZGdlLlxuICAgICAgICAgICAgICogQGRlc2MgVGhpcyBpcyB0aGUgcGl4ZWwgb2Zmc2V0IHdpdGhpbiB0aGUgc2Nyb2xsYmFyIG9mIHRoZSB0aHVtYiB3aGVuIGl0IGlzIGF0IGl0cyBtYXhpbXVtIHBvc2l0aW9uIGF0IHRoZSBleHRyZW1lIGVuZCBvZiBpdHMgcmFuZ2UuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogVGhpcyB2YWx1ZSB0YWtlcyBpbnRvIGFjY291bnQgdGhlIG5ld2x5IGNhbGN1bGF0ZWQgc2l6ZSBvZiB0aGUgdGh1bWIgZWxlbWVudCAoaW5jbHVkaW5nIGl0cyBtYXJnaW5zKSBhbmQgdGhlIGlubmVyIHNpemUgb2YgdGhlIHNjcm9sbGJhciAodGhlIHRodW1iJ3MgY29udGFpbmluZyBlbGVtZW50LCBpbmNsdWRpbmcgX2l0c18gbWFyZ2lucykuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogTk9URTogU2Nyb2xsYmFyIHBhZGRpbmcgaXMgbm90IHRha2VuIGludG8gYWNjb3VudCBhbmQgYXNzdW1lZCB0byBiZSAwIGluIHRoZSBjdXJyZW50IGltcGxlbWVudGF0aW9uIGFuZCBpcyBhc3N1bWVkIHRvIGJlIGAwYDsgdXNlIHRodW1iIG1hcmdpbnMgaW4gcGxhY2Ugb2Ygc2Nyb2xsYmFyIHBhZGRpbmcuXG4gICAgICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy5fdGh1bWJNYXggPSBiYXJTaXplIC0gdGh1bWJTaXplIC0gdGh1bWJNYXJnaW5zO1xuXG4gICAgICAgICAgICB0aGlzLl90aHVtYk1hcmdpbkxlYWRpbmcgPSB0aHVtYk1hcmdpbkxlYWRpbmc7IC8vIHVzZWQgaW4gbW91c2Vkb3duXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBzdW1tYXJ5IFJlbW92ZSB0aGUgc2Nyb2xsYmFyLlxuICAgICAgICAgKiBAZGVzYyBVbmhvb2tzIGFsbCB0aGUgZXZlbnQgaGFuZGxlcnMgYW5kIHRoZW4gcmVtb3ZlcyB0aGUgZWxlbWVudCBmcm9tIHRoZSBET00uIEFsd2F5cyBjYWxsIHRoaXMgbWV0aG9kIHByaW9yIHRvIGRpc3Bvc2luZyBvZiB0aGUgc2Nyb2xsYmFyIG9iamVjdC5cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlRXZ0KCdtb3VzZWRvd24nKTtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNldXAnKTtcblxuICAgICAgICAgICAgKHRoaXMuY29udGFpbmVyIHx8IHRoaXMuYmFyLnBhcmVudEVsZW1lbnQpLl9yZW1vdmVFdnQoJ3doZWVsJywgdGhpcy5fYm91bmQub253aGVlbCk7XG5cbiAgICAgICAgICAgIHRoaXMuYmFyLm9uY2xpY2sgPVxuICAgICAgICAgICAgICAgIHRoaXMudGh1bWIub25jbGljayA9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGh1bWIub25tb3VzZW92ZXIgPVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aHVtYi50cmFuc2l0aW9uZW5kID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRodW1iLm9ubW91c2VvdXQgPSBudWxsO1xuXG4gICAgICAgICAgICB0aGlzLmJhci5yZW1vdmUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQGZ1bmN0aW9uIF9hZGRUZXN0UGFuZWxJdGVtXG4gICAgICAgICAqIEBzdW1tYXJ5IEFwcGVuZCBhIHRlc3QgcGFuZWwgZWxlbWVudC5cbiAgICAgICAgICogQGRlc2MgSWYgdGhlcmUgaXMgYSB0ZXN0IHBhbmVsIGluIHRoZSBET00gKHR5cGljYWxseSBhbiBgPG9sPi4uLjwvb2w+YCBlbGVtZW50KSB3aXRoIGNsYXNzIG5hbWVzIG9mIGJvdGggYHRoaXMuY2xhc3NQcmVmaXhgIGFuZCBgJ3Rlc3QtcGFuZWwnYCAob3IsIGJhcnJpbmcgdGhhdCwgYW55IGVsZW1lbnQgd2l0aCBjbGFzcyBuYW1lIGAndGVzdC1wYW5lbCdgKSwgYW4gYDxsaT4uLi48L2xpPmAgZWxlbWVudCB3aWxsIGJlIGNyZWF0ZWQgYW5kIGFwcGVuZGVkIHRvIGl0LiBUaGlzIG5ldyBlbGVtZW50IHdpbGwgY29udGFpbiBhIHNwYW4gZm9yIGVhY2ggY2xhc3MgbmFtZSBnaXZlbi5cbiAgICAgICAgICpcbiAgICAgICAgICogWW91IHNob3VsZCBkZWZpbmUgYSBDU1Mgc2VsZWN0b3IgYC5saXN0ZW5pbmdgIGZvciB0aGVzZSBzcGFucy4gVGhpcyBjbGFzcyB3aWxsIGJlIGFkZGVkIHRvIHRoZSBzcGFucyB0byBhbHRlciB0aGVpciBhcHBlYXJhbmNlIHdoZW4gYSBsaXN0ZW5lciBpcyBhZGRlZCB3aXRoIHRoYXQgY2xhc3MgbmFtZSAocHJlZml4ZWQgd2l0aCAnb24nKS5cbiAgICAgICAgICpcbiAgICAgICAgICogKFRoaXMgaXMgYW4gaW50ZXJuYWwgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgb25jZSBieSB0aGUgY29uc3RydWN0b3Igb24gZXZlcnkgaW5zdGFudGlhdGlvbi4pXG4gICAgICAgICAqIEByZXR1cm5zIHtFbGVtZW50fHVuZGVmaW5lZH0gVGhlIGFwcGVuZGVkIGA8bGk+Li4uPC9saT5gIGVsZW1lbnQgb3IgYHVuZGVmaW5lZGAgaWYgdGhlcmUgaXMgbm8gdGVzdCBwYW5lbC5cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIF9hZGRUZXN0UGFuZWxJdGVtOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGVzdFBhbmVsSXRlbSxcbiAgICAgICAgICAgICAgICB0ZXN0UGFuZWxFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLicgKyB0aGlzLl9jbGFzc1ByZWZpeCArICcudGVzdC1wYW5lbCcpIHx8IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50ZXN0LXBhbmVsJyk7XG5cbiAgICAgICAgICAgIGlmICh0ZXN0UGFuZWxFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlc3RQYW5lbEl0ZW1QYXJ0TmFtZXMgPSBbICdtb3VzZWRvd24nLCAnbW91c2Vtb3ZlJywgJ21vdXNldXAnLCAnaW5kZXgnIF0sXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuXG4gICAgICAgICAgICAgICAgdGVzdFBhbmVsSXRlbVBhcnROYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJ0TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtLmlubmVySFRNTCArPSAnPHNwYW4gY2xhc3M9XCInICsgcGFydE5hbWUgKyAnXCI+JyArIHBhcnROYW1lLnJlcGxhY2UoJ21vdXNlJywgJycpICsgJzwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGVzdFBhbmVsRWxlbWVudC5hcHBlbmRDaGlsZChpdGVtKTtcblxuICAgICAgICAgICAgICAgIHRlc3RQYW5lbEl0ZW0gPSB7fTtcbiAgICAgICAgICAgICAgICB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHBhcnROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlc3RQYW5lbEl0ZW1bcGFydE5hbWVdID0gaXRlbS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKHBhcnROYW1lKVswXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRlc3RQYW5lbEl0ZW07XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2FkZEV2dDogZnVuY3Rpb24gKGV2dE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBzcHkgPSB0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtW2V2dE5hbWVdO1xuICAgICAgICAgICAgaWYgKHNweSkgeyBzcHkuY2xhc3NMaXN0LmFkZCgnbGlzdGVuaW5nJyk7IH1cbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2dE5hbWUsIHRoaXMuX2JvdW5kWydvbicgKyBldnROYW1lXSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX3JlbW92ZUV2dDogZnVuY3Rpb24gKGV2dE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBzcHkgPSB0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtW2V2dE5hbWVdO1xuICAgICAgICAgICAgaWYgKHNweSkgeyBzcHkuY2xhc3NMaXN0LnJlbW92ZSgnbGlzdGVuaW5nJyk7IH1cbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKGV2dE5hbWUsIHRoaXMuX2JvdW5kWydvbicgKyBldnROYW1lXSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIG9iam4gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICBpZiAob2Jqbikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmpuKSB7XG4gICAgICAgICAgICAgICAgICAgIG9ialtrZXldID0gb2JqbltrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkUmFuZ2UocmFuZ2UpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyYW5nZSksXG4gICAgICAgICAgICB2YWxpZCA9ICBrZXlzLmxlbmd0aCA9PT0gMiAmJlxuICAgICAgICAgICAgICAgIHR5cGVvZiByYW5nZS5taW4gPT09ICdudW1iZXInICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIHJhbmdlLm1heCA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgICAgICByYW5nZS5taW4gPD0gcmFuZ2UubWF4O1xuXG4gICAgICAgIGlmICghdmFsaWQpIHtcbiAgICAgICAgICAgIGVycm9yKCdJbnZhbGlkIC5yYW5nZSBvYmplY3QuJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBuYW1lIGhhbmRsZXJzVG9CZUJvdW5kXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKiBAZGVzYyBUaGUgZnVuY3Rpb25zIGRlZmluZWQgaW4gdGhpcyBvYmplY3QgYXJlIGFsbCBET00gZXZlbnQgaGFuZGxlcnMgdGhhdCBhcmUgYm91bmQgYnkgdGhlIEZpbkJhciBjb25zdHJ1Y3RvciB0byBlYWNoIG5ldyBpbnN0YW5jZS4gSW4gb3RoZXIgd29yZHMsIHRoZSBgdGhpc2AgdmFsdWUgb2YgdGhlc2UgaGFuZGxlcnMsIG9uY2UgYm91bmQsIHJlZmVyIHRvIHRoZSBGaW5CYXIgb2JqZWN0IGFuZCBub3QgdG8gdGhlIGV2ZW50IGVtaXR0ZXIuIFwiRG8gbm90IGNvbnN1bWUgcmF3LlwiXG4gICAgICovXG4gICAgdmFyIGhhbmRsZXJzVG9CZUJvdW5kID0ge1xuICAgICAgICBzaG9ydFN0b3A6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbndoZWVsOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICB0aGlzLmluZGV4ICs9IGV2dFt0aGlzLmRlbHRhUHJvcF07XG4gICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbmNsaWNrOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICB2YXIgdGh1bWJCb3ggPSB0aGlzLnRodW1iLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICAgICAgICAgIGdvaW5nVXAgPSBldnRbdGhpcy5vaC5jb29yZGluYXRlXSA8IHRodW1iQm94W3RoaXMub2gubGVhZGluZ107XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5wYWdpbmcgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCA9IHRoaXMucGFnaW5nW2dvaW5nVXAgPyAndXAnIDogJ2Rvd24nXShNYXRoLnJvdW5kKHRoaXMuaW5kZXgpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmRleCArPSBnb2luZ1VwID8gLXRoaXMuaW5jcmVtZW50IDogdGhpcy5pbmNyZW1lbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG1ha2UgdGhlIHRodW1iIGdsb3cgbW9tZW50YXJpbHlcbiAgICAgICAgICAgIHRoaXMudGh1bWIuY2xhc3NMaXN0LmFkZCgnaG92ZXInKTtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMudGh1bWIuYWRkRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIGZ1bmN0aW9uIHdhaXRGb3JJdCgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCB3YWl0Rm9ySXQpO1xuICAgICAgICAgICAgICAgIHNlbGYuX2JvdW5kLm9ubW91c2V1cChldnQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbm1vdXNlb3ZlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy50aHVtYi5jbGFzc0xpc3QuYWRkKCdob3ZlcicpO1xuICAgICAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3V0ID0gdGhpcy5fYm91bmQub25tb3VzZW91dDtcbiAgICAgICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2Vkb3duJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25tb3VzZW91dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlRXZ0KCdtb3VzZWRvd24nKTtcbiAgICAgICAgICAgIHRoaXMudGh1bWIub25tb3VzZW92ZXIgPSB0aGlzLl9ib3VuZC5vbm1vdXNlb3ZlcjtcbiAgICAgICAgICAgIHRoaXMudGh1bWIuY2xhc3NMaXN0LnJlbW92ZSgnaG92ZXInKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbm1vdXNlZG93bjogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlRXZ0KCdtb3VzZWRvd24nKTtcbiAgICAgICAgICAgIHRoaXMudGh1bWIub25tb3VzZW92ZXIgPSB0aGlzLnRodW1iLm9ubW91c2VvdXQgPSBudWxsO1xuXG4gICAgICAgICAgICB2YXIgdGh1bWJCb3ggPSB0aGlzLnRodW1iLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5waW5PZmZzZXQgPSBldnRbdGhpcy5vaC5heGlzXSAtIHRodW1iQm94W3RoaXMub2gubGVhZGluZ10gKyB0aGlzLmJhci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVt0aGlzLm9oLmxlYWRpbmddICsgdGhpcy5fdGh1bWJNYXJnaW5MZWFkaW5nO1xuICAgICAgICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLmN1cnNvciA9ICdkZWZhdWx0JztcblxuICAgICAgICAgICAgdGhpcy5fYWRkRXZ0KCdtb3VzZW1vdmUnKTtcbiAgICAgICAgICAgIHRoaXMuX2FkZEV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbm1vdXNlbW92ZTogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgdmFyIHNjYWxlZCA9IE1hdGgubWluKHRoaXMuX3RodW1iTWF4LCBNYXRoLm1heCgwLCBldnRbdGhpcy5vaC5heGlzXSAtIHRoaXMucGluT2Zmc2V0KSk7XG4gICAgICAgICAgICB2YXIgaWR4ID0gc2NhbGVkIC8gdGhpcy5fdGh1bWJNYXggKiAodGhpcy5fbWF4IC0gdGhpcy5fbWluKSArIHRoaXMuX21pbjtcblxuICAgICAgICAgICAgdGhpcy5fc2V0U2Nyb2xsKGlkeCwgc2NhbGVkKTtcblxuICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25tb3VzZXVwOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlbW92ZScpO1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlRXZ0KCdtb3VzZXVwJyk7XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5jdXJzb3IgPSAnYXV0byc7XG5cbiAgICAgICAgICAgIHZhciB0aHVtYkJveCA9IHRoaXMudGh1bWIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgdGh1bWJCb3gubGVmdCA8PSBldnQuY2xpZW50WCAmJiBldnQuY2xpZW50WCA8PSB0aHVtYkJveC5yaWdodCAmJlxuICAgICAgICAgICAgICAgIHRodW1iQm94LnRvcCA8PSBldnQuY2xpZW50WSAmJiBldnQuY2xpZW50WSA8PSB0aHVtYkJveC5ib3R0b21cbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2JvdW5kLm9ubW91c2VvdmVyKGV2dCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2JvdW5kLm9ubW91c2VvdXQoZXZ0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIG9yaWVudGF0aW9uSGFzaGVzID0ge1xuICAgICAgICB2ZXJ0aWNhbDoge1xuICAgICAgICAgICAgY29vcmRpbmF0ZTogICAgICdjbGllbnRZJyxcbiAgICAgICAgICAgIGF4aXM6ICAgICAgICAgICAncGFnZVknLFxuICAgICAgICAgICAgc2l6ZTogICAgICAgICAgICdoZWlnaHQnLFxuICAgICAgICAgICAgb3V0c2lkZTogICAgICAgICdyaWdodCcsXG4gICAgICAgICAgICBpbnNpZGU6ICAgICAgICAgJ2xlZnQnLFxuICAgICAgICAgICAgbGVhZGluZzogICAgICAgICd0b3AnLFxuICAgICAgICAgICAgdHJhaWxpbmc6ICAgICAgICdib3R0b20nLFxuICAgICAgICAgICAgbWFyZ2luTGVhZGluZzogICdtYXJnaW5Ub3AnLFxuICAgICAgICAgICAgbWFyZ2luVHJhaWxpbmc6ICdtYXJnaW5Cb3R0b20nLFxuICAgICAgICAgICAgdGhpY2tuZXNzOiAgICAgICd3aWR0aCcsXG4gICAgICAgICAgICBkZWx0YTogICAgICAgICAgJ2RlbHRhWSdcbiAgICAgICAgfSxcbiAgICAgICAgaG9yaXpvbnRhbDoge1xuICAgICAgICAgICAgY29vcmRpbmF0ZTogICAgICdjbGllbnRYJyxcbiAgICAgICAgICAgIGF4aXM6ICAgICAgICAgICAncGFnZVgnLFxuICAgICAgICAgICAgc2l6ZTogICAgICAgICAgICd3aWR0aCcsXG4gICAgICAgICAgICBvdXRzaWRlOiAgICAgICAgJ2JvdHRvbScsXG4gICAgICAgICAgICBpbnNpZGU6ICAgICAgICAgJ3RvcCcsXG4gICAgICAgICAgICBsZWFkaW5nOiAgICAgICAgJ2xlZnQnLFxuICAgICAgICAgICAgdHJhaWxpbmc6ICAgICAgICdyaWdodCcsXG4gICAgICAgICAgICBtYXJnaW5MZWFkaW5nOiAgJ21hcmdpbkxlZnQnLFxuICAgICAgICAgICAgbWFyZ2luVHJhaWxpbmc6ICdtYXJnaW5SaWdodCcsXG4gICAgICAgICAgICB0aGlja25lc3M6ICAgICAgJ2hlaWdodCcsXG4gICAgICAgICAgICBkZWx0YTogICAgICAgICAgJ2RlbHRhWCdcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgYXhpcyA9IHtcbiAgICAgICAgdG9wOiAgICAndmVydGljYWwnLFxuICAgICAgICBib3R0b206ICd2ZXJ0aWNhbCcsXG4gICAgICAgIGhlaWdodDogJ3ZlcnRpY2FsJyxcbiAgICAgICAgbGVmdDogICAnaG9yaXpvbnRhbCcsXG4gICAgICAgIHJpZ2h0OiAgJ2hvcml6b250YWwnLFxuICAgICAgICB3aWR0aDogICdob3Jpem9udGFsJ1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAc3VtbWFyeSBJbnNlcnQgYmFzZSBzdHlsZXNoZWV0IGludG8gRE9NXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0VsZW1lbnR9IFtyZWZlcmVuY2VFbGVtZW50XVxuICAgICAqIGlmIGB1bmRlZmluZWRgIChvciBvbWl0dGVkKSBvciBgbnVsbGAsIGluamVjdHMgc3R5bGVzaGVldCBhdCB0b3Agb3IgYm90dG9tIG9mIDxoZWFkPiwgcmVzcGVjdGl2ZWx5LCBidXQgb25seSBvbmNlO1xuICAgICAqIG90aGVyd2lzZSwgaW5qZWN0cyBzdHlsZXNoZWV0IGltbWVkaWF0ZWx5IGJlZm9yZSBnaXZlbiBlbGVtZW50XG4gICAgICovXG4gICAgZnVuY3Rpb24gY3NzSW5qZWN0b3IocmVmZXJlbmNlRWxlbWVudCkge1xuICAgICAgICB2YXIgY29udGFpbmVyLCBzdHlsZSwgSUQgPSAnZmluYmFycy1iYXNlLXN0eWxlcyc7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIWNzc0luamVjdG9yLnRleHQgfHwgLy8gbm8gc3R5bGVzaGVldCBkYXRhXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJRCkgLy8gc3R5bGVzaGVldCBhbHJlYWR5IGluIERPTVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgcmVmZXJlbmNlRWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHJlZmVyZW5jZUVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHJlZmVyZW5jZUVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gcmVmZXJlbmNlRWxlbWVudFswXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXJyb3IoJ0Nhbm5vdCBmaW5kIHJlZmVyZW5jZSBlbGVtZW50IGZvciBDU1MgaW5qZWN0aW9uLicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEocmVmZXJlbmNlRWxlbWVudCBpbnN0YW5jZW9mIEVsZW1lbnQpKSB7XG4gICAgICAgICAgICByZWZlcmVuY2VFbGVtZW50ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgICAgIHN0eWxlLmlkID0gSUQ7XG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3NJbmplY3Rvci50ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzSW5qZWN0b3IudGV4dCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGFpbmVyID0gcmVmZXJlbmNlRWxlbWVudCAmJiByZWZlcmVuY2VFbGVtZW50LnBhcmVudE5vZGUgfHwgZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuXG4gICAgICAgIGlmIChyZWZlcmVuY2VFbGVtZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSBjb250YWluZXIuZmlyc3RDaGlsZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoc3R5bGUsIHJlZmVyZW5jZUVsZW1lbnQpO1xuICAgIH1cbiAgICAvKiBpbmplY3Q6Y3NzICovXG4gICAgY3NzSW5qZWN0b3IudGV4dCA9ICdkaXYuZmluYmFyLWhvcml6b250YWwsZGl2LmZpbmJhci12ZXJ0aWNhbHtwb3NpdGlvbjphYnNvbHV0ZTttYXJnaW46M3B4fWRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWIsZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWJ7cG9zaXRpb246YWJzb2x1dGU7YmFja2dyb3VuZC1jb2xvcjojZDNkM2QzOy13ZWJraXQtYm94LXNoYWRvdzowIDAgMXB4ICMwMDA7LW1vei1ib3gtc2hhZG93OjAgMCAxcHggIzAwMDtib3gtc2hhZG93OjAgMCAxcHggIzAwMDtib3JkZXItcmFkaXVzOjRweDttYXJnaW46MnB4O29wYWNpdHk6LjQ7dHJhbnNpdGlvbjpvcGFjaXR5IC41c31kaXYuZmluYmFyLWhvcml6b250YWw+LnRodW1iLmhvdmVyLGRpdi5maW5iYXItdmVydGljYWw+LnRodW1iLmhvdmVye29wYWNpdHk6MTt0cmFuc2l0aW9uOm9wYWNpdHkgLjVzfWRpdi5maW5iYXItdmVydGljYWx7dG9wOjA7Ym90dG9tOjA7cmlnaHQ6MDt3aWR0aDoxMXB4fWRpdi5maW5iYXItdmVydGljYWw+LnRodW1ie3RvcDowO3JpZ2h0OjA7d2lkdGg6N3B4fWRpdi5maW5iYXItaG9yaXpvbnRhbHtsZWZ0OjA7cmlnaHQ6MDtib3R0b206MDtoZWlnaHQ6MTFweH1kaXYuZmluYmFyLWhvcml6b250YWw+LnRodW1ie2xlZnQ6MDtib3R0b206MDtoZWlnaHQ6N3B4fSc7XG4gICAgLyogZW5kaW5qZWN0ICovXG5cbiAgICBmdW5jdGlvbiBlcnJvcihtc2cpIHtcbiAgICAgICAgdGhyb3cgJ2ZpbmJhcnM6ICcgKyBtc2c7XG4gICAgfVxuXG4gICAgLy8gSW50ZXJmYWNlXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBGaW5CYXI7XG59KShcbiAgICB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUgfHwgKHdpbmRvdy5GaW5CYXIgPSB7fSksXG4gICAgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMgfHwgKHdpbmRvdy5GaW5CYXIuZXhwb3J0cyA9IHt9KVxuKSB8fCAoXG4gICAgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgfHwgKHdpbmRvdy5GaW5CYXIgPSB3aW5kb3cuRmluQmFyLmV4cG9ydHMpXG4pO1xuXG4vKiBBYm91dCB0aGUgYWJvdmUgSUlGRTpcbiAqIFRoaXMgZmlsZSBpcyBhIFwibW9kaWZpZWQgbm9kZSBtb2R1bGUuXCIgSXQgZnVuY3Rpb25zIGFzIHVzdWFsIGluIE5vZGUuanMgKmFuZCogaXMgYWxzbyB1c2FibGUgZGlyZWN0bHkgaW4gdGhlIGJyb3dzZXIuXG4gKiAxLiBOb2RlLmpzOiBUaGUgSUlGRSBpcyBzdXBlcmZsdW91cyBidXQgaW5ub2N1b3VzLlxuICogMi4gSW4gdGhlIGJyb3dzZXI6IFRoZSBJSUZFIGNsb3N1cmUgc2VydmVzIHRvIGtlZXAgaW50ZXJuYWwgZGVjbGFyYXRpb25zIHByaXZhdGUuXG4gKiAyLmEuIEluIHRoZSBicm93c2VyIGFzIGEgZ2xvYmFsOiBUaGUgbG9naWMgaW4gdGhlIGFjdHVhbCBwYXJhbWV0ZXIgZXhwcmVzc2lvbnMgKyB0aGUgcG9zdC1pbnZvY2F0aW9uIGV4cHJlc3Npb25cbiAqIHdpbGwgcHV0IHlvdXIgQVBJIGluIGB3aW5kb3cuRmluQmFyYC5cbiAqIDIuYi4gSW4gdGhlIGJyb3dzZXIgYXMgYSBtb2R1bGU6IElmIHlvdSBwcmVkZWZpbmUgYSBgd2luZG93Lm1vZHVsZWAgb2JqZWN0LCB0aGUgcmVzdWx0cyB3aWxsIGJlIGluIGBtb2R1bGUuZXhwb3J0c2AuXG4gKiBUaGUgYm93ZXIgY29tcG9uZW50IGBtbm1gIG1ha2VzIHRoaXMgZWFzeSBhbmQgYWxzbyBwcm92aWRlcyBhIGdsb2JhbCBgcmVxdWlyZSgpYCBmdW5jdGlvbiBmb3IgcmVmZXJlbmNpbmcgeW91ciBtb2R1bGVcbiAqIGZyb20gb3RoZXIgY2xvc3VyZXMuIEluIGVpdGhlciBjYXNlLCB0aGlzIHdvcmtzIHdpdGggYm90aCBOb2RlSnMtc3R5bGUgZXhwb3J0IG1lY2hhbmlzbXMgLS0gYSBzaW5nbGUgQVBJIGFzc2lnbm1lbnQsXG4gKiBgbW9kdWxlLmV4cG9ydHMgPSB5b3VyQVBJYCAqb3IqIGEgc2VyaWVzIG9mIGluZGl2aWR1YWwgcHJvcGVydHkgYXNzaWdubWVudHMsIGBtb2R1bGUuZXhwb3J0cy5wcm9wZXJ0eSA9IHByb3BlcnR5YC5cbiAqXG4gKiBCZWZvcmUgdGhlIElJRkUgcnVucywgdGhlIGFjdHVhbCBwYXJhbWV0ZXIgZXhwcmVzc2lvbnMgYXJlIGV4ZWN1dGVkOlxuICogMS4gSWYgYG1vZHVsZWAgb2JqZWN0IGRlZmluZWQsIHdlJ3JlIGluIE5vZGVKcyBzbyBhc3N1bWUgdGhlcmUgaXMgYSBgbW9kdWxlYCBvYmplY3Qgd2l0aCBhbiBgZXhwb3J0c2Agb2JqZWN0XG4gKiAyLiBJZiBgbW9kdWxlYCBvYmplY3QgdW5kZWZpbmVkLCB3ZSdyZSBpbiBicm93c2VyIHNvIGRlZmluZSBhIGB3aW5kb3cuRmluQmFyYCBvYmplY3Qgd2l0aCBhbiBgZXhwb3J0c2Agb2JqZWN0XG4gKlxuICogQWZ0ZXIgdGhlIElJRkUgcmV0dXJuczpcbiAqIEJlY2F1c2UgaXQgYWx3YXlzIHJldHVybnMgdW5kZWZpbmVkLCB0aGUgZXhwcmVzc2lvbiBhZnRlciB0aGUgfHwgd2lsbCBhbHdheXMgZXhlY3V0ZTpcbiAqIDEuIElmIGBtb2R1bGVgIG9iamVjdCBkZWZpbmVkLCB0aGVuIHdlJ3JlIGluIE5vZGVKcyBzbyB3ZSdyZSBkb25lXG4gKiAyLiBJZiBgbW9kdWxlYCBvYmplY3QgdW5kZWZpbmVkLCB0aGVuIHdlJ3JlIGluIGJyb3dzZXIgc28gcmVkZWZpbmVgd2luZG93LkZpbkJhcmAgYXMgaXRzIGBleHBvcnRzYCBvYmplY3RcbiAqL1xuIiwiOyhmdW5jdGlvbiAoKSB7IC8vIGNsb3N1cmUgZm9yIHdlYiBicm93c2Vyc1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBMUlVDYWNoZVxufSBlbHNlIHtcbiAgLy8ganVzdCBzZXQgdGhlIGdsb2JhbCBmb3Igbm9uLW5vZGUgcGxhdGZvcm1zLlxuICB0aGlzLkxSVUNhY2hlID0gTFJVQ2FjaGVcbn1cblxuZnVuY3Rpb24gaE9QIChvYmosIGtleSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KVxufVxuXG5mdW5jdGlvbiBuYWl2ZUxlbmd0aCAoKSB7IHJldHVybiAxIH1cblxuZnVuY3Rpb24gTFJVQ2FjaGUgKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIExSVUNhY2hlKSlcbiAgICByZXR1cm4gbmV3IExSVUNhY2hlKG9wdGlvbnMpXG5cbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnbnVtYmVyJylcbiAgICBvcHRpb25zID0geyBtYXg6IG9wdGlvbnMgfVxuXG4gIGlmICghb3B0aW9ucylcbiAgICBvcHRpb25zID0ge31cblxuICB0aGlzLl9tYXggPSBvcHRpb25zLm1heFxuICAvLyBLaW5kIG9mIHdlaXJkIHRvIGhhdmUgYSBkZWZhdWx0IG1heCBvZiBJbmZpbml0eSwgYnV0IG9oIHdlbGwuXG4gIGlmICghdGhpcy5fbWF4IHx8ICEodHlwZW9mIHRoaXMuX21heCA9PT0gXCJudW1iZXJcIikgfHwgdGhpcy5fbWF4IDw9IDAgKVxuICAgIHRoaXMuX21heCA9IEluZmluaXR5XG5cbiAgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciA9IG9wdGlvbnMubGVuZ3RoIHx8IG5haXZlTGVuZ3RoXG4gIGlmICh0eXBlb2YgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciAhPT0gXCJmdW5jdGlvblwiKVxuICAgIHRoaXMuX2xlbmd0aENhbGN1bGF0b3IgPSBuYWl2ZUxlbmd0aFxuXG4gIHRoaXMuX2FsbG93U3RhbGUgPSBvcHRpb25zLnN0YWxlIHx8IGZhbHNlXG4gIHRoaXMuX21heEFnZSA9IG9wdGlvbnMubWF4QWdlIHx8IG51bGxcbiAgdGhpcy5fZGlzcG9zZSA9IG9wdGlvbnMuZGlzcG9zZVxuICB0aGlzLnJlc2V0KClcbn1cblxuLy8gcmVzaXplIHRoZSBjYWNoZSB3aGVuIHRoZSBtYXggY2hhbmdlcy5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShMUlVDYWNoZS5wcm90b3R5cGUsIFwibWF4XCIsXG4gIHsgc2V0IDogZnVuY3Rpb24gKG1MKSB7XG4gICAgICBpZiAoIW1MIHx8ICEodHlwZW9mIG1MID09PSBcIm51bWJlclwiKSB8fCBtTCA8PSAwICkgbUwgPSBJbmZpbml0eVxuICAgICAgdGhpcy5fbWF4ID0gbUxcbiAgICAgIGlmICh0aGlzLl9sZW5ndGggPiB0aGlzLl9tYXgpIHRyaW0odGhpcylcbiAgICB9XG4gICwgZ2V0IDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fbWF4IH1cbiAgLCBlbnVtZXJhYmxlIDogdHJ1ZVxuICB9KVxuXG4vLyByZXNpemUgdGhlIGNhY2hlIHdoZW4gdGhlIGxlbmd0aENhbGN1bGF0b3IgY2hhbmdlcy5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShMUlVDYWNoZS5wcm90b3R5cGUsIFwibGVuZ3RoQ2FsY3VsYXRvclwiLFxuICB7IHNldCA6IGZ1bmN0aW9uIChsQykge1xuICAgICAgaWYgKHR5cGVvZiBsQyAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRoaXMuX2xlbmd0aENhbGN1bGF0b3IgPSBuYWl2ZUxlbmd0aFxuICAgICAgICB0aGlzLl9sZW5ndGggPSB0aGlzLl9pdGVtQ291bnRcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuX2NhY2hlKSB7XG4gICAgICAgICAgdGhpcy5fY2FjaGVba2V5XS5sZW5ndGggPSAxXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2xlbmd0aENhbGN1bGF0b3IgPSBsQ1xuICAgICAgICB0aGlzLl9sZW5ndGggPSAwXG4gICAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9jYWNoZSkge1xuICAgICAgICAgIHRoaXMuX2NhY2hlW2tleV0ubGVuZ3RoID0gdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvcih0aGlzLl9jYWNoZVtrZXldLnZhbHVlKVxuICAgICAgICAgIHRoaXMuX2xlbmd0aCArPSB0aGlzLl9jYWNoZVtrZXldLmxlbmd0aFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9sZW5ndGggPiB0aGlzLl9tYXgpIHRyaW0odGhpcylcbiAgICB9XG4gICwgZ2V0IDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciB9XG4gICwgZW51bWVyYWJsZSA6IHRydWVcbiAgfSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KExSVUNhY2hlLnByb3RvdHlwZSwgXCJsZW5ndGhcIixcbiAgeyBnZXQgOiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9sZW5ndGggfVxuICAsIGVudW1lcmFibGUgOiB0cnVlXG4gIH0pXG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KExSVUNhY2hlLnByb3RvdHlwZSwgXCJpdGVtQ291bnRcIixcbiAgeyBnZXQgOiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9pdGVtQ291bnQgfVxuICAsIGVudW1lcmFibGUgOiB0cnVlXG4gIH0pXG5cbkxSVUNhY2hlLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gKGZuLCB0aGlzcCkge1xuICB0aGlzcCA9IHRoaXNwIHx8IHRoaXNcbiAgdmFyIGkgPSAwXG4gIHZhciBpdGVtQ291bnQgPSB0aGlzLl9pdGVtQ291bnRcblxuICBmb3IgKHZhciBrID0gdGhpcy5fbXJ1IC0gMTsgayA+PSAwICYmIGkgPCBpdGVtQ291bnQ7IGstLSkgaWYgKHRoaXMuX2xydUxpc3Rba10pIHtcbiAgICBpKytcbiAgICB2YXIgaGl0ID0gdGhpcy5fbHJ1TGlzdFtrXVxuICAgIGlmIChpc1N0YWxlKHRoaXMsIGhpdCkpIHtcbiAgICAgIGRlbCh0aGlzLCBoaXQpXG4gICAgICBpZiAoIXRoaXMuX2FsbG93U3RhbGUpIGhpdCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgICBpZiAoaGl0KSB7XG4gICAgICBmbi5jYWxsKHRoaXNwLCBoaXQudmFsdWUsIGhpdC5rZXksIHRoaXMpXG4gICAgfVxuICB9XG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24gKCkge1xuICB2YXIga2V5cyA9IG5ldyBBcnJheSh0aGlzLl9pdGVtQ291bnQpXG4gIHZhciBpID0gMFxuICBmb3IgKHZhciBrID0gdGhpcy5fbXJ1IC0gMTsgayA+PSAwICYmIGkgPCB0aGlzLl9pdGVtQ291bnQ7IGstLSkgaWYgKHRoaXMuX2xydUxpc3Rba10pIHtcbiAgICB2YXIgaGl0ID0gdGhpcy5fbHJ1TGlzdFtrXVxuICAgIGtleXNbaSsrXSA9IGhpdC5rZXlcbiAgfVxuICByZXR1cm4ga2V5c1xufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KHRoaXMuX2l0ZW1Db3VudClcbiAgdmFyIGkgPSAwXG4gIGZvciAodmFyIGsgPSB0aGlzLl9tcnUgLSAxOyBrID49IDAgJiYgaSA8IHRoaXMuX2l0ZW1Db3VudDsgay0tKSBpZiAodGhpcy5fbHJ1TGlzdFtrXSkge1xuICAgIHZhciBoaXQgPSB0aGlzLl9scnVMaXN0W2tdXG4gICAgdmFsdWVzW2krK10gPSBoaXQudmFsdWVcbiAgfVxuICByZXR1cm4gdmFsdWVzXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2Rpc3Bvc2UgJiYgdGhpcy5fY2FjaGUpIHtcbiAgICBmb3IgKHZhciBrIGluIHRoaXMuX2NhY2hlKSB7XG4gICAgICB0aGlzLl9kaXNwb3NlKGssIHRoaXMuX2NhY2hlW2tdLnZhbHVlKVxuICAgIH1cbiAgfVxuXG4gIHRoaXMuX2NhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKSAvLyBoYXNoIG9mIGl0ZW1zIGJ5IGtleVxuICB0aGlzLl9scnVMaXN0ID0gT2JqZWN0LmNyZWF0ZShudWxsKSAvLyBsaXN0IG9mIGl0ZW1zIGluIG9yZGVyIG9mIHVzZSByZWNlbmN5XG4gIHRoaXMuX21ydSA9IDAgLy8gbW9zdCByZWNlbnRseSB1c2VkXG4gIHRoaXMuX2xydSA9IDAgLy8gbGVhc3QgcmVjZW50bHkgdXNlZFxuICB0aGlzLl9sZW5ndGggPSAwIC8vIG51bWJlciBvZiBpdGVtcyBpbiB0aGUgbGlzdFxuICB0aGlzLl9pdGVtQ291bnQgPSAwXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5kdW1wID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYXJyID0gW11cbiAgdmFyIGkgPSAwXG5cbiAgZm9yICh2YXIgayA9IHRoaXMuX21ydSAtIDE7IGsgPj0gMCAmJiBpIDwgdGhpcy5faXRlbUNvdW50OyBrLS0pIGlmICh0aGlzLl9scnVMaXN0W2tdKSB7XG4gICAgdmFyIGhpdCA9IHRoaXMuX2xydUxpc3Rba11cbiAgICBpZiAoIWlzU3RhbGUodGhpcywgaGl0KSkge1xuICAgICAgLy9EbyBub3Qgc3RvcmUgc3RhbGVkIGhpdHNcbiAgICAgICsraVxuICAgICAgYXJyLnB1c2goe1xuICAgICAgICBrOiBoaXQua2V5LFxuICAgICAgICB2OiBoaXQudmFsdWUsXG4gICAgICAgIGU6IGhpdC5ub3cgKyAoaGl0Lm1heEFnZSB8fCAwKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIC8vYXJyIGhhcyB0aGUgbW9zdCByZWFkIGZpcnN0XG4gIHJldHVybiBhcnJcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmR1bXBMcnUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9scnVMaXN0XG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSwgbWF4QWdlKSB7XG4gIG1heEFnZSA9IG1heEFnZSB8fCB0aGlzLl9tYXhBZ2VcbiAgdmFyIG5vdyA9IG1heEFnZSA/IERhdGUubm93KCkgOiAwXG4gIHZhciBsZW4gPSB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yKHZhbHVlKVxuXG4gIGlmIChoT1AodGhpcy5fY2FjaGUsIGtleSkpIHtcbiAgICBpZiAobGVuID4gdGhpcy5fbWF4KSB7XG4gICAgICBkZWwodGhpcywgdGhpcy5fY2FjaGVba2V5XSlcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICAvLyBkaXNwb3NlIG9mIHRoZSBvbGQgb25lIGJlZm9yZSBvdmVyd3JpdGluZ1xuICAgIGlmICh0aGlzLl9kaXNwb3NlKVxuICAgICAgdGhpcy5fZGlzcG9zZShrZXksIHRoaXMuX2NhY2hlW2tleV0udmFsdWUpXG5cbiAgICB0aGlzLl9jYWNoZVtrZXldLm5vdyA9IG5vd1xuICAgIHRoaXMuX2NhY2hlW2tleV0ubWF4QWdlID0gbWF4QWdlXG4gICAgdGhpcy5fY2FjaGVba2V5XS52YWx1ZSA9IHZhbHVlXG4gICAgdGhpcy5fbGVuZ3RoICs9IChsZW4gLSB0aGlzLl9jYWNoZVtrZXldLmxlbmd0aClcbiAgICB0aGlzLl9jYWNoZVtrZXldLmxlbmd0aCA9IGxlblxuICAgIHRoaXMuZ2V0KGtleSlcblxuICAgIGlmICh0aGlzLl9sZW5ndGggPiB0aGlzLl9tYXgpXG4gICAgICB0cmltKHRoaXMpXG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgdmFyIGhpdCA9IG5ldyBFbnRyeShrZXksIHZhbHVlLCB0aGlzLl9tcnUrKywgbGVuLCBub3csIG1heEFnZSlcblxuICAvLyBvdmVyc2l6ZWQgb2JqZWN0cyBmYWxsIG91dCBvZiBjYWNoZSBhdXRvbWF0aWNhbGx5LlxuICBpZiAoaGl0Lmxlbmd0aCA+IHRoaXMuX21heCkge1xuICAgIGlmICh0aGlzLl9kaXNwb3NlKSB0aGlzLl9kaXNwb3NlKGtleSwgdmFsdWUpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICB0aGlzLl9sZW5ndGggKz0gaGl0Lmxlbmd0aFxuICB0aGlzLl9scnVMaXN0W2hpdC5sdV0gPSB0aGlzLl9jYWNoZVtrZXldID0gaGl0XG4gIHRoaXMuX2l0ZW1Db3VudCArK1xuXG4gIGlmICh0aGlzLl9sZW5ndGggPiB0aGlzLl9tYXgpXG4gICAgdHJpbSh0aGlzKVxuXG4gIHJldHVybiB0cnVlXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIGlmICghaE9QKHRoaXMuX2NhY2hlLCBrZXkpKSByZXR1cm4gZmFsc2VcbiAgdmFyIGhpdCA9IHRoaXMuX2NhY2hlW2tleV1cbiAgaWYgKGlzU3RhbGUodGhpcywgaGl0KSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIHJldHVybiBnZXQodGhpcywga2V5LCB0cnVlKVxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUucGVlayA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIGdldCh0aGlzLCBrZXksIGZhbHNlKVxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUucG9wID0gZnVuY3Rpb24gKCkge1xuICB2YXIgaGl0ID0gdGhpcy5fbHJ1TGlzdFt0aGlzLl9scnVdXG4gIGRlbCh0aGlzLCBoaXQpXG4gIHJldHVybiBoaXQgfHwgbnVsbFxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUuZGVsID0gZnVuY3Rpb24gKGtleSkge1xuICBkZWwodGhpcywgdGhpcy5fY2FjaGVba2V5XSlcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIC8vcmVzZXQgdGhlIGNhY2hlXG4gIHRoaXMucmVzZXQoKTtcblxuICB2YXIgbm93ID0gRGF0ZS5ub3coKVxuICAvL0EgcHJldmlvdXMgc2VyaWFsaXplZCBjYWNoZSBoYXMgdGhlIG1vc3QgcmVjZW50IGl0ZW1zIGZpcnN0XG4gIGZvciAodmFyIGwgPSBhcnIubGVuZ3RoIC0gMTsgbCA+PSAwOyBsLS0gKSB7XG4gICAgdmFyIGhpdCA9IGFycltsXVxuICAgIHZhciBleHBpcmVzQXQgPSBoaXQuZSB8fCAwXG4gICAgaWYgKGV4cGlyZXNBdCA9PT0gMCkge1xuICAgICAgLy90aGUgaXRlbSB3YXMgY3JlYXRlZCB3aXRob3V0IGV4cGlyYXRpb24gaW4gYSBub24gYWdlZCBjYWNoZVxuICAgICAgdGhpcy5zZXQoaGl0LmssIGhpdC52KVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbWF4QWdlID0gZXhwaXJlc0F0IC0gbm93XG4gICAgICAvL2RvbnQgYWRkIGFscmVhZHkgZXhwaXJlZCBpdGVtc1xuICAgICAgaWYgKG1heEFnZSA+IDApIHRoaXMuc2V0KGhpdC5rLCBoaXQudiwgbWF4QWdlKVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXQgKHNlbGYsIGtleSwgZG9Vc2UpIHtcbiAgdmFyIGhpdCA9IHNlbGYuX2NhY2hlW2tleV1cbiAgaWYgKGhpdCkge1xuICAgIGlmIChpc1N0YWxlKHNlbGYsIGhpdCkpIHtcbiAgICAgIGRlbChzZWxmLCBoaXQpXG4gICAgICBpZiAoIXNlbGYuX2FsbG93U3RhbGUpIGhpdCA9IHVuZGVmaW5lZFxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZG9Vc2UpIHVzZShzZWxmLCBoaXQpXG4gICAgfVxuICAgIGlmIChoaXQpIGhpdCA9IGhpdC52YWx1ZVxuICB9XG4gIHJldHVybiBoaXRcbn1cblxuZnVuY3Rpb24gaXNTdGFsZShzZWxmLCBoaXQpIHtcbiAgaWYgKCFoaXQgfHwgKCFoaXQubWF4QWdlICYmICFzZWxmLl9tYXhBZ2UpKSByZXR1cm4gZmFsc2VcbiAgdmFyIHN0YWxlID0gZmFsc2U7XG4gIHZhciBkaWZmID0gRGF0ZS5ub3coKSAtIGhpdC5ub3dcbiAgaWYgKGhpdC5tYXhBZ2UpIHtcbiAgICBzdGFsZSA9IGRpZmYgPiBoaXQubWF4QWdlXG4gIH0gZWxzZSB7XG4gICAgc3RhbGUgPSBzZWxmLl9tYXhBZ2UgJiYgKGRpZmYgPiBzZWxmLl9tYXhBZ2UpXG4gIH1cbiAgcmV0dXJuIHN0YWxlO1xufVxuXG5mdW5jdGlvbiB1c2UgKHNlbGYsIGhpdCkge1xuICBzaGlmdExVKHNlbGYsIGhpdClcbiAgaGl0Lmx1ID0gc2VsZi5fbXJ1ICsrXG4gIHNlbGYuX2xydUxpc3RbaGl0Lmx1XSA9IGhpdFxufVxuXG5mdW5jdGlvbiB0cmltIChzZWxmKSB7XG4gIHdoaWxlIChzZWxmLl9scnUgPCBzZWxmLl9tcnUgJiYgc2VsZi5fbGVuZ3RoID4gc2VsZi5fbWF4KVxuICAgIGRlbChzZWxmLCBzZWxmLl9scnVMaXN0W3NlbGYuX2xydV0pXG59XG5cbmZ1bmN0aW9uIHNoaWZ0TFUgKHNlbGYsIGhpdCkge1xuICBkZWxldGUgc2VsZi5fbHJ1TGlzdFsgaGl0Lmx1IF1cbiAgd2hpbGUgKHNlbGYuX2xydSA8IHNlbGYuX21ydSAmJiAhc2VsZi5fbHJ1TGlzdFtzZWxmLl9scnVdKSBzZWxmLl9scnUgKytcbn1cblxuZnVuY3Rpb24gZGVsIChzZWxmLCBoaXQpIHtcbiAgaWYgKGhpdCkge1xuICAgIGlmIChzZWxmLl9kaXNwb3NlKSBzZWxmLl9kaXNwb3NlKGhpdC5rZXksIGhpdC52YWx1ZSlcbiAgICBzZWxmLl9sZW5ndGggLT0gaGl0Lmxlbmd0aFxuICAgIHNlbGYuX2l0ZW1Db3VudCAtLVxuICAgIGRlbGV0ZSBzZWxmLl9jYWNoZVsgaGl0LmtleSBdXG4gICAgc2hpZnRMVShzZWxmLCBoaXQpXG4gIH1cbn1cblxuLy8gY2xhc3N5LCBzaW5jZSBWOCBwcmVmZXJzIHByZWRpY3RhYmxlIG9iamVjdHMuXG5mdW5jdGlvbiBFbnRyeSAoa2V5LCB2YWx1ZSwgbHUsIGxlbmd0aCwgbm93LCBtYXhBZ2UpIHtcbiAgdGhpcy5rZXkgPSBrZXlcbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG4gIHRoaXMubHUgPSBsdVxuICB0aGlzLmxlbmd0aCA9IGxlbmd0aFxuICB0aGlzLm5vdyA9IG5vd1xuICBpZiAobWF4QWdlKSB0aGlzLm1heEFnZSA9IG1heEFnZVxufVxuXG59KSgpXG4iLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjguM1xuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kLFxuICAgIG5hdGl2ZUNyZWF0ZSAgICAgICA9IE9iamVjdC5jcmVhdGU7XG5cbiAgLy8gTmFrZWQgZnVuY3Rpb24gcmVmZXJlbmNlIGZvciBzdXJyb2dhdGUtcHJvdG90eXBlLXN3YXBwaW5nLlxuICB2YXIgQ3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuOC4zJztcblxuICAvLyBJbnRlcm5hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gZWZmaWNpZW50IChmb3IgY3VycmVudCBlbmdpbmVzKSB2ZXJzaW9uXG4gIC8vIG9mIHRoZSBwYXNzZWQtaW4gY2FsbGJhY2ssIHRvIGJlIHJlcGVhdGVkbHkgYXBwbGllZCBpbiBvdGhlciBVbmRlcnNjb3JlXG4gIC8vIGZ1bmN0aW9ucy5cbiAgdmFyIG9wdGltaXplQ2IgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmIChjb250ZXh0ID09PSB2b2lkIDApIHJldHVybiBmdW5jO1xuICAgIHN3aXRjaCAoYXJnQ291bnQgPT0gbnVsbCA/IDMgOiBhcmdDb3VudCkge1xuICAgICAgY2FzZSAxOiByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSk7XG4gICAgICB9O1xuICAgICAgY2FzZSAyOiByZXR1cm4gZnVuY3Rpb24odmFsdWUsIG90aGVyKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmNhbGwoY29udGV4dCwgdmFsdWUsIG90aGVyKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCBhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBBIG1vc3RseS1pbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBjYWxsYmFja3MgdGhhdCBjYW4gYmUgYXBwbGllZFxuICAvLyB0byBlYWNoIGVsZW1lbnQgaW4gYSBjb2xsZWN0aW9uLCByZXR1cm5pbmcgdGhlIGRlc2lyZWQgcmVzdWx0IOKAlCBlaXRoZXJcbiAgLy8gaWRlbnRpdHksIGFuIGFyYml0cmFyeSBjYWxsYmFjaywgYSBwcm9wZXJ0eSBtYXRjaGVyLCBvciBhIHByb3BlcnR5IGFjY2Vzc29yLlxuICB2YXIgY2IgPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCwgYXJnQ291bnQpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiBvcHRpbWl6ZUNiKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCk7XG4gICAgaWYgKF8uaXNPYmplY3QodmFsdWUpKSByZXR1cm4gXy5tYXRjaGVyKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG4gIF8uaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBjYih2YWx1ZSwgY29udGV4dCwgSW5maW5pdHkpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhc3NpZ25lciBmdW5jdGlvbnMuXG4gIHZhciBjcmVhdGVBc3NpZ25lciA9IGZ1bmN0aW9uKGtleXNGdW5jLCB1bmRlZmluZWRPbmx5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoIDwgMiB8fCBvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF0sXG4gICAgICAgICAgICBrZXlzID0ga2V5c0Z1bmMoc291cmNlKSxcbiAgICAgICAgICAgIGwgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoIXVuZGVmaW5lZE9ubHkgfHwgb2JqW2tleV0gPT09IHZvaWQgMCkgb2JqW2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIG5ldyBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIGFub3RoZXIuXG4gIHZhciBiYXNlQ3JlYXRlID0gZnVuY3Rpb24ocHJvdG90eXBlKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KHByb3RvdHlwZSkpIHJldHVybiB7fTtcbiAgICBpZiAobmF0aXZlQ3JlYXRlKSByZXR1cm4gbmF0aXZlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgQ3Rvci5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBDdG9yO1xuICAgIEN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHZhciBwcm9wZXJ0eSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogPT0gbnVsbCA/IHZvaWQgMCA6IG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gSGVscGVyIGZvciBjb2xsZWN0aW9uIG1ldGhvZHMgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYSBjb2xsZWN0aW9uXG4gIC8vIHNob3VsZCBiZSBpdGVyYXRlZCBhcyBhbiBhcnJheSBvciBhcyBhbiBvYmplY3RcbiAgLy8gUmVsYXRlZDogaHR0cDovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtdG9sZW5ndGhcbiAgLy8gQXZvaWRzIGEgdmVyeSBuYXN0eSBpT1MgOCBKSVQgYnVnIG9uIEFSTS02NC4gIzIwOTRcbiAgdmFyIE1BWF9BUlJBWV9JTkRFWCA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gIHZhciBnZXRMZW5ndGggPSBwcm9wZXJ0eSgnbGVuZ3RoJyk7XG4gIHZhciBpc0FycmF5TGlrZSA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgbGVuZ3RoID0gZ2V0TGVuZ3RoKGNvbGxlY3Rpb24pO1xuICAgIHJldHVybiB0eXBlb2YgbGVuZ3RoID09ICdudW1iZXInICYmIGxlbmd0aCA+PSAwICYmIGxlbmd0aCA8PSBNQVhfQVJSQVlfSU5ERVg7XG4gIH07XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyByYXcgb2JqZWN0cyBpbiBhZGRpdGlvbiB0byBhcnJheS1saWtlcy4gVHJlYXRzIGFsbFxuICAvLyBzcGFyc2UgYXJyYXktbGlrZXMgYXMgaWYgdGhleSB3ZXJlIGRlbnNlLlxuICBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIgaSwgbGVuZ3RoO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopKSB7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaXRlcmF0ZWUob2JqW2ldLCBpLCBvYmopO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRlZSB0byBlYWNoIGVsZW1lbnQuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICByZXN1bHRzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgcmVzdWx0c1tpbmRleF0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIHJlZHVjaW5nIGZ1bmN0aW9uIGl0ZXJhdGluZyBsZWZ0IG9yIHJpZ2h0LlxuICBmdW5jdGlvbiBjcmVhdGVSZWR1Y2UoZGlyKSB7XG4gICAgLy8gT3B0aW1pemVkIGl0ZXJhdG9yIGZ1bmN0aW9uIGFzIHVzaW5nIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAvLyBpbiB0aGUgbWFpbiBmdW5jdGlvbiB3aWxsIGRlb3B0aW1pemUgdGhlLCBzZWUgIzE5OTEuXG4gICAgZnVuY3Rpb24gaXRlcmF0b3Iob2JqLCBpdGVyYXRlZSwgbWVtbywga2V5cywgaW5kZXgsIGxlbmd0aCkge1xuICAgICAgZm9yICg7IGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IGRpcikge1xuICAgICAgICB2YXIgY3VycmVudEtleSA9IGtleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4O1xuICAgICAgICBtZW1vID0gaXRlcmF0ZWUobWVtbywgb2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGNvbnRleHQpIHtcbiAgICAgIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwgY29udGV4dCwgNCk7XG4gICAgICB2YXIga2V5cyA9ICFpc0FycmF5TGlrZShvYmopICYmIF8ua2V5cyhvYmopLFxuICAgICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICAgIGluZGV4ID0gZGlyID4gMCA/IDAgOiBsZW5ndGggLSAxO1xuICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBpbml0aWFsIHZhbHVlIGlmIG5vbmUgaXMgcHJvdmlkZWQuXG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgbWVtbyA9IG9ialtrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleF07XG4gICAgICAgIGluZGV4ICs9IGRpcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRvcihvYmosIGl0ZXJhdGVlLCBtZW1vLCBrZXlzLCBpbmRleCwgbGVuZ3RoKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGNyZWF0ZVJlZHVjZSgxKTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBjcmVhdGVSZWR1Y2UoLTEpO1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciBrZXk7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcbiAgICAgIGtleSA9IF8uZmluZEluZGV4KG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5ID0gXy5maW5kS2V5KG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKGtleSAhPT0gdm9pZCAwICYmIGtleSAhPT0gLTEpIHJldHVybiBvYmpba2V5XTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubmVnYXRlKGNiKHByZWRpY2F0ZSkpLCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBpZiAoIXByZWRpY2F0ZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICBpZiAocHJlZGljYXRlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKSkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIGl0ZW0gKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZXNgIGFuZCBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGVzID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCBpdGVtLCBmcm9tSW5kZXgsIGd1YXJkKSB7XG4gICAgaWYgKCFpc0FycmF5TGlrZShvYmopKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgIGlmICh0eXBlb2YgZnJvbUluZGV4ICE9ICdudW1iZXInIHx8IGd1YXJkKSBmcm9tSW5kZXggPSAwO1xuICAgIHJldHVybiBfLmluZGV4T2Yob2JqLCBpdGVtLCBmcm9tSW5kZXgpID49IDA7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBmdW5jID0gaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXTtcbiAgICAgIHJldHVybiBmdW5jID09IG51bGwgPyBmdW5jIDogZnVuYy5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgXy5wcm9wZXJ0eShrZXkpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5tYXRjaGVyKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maW5kKG9iaiwgXy5tYXRjaGVyKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHksXG4gICAgICAgIHZhbHVlLCBjb21wdXRlZDtcbiAgICBpZiAoaXRlcmF0ZWUgPT0gbnVsbCAmJiBvYmogIT0gbnVsbCkge1xuICAgICAgb2JqID0gaXNBcnJheUxpa2Uob2JqKSA/IG9iaiA6IF8udmFsdWVzKG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlID0gb2JqW2ldO1xuICAgICAgICBpZiAodmFsdWUgPiByZXN1bHQpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgICBjb21wdXRlZCA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCB8fCBjb21wdXRlZCA9PT0gLUluZmluaXR5ICYmIHJlc3VsdCA9PT0gLUluZmluaXR5KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdCA9IEluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSBJbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBpc0FycmF5TGlrZShvYmopID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA8IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkIDwgbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSBJbmZpbml0eSAmJiByZXN1bHQgPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFNodWZmbGUgYSBjb2xsZWN0aW9uLCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHNldCA9IGlzQXJyYXlMaWtlKG9iaikgPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBzZXQubGVuZ3RoO1xuICAgIHZhciBzaHVmZmxlZCA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwLCByYW5kOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKDAsIGluZGV4KTtcbiAgICAgIGlmIChyYW5kICE9PSBpbmRleCkgc2h1ZmZsZWRbaW5kZXhdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHNldFtpbmRleF07XG4gICAgfVxuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKCFpc0FycmF5TGlrZShvYmopKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRlZS5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXg7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24oYmVoYXZpb3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdGVlKHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgICAgYmVoYXZpb3IocmVzdWx0LCB2YWx1ZSwga2V5KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldLnB1c2godmFsdWUpOyBlbHNlIHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIHZhbHVlLCBrZXkpIHtcbiAgICBpZiAoXy5oYXMocmVzdWx0LCBrZXkpKSByZXN1bHRba2V5XSsrOyBlbHNlIHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gaXNBcnJheUxpa2Uob2JqKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gU3BsaXQgYSBjb2xsZWN0aW9uIGludG8gdHdvIGFycmF5czogb25lIHdob3NlIGVsZW1lbnRzIGFsbCBzYXRpc2Z5IHRoZSBnaXZlblxuICAvLyBwcmVkaWNhdGUsIGFuZCBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIGRvIG5vdCBzYXRpc2Z5IHRoZSBwcmVkaWNhdGUuXG4gIF8ucGFydGl0aW9uID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBwYXNzID0gW10sIGZhaWwgPSBbXTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmopIHtcbiAgICAgIChwcmVkaWNhdGUodmFsdWUsIGtleSwgb2JqKSA/IHBhc3MgOiBmYWlsKS5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbMF07XG4gICAgcmV0dXJuIF8uaW5pdGlhbChhcnJheSwgYXJyYXkubGVuZ3RoIC0gbik7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIG9uXG4gIC8vIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIGFsbCB0aGUgdmFsdWVzIGluXG4gIC8vIHRoZSBhcnJheSwgZXhjbHVkaW5nIHRoZSBsYXN0IE4uXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBNYXRoLm1heCgwLCBhcnJheS5sZW5ndGggLSAobiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIF8ucmVzdChhcnJheSwgTWF0aC5tYXgoMCwgYXJyYXkubGVuZ3RoIC0gbikpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgbiA9PSBudWxsIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgc3RyaWN0LCBzdGFydEluZGV4KSB7XG4gICAgdmFyIG91dHB1dCA9IFtdLCBpZHggPSAwO1xuICAgIGZvciAodmFyIGkgPSBzdGFydEluZGV4IHx8IDAsIGxlbmd0aCA9IGdldExlbmd0aChpbnB1dCk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gaW5wdXRbaV07XG4gICAgICBpZiAoaXNBcnJheUxpa2UodmFsdWUpICYmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSkge1xuICAgICAgICAvL2ZsYXR0ZW4gY3VycmVudCBsZXZlbCBvZiBhcnJheSBvciBhcmd1bWVudHMgb2JqZWN0XG4gICAgICAgIGlmICghc2hhbGxvdykgdmFsdWUgPSBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBzdHJpY3QpO1xuICAgICAgICB2YXIgaiA9IDAsIGxlbiA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgb3V0cHV0Lmxlbmd0aCArPSBsZW47XG4gICAgICAgIHdoaWxlIChqIDwgbGVuKSB7XG4gICAgICAgICAgb3V0cHV0W2lkeCsrXSA9IHZhbHVlW2orK107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXN0cmljdCkge1xuICAgICAgICBvdXRwdXRbaWR4KytdID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBmYWxzZSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGlmICghXy5pc0Jvb2xlYW4oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0ZWU7XG4gICAgICBpdGVyYXRlZSA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGl0ZXJhdGVlICE9IG51bGwpIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldLFxuICAgICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUgPyBpdGVyYXRlZSh2YWx1ZSwgaSwgYXJyYXkpIDogdmFsdWU7XG4gICAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgICAgaWYgKCFpIHx8IHNlZW4gIT09IGNvbXB1dGVkKSByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIHNlZW4gPSBjb21wdXRlZDtcbiAgICAgIH0gZWxzZSBpZiAoaXRlcmF0ZWUpIHtcbiAgICAgICAgaWYgKCFfLmNvbnRhaW5zKHNlZW4sIGNvbXB1dGVkKSkge1xuICAgICAgICAgIHNlZW4ucHVzaChjb21wdXRlZCk7XG4gICAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFfLmNvbnRhaW5zKHJlc3VsdCwgdmFsdWUpKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKGZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlLCB0cnVlKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBhcmdzTGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaXRlbSA9IGFycmF5W2ldO1xuICAgICAgaWYgKF8uY29udGFpbnMocmVzdWx0LCBpdGVtKSkgY29udGludWU7XG4gICAgICBmb3IgKHZhciBqID0gMTsgaiA8IGFyZ3NMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoIV8uY29udGFpbnMoYXJndW1lbnRzW2pdLCBpdGVtKSkgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoaiA9PT0gYXJnc0xlbmd0aCkgcmVzdWx0LnB1c2goaXRlbSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gZmxhdHRlbihhcmd1bWVudHMsIHRydWUsIHRydWUsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpe1xuICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuemlwKGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLy8gQ29tcGxlbWVudCBvZiBfLnppcC4gVW56aXAgYWNjZXB0cyBhbiBhcnJheSBvZiBhcnJheXMgYW5kIGdyb3Vwc1xuICAvLyBlYWNoIGFycmF5J3MgZWxlbWVudHMgb24gc2hhcmVkIGluZGljZXNcbiAgXy51bnppcCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIGxlbmd0aCA9IGFycmF5ICYmIF8ubWF4KGFycmF5LCBnZXRMZW5ndGgpLmxlbmd0aCB8fCAwO1xuICAgIHZhciByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgcmVzdWx0W2luZGV4XSA9IF8ucGx1Y2soYXJyYXksIGluZGV4KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgobGlzdCk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIEdlbmVyYXRvciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGZpbmRJbmRleCBhbmQgZmluZExhc3RJbmRleCBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoZGlyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgICB2YXIgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICAgIHZhciBpbmRleCA9IGRpciA+IDAgPyAwIDogbGVuZ3RoIC0gMTtcbiAgICAgIGZvciAoOyBpbmRleCA+PSAwICYmIGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSBkaXIpIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZShhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSkpIHJldHVybiBpbmRleDtcbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9O1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgaW5kZXggb24gYW4gYXJyYXktbGlrZSB0aGF0IHBhc3NlcyBhIHByZWRpY2F0ZSB0ZXN0XG4gIF8uZmluZEluZGV4ID0gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoMSk7XG4gIF8uZmluZExhc3RJbmRleCA9IGNyZWF0ZVByZWRpY2F0ZUluZGV4RmluZGVyKC0xKTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0ZWUob2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGdldExlbmd0aChhcnJheSk7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSBNYXRoLmZsb29yKChsb3cgKyBoaWdoKSAvIDIpO1xuICAgICAgaWYgKGl0ZXJhdGVlKGFycmF5W21pZF0pIDwgdmFsdWUpIGxvdyA9IG1pZCArIDE7IGVsc2UgaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBHZW5lcmF0b3IgZnVuY3Rpb24gdG8gY3JlYXRlIHRoZSBpbmRleE9mIGFuZCBsYXN0SW5kZXhPZiBmdW5jdGlvbnNcbiAgZnVuY3Rpb24gY3JlYXRlSW5kZXhGaW5kZXIoZGlyLCBwcmVkaWNhdGVGaW5kLCBzb3J0ZWRJbmRleCkge1xuICAgIHJldHVybiBmdW5jdGlvbihhcnJheSwgaXRlbSwgaWR4KSB7XG4gICAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChhcnJheSk7XG4gICAgICBpZiAodHlwZW9mIGlkeCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAoZGlyID4gMCkge1xuICAgICAgICAgICAgaSA9IGlkeCA+PSAwID8gaWR4IDogTWF0aC5tYXgoaWR4ICsgbGVuZ3RoLCBpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxlbmd0aCA9IGlkeCA+PSAwID8gTWF0aC5taW4oaWR4ICsgMSwgbGVuZ3RoKSA6IGlkeCArIGxlbmd0aCArIDE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc29ydGVkSW5kZXggJiYgaWR4ICYmIGxlbmd0aCkge1xuICAgICAgICBpZHggPSBzb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpZHhdID09PSBpdGVtID8gaWR4IDogLTE7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbSAhPT0gaXRlbSkge1xuICAgICAgICBpZHggPSBwcmVkaWNhdGVGaW5kKHNsaWNlLmNhbGwoYXJyYXksIGksIGxlbmd0aCksIF8uaXNOYU4pO1xuICAgICAgICByZXR1cm4gaWR4ID49IDAgPyBpZHggKyBpIDogLTE7XG4gICAgICB9XG4gICAgICBmb3IgKGlkeCA9IGRpciA+IDAgPyBpIDogbGVuZ3RoIC0gMTsgaWR4ID49IDAgJiYgaWR4IDwgbGVuZ3RoOyBpZHggKz0gZGlyKSB7XG4gICAgICAgIGlmIChhcnJheVtpZHhdID09PSBpdGVtKSByZXR1cm4gaWR4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuIGl0ZW0gaW4gYW4gYXJyYXksXG4gIC8vIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBjcmVhdGVJbmRleEZpbmRlcigxLCBfLmZpbmRJbmRleCwgXy5zb3J0ZWRJbmRleCk7XG4gIF8ubGFzdEluZGV4T2YgPSBjcmVhdGVJbmRleEZpbmRlcigtMSwgXy5maW5kTGFzdEluZGV4KTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChzdG9wID09IG51bGwpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gc3RlcCB8fCAxO1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgcmFuZ2UgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbGVuZ3RoOyBpZHgrKywgc3RhcnQgKz0gc3RlcCkge1xuICAgICAgcmFuZ2VbaWR4XSA9IHN0YXJ0O1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIERldGVybWluZXMgd2hldGhlciB0byBleGVjdXRlIGEgZnVuY3Rpb24gYXMgYSBjb25zdHJ1Y3RvclxuICAvLyBvciBhIG5vcm1hbCBmdW5jdGlvbiB3aXRoIHRoZSBwcm92aWRlZCBhcmd1bWVudHNcbiAgdmFyIGV4ZWN1dGVCb3VuZCA9IGZ1bmN0aW9uKHNvdXJjZUZ1bmMsIGJvdW5kRnVuYywgY29udGV4dCwgY2FsbGluZ0NvbnRleHQsIGFyZ3MpIHtcbiAgICBpZiAoIShjYWxsaW5nQ29udGV4dCBpbnN0YW5jZW9mIGJvdW5kRnVuYykpIHJldHVybiBzb3VyY2VGdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIHZhciBzZWxmID0gYmFzZUNyZWF0ZShzb3VyY2VGdW5jLnByb3RvdHlwZSk7XG4gICAgdmFyIHJlc3VsdCA9IHNvdXJjZUZ1bmMuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgaWYgKF8uaXNPYmplY3QocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcbiAgICByZXR1cm4gc2VsZjtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JpbmQgbXVzdCBiZSBjYWxsZWQgb24gYSBmdW5jdGlvbicpO1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4ZWN1dGVCb3VuZChmdW5jLCBib3VuZCwgY29udGV4dCwgdGhpcywgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgICByZXR1cm4gYm91bmQ7XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIsIGFsbG93aW5nIGFueSBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgdG8gYmUgcHJlLWZpbGxlZC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBib3VuZEFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgdmFyIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwLCBsZW5ndGggPSBib3VuZEFyZ3MubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheShsZW5ndGgpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBhcmdzW2ldID0gYm91bmRBcmdzW2ldID09PSBfID8gYXJndW1lbnRzW3Bvc2l0aW9uKytdIDogYm91bmRBcmdzW2ldO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCB0aGlzLCB0aGlzLCBhcmdzKTtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGksIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsIGtleTtcbiAgICBpZiAobGVuZ3RoIDw9IDEpIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0gYXJndW1lbnRzW2ldO1xuICAgICAgb2JqW2tleV0gPSBfLmJpbmQob2JqW2tleV0sIG9iaik7XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW9pemUgPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBjYWNoZSA9IG1lbW9pemUuY2FjaGU7XG4gICAgICB2YXIgYWRkcmVzcyA9ICcnICsgKGhhc2hlciA/IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDoga2V5KTtcbiAgICAgIGlmICghXy5oYXMoY2FjaGUsIGFkZHJlc3MpKSBjYWNoZVthZGRyZXNzXSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBjYWNoZVthZGRyZXNzXTtcbiAgICB9O1xuICAgIG1lbW9pemUuY2FjaGUgPSB7fTtcbiAgICByZXR1cm4gbWVtb2l6ZTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBfLnBhcnRpYWwoXy5kZWxheSwgXywgMSk7XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcblxuICAgICAgaWYgKGxhc3QgPCB3YWl0ICYmIGxhc3QgPj0gMCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICBpZiAoIXRpbWVvdXQpIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIGlmIChjYWxsTm93KSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gXy5wYXJ0aWFsKHdyYXBwZXIsIGZ1bmMpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBuZWdhdGVkIHZlcnNpb24gb2YgdGhlIHBhc3NlZC1pbiBwcmVkaWNhdGUuXG4gIF8ubmVnYXRlID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NpdGlvbiBvZiBhIGxpc3Qgb2YgZnVuY3Rpb25zLCBlYWNoXG4gIC8vIGNvbnN1bWluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0IGZvbGxvd3MuXG4gIF8uY29tcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciBzdGFydCA9IGFyZ3MubGVuZ3RoIC0gMTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaSA9IHN0YXJ0O1xuICAgICAgdmFyIHJlc3VsdCA9IGFyZ3Nbc3RhcnRdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB3aGlsZSAoaS0tKSByZXN1bHQgPSBhcmdzW2ldLmNhbGwodGhpcywgcmVzdWx0KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgb24gYW5kIGFmdGVyIHRoZSBOdGggY2FsbC5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgdXAgdG8gKGJ1dCBub3QgaW5jbHVkaW5nKSB0aGUgTnRoIGNhbGwuXG4gIF8uYmVmb3JlID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICB2YXIgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA+IDApIHtcbiAgICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aW1lcyA8PSAxKSBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IF8ucGFydGlhbChfLmJlZm9yZSwgMik7XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gS2V5cyBpbiBJRSA8IDkgdGhhdCB3b24ndCBiZSBpdGVyYXRlZCBieSBgZm9yIGtleSBpbiAuLi5gIGFuZCB0aHVzIG1pc3NlZC5cbiAgdmFyIGhhc0VudW1CdWcgPSAhe3RvU3RyaW5nOiBudWxsfS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKTtcbiAgdmFyIG5vbkVudW1lcmFibGVQcm9wcyA9IFsndmFsdWVPZicsICdpc1Byb3RvdHlwZU9mJywgJ3RvU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAncHJvcGVydHlJc0VudW1lcmFibGUnLCAnaGFzT3duUHJvcGVydHknLCAndG9Mb2NhbGVTdHJpbmcnXTtcblxuICBmdW5jdGlvbiBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cykge1xuICAgIHZhciBub25FbnVtSWR4ID0gbm9uRW51bWVyYWJsZVByb3BzLmxlbmd0aDtcbiAgICB2YXIgY29uc3RydWN0b3IgPSBvYmouY29uc3RydWN0b3I7XG4gICAgdmFyIHByb3RvID0gKF8uaXNGdW5jdGlvbihjb25zdHJ1Y3RvcikgJiYgY29uc3RydWN0b3IucHJvdG90eXBlKSB8fCBPYmpQcm90bztcblxuICAgIC8vIENvbnN0cnVjdG9yIGlzIGEgc3BlY2lhbCBjYXNlLlxuICAgIHZhciBwcm9wID0gJ2NvbnN0cnVjdG9yJztcbiAgICBpZiAoXy5oYXMob2JqLCBwcm9wKSAmJiAhXy5jb250YWlucyhrZXlzLCBwcm9wKSkga2V5cy5wdXNoKHByb3ApO1xuXG4gICAgd2hpbGUgKG5vbkVudW1JZHgtLSkge1xuICAgICAgcHJvcCA9IG5vbkVudW1lcmFibGVQcm9wc1tub25FbnVtSWR4XTtcbiAgICAgIGlmIChwcm9wIGluIG9iaiAmJiBvYmpbcHJvcF0gIT09IHByb3RvW3Byb3BdICYmICFfLmNvbnRhaW5zKGtleXMsIHByb3ApKSB7XG4gICAgICAgIGtleXMucHVzaChwcm9wKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3Mgb3duIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIC8vIEFoZW0sIElFIDwgOS5cbiAgICBpZiAoaGFzRW51bUJ1ZykgY29sbGVjdE5vbkVudW1Qcm9wcyhvYmosIGtleXMpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIGFsbCB0aGUgcHJvcGVydHkgbmFtZXMgb2YgYW4gb2JqZWN0LlxuICBfLmFsbEtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikga2V5cy5wdXNoKGtleSk7XG4gICAgLy8gQWhlbSwgSUUgPCA5LlxuICAgIGlmIChoYXNFbnVtQnVnKSBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRlZSB0byBlYWNoIGVsZW1lbnQgb2YgdGhlIG9iamVjdFxuICAvLyBJbiBjb250cmFzdCB0byBfLm1hcCBpdCByZXR1cm5zIGFuIG9iamVjdFxuICBfLm1hcE9iamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB2YXIga2V5cyA9ICBfLmtleXMob2JqKSxcbiAgICAgICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aCxcbiAgICAgICAgICByZXN1bHRzID0ge30sXG4gICAgICAgICAgY3VycmVudEtleTtcbiAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgY3VycmVudEtleSA9IGtleXNbaW5kZXhdO1xuICAgICAgICByZXN1bHRzW2N1cnJlbnRLZXldID0gaXRlcmF0ZWUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhaXJzW2ldID0gW2tleXNbaV0sIG9ialtrZXlzW2ldXV07XG4gICAgfVxuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFtvYmpba2V5c1tpXV1dID0ga2V5c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBjcmVhdGVBc3NpZ25lcihfLmFsbEtleXMpO1xuXG4gIC8vIEFzc2lnbnMgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIG93biBwcm9wZXJ0aWVzIGluIHRoZSBwYXNzZWQtaW4gb2JqZWN0KHMpXG4gIC8vIChodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3QvYXNzaWduKVxuICBfLmV4dGVuZE93biA9IF8uYXNzaWduID0gY3JlYXRlQXNzaWduZXIoXy5rZXlzKTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBrZXkgb24gYW4gb2JqZWN0IHRoYXQgcGFzc2VzIGEgcHJlZGljYXRlIHRlc3RcbiAgXy5maW5kS2V5ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgPSBjYihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaiksIGtleTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2tleV0sIGtleSwgb2JqKSkgcmV0dXJuIGtleTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqZWN0LCBvaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0ge30sIG9iaiA9IG9iamVjdCwgaXRlcmF0ZWUsIGtleXM7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChfLmlzRnVuY3Rpb24ob2l0ZXJhdGVlKSkge1xuICAgICAga2V5cyA9IF8uYWxsS2V5cyhvYmopO1xuICAgICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKG9pdGVyYXRlZSwgY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtleXMgPSBmbGF0dGVuKGFyZ3VtZW50cywgZmFsc2UsIGZhbHNlLCAxKTtcbiAgICAgIGl0ZXJhdGVlID0gZnVuY3Rpb24odmFsdWUsIGtleSwgb2JqKSB7IHJldHVybiBrZXkgaW4gb2JqOyB9O1xuICAgICAgb2JqID0gT2JqZWN0KG9iaik7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IG9ialtrZXldO1xuICAgICAgaWYgKGl0ZXJhdGVlKHZhbHVlLCBrZXksIG9iaikpIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpdGVyYXRlZSkpIHtcbiAgICAgIGl0ZXJhdGVlID0gXy5uZWdhdGUoaXRlcmF0ZWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ubWFwKGZsYXR0ZW4oYXJndW1lbnRzLCBmYWxzZSwgZmFsc2UsIDEpLCBTdHJpbmcpO1xuICAgICAgaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHJldHVybiAhXy5jb250YWlucyhrZXlzLCBrZXkpO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIF8ucGljayhvYmosIGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gY3JlYXRlQXNzaWduZXIoXy5hbGxLZXlzLCB0cnVlKTtcblxuICAvLyBDcmVhdGVzIGFuIG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gdGhlIGdpdmVuIHByb3RvdHlwZSBvYmplY3QuXG4gIC8vIElmIGFkZGl0aW9uYWwgcHJvcGVydGllcyBhcmUgcHJvdmlkZWQgdGhlbiB0aGV5IHdpbGwgYmUgYWRkZWQgdG8gdGhlXG4gIC8vIGNyZWF0ZWQgb2JqZWN0LlxuICBfLmNyZWF0ZSA9IGZ1bmN0aW9uKHByb3RvdHlwZSwgcHJvcHMpIHtcbiAgICB2YXIgcmVzdWx0ID0gYmFzZUNyZWF0ZShwcm90b3R5cGUpO1xuICAgIGlmIChwcm9wcykgXy5leHRlbmRPd24ocmVzdWx0LCBwcm9wcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJucyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uaXNNYXRjaCA9IGZ1bmN0aW9uKG9iamVjdCwgYXR0cnMpIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhhdHRycyksIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuICFsZW5ndGg7XG4gICAgdmFyIG9iaiA9IE9iamVjdChvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKGF0dHJzW2tleV0gIT09IG9ialtrZXldIHx8ICEoa2V5IGluIG9iaikpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIFtIYXJtb255IGBlZ2FsYCBwcm9wb3NhbF0oaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsKS5cbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCByZWd1bGFyIGV4cHJlc3Npb25zLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb2VyY2VkIHRvIHN0cmluZ3MgZm9yIGNvbXBhcmlzb24gKE5vdGU6ICcnICsgL2EvaSA9PT0gJy9hL2knKVxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gJycgKyBhID09PSAnJyArIGI7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLlxuICAgICAgICAvLyBPYmplY3QoTmFOKSBpcyBlcXVpdmFsZW50IHRvIE5hTlxuICAgICAgICBpZiAoK2EgIT09ICthKSByZXR1cm4gK2IgIT09ICtiO1xuICAgICAgICAvLyBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gK2EgPT09IDAgPyAxIC8gK2EgPT09IDEgLyBiIDogK2EgPT09ICtiO1xuICAgICAgY2FzZSAnW29iamVjdCBEYXRlXSc6XG4gICAgICBjYXNlICdbb2JqZWN0IEJvb2xlYW5dJzpcbiAgICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1lcmljIHByaW1pdGl2ZSB2YWx1ZXMuIERhdGVzIGFyZSBjb21wYXJlZCBieSB0aGVpclxuICAgICAgICAvLyBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnMuIE5vdGUgdGhhdCBpbnZhbGlkIGRhdGVzIHdpdGggbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIC8vIG9mIGBOYU5gIGFyZSBub3QgZXF1aXZhbGVudC5cbiAgICAgICAgcmV0dXJuICthID09PSArYjtcbiAgICB9XG5cbiAgICB2YXIgYXJlQXJyYXlzID0gY2xhc3NOYW1lID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIGlmICghYXJlQXJyYXlzKSB7XG4gICAgICBpZiAodHlwZW9mIGEgIT0gJ29iamVjdCcgfHwgdHlwZW9mIGIgIT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcblxuICAgICAgLy8gT2JqZWN0cyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVpdmFsZW50LCBidXQgYE9iamVjdGBzIG9yIGBBcnJheWBzXG4gICAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGFDdG9yICE9PSBiQ3RvciAmJiAhKF8uaXNGdW5jdGlvbihhQ3RvcikgJiYgYUN0b3IgaW5zdGFuY2VvZiBhQ3RvciAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbihiQ3RvcikgJiYgYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgKCdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuXG4gICAgLy8gSW5pdGlhbGl6aW5nIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIC8vIEl0J3MgZG9uZSBoZXJlIHNpbmNlIHdlIG9ubHkgbmVlZCB0aGVtIGZvciBvYmplY3RzIGFuZCBhcnJheXMgY29tcGFyaXNvbi5cbiAgICBhU3RhY2sgPSBhU3RhY2sgfHwgW107XG4gICAgYlN0YWNrID0gYlN0YWNrIHx8IFtdO1xuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PT0gYjtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG5cbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoYXJlQXJyYXlzKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIGxlbmd0aCA9IGEubGVuZ3RoO1xuICAgICAgaWYgKGxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgaWYgKCFlcShhW2xlbmd0aF0sIGJbbGVuZ3RoXSwgYVN0YWNrLCBiU3RhY2spKSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgdmFyIGtleXMgPSBfLmtleXMoYSksIGtleTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMgYmVmb3JlIGNvbXBhcmluZyBkZWVwIGVxdWFsaXR5LlxuICAgICAgaWYgKF8ua2V5cyhiKS5sZW5ndGggIT09IGxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlclxuICAgICAgICBrZXkgPSBrZXlzW2xlbmd0aF07XG4gICAgICAgIGlmICghKF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSAmJiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopIHx8IF8uaXNBcmd1bWVudHMob2JqKSkpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIHJldHVybiBfLmtleXMob2JqKS5sZW5ndGggPT09IDA7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAsIGlzRXJyb3IuXG4gIF8uZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJywgJ0Vycm9yJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSA8IDkpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmhhcyhvYmosICdjYWxsZWUnKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLiBXb3JrIGFyb3VuZCBzb21lIHR5cGVvZiBidWdzIGluIG9sZCB2OCxcbiAgLy8gSUUgMTEgKCMxNjIxKSwgYW5kIGluIFNhZmFyaSA4ICgjMTkyOSkuXG4gIGlmICh0eXBlb2YgLy4vICE9ICdmdW5jdGlvbicgJiYgdHlwZW9mIEludDhBcnJheSAhPSAnb2JqZWN0Jykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT09ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBvYmogIT0gbnVsbCAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdGVlcy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIC8vIFByZWRpY2F0ZS1nZW5lcmF0aW5nIGZ1bmN0aW9ucy4gT2Z0ZW4gdXNlZnVsIG91dHNpZGUgb2YgVW5kZXJzY29yZS5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgXy5ub29wID0gZnVuY3Rpb24oKXt9O1xuXG4gIF8ucHJvcGVydHkgPSBwcm9wZXJ0eTtcblxuICAvLyBHZW5lcmF0ZXMgYSBmdW5jdGlvbiBmb3IgYSBnaXZlbiBvYmplY3QgdGhhdCByZXR1cm5zIGEgZ2l2ZW4gcHJvcGVydHkuXG4gIF8ucHJvcGVydHlPZiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT0gbnVsbCA/IGZ1bmN0aW9uKCl7fSA6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIHByZWRpY2F0ZSBmb3IgY2hlY2tpbmcgd2hldGhlciBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gc2V0IG9mXG4gIC8vIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLm1hdGNoZXIgPSBfLm1hdGNoZXMgPSBmdW5jdGlvbihhdHRycykge1xuICAgIGF0dHJzID0gXy5leHRlbmRPd24oe30sIGF0dHJzKTtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gXy5pc01hdGNoKG9iaiwgYXR0cnMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2IoaXRlcmF0ZWUsIGNvbnRleHQsIDEpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdGVlKGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9O1xuXG4gICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZXNjYXBlTWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjeDI3OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xuICB9O1xuICB2YXIgdW5lc2NhcGVNYXAgPSBfLmludmVydChlc2NhcGVNYXApO1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgdmFyIGNyZWF0ZUVzY2FwZXIgPSBmdW5jdGlvbihtYXApIHtcbiAgICB2YXIgZXNjYXBlciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICByZXR1cm4gbWFwW21hdGNoXTtcbiAgICB9O1xuICAgIC8vIFJlZ2V4ZXMgZm9yIGlkZW50aWZ5aW5nIGEga2V5IHRoYXQgbmVlZHMgdG8gYmUgZXNjYXBlZFxuICAgIHZhciBzb3VyY2UgPSAnKD86JyArIF8ua2V5cyhtYXApLmpvaW4oJ3wnKSArICcpJztcbiAgICB2YXIgdGVzdFJlZ2V4cCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIHZhciByZXBsYWNlUmVnZXhwID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBzdHJpbmcgPSBzdHJpbmcgPT0gbnVsbCA/ICcnIDogJycgKyBzdHJpbmc7XG4gICAgICByZXR1cm4gdGVzdFJlZ2V4cC50ZXN0KHN0cmluZykgPyBzdHJpbmcucmVwbGFjZShyZXBsYWNlUmVnZXhwLCBlc2NhcGVyKSA6IHN0cmluZztcbiAgICB9O1xuICB9O1xuICBfLmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIoZXNjYXBlTWFwKTtcbiAgXy51bmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIodW5lc2NhcGVNYXApO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHksIGZhbGxiYWNrKSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0ID09IG51bGwgPyB2b2lkIDAgOiBvYmplY3RbcHJvcGVydHldO1xuICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICB2YWx1ZSA9IGZhbGxiYWNrO1xuICAgIH1cbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgdmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihtYXRjaCkge1xuICAgIHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTtcbiAgfTtcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICAvLyBOQjogYG9sZFNldHRpbmdzYCBvbmx5IGV4aXN0cyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBzZXR0aW5ncywgb2xkU2V0dGluZ3MpIHtcbiAgICBpZiAoIXNldHRpbmdzICYmIG9sZFNldHRpbmdzKSBzZXR0aW5ncyA9IG9sZFNldHRpbmdzO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldCkucmVwbGFjZShlc2NhcGVyLCBlc2NhcGVDaGFyKTtcbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfSBlbHNlIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuXG4gICAgICAvLyBBZG9iZSBWTXMgbmVlZCB0aGUgbWF0Y2ggcmV0dXJuZWQgdG8gcHJvZHVjZSB0aGUgY29ycmVjdCBvZmZlc3QuXG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyAncmV0dXJuIF9fcDtcXG4nO1xuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdmFyIGFyZ3VtZW50ID0gc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaic7XG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyBhcmd1bWVudCArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLiBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaW5zdGFuY2UgPSBfKG9iaik7XG4gICAgaW5zdGFuY2UuX2NoYWluID0gdHJ1ZTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKGluc3RhbmNlLCBvYmopIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgXy5lYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBfLmVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT09ICdzaGlmdCcgfHwgbmFtZSA9PT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0KHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gIF8ucHJvdG90eXBlLnZhbHVlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gUHJvdmlkZSB1bndyYXBwaW5nIHByb3h5IGZvciBzb21lIG1ldGhvZHMgdXNlZCBpbiBlbmdpbmUgb3BlcmF0aW9uc1xuICAvLyBzdWNoIGFzIGFyaXRobWV0aWMgYW5kIEpTT04gc3RyaW5naWZpY2F0aW9uLlxuICBfLnByb3RvdHlwZS52YWx1ZU9mID0gXy5wcm90b3R5cGUudG9KU09OID0gXy5wcm90b3R5cGUudmFsdWU7XG5cbiAgXy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gJycgKyB0aGlzLl93cmFwcGVkO1xuICB9O1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufS5jYWxsKHRoaXMpKTtcbiIsIi8qKlxuICogZ2l2ZW4gYW4gYXJyYXkgb2YgbnVtYmVycywgcmV0dXJuIHRoZSBpbmRleCBhdCB3aGljaCB0aGUgdmFsdWUgd291bGQgZmFsbFxuICogc3VtbWluZyB0aGUgYXJyYXkgYXMgeW91IGdvXG4gKiBAcGFyYW0gIHthcnJheX0gYXJyIGFycmF5IG9mIG51bWJlcnNcbiAqIEBwYXJhbSAge251bWJlcn0gdmFsIGdldCB0aGUgaW5kZXggd2hlcmUgdGhpcyB3b3VsZCBmYWxsXG4gKiBAcmV0dXJuIHtudW1iZXJ9ICAgICBpbmRleCBvciAtMSBpZiBub3QgZm91bmRcbiAqL1xuZnVuY3Rpb24gY29udGFpbnMoYXJyLCB2YWwpIHtcbiAgICB2YXIgdG90YWwgPSAwLFxuICAgICAgICBsZW4gPSBhcnIubGVuZ3RoLFxuICAgICAgICBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHRvdGFsICs9IGFycltpXTtcblxuICAgICAgICBpZiAodmFsIDwgdG90YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIC0xO1xufVxuXG5cbi8qKlxuICogY29uc3VsdCB0aGUgbmVhcmVzdCBraW5kZXJnYXJ0ZW4gdGVhY2hlci4uLlxuICovXG5mdW5jdGlvbiBhZGQoYSwgYikge1xuICAgIHJldHVybiBhICsgYjtcbn1cblxuLyoqXG4gKiBzdW0gdW50aWwgdGhlIGdpdmVuIGluZGV4XG4gKiBAcGFyYW0gIHthcnJheX0gYXJyIGFycmF5IHRvIHBhcnRpYWwgc3VtXG4gKiBAcGFyYW0gIHtudW1iZXJ9IGlkeCBpbmRleFxuICogQHJldHVybiB7bnVtYmVyfSAgICAgcGFydGlhbCBzdW1cbiAqL1xuZnVuY3Rpb24gcGFydGlhbFN1bShhcnIsIGlkeCkge1xuICAgIHZhciBzdWJzZXQgPSBhcnIuc2xpY2UoMCwgaWR4KTtcblxuICAgIHJldHVybiBzdWJzZXQucmVkdWNlKGFkZCwgMCk7XG59XG5cblxuLyoqXG4gKiBtYXAgb3ZlciBhbiBhcnJheSByZXR1cm5pbmcgYW4gYXJyYXkgb2YgdGhlIHNhbWUgbGVuZ3RoIGNvbnRhaW5pbmcgdGhlXG4gKiBzdW0gYXQgZWFjaCBwbGFjZVxuICogQHBhcmFtICB7YXJyYXl9IGFyciBhbiBhcnJheSBvZiBudW1iZXJzXG4gKiBAcmV0dXJuIHthcnJheX0gICAgIHRoZSBhcnJheSBvZiBzdW1zXG4gKi9cbmZ1bmN0aW9uIHJ1bm5pbmdTdW1zKGFycikge1xuICAgIHZhciBzdW0gPSAwO1xuXG4gICAgcmV0dXJuIGFyci5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gc3VtICs9IGl0ZW07XG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBnaXZlbiBhbiBhcnJheSBvZiBib2FyZGVycywgZ2VuZXJhdGUgYSBzZXQgb2YgeC1jb29yZHMgdGhhdCByZXByZXNlbnRzIHRoZVxuICogdGhlIGFyZWEgYXJvdW5kIHRoZSBib2FyZGVycyArLy0gdGhlIHRocmVzaG9sZCBnaXZlblxuICogQHBhcmFtICB7YXJyYXl9IGFyciAgICBhcnJheSBvZiBib3JkZXJzXG4gKiBAcGFyYW0gIHtudW1iZXJ9IHRocmVzaCB0aGUgdGhyZXNob2xkIGFyb3VuZCBlYWNoXG4gKiBAcmV0dXJuIHthcnJheX0gICAgICAgIGFuIGFycmF5IG9mIGFycmF5c1xuICovXG5mdW5jdGlvbiBnZW5GdXp6eUJvcmRlcnMoYXJyLCB0aHJlc2gpIHtcbiAgICB2YXIgbGVuID0gYXJyLmxlbmd0aCxcbiAgICAgICAgYm9yZGVycyA9IFtcbiAgICAgICAgICAgIFswLCB0aHJlc2hdXG4gICAgICAgIF0sXG4gICAgICAgIG1heFJpZ2h0ID0gYXJyLnJlZHVjZShhZGQsIDApLFxuICAgICAgICBzdW1zID0gcnVubmluZ1N1bXMoYXJyKSxcbiAgICAgICAgaSwgY3VycjtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjdXJyID0gc3Vtc1tpXTtcblxuICAgICAgICBib3JkZXJzLnB1c2goW1xuICAgICAgICAgICAgTWF0aC5tYXgoMCwgY3VyciAtIHRocmVzaCksXG4gICAgICAgICAgICBNYXRoLm1pbihjdXJyICsgdGhyZXNoLCBtYXhSaWdodClcbiAgICAgICAgXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJvcmRlcnNcbn1cblxuXG4vKipcbiAqIEEgdmVyc2lvbiBvZiB0aGUgZmluZEluZGV4IHBvbHlmaWxsIGZvdW5kIGhlcmU6XG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9maW5kSW5kZXhcbiAqXG4gKiBhZGFwdGVkIHRvIHJ1biBhcyBzdGFuZCBhbG9uZSBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBmaW5kSW5kZXgobHN0LCBwcmVkaWNhdGUpIHtcblxuICAgIHZhciBsaXN0ID0gT2JqZWN0KGxzdCk7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwobnVsbCwgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59O1xuXG5cbmZ1bmN0aW9uIGluUmFuZ2UocmFuZ2UsIHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID49IHJhbmdlWzBdICYmIHZhbHVlIDw9IHJhbmdlWzFdO1xufVxuXG4vKipcbiAqIHJldHVybiB3aGF0ZXZlciBnZXRzIHBhc3NlZCBpbi4gY2FuIGJlIHVzZWZ1bCBpbiBhIGZpbHRlciBmdW5jdGlvbiB3aGVyZVxuICogdHJ1dGh5IHZhbHVlcyBhcmUgdGhlIG9ubHkgdmFsaWQgb25lc1xuICogQHBhcmFtICB7YW55fSBhcmcgYW55IHZhbHVlXG4gKiBAcmV0dXJuIHthbnl9ICAgICB3aGF0ZXZlciB3YXMgcGFzc2VkIGluXG4gKi9cbmZ1bmN0aW9uIGlkZW50aXR5KGFyZykge1xuICAgIHJldHVybiBhcmc7XG59XG5cbi8qKlxuICogbW92ZSBhbiBhcnJheSBpbmRleCB0byB0aGUgJ2JvcmRlcicgcGFzc2VkIGluLiB0aGUgYm9yZGVycyBhcmUgbm90IGFycmF5XG4gKiBpbmRleGVzLCB0aGV5IGFyZSB0aGUgbnVtYmVycyBpbiB0aGUgZm9sbG93aW5nIGRpYWdyYW06XG4gKlxuICogfDB8X19fX3ZhbF9fX198MXxfX19fX3ZhbF9fX19ffDJ8X19fX192YWxfX19ffDN8IGV0Y1xuICpcbiAqICoqIEFsbCBjb2x1bW4gdmFsdWVzIGFyZSBhc3N1bWVkIHRvIGJlIHRydXRoeSAob2JqZWN0cyBpbiBtaW5kLi4uKSAqKlxuICpcbiAqIEBwYXJhbSAge2FycmF5fSBhcnIgICAgICBhcnJheSB0byByZW9yZGVyLCBub3QgbXV0YXRlZFxuICogQHBhcmFtICB7bnVtYmVyfSBmcm9tICAgICBub3JtYWwgaW5kZXggb2YgY29sdW1uIHRvIG1vdmVcbiAqIEBwYXJhbSAge251bWJlcn0gdG9Cb3JkZXIgYm9yZGVyIGluZGV4XG4gKiBAcmV0dXJuIHthcnJheX0gICAgICAgICAgbmV3IGFycmF5IGluIG5ldyBvcmRlclxuICovXG5mdW5jdGlvbiBtb3ZlSWR4KGFyciwgZnJvbSwgdG9Cb3JkZXIpIHtcbiAgICB2YXIgcmVvcmRlcmQgPSBhcnIuc2xpY2UoKSxcbiAgICAgICAgbW92ZXIgPSByZW9yZGVyZC5zcGxpY2UoZnJvbSwgMSwgdW5kZWZpbmVkKVswXTtcblxuICAgIHJlb3JkZXJkLnNwbGljZSh0b0JvcmRlciwgMSwgbW92ZXIsIHJlb3JkZXJkW3RvQm9yZGVyXSk7XG5cbiAgICByZXR1cm4gcmVvcmRlcmQuZmlsdGVyKGlkZW50aXR5KTtcbn1cblxuXG5cbmZ1bmN0aW9uIGluaXQoc2VsZiwgZGl2SGVhZGVyKSB7XG5cblxuICAgIHZhciB3aWR0aHMgPSBzZWxmLmdldENvbHVtbnMoKS5tYXAoZnVuY3Rpb24oY29sKSB7XG4gICAgICAgIHJldHVybiBjb2wuZ2V0V2lkdGgoKTtcbiAgICB9KSxcbiAgICAgICAgcmVzaXplVGhyZXNoID0gNSxcbiAgICAgICAgZnV6enlCb3JkZXJzID0gZ2VuRnV6enlCb3JkZXJzKHdpZHRocywgcmVzaXplVGhyZXNoKSxcbiAgICAgICAgaW5zZXJ0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcbiAgICAgICAgaGVhZGVyQ2FudmFzID0gc2VsZi5nZXRIZWFkZXJDYW52YXMoKSxcbiAgICAgICAgaGVhZGVyUmVjdCA9IGhlYWRlckNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgZHJhZ0hlYWRlciwgbW91c2VEb3duLCB4LCB5LCBzdGFydGluZ1RyYW5zLCByZXNpemluZyxcbiAgICAgICAgcmVzaXppbmdDb2xzLCBjbGlja2VkQ29sLCBib3JkZXJIaXQsIHJlb3JkZXJpbmc7XG5cblxuXG4gICAgaW5zZXJ0ZXIuc3R5bGUuaGVpZ2h0ID0gJzIwcHgnO1xuICAgIGluc2VydGVyLnN0eWxlLndpZHRoID0gJzVweCc7XG4gICAgaW5zZXJ0ZXIuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ2dvbGRlbnJvZCc7XG4gICAgaW5zZXJ0ZXIuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIGluc2VydGVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgaW5zZXJ0ZXIudG9wID0gMDtcbiAgICBpbnNlcnRlci5sZWZ0ID0gMDtcblxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaW5zZXJ0ZXIpO1xuXG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbihlKSB7XG5cbiAgICAgICAgdmFyIHhNb3ZlbWVudCwgeU1vdmVtZW50LCBtb3ZlbWVudFN0cmluZyxcbiAgICAgICAgICAgIGxlZnQgPSBoZWFkZXJSZWN0LmxlZnQsXG4gICAgICAgICAgICByYW5nZUZ1bmMsIG5vcm1hbGl6ZWRCb3JkZXJzLFxuICAgICAgICAgICAgaW5zZXJ0ZXJMZWZ0LCBhY3RpdmVDb2wsIGFjdGl2ZUNvbFdpZHRoLFxuICAgICAgICAgICAgY29sUmVzaXplSW5kZXg7XG5cbiAgICAgICAgd2lkdGhzID0gc2VsZi5nZXRDb2x1bW5zKCkubWFwKGZ1bmN0aW9uKGNvbCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbC5nZXRXaWR0aCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdXp6eUJvcmRlcnMgPSBnZW5GdXp6eUJvcmRlcnMod2lkdGhzLCByZXNpemVUaHJlc2gpLFxuXG4gICAgICAgIHJhbmdlRnVuYyA9IGZ1bmN0aW9uKHJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5SYW5nZShyYW5nZSwgZS54KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vcm1hbGl6ZWRCb3JkZXJzID0gZnV6enlCb3JkZXJzLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS5tYXAoYWRkLmJpbmQobnVsbCwgbGVmdCkpO1xuICAgICAgICB9KVxuXG4gICAgICAgIGlmICghcmVzaXppbmcpIHtcbiAgICAgICAgICAgIGJvcmRlckhpdCA9IGZpbmRJbmRleChub3JtYWxpemVkQm9yZGVycywgcmFuZ2VGdW5jKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggKCByZXNpemluZyB8fCAoYm9yZGVySGl0ICE9PSAtMSkpICYmICFyZW9yZGVyaW5nICkge1xuICAgICAgICAgICAgZGl2SGVhZGVyLnN0eWxlLmN1cnNvciA9ICdjb2wtcmVzaXplJztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb2wtcmVzaXplJyk7XG4gICAgICAgICAgICByZXNpemluZ0NvbHMgPSB0cnVlO1xuXG4gICAgICAgICAgICBpZiAobW91c2VEb3duKSB7XG4gICAgICAgICAgICAgICAgaWYgKGJvcmRlckhpdCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlZScpXG4gICAgICAgICAgICAgICAgICAgIGNvbFJlc2l6ZUluZGV4ID0gY2xpY2tlZENvbDtcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlQ29sID0gc2VsZi5nZXRDb2x1bW5zKClbY29sUmVzaXplSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb2xXaWR0aCA9IGFjdGl2ZUNvbC5nZXRXaWR0aCgpO1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb2wuc2V0V2lkdGgoTWF0aC5tYXgoMCwgYWN0aXZlQ29sV2lkdGggKyAoZS54IC0geCkpKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wYWludEFsbCgpO1xuICAgICAgICAgICAgICAgICAgICByZXNpemluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHggPSBlLng7XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChtb3VzZURvd24gJiYgZHJhZ0hlYWRlciAmJiAoZS54ID49IGhlYWRlclJlY3QubGVmdCkgJiYgKGUueCA8PSAoaGVhZGVyUmVjdC5sZWZ0ICsgaGVhZGVyUmVjdC53aWR0aCkpICYmICFyZXNpemluZ0NvbHMpIHtcblxuICAgICAgICAgICAgcmVvcmRlcmluZyA9IHRydWU7XG5cbiAgICAgICAgICAgIHhNb3ZlbWVudCA9IHN0YXJ0aW5nVHJhbnNbMF0gLSAoeCAtIGUueCk7XG4gICAgICAgICAgICB5TW92ZW1lbnQgPSAwO1xuXG4gICAgICAgICAgICBtb3ZlbWVudFN0cmluZyA9IFsndHJhbnNsYXRlWCgnLFxuICAgICAgICAgICAgICAgIHhNb3ZlbWVudCxcbiAgICAgICAgICAgICAgICAncHgpIHRyYW5zbGF0ZVkoJyxcbiAgICAgICAgICAgICAgICB5TW92ZW1lbnQsXG4gICAgICAgICAgICAgICAgJ3B4KSdcbiAgICAgICAgICAgIF0uam9pbignJyk7XG5cbiAgICAgICAgICAgIGRyYWdIZWFkZXIuc3R5bGUudHJhbnNmb3JtID0gbW92ZW1lbnRTdHJpbmc7XG4gICAgICAgICAgICBkcmFnSGVhZGVyLnN0eWxlLnpJbmRleCA9IDEwO1xuXG4gICAgICAgICAgICBpZiAoYm9yZGVySGl0ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGluc2VydGVyTGVmdCA9IG5vcm1hbGl6ZWRCb3JkZXJzW2JvcmRlckhpdF1bMF07XG4gICAgICAgICAgICAgICAgaW5zZXJ0ZXIuc3R5bGUubGVmdCA9IGluc2VydGVyTGVmdDtcbiAgICAgICAgICAgICAgICBpbnNlcnRlci5zdHlsZS50b3AgPSBoZWFkZXJSZWN0LnRvcDtcbiAgICAgICAgICAgICAgICBpbnNlcnRlci5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRpdkhlYWRlci5zdHlsZS5jdXJzb3IgPSAnYXV0byc7XG4gICAgICAgICAgICByZXNpemluZ0NvbHMgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oZXZudCkge1xuICAgICAgICB2YXIgcmVvcmRlcmVkO1xuXG4gICAgICAgIHggPSB5ID0gMDtcblxuICAgICAgICBpZiAoZHJhZ0hlYWRlcikge1xuICAgICAgICAgICAgZHJhZ0hlYWRlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRyYWdIZWFkZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJhZ0hlYWRlciA9IG51bGw7XG4gICAgICAgIHN0YXJ0aW5nVHJhbnMgPSBbMCwgMF07XG4gICAgICAgIG1vdXNlRG93biA9IGZhbHNlO1xuICAgICAgICByZXNpemluZyA9IGZhbHNlO1xuICAgICAgICByZW9yZGVyaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKGJvcmRlckhpdCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJlb3JkZXJlZCA9IG1vdmVJZHgoc2VsZi5nZXRDb2x1bW5zKCksIGNsaWNrZWRDb2wsIGJvcmRlckhpdCk7XG4gICAgICAgICAgICBzZWxmLnNldENvbHVtbnMocmVvcmRlcmVkKTtcbiAgICAgICAgICAgIHNlbGYucGFpbnRBbGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydGVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIGhlYWRlclJlY3QgPSBoZWFkZXJDYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGZ1enp5Qm9yZGVycyA9IGdlbkZ1enp5Qm9yZGVycyh3aWR0aHMsIHJlc2l6ZVRocmVzaCk7XG4gICAgICAgIHdpZHRocyA9IHNlbGYuZ2V0Q29sdW1ucygpLm1hcChmdW5jdGlvbihjb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBjb2wuZ2V0V2lkdGgoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9KVxuXG5cbiAgICBkaXZIZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24oZXZudCkge1xuICAgICAgICBtb3VzZURvd24gPSB0cnVlO1xuXG4gICAgICAgIHdpZHRocyA9IHNlbGYuZ2V0Q29sdW1ucygpLm1hcChmdW5jdGlvbihjb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBjb2wuZ2V0V2lkdGgoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpY2tlZENvbCA9IGNvbnRhaW5zKHdpZHRocywgZXZudC5vZmZzZXRYKTtcblxuICAgICAgICB4ID0gZXZudC54O1xuICAgICAgICB5ID0gZXZudC55O1xuXG5cbiAgICAgICAgaWYgKHJlc2l6aW5nQ29scykge1xuICAgICAgICAgICAgLy8gYWx3YXlzIHJlc2l6ZSBsIHRvIHIgXG4gICAgICAgICAgICBjbGlja2VkQ29sID0gY29udGFpbnMod2lkdGhzLCBldm50Lm9mZnNldFggLSByZXNpemVUaHJlc2gpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBncm9zcy4uLi5cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb2xPZmZzZXQgPSBwYXJ0aWFsU3VtKHdpZHRocywgY2xpY2tlZENvbCksXG4gICAgICAgICAgICBpbWFnZSA9IG5ldyBJbWFnZSgpLFxuICAgICAgICAgICAgc3ViQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyksXG4gICAgICAgICAgICBzdWJDdHggPSBzdWJDYW52YXMuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIGNsaWNrZWRDb2xXaWR0aCA9IHdpZHRoc1tjbGlja2VkQ29sXSxcbiAgICAgICAgICAgIHRyYW5zZm9ybSwgY3R4O1xuXG4gICAgICAgIC8vIGJvZHkgaXMgcHJvYiBub3QgdGhlIGJlc3Qgc3BvdCBmb3IgdGhpcy4uLiBcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzdWJDYW52YXMpO1xuXG4gICAgICAgIGhlYWRlclJlY3QgPSBoZWFkZXJDYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGZ1enp5Qm9yZGVycyA9IGdlbkZ1enp5Qm9yZGVycyh3aWR0aHMsIHJlc2l6ZVRocmVzaCk7XG5cbiAgICAgICAgY3R4ID0gaGVhZGVyQ2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgc3ViQ2FudmFzLndpZHRoID0gY2xpY2tlZENvbFdpZHRoO1xuICAgICAgICBzdWJDYW52YXMuaGVpZ2h0ID0gMjA7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS5vcGFjaXR5ID0gJy40NSc7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS5sZWZ0ID0gZXZudC54IC0gKGV2bnQub2Zmc2V0WCAtIGNvbE9mZnNldCk7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS50b3AgPSBoZWFkZXJSZWN0LnRvcDtcbiAgICAgICAgc3ViQ2FudmFzLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcblxuICAgICAgICBzdWJDdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgaGVhZGVyQ2FudmFzLFxuICAgICAgICAgICAgY29sT2Zmc2V0LCAvLyBzeCwgXG4gICAgICAgICAgICAwLCAvLyBzeSwgXG4gICAgICAgICAgICBjbGlja2VkQ29sV2lkdGgsIC8vIHNXaWR0aCwgXG4gICAgICAgICAgICAyMCwgLy8gc0hlaWdodCwgXG4gICAgICAgICAgICAwLCAvLyBkeCwgXG4gICAgICAgICAgICAwLCAvLyBkeSwgXG4gICAgICAgICAgICBjbGlja2VkQ29sV2lkdGgsXG4gICAgICAgICAgICAyMCk7XG5cblxuICAgICAgICBkcmFnSGVhZGVyID0gc3ViQ2FudmFzO1xuXG4gICAgICAgIHRyYW5zZm9ybSA9IGRyYWdIZWFkZXIuc3R5bGUudHJhbnNmb3JtO1xuXG4gICAgICAgIHN0YXJ0aW5nVHJhbnMgPSB0cmFuc2Zvcm0ubWF0Y2goLyhbXihdP1xcZCspL2cpIHx8IFswLCAwXTtcbiAgICB9KTtcblxufVxuXG5leHBvcnRzLmluaXQgPSBpbml0OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRSZW5kZXJlciA9IHJlcXVpcmUoJy4vZGVmYXVsdGNlbGxyZW5kZXJlci5qcycpO1xuXG52YXIgQ29sdW1uID0gZnVuY3Rpb24oZ3JpZCwgZmllbGQsIGxhYmVsLCB0eXBlLCB3aWR0aCwgcmVuZGVyZXIpIHtcblxuICAgIHJlbmRlcmVyID0gcmVuZGVyZXIgfHwgZGVmYXVsdFJlbmRlcmVyO1xuXG4gICAgdGhpcy5nZXRHcmlkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBncmlkO1xuICAgIH07XG5cbiAgICB0aGlzLnNldEdyaWQgPSBmdW5jdGlvbihuZXdHcmlkKSB7XG4gICAgICAgIGdyaWQgPSBuZXdHcmlkO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmaWVsZDtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRGaWVsZCA9IGZ1bmN0aW9uKG5ld0ZpZWxkKSB7XG4gICAgICAgIGZpZWxkID0gbmV3RmllbGQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0TGFiZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGxhYmVsO1xuICAgIH07XG5cbiAgICB0aGlzLnNldExhYmVsID0gZnVuY3Rpb24obmV3TGFiZWwpIHtcbiAgICAgICAgbGFiZWwgPSBuZXdMYWJlbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRUeXBlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0eXBlO1xuICAgIH07XG5cbiAgICB0aGlzLnNldFR5cGUgPSBmdW5jdGlvbihuZXdUeXBlKSB7XG4gICAgICAgIHR5cGUgPSBuZXdUeXBlO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFJlbmRlcmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiByZW5kZXJlcjtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRSZW5kZXJlciA9IGZ1bmN0aW9uKG5ld1JlbmRlcmVyKSB7XG4gICAgICAgIHJlbmRlcmVyID0gbmV3UmVuZGVyZXI7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0V2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHdpZHRoO1xuICAgIH07XG5cbiAgICB0aGlzLnNldFdpZHRoID0gZnVuY3Rpb24obmV3V2lkdGgpIHtcbiAgICAgICAgd2lkdGggPSBuZXdXaWR0aDtcbiAgICB9O1xufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ29sdW1uOyIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgcGFpbnQgPSBmdW5jdGlvbihnYywgY29uZmlnKSB7XG5cbiAgICB2YXIgdmFsdWUgPSBjb25maWcudmFsdWU7XG4gICAgdmFyIGJvdW5kcyA9IGNvbmZpZy5ib3VuZHM7XG5cbiAgICB2YXIgeCA9IGJvdW5kcy54O1xuICAgIHZhciB5ID0gYm91bmRzLnk7XG4gICAgdmFyIHdpZHRoID0gYm91bmRzLndpZHRoO1xuICAgIHZhciBoZWlnaHQgPSBib3VuZHMuaGVpZ2h0O1xuICAgIHZhciBmb250ID0gY29uZmlnLmZvbnQ7XG5cbiAgICB2YXIgaGFsaWduID0gY29uZmlnLmhhbGlnbiB8fCAncmlnaHQnO1xuICAgIHZhciB2YWxpZ25PZmZzZXQgPSBjb25maWcudm9mZnNldCB8fCAwO1xuXG4gICAgdmFyIGNlbGxQYWRkaW5nID0gY29uZmlnLmNlbGxQYWRkaW5nIHx8IDA7XG4gICAgdmFyIGhhbGlnbk9mZnNldCA9IDA7XG4gICAgdmFyIHRleHRXaWR0aCA9IGNvbmZpZy5nZXRUZXh0V2lkdGgoZ2MsIHZhbHVlKTtcbiAgICB2YXIgZm9udE1ldHJpY3MgPSBjb25maWcuZ2V0VGV4dEhlaWdodChmb250KTtcblxuICAgIGlmIChnYy5mb250ICE9PSBjb25maWcuZm9udCkge1xuICAgICAgICBnYy5mb250ID0gY29uZmlnLmZvbnQ7XG4gICAgfVxuICAgIGlmIChnYy50ZXh0QWxpZ24gIT09ICdsZWZ0Jykge1xuICAgICAgICBnYy50ZXh0QWxpZ24gPSAnbGVmdCc7XG4gICAgfVxuICAgIGlmIChnYy50ZXh0QmFzZWxpbmUgIT09ICdtaWRkbGUnKSB7XG4gICAgICAgIGdjLnRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xuICAgIH1cblxuICAgIGlmIChoYWxpZ24gPT09ICdyaWdodCcpIHtcbiAgICAgICAgLy90ZXh0V2lkdGggPSBjb25maWcuZ2V0VGV4dFdpZHRoKGdjLCBjb25maWcudmFsdWUpO1xuICAgICAgICBoYWxpZ25PZmZzZXQgPSB3aWR0aCAtIGNlbGxQYWRkaW5nIC0gdGV4dFdpZHRoO1xuICAgIH0gZWxzZSBpZiAoaGFsaWduID09PSAnY2VudGVyJykge1xuICAgICAgICAvL3RleHRXaWR0aCA9IGNvbmZpZy5nZXRUZXh0V2lkdGgoZ2MsIGNvbmZpZy52YWx1ZSk7XG4gICAgICAgIGhhbGlnbk9mZnNldCA9ICh3aWR0aCAtIHRleHRXaWR0aCkgLyAyO1xuICAgIH0gZWxzZSBpZiAoaGFsaWduID09PSAnbGVmdCcpIHtcbiAgICAgICAgaGFsaWduT2Zmc2V0ID0gY2VsbFBhZGRpbmc7XG4gICAgfVxuXG4gICAgaGFsaWduT2Zmc2V0ID0gTWF0aC5tYXgoMCwgaGFsaWduT2Zmc2V0KTtcbiAgICB2YWxpZ25PZmZzZXQgPSB2YWxpZ25PZmZzZXQgKyBNYXRoLmNlaWwoaGVpZ2h0IC8gMik7XG5cbiAgICAvL2ZpbGwgYmFja2dyb3VuZCBvbmx5IGlmIG91ciBiYWNrZ3JvdW5kQ29sb3IgaXMgcG9wdWxhdGVkIG9yIHdlIGFyZSBhIHNlbGVjdGVkIGNlbGxcbiAgICBpZiAoY29uZmlnLmJhY2tncm91bmRDb2xvciB8fCBjb25maWcuaXNTZWxlY3RlZCkge1xuICAgICAgICBnYy5maWxsU3R5bGUgPSBjb25maWcuaXNTZWxlY3RlZCA/IGNvbmZpZy5iZ1NlbENvbG9yIDogY29uZmlnLmJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgZ2MuZmlsbFJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgfVxuXG4gICAgLy9kcmF3IHRleHRcbiAgICB2YXIgdGhlQ29sb3IgPSBjb25maWcuaXNTZWxlY3RlZCA/IGNvbmZpZy5mZ1NlbENvbG9yIDogY29uZmlnLmNvbG9yO1xuICAgIGlmIChnYy5maWxsU3R5bGUgIT09IHRoZUNvbG9yKSB7XG4gICAgICAgIGdjLmZpbGxTdHlsZSA9IHRoZUNvbG9yO1xuICAgICAgICBnYy5zdHJva2VTdHlsZSA9IHRoZUNvbG9yO1xuICAgIH1cbiAgICBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgZ2MuZmlsbFRleHQodmFsdWUsIHggKyBoYWxpZ25PZmZzZXQsIHkgKyB2YWxpZ25PZmZzZXQpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwYWludDsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb2x1bW4gPSByZXF1aXJlKCcuL2NvbHVtbi5qcycpO1xudmFyIExSVUNhY2hlID0gcmVxdWlyZSgnLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2xydS1jYWNoZS9saWIvbHJ1LWNhY2hlLmpzJyk7XG52YXIgRmluQmFyID0gcmVxdWlyZSgnLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2ZpbmJhcnMvaW5kZXguanMnKTtcbnZhciBkZWZhdWx0Y2VsbHJlbmRlcmVyID0gcmVxdWlyZSgnLi9kZWZhdWx0Y2VsbHJlbmRlcmVyLmpzJyk7XG52YXIgcmVzaXphYmxlcyA9IFtdO1xudmFyIHJlc2l6ZUxvb3BSdW5uaW5nID0gdHJ1ZTtcbnZhciBmb250RGF0YSA9IHt9O1xudmFyIHRleHRXaWR0aENhY2hlID0gbmV3IExSVUNhY2hlKHsgbWF4OiAxMDAwMCB9KTtcblxuXG52YXIgcmVzaXphYmxlc0xvb3BGdW5jdGlvbiA9IGZ1bmN0aW9uKG5vdykge1xuICAgIGlmICghcmVzaXplTG9vcFJ1bm5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc2l6YWJsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc2l6YWJsZXNbaV0obm93KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG59O1xuc2V0SW50ZXJ2YWwocmVzaXphYmxlc0xvb3BGdW5jdGlvbiwgMjAwKTtcblxuXG5mdW5jdGlvbiBHcmlkKGRvbUVsZW1lbnQsIG1vZGVsLCBwcm9wZXJ0aWVzKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMuZ2V0RGVmYXVsdFByb3BlcnRpZXMoKTtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdmFyIGhlYWRlckNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgaGVhZGVyQ29udGV4dCA9IGhlYWRlckNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGNvbHVtbnMgPSBbXTtcbiAgICB0aGlzLnNjcm9sbFggPSAwO1xuICAgIHRoaXMuc2Nyb2xsWSA9IDA7XG5cbiAgICBtb2RlbC5jaGFuZ2VkID0gZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICBzZWxmLnBhaW50KHgsIHkpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldENhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEhlYWRlckNhbnZhcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaGVhZGVyQ2FudmFzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldENvbnRhaW5lciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZG9tRWxlbWVudDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH07XG5cbiAgICB0aGlzLmdldEhlYWRlckNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGhlYWRlckNvbnRleHQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0TW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH07XG5cbiAgICB0aGlzLnNldE1vZGVsID0gZnVuY3Rpb24oZ3JpZE1vZGVsKSB7XG4gICAgICAgIG1vZGVsID0gZ3JpZE1vZGVsO1xuICAgIH07XG5cbiAgICB0aGlzLmdldENvbHVtbnMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNvbHVtbnM7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRDb2x1bW5zID0gZnVuY3Rpb24gKGNvbHMpIHtcbiAgICAgICAgY29sdW1ucyA9IGNvbHM7XG4gICAgfVxuXG4gICAgdGhpcy5nZXRPcHRpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH07XG5cbiAgICB0aGlzLnNldE9wdGlvbnMgPSBmdW5jdGlvbihuZXdPcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBuZXdPcHRpb25zO1xuICAgIH07XG5cbiAgICB0aGlzLmFkZFByb3BlcnRpZXMocHJvcGVydGllcyk7XG5cbiAgICB0aGlzLmluaXRpYWxpemUoKVxufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0RGVmYXVsdFByb3BlcnRpZXMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBmb250OiAnMTNweCBUYWhvbWEsIEdlbmV2YSwgc2Fucy1zZXJpZicsXG4gICAgICAgIGNvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgIGJhY2tncm91bmRDb2xvcjogJyM1MDUwNTAnLFxuICAgICAgICBmb3JlZ3JvdW5kU2VsQ29sb3I6ICdyZ2IoMjUsIDI1LCAyNSknLFxuICAgICAgICBiYWNrZ3JvdW5kU2VsQ29sb3I6ICdyZ2IoMTgzLCAyMTksIDI1NSknLFxuXG4gICAgICAgIHRvcExlZnRGb250OiAnMTRweCBUYWhvbWEsIEdlbmV2YSwgc2Fucy1zZXJpZicsXG4gICAgICAgIHRvcExlZnRDb2xvcjogJ3JnYigyNSwgMjUsIDI1KScsXG4gICAgICAgIHRvcExlZnRCYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoMjIzLCAyMjcsIDIzMiknLFxuICAgICAgICB0b3BMZWZ0RkdTZWxDb2xvcjogJ3JnYigyNSwgMjUsIDI1KScsXG4gICAgICAgIHRvcExlZnRCR1NlbENvbG9yOiAncmdiKDI1NSwgMjIwLCA5NyknLFxuXG4gICAgICAgIGZpeGVkQ29sdW1uRm9udDogJzE0cHggVGFob21hLCBHZW5ldmEsIHNhbnMtc2VyaWYnLFxuICAgICAgICBmaXhlZENvbHVtbkNvbG9yOiAncmdiKDI1LCAyNSwgMjUpJyxcbiAgICAgICAgZml4ZWRDb2x1bW5CYWNrZ3JvdW5kQ29sb3I6ICdyZ2IoMjIzLCAyMjcsIDIzMiknLFxuICAgICAgICBmaXhlZENvbHVtbkZHU2VsQ29sb3I6ICdyZ2IoMjUsIDI1LCAyNSknLFxuICAgICAgICBmaXhlZENvbHVtbkJHU2VsQ29sb3I6ICdyZ2IoMjU1LCAyMjAsIDk3KScsXG5cbiAgICAgICAgZml4ZWRSb3dGb250OiAnMTFweCBUYWhvbWEsIEdlbmV2YSwgc2Fucy1zZXJpZicsXG4gICAgICAgIGZpeGVkUm93Q29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgZml4ZWRSb3dCYWNrZ3JvdW5kQ29sb3I6ICcjMzAzMDMwJyxcbiAgICAgICAgZml4ZWRSb3dGR1NlbENvbG9yOiAncmdiKDI1LCAyNSwgMjUpJyxcbiAgICAgICAgZml4ZWRSb3dCR1NlbENvbG9yOiAncmdiKDI1NSwgMjIwLCA5NyknLFxuXG4gICAgICAgIGJhY2tncm91bmRDb2xvcjI6ICcjMzAzMDMwJyxcbiAgICAgICAgbGluZUNvbG9yOiAnIzcwNzA3MCcsXG4gICAgICAgIHZvZmZzZXQ6IDAsXG4gICAgICAgIHNjcm9sbGluZ0VuYWJsZWQ6IGZhbHNlLFxuICAgICAgICB2U2Nyb2xsYmFyQ2xhc3NQcmVmaXg6ICdmaW4tc2ItdXNlcicsXG4gICAgICAgIGhTY3JvbGxiYXJDbGFzc1ByZWZpeDogJ2Zpbi1zYi11c2VyJyxcblxuICAgICAgICBkZWZhdWx0Um93SGVpZ2h0OiAyNSxcbiAgICAgICAgZGVmYXVsdEZpeGVkUm93SGVpZ2h0OiAyMCxcbiAgICAgICAgZGVmYXVsdENvbHVtbldpZHRoOiAxMDAsXG4gICAgICAgIGRlZmF1bHRGaXhlZENvbHVtbldpZHRoOiAxMDAsXG4gICAgICAgIGNlbGxQYWRkaW5nOiA1XG4gICAgfTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFBhaW50Q29uZmlnID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGNvbmZpZyA9IE9iamVjdC5jcmVhdGUodGhpcy5nZXRPcHRpb25zKCkpO1xuXG4gICAgY29uZmlnLmdldFRleHRIZWlnaHQgPSBmdW5jdGlvbihmb250KSB7XG4gICAgICAgIHJldHVybiBzZWxmLmdldFRleHRIZWlnaHQoZm9udCk7XG4gICAgfTtcblxuICAgIGNvbmZpZy5nZXRUZXh0V2lkdGggPSBmdW5jdGlvbihnYywgdGV4dCkge1xuICAgICAgICByZXR1cm4gc2VsZi5nZXRUZXh0V2lkdGgoZ2MsIHRleHQpO1xuICAgIH07XG5cbiAgICByZXR1cm4gY29uZmlnO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0VGV4dFdpZHRoID0gZnVuY3Rpb24oZ2MsIHN0cmluZykge1xuICAgIGlmIChzdHJpbmcgPT09IG51bGwgfHwgc3RyaW5nID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHN0cmluZyA9IHN0cmluZyArICcnO1xuICAgIGlmIChzdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB2YXIga2V5ID0gZ2MuZm9udCArIHN0cmluZztcbiAgICB2YXIgd2lkdGggPSB0ZXh0V2lkdGhDYWNoZS5nZXQoa2V5KTtcbiAgICBpZiAoIXdpZHRoKSB7XG4gICAgICAgIHdpZHRoID0gZ2MubWVhc3VyZVRleHQoc3RyaW5nKS53aWR0aDtcbiAgICAgICAgdGV4dFdpZHRoQ2FjaGUuc2V0KGtleSwgd2lkdGgpO1xuICAgIH1cbiAgICByZXR1cm4gd2lkdGg7XG59O1xuXG5cbkdyaWQucHJvdG90eXBlLmdldFRleHRIZWlnaHQgPSBmdW5jdGlvbihmb250KSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gZm9udERhdGFbZm9udF07XG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICByZXN1bHQgPSB7fTtcbiAgICB2YXIgdGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB0ZXh0LnRleHRDb250ZW50ID0gJ0hnJztcbiAgICB0ZXh0LnN0eWxlLmZvbnQgPSBmb250O1xuXG4gICAgdmFyIGJsb2NrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgYmxvY2suc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snO1xuICAgIGJsb2NrLnN0eWxlLndpZHRoID0gJzFweCc7XG4gICAgYmxvY2suc3R5bGUuaGVpZ2h0ID0gJzBweCc7XG5cbiAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2LmFwcGVuZENoaWxkKHRleHQpO1xuICAgIGRpdi5hcHBlbmRDaGlsZChibG9jayk7XG5cbiAgICBkaXYuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZGl2KTtcblxuICAgIHRyeSB7XG5cbiAgICAgICAgYmxvY2suc3R5bGUudmVydGljYWxBbGlnbiA9ICdiYXNlbGluZSc7XG5cbiAgICAgICAgdmFyIGJsb2NrUmVjdCA9IGJsb2NrLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICB2YXIgdGV4dFJlY3QgPSB0ZXh0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIHJlc3VsdC5hc2NlbnQgPSBibG9ja1JlY3QudG9wIC0gdGV4dFJlY3QudG9wO1xuXG4gICAgICAgIGJsb2NrLnN0eWxlLnZlcnRpY2FsQWxpZ24gPSAnYm90dG9tJztcbiAgICAgICAgcmVzdWx0LmhlaWdodCA9IGJsb2NrUmVjdC50b3AgLSB0ZXh0UmVjdC50b3A7XG5cbiAgICAgICAgcmVzdWx0LmRlc2NlbnQgPSByZXN1bHQuaGVpZ2h0IC0gcmVzdWx0LmFzY2VudDtcblxuICAgIH0gZmluYWxseSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoZGl2KTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5oZWlnaHQgIT09IDApIHtcbiAgICAgICAgZm9udERhdGFbZm9udF0gPSByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5tZXJnZSA9IGZ1bmN0aW9uKHByb3BlcnRpZXMxLCBwcm9wZXJ0aWVzMikge1xuICAgIGZvciAodmFyIGtleSBpbiBwcm9wZXJ0aWVzMikge1xuICAgICAgICBpZiAocHJvcGVydGllczIuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgcHJvcGVydGllczFba2V5XSA9IHByb3BlcnRpZXMyW2tleV07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5hZGRQcm9wZXJ0aWVzID0gZnVuY3Rpb24ocHJvcGVydGllcykge1xuICAgIHRoaXMubWVyZ2UodGhpcy5nZXRPcHRpb25zKCksIHByb3BlcnRpZXMpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZml4ZWRSb3dIZWlnaHQgPSB0aGlzLmdldEZpeGVkUm93SGVpZ2h0KCk7XG4gICAgdmFyIGNvbnRhaW5lciA9IHRoaXMuZ2V0Q29udGFpbmVyKCk7XG4gICAgdmFyIGRpdkhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdkhlYWRlci5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgZGl2SGVhZGVyLnN0eWxlLnRvcCA9IDA7XG4gICAgZGl2SGVhZGVyLnN0eWxlLnJpZ2h0ID0gMDtcbiAgICBkaXZIZWFkZXIuc3R5bGUubGVmdCA9IDA7XG4gICAgZGl2SGVhZGVyLnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG5cbiAgICBkaXZIZWFkZXIuYXBwZW5kQ2hpbGQodGhpcy5nZXRIZWFkZXJDYW52YXMoKSk7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGRpdkhlYWRlcik7XG5cbiAgICByZXF1aXJlKCcuL2NvbC1yZW9yZGVyLmpzJykuaW5pdChzZWxmLCBkaXZIZWFkZXIpO1xuXG4gICAgdmFyIGRpdk1haW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkaXZNYWluLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICBkaXZNYWluLnN0eWxlLnRvcCA9IGZpeGVkUm93SGVpZ2h0ICsgJ3B4JztcbiAgICBkaXZNYWluLnN0eWxlLnJpZ2h0ID0gMDtcbiAgICBkaXZNYWluLnN0eWxlLmJvdHRvbSA9IDA7XG4gICAgZGl2TWFpbi5zdHlsZS5sZWZ0ID0gMDtcbiAgICAvLyBkaXZNYWluLnN0eWxlLm92ZXJmbG93ID0gJ2F1dG8nO1xuICAgIC8vIGRpdk1haW4uc3R5bGUubXNPdmVyZmxvd1N0eWxlID0gJy1tcy1hdXRvaGlkaW5nLXNjcm9sbGJhcic7XG4gICAgLy8gZGl2TWFpbi5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAvLyAgICAgZGl2SGVhZGVyLnNjcm9sbExlZnQgPSBlLnRhcmdldC5zY3JvbGxMZWZ0O1xuICAgIC8vIH0pO1xuICAgIGRpdk1haW4uc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJ1xuXG4gICAgdGhpcy5pbml0U2Nyb2xsYmFycygpO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLnNjcm9sbGJhcnNEaXYpO1xuXG4gICAgZGl2TWFpbi5hcHBlbmRDaGlsZCh0aGlzLmdldENhbnZhcygpKTtcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZGl2TWFpbik7XG4gICAgXG5cbiAgICB0aGlzLmNoZWNrQ2FudmFzQm91bmRzKCk7XG4gICAgdGhpcy5iZWdpblJlc2l6aW5nKCk7XG5cbn07XG5cbkdyaWQucHJvdG90eXBlLmluaXRTY3JvbGxiYXJzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgdGhpcy5zY3JvbGxiYXJzRGl2ID0gdGhpcy5nZXRTY3JvbGxiYXJEaXYoKTtcbiAgICBcbiAgICB2YXIgaG9yekJhciA9IG5ldyBGaW5CYXIoe1xuICAgICAgICBvcmllbnRhdGlvbjogJ2hvcml6b250YWwnLFxuICAgICAgICBvbmNoYW5nZTogZnVuY3Rpb24oaWR4KSB7XG4gICAgICAgICAgICBzZWxmLnNldFNjcm9sbFgoaWR4KTtcbiAgICAgICAgfSxcbiAgICAgICAgY3NzU3R5bGVzaGVldFJlZmVyZW5jZUVsZW1lbnQ6IGRvY3VtZW50LmJvZHksXG4gICAgICAgIGNvbnRhaW5lcjogdGhpcy5nZXRDb250YWluZXIoKSxcbiAgICB9KTtcblxuICAgIHZhciB2ZXJ0QmFyID0gbmV3IEZpbkJhcih7XG4gICAgICAgIG9yaWVudGF0aW9uOiAndmVydGljYWwnLFxuICAgICAgICBvbmNoYW5nZTogZnVuY3Rpb24oaWR4KSB7XG4gICAgICAgICAgICBzZWxmLnNldFNjcm9sbFkoaWR4KTtcbiAgICAgICAgfSxcbiAgICAgICAgcGFnaW5nOiB7XG4gICAgICAgICAgICB1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYucGFnZVVwKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYucGFnZURvd24oKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRhaW5lcjogdGhpcy5nZXRDb250YWluZXIoKSxcbiAgICB9KTtcblxuICAgIHRoaXMuc2JIU2Nyb2xsZXIgPSBob3J6QmFyO1xuICAgIHRoaXMuc2JWU2Nyb2xsZXIgPSB2ZXJ0QmFyO1xuXG4gICAgdGhpcy5zYkhTY3JvbGxlci5jbGFzc1ByZWZpeCA9IHRoaXMucmVzb2x2ZVByb3BlcnR5KCdoU2Nyb2xsYmFyQ2xhc3NQcmVmaXgnKTtcbiAgICB0aGlzLnNiVlNjcm9sbGVyLmNsYXNzUHJlZml4ID0gdGhpcy5yZXNvbHZlUHJvcGVydHkoJ3ZTY3JvbGxiYXJDbGFzc1ByZWZpeCcpO1xuXG4gICAgdGhpcy5zY3JvbGxiYXJzRGl2LmFwcGVuZENoaWxkKGhvcnpCYXIuYmFyKTtcbiAgICB0aGlzLnNjcm9sbGJhcnNEaXYuYXBwZW5kQ2hpbGQodmVydEJhci5iYXIpO1xuXG59O1xuXG5HcmlkLnByb3RvdHlwZS5wYWdlRG93biA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAxO1xufTtcblxuR3JpZC5wcm90b3R5cGUucGFnZVVwID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDE7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXRTY3JvbGxYID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLnNjcm9sbFggPSB2YWx1ZTtcbiAgICB0aGlzLnBhaW50QWxsKCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXRTY3JvbGxZID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLnNjcm9sbFkgPSB2YWx1ZTtcbiAgICB0aGlzLnBhaW50QWxsKCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5yZXNpemVTY3JvbGxiYXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zYkhTY3JvbGxlci5zaG9ydGVuQnkodGhpcy5zYlZTY3JvbGxlcikucmVzaXplKCk7XG4gICAgdGhpcy5zYlZTY3JvbGxlci5zaG9ydGVuQnkodGhpcy5zYkhTY3JvbGxlcikucmVzaXplKCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXRWU2Nyb2xsYmFyVmFsdWVzID0gZnVuY3Rpb24obWF4KSB7XG4gICAgdGhpcy5zYlZTY3JvbGxlci5yYW5nZSA9IHtcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IG1heFxuICAgIH07XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXRIU2Nyb2xsYmFyVmFsdWVzID0gZnVuY3Rpb24obWF4KSB7XG4gICAgdGhpcy5zYkhTY3JvbGxlci5yYW5nZSA9IHtcbiAgICAgICAgbWluOiAwLFxuICAgICAgICBtYXg6IG1heFxuICAgIH07XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRTY3JvbGxiYXJEaXYgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZml4ZWRSb3dIZWlnaHQgPSB0aGlzLmdldEZpeGVkUm93SGVpZ2h0KCk7XG4gICAgdmFyIG91dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdmFyIHN0clZhcj1cIlwiO1xuICAgIHN0clZhciArPSBcIjxkaXYgc3R5bGU9XFxcInRvcDpcIiArIGZpeGVkUm93SGVpZ2h0ICsgXCJweDtyaWdodDowcHg7Ym90dG9tOjBweDtsZWZ0OjBweDtwb3NpdGlvbjphYnNvbHV0ZVxcXCI+XCI7XG4gICAgc3RyVmFyICs9IFwiICA8c3R5bGU+XCI7XG4gICAgc3RyVmFyICs9IFwiICBkaXYuZmluYmFyLWhvcml6b250YWwsXCI7XG4gICAgc3RyVmFyICs9IFwiICBkaXYuZmluYmFyLXZlcnRpY2FsIHtcIjtcbiAgICBzdHJWYXIgKz0gXCIgICAgei1pbmRleDogNTtcIjtcbiAgICBzdHJWYXIgKz0gXCIgICAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjUpO1wiO1xuICAgIHN0clZhciArPSBcIiAgICBib3gtc2hhZG93OiAwIDAgM3B4ICMwMDAsIDAgMCAzcHggIzAwMCwgMCAwIDNweCAjMDAwO1wiO1xuICAgIHN0clZhciArPSBcIiAgfVwiO1xuICAgIHN0clZhciArPSBcIiAgXCI7XG4gICAgc3RyVmFyICs9IFwiICBkaXYuZmluYmFyLWhvcml6b250YWw+LnRodW1iLFwiO1xuICAgIHN0clZhciArPSBcIiAgZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWIge1wiO1xuICAgIHN0clZhciArPSBcIiAgICBvcGFjaXR5OiAuODU7XCI7XG4gICAgc3RyVmFyICs9IFwiICAgIGJveC1zaGFkb3c6IDAgMCAzcHggIzAwMCwgMCAwIDNweCAjMDAwLCAwIDAgM3B4ICMwMDA7XCI7XG4gICAgc3RyVmFyICs9IFwiICB9XCI7XG4gICAgc3RyVmFyICs9IFwiICA8XFwvc3R5bGU+XCI7XG4gICAgc3RyVmFyICs9IFwiPFxcL2Rpdj5cIjtcbiAgICBvdXRlci5pbm5lckhUTUwgPSBzdHJWYXI7XG4gICAgdmFyIGlubmVyID0gb3V0ZXIuZmlyc3RDaGlsZDtcbiAgICByZXR1cm4gaW5uZXI7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5jaGVja0NhbnZhc0JvdW5kcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb250YWluZXIgPSB0aGlzLmdldENvbnRhaW5lcigpO1xuICAgIHZhciBoZWFkZXJIZWlnaHQgPSB0aGlzLmdldEZpeGVkUm93SGVpZ2h0KCk7XG4gICAgXG4gICAgdmFyIHZpZXdwb3J0ID0gY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgdmFyIGhlYWRlckNhbnZhcyA9IHRoaXMuZ2V0SGVhZGVyQ2FudmFzKCk7XG4gICAgdmFyIGNhbnZhcyA9IHRoaXMuZ2V0Q2FudmFzKCk7XG5cbiAgICBoZWFkZXJDYW52YXMuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgIGhlYWRlckNhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmlld3BvcnQud2lkdGgpO1xuICAgIGhlYWRlckNhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlYWRlckhlaWdodCk7XG5cbiAgICBjYW52YXMuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgIGNhbnZhcy5zdHlsZS50b3AgPSAnMXB4JztcbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZpZXdwb3J0LndpZHRoKTtcbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2aWV3cG9ydC5oZWlnaHQgLSBoZWFkZXJIZWlnaHQpO1xuXG4gICAgdGhpcy53aWR0aCA9IHZpZXdwb3J0LndpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gdmlld3BvcnQuaGVpZ2h0O1xuICAgIFxuICAgIC8vdGhlIG1vZGVsIG1heSBoYXZlIGNoYW5nZWQsIGxldHNcbiAgICAvL3JlY29tcHV0ZSB0aGUgc2Nyb2xsaW5nIGNvb3JkaW5hdGVzXG4gICAgdGhpcy5maW5hbFBhZ2VMb2NhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB2YXIgZmluYWxQYWdlTG9jYXRpb24gPSB0aGlzLmdldEZpbmFsUGFnZUxvY2F0aW9uKCk7XG4gICAgdGhpcy5zZXRIU2Nyb2xsYmFyVmFsdWVzKGZpbmFsUGFnZUxvY2F0aW9uLngpO1xuICAgIHRoaXMuc2V0VlNjcm9sbGJhclZhbHVlcyhmaW5hbFBhZ2VMb2NhdGlvbi55KTtcblxuICAgIHRoaXMucmVzaXplU2Nyb2xsYmFycygpO1xuICAgIHRoaXMucGFpbnRBbGwoKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmNvbXB1dGVNYWluQXJlYUZ1bGxIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcm93SGVpZ2h0ID0gdGhpcy5nZXRSb3dIZWlnaHQoMCk7XG4gICAgdmFyIG51bVJvd3MgPSB0aGlzLmdldFJvd0NvdW50KCk7XG4gICAgdmFyIHRvdGFsSGVpZ2h0ID0gcm93SGVpZ2h0ICogbnVtUm93cztcbiAgICByZXR1cm4gdG90YWxIZWlnaHQ7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5jb21wdXRlTWFpbkFyZWFGdWxsV2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbnVtQ29scyA9IHRoaXMuZ2V0Q29sdW1uQ291bnQoKTtcbiAgICB2YXIgd2lkdGggPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQ29sczsgaSsrKSB7XG4gICAgICAgIHdpZHRoID0gd2lkdGggKyB0aGlzLmdldENvbHVtbldpZHRoKGkpO1xuICAgIH1cbiAgICByZXR1cm4gd2lkdGg7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zdG9wUmVzaXplVGhyZWFkID0gZnVuY3Rpb24oKSB7XG4gICAgcmVzaXplTG9vcFJ1bm5pbmcgPSBmYWxzZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnJlc3RhcnRSZXNpemVUaHJlYWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAocmVzaXplTG9vcFJ1bm5pbmcpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBhbHJlYWR5IHJ1bm5pbmdcbiAgICB9XG4gICAgcmVzaXplTG9vcFJ1bm5pbmcgPSB0cnVlO1xuICAgIHNldEludGVydmFsKHJlc2l6YWJsZXNMb29wRnVuY3Rpb24sIDIwMCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5iZWdpblJlc2l6aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMudGlja1Jlc2l6ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5jaGVja0NhbnZhc0JvdW5kcygpO1xuICAgIH07XG4gICAgcmVzaXphYmxlcy5wdXNoKHRoaXMudGlja1Jlc2l6ZXIpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc3RvcFJlc2l6aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmVzaXphYmxlcy5zcGxpY2UocmVzaXphYmxlcy5pbmRleE9mKHRoaXMudGlja1Jlc2l6ZXIpLCAxKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldENvbHVtbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW5zKClbeF07XG4gICAgcmV0dXJuIGNvbHVtbjtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZhciBtb2RlbCA9IHRoaXMuZ2V0TW9kZWwoKTtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW5zKClbeF07XG4gICAgdmFyIGZpZWxkID0gY29sdW1uLmdldEZpZWxkKCk7XG4gICAgdmFyIHZhbHVlID0gbW9kZWwuZ2V0VmFsdWUoZmllbGQsIHkpO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldEJvdW5kc09mQ2VsbCA9IGZ1bmN0aW9uKHgsIHksIHhPZmZzZXQsIHlPZmZzZXQpIHtcbiAgICB4T2Zmc2V0ID0geE9mZnNldCB8fCAwO1xuICAgIHlPZmZzZXQgPSB5T2Zmc2V0IHx8IDA7XG4gICAgdmFyIHJ4LCByeSwgcndpZHRoLCByaGVpZ2h0O1xuICAgIHZhciByb3dIZWlnaHQgPSB0aGlzLmdldFJvd0hlaWdodCgwKTtcblxuICAgIHJ4ID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8ICh4IC0geE9mZnNldCk7IGkrKykge1xuICAgICAgICByeCA9IHJ4ICsgdGhpcy5nZXRDb2x1bW5XaWR0aChpICsgeE9mZnNldCk7XG4gICAgfVxuICAgIHJ5ID0gcm93SGVpZ2h0ICogKHkgLSB5T2Zmc2V0KTtcbiAgICByd2lkdGggPSB0aGlzLmdldENvbHVtbldpZHRoKHgpO1xuICAgIHJoZWlnaHQgPSByb3dIZWlnaHQ7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgeDogcngsXG4gICAgICAgIHk6IHJ5LFxuICAgICAgICB3aWR0aDogcndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHJoZWlnaHRcbiAgICB9O1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRGaXhlZFJvd0hlaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMucmVzb2x2ZVByb3BlcnR5KCdkZWZhdWx0Rml4ZWRSb3dIZWlnaHQnKTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRDb2x1bW5XaWR0aCA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW4oeCk7XG4gICAgaWYgKCFjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZVByb3BlcnR5KCdkZWZhdWx0Q29sdW1uV2lkdGgnKTtcbiAgICB9XG4gICAgdmFyIHZhbHVlID0gY29sdW1uLmdldFdpZHRoKCk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0Um93SGVpZ2h0ID0gZnVuY3Rpb24oeSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMucmVzb2x2ZVByb3BlcnR5KCdkZWZhdWx0Um93SGVpZ2h0Jyk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuR3JpZC5wcm90b3R5cGUucmVzb2x2ZVByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuZ2V0T3B0aW9ucygpW25hbWVdO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldENvbHVtbkNvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldENvbHVtbnMoKTtcbiAgICByZXR1cm4gY29sdW1ucy5sZW5ndGhcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFJvd0NvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1vZGVsID0gdGhpcy5nZXRNb2RlbCgpO1xuICAgIHJldHVybiBtb2RlbC5nZXRSb3dDb3VudCgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuYWRkQ29sdW1uID0gZnVuY3Rpb24oZmllbGQsIGxhYmVsLCB0eXBlLCB3aWR0aCwgcmVuZGVyZXIpIHtcbiAgICB2YXIgY29sdW1ucyA9IHRoaXMuZ2V0Q29sdW1ucygpO1xuICAgIHZhciBuZXdDb2wgPSBuZXcgQ29sdW1uKHRoaXMsIGZpZWxkLCBsYWJlbCwgdHlwZSwgd2lkdGgsIHJlbmRlcmVyKTtcbiAgICBjb2x1bW5zLnB1c2gobmV3Q29sKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnBhaW50QWxsID0gZnVuY3Rpb24oKSB7XG4gICAgLy92YXIgdmlld3BvcnQgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBjb25maWcgPSB0aGlzLmdldFBhaW50Q29uZmlnKCk7XG4gICAgdmFyIG51bUNvbHMgPSB0aGlzLmdldENvbHVtbkNvdW50KCk7XG4gICAgdmFyIG51bVJvd3MgPSB0aGlzLmdldFJvd0NvdW50KCk7XG5cdHRoaXMucGFpbnRNYWluQXJlYShjb25maWcsIG51bUNvbHMsIG51bVJvd3MpO1xuXHR0aGlzLnBhaW50SGVhZGVycyhjb25maWcsIG51bUNvbHMsIDEpO1xufVxuXG5HcmlkLnByb3RvdHlwZS5wYWludE1haW5BcmVhID0gZnVuY3Rpb24oY29uZmlnLCBudW1Db2xzLCBudW1Sb3dzKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuZ2V0Q29udGV4dCgpO1xuICAgICAgICB2YXIgc2Nyb2xsWCA9IHRoaXMuc2Nyb2xsWDtcbiAgICAgICAgdmFyIHNjcm9sbFkgPSB0aGlzLnNjcm9sbFk7XG4gICAgICAgIHZhciBib3VuZHMgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIHZhciB0b3RhbEhlaWdodCA9IDA7XG4gICAgICAgIHZhciB0b3RhbFdpZHRoID0gMDtcbiAgICAgICAgdmFyIGR4LCBkeSA9IDA7XG4gICAgICAgIGNvbnRleHQuc2F2ZSgpO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgKHggKyBzY3JvbGxYKSA8IG51bUNvbHMgJiYgdG90YWxXaWR0aCA8IGJvdW5kcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICB2YXIgcm93SGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHRvdGFsSGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyAoeSArIHNjcm9sbFkpIDwgbnVtUm93cyAmJiB0b3RhbEhlaWdodCA8IGJvdW5kcy5oZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICAgIHZhciBkeCA9IHggKyBzY3JvbGxYO1xuICAgICAgICAgICAgICAgIHZhciBkeSA9IHkgKyBzY3JvbGxZO1xuICAgICAgICAgICAgICAgIHRoaXMucGFpbnRDZWxsKGNvbnRleHQsIGR4LCBkeSwgY29uZmlnKTtcbiAgICAgICAgICAgICAgICByb3dIZWlnaHQgPSB0aGlzLmdldFJvd0hlaWdodChkeSk7XG4gICAgICAgICAgICAgICAgdG90YWxIZWlnaHQgPSB0b3RhbEhlaWdodCArIHJvd0hlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb2xXaWR0aCA9IHRoaXMuZ2V0Q29sdW1uV2lkdGgoZHgpO1xuICAgICAgICAgICAgdG90YWxXaWR0aCA9IHRvdGFsV2lkdGggKyBjb2xXaWR0aDtcbiAgICAgICAgfVxuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfVxufTtcblxuXG5HcmlkLnByb3RvdHlwZS5wYWludEhlYWRlcnMgPSBmdW5jdGlvbihjb25maWcsIG51bUNvbHMsIG51bVJvd3MpIHtcbiAgICB0cnkge1xuICAgIFx0Y29uZmlnLmhhbGlnbiA9ICdjZW50ZXInO1xuICAgIFx0Y29uZmlnLmNlbGxQYWRkaW5nID0gJzBweCc7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldEhlYWRlckNvbnRleHQoKTtcbiAgICAgICAgY29udGV4dC5zYXZlKCk7XG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgbnVtQ29sczsgeCsrKSB7XG4gICAgICAgICAgICB0aGlzLnBhaW50SGVhZGVyQ2VsbChjb250ZXh0LCB4LCBjb25maWcpO1xuICAgICAgICB9XG5cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5wYWludENlbGwgPSBmdW5jdGlvbihjb250ZXh0LCB4LCB5LCBjb25maWcpIHtcbiAgICB2YXIgbW9kZWwgPSB0aGlzLmdldE1vZGVsKCk7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuZ2V0Qm91bmRzT2ZDZWxsKHgsIHksIHRoaXMuc2Nyb2xsWCwgdGhpcy5zY3JvbGxZKTtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW4oeCk7XG4gICAgdmFyIHJlbmRlcmVyID0gY29sdW1uLmdldFJlbmRlcmVyKCk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5nZXRWYWx1ZSh4LCB5KTtcbiAgICBjb25maWcudmFsdWUgPSB2YWx1ZTtcbiAgICBjb25maWcueCA9IHg7XG4gICAgY29uZmlnLnkgPSB5O1xuICAgIGNvbmZpZy5ib3VuZHMgPSBib3VuZHM7XG4gICAgY29uZmlnLnR5cGUgPSAnY2VsbCc7XG4gICAgcmVuZGVyZXIoY29udGV4dCwgY29uZmlnKTtcbn07XG5cblxuR3JpZC5wcm90b3R5cGUucGFpbnRIZWFkZXJDZWxsID0gZnVuY3Rpb24oY29udGV4dCwgeCwgY29uZmlnKSB7XG4gICAgdmFyIHkgPSAwO1xuICAgIHZhciBib3VuZHMgPSB0aGlzLmdldEJvdW5kc09mQ2VsbCh4LCB5LCB0aGlzLnNjcm9sbFgsIDApO1xuICAgIHZhciBjb2x1bW4gPSB0aGlzLmdldENvbHVtbih4KTtcbiAgICB2YXIgcmVuZGVyZXIgPSBjb2x1bW4uZ2V0UmVuZGVyZXIoKTtcbiAgICB2YXIgdmFsdWUgPSBjb2x1bW4uZ2V0TGFiZWwoKTtcbiAgICBjb25maWcudmFsdWUgPSB2YWx1ZTtcbiAgICBjb25maWcueCA9IHg7XG4gICAgY29uZmlnLnkgPSB5O1xuICAgIGNvbmZpZy5ib3VuZHMgPSBib3VuZHM7XG4gICAgY29uZmlnLnR5cGUgPSAnaGVhZGVyJztcbiAgICByZW5kZXJlcihjb250ZXh0LCBjb25maWcpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0RmluYWxQYWdlTG9jYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5maW5hbFBhZ2VMb2NhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZmluYWxQYWdlTG9jYXRpb24gPSB0aGlzLmdldERlZmF1bHRGaW5hbFBhZ2VMb2NhdGlvbigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maW5hbFBhZ2VMb2NhdGlvbjtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldERlZmF1bHRGaW5hbFBhZ2VMb2NhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBteVNpemUgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBudW1Db2xzID0gdGhpcy5nZXRDb2x1bW5Db3VudCgpO1xuICAgIHZhciByb3dIZWlnaHQgPSB0aGlzLmdldFJvd0hlaWdodCgwKTtcbiAgICB2YXIgdG90YWxXaWR0aCA9IDA7XG4gICAgdmFyIG51bVJvd3MgPSBNYXRoLmZsb29yKG15U2l6ZS5oZWlnaHQvcm93SGVpZ2h0KTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQ29sczsgaSsrKSB7XG4gICAgICAgIHZhciBjID0gbnVtQ29scyAtIGkgLSAxO1xuICAgICAgICB2YXIgZWFjaFdpZHRoID0gdGhpcy5nZXRDb2x1bW5XaWR0aChjKTtcbiAgICAgICAgdG90YWxXaWR0aCA9IHRvdGFsV2lkdGggKyBlYWNoV2lkdGg7XG4gICAgICAgIGlmICh0b3RhbFdpZHRoID49IG15U2l6ZS53aWR0aCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIG1heFggPSBudW1Db2xzIC0gaTtcbiAgICB2YXIgbWF4WSA9IHRoaXMuZ2V0Um93Q291bnQoKSAtIG51bVJvd3M7IFxuICAgIHJldHVybiB7eDogbWF4WCwgeTogbWF4WX1cbn07XG5cbkdyaWQucHJvdG90eXBlLmdldERlZmF1bHRDZWxsUmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGVmYXVsdGNlbGxyZW5kZXJlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkb21FbGVtZW50LCBtb2RlbCkge1xuICAgIHJldHVybiBuZXcgR3JpZChkb21FbGVtZW50LCBtb2RlbCk7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cblxudmFyIEdyaWRNb2RlbCA9IGZ1bmN0aW9uKGpzb25EYXRhKSB7XG5cbiAgICAvL3RoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIG92ZXJyaWRlbiBieSBncmlkIGl0c2VsZjtcbiAgICAvL2lmIGNvb3JkaW5hdGVzIC0xLCAtMSBhcmUgdXNlZCwgaXQgbWVhbnMgXG4gICAgLy9yZXBhaW50IHRoZSB3aG9sZSB2aXNpYmxlIGdyaWRcbiAgICB0aGlzLmNoYW5nZWQgPSBmdW5jdGlvbih4LCB5KSB7fTtcblxuICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ganNvbkRhdGE7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAganNvbkRhdGEgPSBkYXRhO1xuICAgIH1cblxufTtcblxuR3JpZE1vZGVsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKGZpZWxkLCB5KSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuZ2V0RGF0YSgpW3ldO1xuICAgIHZhciB2YWx1ZSA9IG9ialtmaWVsZF07XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuR3JpZE1vZGVsLnByb3RvdHlwZS5nZXRSb3dDb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmdldERhdGEoKS5sZW5ndGg7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyaWRNb2RlbDsiXX0=
