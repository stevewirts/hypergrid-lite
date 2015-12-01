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
            resizingCols = true;

            if (mouseDown) {
                if (borderHit > 0) {
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
    var self = this;
    var container = this.getContainer();
    var headerHeight = this.getFixedRowHeight();
    
    var viewport = container.getBoundingClientRect();

    var headerCanvas = this.getHeaderCanvas();
    var canvas = this.getCanvas();

    if (this.boundsInitialized && canvas.getAttribute('width') === ('' + viewport.width)
        && canvas.getAttribute('height') === ('' + (viewport.height - headerHeight))) {
            return;
    }

    this.boundsInitialized = true;

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
    setTimeout(function() {
        self.paintAll();
    }, 100);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvamF2YXNjcmlwdC9tYWluLmpzIiwibm9kZV9tb2R1bGVzL2ZpbmJhcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbHJ1LWNhY2hlL2xpYi9scnUtY2FjaGUuanMiLCJub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9jb2wtcmVvcmRlci5qcyIsInNyYy9qYXZhc2NyaXB0L2NvbXBvbmVudHMvY29sdW1uLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9kZWZhdWx0Y2VsbHJlbmRlcmVyLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9ncmlkLmpzIiwic3JjL2phdmFzY3JpcHQvY29tcG9uZW50cy9ncmlkbW9kZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDejJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM29CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxudmFyIGdyaWQgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvZ3JpZC5qcycpO1xudmFyIEdyaWRNb2RlbCA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9ncmlkbW9kZWwuanMnKTtcblxuaWYgKCF3aW5kb3cuZmluKSB7XG4gICAgd2luZG93LmZpbiA9IHt9O1xufVxuXG53aW5kb3cuZmluLmh5cGVyZ3JpZGxpdGUgPSB7XG4gICAgY3JlYXRlT246IGdyaWQsXG4gICAgR3JpZE1vZGVsOiBHcmlkTW9kZWxcbn07XG5cbm1vZHVsZS5leHBvcnRzLmZvbyA9ICdmb28nOyIsIid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50LWVudiBub2RlLCBicm93c2VyICovXG5cbihmdW5jdGlvbiAobW9kdWxlKSB7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC1leHByZXNzaW9uc1xuXG4gICAgLy8gVGhpcyBjbG9zdXJlIHN1cHBvcnRzIE5vZGVKUy1sZXNzIGNsaWVudCBzaWRlIGluY2x1ZGVzIHdpdGggPHNjcmlwdD4gdGFncy4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25laXQvbW5tLlxuXG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yIEZpbkJhclxuICAgICAqIEBzdW1tYXJ5IENyZWF0ZSBhIHNjcm9sbGJhciBvYmplY3QuXG4gICAgICogQGRlc2MgQ3JlYXRpbmcgYSBzY3JvbGxiYXIgaXMgYSB0aHJlZS1zdGVwIHByb2Nlc3M6XG4gICAgICpcbiAgICAgKiAxLiBJbnN0YW50aWF0ZSB0aGUgc2Nyb2xsYmFyIG9iamVjdCBieSBjYWxsaW5nIHRoaXMgY29uc3RydWN0b3IgZnVuY3Rpb24uIFVwb24gaW5zdGFudGlhdGlvbiwgdGhlIERPTSBlbGVtZW50IGZvciB0aGUgc2Nyb2xsYmFyICh3aXRoIGEgc2luZ2xlIGNoaWxkIGVsZW1lbnQgZm9yIHRoZSBzY3JvbGxiYXIgXCJ0aHVtYlwiKSBpcyBjcmVhdGVkIGJ1dCBpcyBub3QgaW5zZXJ0IGl0IGludG8gdGhlIERPTS5cbiAgICAgKiAyLiBBZnRlciBpbnN0YW50aWF0aW9uLCBpdCBpcyB0aGUgY2FsbGVyJ3MgcmVzcG9uc2liaWxpdHkgdG8gaW5zZXJ0IHRoZSBzY3JvbGxiYXIsIHtAbGluayBGaW5CYXIjYmFyfHRoaXMuYmFyfSwgaW50byB0aGUgRE9NLlxuICAgICAqIDMuIEFmdGVyIGluc2VydGlvbiwgdGhlIGNhbGxlciBtdXN0IGNhbGwge0BsaW5rIEZpbkJhciNyZXNpemV8cmVzaXplKCl9IGF0IGxlYXN0IG9uY2UgdG8gc2l6ZSBhbmQgcG9zaXRpb24gdGhlIHNjcm9sbGJhciBhbmQgaXRzIHRodW1iLiBBZnRlciB0aGF0LCBgcmVzaXplKClgIHNob3VsZCBhbHNvIGJlIGNhbGxlZCByZXBlYXRlZGx5IG9uIHJlc2l6ZSBldmVudHMgKGFzIHRoZSBjb250ZW50IGVsZW1lbnQgaXMgYmVpbmcgcmVzaXplZCkuXG4gICAgICpcbiAgICAgKiBTdWdnZXN0ZWQgY29uZmlndXJhdGlvbnM6XG4gICAgICogKiBfKipVbmJvdW5kKipfPGJyLz5cbiAgICAgKiBUaGUgc2Nyb2xsYmFyIHNlcnZlcyBtZXJlbHkgYXMgYSBzaW1wbGUgcmFuZ2UgKHNsaWRlcikgY29udHJvbC4gT21pdCBib3RoIGBvcHRpb25zLm9uY2hhbmdlYCBhbmQgYG9wdGlvbnMuY29udGVudGAuXG4gICAgICogKiBfKipCb3VuZCB0byB2aXJ0dWFsIGNvbnRlbnQgZWxlbWVudCoqXzxici8+XG4gICAgICogVmlydHVhbCBjb250ZW50IGlzIHByb2plY3RlZCBpbnRvIHRoZSBlbGVtZW50IHVzaW5nIGEgY3VzdG9tIGV2ZW50IGhhbmRsZXIgc3VwcGxpZWQgYnkgdGhlIHByb2dyYW1tZXIgaW4gYG9wdGlvbnMub25jaGFuZ2VgLiBBIHR5cGljYWwgdXNlIGNhc2Ugd291bGQgYmUgdG8gaGFuZGxlIHNjcm9sbGluZyBvZiB0aGUgdmlydHVhbCBjb250ZW50LiBPdGhlciB1c2UgY2FzZXMgaW5jbHVkZSBkYXRhIHRyYW5zZm9ybWF0aW9ucywgZ3JhcGhpY3MgdHJhbnNmb3JtYXRpb25zLCBfZXRjLl9cbiAgICAgKiAqIF8qKkJvdW5kIHRvIHJlYWwgY29udGVudCoqXzxici8+XG4gICAgICogU2V0IGBvcHRpb25zLmNvbnRlbnRgIHRvIHRoZSBcInJlYWxcIiBjb250ZW50IGVsZW1lbnQgYnV0IG9taXQgYG9wdGlvbnMub25jaGFuZ2VgLiBUaGlzIHdpbGwgY2F1c2UgdGhlIHNjcm9sbGJhciB0byB1c2UgdGhlIGJ1aWx0LWluIGV2ZW50IGhhbmRsZXIgKGB0aGlzLnNjcm9sbFJlYWxDb250ZW50YCkgd2hpY2ggaW1wbGVtZW50cyBzbW9vdGggc2Nyb2xsaW5nIG9mIHRoZSBjb250ZW50IGVsZW1lbnQgd2l0aGluIHRoZSBjb250YWluZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2ZpbmJhck9wdGlvbnN9IFtvcHRpb25zPXt9XSAtIE9wdGlvbnMgb2JqZWN0LiBTZWUgdGhlIHR5cGUgZGVmaW5pdGlvbiBmb3IgbWVtYmVyIGRldGFpbHMuXG4gICAgICovXG4gICAgZnVuY3Rpb24gRmluQmFyKG9wdGlvbnMpIHtcblxuICAgICAgICAvLyBtYWtlIGJvdW5kIHZlcnNpb25zIG9mIGFsbCB0aGUgbW91c2UgZXZlbnQgaGFuZGxlclxuICAgICAgICB2YXIgYm91bmQgPSB0aGlzLl9ib3VuZCA9IHt9O1xuICAgICAgICBmb3IgKGtleSBpbiBoYW5kbGVyc1RvQmVCb3VuZCkge1xuICAgICAgICAgICAgYm91bmRba2V5XSA9IGhhbmRsZXJzVG9CZUJvdW5kW2tleV0uYmluZCh0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmFtZSB0aHVtYlxuICAgICAgICAgKiBAc3VtbWFyeSBUaGUgZ2VuZXJhdGVkIHNjcm9sbGJhciB0aHVtYiBlbGVtZW50LlxuICAgICAgICAgKiBAZGVzYyBUaGUgdGh1bWIgZWxlbWVudCdzIHBhcmVudCBlbGVtZW50IGlzIGFsd2F5cyB0aGUge0BsaW5rIEZpbkJhciNiYXJ8YmFyfSBlbGVtZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGlzIHByb3BlcnR5IGlzIHR5cGljYWxseSByZWZlcmVuY2VkIGludGVybmFsbHkgb25seS4gVGhlIHNpemUgYW5kIHBvc2l0aW9uIG9mIHRoZSB0aHVtYiBlbGVtZW50IGlzIG1haW50YWluZWQgYnkgYF9jYWxjVGh1bWIoKWAuXG4gICAgICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHRodW1iID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRodW1iLmNsYXNzTGlzdC5hZGQoJ3RodW1iJyk7XG4gICAgICAgIHRodW1iLm9uY2xpY2sgPSBib3VuZC5zaG9ydFN0b3A7XG4gICAgICAgIHRodW1iLm9ubW91c2VvdmVyID0gYm91bmQub25tb3VzZW92ZXI7XG4gICAgICAgIHRoaXMudGh1bWIgPSB0aHVtYjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQG5hbWUgYmFyXG4gICAgICAgICAqIEBzdW1tYXJ5IFRoZSBnZW5lcmF0ZWQgc2Nyb2xsYmFyIGVsZW1lbnQuXG4gICAgICAgICAqIEBkZXNjIFRoZSBjYWxsZXIgaW5zZXJ0cyB0aGlzIGVsZW1lbnQgaW50byB0aGUgRE9NICh0eXBpY2FsbHkgaW50byB0aGUgY29udGVudCBjb250YWluZXIpIGFuZCB0aGVuIGNhbGxzIGl0cyB7QGxpbmsgRmluQmFyI3Jlc2l6ZXxyZXNpemUoKX0gbWV0aG9kLlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaHVzIHRoZSBub2RlIHRyZWUgaXMgdHlwaWNhbGx5OlxuICAgICAgICAgKiAqIEEgKipjb250ZW50IGNvbnRhaW5lcioqIGVsZW1lbnQsIHdoaWNoIGNvbnRhaW5zOlxuICAgICAgICAgKiAgICAqIFRoZSBjb250ZW50IGVsZW1lbnQocylcbiAgICAgICAgICogICAgKiBUaGlzICoqc2Nyb2xsYmFyIGVsZW1lbnQqKiwgd2hpY2ggaW4gdHVybiBjb250YWluczpcbiAgICAgICAgICogICAgICAgICogVGhlICoqdGh1bWIgZWxlbWVudCoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtFbGVtZW50fVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGJhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgIGJhci5jbGFzc0xpc3QuYWRkKCdmaW5iYXItdmVydGljYWwnKTtcblxuICAgICAgICBiYXIuYXBwZW5kQ2hpbGQodGh1bWIpO1xuICAgICAgICBpZiAodGhpcy5wYWdpbmcpIHtcbiAgICAgICAgICAgIGJhci5vbmNsaWNrID0gYm91bmQub25jbGljaztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJhciA9IGJhcjtcblxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICAvLyBwcmVzZXRzXG4gICAgICAgIHRoaXMub3JpZW50YXRpb24gPSAndmVydGljYWwnO1xuICAgICAgICB0aGlzLl9taW4gPSB0aGlzLl9pbmRleCA9IDA7XG4gICAgICAgIHRoaXMuX21heCA9IDEwMDtcblxuICAgICAgICAvLyBvcHRpb25zXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wdGlvbiA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Nzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50JzpcbiAgICAgICAgICAgICAgICAgICAgY3NzSW5qZWN0b3Iob3B0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdpbmRleCc6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2luZGV4ID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3JhbmdlJzpcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRSYW5nZShvcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9taW4gPSBvcHRpb24ubWluO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXggPSBvcHRpb24ubWF4O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRTaXplID0gb3B0aW9uLm1heCAtIG9wdGlvbi5taW4gKyAxO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleS5jaGFyQXQoMCkgIT09ICdfJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIEZpbkJhci5wcm90b3R5cGVba2V5XSAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG92ZXJyaWRlIHByb3RvdHlwZSBkZWZhdWx0cyBmb3Igc3RhbmRhcmQgO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXh0ZW5kIHdpdGggYWRkaXRpb25hbCBwcm9wZXJ0aWVzIChmb3IgdXNlIGluIG9uY2hhbmdlIGV2ZW50IGhhbmRsZXJzKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXldID0gb3B0aW9uO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIEZpbkJhci5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBzdW1tYXJ5IFRoZSBzY3JvbGxiYXIgb3JpZW50YXRpb24uXG4gICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgY29uc3RydWN0b3IgdG8gZWl0aGVyIGAndmVydGljYWwnYCBvciBgJ2hvcml6b250YWwnYC4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIFVzZWZ1bCB2YWx1ZXMgYXJlIGAndmVydGljYWwnYCAodGhlIGRlZmF1bHQpIG9yIGAnaG9yaXpvbnRhbCdgLlxuICAgICAgICAgKlxuICAgICAgICAgKiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgcmVzZXRzIGB0aGlzLm9oYCBhbmQgYHRoaXMuZGVsdGFQcm9wYCBhbmQgY2hhbmdlcyB0aGUgY2xhc3MgbmFtZXMgc28gYXMgdG8gcmVwb3NpdGlvbiB0aGUgc2Nyb2xsYmFyIGFzIHBlciB0aGUgQ1NTIHJ1bGVzIGZvciB0aGUgbmV3IG9yaWVudGF0aW9uLlxuICAgICAgICAgKiBAZGVmYXVsdCAndmVydGljYWwnXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICBzZXQgb3JpZW50YXRpb24ob3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgIGlmIChvcmllbnRhdGlvbiA9PT0gdGhpcy5fb3JpZW50YXRpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX29yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQHJlYWRvbmx5XG4gICAgICAgICAgICAgKiBAbmFtZSBvaFxuICAgICAgICAgICAgICogQHN1bW1hcnkgPHU+TzwvdT5yaWVudGF0aW9uIDx1Pmg8L3U+YXNoIGZvciB0aGlzIHNjcm9sbGJhci5cbiAgICAgICAgICAgICAqIEBkZXNjIFNldCBieSB0aGUgYG9yaWVudGF0aW9uYCBzZXR0ZXIgdG8gZWl0aGVyIHRoZSB2ZXJ0aWNhbCBvciB0aGUgaG9yaXpvbnRhbCBvcmllbnRhdGlvbiBoYXNoLiBUaGUgcHJvcGVydHkgc2hvdWxkIGFsd2F5cyBiZSBzeW5jaHJvbml6ZWQgd2l0aCBgb3JpZW50YXRpb25gOyBkbyBub3QgdXBkYXRlIGRpcmVjdGx5IVxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIFRoaXMgb2JqZWN0IGlzIHVzZWQgaW50ZXJuYWxseSB0byBhY2Nlc3Mgc2Nyb2xsYmFycycgRE9NIGVsZW1lbnQgcHJvcGVydGllcyBpbiBhIGdlbmVyYWxpemVkIHdheSB3aXRob3V0IG5lZWRpbmcgdG8gY29uc3RhbnRseSBxdWVyeSB0aGUgc2Nyb2xsYmFyIG9yaWVudGF0aW9uLiBGb3IgZXhhbXBsZSwgaW5zdGVhZCBvZiBleHBsaWNpdGx5IGNvZGluZyBgdGhpcy5iYXIudG9wYCBmb3IgYSB2ZXJ0aWNhbCBzY3JvbGxiYXIgYW5kIGB0aGlzLmJhci5sZWZ0YCBmb3IgYSBob3Jpem9udGFsIHNjcm9sbGJhciwgc2ltcGx5IGNvZGUgYHRoaXMuYmFyW3RoaXMub2gubGVhZGluZ11gIGluc3RlYWQuIFNlZSB0aGUge0BsaW5rIG9yaWVudGF0aW9uSGFzaFR5cGV9IGRlZmluaXRpb24gZm9yIGRldGFpbHMuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogVGhpcyBvYmplY3QgaXMgdXNlZnVsIGV4dGVybmFsbHkgZm9yIGNvZGluZyBnZW5lcmFsaXplZCB7QGxpbmsgZmluYmFyT25DaGFuZ2V9IGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25zIHRoYXQgc2VydmUgYm90aCBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBzY3JvbGxiYXJzLlxuICAgICAgICAgICAgICogQHR5cGUge29yaWVudGF0aW9uSGFzaFR5cGV9XG4gICAgICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLm9oID0gb3JpZW50YXRpb25IYXNoZXNbdGhpcy5fb3JpZW50YXRpb25dO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMub2gpIHtcbiAgICAgICAgICAgICAgICBlcnJvcignSW52YWxpZCB2YWx1ZSBmb3IgYG9wdGlvbnMuX29yaWVudGF0aW9uLicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEBuYW1lIGRlbHRhUHJvcFxuICAgICAgICAgICAgICogQHN1bW1hcnkgVGhlIG5hbWUgb2YgdGhlIGBXaGVlbEV2ZW50YCBwcm9wZXJ0eSB0aGlzIHNjcm9sbGJhciBzaG91bGQgbGlzdGVuIHRvLlxuICAgICAgICAgICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogVXNlZnVsIHZhbHVlcyBhcmUgYCdkZWx0YVgnYCwgYCdkZWx0YVknYCwgb3IgYCdkZWx0YVonYC4gQSB2YWx1ZSBvZiBgbnVsbGAgbWVhbnMgdG8gaWdub3JlIG1vdXNlIHdoZWVsIGV2ZW50cyBlbnRpcmVseS5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBUaGUgbW91c2Ugd2hlZWwgaXMgb25lLWRpbWVuc2lvbmFsIGFuZCBvbmx5IGVtaXRzIGV2ZW50cyB3aXRoIGBkZWx0YVlgIGRhdGEuIFRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQgc28gdGhhdCB5b3UgY2FuIG92ZXJyaWRlIHRoZSBkZWZhdWx0IG9mIGAnZGVsdGFYJ2Agd2l0aCBhIHZhbHVlIG9mIGAnZGVsdGFZJ2Agb24geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBwcmltYXJpbHkgdG8gYWNjb21tb2RhdGUgY2VydGFpbiBcInBhbm9yYW1pY1wiIGludGVyZmFjZSBkZXNpZ25zIHdoZXJlIHRoZSBtb3VzZSB3aGVlbCBzaG91bGQgY29udHJvbCBob3Jpem9udGFsIHJhdGhlciB0aGFuIHZlcnRpY2FsIHNjcm9sbGluZy4gSnVzdCBnaXZlIGB7IGRlbHRhUHJvcDogJ2RlbHRhWScgfWAgaW4geW91ciBob3Jpem9udGFsIHNjcm9sbGJhciBpbnN0YW50aWF0aW9uLlxuICAgICAgICAgICAgICpcbiAgICAgICAgICAgICAqIENhdmVhdDogTm90ZSB0aGF0IGEgMi1maW5nZXIgZHJhZyBvbiBhbiBBcHBsZSB0cmFja3BhZCBlbWl0cyBldmVudHMgd2l0aCBfYm90aF8gYGRlbHRhWCBgIGFuZCBgZGVsdGFZYCBkYXRhIHNvIHlvdSBtaWdodCB3YW50IHRvIGRlbGF5IG1ha2luZyB0aGUgYWJvdmUgYWRqdXN0bWVudCB1bnRpbCB5b3UgY2FuIGRldGVybWluZSB0aGF0IHlvdSBhcmUgZ2V0dGluZyBZIGRhdGEgb25seSB3aXRoIG5vIFggZGF0YSBhdCBhbGwgKHdoaWNoIGlzIGEgc3VyZSBiZXQgeW91IG9uIGEgbW91c2Ugd2hlZWwgcmF0aGVyIHRoYW4gYSB0cmFja3BhZCkuXG5cbiAgICAgICAgICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuZGVsdGFQcm9wID0gdGhpcy5vaC5kZWx0YTtcblxuICAgICAgICAgICAgdGhpcy5iYXIuY2xhc3NOYW1lID0gdGhpcy5iYXIuY2xhc3NOYW1lLnJlcGxhY2UoLyh2ZXJ0aWNhbHxob3Jpem9udGFsKS9nLCBvcmllbnRhdGlvbik7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmJhci5zdHlsZS5jc3NUZXh0IHx8IHRoaXMudGh1bWIuc3R5bGUuY3NzVGV4dCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYmFyLnJlbW92ZUF0dHJpYnV0ZSgnc3R5bGUnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRodW1iLnJlbW92ZUF0dHJpYnV0ZSgnc3R5bGUnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlc2l6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXQgb3JpZW50YXRpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fb3JpZW50YXRpb247XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBzdW1tYXJ5IENhbGxiYWNrIGZvciBzY3JvbGwgZXZlbnRzLlxuICAgICAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yIHZpYSB0aGUgc2ltaWxhcmx5IG5hbWVkIHByb3BlcnR5IGluIHRoZSB7QGxpbmsgZmluYmFyT3B0aW9uc30gb2JqZWN0LiBBZnRlciBpbnN0YW50aWF0aW9uLCBgdGhpcy5vbmNoYW5nZWAgbWF5IGJlIHVwZGF0ZWQgZGlyZWN0bHkuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgZXZlbnQgaGFuZGxlciBpcyBjYWxsZWQgd2hlbmV2ZXIgdGhlIHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgaXMgY2hhbmdlZCB0aHJvdWdoIHVzZXIgaW50ZXJhY3Rpb24uIFRoZSB0eXBpY2FsIHVzZSBjYXNlIGlzIHdoZW4gdGhlIGNvbnRlbnQgaXMgc2Nyb2xsZWQuIEl0IGlzIGNhbGxlZCB3aXRoIHRoZSBgRmluQmFyYCBvYmplY3QgYXMgaXRzIGNvbnRleHQgYW5kIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIgKGl0cyBpbmRleCwgcm91bmRlZCkgYXMgdGhlIG9ubHkgcGFyYW1ldGVyLlxuICAgICAgICAgKlxuICAgICAgICAgKiBTZXQgdGhpcyBwcm9wZXJ0eSB0byBgbnVsbGAgdG8gc3RvcCBlbWl0dGluZyBzdWNoIGV2ZW50cy5cbiAgICAgICAgICogQHR5cGUge2Z1bmN0aW9uKG51bWJlcil8bnVsbH1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIG9uY2hhbmdlOiBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAc3VtbWFyeSBBZGQgYSBDU1MgY2xhc3MgbmFtZSB0byB0aGUgYmFyIGVsZW1lbnQncyBjbGFzcyBsaXN0LlxuICAgICAgICAgKiBAZGVzYyBTZXQgYnkgdGhlIGNvbnN0cnVjdG9yLiBTZWUgdGhlIHNpbWlsYXJseSBuYW1lZCBwcm9wZXJ0eSBpbiB0aGUge0BsaW5rIGZpbmJhck9wdGlvbnN9IG9iamVjdC5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdCB3aWxsIGFsd2F5cyBpbmNsdWRlIGBmaW5iYXItdmVydGljYWxgIChvciBgZmluYmFyLWhvcml6b250YWxgIGJhc2VkIG9uIHRoZSBjdXJyZW50IG9yaWVudGF0aW9uKS4gV2hlbmV2ZXIgdGhpcyBwcm9wZXJ0eSBpcyBzZXQgdG8gc29tZSB2YWx1ZSwgZmlyc3QgdGhlIG9sZCBwcmVmaXgrb3JpZW50YXRpb24gaXMgcmVtb3ZlZCBmcm9tIHRoZSBiYXIgZWxlbWVudCdzIGNsYXNzIGxpc3Q7IHRoZW4gdGhlIG5ldyBwcmVmaXgrb3JpZW50YXRpb24gaXMgYWRkZWQgdG8gdGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdC4gVGhpcyBwcm9wZXJ0eSBjYXVzZXMgX2FuIGFkZGl0aW9uYWxfIGNsYXNzIG5hbWUgdG8gYmUgYWRkZWQgdG8gdGhlIGJhciBlbGVtZW50J3MgY2xhc3MgbGlzdC4gVGhlcmVmb3JlLCB0aGlzIHByb3BlcnR5IHdpbGwgb25seSBhZGQgYXQgbW9zdCBvbmUgYWRkaXRpb25hbCBjbGFzcyBuYW1lIHRvIHRoZSBsaXN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBUbyByZW1vdmUgX2NsYXNzbmFtZS1vcmllbnRhdGlvbl8gZnJvbSB0aGUgYmFyIGVsZW1lbnQncyBjbGFzcyBsaXN0LCBzZXQgdGhpcyBwcm9wZXJ0eSB0byBhIGZhbHN5IHZhbHVlLCBzdWNoIGFzIGBudWxsYC5cbiAgICAgICAgICpcbiAgICAgICAgICogPiBOT1RFOiBZb3Ugb25seSBuZWVkIHRvIHNwZWNpZnkgYW4gYWRkaXRpb25hbCBjbGFzcyBuYW1lIHdoZW4geW91IG5lZWQgdG8gaGF2ZSBtdWxsdGlwbGUgZGlmZmVyZW50IHN0eWxlcyBvZiBzY3JvbGxiYXJzIG9uIHRoZSBzYW1lIHBhZ2UuIElmIHRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQsIHRoZW4geW91IGRvbid0IG5lZWQgdG8gbWFrZSBhIG5ldyBjbGFzczsgeW91IHdvdWxkIGp1c3QgY3JlYXRlIHNvbWUgYWRkaXRpb25hbCBydWxlcyB1c2luZyB0aGUgc2FtZSBzZWxlY3RvcnMgaW4gdGhlIGJ1aWx0LWluIHN0eWxlc2hlZXQgKC4uL2Nzcy9maW5iYXJzLmNzcyk6XG4gICAgICAgICAqICpgZGl2LmZpbmJhci12ZXJ0aWNhbGAgKG9yIGBkaXYuZmluYmFyLWhvcml6b250YWxgKSBmb3IgdGhlIHNjcm9sbGJhclxuICAgICAgICAgKiAqYGRpdi5maW5iYXItdmVydGljYWwgPiBkaXZgIChvciBgZGl2LmZpbmJhci1ob3Jpem9udGFsID4gZGl2YCkgZm9yIHRoZSBcInRodW1iLlwiXG4gICAgICAgICAqXG4gICAgICAgICAqIE9mIGNvdXJzZSwgeW91ciBydWxlcyBzaG91bGQgY29tZSBhZnRlciB0aGUgYnVpbHQtaW5zLlxuICAgICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgc2V0IGNsYXNzUHJlZml4KHByZWZpeCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2NsYXNzUHJlZml4KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5iYXIuY2xhc3NMaXN0LnJlbW92ZSh0aGlzLl9jbGFzc1ByZWZpeCArIHRoaXMub3JpZW50YXRpb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9jbGFzc1ByZWZpeCA9IHByZWZpeDtcblxuICAgICAgICAgICAgaWYgKHByZWZpeCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYmFyLmNsYXNzTGlzdC5hZGQocHJlZml4ICsgJy0nICsgdGhpcy5vcmllbnRhdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldCBjbGFzc1ByZWZpeCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jbGFzc1ByZWZpeDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQG5hbWUgaW5jcmVtZW50XG4gICAgICAgICAqIEBzdW1tYXJ5IE51bWJlciBvZiBzY3JvbGxiYXIgaW5kZXggdW5pdHMgcmVwcmVzZW50aW5nIGEgcGFnZWZ1bC4gVXNlZCBleGNsdXNpdmVseSBmb3IgcGFnaW5nIHVwIGFuZCBkb3duIGFuZCBmb3Igc2V0dGluZyB0aHVtYiBzaXplIHJlbGF0aXZlIHRvIGNvbnRlbnQgc2l6ZS5cbiAgICAgICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIENhbiBhbHNvIGJlIGdpdmVuIGFzIGEgcGFyYW1ldGVyIHRvIHRoZSB7QGxpbmsgRmluQmFyI3Jlc2l6ZXxyZXNpemV9IG1ldGhvZCwgd2hpY2ggaXMgcGVydGluZW50IGJlY2F1c2UgY29udGVudCBhcmVhIHNpemUgY2hhbmdlcyBhZmZlY3QgdGhlIGRlZmluaXRpb24gb2YgYSBcInBhZ2VmdWwuXCIgSG93ZXZlciwgeW91IG9ubHkgbmVlZCB0byBkbyB0aGlzIGlmIHRoaXMgdmFsdWUgaXMgYmVpbmcgdXNlZC4gSXQgbm90IHVzZWQgd2hlbjpcbiAgICAgICAgICogKiB5b3UgZGVmaW5lIGBwYWdpbmcudXBgIGFuZCBgcGFnaW5nLmRvd25gXG4gICAgICAgICAqICogeW91ciBzY3JvbGxiYXIgaXMgdXNpbmcgYHNjcm9sbFJlYWxDb250ZW50YFxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgaW5jcmVtZW50OiAxLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAbmFtZSBiYXJTdHlsZXNcbiAgICAgICAgICogQHN1bW1hcnkgU2Nyb2xsYmFyIHN0eWxlcyB0byBiZSBhcHBsaWVkIGJ5IHtAbGluayBGaW5CYXIjcmVzaXplfHJlc2l6ZSgpfS5cbiAgICAgICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgaXMgYSB2YWx1ZSB0byBiZSBhc3NpZ25lZCB0byB7QGxpbmsgRmluQmFyI3N0eWxlc3xzdHlsZXN9IG9uIGVhY2ggY2FsbCB0byB7QGxpbmsgRmluQmFyI3Jlc2l6ZXxyZXNpemUoKX0uIFRoYXQgaXMsIGEgaGFzaCBvZiB2YWx1ZXMgdG8gYmUgY29waWVkIHRvIHRoZSBzY3JvbGxiYXIgZWxlbWVudCdzIHN0eWxlIG9iamVjdCBvbiByZXNpemU7IG9yIGBudWxsYCBmb3Igbm9uZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHNlZSB7QGxpbmsgRmluQmFyI3N0eWxlfHN0eWxlfVxuICAgICAgICAgKiBAdHlwZSB7ZmluYmFyU3R5bGVzfG51bGx9XG4gICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICBiYXJTdHlsZXM6IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuYW1lIHN0eWxlXG4gICAgICAgICAqIEBzdW1tYXJ5IEFkZGl0aW9uYWwgc2Nyb2xsYmFyIHN0eWxlcy5cbiAgICAgICAgICogQGRlc2MgU2VlIHR5cGUgZGVmaW5pdGlvbiBmb3IgbW9yZSBkZXRhaWxzLiBUaGVzZSBzdHlsZXMgYXJlIGFwcGxpZWQgZGlyZWN0bHkgdG8gdGhlIHNjcm9sbGJhcidzIGBiYXJgIGVsZW1lbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIFZhbHVlcyBhcmUgYWRqdXN0ZWQgYXMgZm9sbG93cyBiZWZvcmUgYmVpbmcgYXBwbGllZCB0byB0aGUgZWxlbWVudDpcbiAgICAgICAgICogMS4gSW5jbHVkZWQgXCJwc2V1ZG8tcHJvcGVydHlcIiBuYW1lcyBmcm9tIHRoZSBzY3JvbGxiYXIncyBvcmllbnRhdGlvbiBoYXNoLCB7QGxpbmsgRmluQmFyI29ofG9ofSwgYXJlIHRyYW5zbGF0ZWQgdG8gYWN0dWFsIHByb3BlcnR5IG5hbWVzIGJlZm9yZSBiZWluZyBhcHBsaWVkLlxuICAgICAgICAgKiAyLiBXaGVuIHRoZXJlIGFyZSBtYXJnaW5zLCBwZXJjZW50YWdlcyBhcmUgdHJhbnNsYXRlZCB0byBhYnNvbHV0ZSBwaXhlbCB2YWx1ZXMgYmVjYXVzZSBDU1MgaWdub3JlcyBtYXJnaW5zIGluIGl0cyBwZXJjZW50YWdlIGNhbGN1bGF0aW9ucy5cbiAgICAgICAgICogMy4gSWYgeW91IGdpdmUgYSB2YWx1ZSB3aXRob3V0IGEgdW5pdCAoYSByYXcgbnVtYmVyKSwgXCJweFwiIHVuaXQgaXMgYXBwZW5kZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEdlbmVyYWwgbm90ZXM6XG4gICAgICAgICAqIDEuIEl0IGlzIGFsd2F5cyBwcmVmZXJhYmxlIHRvIHNwZWNpZnkgc3R5bGVzIHZpYSBhIHN0eWxlc2hlZXQuIE9ubHkgc2V0IHRoaXMgcHJvcGVydHkgd2hlbiB5b3UgbmVlZCB0byBzcGVjaWZpY2FsbHkgb3ZlcnJpZGUgKGEpIHN0eWxlc2hlZXQgdmFsdWUocykuXG4gICAgICAgICAqIDIuIENhbiBiZSBzZXQgZGlyZWN0bHkgb3IgdmlhIGNhbGxzIHRvIHRoZSB7QGxpbmsgRmluQmFyI3Jlc2l6ZXxyZXNpemV9IG1ldGhvZC5cbiAgICAgICAgICogMy4gU2hvdWxkIG9ubHkgYmUgc2V0IGFmdGVyIHRoZSBzY3JvbGxiYXIgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgRE9NLlxuICAgICAgICAgKiA0LiBCZWZvcmUgYXBwbHlpbmcgdGhlc2UgbmV3IHZhbHVlcyB0byB0aGUgZWxlbWVudCwgX2FsbF8gaW4tbGluZSBzdHlsZSB2YWx1ZXMgYXJlIHJlc2V0IChieSByZW1vdmluZyB0aGUgZWxlbWVudCdzIGBzdHlsZWAgYXR0cmlidXRlKSwgZXhwb3NpbmcgaW5oZXJpdGVkIHZhbHVlcyAoZnJvbSBzdHlsZXNoZWV0cykuXG4gICAgICAgICAqIDUuIEVtcHR5IG9iamVjdCBoYXMgbm8gZWZmZWN0LlxuICAgICAgICAgKiA2LiBGYWxzZXkgdmFsdWUgaW4gcGxhY2Ugb2Ygb2JqZWN0IGhhcyBubyBlZmZlY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqID4gQ0FWRUFUOiBEbyBub3QgYXR0ZW1wdCB0byB0cmVhdCB0aGUgb2JqZWN0IHlvdSBhc3NpZ24gdG8gdGhpcyBwcm9wZXJ0eSBhcyBpZiBpdCB3ZXJlIGB0aGlzLmJhci5zdHlsZWAuIFNwZWNpZmljYWxseSwgY2hhbmdpbmcgdGhpcyBvYmplY3QgYWZ0ZXIgYXNzaWduaW5nIGl0IHdpbGwgaGF2ZSBubyBlZmZlY3Qgb24gdGhlIHNjcm9sbGJhci4gWW91IG11c3QgYXNzaWduIGl0IGFnYWluIGlmIHlvdSB3YW50IGl0IHRvIGhhdmUgYW4gZWZmZWN0LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjYmFyU3R5bGVzfGJhclN0eWxlc31cbiAgICAgICAgICogQHR5cGUge2ZpbmJhclN0eWxlc31cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHNldCBzdHlsZShzdHlsZXMpIHtcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc3R5bGVzID0gZXh0ZW5kKHt9LCBzdHlsZXMsIHRoaXMuX2F1eFN0eWxlcykpO1xuXG4gICAgICAgICAgICBpZiAoa2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYmFyID0gdGhpcy5iYXIsXG4gICAgICAgICAgICAgICAgICAgIGJhclJlY3QgPSBiYXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyIHx8IGJhci5wYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXJSZWN0ID0gY29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICAgICAgICAgICAgICBvaCA9IHRoaXMub2g7XG5cbiAgICAgICAgICAgICAgICAvLyBCZWZvcmUgYXBwbHlpbmcgbmV3IHN0eWxlcywgcmV2ZXJ0IGFsbCBzdHlsZXMgdG8gdmFsdWVzIGluaGVyaXRlZCBmcm9tIHN0eWxlc2hlZXRzXG4gICAgICAgICAgICAgICAgYmFyLnJlbW92ZUF0dHJpYnV0ZSgnc3R5bGUnKTtcblxuICAgICAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBzdHlsZXNba2V5XTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5IGluIG9oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBvaFtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc05hTihOdW1iZXIodmFsKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9ICh2YWwgfHwgMCkgKyAncHgnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKC8lJC8udGVzdCh2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIGJhciBzaXplIGdpdmVuIGFzIHBlcmNlbnRhZ2Ugb2YgY29udGFpbmVyLCBpZiBiYXIgaGFzIG1hcmdpbnMsIHJlc3RhdGUgc2l6ZSBpbiBwaXhlbHMgbGVzcyBtYXJnaW5zLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gKElmIGxlZnQgYXMgcGVyY2VudGFnZSwgQ1NTJ3MgY2FsY3VsYXRpb24gd2lsbCBub3QgZXhjbHVkZSBtYXJnaW5zLilcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvcmllbnRlZCA9IGF4aXNba2V5XSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5zID0gYmFyUmVjdFtvcmllbnRlZC5tYXJnaW5MZWFkaW5nXSArIGJhclJlY3Rbb3JpZW50ZWQubWFyZ2luVHJhaWxpbmddO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hcmdpbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBwYXJzZUludCh2YWwsIDEwKSAvIDEwMCAqIGNvbnRhaW5lclJlY3Rbb3JpZW50ZWQuc2l6ZV0gLSBtYXJnaW5zICsgJ3B4JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGJhci5zdHlsZVtrZXldID0gdmFsO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmVhZG9ubHlcbiAgICAgICAgICogQG5hbWUgcGFnaW5nXG4gICAgICAgICAqIEBzdW1tYXJ5IEVuYWJsZSBwYWdlIHVwL2RuIGNsaWNrcy5cbiAgICAgICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gU2VlIHRoZSBzaW1pbGFybHkgbmFtZWQgcHJvcGVydHkgaW4gdGhlIHtAbGluayBmaW5iYXJPcHRpb25zfSBvYmplY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHRydXRoeSwgbGlzdGVuIGZvciBjbGlja3MgaW4gcGFnZS11cCBhbmQgcGFnZS1kb3duIHJlZ2lvbnMgb2Ygc2Nyb2xsYmFyLlxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiBhbiBvYmplY3QsIGNhbGwgYC5wYWdpbmcudXAoKWAgb24gcGFnZS11cCBjbGlja3MgYW5kIGAucGFnaW5nLmRvd24oKWAgd2lsbCBiZSBjYWxsZWQgb24gcGFnZS1kb3duIGNsaWNrcy5cbiAgICAgICAgICpcbiAgICAgICAgICogQ2hhbmdpbmcgdGhlIHRydXRoaW5lc3Mgb2YgdGhpcyB2YWx1ZSBhZnRlciBpbnN0YW50aWF0aW9uIGN1cnJlbnRseSBoYXMgbm8gZWZmZWN0LlxuICAgICAgICAgKiBAdHlwZSB7Ym9vbGVhbnxvYmplY3R9XG4gICAgICAgICAqIEBtZW1iZXJPZiBGaW5CYXIucHJvdG90eXBlXG4gICAgICAgICAqL1xuICAgICAgICBwYWdpbmc6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBuYW1lIHJhbmdlXG4gICAgICAgICAqIEBzdW1tYXJ5IFNldHRlciBmb3IgdGhlIG1pbmltdW0gYW5kIG1heGltdW0gc2Nyb2xsIHZhbHVlcy5cbiAgICAgICAgICogQGRlc2MgU2V0IGJ5IHRoZSBjb25zdHJ1Y3Rvci4gVGhlc2UgdmFsdWVzIGFyZSB0aGUgbGltaXRzIGZvciB7QGxpbmsgRm9vQmFyI2luZGV4fGluZGV4fS5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhlIHNldHRlciBhY2NlcHRzIGFuIG9iamVjdCB3aXRoIGV4YWN0bHkgdHdvIG51bWVyaWMgcHJvcGVydGllczogYC5taW5gIHdoaWNoIG11c3QgYmUgbGVzcyB0aGFuIGAubWF4YC4gVGhlIHZhbHVlcyBhcmUgZXh0cmFjdGVkIGFuZCB0aGUgb2JqZWN0IGlzIGRpc2NhcmRlZC5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhlIGdldHRlciByZXR1cm5zIGEgbmV3IG9iamVjdCB3aXRoIGAubWluYCBhbmQgJy5tYXhgLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7cmFuZ2VUeXBlfVxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgc2V0IHJhbmdlKHJhbmdlKSB7XG4gICAgICAgICAgICB2YWxpZFJhbmdlKHJhbmdlKTtcbiAgICAgICAgICAgIHRoaXMuX21pbiA9IHJhbmdlLm1pbjtcbiAgICAgICAgICAgIHRoaXMuX21heCA9IHJhbmdlLm1heDtcbiAgICAgICAgICAgIHRoaXMuY29udGVudFNpemUgPSByYW5nZS5tYXggLSByYW5nZS5taW4gKyAxO1xuICAgICAgICAgICAgdGhpcy5pbmRleCA9IHRoaXMuaW5kZXg7IC8vIHJlLWNsYW1wXG4gICAgICAgIH0sXG4gICAgICAgIGdldCByYW5nZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbWluOiB0aGlzLl9taW4sXG4gICAgICAgICAgICAgICAgbWF4OiB0aGlzLl9tYXhcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBzdW1tYXJ5IEluZGV4IHZhbHVlIG9mIHRoZSBzY3JvbGxiYXIuXG4gICAgICAgICAqIEBkZXNjIFRoaXMgaXMgdGhlIHBvc2l0aW9uIG9mIHRoZSBzY3JvbGwgdGh1bWIuXG4gICAgICAgICAqXG4gICAgICAgICAqIFNldHRpbmcgdGhpcyB2YWx1ZSBjbGFtcHMgaXQgdG8ge0BsaW5rIEZpbkJhciNtaW58bWlufS4ue0BsaW5rIEZpbkJhciNtYXh8bWF4fSwgc2Nyb2xsIHRoZSBjb250ZW50LCBhbmQgbW92ZXMgdGh1bWIuXG4gICAgICAgICAqXG4gICAgICAgICAqIEdldHRpbmcgdGhpcyB2YWx1ZSByZXR1cm5zIHRoZSBjdXJyZW50IGluZGV4LiBUaGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBiZSBpbiB0aGUgcmFuZ2UgYG1pbmAuLmBtYXhgLiBJdCBpcyBpbnRlbnRpb25hbGx5IG5vdCByb3VuZGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBVc2UgdGhpcyB2YWx1ZSBhcyBhbiBhbHRlcm5hdGl2ZSB0byAob3IgaW4gYWRkaXRpb24gdG8pIHVzaW5nIHRoZSB7QGxpbmsgRmluQmFyI29uY2hhbmdlfG9uY2hhbmdlfSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHNlZSB7QGxpbmsgRmluQmFyI19zZXRTY3JvbGx8X3NldFNjcm9sbH1cbiAgICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIHNldCBpbmRleChpZHgpIHtcbiAgICAgICAgICAgIGlkeCA9IE1hdGgubWluKHRoaXMuX21heCwgTWF0aC5tYXgodGhpcy5fbWluLCBpZHgpKTsgLy8gY2xhbXAgaXRcbiAgICAgICAgICAgIHRoaXMuX3NldFNjcm9sbChpZHgpO1xuICAgICAgICAgICAgLy8gdGhpcy5fc2V0VGh1bWJTaXplKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldCBpbmRleCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbmRleDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQHN1bW1hcnkgTW92ZSB0aGUgdGh1bWIuXG4gICAgICAgICAqIEBkZXNjIEFsc28gZGlzcGxheXMgdGhlIGluZGV4IHZhbHVlIGluIHRoZSB0ZXN0IHBhbmVsIGFuZCBpbnZva2VzIHRoZSBjYWxsYmFjay5cbiAgICAgICAgICogQHBhcmFtIGlkeCAtIFRoZSBuZXcgc2Nyb2xsIGluZGV4LCBhIHZhbHVlIGluIHRoZSByYW5nZSBgbWluYC4uYG1heGAuXG4gICAgICAgICAqIEBwYXJhbSBbc2NhbGVkPWYoaWR4KV0gLSBUaGUgbmV3IHRodW1iIHBvc2l0aW9uIGluIHBpeGVscyBhbmQgc2NhbGVkIHJlbGF0aXZlIHRvIHRoZSBjb250YWluaW5nIHtAbGluayBGaW5CYXIjYmFyfGJhcn0gZWxlbWVudCwgaS5lLiwgYSBwcm9wb3J0aW9uYWwgbnVtYmVyIGluIHRoZSByYW5nZSBgMGAuLmB0aHVtYk1heGAuIFdoZW4gb21pdHRlZCwgYSBmdW5jdGlvbiBvZiBgaWR4YCBpcyB1c2VkLlxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgX3NldFNjcm9sbDogZnVuY3Rpb24gKGlkeCwgc2NhbGVkKSB7XG4gICAgICAgICAgICB0aGlzLl9pbmRleCA9IGlkeDtcblxuICAgICAgICAgICAgLy8gRGlzcGxheSB0aGUgaW5kZXggdmFsdWUgaW4gdGhlIHRlc3QgcGFuZWxcbiAgICAgICAgICAgIGlmICh0aGlzLnRlc3RQYW5lbEl0ZW0gJiYgdGhpcy50ZXN0UGFuZWxJdGVtLmluZGV4IGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudGVzdFBhbmVsSXRlbS5pbmRleC5pbm5lckhUTUwgPSBNYXRoLnJvdW5kKGlkeCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAodGhpcy5vbmNoYW5nZSkge1xuICAgICAgICAgICAgICAgIHRoaXMub25jaGFuZ2UuY2FsbCh0aGlzLCBNYXRoLnJvdW5kKGlkeCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb3ZlIHRoZSB0aHVtYlxuICAgICAgICAgICAgaWYgKHNjYWxlZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc2NhbGVkID0gKGlkeCAtIHRoaXMuX21pbikgLyAodGhpcy5fbWF4IC0gdGhpcy5fbWluKSAqIHRoaXMuX3RodW1iTWF4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy50aHVtYi5zdHlsZVt0aGlzLm9oLmxlYWRpbmddID0gc2NhbGVkICsgJ3B4JztcbiAgICAgICAgfSxcblxuICAgICAgICBzY3JvbGxSZWFsQ29udGVudDogZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lclJlY3QgPSB0aGlzLmNvbnRlbnQucGFyZW50RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgICAgICBzaXplUHJvcCA9IHRoaXMub2guc2l6ZSxcbiAgICAgICAgICAgICAgICBtYXhTY3JvbGwgPSBNYXRoLm1heCgwLCB0aGlzLmNvbnRlbnRbc2l6ZVByb3BdIC0gY29udGFpbmVyUmVjdFtzaXplUHJvcF0pLFxuICAgICAgICAgICAgICAgIC8vc2Nyb2xsID0gTWF0aC5taW4oaWR4LCBtYXhTY3JvbGwpO1xuICAgICAgICAgICAgICAgIHNjcm9sbCA9IChpZHggLSB0aGlzLl9taW4pIC8gKHRoaXMuX21heCAtIHRoaXMuX21pbikgKiBtYXhTY3JvbGw7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzY3JvbGw6ICcgKyBzY3JvbGwpO1xuICAgICAgICAgICAgdGhpcy5jb250ZW50LnN0eWxlW3RoaXMub2gubGVhZGluZ10gPSAtc2Nyb2xsICsgJ3B4JztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHN1bW1hcnkgUmVjYWxjdWxhdGUgdGh1bWIgcG9zaXRpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBkZXNjIFRoaXMgbWV0aG9kIHJlY2FsY3VsYXRlcyB0aGUgdGh1bWIgc2l6ZSBhbmQgcG9zaXRpb24uIENhbGwgaXQgb25jZSBhZnRlciBpbnNlcnRpbmcgeW91ciBzY3JvbGxiYXIgaW50byB0aGUgRE9NLCBhbmQgcmVwZWF0ZWRseSB3aGlsZSByZXNpemluZyB0aGUgc2Nyb2xsYmFyICh3aGljaCB0eXBpY2FsbHkgaGFwcGVucyB3aGVuIHRoZSBzY3JvbGxiYXIncyBwYXJlbnQgaXMgcmVzaXplZCBieSB1c2VyLlxuICAgICAgICAgKlxuICAgICAgICAgKiA+IFRoaXMgZnVuY3Rpb24gc2hpZnRzIGFyZ3MgaWYgZmlyc3QgYXJnIG9taXR0ZWQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbaW5jcmVtZW50PXRoaXMuaW5jcmVtZW50XSAtIFJlc2V0cyB7QGxpbmsgRm9vQmFyI2luY3JlbWVudHxpbmNyZW1lbnR9IChzZWUpLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge2ZpbmJhclN0eWxlc30gW2JhclN0eWxlcz10aGlzLmJhclN0eWxlc10gLSAoU2VlIHR5cGUgZGVmaW5pdGlvbiBmb3IgZGV0YWlscy4pIFNjcm9sbGJhciBzdHlsZXMgdG8gYmUgYXBwbGllZCB0byB0aGUgYmFyIGVsZW1lbnQuXG4gICAgICAgICAqXG4gICAgICAgICAqIE9ubHkgc3BlY2lmeSBhIGBiYXJTdHlsZXNgIG9iamVjdCB3aGVuIHlvdSBuZWVkIHRvIG92ZXJyaWRlIHN0eWxlc2hlZXQgdmFsdWVzLiBJZiBwcm92aWRlZCwgYmVjb21lcyB0aGUgbmV3IGRlZmF1bHQgKGB0aGlzLmJhclN0eWxlc2ApLCBmb3IgdXNlIGFzIGEgZGVmYXVsdCBvbiBzdWJzZXF1ZW50IGNhbGxzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBJdCBpcyBnZW5lcmFsbHkgdGhlIGNhc2UgdGhhdCB0aGUgc2Nyb2xsYmFyJ3MgbmV3IHBvc2l0aW9uIGlzIHN1ZmZpY2llbnRseSBkZXNjcmliZWQgYnkgdGhlIGN1cnJlbnQgc3R5bGVzLiBUaGVyZWZvcmUsIGl0IGlzIHVudXN1YWwgdG8gbmVlZCB0byBwcm92aWRlIGEgYGJhclN0eWxlc2Agb2JqZWN0IG9uIGV2ZXJ5IGNhbGwgdG8gYHJlc2l6ZWAuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm5zIHtGaW5CYXJ9IFNlbGYgZm9yIGNoYWluaW5nLlxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgcmVzaXplOiBmdW5jdGlvbiAoaW5jcmVtZW50LCBiYXJTdHlsZXMpIHtcbiAgICAgICAgICAgIHZhciBiYXIgPSB0aGlzLmJhcjtcblxuICAgICAgICAgICAgaWYgKCFiYXIucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gbm90IGluIERPTSB5ZXQgc28gbm90aGluZyB0byBkb1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5jb250YWluZXIgfHwgYmFyLnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY29udGFpbmVyUmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICAgICAgLy8gc2hpZnQgYXJncyBpZiBpZiAxc3QgYXJnIG9taXR0ZWRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaW5jcmVtZW50ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGJhclN0eWxlcyA9IGluY3JlbWVudDtcbiAgICAgICAgICAgICAgICBpbmNyZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuc3R5bGUgPSB0aGlzLmJhclN0eWxlcyA9IGJhclN0eWxlcyB8fCB0aGlzLmJhclN0eWxlcztcblxuICAgICAgICAgICAgLy8gQm91bmQgdG8gcmVhbCBjb250ZW50OiBDb250ZW50IHdhcyBnaXZlbiBidXQgbm8gb25jaGFuZ2UgaGFuZGxlci5cbiAgICAgICAgICAgIC8vIFNldCB1cCAub25jaGFuZ2UsIC5jb250YWluZXJTaXplLCBhbmQgLmluY3JlbWVudC5cbiAgICAgICAgICAgIC8vIE5vdGUgdGhpcyBvbmx5IG1ha2VzIHNlbnNlIGlmIHlvdXIgaW5kZXggdW5pdCBpcyBwaXhlbHMuXG4gICAgICAgICAgICBpZiAodGhpcy5jb250ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm9uY2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25jaGFuZ2UgPSB0aGlzLnNjcm9sbFJlYWxDb250ZW50O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRTaXplID0gdGhpcy5jb250ZW50W3RoaXMub2guc2l6ZV07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21pbiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21heCA9IHRoaXMuY29udGVudFNpemUgLSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLm9uY2hhbmdlID09PSB0aGlzLnNjcm9sbFJlYWxDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250YWluZXJTaXplID0gY29udGFpbmVyUmVjdFt0aGlzLm9oLnNpemVdO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5jcmVtZW50ID0gdGhpcy5jb250YWluZXJTaXplIC8gKHRoaXMuY29udGVudFNpemUgLSB0aGlzLmNvbnRhaW5lclNpemUpICogKHRoaXMuX21heCAtIHRoaXMuX21pbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGFpbmVyU2l6ZSA9IDE7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmNyZW1lbnQgPSBpbmNyZW1lbnQgfHwgdGhpcy5pbmNyZW1lbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpbmRleCA9IHRoaXMuaW5kZXg7XG4gICAgICAgICAgICB0aGlzLnRlc3RQYW5lbEl0ZW0gPSB0aGlzLnRlc3RQYW5lbEl0ZW0gfHwgdGhpcy5fYWRkVGVzdFBhbmVsSXRlbSgpO1xuICAgICAgICAgICAgdGhpcy5fc2V0VGh1bWJTaXplKCk7XG4gICAgICAgICAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmRlbHRhUHJvcCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCd3aGVlbCcsIHRoaXMuX2JvdW5kLm9ud2hlZWwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHN1bW1hcnkgU2hvcnRlbiB0cmFpbGluZyBlbmQgb2Ygc2Nyb2xsYmFyIGJ5IHRoaWNrbmVzcyBvZiBzb21lIG90aGVyIHNjcm9sbGJhci5cbiAgICAgICAgICogQGRlc2MgSW4gdGhlIFwiY2xhc3NpY2FsXCIgc2NlbmFyaW8gd2hlcmUgdmVydGljYWwgc2Nyb2xsIGJhciBpcyBvbiB0aGUgcmlnaHQgYW5kIGhvcml6b250YWwgc2Nyb2xsYmFyIGlzIG9uIHRoZSBib3R0b20sIHlvdSB3YW50IHRvIHNob3J0ZW4gdGhlIFwidHJhaWxpbmcgZW5kXCIgKGJvdHRvbSBhbmQgcmlnaHQgZW5kcywgcmVzcGVjdGl2ZWx5KSBvZiBhdCBsZWFzdCBvbmUgb2YgdGhlbSBzbyB0aGV5IGRvbid0IG92ZXJsYXkuXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgY29udmVuaWVuY2UgZnVuY3Rpb24gaXMgYW4gcHJvZ3JhbW1hdGljIGFsdGVybmF0aXZlIHRvIGhhcmRjb2RpbmcgdGhlIGNvcnJlY3Qgc3R5bGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSBpbiB5b3VyIHN0eWxlc2hlZXQ7IG9yIHNldHRpbmcgdGhlIGNvcnJlY3Qgc3R5bGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSBpbiB0aGUge0BsaW5rIEZpbkJhciNiYXJTdHlsZXN8YmFyU3R5bGVzfSBvYmplY3QuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNmb3Jlc2hvcnRlbkJ5fGZvcmVzaG9ydGVuQnl9LlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0ZpbkJhcnxudWxsfSBvdGhlckZpbkJhciAtIE90aGVyIHNjcm9sbGJhciB0byBhdm9pZCBieSBzaG9ydGVuaW5nIHRoaXMgb25lOyBgbnVsbGAgcmVtb3ZlcyB0aGUgdHJhaWxpbmcgc3BhY2VcbiAgICAgICAgICogQHJldHVybnMge0ZpbkJhcn0gRm9yIGNoYWluaW5nXG4gICAgICAgICAqL1xuICAgICAgICBzaG9ydGVuQnk6IGZ1bmN0aW9uIChvdGhlckZpbkJhcikgeyByZXR1cm4gdGhpcy5zaG9ydGVuRW5kQnkoJ3RyYWlsaW5nJywgb3RoZXJGaW5CYXIpOyB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAc3VtbWFyeSBTaG9ydGVuIGxlYWRpbmcgZW5kIG9mIHNjcm9sbGJhciBieSB0aGlja25lc3Mgb2Ygc29tZSBvdGhlciBzY3JvbGxiYXIuXG4gICAgICAgICAqIEBkZXNjIFN1cHBvcnRzIG5vbi1jbGFzc2ljYWwgc2Nyb2xsYmFyIHNjZW5hcmlvcyB3aGVyZSB2ZXJ0aWNhbCBzY3JvbGwgYmFyIG1heSBiZSBvbiBsZWZ0IGFuZCBob3Jpem9udGFsIHNjcm9sbGJhciBtYXkgYmUgb24gdG9wLCBpbiB3aGljaCBjYXNlIHlvdSB3YW50IHRvIHNob3J0ZW4gdGhlIFwibGVhZGluZyBlbmRcIiByYXRoZXIgdGhhbiB0aGUgdHJhaWxpbmcgZW5kLlxuICAgICAgICAgKiBAc2VlIHtAbGluayBGaW5CYXIjc2hvcnRlbkJ5fHNob3J0ZW5CeX0uXG4gICAgICAgICAqIEBwYXJhbSB7RmluQmFyfG51bGx9IG90aGVyRmluQmFyIC0gT3RoZXIgc2Nyb2xsYmFyIHRvIGF2b2lkIGJ5IHNob3J0ZW5pbmcgdGhpcyBvbmU7IGBudWxsYCByZW1vdmVzIHRoZSB0cmFpbGluZyBzcGFjZVxuICAgICAgICAgKiBAcmV0dXJucyB7RmluQmFyfSBGb3IgY2hhaW5pbmdcbiAgICAgICAgICovXG4gICAgICAgIGZvcmVzaG9ydGVuQnk6IGZ1bmN0aW9uIChvdGhlckZpbkJhcikgeyByZXR1cm4gdGhpcy5zaG9ydGVuRW5kQnkoJ2xlYWRpbmcnLCBvdGhlckZpbkJhcik7IH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBzdW1tYXJ5IEdlbmVyYWxpemVkIHNob3J0ZW5pbmcgZnVuY3Rpb24uXG4gICAgICAgICAqIEBzZWUge0BsaW5rIEZpbkJhciNzaG9ydGVuQnl8c2hvcnRlbkJ5fS5cbiAgICAgICAgICogQHNlZSB7QGxpbmsgRmluQmFyI2ZvcmVzaG9ydGVuQnl8Zm9yZXNob3J0ZW5CeX0uXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB3aGljaEVuZCAtIGEgQ1NTIHN0eWxlIHByb3BlcnR5IG5hbWUgb3IgYW4gb3JpZW50YXRpb24gaGFzaCBuYW1lIHRoYXQgdHJhbnNsYXRlcyB0byBhIENTUyBzdHlsZSBwcm9wZXJ0eSBuYW1lLlxuICAgICAgICAgKiBAcGFyYW0ge0ZpbkJhcnxudWxsfSBvdGhlckZpbkJhciAtIE90aGVyIHNjcm9sbGJhciB0byBhdm9pZCBieSBzaG9ydGVuaW5nIHRoaXMgb25lOyBgbnVsbGAgcmVtb3ZlcyB0aGUgdHJhaWxpbmcgc3BhY2VcbiAgICAgICAgICogQHJldHVybnMge0ZpbkJhcn0gRm9yIGNoYWluaW5nXG4gICAgICAgICAqL1xuICAgICAgICBzaG9ydGVuRW5kQnk6IGZ1bmN0aW9uICh3aGljaEVuZCwgb3RoZXJGaW5CYXIpIHtcbiAgICAgICAgICAgIGlmICghb3RoZXJGaW5CYXIpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fYXV4U3R5bGVzO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvdGhlckZpbkJhciBpbnN0YW5jZW9mIEZpbkJhciAmJiBvdGhlckZpbkJhci5vcmllbnRhdGlvbiAhPT0gdGhpcy5vcmllbnRhdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciBvdGhlclN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUob3RoZXJGaW5CYXIuYmFyKSxcbiAgICAgICAgICAgICAgICAgICAgb29oID0gb3JpZW50YXRpb25IYXNoZXNbb3RoZXJGaW5CYXIub3JpZW50YXRpb25dO1xuICAgICAgICAgICAgICAgIHRoaXMuX2F1eFN0eWxlcyA9IHt9O1xuICAgICAgICAgICAgICAgIHRoaXMuX2F1eFN0eWxlc1t3aGljaEVuZF0gPSBvdGhlclN0eWxlW29vaC50aGlja25lc3NdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7IC8vIGZvciBjaGFpbmluZ1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKiBAc3VtbWFyeSBTZXRzIHRoZSBwcm9wb3J0aW9uYWwgdGh1bWIgc2l6ZSBhbmQgaGlkZXMgdGh1bWIgd2hlbiAxMDAlLlxuICAgICAgICAgKiBAZGVzYyBUaGUgdGh1bWIgc2l6ZSBoYXMgYW4gYWJzb2x1dGUgbWluaW11bSBvZiAyMCAocGl4ZWxzKS5cbiAgICAgICAgICogQG1lbWJlck9mIEZpbkJhci5wcm90b3R5cGVcbiAgICAgICAgICovXG4gICAgICAgIF9zZXRUaHVtYlNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvaCA9IHRoaXMub2gsXG4gICAgICAgICAgICAgICAgdGh1bWJDb21wID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy50aHVtYiksXG4gICAgICAgICAgICAgICAgdGh1bWJNYXJnaW5MZWFkaW5nID0gcGFyc2VJbnQodGh1bWJDb21wW29oLm1hcmdpbkxlYWRpbmddKSxcbiAgICAgICAgICAgICAgICB0aHVtYk1hcmdpblRyYWlsaW5nID0gcGFyc2VJbnQodGh1bWJDb21wW29oLm1hcmdpblRyYWlsaW5nXSksXG4gICAgICAgICAgICAgICAgdGh1bWJNYXJnaW5zID0gdGh1bWJNYXJnaW5MZWFkaW5nICsgdGh1bWJNYXJnaW5UcmFpbGluZyxcbiAgICAgICAgICAgICAgICBiYXJTaXplID0gdGhpcy5iYXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbb2guc2l6ZV0sXG4gICAgICAgICAgICAgICAgdGh1bWJTaXplID0gTWF0aC5tYXgoMjAsIGJhclNpemUgKiB0aGlzLmNvbnRhaW5lclNpemUgLyB0aGlzLmNvbnRlbnRTaXplKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbmVyU2l6ZSA8IHRoaXMuY29udGVudFNpemUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJhci5zdHlsZS52aXNpYmlsaXR5ID0gJ3Zpc2libGUnO1xuICAgICAgICAgICAgICAgIHRoaXMudGh1bWIuc3R5bGVbb2guc2l6ZV0gPSB0aHVtYlNpemUgKyAncHgnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJhci5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqIEBuYW1lIF90aHVtYk1heFxuICAgICAgICAgICAgICogQHN1bW1hcnkgTWF4aW11bSBvZmZzZXQgb2YgdGh1bWIncyBsZWFkaW5nIGVkZ2UuXG4gICAgICAgICAgICAgKiBAZGVzYyBUaGlzIGlzIHRoZSBwaXhlbCBvZmZzZXQgd2l0aGluIHRoZSBzY3JvbGxiYXIgb2YgdGhlIHRodW1iIHdoZW4gaXQgaXMgYXQgaXRzIG1heGltdW0gcG9zaXRpb24gYXQgdGhlIGV4dHJlbWUgZW5kIG9mIGl0cyByYW5nZS5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBUaGlzIHZhbHVlIHRha2VzIGludG8gYWNjb3VudCB0aGUgbmV3bHkgY2FsY3VsYXRlZCBzaXplIG9mIHRoZSB0aHVtYiBlbGVtZW50IChpbmNsdWRpbmcgaXRzIG1hcmdpbnMpIGFuZCB0aGUgaW5uZXIgc2l6ZSBvZiB0aGUgc2Nyb2xsYmFyICh0aGUgdGh1bWIncyBjb250YWluaW5nIGVsZW1lbnQsIGluY2x1ZGluZyBfaXRzXyBtYXJnaW5zKS5cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBOT1RFOiBTY3JvbGxiYXIgcGFkZGluZyBpcyBub3QgdGFrZW4gaW50byBhY2NvdW50IGFuZCBhc3N1bWVkIHRvIGJlIDAgaW4gdGhlIGN1cnJlbnQgaW1wbGVtZW50YXRpb24gYW5kIGlzIGFzc3VtZWQgdG8gYmUgYDBgOyB1c2UgdGh1bWIgbWFyZ2lucyBpbiBwbGFjZSBvZiBzY3JvbGxiYXIgcGFkZGluZy5cbiAgICAgICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLl90aHVtYk1heCA9IGJhclNpemUgLSB0aHVtYlNpemUgLSB0aHVtYk1hcmdpbnM7XG5cbiAgICAgICAgICAgIHRoaXMuX3RodW1iTWFyZ2luTGVhZGluZyA9IHRodW1iTWFyZ2luTGVhZGluZzsgLy8gdXNlZCBpbiBtb3VzZWRvd25cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHN1bW1hcnkgUmVtb3ZlIHRoZSBzY3JvbGxiYXIuXG4gICAgICAgICAqIEBkZXNjIFVuaG9va3MgYWxsIHRoZSBldmVudCBoYW5kbGVycyBhbmQgdGhlbiByZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlIERPTS4gQWx3YXlzIGNhbGwgdGhpcyBtZXRob2QgcHJpb3IgdG8gZGlzcG9zaW5nIG9mIHRoZSBzY3JvbGxiYXIgb2JqZWN0LlxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlZG93bicpO1xuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlRXZ0KCdtb3VzZW1vdmUnKTtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2V1cCcpO1xuXG4gICAgICAgICAgICAodGhpcy5jb250YWluZXIgfHwgdGhpcy5iYXIucGFyZW50RWxlbWVudCkuX3JlbW92ZUV2dCgnd2hlZWwnLCB0aGlzLl9ib3VuZC5vbndoZWVsKTtcblxuICAgICAgICAgICAgdGhpcy5iYXIub25jbGljayA9XG4gICAgICAgICAgICAgICAgdGhpcy50aHVtYi5vbmNsaWNrID1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3ZlciA9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRodW1iLnRyYW5zaXRpb25lbmQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGh1bWIub25tb3VzZW91dCA9IG51bGw7XG5cbiAgICAgICAgICAgIHRoaXMuYmFyLnJlbW92ZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKiBAZnVuY3Rpb24gX2FkZFRlc3RQYW5lbEl0ZW1cbiAgICAgICAgICogQHN1bW1hcnkgQXBwZW5kIGEgdGVzdCBwYW5lbCBlbGVtZW50LlxuICAgICAgICAgKiBAZGVzYyBJZiB0aGVyZSBpcyBhIHRlc3QgcGFuZWwgaW4gdGhlIERPTSAodHlwaWNhbGx5IGFuIGA8b2w+Li4uPC9vbD5gIGVsZW1lbnQpIHdpdGggY2xhc3MgbmFtZXMgb2YgYm90aCBgdGhpcy5jbGFzc1ByZWZpeGAgYW5kIGAndGVzdC1wYW5lbCdgIChvciwgYmFycmluZyB0aGF0LCBhbnkgZWxlbWVudCB3aXRoIGNsYXNzIG5hbWUgYCd0ZXN0LXBhbmVsJ2ApLCBhbiBgPGxpPi4uLjwvbGk+YCBlbGVtZW50IHdpbGwgYmUgY3JlYXRlZCBhbmQgYXBwZW5kZWQgdG8gaXQuIFRoaXMgbmV3IGVsZW1lbnQgd2lsbCBjb250YWluIGEgc3BhbiBmb3IgZWFjaCBjbGFzcyBuYW1lIGdpdmVuLlxuICAgICAgICAgKlxuICAgICAgICAgKiBZb3Ugc2hvdWxkIGRlZmluZSBhIENTUyBzZWxlY3RvciBgLmxpc3RlbmluZ2AgZm9yIHRoZXNlIHNwYW5zLiBUaGlzIGNsYXNzIHdpbGwgYmUgYWRkZWQgdG8gdGhlIHNwYW5zIHRvIGFsdGVyIHRoZWlyIGFwcGVhcmFuY2Ugd2hlbiBhIGxpc3RlbmVyIGlzIGFkZGVkIHdpdGggdGhhdCBjbGFzcyBuYW1lIChwcmVmaXhlZCB3aXRoICdvbicpLlxuICAgICAgICAgKlxuICAgICAgICAgKiAoVGhpcyBpcyBhbiBpbnRlcm5hbCBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCBvbmNlIGJ5IHRoZSBjb25zdHJ1Y3RvciBvbiBldmVyeSBpbnN0YW50aWF0aW9uLilcbiAgICAgICAgICogQHJldHVybnMge0VsZW1lbnR8dW5kZWZpbmVkfSBUaGUgYXBwZW5kZWQgYDxsaT4uLi48L2xpPmAgZWxlbWVudCBvciBgdW5kZWZpbmVkYCBpZiB0aGVyZSBpcyBubyB0ZXN0IHBhbmVsLlxuICAgICAgICAgKiBAbWVtYmVyT2YgRmluQmFyLnByb3RvdHlwZVxuICAgICAgICAgKi9cbiAgICAgICAgX2FkZFRlc3RQYW5lbEl0ZW06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0ZXN0UGFuZWxJdGVtLFxuICAgICAgICAgICAgICAgIHRlc3RQYW5lbEVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuJyArIHRoaXMuX2NsYXNzUHJlZml4ICsgJy50ZXN0LXBhbmVsJykgfHwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnRlc3QtcGFuZWwnKTtcblxuICAgICAgICAgICAgaWYgKHRlc3RQYW5lbEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGVzdFBhbmVsSXRlbVBhcnROYW1lcyA9IFsgJ21vdXNlZG93bicsICdtb3VzZW1vdmUnLCAnbW91c2V1cCcsICdpbmRleCcgXSxcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG5cbiAgICAgICAgICAgICAgICB0ZXN0UGFuZWxJdGVtUGFydE5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHBhcnROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uaW5uZXJIVE1MICs9ICc8c3BhbiBjbGFzcz1cIicgKyBwYXJ0TmFtZSArICdcIj4nICsgcGFydE5hbWUucmVwbGFjZSgnbW91c2UnLCAnJykgKyAnPC9zcGFuPic7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0ZXN0UGFuZWxFbGVtZW50LmFwcGVuZENoaWxkKGl0ZW0pO1xuXG4gICAgICAgICAgICAgICAgdGVzdFBhbmVsSXRlbSA9IHt9O1xuICAgICAgICAgICAgICAgIHRlc3RQYW5lbEl0ZW1QYXJ0TmFtZXMuZm9yRWFjaChmdW5jdGlvbiAocGFydE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGVzdFBhbmVsSXRlbVtwYXJ0TmFtZV0gPSBpdGVtLmdldEVsZW1lbnRzQnlDbGFzc05hbWUocGFydE5hbWUpWzBdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGVzdFBhbmVsSXRlbTtcbiAgICAgICAgfSxcblxuICAgICAgICBfYWRkRXZ0OiBmdW5jdGlvbiAoZXZ0TmFtZSkge1xuICAgICAgICAgICAgdmFyIHNweSA9IHRoaXMudGVzdFBhbmVsSXRlbSAmJiB0aGlzLnRlc3RQYW5lbEl0ZW1bZXZ0TmFtZV07XG4gICAgICAgICAgICBpZiAoc3B5KSB7IHNweS5jbGFzc0xpc3QuYWRkKCdsaXN0ZW5pbmcnKTsgfVxuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgdGhpcy5fYm91bmRbJ29uJyArIGV2dE5hbWVdKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfcmVtb3ZlRXZ0OiBmdW5jdGlvbiAoZXZ0TmFtZSkge1xuICAgICAgICAgICAgdmFyIHNweSA9IHRoaXMudGVzdFBhbmVsSXRlbSAmJiB0aGlzLnRlc3RQYW5lbEl0ZW1bZXZ0TmFtZV07XG4gICAgICAgICAgICBpZiAoc3B5KSB7IHNweS5jbGFzc0xpc3QucmVtb3ZlKCdsaXN0ZW5pbmcnKTsgfVxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZ0TmFtZSwgdGhpcy5fYm91bmRbJ29uJyArIGV2dE5hbWVdKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIgb2JqbiA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGlmIChvYmpuKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iam4pIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqW2tleV0gPSBvYmpuW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmFsaWRSYW5nZShyYW5nZSkge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJhbmdlKSxcbiAgICAgICAgICAgIHZhbGlkID0gIGtleXMubGVuZ3RoID09PSAyICYmXG4gICAgICAgICAgICAgICAgdHlwZW9mIHJhbmdlLm1pbiA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgcmFuZ2UubWF4ID09PSAnbnVtYmVyJyAmJlxuICAgICAgICAgICAgICAgIHJhbmdlLm1pbiA8PSByYW5nZS5tYXg7XG5cbiAgICAgICAgaWYgKCF2YWxpZCkge1xuICAgICAgICAgICAgZXJyb3IoJ0ludmFsaWQgLnJhbmdlIG9iamVjdC4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG5hbWUgaGFuZGxlcnNUb0JlQm91bmRcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqIEBkZXNjIFRoZSBmdW5jdGlvbnMgZGVmaW5lZCBpbiB0aGlzIG9iamVjdCBhcmUgYWxsIERPTSBldmVudCBoYW5kbGVycyB0aGF0IGFyZSBib3VuZCBieSB0aGUgRmluQmFyIGNvbnN0cnVjdG9yIHRvIGVhY2ggbmV3IGluc3RhbmNlLiBJbiBvdGhlciB3b3JkcywgdGhlIGB0aGlzYCB2YWx1ZSBvZiB0aGVzZSBoYW5kbGVycywgb25jZSBib3VuZCwgcmVmZXIgdG8gdGhlIEZpbkJhciBvYmplY3QgYW5kIG5vdCB0byB0aGUgZXZlbnQgZW1pdHRlci4gXCJEbyBub3QgY29uc3VtZSByYXcuXCJcbiAgICAgKi9cbiAgICB2YXIgaGFuZGxlcnNUb0JlQm91bmQgPSB7XG4gICAgICAgIHNob3J0U3RvcDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9ud2hlZWw6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHRoaXMuaW5kZXggKz0gZXZ0W3RoaXMuZGVsdGFQcm9wXTtcbiAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uY2xpY2s6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHZhciB0aHVtYkJveCA9IHRoaXMudGh1bWIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgZ29pbmdVcCA9IGV2dFt0aGlzLm9oLmNvb3JkaW5hdGVdIDwgdGh1bWJCb3hbdGhpcy5vaC5sZWFkaW5nXTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLnBhZ2luZyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ID0gdGhpcy5wYWdpbmdbZ29pbmdVcCA/ICd1cCcgOiAnZG93biddKE1hdGgucm91bmQodGhpcy5pbmRleCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluZGV4ICs9IGdvaW5nVXAgPyAtdGhpcy5pbmNyZW1lbnQgOiB0aGlzLmluY3JlbWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbWFrZSB0aGUgdGh1bWIgZ2xvdyBtb21lbnRhcmlseVxuICAgICAgICAgICAgdGhpcy50aHVtYi5jbGFzc0xpc3QuYWRkKCdob3ZlcicpO1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdGhpcy50aHVtYi5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgZnVuY3Rpb24gd2FpdEZvckl0KCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigndHJhbnNpdGlvbmVuZCcsIHdhaXRGb3JJdCk7XG4gICAgICAgICAgICAgICAgc2VsZi5fYm91bmQub25tb3VzZXVwKGV2dCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9ubW91c2VvdmVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnRodW1iLmNsYXNzTGlzdC5hZGQoJ2hvdmVyJyk7XG4gICAgICAgICAgICB0aGlzLnRodW1iLm9ubW91c2VvdXQgPSB0aGlzLl9ib3VuZC5vbm1vdXNlb3V0O1xuICAgICAgICAgICAgdGhpcy5fYWRkRXZ0KCdtb3VzZWRvd24nKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbm1vdXNlb3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlZG93bicpO1xuICAgICAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3ZlciA9IHRoaXMuX2JvdW5kLm9ubW91c2VvdmVyO1xuICAgICAgICAgICAgdGhpcy50aHVtYi5jbGFzc0xpc3QucmVtb3ZlKCdob3ZlcicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9ubW91c2Vkb3duOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNlZG93bicpO1xuICAgICAgICAgICAgdGhpcy50aHVtYi5vbm1vdXNlb3ZlciA9IHRoaXMudGh1bWIub25tb3VzZW91dCA9IG51bGw7XG5cbiAgICAgICAgICAgIHZhciB0aHVtYkJveCA9IHRoaXMudGh1bWIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICB0aGlzLnBpbk9mZnNldCA9IGV2dFt0aGlzLm9oLmF4aXNdIC0gdGh1bWJCb3hbdGhpcy5vaC5sZWFkaW5nXSArIHRoaXMuYmFyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW3RoaXMub2gubGVhZGluZ10gKyB0aGlzLl90aHVtYk1hcmdpbkxlYWRpbmc7XG4gICAgICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY3Vyc29yID0gJ2RlZmF1bHQnO1xuXG4gICAgICAgICAgICB0aGlzLl9hZGRFdnQoJ21vdXNlbW92ZScpO1xuICAgICAgICAgICAgdGhpcy5fYWRkRXZ0KCdtb3VzZXVwJyk7XG5cbiAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9ubW91c2Vtb3ZlOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICB2YXIgc2NhbGVkID0gTWF0aC5taW4odGhpcy5fdGh1bWJNYXgsIE1hdGgubWF4KDAsIGV2dFt0aGlzLm9oLmF4aXNdIC0gdGhpcy5waW5PZmZzZXQpKTtcbiAgICAgICAgICAgIHZhciBpZHggPSBzY2FsZWQgLyB0aGlzLl90aHVtYk1heCAqICh0aGlzLl9tYXggLSB0aGlzLl9taW4pICsgdGhpcy5fbWluO1xuXG4gICAgICAgICAgICB0aGlzLl9zZXRTY3JvbGwoaWR4LCBzY2FsZWQpO1xuXG4gICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbm1vdXNldXA6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbW92ZUV2dCgnbW91c2Vtb3ZlJyk7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVFdnQoJ21vdXNldXAnKTtcblxuICAgICAgICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLmN1cnNvciA9ICdhdXRvJztcblxuICAgICAgICAgICAgdmFyIHRodW1iQm94ID0gdGhpcy50aHVtYi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICB0aHVtYkJveC5sZWZ0IDw9IGV2dC5jbGllbnRYICYmIGV2dC5jbGllbnRYIDw9IHRodW1iQm94LnJpZ2h0ICYmXG4gICAgICAgICAgICAgICAgdGh1bWJCb3gudG9wIDw9IGV2dC5jbGllbnRZICYmIGV2dC5jbGllbnRZIDw9IHRodW1iQm94LmJvdHRvbVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYm91bmQub25tb3VzZW92ZXIoZXZ0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYm91bmQub25tb3VzZW91dChldnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgb3JpZW50YXRpb25IYXNoZXMgPSB7XG4gICAgICAgIHZlcnRpY2FsOiB7XG4gICAgICAgICAgICBjb29yZGluYXRlOiAgICAgJ2NsaWVudFknLFxuICAgICAgICAgICAgYXhpczogICAgICAgICAgICdwYWdlWScsXG4gICAgICAgICAgICBzaXplOiAgICAgICAgICAgJ2hlaWdodCcsXG4gICAgICAgICAgICBvdXRzaWRlOiAgICAgICAgJ3JpZ2h0JyxcbiAgICAgICAgICAgIGluc2lkZTogICAgICAgICAnbGVmdCcsXG4gICAgICAgICAgICBsZWFkaW5nOiAgICAgICAgJ3RvcCcsXG4gICAgICAgICAgICB0cmFpbGluZzogICAgICAgJ2JvdHRvbScsXG4gICAgICAgICAgICBtYXJnaW5MZWFkaW5nOiAgJ21hcmdpblRvcCcsXG4gICAgICAgICAgICBtYXJnaW5UcmFpbGluZzogJ21hcmdpbkJvdHRvbScsXG4gICAgICAgICAgICB0aGlja25lc3M6ICAgICAgJ3dpZHRoJyxcbiAgICAgICAgICAgIGRlbHRhOiAgICAgICAgICAnZGVsdGFZJ1xuICAgICAgICB9LFxuICAgICAgICBob3Jpem9udGFsOiB7XG4gICAgICAgICAgICBjb29yZGluYXRlOiAgICAgJ2NsaWVudFgnLFxuICAgICAgICAgICAgYXhpczogICAgICAgICAgICdwYWdlWCcsXG4gICAgICAgICAgICBzaXplOiAgICAgICAgICAgJ3dpZHRoJyxcbiAgICAgICAgICAgIG91dHNpZGU6ICAgICAgICAnYm90dG9tJyxcbiAgICAgICAgICAgIGluc2lkZTogICAgICAgICAndG9wJyxcbiAgICAgICAgICAgIGxlYWRpbmc6ICAgICAgICAnbGVmdCcsXG4gICAgICAgICAgICB0cmFpbGluZzogICAgICAgJ3JpZ2h0JyxcbiAgICAgICAgICAgIG1hcmdpbkxlYWRpbmc6ICAnbWFyZ2luTGVmdCcsXG4gICAgICAgICAgICBtYXJnaW5UcmFpbGluZzogJ21hcmdpblJpZ2h0JyxcbiAgICAgICAgICAgIHRoaWNrbmVzczogICAgICAnaGVpZ2h0JyxcbiAgICAgICAgICAgIGRlbHRhOiAgICAgICAgICAnZGVsdGFYJ1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBheGlzID0ge1xuICAgICAgICB0b3A6ICAgICd2ZXJ0aWNhbCcsXG4gICAgICAgIGJvdHRvbTogJ3ZlcnRpY2FsJyxcbiAgICAgICAgaGVpZ2h0OiAndmVydGljYWwnLFxuICAgICAgICBsZWZ0OiAgICdob3Jpem9udGFsJyxcbiAgICAgICAgcmlnaHQ6ICAnaG9yaXpvbnRhbCcsXG4gICAgICAgIHdpZHRoOiAgJ2hvcml6b250YWwnXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBzdW1tYXJ5IEluc2VydCBiYXNlIHN0eWxlc2hlZXQgaW50byBET01cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7RWxlbWVudH0gW3JlZmVyZW5jZUVsZW1lbnRdXG4gICAgICogaWYgYHVuZGVmaW5lZGAgKG9yIG9taXR0ZWQpIG9yIGBudWxsYCwgaW5qZWN0cyBzdHlsZXNoZWV0IGF0IHRvcCBvciBib3R0b20gb2YgPGhlYWQ+LCByZXNwZWN0aXZlbHksIGJ1dCBvbmx5IG9uY2U7XG4gICAgICogb3RoZXJ3aXNlLCBpbmplY3RzIHN0eWxlc2hlZXQgaW1tZWRpYXRlbHkgYmVmb3JlIGdpdmVuIGVsZW1lbnRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjc3NJbmplY3RvcihyZWZlcmVuY2VFbGVtZW50KSB7XG4gICAgICAgIHZhciBjb250YWluZXIsIHN0eWxlLCBJRCA9ICdmaW5iYXJzLWJhc2Utc3R5bGVzJztcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgICAhY3NzSW5qZWN0b3IudGV4dCB8fCAvLyBubyBzdHlsZXNoZWV0IGRhdGFcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElEKSAvLyBzdHlsZXNoZWV0IGFscmVhZHkgaW4gRE9NXG4gICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiByZWZlcmVuY2VFbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocmVmZXJlbmNlRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAocmVmZXJlbmNlRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSByZWZlcmVuY2VFbGVtZW50WzBdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnJvcignQ2Fubm90IGZpbmQgcmVmZXJlbmNlIGVsZW1lbnQgZm9yIENTUyBpbmplY3Rpb24uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIShyZWZlcmVuY2VFbGVtZW50IGluc3RhbmNlb2YgRWxlbWVudCkpIHtcbiAgICAgICAgICAgIHJlZmVyZW5jZUVsZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICAgICAgc3R5bGUuaWQgPSBJRDtcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzc0luamVjdG9yLnRleHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3NJbmplY3Rvci50ZXh0KSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250YWluZXIgPSByZWZlcmVuY2VFbGVtZW50ICYmIHJlZmVyZW5jZUVsZW1lbnQucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG5cbiAgICAgICAgaWYgKHJlZmVyZW5jZUVsZW1lbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVmZXJlbmNlRWxlbWVudCA9IGNvbnRhaW5lci5maXJzdENoaWxkO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShzdHlsZSwgcmVmZXJlbmNlRWxlbWVudCk7XG4gICAgfVxuICAgIC8qIGluamVjdDpjc3MgKi9cbiAgICBjc3NJbmplY3Rvci50ZXh0ID0gJ2Rpdi5maW5iYXItaG9yaXpvbnRhbCxkaXYuZmluYmFyLXZlcnRpY2Fse3Bvc2l0aW9uOmFic29sdXRlO21hcmdpbjozcHh9ZGl2LmZpbmJhci1ob3Jpem9udGFsPi50aHVtYixkaXYuZmluYmFyLXZlcnRpY2FsPi50aHVtYntwb3NpdGlvbjphYnNvbHV0ZTtiYWNrZ3JvdW5kLWNvbG9yOiNkM2QzZDM7LXdlYmtpdC1ib3gtc2hhZG93OjAgMCAxcHggIzAwMDstbW96LWJveC1zaGFkb3c6MCAwIDFweCAjMDAwO2JveC1zaGFkb3c6MCAwIDFweCAjMDAwO2JvcmRlci1yYWRpdXM6NHB4O21hcmdpbjoycHg7b3BhY2l0eTouNDt0cmFuc2l0aW9uOm9wYWNpdHkgLjVzfWRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWIuaG92ZXIsZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWIuaG92ZXJ7b3BhY2l0eToxO3RyYW5zaXRpb246b3BhY2l0eSAuNXN9ZGl2LmZpbmJhci12ZXJ0aWNhbHt0b3A6MDtib3R0b206MDtyaWdodDowO3dpZHRoOjExcHh9ZGl2LmZpbmJhci12ZXJ0aWNhbD4udGh1bWJ7dG9wOjA7cmlnaHQ6MDt3aWR0aDo3cHh9ZGl2LmZpbmJhci1ob3Jpem9udGFse2xlZnQ6MDtyaWdodDowO2JvdHRvbTowO2hlaWdodDoxMXB4fWRpdi5maW5iYXItaG9yaXpvbnRhbD4udGh1bWJ7bGVmdDowO2JvdHRvbTowO2hlaWdodDo3cHh9JztcbiAgICAvKiBlbmRpbmplY3QgKi9cblxuICAgIGZ1bmN0aW9uIGVycm9yKG1zZykge1xuICAgICAgICB0aHJvdyAnZmluYmFyczogJyArIG1zZztcbiAgICB9XG5cbiAgICAvLyBJbnRlcmZhY2VcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEZpbkJhcjtcbn0pKFxuICAgIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZSB8fCAod2luZG93LkZpbkJhciA9IHt9KSxcbiAgICB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cyB8fCAod2luZG93LkZpbkJhci5leHBvcnRzID0ge30pXG4pIHx8IChcbiAgICB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyB8fCAod2luZG93LkZpbkJhciA9IHdpbmRvdy5GaW5CYXIuZXhwb3J0cylcbik7XG5cbi8qIEFib3V0IHRoZSBhYm92ZSBJSUZFOlxuICogVGhpcyBmaWxlIGlzIGEgXCJtb2RpZmllZCBub2RlIG1vZHVsZS5cIiBJdCBmdW5jdGlvbnMgYXMgdXN1YWwgaW4gTm9kZS5qcyAqYW5kKiBpcyBhbHNvIHVzYWJsZSBkaXJlY3RseSBpbiB0aGUgYnJvd3Nlci5cbiAqIDEuIE5vZGUuanM6IFRoZSBJSUZFIGlzIHN1cGVyZmx1b3VzIGJ1dCBpbm5vY3VvdXMuXG4gKiAyLiBJbiB0aGUgYnJvd3NlcjogVGhlIElJRkUgY2xvc3VyZSBzZXJ2ZXMgdG8ga2VlcCBpbnRlcm5hbCBkZWNsYXJhdGlvbnMgcHJpdmF0ZS5cbiAqIDIuYS4gSW4gdGhlIGJyb3dzZXIgYXMgYSBnbG9iYWw6IFRoZSBsb2dpYyBpbiB0aGUgYWN0dWFsIHBhcmFtZXRlciBleHByZXNzaW9ucyArIHRoZSBwb3N0LWludm9jYXRpb24gZXhwcmVzc2lvblxuICogd2lsbCBwdXQgeW91ciBBUEkgaW4gYHdpbmRvdy5GaW5CYXJgLlxuICogMi5iLiBJbiB0aGUgYnJvd3NlciBhcyBhIG1vZHVsZTogSWYgeW91IHByZWRlZmluZSBhIGB3aW5kb3cubW9kdWxlYCBvYmplY3QsIHRoZSByZXN1bHRzIHdpbGwgYmUgaW4gYG1vZHVsZS5leHBvcnRzYC5cbiAqIFRoZSBib3dlciBjb21wb25lbnQgYG1ubWAgbWFrZXMgdGhpcyBlYXN5IGFuZCBhbHNvIHByb3ZpZGVzIGEgZ2xvYmFsIGByZXF1aXJlKClgIGZ1bmN0aW9uIGZvciByZWZlcmVuY2luZyB5b3VyIG1vZHVsZVxuICogZnJvbSBvdGhlciBjbG9zdXJlcy4gSW4gZWl0aGVyIGNhc2UsIHRoaXMgd29ya3Mgd2l0aCBib3RoIE5vZGVKcy1zdHlsZSBleHBvcnQgbWVjaGFuaXNtcyAtLSBhIHNpbmdsZSBBUEkgYXNzaWdubWVudCxcbiAqIGBtb2R1bGUuZXhwb3J0cyA9IHlvdXJBUElgICpvciogYSBzZXJpZXMgb2YgaW5kaXZpZHVhbCBwcm9wZXJ0eSBhc3NpZ25tZW50cywgYG1vZHVsZS5leHBvcnRzLnByb3BlcnR5ID0gcHJvcGVydHlgLlxuICpcbiAqIEJlZm9yZSB0aGUgSUlGRSBydW5zLCB0aGUgYWN0dWFsIHBhcmFtZXRlciBleHByZXNzaW9ucyBhcmUgZXhlY3V0ZWQ6XG4gKiAxLiBJZiBgbW9kdWxlYCBvYmplY3QgZGVmaW5lZCwgd2UncmUgaW4gTm9kZUpzIHNvIGFzc3VtZSB0aGVyZSBpcyBhIGBtb2R1bGVgIG9iamVjdCB3aXRoIGFuIGBleHBvcnRzYCBvYmplY3RcbiAqIDIuIElmIGBtb2R1bGVgIG9iamVjdCB1bmRlZmluZWQsIHdlJ3JlIGluIGJyb3dzZXIgc28gZGVmaW5lIGEgYHdpbmRvdy5GaW5CYXJgIG9iamVjdCB3aXRoIGFuIGBleHBvcnRzYCBvYmplY3RcbiAqXG4gKiBBZnRlciB0aGUgSUlGRSByZXR1cm5zOlxuICogQmVjYXVzZSBpdCBhbHdheXMgcmV0dXJucyB1bmRlZmluZWQsIHRoZSBleHByZXNzaW9uIGFmdGVyIHRoZSB8fCB3aWxsIGFsd2F5cyBleGVjdXRlOlxuICogMS4gSWYgYG1vZHVsZWAgb2JqZWN0IGRlZmluZWQsIHRoZW4gd2UncmUgaW4gTm9kZUpzIHNvIHdlJ3JlIGRvbmVcbiAqIDIuIElmIGBtb2R1bGVgIG9iamVjdCB1bmRlZmluZWQsIHRoZW4gd2UncmUgaW4gYnJvd3NlciBzbyByZWRlZmluZWB3aW5kb3cuRmluQmFyYCBhcyBpdHMgYGV4cG9ydHNgIG9iamVjdFxuICovXG4iLCI7KGZ1bmN0aW9uICgpIHsgLy8gY2xvc3VyZSBmb3Igd2ViIGJyb3dzZXJzXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cyA9IExSVUNhY2hlXG59IGVsc2Uge1xuICAvLyBqdXN0IHNldCB0aGUgZ2xvYmFsIGZvciBub24tbm9kZSBwbGF0Zm9ybXMuXG4gIHRoaXMuTFJVQ2FjaGUgPSBMUlVDYWNoZVxufVxuXG5mdW5jdGlvbiBoT1AgKG9iaiwga2V5KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpXG59XG5cbmZ1bmN0aW9uIG5haXZlTGVuZ3RoICgpIHsgcmV0dXJuIDEgfVxuXG5mdW5jdGlvbiBMUlVDYWNoZSAob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTFJVQ2FjaGUpKVxuICAgIHJldHVybiBuZXcgTFJVQ2FjaGUob3B0aW9ucylcblxuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdudW1iZXInKVxuICAgIG9wdGlvbnMgPSB7IG1heDogb3B0aW9ucyB9XG5cbiAgaWYgKCFvcHRpb25zKVxuICAgIG9wdGlvbnMgPSB7fVxuXG4gIHRoaXMuX21heCA9IG9wdGlvbnMubWF4XG4gIC8vIEtpbmQgb2Ygd2VpcmQgdG8gaGF2ZSBhIGRlZmF1bHQgbWF4IG9mIEluZmluaXR5LCBidXQgb2ggd2VsbC5cbiAgaWYgKCF0aGlzLl9tYXggfHwgISh0eXBlb2YgdGhpcy5fbWF4ID09PSBcIm51bWJlclwiKSB8fCB0aGlzLl9tYXggPD0gMCApXG4gICAgdGhpcy5fbWF4ID0gSW5maW5pdHlcblxuICB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yID0gb3B0aW9ucy5sZW5ndGggfHwgbmFpdmVMZW5ndGhcbiAgaWYgKHR5cGVvZiB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yICE9PSBcImZ1bmN0aW9uXCIpXG4gICAgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciA9IG5haXZlTGVuZ3RoXG5cbiAgdGhpcy5fYWxsb3dTdGFsZSA9IG9wdGlvbnMuc3RhbGUgfHwgZmFsc2VcbiAgdGhpcy5fbWF4QWdlID0gb3B0aW9ucy5tYXhBZ2UgfHwgbnVsbFxuICB0aGlzLl9kaXNwb3NlID0gb3B0aW9ucy5kaXNwb3NlXG4gIHRoaXMucmVzZXQoKVxufVxuXG4vLyByZXNpemUgdGhlIGNhY2hlIHdoZW4gdGhlIG1heCBjaGFuZ2VzLlxuT2JqZWN0LmRlZmluZVByb3BlcnR5KExSVUNhY2hlLnByb3RvdHlwZSwgXCJtYXhcIixcbiAgeyBzZXQgOiBmdW5jdGlvbiAobUwpIHtcbiAgICAgIGlmICghbUwgfHwgISh0eXBlb2YgbUwgPT09IFwibnVtYmVyXCIpIHx8IG1MIDw9IDAgKSBtTCA9IEluZmluaXR5XG4gICAgICB0aGlzLl9tYXggPSBtTFxuICAgICAgaWYgKHRoaXMuX2xlbmd0aCA+IHRoaXMuX21heCkgdHJpbSh0aGlzKVxuICAgIH1cbiAgLCBnZXQgOiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9tYXggfVxuICAsIGVudW1lcmFibGUgOiB0cnVlXG4gIH0pXG5cbi8vIHJlc2l6ZSB0aGUgY2FjaGUgd2hlbiB0aGUgbGVuZ3RoQ2FsY3VsYXRvciBjaGFuZ2VzLlxuT2JqZWN0LmRlZmluZVByb3BlcnR5KExSVUNhY2hlLnByb3RvdHlwZSwgXCJsZW5ndGhDYWxjdWxhdG9yXCIsXG4gIHsgc2V0IDogZnVuY3Rpb24gKGxDKSB7XG4gICAgICBpZiAodHlwZW9mIGxDICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciA9IG5haXZlTGVuZ3RoXG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IHRoaXMuX2l0ZW1Db3VudFxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5fY2FjaGUpIHtcbiAgICAgICAgICB0aGlzLl9jYWNoZVtrZXldLmxlbmd0aCA9IDFcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fbGVuZ3RoQ2FsY3VsYXRvciA9IGxDXG4gICAgICAgIHRoaXMuX2xlbmd0aCA9IDBcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuX2NhY2hlKSB7XG4gICAgICAgICAgdGhpcy5fY2FjaGVba2V5XS5sZW5ndGggPSB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yKHRoaXMuX2NhY2hlW2tleV0udmFsdWUpXG4gICAgICAgICAgdGhpcy5fbGVuZ3RoICs9IHRoaXMuX2NhY2hlW2tleV0ubGVuZ3RoXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2xlbmd0aCA+IHRoaXMuX21heCkgdHJpbSh0aGlzKVxuICAgIH1cbiAgLCBnZXQgOiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9sZW5ndGhDYWxjdWxhdG9yIH1cbiAgLCBlbnVtZXJhYmxlIDogdHJ1ZVxuICB9KVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTFJVQ2FjaGUucHJvdG90eXBlLCBcImxlbmd0aFwiLFxuICB7IGdldCA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2xlbmd0aCB9XG4gICwgZW51bWVyYWJsZSA6IHRydWVcbiAgfSlcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTFJVQ2FjaGUucHJvdG90eXBlLCBcIml0ZW1Db3VudFwiLFxuICB7IGdldCA6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2l0ZW1Db3VudCB9XG4gICwgZW51bWVyYWJsZSA6IHRydWVcbiAgfSlcblxuTFJVQ2FjaGUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiAoZm4sIHRoaXNwKSB7XG4gIHRoaXNwID0gdGhpc3AgfHwgdGhpc1xuICB2YXIgaSA9IDBcbiAgdmFyIGl0ZW1Db3VudCA9IHRoaXMuX2l0ZW1Db3VudFxuXG4gIGZvciAodmFyIGsgPSB0aGlzLl9tcnUgLSAxOyBrID49IDAgJiYgaSA8IGl0ZW1Db3VudDsgay0tKSBpZiAodGhpcy5fbHJ1TGlzdFtrXSkge1xuICAgIGkrK1xuICAgIHZhciBoaXQgPSB0aGlzLl9scnVMaXN0W2tdXG4gICAgaWYgKGlzU3RhbGUodGhpcywgaGl0KSkge1xuICAgICAgZGVsKHRoaXMsIGhpdClcbiAgICAgIGlmICghdGhpcy5fYWxsb3dTdGFsZSkgaGl0ID0gdW5kZWZpbmVkXG4gICAgfVxuICAgIGlmIChoaXQpIHtcbiAgICAgIGZuLmNhbGwodGhpc3AsIGhpdC52YWx1ZSwgaGl0LmtleSwgdGhpcylcbiAgICB9XG4gIH1cbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBrZXlzID0gbmV3IEFycmF5KHRoaXMuX2l0ZW1Db3VudClcbiAgdmFyIGkgPSAwXG4gIGZvciAodmFyIGsgPSB0aGlzLl9tcnUgLSAxOyBrID49IDAgJiYgaSA8IHRoaXMuX2l0ZW1Db3VudDsgay0tKSBpZiAodGhpcy5fbHJ1TGlzdFtrXSkge1xuICAgIHZhciBoaXQgPSB0aGlzLl9scnVMaXN0W2tdXG4gICAga2V5c1tpKytdID0gaGl0LmtleVxuICB9XG4gIHJldHVybiBrZXlzXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkodGhpcy5faXRlbUNvdW50KVxuICB2YXIgaSA9IDBcbiAgZm9yICh2YXIgayA9IHRoaXMuX21ydSAtIDE7IGsgPj0gMCAmJiBpIDwgdGhpcy5faXRlbUNvdW50OyBrLS0pIGlmICh0aGlzLl9scnVMaXN0W2tdKSB7XG4gICAgdmFyIGhpdCA9IHRoaXMuX2xydUxpc3Rba11cbiAgICB2YWx1ZXNbaSsrXSA9IGhpdC52YWx1ZVxuICB9XG4gIHJldHVybiB2YWx1ZXNcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fZGlzcG9zZSAmJiB0aGlzLl9jYWNoZSkge1xuICAgIGZvciAodmFyIGsgaW4gdGhpcy5fY2FjaGUpIHtcbiAgICAgIHRoaXMuX2Rpc3Bvc2UoaywgdGhpcy5fY2FjaGVba10udmFsdWUpXG4gICAgfVxuICB9XG5cbiAgdGhpcy5fY2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpIC8vIGhhc2ggb2YgaXRlbXMgYnkga2V5XG4gIHRoaXMuX2xydUxpc3QgPSBPYmplY3QuY3JlYXRlKG51bGwpIC8vIGxpc3Qgb2YgaXRlbXMgaW4gb3JkZXIgb2YgdXNlIHJlY2VuY3lcbiAgdGhpcy5fbXJ1ID0gMCAvLyBtb3N0IHJlY2VudGx5IHVzZWRcbiAgdGhpcy5fbHJ1ID0gMCAvLyBsZWFzdCByZWNlbnRseSB1c2VkXG4gIHRoaXMuX2xlbmd0aCA9IDAgLy8gbnVtYmVyIG9mIGl0ZW1zIGluIHRoZSBsaXN0XG4gIHRoaXMuX2l0ZW1Db3VudCA9IDBcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmR1bXAgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBhcnIgPSBbXVxuICB2YXIgaSA9IDBcblxuICBmb3IgKHZhciBrID0gdGhpcy5fbXJ1IC0gMTsgayA+PSAwICYmIGkgPCB0aGlzLl9pdGVtQ291bnQ7IGstLSkgaWYgKHRoaXMuX2xydUxpc3Rba10pIHtcbiAgICB2YXIgaGl0ID0gdGhpcy5fbHJ1TGlzdFtrXVxuICAgIGlmICghaXNTdGFsZSh0aGlzLCBoaXQpKSB7XG4gICAgICAvL0RvIG5vdCBzdG9yZSBzdGFsZWQgaGl0c1xuICAgICAgKytpXG4gICAgICBhcnIucHVzaCh7XG4gICAgICAgIGs6IGhpdC5rZXksXG4gICAgICAgIHY6IGhpdC52YWx1ZSxcbiAgICAgICAgZTogaGl0Lm5vdyArIChoaXQubWF4QWdlIHx8IDApXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgLy9hcnIgaGFzIHRoZSBtb3N0IHJlYWQgZmlyc3RcbiAgcmV0dXJuIGFyclxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUuZHVtcExydSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2xydUxpc3Rcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlLCBtYXhBZ2UpIHtcbiAgbWF4QWdlID0gbWF4QWdlIHx8IHRoaXMuX21heEFnZVxuICB2YXIgbm93ID0gbWF4QWdlID8gRGF0ZS5ub3coKSA6IDBcbiAgdmFyIGxlbiA9IHRoaXMuX2xlbmd0aENhbGN1bGF0b3IodmFsdWUpXG5cbiAgaWYgKGhPUCh0aGlzLl9jYWNoZSwga2V5KSkge1xuICAgIGlmIChsZW4gPiB0aGlzLl9tYXgpIHtcbiAgICAgIGRlbCh0aGlzLCB0aGlzLl9jYWNoZVtrZXldKVxuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIC8vIGRpc3Bvc2Ugb2YgdGhlIG9sZCBvbmUgYmVmb3JlIG92ZXJ3cml0aW5nXG4gICAgaWYgKHRoaXMuX2Rpc3Bvc2UpXG4gICAgICB0aGlzLl9kaXNwb3NlKGtleSwgdGhpcy5fY2FjaGVba2V5XS52YWx1ZSlcblxuICAgIHRoaXMuX2NhY2hlW2tleV0ubm93ID0gbm93XG4gICAgdGhpcy5fY2FjaGVba2V5XS5tYXhBZ2UgPSBtYXhBZ2VcbiAgICB0aGlzLl9jYWNoZVtrZXldLnZhbHVlID0gdmFsdWVcbiAgICB0aGlzLl9sZW5ndGggKz0gKGxlbiAtIHRoaXMuX2NhY2hlW2tleV0ubGVuZ3RoKVxuICAgIHRoaXMuX2NhY2hlW2tleV0ubGVuZ3RoID0gbGVuXG4gICAgdGhpcy5nZXQoa2V5KVxuXG4gICAgaWYgKHRoaXMuX2xlbmd0aCA+IHRoaXMuX21heClcbiAgICAgIHRyaW0odGhpcylcblxuICAgIHJldHVybiB0cnVlXG4gIH1cblxuICB2YXIgaGl0ID0gbmV3IEVudHJ5KGtleSwgdmFsdWUsIHRoaXMuX21ydSsrLCBsZW4sIG5vdywgbWF4QWdlKVxuXG4gIC8vIG92ZXJzaXplZCBvYmplY3RzIGZhbGwgb3V0IG9mIGNhY2hlIGF1dG9tYXRpY2FsbHkuXG4gIGlmIChoaXQubGVuZ3RoID4gdGhpcy5fbWF4KSB7XG4gICAgaWYgKHRoaXMuX2Rpc3Bvc2UpIHRoaXMuX2Rpc3Bvc2Uoa2V5LCB2YWx1ZSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIHRoaXMuX2xlbmd0aCArPSBoaXQubGVuZ3RoXG4gIHRoaXMuX2xydUxpc3RbaGl0Lmx1XSA9IHRoaXMuX2NhY2hlW2tleV0gPSBoaXRcbiAgdGhpcy5faXRlbUNvdW50ICsrXG5cbiAgaWYgKHRoaXMuX2xlbmd0aCA+IHRoaXMuX21heClcbiAgICB0cmltKHRoaXMpXG5cbiAgcmV0dXJuIHRydWVcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgaWYgKCFoT1AodGhpcy5fY2FjaGUsIGtleSkpIHJldHVybiBmYWxzZVxuICB2YXIgaGl0ID0gdGhpcy5fY2FjaGVba2V5XVxuICBpZiAoaXNTdGFsZSh0aGlzLCBoaXQpKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgcmV0dXJuIHRydWVcbn1cblxuTFJVQ2FjaGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgcmV0dXJuIGdldCh0aGlzLCBrZXksIHRydWUpXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5wZWVrID0gZnVuY3Rpb24gKGtleSkge1xuICByZXR1cm4gZ2V0KHRoaXMsIGtleSwgZmFsc2UpXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBoaXQgPSB0aGlzLl9scnVMaXN0W3RoaXMuX2xydV1cbiAgZGVsKHRoaXMsIGhpdClcbiAgcmV0dXJuIGhpdCB8fCBudWxsXG59XG5cbkxSVUNhY2hlLnByb3RvdHlwZS5kZWwgPSBmdW5jdGlvbiAoa2V5KSB7XG4gIGRlbCh0aGlzLCB0aGlzLl9jYWNoZVtrZXldKVxufVxuXG5MUlVDYWNoZS5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgLy9yZXNldCB0aGUgY2FjaGVcbiAgdGhpcy5yZXNldCgpO1xuXG4gIHZhciBub3cgPSBEYXRlLm5vdygpXG4gIC8vQSBwcmV2aW91cyBzZXJpYWxpemVkIGNhY2hlIGhhcyB0aGUgbW9zdCByZWNlbnQgaXRlbXMgZmlyc3RcbiAgZm9yICh2YXIgbCA9IGFyci5sZW5ndGggLSAxOyBsID49IDA7IGwtLSApIHtcbiAgICB2YXIgaGl0ID0gYXJyW2xdXG4gICAgdmFyIGV4cGlyZXNBdCA9IGhpdC5lIHx8IDBcbiAgICBpZiAoZXhwaXJlc0F0ID09PSAwKSB7XG4gICAgICAvL3RoZSBpdGVtIHdhcyBjcmVhdGVkIHdpdGhvdXQgZXhwaXJhdGlvbiBpbiBhIG5vbiBhZ2VkIGNhY2hlXG4gICAgICB0aGlzLnNldChoaXQuaywgaGl0LnYpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBtYXhBZ2UgPSBleHBpcmVzQXQgLSBub3dcbiAgICAgIC8vZG9udCBhZGQgYWxyZWFkeSBleHBpcmVkIGl0ZW1zXG4gICAgICBpZiAobWF4QWdlID4gMCkgdGhpcy5zZXQoaGl0LmssIGhpdC52LCBtYXhBZ2UpXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldCAoc2VsZiwga2V5LCBkb1VzZSkge1xuICB2YXIgaGl0ID0gc2VsZi5fY2FjaGVba2V5XVxuICBpZiAoaGl0KSB7XG4gICAgaWYgKGlzU3RhbGUoc2VsZiwgaGl0KSkge1xuICAgICAgZGVsKHNlbGYsIGhpdClcbiAgICAgIGlmICghc2VsZi5fYWxsb3dTdGFsZSkgaGl0ID0gdW5kZWZpbmVkXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChkb1VzZSkgdXNlKHNlbGYsIGhpdClcbiAgICB9XG4gICAgaWYgKGhpdCkgaGl0ID0gaGl0LnZhbHVlXG4gIH1cbiAgcmV0dXJuIGhpdFxufVxuXG5mdW5jdGlvbiBpc1N0YWxlKHNlbGYsIGhpdCkge1xuICBpZiAoIWhpdCB8fCAoIWhpdC5tYXhBZ2UgJiYgIXNlbGYuX21heEFnZSkpIHJldHVybiBmYWxzZVxuICB2YXIgc3RhbGUgPSBmYWxzZTtcbiAgdmFyIGRpZmYgPSBEYXRlLm5vdygpIC0gaGl0Lm5vd1xuICBpZiAoaGl0Lm1heEFnZSkge1xuICAgIHN0YWxlID0gZGlmZiA+IGhpdC5tYXhBZ2VcbiAgfSBlbHNlIHtcbiAgICBzdGFsZSA9IHNlbGYuX21heEFnZSAmJiAoZGlmZiA+IHNlbGYuX21heEFnZSlcbiAgfVxuICByZXR1cm4gc3RhbGU7XG59XG5cbmZ1bmN0aW9uIHVzZSAoc2VsZiwgaGl0KSB7XG4gIHNoaWZ0TFUoc2VsZiwgaGl0KVxuICBoaXQubHUgPSBzZWxmLl9tcnUgKytcbiAgc2VsZi5fbHJ1TGlzdFtoaXQubHVdID0gaGl0XG59XG5cbmZ1bmN0aW9uIHRyaW0gKHNlbGYpIHtcbiAgd2hpbGUgKHNlbGYuX2xydSA8IHNlbGYuX21ydSAmJiBzZWxmLl9sZW5ndGggPiBzZWxmLl9tYXgpXG4gICAgZGVsKHNlbGYsIHNlbGYuX2xydUxpc3Rbc2VsZi5fbHJ1XSlcbn1cblxuZnVuY3Rpb24gc2hpZnRMVSAoc2VsZiwgaGl0KSB7XG4gIGRlbGV0ZSBzZWxmLl9scnVMaXN0WyBoaXQubHUgXVxuICB3aGlsZSAoc2VsZi5fbHJ1IDwgc2VsZi5fbXJ1ICYmICFzZWxmLl9scnVMaXN0W3NlbGYuX2xydV0pIHNlbGYuX2xydSArK1xufVxuXG5mdW5jdGlvbiBkZWwgKHNlbGYsIGhpdCkge1xuICBpZiAoaGl0KSB7XG4gICAgaWYgKHNlbGYuX2Rpc3Bvc2UpIHNlbGYuX2Rpc3Bvc2UoaGl0LmtleSwgaGl0LnZhbHVlKVxuICAgIHNlbGYuX2xlbmd0aCAtPSBoaXQubGVuZ3RoXG4gICAgc2VsZi5faXRlbUNvdW50IC0tXG4gICAgZGVsZXRlIHNlbGYuX2NhY2hlWyBoaXQua2V5IF1cbiAgICBzaGlmdExVKHNlbGYsIGhpdClcbiAgfVxufVxuXG4vLyBjbGFzc3ksIHNpbmNlIFY4IHByZWZlcnMgcHJlZGljdGFibGUgb2JqZWN0cy5cbmZ1bmN0aW9uIEVudHJ5IChrZXksIHZhbHVlLCBsdSwgbGVuZ3RoLCBub3csIG1heEFnZSkge1xuICB0aGlzLmtleSA9IGtleVxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5sdSA9IGx1XG4gIHRoaXMubGVuZ3RoID0gbGVuZ3RoXG4gIHRoaXMubm93ID0gbm93XG4gIGlmIChtYXhBZ2UpIHRoaXMubWF4QWdlID0gbWF4QWdlXG59XG5cbn0pKClcbiIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuOC4zXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDE1IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQsXG4gICAgbmF0aXZlQ3JlYXRlICAgICAgID0gT2JqZWN0LmNyZWF0ZTtcblxuICAvLyBOYWtlZCBmdW5jdGlvbiByZWZlcmVuY2UgZm9yIHN1cnJvZ2F0ZS1wcm90b3R5cGUtc3dhcHBpbmcuXG4gIHZhciBDdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdC5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS44LjMnO1xuXG4gIC8vIEludGVybmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhbiBlZmZpY2llbnQgKGZvciBjdXJyZW50IGVuZ2luZXMpIHZlcnNpb25cbiAgLy8gb2YgdGhlIHBhc3NlZC1pbiBjYWxsYmFjaywgdG8gYmUgcmVwZWF0ZWRseSBhcHBsaWVkIGluIG90aGVyIFVuZGVyc2NvcmVcbiAgLy8gZnVuY3Rpb25zLlxuICB2YXIgb3B0aW1pemVDYiA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQsIGFyZ0NvdW50KSB7XG4gICAgaWYgKGNvbnRleHQgPT09IHZvaWQgMCkgcmV0dXJuIGZ1bmM7XG4gICAgc3dpdGNoIChhcmdDb3VudCA9PSBudWxsID8gMyA6IGFyZ0NvdW50KSB7XG4gICAgICBjYXNlIDE6IHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgICBjYXNlIDI6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgb3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuY2FsbChjb250ZXh0LCB2YWx1ZSwgb3RoZXIpO1xuICAgICAgfTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgICB9O1xuICAgICAgY2FzZSA0OiByZXR1cm4gZnVuY3Rpb24oYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbikge1xuICAgICAgICByZXR1cm4gZnVuYy5jYWxsKGNvbnRleHQsIGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEEgbW9zdGx5LWludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGNhbGxiYWNrcyB0aGF0IGNhbiBiZSBhcHBsaWVkXG4gIC8vIHRvIGVhY2ggZWxlbWVudCBpbiBhIGNvbGxlY3Rpb24sIHJldHVybmluZyB0aGUgZGVzaXJlZCByZXN1bHQg4oCUIGVpdGhlclxuICAvLyBpZGVudGl0eSwgYW4gYXJiaXRyYXJ5IGNhbGxiYWNrLCBhIHByb3BlcnR5IG1hdGNoZXIsIG9yIGEgcHJvcGVydHkgYWNjZXNzb3IuXG4gIHZhciBjYiA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0LCBhcmdDb3VudCkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXy5pZGVudGl0eTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkgcmV0dXJuIG9wdGltaXplQ2IodmFsdWUsIGNvbnRleHQsIGFyZ0NvdW50KTtcbiAgICBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHJldHVybiBfLm1hdGNoZXIodmFsdWUpO1xuICAgIHJldHVybiBfLnByb3BlcnR5KHZhbHVlKTtcbiAgfTtcbiAgXy5pdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGNiKHZhbHVlLCBjb250ZXh0LCBJbmZpbml0eSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFzc2lnbmVyIGZ1bmN0aW9ucy5cbiAgdmFyIGNyZWF0ZUFzc2lnbmVyID0gZnVuY3Rpb24oa2V5c0Z1bmMsIHVuZGVmaW5lZE9ubHkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGlmIChsZW5ndGggPCAyIHx8IG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XSxcbiAgICAgICAgICAgIGtleXMgPSBrZXlzRnVuYyhzb3VyY2UpLFxuICAgICAgICAgICAgbCA9IGtleXMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIGlmICghdW5kZWZpbmVkT25seSB8fCBvYmpba2V5XSA9PT0gdm9pZCAwKSBvYmpba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGEgbmV3IG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gYW5vdGhlci5cbiAgdmFyIGJhc2VDcmVhdGUgPSBmdW5jdGlvbihwcm90b3R5cGUpIHtcbiAgICBpZiAoIV8uaXNPYmplY3QocHJvdG90eXBlKSkgcmV0dXJuIHt9O1xuICAgIGlmIChuYXRpdmVDcmVhdGUpIHJldHVybiBuYXRpdmVDcmVhdGUocHJvdG90eXBlKTtcbiAgICBDdG9yLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IEN0b3I7XG4gICAgQ3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgdmFyIHByb3BlcnR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiA9PSBudWxsID8gdm9pZCAwIDogb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBIZWxwZXIgZm9yIGNvbGxlY3Rpb24gbWV0aG9kcyB0byBkZXRlcm1pbmUgd2hldGhlciBhIGNvbGxlY3Rpb25cbiAgLy8gc2hvdWxkIGJlIGl0ZXJhdGVkIGFzIGFuIGFycmF5IG9yIGFzIGFuIG9iamVjdFxuICAvLyBSZWxhdGVkOiBodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy10b2xlbmd0aFxuICAvLyBBdm9pZHMgYSB2ZXJ5IG5hc3R5IGlPUyA4IEpJVCBidWcgb24gQVJNLTY0LiAjMjA5NFxuICB2YXIgTUFYX0FSUkFZX0lOREVYID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgdmFyIGdldExlbmd0aCA9IHByb3BlcnR5KCdsZW5ndGgnKTtcbiAgdmFyIGlzQXJyYXlMaWtlID0gZnVuY3Rpb24oY29sbGVjdGlvbikge1xuICAgIHZhciBsZW5ndGggPSBnZXRMZW5ndGgoY29sbGVjdGlvbik7XG4gICAgcmV0dXJuIHR5cGVvZiBsZW5ndGggPT0gJ251bWJlcicgJiYgbGVuZ3RoID49IDAgJiYgbGVuZ3RoIDw9IE1BWF9BUlJBWV9JTkRFWDtcbiAgfTtcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIHJhdyBvYmplY3RzIGluIGFkZGl0aW9uIHRvIGFycmF5LWxpa2VzLiBUcmVhdHMgYWxsXG4gIC8vIHNwYXJzZSBhcnJheS1saWtlcyBhcyBpZiB0aGV5IHdlcmUgZGVuc2UuXG4gIF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBpLCBsZW5ndGg7XG4gICAgaWYgKGlzQXJyYXlMaWtlKG9iaikpIHtcbiAgICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpdGVyYXRlZShvYmpbaV0sIGksIG9iaik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGl0ZXJhdGVlKG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudC5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIHJlc3VsdHMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICByZXN1bHRzW2luZGV4XSA9IGl0ZXJhdGVlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgcmVkdWNpbmcgZnVuY3Rpb24gaXRlcmF0aW5nIGxlZnQgb3IgcmlnaHQuXG4gIGZ1bmN0aW9uIGNyZWF0ZVJlZHVjZShkaXIpIHtcbiAgICAvLyBPcHRpbWl6ZWQgaXRlcmF0b3IgZnVuY3Rpb24gYXMgdXNpbmcgYXJndW1lbnRzLmxlbmd0aFxuICAgIC8vIGluIHRoZSBtYWluIGZ1bmN0aW9uIHdpbGwgZGVvcHRpbWl6ZSB0aGUsIHNlZSAjMTk5MS5cbiAgICBmdW5jdGlvbiBpdGVyYXRvcihvYmosIGl0ZXJhdGVlLCBtZW1vLCBrZXlzLCBpbmRleCwgbGVuZ3RoKSB7XG4gICAgICBmb3IgKDsgaW5kZXggPj0gMCAmJiBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gZGlyKSB7XG4gICAgICAgIHZhciBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRlZShtZW1vLCBvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgaXRlcmF0ZWUgPSBvcHRpbWl6ZUNiKGl0ZXJhdGVlLCBjb250ZXh0LCA0KTtcbiAgICAgIHZhciBrZXlzID0gIWlzQXJyYXlMaWtlKG9iaikgJiYgXy5rZXlzKG9iaiksXG4gICAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgICAgaW5kZXggPSBkaXIgPiAwID8gMCA6IGxlbmd0aCAtIDE7XG4gICAgICAvLyBEZXRlcm1pbmUgdGhlIGluaXRpYWwgdmFsdWUgaWYgbm9uZSBpcyBwcm92aWRlZC5cbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICBtZW1vID0gb2JqW2tleXMgPyBrZXlzW2luZGV4XSA6IGluZGV4XTtcbiAgICAgICAgaW5kZXggKz0gZGlyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGtleXMsIGluZGV4LCBsZW5ndGgpO1xuICAgIH07XG4gIH1cblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gY3JlYXRlUmVkdWNlKDEpO1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGNyZWF0ZVJlZHVjZSgtMSk7XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIGtleTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSkge1xuICAgICAga2V5ID0gXy5maW5kSW5kZXgob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBrZXkgPSBfLmZpbmRLZXkob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIH1cbiAgICBpZiAoa2V5ICE9PSB2b2lkIDAgJiYga2V5ICE9PSAtMSkgcmV0dXJuIG9ialtrZXldO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5uZWdhdGUoY2IocHJlZGljYXRlKSksIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIGlmICghcHJlZGljYXRlKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSAhaXNBcnJheUxpa2Uob2JqKSAmJiBfLmtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgIGlmIChwcmVkaWNhdGUob2JqW2N1cnJlbnRLZXldLCBjdXJyZW50S2V5LCBvYmopKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gaXRlbSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlc2AgYW5kIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZXMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIGl0ZW0sIGZyb21JbmRleCwgZ3VhcmQpIHtcbiAgICBpZiAoIWlzQXJyYXlMaWtlKG9iaikpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgaWYgKHR5cGVvZiBmcm9tSW5kZXggIT0gJ251bWJlcicgfHwgZ3VhcmQpIGZyb21JbmRleCA9IDA7XG4gICAgcmV0dXJuIF8uaW5kZXhPZihvYmosIGl0ZW0sIGZyb21JbmRleCkgPj0gMDtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIGZ1bmMgPSBpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdO1xuICAgICAgcmV0dXJuIGZ1bmMgPT0gbnVsbCA/IGZ1bmMgOiBmdW5jLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXIoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXIoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSAtSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IC1JbmZpbml0eSxcbiAgICAgICAgdmFsdWUsIGNvbXB1dGVkO1xuICAgIGlmIChpdGVyYXRlZSA9PSBudWxsICYmIG9iaiAhPSBudWxsKSB7XG4gICAgICBvYmogPSBpc0FycmF5TGlrZShvYmopID8gb2JqIDogXy52YWx1ZXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWUgPSBvYmpbaV07XG4gICAgICAgIGlmICh2YWx1ZSA+IHJlc3VsdCkge1xuICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgICAgXy5lYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGNvbXB1dGVkID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgICAgaWYgKGNvbXB1dGVkID4gbGFzdENvbXB1dGVkIHx8IGNvbXB1dGVkID09PSAtSW5maW5pdHkgJiYgcmVzdWx0ID09PSAtSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5LFxuICAgICAgICB2YWx1ZSwgY29tcHV0ZWQ7XG4gICAgaWYgKGl0ZXJhdGVlID09IG51bGwgJiYgb2JqICE9IG51bGwpIHtcbiAgICAgIG9iaiA9IGlzQXJyYXlMaWtlKG9iaikgPyBvYmogOiBfLnZhbHVlcyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IG9ialtpXTtcbiAgICAgICAgaWYgKHZhbHVlIDwgcmVzdWx0KSB7XG4gICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgICBfLmVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQgfHwgY29tcHV0ZWQgPT09IEluZmluaXR5ICYmIHJlc3VsdCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBtb2Rlcm4gdmVyc2lvbiBvZiB0aGVcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc2V0ID0gaXNBcnJheUxpa2Uob2JqKSA/IG9iaiA6IF8udmFsdWVzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IHNldC5sZW5ndGg7XG4gICAgdmFyIHNodWZmbGVkID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDAsIHJhbmQ7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oMCwgaW5kZXgpO1xuICAgICAgaWYgKHJhbmQgIT09IGluZGV4KSBzaHVmZmxlZFtpbmRleF0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gc2V0W2luZGV4XTtcbiAgICB9XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAoIWlzQXJyYXlMaWtlKG9iaikpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdGVlLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRlZSh2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0ZWUodmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIHZhbHVlLCBrZXkpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgaWYgKF8uaGFzKHJlc3VsdCwga2V5KSkgcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSk7IGVsc2UgcmVzdWx0W2tleV0gPSBbdmFsdWVdO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCB2YWx1ZSwga2V5KSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgIGlmIChfLmhhcyhyZXN1bHQsIGtleSkpIHJlc3VsdFtrZXldKys7IGVsc2UgcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAoaXNBcnJheUxpa2Uob2JqKSkgcmV0dXJuIF8ubWFwKG9iaiwgXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIF8udmFsdWVzKG9iaik7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gYW4gb2JqZWN0LlxuICBfLnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAwO1xuICAgIHJldHVybiBpc0FycmF5TGlrZShvYmopID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBTcGxpdCBhIGNvbGxlY3Rpb24gaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIHBhc3MgPSBbXSwgZmFpbCA9IFtdO1xuICAgIF8uZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBrZXksIG9iaikge1xuICAgICAgKHByZWRpY2F0ZSh2YWx1ZSwga2V5LCBvYmopID8gcGFzcyA6IGZhaWwpLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICByZXR1cm4gXy5pbml0aWFsKGFycmF5LCBhcnJheS5sZW5ndGggLSBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIE1hdGgubWF4KDAsIGFycmF5Lmxlbmd0aCAtIChuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbikpKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gXy5yZXN0KGFycmF5LCBNYXRoLm1heCgwLCBhcnJheS5sZW5ndGggLSBuKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBuID09IG51bGwgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBzdHJpY3QsIHN0YXJ0SW5kZXgpIHtcbiAgICB2YXIgb3V0cHV0ID0gW10sIGlkeCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IHN0YXJ0SW5kZXggfHwgMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGlucHV0KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdmFsdWUgPSBpbnB1dFtpXTtcbiAgICAgIGlmIChpc0FycmF5TGlrZSh2YWx1ZSkgJiYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpKSB7XG4gICAgICAgIC8vZmxhdHRlbiBjdXJyZW50IGxldmVsIG9mIGFycmF5IG9yIGFyZ3VtZW50cyBvYmplY3RcbiAgICAgICAgaWYgKCFzaGFsbG93KSB2YWx1ZSA9IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIHN0cmljdCk7XG4gICAgICAgIHZhciBqID0gMCwgbGVuID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICBvdXRwdXQubGVuZ3RoICs9IGxlbjtcbiAgICAgICAgd2hpbGUgKGogPCBsZW4pIHtcbiAgICAgICAgICBvdXRwdXRbaWR4KytdID0gdmFsdWVbaisrXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghc3RyaWN0KSB7XG4gICAgICAgIG91dHB1dFtpZHgrK10gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIGZhbHNlKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSB2ZXJzaW9uIG9mIHRoZSBhcnJheSB0aGF0IGRvZXMgbm90IGNvbnRhaW4gdGhlIHNwZWNpZmllZCB2YWx1ZShzKS5cbiAgXy53aXRob3V0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGFycmF5LCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgaWYgKCFfLmlzQm9vbGVhbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRlZTtcbiAgICAgIGl0ZXJhdGVlID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXRlcmF0ZWUgIT0gbnVsbCkgaXRlcmF0ZWUgPSBjYihpdGVyYXRlZSwgY29udGV4dCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChhcnJheSk7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaV0sXG4gICAgICAgICAgY29tcHV0ZWQgPSBpdGVyYXRlZSA/IGl0ZXJhdGVlKHZhbHVlLCBpLCBhcnJheSkgOiB2YWx1ZTtcbiAgICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgICBpZiAoIWkgfHwgc2VlbiAhPT0gY29tcHV0ZWQpIHJlc3VsdC5wdXNoKHZhbHVlKTtcbiAgICAgICAgc2VlbiA9IGNvbXB1dGVkO1xuICAgICAgfSBlbHNlIGlmIChpdGVyYXRlZSkge1xuICAgICAgICBpZiAoIV8uY29udGFpbnMoc2VlbiwgY29tcHV0ZWQpKSB7XG4gICAgICAgICAgc2Vlbi5wdXNoKGNvbXB1dGVkKTtcbiAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIV8uY29udGFpbnMocmVzdWx0LCB2YWx1ZSkpIHtcbiAgICAgICAgcmVzdWx0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoZmxhdHRlbihhcmd1bWVudHMsIHRydWUsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGFyZ3NMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpdGVtID0gYXJyYXlbaV07XG4gICAgICBpZiAoXy5jb250YWlucyhyZXN1bHQsIGl0ZW0pKSBjb250aW51ZTtcbiAgICAgIGZvciAodmFyIGogPSAxOyBqIDwgYXJnc0xlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmICghXy5jb250YWlucyhhcmd1bWVudHNbal0sIGl0ZW0pKSBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChqID09PSBhcmdzTGVuZ3RoKSByZXN1bHQucHVzaChpdGVtKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBmbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSwgdHJ1ZSwgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7XG4gICAgICByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW56aXAoYXJndW1lbnRzKTtcbiAgfTtcblxuICAvLyBDb21wbGVtZW50IG9mIF8uemlwLiBVbnppcCBhY2NlcHRzIGFuIGFycmF5IG9mIGFycmF5cyBhbmQgZ3JvdXBzXG4gIC8vIGVhY2ggYXJyYXkncyBlbGVtZW50cyBvbiBzaGFyZWQgaW5kaWNlc1xuICBfLnVuemlwID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgbGVuZ3RoID0gYXJyYXkgJiYgXy5tYXgoYXJyYXksIGdldExlbmd0aCkubGVuZ3RoIHx8IDA7XG4gICAgdmFyIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICByZXN1bHRbaW5kZXhdID0gXy5wbHVjayhhcnJheSwgaW5kZXgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGdldExlbmd0aChsaXN0KTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gR2VuZXJhdG9yIGZ1bmN0aW9uIHRvIGNyZWF0ZSB0aGUgZmluZEluZGV4IGFuZCBmaW5kTGFzdEluZGV4IGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBjcmVhdGVQcmVkaWNhdGVJbmRleEZpbmRlcihkaXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyYXksIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgcHJlZGljYXRlID0gY2IocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICAgIHZhciBsZW5ndGggPSBnZXRMZW5ndGgoYXJyYXkpO1xuICAgICAgdmFyIGluZGV4ID0gZGlyID4gMCA/IDAgOiBsZW5ndGggLSAxO1xuICAgICAgZm9yICg7IGluZGV4ID49IDAgJiYgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IGRpcikge1xuICAgICAgICBpZiAocHJlZGljYXRlKGFycmF5W2luZGV4XSwgaW5kZXgsIGFycmF5KSkgcmV0dXJuIGluZGV4O1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG4gIH1cblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBpbmRleCBvbiBhbiBhcnJheS1saWtlIHRoYXQgcGFzc2VzIGEgcHJlZGljYXRlIHRlc3RcbiAgXy5maW5kSW5kZXggPSBjcmVhdGVQcmVkaWNhdGVJbmRleEZpbmRlcigxKTtcbiAgXy5maW5kTGFzdEluZGV4ID0gY3JlYXRlUHJlZGljYXRlSW5kZXhGaW5kZXIoLTEpO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRlZSA9IGNiKGl0ZXJhdGVlLCBjb250ZXh0LCAxKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRlZShvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IE1hdGguZmxvb3IoKGxvdyArIGhpZ2gpIC8gMik7XG4gICAgICBpZiAoaXRlcmF0ZWUoYXJyYXlbbWlkXSkgPCB2YWx1ZSkgbG93ID0gbWlkICsgMTsgZWxzZSBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIEdlbmVyYXRvciBmdW5jdGlvbiB0byBjcmVhdGUgdGhlIGluZGV4T2YgYW5kIGxhc3RJbmRleE9mIGZ1bmN0aW9uc1xuICBmdW5jdGlvbiBjcmVhdGVJbmRleEZpbmRlcihkaXIsIHByZWRpY2F0ZUZpbmQsIHNvcnRlZEluZGV4KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpZHgpIHtcbiAgICAgIHZhciBpID0gMCwgbGVuZ3RoID0gZ2V0TGVuZ3RoKGFycmF5KTtcbiAgICAgIGlmICh0eXBlb2YgaWR4ID09ICdudW1iZXInKSB7XG4gICAgICAgIGlmIChkaXIgPiAwKSB7XG4gICAgICAgICAgICBpID0gaWR4ID49IDAgPyBpZHggOiBNYXRoLm1heChpZHggKyBsZW5ndGgsIGkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGVuZ3RoID0gaWR4ID49IDAgPyBNYXRoLm1pbihpZHggKyAxLCBsZW5ndGgpIDogaWR4ICsgbGVuZ3RoICsgMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzb3J0ZWRJbmRleCAmJiBpZHggJiYgbGVuZ3RoKSB7XG4gICAgICAgIGlkeCA9IHNvcnRlZEluZGV4KGFycmF5LCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFycmF5W2lkeF0gPT09IGl0ZW0gPyBpZHggOiAtMTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtICE9PSBpdGVtKSB7XG4gICAgICAgIGlkeCA9IHByZWRpY2F0ZUZpbmQoc2xpY2UuY2FsbChhcnJheSwgaSwgbGVuZ3RoKSwgXy5pc05hTik7XG4gICAgICAgIHJldHVybiBpZHggPj0gMCA/IGlkeCArIGkgOiAtMTtcbiAgICAgIH1cbiAgICAgIGZvciAoaWR4ID0gZGlyID4gMCA/IGkgOiBsZW5ndGggLSAxOyBpZHggPj0gMCAmJiBpZHggPCBsZW5ndGg7IGlkeCArPSBkaXIpIHtcbiAgICAgICAgaWYgKGFycmF5W2lkeF0gPT09IGl0ZW0pIHJldHVybiBpZHg7XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW4gaXRlbSBpbiBhbiBhcnJheSxcbiAgLy8gb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKDEsIF8uZmluZEluZGV4LCBfLnNvcnRlZEluZGV4KTtcbiAgXy5sYXN0SW5kZXhPZiA9IGNyZWF0ZUluZGV4RmluZGVyKC0xLCBfLmZpbmRMYXN0SW5kZXgpO1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKHN0b3AgPT0gbnVsbCkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBzdGVwIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciByYW5nZSA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBsZW5ndGg7IGlkeCsrLCBzdGFydCArPSBzdGVwKSB7XG4gICAgICByYW5nZVtpZHhdID0gc3RhcnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIHRvIGV4ZWN1dGUgYSBmdW5jdGlvbiBhcyBhIGNvbnN0cnVjdG9yXG4gIC8vIG9yIGEgbm9ybWFsIGZ1bmN0aW9uIHdpdGggdGhlIHByb3ZpZGVkIGFyZ3VtZW50c1xuICB2YXIgZXhlY3V0ZUJvdW5kID0gZnVuY3Rpb24oc291cmNlRnVuYywgYm91bmRGdW5jLCBjb250ZXh0LCBjYWxsaW5nQ29udGV4dCwgYXJncykge1xuICAgIGlmICghKGNhbGxpbmdDb250ZXh0IGluc3RhbmNlb2YgYm91bmRGdW5jKSkgcmV0dXJuIHNvdXJjZUZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgdmFyIHNlbGYgPSBiYXNlQ3JlYXRlKHNvdXJjZUZ1bmMucHJvdG90eXBlKTtcbiAgICB2YXIgcmVzdWx0ID0gc291cmNlRnVuYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICBpZiAoXy5pc09iamVjdChyZXN1bHQpKSByZXR1cm4gcmVzdWx0O1xuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQmluZCBtdXN0IGJlIGNhbGxlZCBvbiBhIGZ1bmN0aW9uJyk7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhlY3V0ZUJvdW5kKGZ1bmMsIGJvdW5kLCBjb250ZXh0LCB0aGlzLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9O1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDAsIGxlbmd0aCA9IGJvdW5kQXJncy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IEFycmF5KGxlbmd0aCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFyZ3NbaV0gPSBib3VuZEFyZ3NbaV0gPT09IF8gPyBhcmd1bWVudHNbcG9zaXRpb24rK10gOiBib3VuZEFyZ3NbaV07XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9zaXRpb24gPCBhcmd1bWVudHMubGVuZ3RoKSBhcmdzLnB1c2goYXJndW1lbnRzW3Bvc2l0aW9uKytdKTtcbiAgICAgIHJldHVybiBleGVjdXRlQm91bmQoZnVuYywgYm91bmQsIHRoaXMsIHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gICAgcmV0dXJuIGJvdW5kO1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgaSwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCwga2V5O1xuICAgIGlmIChsZW5ndGggPD0gMSkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBhcmd1bWVudHNbaV07XG4gICAgICBvYmpba2V5XSA9IF8uYmluZChvYmpba2V5XSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtb2l6ZSA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGNhY2hlID0gbWVtb2l6ZS5jYWNoZTtcbiAgICAgIHZhciBhZGRyZXNzID0gJycgKyAoaGFzaGVyID8gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBrZXkpO1xuICAgICAgaWYgKCFfLmhhcyhjYWNoZSwgYWRkcmVzcykpIGNhY2hlW2FkZHJlc3NdID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGNhY2hlW2FkZHJlc3NdO1xuICAgIH07XG4gICAgbWVtb2l6ZS5jYWNoZSA9IHt9O1xuICAgIHJldHVybiBtZW1vaXplO1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IF8ucGFydGlhbChfLmRlbGF5LCBfLCAxKTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gXy5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xuICAgICAgICBpZiAodGltZW91dCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0KSBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuXG4gICAgICBpZiAobGFzdCA8IHdhaXQgJiYgbGFzdCA+PSAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGlmICghdGltZW91dCkgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IF8ubm93KCk7XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIG5lZ2F0ZWQgdmVyc2lvbiBvZiB0aGUgcGFzc2VkLWluIHByZWRpY2F0ZS5cbiAgXy5uZWdhdGUgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgdmFyIHN0YXJ0ID0gYXJncy5sZW5ndGggLSAxO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpID0gc3RhcnQ7XG4gICAgICB2YXIgcmVzdWx0ID0gYXJnc1tzdGFydF0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHdoaWxlIChpLS0pIHJlc3VsdCA9IGFyZ3NbaV0uY2FsbCh0aGlzLCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBvbiBhbmQgYWZ0ZXIgdGhlIE50aCBjYWxsLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCB1cCB0byAoYnV0IG5vdCBpbmNsdWRpbmcpIHRoZSBOdGggY2FsbC5cbiAgXy5iZWZvcmUgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHZhciBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzID4gMCkge1xuICAgICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgICAgaWYgKHRpbWVzIDw9IDEpIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gXy5wYXJ0aWFsKF8uYmVmb3JlLCAyKTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBLZXlzIGluIElFIDwgOSB0aGF0IHdvbid0IGJlIGl0ZXJhdGVkIGJ5IGBmb3Iga2V5IGluIC4uLmAgYW5kIHRodXMgbWlzc2VkLlxuICB2YXIgaGFzRW51bUJ1ZyA9ICF7dG9TdHJpbmc6IG51bGx9LnByb3BlcnR5SXNFbnVtZXJhYmxlKCd0b1N0cmluZycpO1xuICB2YXIgbm9uRW51bWVyYWJsZVByb3BzID0gWyd2YWx1ZU9mJywgJ2lzUHJvdG90eXBlT2YnLCAndG9TdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICdwcm9wZXJ0eUlzRW51bWVyYWJsZScsICdoYXNPd25Qcm9wZXJ0eScsICd0b0xvY2FsZVN0cmluZyddO1xuXG4gIGZ1bmN0aW9uIGNvbGxlY3ROb25FbnVtUHJvcHMob2JqLCBrZXlzKSB7XG4gICAgdmFyIG5vbkVudW1JZHggPSBub25FbnVtZXJhYmxlUHJvcHMubGVuZ3RoO1xuICAgIHZhciBjb25zdHJ1Y3RvciA9IG9iai5jb25zdHJ1Y3RvcjtcbiAgICB2YXIgcHJvdG8gPSAoXy5pc0Z1bmN0aW9uKGNvbnN0cnVjdG9yKSAmJiBjb25zdHJ1Y3Rvci5wcm90b3R5cGUpIHx8IE9ialByb3RvO1xuXG4gICAgLy8gQ29uc3RydWN0b3IgaXMgYSBzcGVjaWFsIGNhc2UuXG4gICAgdmFyIHByb3AgPSAnY29uc3RydWN0b3InO1xuICAgIGlmIChfLmhhcyhvYmosIHByb3ApICYmICFfLmNvbnRhaW5zKGtleXMsIHByb3ApKSBrZXlzLnB1c2gocHJvcCk7XG5cbiAgICB3aGlsZSAobm9uRW51bUlkeC0tKSB7XG4gICAgICBwcm9wID0gbm9uRW51bWVyYWJsZVByb3BzW25vbkVudW1JZHhdO1xuICAgICAgaWYgKHByb3AgaW4gb2JqICYmIG9ialtwcm9wXSAhPT0gcHJvdG9bcHJvcF0gJiYgIV8uY29udGFpbnMoa2V5cywgcHJvcCkpIHtcbiAgICAgICAga2V5cy5wdXNoKHByb3ApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJldHJpZXZlIHRoZSBuYW1lcyBvZiBhbiBvYmplY3QncyBvd24gcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgLy8gQWhlbSwgSUUgPCA5LlxuICAgIGlmIChoYXNFbnVtQnVnKSBjb2xsZWN0Tm9uRW51bVByb3BzKG9iaiwga2V5cyk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgYWxsIHRoZSBwcm9wZXJ0eSBuYW1lcyBvZiBhbiBvYmplY3QuXG4gIF8uYWxsS2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgICAvLyBBaGVtLCBJRSA8IDkuXG4gICAgaWYgKGhhc0VudW1CdWcpIGNvbGxlY3ROb25FbnVtUHJvcHMob2JqLCBrZXlzKTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdGVlIHRvIGVhY2ggZWxlbWVudCBvZiB0aGUgb2JqZWN0XG4gIC8vIEluIGNvbnRyYXN0IHRvIF8ubWFwIGl0IHJldHVybnMgYW4gb2JqZWN0XG4gIF8ubWFwT2JqZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRlZSwgY29udGV4dCkge1xuICAgIGl0ZXJhdGVlID0gY2IoaXRlcmF0ZWUsIGNvbnRleHQpO1xuICAgIHZhciBrZXlzID0gIF8ua2V5cyhvYmopLFxuICAgICAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoLFxuICAgICAgICAgIHJlc3VsdHMgPSB7fSxcbiAgICAgICAgICBjdXJyZW50S2V5O1xuICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5c1tpbmRleF07XG4gICAgICAgIHJlc3VsdHNbY3VycmVudEtleV0gPSBpdGVyYXRlZShvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGNyZWF0ZUFzc2lnbmVyKF8uYWxsS2V5cyk7XG5cbiAgLy8gQXNzaWducyBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgb3duIHByb3BlcnRpZXMgaW4gdGhlIHBhc3NlZC1pbiBvYmplY3QocylcbiAgLy8gKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9hc3NpZ24pXG4gIF8uZXh0ZW5kT3duID0gXy5hc3NpZ24gPSBjcmVhdGVBc3NpZ25lcihfLmtleXMpO1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGtleSBvbiBhbiBvYmplY3QgdGhhdCBwYXNzZXMgYSBwcmVkaWNhdGUgdGVzdFxuICBfLmZpbmRLZXkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSA9IGNiKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKSwga2V5O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZShvYmpba2V5XSwga2V5LCBvYmopKSByZXR1cm4ga2V5O1xuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmplY3QsIG9pdGVyYXRlZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQgPSB7fSwgb2JqID0gb2JqZWN0LCBpdGVyYXRlZSwga2V5cztcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihvaXRlcmF0ZWUpKSB7XG4gICAgICBrZXlzID0gXy5hbGxLZXlzKG9iaik7XG4gICAgICBpdGVyYXRlZSA9IG9wdGltaXplQ2Iob2l0ZXJhdGVlLCBjb250ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5cyA9IGZsYXR0ZW4oYXJndW1lbnRzLCBmYWxzZSwgZmFsc2UsIDEpO1xuICAgICAgaXRlcmF0ZWUgPSBmdW5jdGlvbih2YWx1ZSwga2V5LCBvYmopIHsgcmV0dXJuIGtleSBpbiBvYmo7IH07XG4gICAgICBvYmogPSBPYmplY3Qob2JqKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgdmFyIHZhbHVlID0gb2JqW2tleV07XG4gICAgICBpZiAoaXRlcmF0ZWUodmFsdWUsIGtleSwgb2JqKSkgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IHdpdGhvdXQgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ub21pdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGl0ZXJhdGVlKSkge1xuICAgICAgaXRlcmF0ZWUgPSBfLm5lZ2F0ZShpdGVyYXRlZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5tYXAoZmxhdHRlbihhcmd1bWVudHMsIGZhbHNlLCBmYWxzZSwgMSksIFN0cmluZyk7XG4gICAgICBpdGVyYXRlZSA9IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgcmV0dXJuICFfLmNvbnRhaW5zKGtleXMsIGtleSk7XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gXy5waWNrKG9iaiwgaXRlcmF0ZWUsIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBjcmVhdGVBc3NpZ25lcihfLmFsbEtleXMsIHRydWUpO1xuXG4gIC8vIENyZWF0ZXMgYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGUgZ2l2ZW4gcHJvdG90eXBlIG9iamVjdC5cbiAgLy8gSWYgYWRkaXRpb25hbCBwcm9wZXJ0aWVzIGFyZSBwcm92aWRlZCB0aGVuIHRoZXkgd2lsbCBiZSBhZGRlZCB0byB0aGVcbiAgLy8gY3JlYXRlZCBvYmplY3QuXG4gIF8uY3JlYXRlID0gZnVuY3Rpb24ocHJvdG90eXBlLCBwcm9wcykge1xuICAgIHZhciByZXN1bHQgPSBiYXNlQ3JlYXRlKHByb3RvdHlwZSk7XG4gICAgaWYgKHByb3BzKSBfLmV4dGVuZE93bihyZXN1bHQsIHByb3BzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIChzaGFsbG93LWNsb25lZCkgZHVwbGljYXRlIG9mIGFuIG9iamVjdC5cbiAgXy5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiBfLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogXy5leHRlbmQoe30sIG9iaik7XG4gIH07XG5cbiAgLy8gSW52b2tlcyBpbnRlcmNlcHRvciB3aXRoIHRoZSBvYmosIGFuZCB0aGVuIHJldHVybnMgb2JqLlxuICAvLyBUaGUgcHJpbWFyeSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiwgaW5cbiAgLy8gb3JkZXIgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGludGVybWVkaWF0ZSByZXN1bHRzIHdpdGhpbiB0aGUgY2hhaW4uXG4gIF8udGFwID0gZnVuY3Rpb24ob2JqLCBpbnRlcmNlcHRvcikge1xuICAgIGludGVyY2VwdG9yKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHdoZXRoZXIgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHNldCBvZiBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5pc01hdGNoID0gZnVuY3Rpb24ob2JqZWN0LCBhdHRycykge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKGF0dHJzKSwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gIWxlbmd0aDtcbiAgICB2YXIgb2JqID0gT2JqZWN0KG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICBpZiAoYXR0cnNba2V5XSAhPT0gb2JqW2tleV0gfHwgIShrZXkgaW4gb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PT0gMSAvIGI7XG4gICAgLy8gQSBzdHJpY3QgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkgYmVjYXVzZSBgbnVsbCA9PSB1bmRlZmluZWRgLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gYSA9PT0gYjtcbiAgICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgICBpZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAgIGlmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gICAgLy8gQ29tcGFyZSBgW1tDbGFzc11dYCBuYW1lcy5cbiAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbChhKTtcbiAgICBpZiAoY2xhc3NOYW1lICE9PSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIHJlZ3VsYXIgZXhwcmVzc2lvbnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvZXJjZWQgdG8gc3RyaW5ncyBmb3IgY29tcGFyaXNvbiAoTm90ZTogJycgKyAvYS9pID09PSAnL2EvaScpXG4gICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgICAvLyBQcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCB3cmFwcGVycyBhcmUgZXF1aXZhbGVudDsgdGh1cywgYFwiNVwiYCBpc1xuICAgICAgICAvLyBlcXVpdmFsZW50IHRvIGBuZXcgU3RyaW5nKFwiNVwiKWAuXG4gICAgICAgIHJldHVybiAnJyArIGEgPT09ICcnICsgYjtcbiAgICAgIGNhc2UgJ1tvYmplY3QgTnVtYmVyXSc6XG4gICAgICAgIC8vIGBOYU5gcyBhcmUgZXF1aXZhbGVudCwgYnV0IG5vbi1yZWZsZXhpdmUuXG4gICAgICAgIC8vIE9iamVjdChOYU4pIGlzIGVxdWl2YWxlbnQgdG8gTmFOXG4gICAgICAgIGlmICgrYSAhPT0gK2EpIHJldHVybiArYiAhPT0gK2I7XG4gICAgICAgIC8vIEFuIGBlZ2FsYCBjb21wYXJpc29uIGlzIHBlcmZvcm1lZCBmb3Igb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICAgIHJldHVybiArYSA9PT0gMCA/IDEgLyArYSA9PT0gMSAvIGIgOiArYSA9PT0gK2I7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT09ICtiO1xuICAgIH1cblxuICAgIHZhciBhcmVBcnJheXMgPSBjbGFzc05hbWUgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgaWYgKCFhcmVBcnJheXMpIHtcbiAgICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHMgb3IgYEFycmF5YHNcbiAgICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgICB2YXIgYUN0b3IgPSBhLmNvbnN0cnVjdG9yLCBiQ3RvciA9IGIuY29uc3RydWN0b3I7XG4gICAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiBhQ3RvciBpbnN0YW5jZW9mIGFDdG9yICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiBiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2NvbnN0cnVjdG9yJyBpbiBhICYmICdjb25zdHJ1Y3RvcicgaW4gYikpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gICAgLy8gc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMywgYWJzdHJhY3Qgb3BlcmF0aW9uIGBKT2AuXG5cbiAgICAvLyBJbml0aWFsaXppbmcgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgLy8gSXQncyBkb25lIGhlcmUgc2luY2Ugd2Ugb25seSBuZWVkIHRoZW0gZm9yIG9iamVjdHMgYW5kIGFycmF5cyBjb21wYXJpc29uLlxuICAgIGFTdGFjayA9IGFTdGFjayB8fCBbXTtcbiAgICBiU3RhY2sgPSBiU3RhY2sgfHwgW107XG4gICAgdmFyIGxlbmd0aCA9IGFTdGFjay5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAvLyBMaW5lYXIgc2VhcmNoLiBQZXJmb3JtYW5jZSBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2ZcbiAgICAgIC8vIHVuaXF1ZSBuZXN0ZWQgc3RydWN0dXJlcy5cbiAgICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09PSBiO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcblxuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChhcmVBcnJheXMpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgbGVuZ3RoID0gYS5sZW5ndGg7XG4gICAgICBpZiAobGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgICBpZiAoIWVxKGFbbGVuZ3RoXSwgYltsZW5ndGhdLCBhU3RhY2ssIGJTdGFjaykpIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhhKSwga2V5O1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcyBiZWZvcmUgY29tcGFyaW5nIGRlZXAgZXF1YWxpdHkuXG4gICAgICBpZiAoXy5rZXlzKGIpLmxlbmd0aCAhPT0gbGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyXG4gICAgICAgIGtleSA9IGtleXNbbGVuZ3RoXTtcbiAgICAgICAgaWYgKCEoXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChpc0FycmF5TGlrZShvYmopICYmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikgfHwgXy5pc0FyZ3VtZW50cyhvYmopKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgcmV0dXJuIF8ua2V5cyhvYmopLmxlbmd0aCA9PT0gMDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIG9iajtcbiAgICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09PSAnb2JqZWN0JyAmJiAhIW9iajtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cCwgaXNFcnJvci5cbiAgXy5lYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnLCAnRXJyb3InXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFIDwgOSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIF8uaGFzKG9iaiwgJ2NhbGxlZScpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuIFdvcmsgYXJvdW5kIHNvbWUgdHlwZW9mIGJ1Z3MgaW4gb2xkIHY4LFxuICAvLyBJRSAxMSAoIzE2MjEpLCBhbmQgaW4gU2FmYXJpIDggKCMxOTI5KS5cbiAgaWYgKHR5cGVvZiAvLi8gIT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgSW50OEFycmF5ICE9ICdvYmplY3QnKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIG9iaiAhPSBudWxsICYmIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0ZWVzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLy8gUHJlZGljYXRlLWdlbmVyYXRpbmcgZnVuY3Rpb25zLiBPZnRlbiB1c2VmdWwgb3V0c2lkZSBvZiBVbmRlcnNjb3JlLlxuICBfLmNvbnN0YW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLm5vb3AgPSBmdW5jdGlvbigpe307XG5cbiAgXy5wcm9wZXJ0eSA9IHByb3BlcnR5O1xuXG4gIC8vIEdlbmVyYXRlcyBhIGZ1bmN0aW9uIGZvciBhIGdpdmVuIG9iamVjdCB0aGF0IHJldHVybnMgYSBnaXZlbiBwcm9wZXJ0eS5cbiAgXy5wcm9wZXJ0eU9mID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PSBudWxsID8gZnVuY3Rpb24oKXt9IDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2ZcbiAgLy8gYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlciA9IF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgYXR0cnMgPSBfLmV4dGVuZE93bih7fSwgYXR0cnMpO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBfLmlzTWF0Y2gob2JqLCBhdHRycyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdGVlLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGl0ZXJhdGVlID0gb3B0aW1pemVDYihpdGVyYXRlZSwgY29udGV4dCwgMSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0ZWUoaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlc2NhcGVNYXAgPSB7XG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiN4Mjc7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG4gIH07XG4gIHZhciB1bmVzY2FwZU1hcCA9IF8uaW52ZXJ0KGVzY2FwZU1hcCk7XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICB2YXIgY3JlYXRlRXNjYXBlciA9IGZ1bmN0aW9uKG1hcCkge1xuICAgIHZhciBlc2NhcGVyID0gZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG4gICAgLy8gUmVnZXhlcyBmb3IgaWRlbnRpZnlpbmcgYSBrZXkgdGhhdCBuZWVkcyB0byBiZSBlc2NhcGVkXG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsgXy5rZXlzKG1hcCkuam9pbignfCcpICsgJyknO1xuICAgIHZhciB0ZXN0UmVnZXhwID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgdmFyIHJlcGxhY2VSZWdleHAgPSBSZWdFeHAoc291cmNlLCAnZycpO1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgIHJldHVybiB0ZXN0UmVnZXhwLnRlc3Qoc3RyaW5nKSA/IHN0cmluZy5yZXBsYWNlKHJlcGxhY2VSZWdleHAsIGVzY2FwZXIpIDogc3RyaW5nO1xuICAgIH07XG4gIH07XG4gIF8uZXNjYXBlID0gY3JlYXRlRXNjYXBlcihlc2NhcGVNYXApO1xuICBfLnVuZXNjYXBlID0gY3JlYXRlRXNjYXBlcih1bmVzY2FwZU1hcCk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSwgZmFsbGJhY2spIHtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3QgPT0gbnVsbCA/IHZvaWQgMCA6IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgaWYgKHZhbHVlID09PSB2b2lkIDApIHtcbiAgICAgIHZhbHVlID0gZmFsbGJhY2s7XG4gICAgfVxuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHUyMDI4fFxcdTIwMjkvZztcblxuICB2YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdO1xuICB9O1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIC8vIE5COiBgb2xkU2V0dGluZ3NgIG9ubHkgZXhpc3RzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIHNldHRpbmdzLCBvbGRTZXR0aW5ncykge1xuICAgIGlmICghc2V0dGluZ3MgJiYgb2xkU2V0dGluZ3MpIHNldHRpbmdzID0gb2xkU2V0dGluZ3M7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KS5yZXBsYWNlKGVzY2FwZXIsIGVzY2FwZUNoYXIpO1xuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH0gZWxzZSBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9IGVsc2UgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkb2JlIFZNcyBuZWVkIHRoZSBtYXRjaCByZXR1cm5lZCB0byBwcm9kdWNlIHRoZSBjb3JyZWN0IG9mZmVzdC5cbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArICdyZXR1cm4gX19wO1xcbic7XG5cbiAgICB0cnkge1xuICAgICAgdmFyIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB2YXIgYXJndW1lbnQgPSBzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJztcbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIGFyZ3VtZW50ICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24uIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBpbnN0YW5jZSA9IF8ob2JqKTtcbiAgICBpbnN0YW5jZS5fY2hhaW4gPSB0cnVlO1xuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24oaW5zdGFuY2UsIG9iaikge1xuICAgIHJldHVybiBpbnN0YW5jZS5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBfLmVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIF8uZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PT0gJ3NoaWZ0JyB8fCBuYW1lID09PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgXy5lYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0KHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgXy5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgfTtcblxuICAvLyBQcm92aWRlIHVud3JhcHBpbmcgcHJveHkgZm9yIHNvbWUgbWV0aG9kcyB1c2VkIGluIGVuZ2luZSBvcGVyYXRpb25zXG4gIC8vIHN1Y2ggYXMgYXJpdGhtZXRpYyBhbmQgSlNPTiBzdHJpbmdpZmljYXRpb24uXG4gIF8ucHJvdG90eXBlLnZhbHVlT2YgPSBfLnByb3RvdHlwZS50b0pTT04gPSBfLnByb3RvdHlwZS52YWx1ZTtcblxuICBfLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAnJyArIHRoaXMuX3dyYXBwZWQ7XG4gIH07XG5cbiAgLy8gQU1EIHJlZ2lzdHJhdGlvbiBoYXBwZW5zIGF0IHRoZSBlbmQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQgbG9hZGVyc1xuICAvLyB0aGF0IG1heSBub3QgZW5mb3JjZSBuZXh0LXR1cm4gc2VtYW50aWNzIG9uIG1vZHVsZXMuIEV2ZW4gdGhvdWdoIGdlbmVyYWxcbiAgLy8gcHJhY3RpY2UgZm9yIEFNRCByZWdpc3RyYXRpb24gaXMgdG8gYmUgYW5vbnltb3VzLCB1bmRlcnNjb3JlIHJlZ2lzdGVyc1xuICAvLyBhcyBhIG5hbWVkIG1vZHVsZSBiZWNhdXNlLCBsaWtlIGpRdWVyeSwgaXQgaXMgYSBiYXNlIGxpYnJhcnkgdGhhdCBpc1xuICAvLyBwb3B1bGFyIGVub3VnaCB0byBiZSBidW5kbGVkIGluIGEgdGhpcmQgcGFydHkgbGliLCBidXQgbm90IGJlIHBhcnQgb2ZcbiAgLy8gYW4gQU1EIGxvYWQgcmVxdWVzdC4gVGhvc2UgY2FzZXMgY291bGQgZ2VuZXJhdGUgYW4gZXJyb3Igd2hlbiBhblxuICAvLyBhbm9ueW1vdXMgZGVmaW5lKCkgaXMgY2FsbGVkIG91dHNpZGUgb2YgYSBsb2FkZXIgcmVxdWVzdC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59LmNhbGwodGhpcykpO1xuIiwiLyoqXG4gKiBnaXZlbiBhbiBhcnJheSBvZiBudW1iZXJzLCByZXR1cm4gdGhlIGluZGV4IGF0IHdoaWNoIHRoZSB2YWx1ZSB3b3VsZCBmYWxsXG4gKiBzdW1taW5nIHRoZSBhcnJheSBhcyB5b3UgZ29cbiAqIEBwYXJhbSAge2FycmF5fSBhcnIgYXJyYXkgb2YgbnVtYmVyc1xuICogQHBhcmFtICB7bnVtYmVyfSB2YWwgZ2V0IHRoZSBpbmRleCB3aGVyZSB0aGlzIHdvdWxkIGZhbGxcbiAqIEByZXR1cm4ge251bWJlcn0gICAgIGluZGV4IG9yIC0xIGlmIG5vdCBmb3VuZFxuICovXG5mdW5jdGlvbiBjb250YWlucyhhcnIsIHZhbCkge1xuICAgIHZhciB0b3RhbCA9IDAsXG4gICAgICAgIGxlbiA9IGFyci5sZW5ndGgsXG4gICAgICAgIGk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdG90YWwgKz0gYXJyW2ldO1xuXG4gICAgICAgIGlmICh2YWwgPCB0b3RhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gLTE7XG59XG5cblxuLyoqXG4gKiBjb25zdWx0IHRoZSBuZWFyZXN0IGtpbmRlcmdhcnRlbiB0ZWFjaGVyLi4uXG4gKi9cbmZ1bmN0aW9uIGFkZChhLCBiKSB7XG4gICAgcmV0dXJuIGEgKyBiO1xufVxuXG4vKipcbiAqIHN1bSB1bnRpbCB0aGUgZ2l2ZW4gaW5kZXhcbiAqIEBwYXJhbSAge2FycmF5fSBhcnIgYXJyYXkgdG8gcGFydGlhbCBzdW1cbiAqIEBwYXJhbSAge251bWJlcn0gaWR4IGluZGV4XG4gKiBAcmV0dXJuIHtudW1iZXJ9ICAgICBwYXJ0aWFsIHN1bVxuICovXG5mdW5jdGlvbiBwYXJ0aWFsU3VtKGFyciwgaWR4KSB7XG4gICAgdmFyIHN1YnNldCA9IGFyci5zbGljZSgwLCBpZHgpO1xuXG4gICAgcmV0dXJuIHN1YnNldC5yZWR1Y2UoYWRkLCAwKTtcbn1cblxuXG4vKipcbiAqIG1hcCBvdmVyIGFuIGFycmF5IHJldHVybmluZyBhbiBhcnJheSBvZiB0aGUgc2FtZSBsZW5ndGggY29udGFpbmluZyB0aGVcbiAqIHN1bSBhdCBlYWNoIHBsYWNlXG4gKiBAcGFyYW0gIHthcnJheX0gYXJyIGFuIGFycmF5IG9mIG51bWJlcnNcbiAqIEByZXR1cm4ge2FycmF5fSAgICAgdGhlIGFycmF5IG9mIHN1bXNcbiAqL1xuZnVuY3Rpb24gcnVubmluZ1N1bXMoYXJyKSB7XG4gICAgdmFyIHN1bSA9IDA7XG5cbiAgICByZXR1cm4gYXJyLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBzdW0gKz0gaXRlbTtcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIGdpdmVuIGFuIGFycmF5IG9mIGJvYXJkZXJzLCBnZW5lcmF0ZSBhIHNldCBvZiB4LWNvb3JkcyB0aGF0IHJlcHJlc2VudHMgdGhlXG4gKiB0aGUgYXJlYSBhcm91bmQgdGhlIGJvYXJkZXJzICsvLSB0aGUgdGhyZXNob2xkIGdpdmVuXG4gKiBAcGFyYW0gIHthcnJheX0gYXJyICAgIGFycmF5IG9mIGJvcmRlcnNcbiAqIEBwYXJhbSAge251bWJlcn0gdGhyZXNoIHRoZSB0aHJlc2hvbGQgYXJvdW5kIGVhY2hcbiAqIEByZXR1cm4ge2FycmF5fSAgICAgICAgYW4gYXJyYXkgb2YgYXJyYXlzXG4gKi9cbmZ1bmN0aW9uIGdlbkZ1enp5Qm9yZGVycyhhcnIsIHRocmVzaCkge1xuICAgIHZhciBsZW4gPSBhcnIubGVuZ3RoLFxuICAgICAgICBib3JkZXJzID0gW1xuICAgICAgICAgICAgWzAsIHRocmVzaF1cbiAgICAgICAgXSxcbiAgICAgICAgbWF4UmlnaHQgPSBhcnIucmVkdWNlKGFkZCwgMCksXG4gICAgICAgIHN1bXMgPSBydW5uaW5nU3VtcyhhcnIpLFxuICAgICAgICBpLCBjdXJyO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGN1cnIgPSBzdW1zW2ldO1xuXG4gICAgICAgIGJvcmRlcnMucHVzaChbXG4gICAgICAgICAgICBNYXRoLm1heCgwLCBjdXJyIC0gdGhyZXNoKSxcbiAgICAgICAgICAgIE1hdGgubWluKGN1cnIgKyB0aHJlc2gsIG1heFJpZ2h0KVxuICAgICAgICBdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYm9yZGVyc1xufVxuXG5cbi8qKlxuICogQSB2ZXJzaW9uIG9mIHRoZSBmaW5kSW5kZXggcG9seWZpbGwgZm91bmQgaGVyZTpcbiAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L2ZpbmRJbmRleFxuICpcbiAqIGFkYXB0ZWQgdG8gcnVuIGFzIHN0YW5kIGFsb25lIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGZpbmRJbmRleChsc3QsIHByZWRpY2F0ZSkge1xuXG4gICAgdmFyIGxpc3QgPSBPYmplY3QobHN0KTtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGggPj4+IDA7XG4gICAgdmFyIHZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChudWxsLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn07XG5cblxuZnVuY3Rpb24gaW5SYW5nZShyYW5nZSwgdmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgPj0gcmFuZ2VbMF0gJiYgdmFsdWUgPD0gcmFuZ2VbMV07XG59XG5cbi8qKlxuICogcmV0dXJuIHdoYXRldmVyIGdldHMgcGFzc2VkIGluLiBjYW4gYmUgdXNlZnVsIGluIGEgZmlsdGVyIGZ1bmN0aW9uIHdoZXJlXG4gKiB0cnV0aHkgdmFsdWVzIGFyZSB0aGUgb25seSB2YWxpZCBvbmVzXG4gKiBAcGFyYW0gIHthbnl9IGFyZyBhbnkgdmFsdWVcbiAqIEByZXR1cm4ge2FueX0gICAgIHdoYXRldmVyIHdhcyBwYXNzZWQgaW5cbiAqL1xuZnVuY3Rpb24gaWRlbnRpdHkoYXJnKSB7XG4gICAgcmV0dXJuIGFyZztcbn1cblxuLyoqXG4gKiBtb3ZlIGFuIGFycmF5IGluZGV4IHRvIHRoZSAnYm9yZGVyJyBwYXNzZWQgaW4uIHRoZSBib3JkZXJzIGFyZSBub3QgYXJyYXlcbiAqIGluZGV4ZXMsIHRoZXkgYXJlIHRoZSBudW1iZXJzIGluIHRoZSBmb2xsb3dpbmcgZGlhZ3JhbTpcbiAqXG4gKiB8MHxfX19fdmFsX19fX3wxfF9fX19fdmFsX19fX198MnxfX19fX3ZhbF9fX198M3wgZXRjXG4gKlxuICogKiogQWxsIGNvbHVtbiB2YWx1ZXMgYXJlIGFzc3VtZWQgdG8gYmUgdHJ1dGh5IChvYmplY3RzIGluIG1pbmQuLi4pICoqXG4gKlxuICogQHBhcmFtICB7YXJyYXl9IGFyciAgICAgIGFycmF5IHRvIHJlb3JkZXIsIG5vdCBtdXRhdGVkXG4gKiBAcGFyYW0gIHtudW1iZXJ9IGZyb20gICAgIG5vcm1hbCBpbmRleCBvZiBjb2x1bW4gdG8gbW92ZVxuICogQHBhcmFtICB7bnVtYmVyfSB0b0JvcmRlciBib3JkZXIgaW5kZXhcbiAqIEByZXR1cm4ge2FycmF5fSAgICAgICAgICBuZXcgYXJyYXkgaW4gbmV3IG9yZGVyXG4gKi9cbmZ1bmN0aW9uIG1vdmVJZHgoYXJyLCBmcm9tLCB0b0JvcmRlcikge1xuICAgIHZhciByZW9yZGVyZCA9IGFyci5zbGljZSgpLFxuICAgICAgICBtb3ZlciA9IHJlb3JkZXJkLnNwbGljZShmcm9tLCAxLCB1bmRlZmluZWQpWzBdO1xuXG4gICAgcmVvcmRlcmQuc3BsaWNlKHRvQm9yZGVyLCAxLCBtb3ZlciwgcmVvcmRlcmRbdG9Cb3JkZXJdKTtcblxuICAgIHJldHVybiByZW9yZGVyZC5maWx0ZXIoaWRlbnRpdHkpO1xufVxuXG5cblxuZnVuY3Rpb24gaW5pdChzZWxmLCBkaXZIZWFkZXIpIHtcblxuXG4gICAgdmFyIHdpZHRocyA9IHNlbGYuZ2V0Q29sdW1ucygpLm1hcChmdW5jdGlvbihjb2wpIHtcbiAgICAgICAgcmV0dXJuIGNvbC5nZXRXaWR0aCgpO1xuICAgIH0pLFxuICAgICAgICByZXNpemVUaHJlc2ggPSA1LFxuICAgICAgICBmdXp6eUJvcmRlcnMgPSBnZW5GdXp6eUJvcmRlcnMod2lkdGhzLCByZXNpemVUaHJlc2gpLFxuICAgICAgICBpbnNlcnRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICBoZWFkZXJDYW52YXMgPSBzZWxmLmdldEhlYWRlckNhbnZhcygpLFxuICAgICAgICBoZWFkZXJSZWN0ID0gaGVhZGVyQ2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICBkcmFnSGVhZGVyLCBtb3VzZURvd24sIHgsIHksIHN0YXJ0aW5nVHJhbnMsIHJlc2l6aW5nLFxuICAgICAgICByZXNpemluZ0NvbHMsIGNsaWNrZWRDb2wsIGJvcmRlckhpdCwgcmVvcmRlcmluZztcblxuXG5cbiAgICBpbnNlcnRlci5zdHlsZS5oZWlnaHQgPSAnMjBweCc7XG4gICAgaW5zZXJ0ZXIuc3R5bGUud2lkdGggPSAnNXB4JztcbiAgICBpbnNlcnRlci5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnZ29sZGVucm9kJztcbiAgICBpbnNlcnRlci5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgaW5zZXJ0ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICBpbnNlcnRlci50b3AgPSAwO1xuICAgIGluc2VydGVyLmxlZnQgPSAwO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpbnNlcnRlcik7XG5cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgICB2YXIgeE1vdmVtZW50LCB5TW92ZW1lbnQsIG1vdmVtZW50U3RyaW5nLFxuICAgICAgICAgICAgbGVmdCA9IGhlYWRlclJlY3QubGVmdCxcbiAgICAgICAgICAgIHJhbmdlRnVuYywgbm9ybWFsaXplZEJvcmRlcnMsXG4gICAgICAgICAgICBpbnNlcnRlckxlZnQsIGFjdGl2ZUNvbCwgYWN0aXZlQ29sV2lkdGgsXG4gICAgICAgICAgICBjb2xSZXNpemVJbmRleDtcblxuICAgICAgICB3aWR0aHMgPSBzZWxmLmdldENvbHVtbnMoKS5tYXAoZnVuY3Rpb24oY29sKSB7XG4gICAgICAgICAgICByZXR1cm4gY29sLmdldFdpZHRoKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1enp5Qm9yZGVycyA9IGdlbkZ1enp5Qm9yZGVycyh3aWR0aHMsIHJlc2l6ZVRocmVzaCksXG5cbiAgICAgICAgcmFuZ2VGdW5jID0gZnVuY3Rpb24ocmFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybiBpblJhbmdlKHJhbmdlLCBlLngpO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9ybWFsaXplZEJvcmRlcnMgPSBmdXp6eUJvcmRlcnMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLm1hcChhZGQuYmluZChudWxsLCBsZWZ0KSk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgaWYgKCFyZXNpemluZykge1xuICAgICAgICAgICAgYm9yZGVySGl0ID0gZmluZEluZGV4KG5vcm1hbGl6ZWRCb3JkZXJzLCByYW5nZUZ1bmMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCAoIHJlc2l6aW5nIHx8IChib3JkZXJIaXQgIT09IC0xKSkgJiYgIXJlb3JkZXJpbmcgKSB7XG4gICAgICAgICAgICBkaXZIZWFkZXIuc3R5bGUuY3Vyc29yID0gJ2NvbC1yZXNpemUnO1xuICAgICAgICAgICAgcmVzaXppbmdDb2xzID0gdHJ1ZTtcblxuICAgICAgICAgICAgaWYgKG1vdXNlRG93bikge1xuICAgICAgICAgICAgICAgIGlmIChib3JkZXJIaXQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbFJlc2l6ZUluZGV4ID0gY2xpY2tlZENvbDtcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlQ29sID0gc2VsZi5nZXRDb2x1bW5zKClbY29sUmVzaXplSW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb2xXaWR0aCA9IGFjdGl2ZUNvbC5nZXRXaWR0aCgpO1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb2wuc2V0V2lkdGgoTWF0aC5tYXgoMCwgYWN0aXZlQ29sV2lkdGggKyAoZS54IC0geCkpKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wYWludEFsbCgpO1xuICAgICAgICAgICAgICAgICAgICByZXNpemluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHggPSBlLng7XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChtb3VzZURvd24gJiYgZHJhZ0hlYWRlciAmJiAoZS54ID49IGhlYWRlclJlY3QubGVmdCkgJiYgKGUueCA8PSAoaGVhZGVyUmVjdC5sZWZ0ICsgaGVhZGVyUmVjdC53aWR0aCkpICYmICFyZXNpemluZ0NvbHMpIHtcblxuICAgICAgICAgICAgcmVvcmRlcmluZyA9IHRydWU7XG5cbiAgICAgICAgICAgIHhNb3ZlbWVudCA9IHN0YXJ0aW5nVHJhbnNbMF0gLSAoeCAtIGUueCk7XG4gICAgICAgICAgICB5TW92ZW1lbnQgPSAwO1xuXG4gICAgICAgICAgICBtb3ZlbWVudFN0cmluZyA9IFsndHJhbnNsYXRlWCgnLFxuICAgICAgICAgICAgICAgIHhNb3ZlbWVudCxcbiAgICAgICAgICAgICAgICAncHgpIHRyYW5zbGF0ZVkoJyxcbiAgICAgICAgICAgICAgICB5TW92ZW1lbnQsXG4gICAgICAgICAgICAgICAgJ3B4KSdcbiAgICAgICAgICAgIF0uam9pbignJyk7XG5cbiAgICAgICAgICAgIGRyYWdIZWFkZXIuc3R5bGUudHJhbnNmb3JtID0gbW92ZW1lbnRTdHJpbmc7XG4gICAgICAgICAgICBkcmFnSGVhZGVyLnN0eWxlLnpJbmRleCA9IDEwO1xuXG4gICAgICAgICAgICBpZiAoYm9yZGVySGl0ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGluc2VydGVyTGVmdCA9IG5vcm1hbGl6ZWRCb3JkZXJzW2JvcmRlckhpdF1bMF07XG4gICAgICAgICAgICAgICAgaW5zZXJ0ZXIuc3R5bGUubGVmdCA9IGluc2VydGVyTGVmdDtcbiAgICAgICAgICAgICAgICBpbnNlcnRlci5zdHlsZS50b3AgPSBoZWFkZXJSZWN0LnRvcDtcbiAgICAgICAgICAgICAgICBpbnNlcnRlci5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRpdkhlYWRlci5zdHlsZS5jdXJzb3IgPSAnYXV0byc7XG4gICAgICAgICAgICByZXNpemluZ0NvbHMgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0pXG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oZXZudCkge1xuICAgICAgICB2YXIgcmVvcmRlcmVkO1xuXG4gICAgICAgIHggPSB5ID0gMDtcblxuICAgICAgICBpZiAoZHJhZ0hlYWRlcikge1xuICAgICAgICAgICAgZHJhZ0hlYWRlci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRyYWdIZWFkZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJhZ0hlYWRlciA9IG51bGw7XG4gICAgICAgIHN0YXJ0aW5nVHJhbnMgPSBbMCwgMF07XG4gICAgICAgIG1vdXNlRG93biA9IGZhbHNlO1xuICAgICAgICByZXNpemluZyA9IGZhbHNlO1xuICAgICAgICByZW9yZGVyaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKGJvcmRlckhpdCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJlb3JkZXJlZCA9IG1vdmVJZHgoc2VsZi5nZXRDb2x1bW5zKCksIGNsaWNrZWRDb2wsIGJvcmRlckhpdCk7XG4gICAgICAgICAgICBzZWxmLnNldENvbHVtbnMocmVvcmRlcmVkKTtcbiAgICAgICAgICAgIHNlbGYucGFpbnRBbGwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc2VydGVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIGhlYWRlclJlY3QgPSBoZWFkZXJDYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGZ1enp5Qm9yZGVycyA9IGdlbkZ1enp5Qm9yZGVycyh3aWR0aHMsIHJlc2l6ZVRocmVzaCk7XG4gICAgICAgIHdpZHRocyA9IHNlbGYuZ2V0Q29sdW1ucygpLm1hcChmdW5jdGlvbihjb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBjb2wuZ2V0V2lkdGgoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9KVxuXG5cbiAgICBkaXZIZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24oZXZudCkge1xuICAgICAgICBtb3VzZURvd24gPSB0cnVlO1xuXG4gICAgICAgIHdpZHRocyA9IHNlbGYuZ2V0Q29sdW1ucygpLm1hcChmdW5jdGlvbihjb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBjb2wuZ2V0V2lkdGgoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2xpY2tlZENvbCA9IGNvbnRhaW5zKHdpZHRocywgZXZudC5vZmZzZXRYKTtcblxuICAgICAgICB4ID0gZXZudC54O1xuICAgICAgICB5ID0gZXZudC55O1xuXG5cbiAgICAgICAgaWYgKHJlc2l6aW5nQ29scykge1xuICAgICAgICAgICAgLy8gYWx3YXlzIHJlc2l6ZSBsIHRvIHIgXG4gICAgICAgICAgICBjbGlja2VkQ29sID0gY29udGFpbnMod2lkdGhzLCBldm50Lm9mZnNldFggLSByZXNpemVUaHJlc2gpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBncm9zcy4uLi5cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb2xPZmZzZXQgPSBwYXJ0aWFsU3VtKHdpZHRocywgY2xpY2tlZENvbCksXG4gICAgICAgICAgICBpbWFnZSA9IG5ldyBJbWFnZSgpLFxuICAgICAgICAgICAgc3ViQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyksXG4gICAgICAgICAgICBzdWJDdHggPSBzdWJDYW52YXMuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIGNsaWNrZWRDb2xXaWR0aCA9IHdpZHRoc1tjbGlja2VkQ29sXSxcbiAgICAgICAgICAgIHRyYW5zZm9ybSwgY3R4O1xuXG4gICAgICAgIC8vIGJvZHkgaXMgcHJvYiBub3QgdGhlIGJlc3Qgc3BvdCBmb3IgdGhpcy4uLiBcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzdWJDYW52YXMpO1xuXG4gICAgICAgIGhlYWRlclJlY3QgPSBoZWFkZXJDYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGZ1enp5Qm9yZGVycyA9IGdlbkZ1enp5Qm9yZGVycyh3aWR0aHMsIHJlc2l6ZVRocmVzaCk7XG5cbiAgICAgICAgY3R4ID0gaGVhZGVyQ2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgc3ViQ2FudmFzLndpZHRoID0gY2xpY2tlZENvbFdpZHRoO1xuICAgICAgICBzdWJDYW52YXMuaGVpZ2h0ID0gMjA7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS5vcGFjaXR5ID0gJy40NSc7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS5sZWZ0ID0gZXZudC54IC0gKGV2bnQub2Zmc2V0WCAtIGNvbE9mZnNldCk7XG4gICAgICAgIHN1YkNhbnZhcy5zdHlsZS50b3AgPSBoZWFkZXJSZWN0LnRvcDtcbiAgICAgICAgc3ViQ2FudmFzLnN0eWxlLmN1cnNvciA9ICdwb2ludGVyJztcblxuICAgICAgICBzdWJDdHguZHJhd0ltYWdlKFxuICAgICAgICAgICAgaGVhZGVyQ2FudmFzLFxuICAgICAgICAgICAgY29sT2Zmc2V0LCAvLyBzeCwgXG4gICAgICAgICAgICAwLCAvLyBzeSwgXG4gICAgICAgICAgICBjbGlja2VkQ29sV2lkdGgsIC8vIHNXaWR0aCwgXG4gICAgICAgICAgICAyMCwgLy8gc0hlaWdodCwgXG4gICAgICAgICAgICAwLCAvLyBkeCwgXG4gICAgICAgICAgICAwLCAvLyBkeSwgXG4gICAgICAgICAgICBjbGlja2VkQ29sV2lkdGgsXG4gICAgICAgICAgICAyMCk7XG5cblxuICAgICAgICBkcmFnSGVhZGVyID0gc3ViQ2FudmFzO1xuXG4gICAgICAgIHRyYW5zZm9ybSA9IGRyYWdIZWFkZXIuc3R5bGUudHJhbnNmb3JtO1xuXG4gICAgICAgIHN0YXJ0aW5nVHJhbnMgPSB0cmFuc2Zvcm0ubWF0Y2goLyhbXihdP1xcZCspL2cpIHx8IFswLCAwXTtcbiAgICB9KTtcblxufVxuXG5leHBvcnRzLmluaXQgPSBpbml0OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRSZW5kZXJlciA9IHJlcXVpcmUoJy4vZGVmYXVsdGNlbGxyZW5kZXJlci5qcycpO1xuXG52YXIgQ29sdW1uID0gZnVuY3Rpb24oZ3JpZCwgZmllbGQsIGxhYmVsLCB0eXBlLCB3aWR0aCwgcmVuZGVyZXIpIHtcblxuICAgIHJlbmRlcmVyID0gcmVuZGVyZXIgfHwgZGVmYXVsdFJlbmRlcmVyO1xuXG4gICAgdGhpcy5nZXRHcmlkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBncmlkO1xuICAgIH07XG5cbiAgICB0aGlzLnNldEdyaWQgPSBmdW5jdGlvbihuZXdHcmlkKSB7XG4gICAgICAgIGdyaWQgPSBuZXdHcmlkO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEZpZWxkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmaWVsZDtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRGaWVsZCA9IGZ1bmN0aW9uKG5ld0ZpZWxkKSB7XG4gICAgICAgIGZpZWxkID0gbmV3RmllbGQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0TGFiZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGxhYmVsO1xuICAgIH07XG5cbiAgICB0aGlzLnNldExhYmVsID0gZnVuY3Rpb24obmV3TGFiZWwpIHtcbiAgICAgICAgbGFiZWwgPSBuZXdMYWJlbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRUeXBlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0eXBlO1xuICAgIH07XG5cbiAgICB0aGlzLnNldFR5cGUgPSBmdW5jdGlvbihuZXdUeXBlKSB7XG4gICAgICAgIHR5cGUgPSBuZXdUeXBlO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFJlbmRlcmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiByZW5kZXJlcjtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRSZW5kZXJlciA9IGZ1bmN0aW9uKG5ld1JlbmRlcmVyKSB7XG4gICAgICAgIHJlbmRlcmVyID0gbmV3UmVuZGVyZXI7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0V2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHdpZHRoO1xuICAgIH07XG5cbiAgICB0aGlzLnNldFdpZHRoID0gZnVuY3Rpb24obmV3V2lkdGgpIHtcbiAgICAgICAgd2lkdGggPSBuZXdXaWR0aDtcbiAgICB9O1xufTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ29sdW1uOyIsIid1c2Ugc3RyaWN0JztcblxuXG52YXIgcGFpbnQgPSBmdW5jdGlvbihnYywgY29uZmlnKSB7XG5cbiAgICB2YXIgdmFsdWUgPSBjb25maWcudmFsdWU7XG4gICAgdmFyIGJvdW5kcyA9IGNvbmZpZy5ib3VuZHM7XG5cbiAgICB2YXIgeCA9IGJvdW5kcy54O1xuICAgIHZhciB5ID0gYm91bmRzLnk7XG4gICAgdmFyIHdpZHRoID0gYm91bmRzLndpZHRoO1xuICAgIHZhciBoZWlnaHQgPSBib3VuZHMuaGVpZ2h0O1xuICAgIHZhciBmb250ID0gY29uZmlnLmZvbnQ7XG5cbiAgICB2YXIgaGFsaWduID0gY29uZmlnLmhhbGlnbiB8fCAncmlnaHQnO1xuICAgIHZhciB2YWxpZ25PZmZzZXQgPSBjb25maWcudm9mZnNldCB8fCAwO1xuXG4gICAgdmFyIGNlbGxQYWRkaW5nID0gY29uZmlnLmNlbGxQYWRkaW5nIHx8IDA7XG4gICAgdmFyIGhhbGlnbk9mZnNldCA9IDA7XG4gICAgdmFyIHRleHRXaWR0aCA9IGNvbmZpZy5nZXRUZXh0V2lkdGgoZ2MsIHZhbHVlKTtcbiAgICB2YXIgZm9udE1ldHJpY3MgPSBjb25maWcuZ2V0VGV4dEhlaWdodChmb250KTtcblxuICAgIGlmIChnYy5mb250ICE9PSBjb25maWcuZm9udCkge1xuICAgICAgICBnYy5mb250ID0gY29uZmlnLmZvbnQ7XG4gICAgfVxuICAgIGlmIChnYy50ZXh0QWxpZ24gIT09ICdsZWZ0Jykge1xuICAgICAgICBnYy50ZXh0QWxpZ24gPSAnbGVmdCc7XG4gICAgfVxuICAgIGlmIChnYy50ZXh0QmFzZWxpbmUgIT09ICdtaWRkbGUnKSB7XG4gICAgICAgIGdjLnRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xuICAgIH1cblxuICAgIGlmIChoYWxpZ24gPT09ICdyaWdodCcpIHtcbiAgICAgICAgLy90ZXh0V2lkdGggPSBjb25maWcuZ2V0VGV4dFdpZHRoKGdjLCBjb25maWcudmFsdWUpO1xuICAgICAgICBoYWxpZ25PZmZzZXQgPSB3aWR0aCAtIGNlbGxQYWRkaW5nIC0gdGV4dFdpZHRoO1xuICAgIH0gZWxzZSBpZiAoaGFsaWduID09PSAnY2VudGVyJykge1xuICAgICAgICAvL3RleHRXaWR0aCA9IGNvbmZpZy5nZXRUZXh0V2lkdGgoZ2MsIGNvbmZpZy52YWx1ZSk7XG4gICAgICAgIGhhbGlnbk9mZnNldCA9ICh3aWR0aCAtIHRleHRXaWR0aCkgLyAyO1xuICAgIH0gZWxzZSBpZiAoaGFsaWduID09PSAnbGVmdCcpIHtcbiAgICAgICAgaGFsaWduT2Zmc2V0ID0gY2VsbFBhZGRpbmc7XG4gICAgfVxuXG4gICAgaGFsaWduT2Zmc2V0ID0gTWF0aC5tYXgoMCwgaGFsaWduT2Zmc2V0KTtcbiAgICB2YWxpZ25PZmZzZXQgPSB2YWxpZ25PZmZzZXQgKyBNYXRoLmNlaWwoaGVpZ2h0IC8gMik7XG5cbiAgICAvL2ZpbGwgYmFja2dyb3VuZCBvbmx5IGlmIG91ciBiYWNrZ3JvdW5kQ29sb3IgaXMgcG9wdWxhdGVkIG9yIHdlIGFyZSBhIHNlbGVjdGVkIGNlbGxcbiAgICBpZiAoY29uZmlnLmJhY2tncm91bmRDb2xvciB8fCBjb25maWcuaXNTZWxlY3RlZCkge1xuICAgICAgICBnYy5maWxsU3R5bGUgPSBjb25maWcuaXNTZWxlY3RlZCA/IGNvbmZpZy5iZ1NlbENvbG9yIDogY29uZmlnLmJhY2tncm91bmRDb2xvcjtcbiAgICAgICAgZ2MuZmlsbFJlY3QoeCwgeSwgd2lkdGgsIGhlaWdodCk7XG4gICAgfVxuXG4gICAgLy9kcmF3IHRleHRcbiAgICB2YXIgdGhlQ29sb3IgPSBjb25maWcuaXNTZWxlY3RlZCA/IGNvbmZpZy5mZ1NlbENvbG9yIDogY29uZmlnLmNvbG9yO1xuICAgIGlmIChnYy5maWxsU3R5bGUgIT09IHRoZUNvbG9yKSB7XG4gICAgICAgIGdjLmZpbGxTdHlsZSA9IHRoZUNvbG9yO1xuICAgICAgICBnYy5zdHJva2VTdHlsZSA9IHRoZUNvbG9yO1xuICAgIH1cbiAgICBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgZ2MuZmlsbFRleHQodmFsdWUsIHggKyBoYWxpZ25PZmZzZXQsIHkgKyB2YWxpZ25PZmZzZXQpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwYWludDsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBDb2x1bW4gPSByZXF1aXJlKCcuL2NvbHVtbi5qcycpO1xudmFyIExSVUNhY2hlID0gcmVxdWlyZSgnLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2xydS1jYWNoZS9saWIvbHJ1LWNhY2hlLmpzJyk7XG52YXIgRmluQmFyID0gcmVxdWlyZSgnLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2ZpbmJhcnMvaW5kZXguanMnKTtcbnZhciBkZWZhdWx0Y2VsbHJlbmRlcmVyID0gcmVxdWlyZSgnLi9kZWZhdWx0Y2VsbHJlbmRlcmVyLmpzJyk7XG52YXIgcmVzaXphYmxlcyA9IFtdO1xudmFyIHJlc2l6ZUxvb3BSdW5uaW5nID0gdHJ1ZTtcbnZhciBmb250RGF0YSA9IHt9O1xudmFyIHRleHRXaWR0aENhY2hlID0gbmV3IExSVUNhY2hlKHsgbWF4OiAxMDAwMCB9KTtcblxuXG52YXIgcmVzaXphYmxlc0xvb3BGdW5jdGlvbiA9IGZ1bmN0aW9uKG5vdykge1xuICAgIGlmICghcmVzaXplTG9vcFJ1bm5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc2l6YWJsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc2l6YWJsZXNbaV0obm93KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG59O1xuc2V0SW50ZXJ2YWwocmVzaXphYmxlc0xvb3BGdW5jdGlvbiwgMjAwKTtcblxuXG5mdW5jdGlvbiBHcmlkKGRvbUVsZW1lbnQsIG1vZGVsLCBwcm9wZXJ0aWVzKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHRoaXMuZ2V0RGVmYXVsdFByb3BlcnRpZXMoKTtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdmFyIGhlYWRlckNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgaGVhZGVyQ29udGV4dCA9IGhlYWRlckNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGNvbHVtbnMgPSBbXTtcbiAgICB0aGlzLnNjcm9sbFggPSAwO1xuICAgIHRoaXMuc2Nyb2xsWSA9IDA7XG4gICAgdGhpcy5ib3VuZHNJbml0aWFsaXplZCA9IGZhbHNlO1xuXG4gICAgbW9kZWwuY2hhbmdlZCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgc2VsZi5wYWludCh4LCB5KTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNhbnZhcztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRIZWFkZXJDYW52YXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGhlYWRlckNhbnZhcztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRDb250YWluZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRvbUVsZW1lbnQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRIZWFkZXJDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBoZWFkZXJDb250ZXh0O1xuICAgIH07XG5cbiAgICB0aGlzLmdldE1vZGVsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRNb2RlbCA9IGZ1bmN0aW9uKGdyaWRNb2RlbCkge1xuICAgICAgICBtb2RlbCA9IGdyaWRNb2RlbDtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRDb2x1bW5zID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb2x1bW5zO1xuICAgIH1cblxuICAgIHRoaXMuc2V0Q29sdW1ucyA9IGZ1bmN0aW9uIChjb2xzKSB7XG4gICAgICAgIGNvbHVtbnMgPSBjb2xzO1xuICAgIH1cblxuICAgIHRoaXMuZ2V0T3B0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24obmV3T3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gbmV3T3B0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5hZGRQcm9wZXJ0aWVzKHByb3BlcnRpZXMpO1xuXG4gICAgdGhpcy5pbml0aWFsaXplKClcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldERlZmF1bHRQcm9wZXJ0aWVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZm9udDogJzEzcHggVGFob21hLCBHZW5ldmEsIHNhbnMtc2VyaWYnLFxuICAgICAgICBjb2xvcjogJyNmZmZmZmYnLFxuICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6ICcjNTA1MDUwJyxcbiAgICAgICAgZm9yZWdyb3VuZFNlbENvbG9yOiAncmdiKDI1LCAyNSwgMjUpJyxcbiAgICAgICAgYmFja2dyb3VuZFNlbENvbG9yOiAncmdiKDE4MywgMjE5LCAyNTUpJyxcblxuICAgICAgICB0b3BMZWZ0Rm9udDogJzE0cHggVGFob21hLCBHZW5ldmEsIHNhbnMtc2VyaWYnLFxuICAgICAgICB0b3BMZWZ0Q29sb3I6ICdyZ2IoMjUsIDI1LCAyNSknLFxuICAgICAgICB0b3BMZWZ0QmFja2dyb3VuZENvbG9yOiAncmdiKDIyMywgMjI3LCAyMzIpJyxcbiAgICAgICAgdG9wTGVmdEZHU2VsQ29sb3I6ICdyZ2IoMjUsIDI1LCAyNSknLFxuICAgICAgICB0b3BMZWZ0QkdTZWxDb2xvcjogJ3JnYigyNTUsIDIyMCwgOTcpJyxcblxuICAgICAgICBmaXhlZENvbHVtbkZvbnQ6ICcxNHB4IFRhaG9tYSwgR2VuZXZhLCBzYW5zLXNlcmlmJyxcbiAgICAgICAgZml4ZWRDb2x1bW5Db2xvcjogJ3JnYigyNSwgMjUsIDI1KScsXG4gICAgICAgIGZpeGVkQ29sdW1uQmFja2dyb3VuZENvbG9yOiAncmdiKDIyMywgMjI3LCAyMzIpJyxcbiAgICAgICAgZml4ZWRDb2x1bW5GR1NlbENvbG9yOiAncmdiKDI1LCAyNSwgMjUpJyxcbiAgICAgICAgZml4ZWRDb2x1bW5CR1NlbENvbG9yOiAncmdiKDI1NSwgMjIwLCA5NyknLFxuXG4gICAgICAgIGZpeGVkUm93Rm9udDogJzExcHggVGFob21hLCBHZW5ldmEsIHNhbnMtc2VyaWYnLFxuICAgICAgICBmaXhlZFJvd0NvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgIGZpeGVkUm93QmFja2dyb3VuZENvbG9yOiAnIzMwMzAzMCcsXG4gICAgICAgIGZpeGVkUm93RkdTZWxDb2xvcjogJ3JnYigyNSwgMjUsIDI1KScsXG4gICAgICAgIGZpeGVkUm93QkdTZWxDb2xvcjogJ3JnYigyNTUsIDIyMCwgOTcpJyxcblxuICAgICAgICBiYWNrZ3JvdW5kQ29sb3IyOiAnIzMwMzAzMCcsXG4gICAgICAgIGxpbmVDb2xvcjogJyM3MDcwNzAnLFxuICAgICAgICB2b2Zmc2V0OiAwLFxuICAgICAgICBzY3JvbGxpbmdFbmFibGVkOiBmYWxzZSxcbiAgICAgICAgdlNjcm9sbGJhckNsYXNzUHJlZml4OiAnZmluLXNiLXVzZXInLFxuICAgICAgICBoU2Nyb2xsYmFyQ2xhc3NQcmVmaXg6ICdmaW4tc2ItdXNlcicsXG5cbiAgICAgICAgZGVmYXVsdFJvd0hlaWdodDogMjUsXG4gICAgICAgIGRlZmF1bHRGaXhlZFJvd0hlaWdodDogMjAsXG4gICAgICAgIGRlZmF1bHRDb2x1bW5XaWR0aDogMTAwLFxuICAgICAgICBkZWZhdWx0Rml4ZWRDb2x1bW5XaWR0aDogMTAwLFxuICAgICAgICBjZWxsUGFkZGluZzogNVxuICAgIH07XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRQYWludENvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb25maWcgPSBPYmplY3QuY3JlYXRlKHRoaXMuZ2V0T3B0aW9ucygpKTtcblxuICAgIGNvbmZpZy5nZXRUZXh0SGVpZ2h0ID0gZnVuY3Rpb24oZm9udCkge1xuICAgICAgICByZXR1cm4gc2VsZi5nZXRUZXh0SGVpZ2h0KGZvbnQpO1xuICAgIH07XG5cbiAgICBjb25maWcuZ2V0VGV4dFdpZHRoID0gZnVuY3Rpb24oZ2MsIHRleHQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZ2V0VGV4dFdpZHRoKGdjLCB0ZXh0KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGNvbmZpZztcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFRleHRXaWR0aCA9IGZ1bmN0aW9uKGdjLCBzdHJpbmcpIHtcbiAgICBpZiAoc3RyaW5nID09PSBudWxsIHx8IHN0cmluZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBzdHJpbmcgPSBzdHJpbmcgKyAnJztcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgdmFyIGtleSA9IGdjLmZvbnQgKyBzdHJpbmc7XG4gICAgdmFyIHdpZHRoID0gdGV4dFdpZHRoQ2FjaGUuZ2V0KGtleSk7XG4gICAgaWYgKCF3aWR0aCkge1xuICAgICAgICB3aWR0aCA9IGdjLm1lYXN1cmVUZXh0KHN0cmluZykud2lkdGg7XG4gICAgICAgIHRleHRXaWR0aENhY2hlLnNldChrZXksIHdpZHRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHdpZHRoO1xufTtcblxuXG5HcmlkLnByb3RvdHlwZS5nZXRUZXh0SGVpZ2h0ID0gZnVuY3Rpb24oZm9udCkge1xuXG4gICAgdmFyIHJlc3VsdCA9IGZvbnREYXRhW2ZvbnRdO1xuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgcmVzdWx0ID0ge307XG4gICAgdmFyIHRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdGV4dC50ZXh0Q29udGVudCA9ICdIZyc7XG4gICAgdGV4dC5zdHlsZS5mb250ID0gZm9udDtcblxuICAgIHZhciBibG9jayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGJsb2NrLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWJsb2NrJztcbiAgICBibG9jay5zdHlsZS53aWR0aCA9ICcxcHgnO1xuICAgIGJsb2NrLnN0eWxlLmhlaWdodCA9ICcwcHgnO1xuXG4gICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRpdi5hcHBlbmRDaGlsZCh0ZXh0KTtcbiAgICBkaXYuYXBwZW5kQ2hpbGQoYmxvY2spO1xuXG4gICAgZGl2LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRpdik7XG5cbiAgICB0cnkge1xuXG4gICAgICAgIGJsb2NrLnN0eWxlLnZlcnRpY2FsQWxpZ24gPSAnYmFzZWxpbmUnO1xuXG4gICAgICAgIHZhciBibG9ja1JlY3QgPSBibG9jay5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgdmFyIHRleHRSZWN0ID0gdGV4dC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICByZXN1bHQuYXNjZW50ID0gYmxvY2tSZWN0LnRvcCAtIHRleHRSZWN0LnRvcDtcblxuICAgICAgICBibG9jay5zdHlsZS52ZXJ0aWNhbEFsaWduID0gJ2JvdHRvbSc7XG4gICAgICAgIHJlc3VsdC5oZWlnaHQgPSBibG9ja1JlY3QudG9wIC0gdGV4dFJlY3QudG9wO1xuXG4gICAgICAgIHJlc3VsdC5kZXNjZW50ID0gcmVzdWx0LmhlaWdodCAtIHJlc3VsdC5hc2NlbnQ7XG5cbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuaGVpZ2h0ICE9PSAwKSB7XG4gICAgICAgIGZvbnREYXRhW2ZvbnRdID0gcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuR3JpZC5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbihwcm9wZXJ0aWVzMSwgcHJvcGVydGllczIpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gcHJvcGVydGllczIpIHtcbiAgICAgICAgaWYgKHByb3BlcnRpZXMyLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMxW2tleV0gPSBwcm9wZXJ0aWVzMltrZXldO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuR3JpZC5wcm90b3R5cGUuYWRkUHJvcGVydGllcyA9IGZ1bmN0aW9uKHByb3BlcnRpZXMpIHtcbiAgICB0aGlzLm1lcmdlKHRoaXMuZ2V0T3B0aW9ucygpLCBwcm9wZXJ0aWVzKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGZpeGVkUm93SGVpZ2h0ID0gdGhpcy5nZXRGaXhlZFJvd0hlaWdodCgpO1xuICAgIHZhciBjb250YWluZXIgPSB0aGlzLmdldENvbnRhaW5lcigpO1xuICAgIHZhciBkaXZIZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkaXZIZWFkZXIuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgIGRpdkhlYWRlci5zdHlsZS50b3AgPSAwO1xuICAgIGRpdkhlYWRlci5zdHlsZS5yaWdodCA9IDA7XG4gICAgZGl2SGVhZGVyLnN0eWxlLmxlZnQgPSAwO1xuICAgIGRpdkhlYWRlci5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuXG4gICAgZGl2SGVhZGVyLmFwcGVuZENoaWxkKHRoaXMuZ2V0SGVhZGVyQ2FudmFzKCkpO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChkaXZIZWFkZXIpO1xuXG4gICAgcmVxdWlyZSgnLi9jb2wtcmVvcmRlci5qcycpLmluaXQoc2VsZiwgZGl2SGVhZGVyKTtcblxuICAgIHZhciBkaXZNYWluID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZGl2TWFpbi5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgZGl2TWFpbi5zdHlsZS50b3AgPSBmaXhlZFJvd0hlaWdodCArICdweCc7XG4gICAgZGl2TWFpbi5zdHlsZS5yaWdodCA9IDA7XG4gICAgZGl2TWFpbi5zdHlsZS5ib3R0b20gPSAwO1xuICAgIGRpdk1haW4uc3R5bGUubGVmdCA9IDA7XG4gICAgLy8gZGl2TWFpbi5zdHlsZS5vdmVyZmxvdyA9ICdhdXRvJztcbiAgICAvLyBkaXZNYWluLnN0eWxlLm1zT3ZlcmZsb3dTdHlsZSA9ICctbXMtYXV0b2hpZGluZy1zY3JvbGxiYXInO1xuICAgIC8vIGRpdk1haW4uYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCBmdW5jdGlvbihlKSB7XG4gICAgLy8gICAgIGRpdkhlYWRlci5zY3JvbGxMZWZ0ID0gZS50YXJnZXQuc2Nyb2xsTGVmdDtcbiAgICAvLyB9KTtcbiAgICBkaXZNYWluLnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbidcblxuICAgIHRoaXMuaW5pdFNjcm9sbGJhcnMoKTtcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5zY3JvbGxiYXJzRGl2KTtcblxuICAgIGRpdk1haW4uYXBwZW5kQ2hpbGQodGhpcy5nZXRDYW52YXMoKSk7XG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGRpdk1haW4pO1xuICAgIFxuXG4gICAgdGhpcy5jaGVja0NhbnZhc0JvdW5kcygpO1xuICAgIHRoaXMuYmVnaW5SZXNpemluZygpO1xuXG59O1xuXG5HcmlkLnByb3RvdHlwZS5pbml0U2Nyb2xsYmFycyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIFxuICAgIHRoaXMuc2Nyb2xsYmFyc0RpdiA9IHRoaXMuZ2V0U2Nyb2xsYmFyRGl2KCk7XG4gICAgXG4gICAgdmFyIGhvcnpCYXIgPSBuZXcgRmluQmFyKHtcbiAgICAgICAgb3JpZW50YXRpb246ICdob3Jpem9udGFsJyxcbiAgICAgICAgb25jaGFuZ2U6IGZ1bmN0aW9uKGlkeCkge1xuICAgICAgICAgICAgc2VsZi5zZXRTY3JvbGxYKGlkeCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNzc1N0eWxlc2hlZXRSZWZlcmVuY2VFbGVtZW50OiBkb2N1bWVudC5ib2R5LFxuICAgICAgICBjb250YWluZXI6IHRoaXMuZ2V0Q29udGFpbmVyKCksXG4gICAgfSk7XG5cbiAgICB2YXIgdmVydEJhciA9IG5ldyBGaW5CYXIoe1xuICAgICAgICBvcmllbnRhdGlvbjogJ3ZlcnRpY2FsJyxcbiAgICAgICAgb25jaGFuZ2U6IGZ1bmN0aW9uKGlkeCkge1xuICAgICAgICAgICAgc2VsZi5zZXRTY3JvbGxZKGlkeCk7XG4gICAgICAgIH0sXG4gICAgICAgIHBhZ2luZzoge1xuICAgICAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLnBhZ2VVcCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvd246IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLnBhZ2VEb3duKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBjb250YWluZXI6IHRoaXMuZ2V0Q29udGFpbmVyKCksXG4gICAgfSk7XG5cbiAgICB0aGlzLnNiSFNjcm9sbGVyID0gaG9yekJhcjtcbiAgICB0aGlzLnNiVlNjcm9sbGVyID0gdmVydEJhcjtcblxuICAgIHRoaXMuc2JIU2Nyb2xsZXIuY2xhc3NQcmVmaXggPSB0aGlzLnJlc29sdmVQcm9wZXJ0eSgnaFNjcm9sbGJhckNsYXNzUHJlZml4Jyk7XG4gICAgdGhpcy5zYlZTY3JvbGxlci5jbGFzc1ByZWZpeCA9IHRoaXMucmVzb2x2ZVByb3BlcnR5KCd2U2Nyb2xsYmFyQ2xhc3NQcmVmaXgnKTtcblxuICAgIHRoaXMuc2Nyb2xsYmFyc0Rpdi5hcHBlbmRDaGlsZChob3J6QmFyLmJhcik7XG4gICAgdGhpcy5zY3JvbGxiYXJzRGl2LmFwcGVuZENoaWxkKHZlcnRCYXIuYmFyKTtcblxufTtcblxuR3JpZC5wcm90b3R5cGUucGFnZURvd24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnBhZ2VVcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAxO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0U2Nyb2xsWCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5zY3JvbGxYID0gdmFsdWU7XG4gICAgdGhpcy5wYWludEFsbCgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0U2Nyb2xsWSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5zY3JvbGxZID0gdmFsdWU7XG4gICAgdGhpcy5wYWludEFsbCgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUucmVzaXplU2Nyb2xsYmFycyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2JIU2Nyb2xsZXIuc2hvcnRlbkJ5KHRoaXMuc2JWU2Nyb2xsZXIpLnJlc2l6ZSgpO1xuICAgIHRoaXMuc2JWU2Nyb2xsZXIuc2hvcnRlbkJ5KHRoaXMuc2JIU2Nyb2xsZXIpLnJlc2l6ZSgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0VlNjcm9sbGJhclZhbHVlcyA9IGZ1bmN0aW9uKG1heCkge1xuICAgIHRoaXMuc2JWU2Nyb2xsZXIucmFuZ2UgPSB7XG4gICAgICAgIG1pbjogMCxcbiAgICAgICAgbWF4OiBtYXhcbiAgICB9O1xufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0SFNjcm9sbGJhclZhbHVlcyA9IGZ1bmN0aW9uKG1heCkge1xuICAgIHRoaXMuc2JIU2Nyb2xsZXIucmFuZ2UgPSB7XG4gICAgICAgIG1pbjogMCxcbiAgICAgICAgbWF4OiBtYXhcbiAgICB9O1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0U2Nyb2xsYmFyRGl2ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZpeGVkUm93SGVpZ2h0ID0gdGhpcy5nZXRGaXhlZFJvd0hlaWdodCgpO1xuICAgIHZhciBvdXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHZhciBzdHJWYXI9XCJcIjtcbiAgICBzdHJWYXIgKz0gXCI8ZGl2IHN0eWxlPVxcXCJ0b3A6XCIgKyBmaXhlZFJvd0hlaWdodCArIFwicHg7cmlnaHQ6MHB4O2JvdHRvbTowcHg7bGVmdDowcHg7cG9zaXRpb246YWJzb2x1dGVcXFwiPlwiO1xuICAgIHN0clZhciArPSBcIiAgPHN0eWxlPlwiO1xuICAgIHN0clZhciArPSBcIiAgZGl2LmZpbmJhci1ob3Jpem9udGFsLFwiO1xuICAgIHN0clZhciArPSBcIiAgZGl2LmZpbmJhci12ZXJ0aWNhbCB7XCI7XG4gICAgc3RyVmFyICs9IFwiICAgIHotaW5kZXg6IDU7XCI7XG4gICAgc3RyVmFyICs9IFwiICAgIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMjU1LCAyNTUsIDI1NSwgMC41KTtcIjtcbiAgICBzdHJWYXIgKz0gXCIgICAgYm94LXNoYWRvdzogMCAwIDNweCAjMDAwLCAwIDAgM3B4ICMwMDAsIDAgMCAzcHggIzAwMDtcIjtcbiAgICBzdHJWYXIgKz0gXCIgIH1cIjtcbiAgICBzdHJWYXIgKz0gXCIgIFwiO1xuICAgIHN0clZhciArPSBcIiAgZGl2LmZpbmJhci1ob3Jpem9udGFsPi50aHVtYixcIjtcbiAgICBzdHJWYXIgKz0gXCIgIGRpdi5maW5iYXItdmVydGljYWw+LnRodW1iIHtcIjtcbiAgICBzdHJWYXIgKz0gXCIgICAgb3BhY2l0eTogLjg1O1wiO1xuICAgIHN0clZhciArPSBcIiAgICBib3gtc2hhZG93OiAwIDAgM3B4ICMwMDAsIDAgMCAzcHggIzAwMCwgMCAwIDNweCAjMDAwO1wiO1xuICAgIHN0clZhciArPSBcIiAgfVwiO1xuICAgIHN0clZhciArPSBcIiAgPFxcL3N0eWxlPlwiO1xuICAgIHN0clZhciArPSBcIjxcXC9kaXY+XCI7XG4gICAgb3V0ZXIuaW5uZXJIVE1MID0gc3RyVmFyO1xuICAgIHZhciBpbm5lciA9IG91dGVyLmZpcnN0Q2hpbGQ7XG4gICAgcmV0dXJuIGlubmVyO1xufTtcblxuR3JpZC5wcm90b3R5cGUuY2hlY2tDYW52YXNCb3VuZHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGNvbnRhaW5lciA9IHRoaXMuZ2V0Q29udGFpbmVyKCk7XG4gICAgdmFyIGhlYWRlckhlaWdodCA9IHRoaXMuZ2V0Rml4ZWRSb3dIZWlnaHQoKTtcbiAgICBcbiAgICB2YXIgdmlld3BvcnQgPSBjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICB2YXIgaGVhZGVyQ2FudmFzID0gdGhpcy5nZXRIZWFkZXJDYW52YXMoKTtcbiAgICB2YXIgY2FudmFzID0gdGhpcy5nZXRDYW52YXMoKTtcblxuICAgIGlmICh0aGlzLmJvdW5kc0luaXRpYWxpemVkICYmIGNhbnZhcy5nZXRBdHRyaWJ1dGUoJ3dpZHRoJykgPT09ICgnJyArIHZpZXdwb3J0LndpZHRoKVxuICAgICAgICAmJiBjYW52YXMuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSA9PT0gKCcnICsgKHZpZXdwb3J0LmhlaWdodCAtIGhlYWRlckhlaWdodCkpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5ib3VuZHNJbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBoZWFkZXJDYW52YXMuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgIGhlYWRlckNhbnZhcy5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgdmlld3BvcnQud2lkdGgpO1xuICAgIGhlYWRlckNhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlYWRlckhlaWdodCk7XG5cbiAgICBjYW52YXMuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgIGNhbnZhcy5zdHlsZS50b3AgPSAnMXB4JztcbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHZpZXdwb3J0LndpZHRoKTtcbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCB2aWV3cG9ydC5oZWlnaHQgLSBoZWFkZXJIZWlnaHQpO1xuXG4gICAgdGhpcy53aWR0aCA9IHZpZXdwb3J0LndpZHRoO1xuICAgIHRoaXMuaGVpZ2h0ID0gdmlld3BvcnQuaGVpZ2h0O1xuICAgIFxuICAgIC8vdGhlIG1vZGVsIG1heSBoYXZlIGNoYW5nZWQsIGxldHNcbiAgICAvL3JlY29tcHV0ZSB0aGUgc2Nyb2xsaW5nIGNvb3JkaW5hdGVzXG4gICAgdGhpcy5maW5hbFBhZ2VMb2NhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB2YXIgZmluYWxQYWdlTG9jYXRpb24gPSB0aGlzLmdldEZpbmFsUGFnZUxvY2F0aW9uKCk7XG4gICAgdGhpcy5zZXRIU2Nyb2xsYmFyVmFsdWVzKGZpbmFsUGFnZUxvY2F0aW9uLngpO1xuICAgIHRoaXMuc2V0VlNjcm9sbGJhclZhbHVlcyhmaW5hbFBhZ2VMb2NhdGlvbi55KTtcblxuICAgIHRoaXMucmVzaXplU2Nyb2xsYmFycygpO1xuICAgIHRoaXMucGFpbnRBbGwoKTtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLnBhaW50QWxsKCk7XG4gICAgfSwgMTAwKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmNvbXB1dGVNYWluQXJlYUZ1bGxIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcm93SGVpZ2h0ID0gdGhpcy5nZXRSb3dIZWlnaHQoMCk7XG4gICAgdmFyIG51bVJvd3MgPSB0aGlzLmdldFJvd0NvdW50KCk7XG4gICAgdmFyIHRvdGFsSGVpZ2h0ID0gcm93SGVpZ2h0ICogbnVtUm93cztcbiAgICByZXR1cm4gdG90YWxIZWlnaHQ7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5jb21wdXRlTWFpbkFyZWFGdWxsV2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbnVtQ29scyA9IHRoaXMuZ2V0Q29sdW1uQ291bnQoKTtcbiAgICB2YXIgd2lkdGggPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQ29sczsgaSsrKSB7XG4gICAgICAgIHdpZHRoID0gd2lkdGggKyB0aGlzLmdldENvbHVtbldpZHRoKGkpO1xuICAgIH1cbiAgICByZXR1cm4gd2lkdGg7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zdG9wUmVzaXplVGhyZWFkID0gZnVuY3Rpb24oKSB7XG4gICAgcmVzaXplTG9vcFJ1bm5pbmcgPSBmYWxzZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnJlc3RhcnRSZXNpemVUaHJlYWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAocmVzaXplTG9vcFJ1bm5pbmcpIHtcbiAgICAgICAgcmV0dXJuOyAvLyBhbHJlYWR5IHJ1bm5pbmdcbiAgICB9XG4gICAgcmVzaXplTG9vcFJ1bm5pbmcgPSB0cnVlO1xuICAgIHNldEludGVydmFsKHJlc2l6YWJsZXNMb29wRnVuY3Rpb24sIDIwMCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5iZWdpblJlc2l6aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMudGlja1Jlc2l6ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5jaGVja0NhbnZhc0JvdW5kcygpO1xuICAgIH07XG4gICAgcmVzaXphYmxlcy5wdXNoKHRoaXMudGlja1Jlc2l6ZXIpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc3RvcFJlc2l6aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmVzaXphYmxlcy5zcGxpY2UocmVzaXphYmxlcy5pbmRleE9mKHRoaXMudGlja1Jlc2l6ZXIpLCAxKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldENvbHVtbiA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW5zKClbeF07XG4gICAgcmV0dXJuIGNvbHVtbjtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZhciBtb2RlbCA9IHRoaXMuZ2V0TW9kZWwoKTtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW5zKClbeF07XG4gICAgdmFyIGZpZWxkID0gY29sdW1uLmdldEZpZWxkKCk7XG4gICAgdmFyIHZhbHVlID0gbW9kZWwuZ2V0VmFsdWUoZmllbGQsIHkpO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldEJvdW5kc09mQ2VsbCA9IGZ1bmN0aW9uKHgsIHksIHhPZmZzZXQsIHlPZmZzZXQpIHtcbiAgICB4T2Zmc2V0ID0geE9mZnNldCB8fCAwO1xuICAgIHlPZmZzZXQgPSB5T2Zmc2V0IHx8IDA7XG4gICAgdmFyIHJ4LCByeSwgcndpZHRoLCByaGVpZ2h0O1xuICAgIHZhciByb3dIZWlnaHQgPSB0aGlzLmdldFJvd0hlaWdodCgwKTtcblxuICAgIHJ4ID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8ICh4IC0geE9mZnNldCk7IGkrKykge1xuICAgICAgICByeCA9IHJ4ICsgdGhpcy5nZXRDb2x1bW5XaWR0aChpICsgeE9mZnNldCk7XG4gICAgfVxuICAgIHJ5ID0gcm93SGVpZ2h0ICogKHkgLSB5T2Zmc2V0KTtcbiAgICByd2lkdGggPSB0aGlzLmdldENvbHVtbldpZHRoKHgpO1xuICAgIHJoZWlnaHQgPSByb3dIZWlnaHQ7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgeDogcngsXG4gICAgICAgIHk6IHJ5LFxuICAgICAgICB3aWR0aDogcndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHJoZWlnaHRcbiAgICB9O1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRGaXhlZFJvd0hlaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMucmVzb2x2ZVByb3BlcnR5KCdkZWZhdWx0Rml4ZWRSb3dIZWlnaHQnKTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5nZXRDb2x1bW5XaWR0aCA9IGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW4oeCk7XG4gICAgaWYgKCFjb2x1bW4pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZVByb3BlcnR5KCdkZWZhdWx0Q29sdW1uV2lkdGgnKTtcbiAgICB9XG4gICAgdmFyIHZhbHVlID0gY29sdW1uLmdldFdpZHRoKCk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0Um93SGVpZ2h0ID0gZnVuY3Rpb24oeSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMucmVzb2x2ZVByb3BlcnR5KCdkZWZhdWx0Um93SGVpZ2h0Jyk7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuR3JpZC5wcm90b3R5cGUucmVzb2x2ZVByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuZ2V0T3B0aW9ucygpW25hbWVdO1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldENvbHVtbkNvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbHVtbnMgPSB0aGlzLmdldENvbHVtbnMoKTtcbiAgICByZXR1cm4gY29sdW1ucy5sZW5ndGhcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldFJvd0NvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1vZGVsID0gdGhpcy5nZXRNb2RlbCgpO1xuICAgIHJldHVybiBtb2RlbC5nZXRSb3dDb3VudCgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuYWRkQ29sdW1uID0gZnVuY3Rpb24oZmllbGQsIGxhYmVsLCB0eXBlLCB3aWR0aCwgcmVuZGVyZXIpIHtcbiAgICB2YXIgY29sdW1ucyA9IHRoaXMuZ2V0Q29sdW1ucygpO1xuICAgIHZhciBuZXdDb2wgPSBuZXcgQ29sdW1uKHRoaXMsIGZpZWxkLCBsYWJlbCwgdHlwZSwgd2lkdGgsIHJlbmRlcmVyKTtcbiAgICBjb2x1bW5zLnB1c2gobmV3Q29sKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnBhaW50QWxsID0gZnVuY3Rpb24oKSB7XG4gICAgLy92YXIgdmlld3BvcnQgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBjb25maWcgPSB0aGlzLmdldFBhaW50Q29uZmlnKCk7XG4gICAgdmFyIG51bUNvbHMgPSB0aGlzLmdldENvbHVtbkNvdW50KCk7XG4gICAgdmFyIG51bVJvd3MgPSB0aGlzLmdldFJvd0NvdW50KCk7XG5cdHRoaXMucGFpbnRNYWluQXJlYShjb25maWcsIG51bUNvbHMsIG51bVJvd3MpO1xuXHR0aGlzLnBhaW50SGVhZGVycyhjb25maWcsIG51bUNvbHMsIDEpO1xufVxuXG5HcmlkLnByb3RvdHlwZS5wYWludE1haW5BcmVhID0gZnVuY3Rpb24oY29uZmlnLCBudW1Db2xzLCBudW1Sb3dzKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuZ2V0Q29udGV4dCgpO1xuICAgICAgICB2YXIgc2Nyb2xsWCA9IHRoaXMuc2Nyb2xsWDtcbiAgICAgICAgdmFyIHNjcm9sbFkgPSB0aGlzLnNjcm9sbFk7XG4gICAgICAgIHZhciBib3VuZHMgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIHZhciB0b3RhbEhlaWdodCA9IDA7XG4gICAgICAgIHZhciB0b3RhbFdpZHRoID0gMDtcbiAgICAgICAgdmFyIGR4LCBkeSA9IDA7XG4gICAgICAgIGNvbnRleHQuc2F2ZSgpO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgKHggKyBzY3JvbGxYKSA8IG51bUNvbHMgJiYgdG90YWxXaWR0aCA8IGJvdW5kcy53aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICB2YXIgcm93SGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIHRvdGFsSGVpZ2h0ID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyAoeSArIHNjcm9sbFkpIDwgbnVtUm93cyAmJiB0b3RhbEhlaWdodCA8IGJvdW5kcy5oZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICAgIHZhciBkeCA9IHggKyBzY3JvbGxYO1xuICAgICAgICAgICAgICAgIHZhciBkeSA9IHkgKyBzY3JvbGxZO1xuICAgICAgICAgICAgICAgIHRoaXMucGFpbnRDZWxsKGNvbnRleHQsIGR4LCBkeSwgY29uZmlnKTtcbiAgICAgICAgICAgICAgICByb3dIZWlnaHQgPSB0aGlzLmdldFJvd0hlaWdodChkeSk7XG4gICAgICAgICAgICAgICAgdG90YWxIZWlnaHQgPSB0b3RhbEhlaWdodCArIHJvd0hlaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb2xXaWR0aCA9IHRoaXMuZ2V0Q29sdW1uV2lkdGgoZHgpO1xuICAgICAgICAgICAgdG90YWxXaWR0aCA9IHRvdGFsV2lkdGggKyBjb2xXaWR0aDtcbiAgICAgICAgfVxuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfVxufTtcblxuXG5HcmlkLnByb3RvdHlwZS5wYWludEhlYWRlcnMgPSBmdW5jdGlvbihjb25maWcsIG51bUNvbHMsIG51bVJvd3MpIHtcbiAgICB0cnkge1xuICAgIFx0Y29uZmlnLmhhbGlnbiA9ICdjZW50ZXInO1xuICAgIFx0Y29uZmlnLmNlbGxQYWRkaW5nID0gJzBweCc7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldEhlYWRlckNvbnRleHQoKTtcbiAgICAgICAgY29udGV4dC5zYXZlKCk7XG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgbnVtQ29sczsgeCsrKSB7XG4gICAgICAgICAgICB0aGlzLnBhaW50SGVhZGVyQ2VsbChjb250ZXh0LCB4LCBjb25maWcpO1xuICAgICAgICB9XG5cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5wYWludENlbGwgPSBmdW5jdGlvbihjb250ZXh0LCB4LCB5LCBjb25maWcpIHtcbiAgICB2YXIgbW9kZWwgPSB0aGlzLmdldE1vZGVsKCk7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuZ2V0Qm91bmRzT2ZDZWxsKHgsIHksIHRoaXMuc2Nyb2xsWCwgdGhpcy5zY3JvbGxZKTtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW4oeCk7XG4gICAgdmFyIHJlbmRlcmVyID0gY29sdW1uLmdldFJlbmRlcmVyKCk7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5nZXRWYWx1ZSh4LCB5KTtcbiAgICBjb25maWcudmFsdWUgPSB2YWx1ZTtcbiAgICBjb25maWcueCA9IHg7XG4gICAgY29uZmlnLnkgPSB5O1xuICAgIGNvbmZpZy5ib3VuZHMgPSBib3VuZHM7XG4gICAgY29uZmlnLnR5cGUgPSAnY2VsbCc7XG4gICAgcmVuZGVyZXIoY29udGV4dCwgY29uZmlnKTtcbn07XG5cblxuR3JpZC5wcm90b3R5cGUucGFpbnRIZWFkZXJDZWxsID0gZnVuY3Rpb24oY29udGV4dCwgeCwgY29uZmlnKSB7XG4gICAgdmFyIHkgPSAwO1xuICAgIHZhciBib3VuZHMgPSB0aGlzLmdldEJvdW5kc09mQ2VsbCh4LCB5LCB0aGlzLnNjcm9sbFgsIDApO1xuICAgIHZhciBjb2x1bW4gPSB0aGlzLmdldENvbHVtbih4KTtcbiAgICB2YXIgcmVuZGVyZXIgPSBjb2x1bW4uZ2V0UmVuZGVyZXIoKTtcbiAgICB2YXIgdmFsdWUgPSBjb2x1bW4uZ2V0TGFiZWwoKTtcbiAgICBjb25maWcudmFsdWUgPSB2YWx1ZTtcbiAgICBjb25maWcueCA9IHg7XG4gICAgY29uZmlnLnkgPSB5O1xuICAgIGNvbmZpZy5ib3VuZHMgPSBib3VuZHM7XG4gICAgY29uZmlnLnR5cGUgPSAnaGVhZGVyJztcbiAgICByZW5kZXJlcihjb250ZXh0LCBjb25maWcpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0RmluYWxQYWdlTG9jYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5maW5hbFBhZ2VMb2NhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZmluYWxQYWdlTG9jYXRpb24gPSB0aGlzLmdldERlZmF1bHRGaW5hbFBhZ2VMb2NhdGlvbigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5maW5hbFBhZ2VMb2NhdGlvbjtcbn07XG5cbkdyaWQucHJvdG90eXBlLmdldERlZmF1bHRGaW5hbFBhZ2VMb2NhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBteVNpemUgPSB0aGlzLmdldENhbnZhcygpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHZhciBudW1Db2xzID0gdGhpcy5nZXRDb2x1bW5Db3VudCgpO1xuICAgIHZhciByb3dIZWlnaHQgPSB0aGlzLmdldFJvd0hlaWdodCgwKTtcbiAgICB2YXIgdG90YWxXaWR0aCA9IDA7XG4gICAgdmFyIG51bVJvd3MgPSBNYXRoLmZsb29yKG15U2l6ZS5oZWlnaHQvcm93SGVpZ2h0KTtcbiAgICB2YXIgaTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQ29sczsgaSsrKSB7XG4gICAgICAgIHZhciBjID0gbnVtQ29scyAtIGkgLSAxO1xuICAgICAgICB2YXIgZWFjaFdpZHRoID0gdGhpcy5nZXRDb2x1bW5XaWR0aChjKTtcbiAgICAgICAgdG90YWxXaWR0aCA9IHRvdGFsV2lkdGggKyBlYWNoV2lkdGg7XG4gICAgICAgIGlmICh0b3RhbFdpZHRoID49IG15U2l6ZS53aWR0aCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIG1heFggPSBudW1Db2xzIC0gaTtcbiAgICB2YXIgbWF4WSA9IHRoaXMuZ2V0Um93Q291bnQoKSAtIG51bVJvd3M7IFxuICAgIHJldHVybiB7eDogbWF4WCwgeTogbWF4WX1cbn07XG5cbkdyaWQucHJvdG90eXBlLmdldERlZmF1bHRDZWxsUmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGVmYXVsdGNlbGxyZW5kZXJlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkb21FbGVtZW50LCBtb2RlbCkge1xuICAgIHJldHVybiBuZXcgR3JpZChkb21FbGVtZW50LCBtb2RlbCk7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cblxudmFyIEdyaWRNb2RlbCA9IGZ1bmN0aW9uKGpzb25EYXRhKSB7XG5cbiAgICAvL3RoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIG92ZXJyaWRlbiBieSBncmlkIGl0c2VsZjtcbiAgICAvL2lmIGNvb3JkaW5hdGVzIC0xLCAtMSBhcmUgdXNlZCwgaXQgbWVhbnMgXG4gICAgLy9yZXBhaW50IHRoZSB3aG9sZSB2aXNpYmxlIGdyaWRcbiAgICB0aGlzLmNoYW5nZWQgPSBmdW5jdGlvbih4LCB5KSB7fTtcblxuICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ganNvbkRhdGE7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAganNvbkRhdGEgPSBkYXRhO1xuICAgIH1cblxufTtcblxuR3JpZE1vZGVsLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uKGZpZWxkLCB5KSB7XG4gICAgdmFyIG9iaiA9IHRoaXMuZ2V0RGF0YSgpW3ldO1xuICAgIHZhciB2YWx1ZSA9IG9ialtmaWVsZF07XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuR3JpZE1vZGVsLnByb3RvdHlwZS5nZXRSb3dDb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmdldERhdGEoKS5sZW5ndGg7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyaWRNb2RlbDsiXX0=
