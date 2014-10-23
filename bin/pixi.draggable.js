/**
* The MIT License (MIT)
*
* Copyright (c) 2014 Sebastian Nette
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*
* 
*
*/

/**
 * PIXI Draggables & Droppables v1.0.0
 * Copyright (c) 2014, Sebastian Nette
 * http://www.mokgames.com/
 */

/**
 * Attaches draggable method to all displayObjects.
 *
 * @method draggable
 * @param name
 * @param val
 * @return displayObject
 */
 PIXI.DisplayObject.prototype.draggable = function( name, val )
{
    // .draggable(null) destroy
    if(val == undefined && name === null)
    {
        this.__draggable = false;

        // restore events (?)
        this.mousedown = this.touchstart = options.mousedown;
        this.mousemove = this.touchmove = options.mousemove;
        this.mouseup = this.touchend = options.mouseup;
        this.mouseupoutside = this.touchendoutside = options.mouseupoutside;

        // check all interactive events
        //this.interactive = !!(this.mouseout || this.mouseover || this.click || this.tap || this.mousedown || this.touchstart || this.mousemove || this.touchmove || this.mouseup || this.touchend || this.mouseupoutside || this.touchendoutside);
        this.interactive = true;
    }

    // if no val set, then name is an object
    else if(val === undefined)
    {
        // make sure this one is correctly removed if it was already draggable
        if(this.__draggable)
        {
            this.draggable(null);
        }

        var options = name || {};

        // fill options with defaults
        for(var prop in PIXI.DragAndDropManager.options.drag)
        {
            if(!options.hasOwnProperty(prop))
            {
                options[prop] = PIXI.DragAndDropManager.options.drag[prop];
            }
        }

        // carry over old events
        if(this.mousedown && !options.mousedown) options.mousedown = this.mousedown;
        if(this.mousemove && !options.mousemove) options.mousemove = this.mousemove;
        if(this.mouseup && !options.mouseup) options.mouseup = this.mouseup;
        if(this.mouseupoutside && !options.mouseupoutside) options.mouseupoutside = this.mouseupoutside;

        this.dragOptions = options;

        this.offset = new PIXI.Point(0,0);
        this.original = new PIXI.Point(0,0);

        // only initialize this array if we actually use snap
        if(options.snap)
        {
            this.snapElements = [];
        }

        // set interactive 
        this.interactive = true;
        this.__draggable = true;

        // mouse events // maybe avoid bindings?
        this.mousedown = this.touchstart = PIXI.DragAndDropManager.onMouseDown.bind(this);
        this.mousemove = this.touchmove = PIXI.DragAndDropManager.onMouseMove.bind(this);
        this.mouseup = this.touchend = PIXI.DragAndDropManager.onMouseUp.bind(this);
        this.mouseupoutside = this.touchendoutside = PIXI.DragAndDropManager.onMouseUpOutside.bind(this);
    }

    // both name and val set
    else if(this.dragOptions)
    {
        // make sure draggable was initialized
        if(!this.__draggable)
        {
            this.draggable();
        }

        this.dragOptions[name] = val;

        // only initialize this array if we actually use snap
        if(name === 'snap' && val)
        {
            this.snapElements = [];
        }
    }

    return this;
};

/**
 * Attaches droppable method to all displayObjects.
 *
 * @method droppable
 * @param name
 * @param val
 * @return displayObject
 */
PIXI.DisplayObject.prototype.droppable = function( name, val )
{
    // .droppable(null) destroy
    if(val == undefined && name === null)
    {
        this.__droppable = false;
        this.interactive = true; // flag as dirty, cant set to false because there might be other events attached
    }

    // if no val set, then name is an object
    else if(val === undefined)
    {
        var options = name || {};

        // fill options with defaults
        for(var prop in PIXI.DragAndDropManager.options.drop)
        {
            if(!options.hasOwnProperty(prop))
            {
                options[prop] = PIXI.DragAndDropManager.options.drop[prop];
            }
        }

        this.dropOptions = options;

        // set interactive
        this.interactive = true; // TODO: Find a good way to collect droppanles without adding them to the interactive tree.
        this.__droppable = true;
    }

    // both name and val set
    else if(this.dropOptions)
    {
        // make sure droppable was initialized
        if(!this.__droppable)
        {
            this.droppable();
        }

        this.dropOptions[name] = val;
    }

    return this;
};

/**
 * The DragAndDropManager collects the interactive draggable & droppable items.
 * It also provides all drag and drop related functions.
 *
 * @class DragAndDropManager
 * @constructor
 */
PIXI.DragAndDropManager = function()
{

    /**
     * An array containing all the draggable items from our interactive tree.
     * @property draggableItems
     * @type Array
     * @private
     */
    this.draggableItems = [];
    
    /**
     * An array containing all the droppable items from our interactive tree.
     * @property droppableItems
     * @type Array
     * @private
     */
    this.droppableItems = [];
    
    /**
     * An array containing all the currently animated items.
     * @property tweeningItems
     * @type Array
     * @private
     */
    this.tweeningItems = [];
    
    /**
     * @property boundTick
     * @type Function
     */
    this.boundTick = this.tick.bind(this);

    /**
     * Is set to true when the ticker is running.
     * @property isTicking
     * @type Boolean
     */
    this.isTicking = false;
};

// constructor
PIXI.DragAndDropManager.prototype.constructor = PIXI.DragAndDropManager;

/**
 * @method clear
 * @private
 */
PIXI.DragAndDropManager.prototype.clear = function()
{
    this.draggableItems.length = 0;
    this.droppableItems.length = 0;
};

/**
 * Collects an draggable or droppable interactive child.
 *
 * @method collect
 * @param displayObject {DisplayObject} the displayObject to collect
 * @private
 */
PIXI.DragAndDropManager.prototype.collect = function(child)
{
    if(child.__draggable)
    {
        this.draggableItems.push(child);
    }

    if(child.__droppable)
    {
        this.droppableItems.push(child);
    }
};

/**
 * Is called when the mouse button is pressed on a draggable element.
 *
 * @method onDrag
 * @param item {displayObject} The draggable element.
 * @param mouse {Event} The DOM event of a mouse button being released.
 * @private
 */
PIXI.DragAndDropManager.prototype.onDrag = function(item, mouse)
{

    var options = item.dragOptions;

    // check if revert animation running
    if(item.tweening || options.disabled)
    {
        item.__isDragging = false;
        return;
    }

    var i, child;

    // check for valid handle
    if (options.handle)
    {
        // labeled handle
        if(typeof options.handle === 'string')
        {
            var validHandle = false;

            // loop through children to find a valid handle
            for(i = item.children.length - 1; i >= 0; i--)
            {
                child = item.children[i];
                if((child.label === options.handle || (child.__draggable && child.dragOptions.label === options.handle) || (child.__droppable && child.dropOptions.label === options.handle)) && item.stage.interactionManager.hitTest(child, mouse))
                {
                    validHandle = true;
                    break;
                }
            }

            // stop drag if no valid handle found
            if(!validHandle)
            {
                item.__isDragging = false;
                return;
            }
        }

        // handle is sprite
        else if(!item.stage.interactionManager.hitTest(options.handle, mouse))
        {
            item.__isDragging = false;
            return;
        }
    }

    // check for invalid cancel
    if(options.cancel)
    {
        // labeled cancel
        if(typeof options.cancel === 'string')
        {
            // loop through children to find a cancel
            for(i = item.children.length - 1; i >= 0; i--)
            {
                child = item.children[i];
                if((child.label === options.cancel || (child.__draggable && child.dragOptions.label === options.cancel) || (child.__droppable && child.dropOptions.label === options.cancel)) && item.stage.interactionManager.hitTest(child, mouse))
                {
                    item.__isDragging = false;
                    return;
                }
            }
        }

        // label is sprite
        else if(item.stage.interactionManager.hitTest(options.cancel, mouse))
        {
            item.__isDragging = false;
            return;
        }
    }

    // get relative position
    if(options.cursorAt)
    {
        var local = mouse.getLocalPosition(item);
        item.offset.set(options.cursorAt[0] - local.x, options.cursorAt[1] - local.y);
    }
    else
    {
        //var local = mouse.getLocalPosition(item);
        //item.offset.set(local.x, local.y);
        item.offset.set(0, 0);
    }

    // get start position    
    item.original.x = item.x;
    item.original.y = item.y;

    // define start x / y
    if(!mouse.start)
    {
        mouse.start = mouse.global.clone();
    }
    else
    {
        mouse.start.x = mouse.global.x;
        mouse.start.y = mouse.global.y;
    }

    // check for opacity
    item.originalAlpha = item.alpha;
};

/**
 * Is called when the mouse button is pressed on a draggable element and the mouse starts moving.
 * This is the first mousemove event for the draggable element.
 *
 * @method onDragStart
 * @param item {displayObject} The draggable element.
 * @param mouse {Event} The DOM event of a mouse button being released.
 * @private
 */
PIXI.DragAndDropManager.prototype.onDragStart = function(item, mouse)
{
    var options = item.dragOptions;

    // verify the minimum drag distance
    if(Math.abs(mouse.start.x - mouse.global.x) < options.distance && Math.abs(mouse.start.y - mouse.global.y) < options.distance)
    {
        item.__dragStart = false;
        return;
    }

    // destroy prior used helper sprite
    this.destroyHelperSprite(item);

    // check for helper
    if(options.helper === 'clone')
    {
        item.dragElement = new PIXI.Sprite(item.generateTexture());
        item.parent.addChild(item.dragElement);
        item.dragElement.position.set(item.x, item.y);
        item.dragElement.pivot.set(item.pivot.x, item.pivot.y);
        if(item.anchor)
        {
            item.dragElement.anchor.set(item.anchor.x, item.anchor.y);
        }

        // set helper interactive to carry over special pointers during move
        if(options.cursor !== 'inherit')
        {
            item.dragElement.interactive = true;
        }
    }
    else
    {
        item.dragElement = item;
    }

    // save default cursor
    item.dragElement._defaultCursor = item.dragElement.defaultCursor;
    item.dragElement.defaultCursor = options.cursor;
    item.dragElement._buttonMode = item.dragElement.buttonMode;
    item.dragElement.buttonMode = true;
    
    // set opacity
    item.dragElement.alpha = item.alpha * options.alpha;

    // check for snap feature
    if(options.snap)
    {
        var draggables = this.draggableItems,
            draggable, bounds;

        for(var i = draggables.length - 1; i >= 0; i--)
        {
            draggable = draggables[i];
            if(draggable.worldVisible && (options.snap === true || options.snap === draggable.dragOptions.label) && draggable !== item)
            {
                bounds = draggable.hitArea ? draggable.hitArea : draggable.getBounds();
                if(!draggable.snapBounds)
                {
                    draggable.snapBounds = {
                        x: bounds.x,
                        y: bounds.y,
                        x2: bounds.x + bounds.width,
                        y2: bounds.y + bounds.height,
                        dist: 0
                    };
                }
                else
                {
                    draggable.snapBounds.x = bounds.x;
                    draggable.snapBounds.y = bounds.y;
                    draggable.snapBounds.x2 = bounds.x + bounds.width;
                    draggable.snapBounds.y2 = bounds.y + bounds.height;
                }

                item.snapElements.push(draggable);
            }
        }
    }

    // call custom start callback
    if(options.start)
    {
        options.start(item, mouse);
    }
};

/**
 * Is called when the mouse button is pressed on a draggable element and the mouse starts moving.
 *
 * @method onDragMove
 * @param item {displayObject} The draggable element.
 * @param mouse {Event} The DOM event of a mouse button being released.
 * @private
 */
PIXI.DragAndDropManager.prototype.onDragMove = (function()
{

    function sqr(x)
    {
        return x * x;
    };

    return function(item, mouse)
    {

        var options = item.dragOptions,
            mx = mouse.global.x,
            my = mouse.global.y,
            dx = mx - mouse.start.x,
            dy = my - mouse.start.y,
            x = item.original.x + dx - item.offset.x,
            y = item.original.y + dy - item.offset.y,
            x2 = x + item.width,
            y2 = y + item.height,
            containment, i;

        // check for containment
        if(options.containment)
        {
            if(options.containment === 'parent')
            {
                containment = /*item.parent.hitArea && item.parent.hitArea.contains ? item.parent.hitArea : */item.parent.getBounds();
            }
            else
            {
                containment = (options.containment instanceof PIXI.Rectangle) ? options.containment : /*(options.containment.hitArea && options.containment.hitArea.contains ? options.containment.hitArea :*/ options.containment.getBounds();//);
            }

            // x bounds
            if(options.axis !== 'y')
            {
                if (x < 0)
                {
                    x = 0;
                }
                else if (x2 > containment.width)
                {
                    x = containment.width - item.width;
                }
            }

            // y bounds
            if(options.axis !== 'x')
            {
                if (y < 0)
                {
                    y = 0;
                }
                else if (y2 > containment.height)
                {
                    y = containment.height - item.height;
                }
            }
        }

        // check for grid elements 
        if(options.grid)
        {
            var grid;

            // check x grid
            if(options.grid[0] && options.axis !== 'y')
            {
                grid = options.grid[0];
                x = item.original.x + Math.round((x - item.original.x) / grid) * grid;
                if(containment && !(x > 0 || x2 < containment.width))
                {
                    x += (x > 0) ? -grid : grid;
                }
            }

            // check y grid
            if(options.grid[1] && options.axis !== 'x')
            {
                grid = options.grid[1];
                y = item.original.y + Math.round((y - item.original.y) / grid) * grid;
                if(containment && !(y > 0 || y2 < containment.height))
                {
                    y += (y > 0) ? -grid : grid;
                }
            }
        }

        // check for snap feature
        if(options.snap)
        {
            var snapElement,
                snapped = false,
                d = options.snapTolerance,
                l, r, t, b, i;

            // sort elements closest -> optional, maybe too expensive sometimes
            if(options.snapSort)
            {
                var tx = item.worldTransform.tx + item.width/2;
                var ty = item.worldTransform.ty + item.height/2;

                for(i = item.snapElements.length - 1; i >= 0; i--)
                {
                    snapElement = item.snapElements[i];
                    snapElement.snapBounds.dist = sqr(tx - snapElement.worldTransform.tx - snapElement.width/2) + sqr(ty - snapElement.worldTransform.ty - snapElement.height/2, 2);
                }

                item.snapElements.sort(this.closestSort);
            }

            // loop  over all snap elements
            for(i = item.snapElements.length - 1; !snapped && i >= 0; i--)
            {
                snapElement = item.snapElements[i];

                l = snapElement.snapBounds.x;
                r = snapElement.snapBounds.x2;
                t = snapElement.snapBounds.y;
                b = snapElement.snapBounds.y2;

                if(x2 > l - d && x < r + d && y2 > t - d && y < b + d)
                {
                    if (options.snapMode !== 'inner')
                    {
                        if (Math.abs(t - y2) <= d)
                        {
                            y = t - item.height;
                            snapped = true;
                        }
                        else if (Math.abs(b - y) <= d)
                        {
                            y = b;
                            snapped = true;
                        }
                        if (Math.abs(l - x2) <= d)
                        {
                            x = l - item.width;
                            snapped = true;
                        }
                        else if (Math.abs(r - x) <= d)
                        {
                            x = r;
                            snapped = true;
                        }
                    }

                    if (!snapped && options.snapMode !== 'outer')
                    {
                        if (Math.abs(t - y) <= d)
                        {
                            y = t;
                            snapped = true;
                        }
                        else if (Math.abs(b - y2) <= d)
                        {
                            y = b - item.height;
                            snapped = true;
                        }
                        if (Math.abs(l - x) <= d)
                        {
                            x = l;
                            snapped = true;
                        }
                        else if (Math.abs(r - x2) <= d)
                        {
                            x = r - item.width;
                            snapped = true;
                        }
                    }
                }
            }
        }

        // align along x axis
        if(options.axis === 'x')
        {
            item.dragElement.x = x;
        }

        // align along y axis
        else if(options.axis === 'y')
        {
            item.dragElement.y = y;
        }

        // both
        else
        {
            item.dragElement.x = x;
            item.dragElement.y = y;
        }

        // call custom drag callback
        if(options.drag)
        {
            options.drag(item, mouse);
        }

        // TODO: visual feedback for droppables
    };

})();

/**
 * Is called when the mouse button is released for a draggable element.
 *
 * @method onDrop
 * @param item {displayObject} The draggable element.
 * @param mouse {Event} The DOM event of a mouse button being released.
 * @private
 */
PIXI.DragAndDropManager.prototype.onDrop = function(item, mouse)
{

    var options = item.dragOptions;

    // restore cursor
    item.dragElement.defaultCursor = item.dragElement._defaultCursor;
    item.dragElement.buttonMode = item.dragElement._buttonMode;

    // check droppables
    var droppables = this.droppableItems;
    var dropped = false;
    if(droppables.length)
    {
        // TODO: optimize. sort droppables by greedy, avoids the intersects array. is sort less expensive than an array?
        var intersects = [],
            droppable,
            accept,
            currBounds = item.dragElement.getBounds(),
            i, j;

        currBounds.x2 = currBounds.x + currBounds.width;
        currBounds.y2 = currBounds.y + currBounds.height;

        for(i = droppables.length - 1; i >= 0; i--)
        {
            droppable = droppables[i];

            // skip invisible // same item // disabled
            if(!droppable.worldVisible || droppable === item || droppable.dropOptions.disabled)
            {
                continue;
            }
            accept = droppable.dropOptions.accept;

            // accept multiple kinds
            if(accept instanceof Array)
            {
                for(j = accept.length - 1; j >= 0; j--)
                {
                    if(accept[j] === this || accept[j] === options.label)
                    {
                        if(this.intersect(item, mouse, droppable, currBounds))
                        {
                            dropped = true;
                            if(droppable.dropOptions.greedy)
                            {
                                intersects.length = 0;
                                intersects.push(droppable);
                                i = -1; // break droppables loop
                                break; // break accept loop
                            }
                            else
                            {
                                intersects.push(droppable);
                            }
                        }
                    }
                }
            }
            else if(accept === this || accept === options.label || accept === true)
            {
                if(this.intersect(item, mouse, droppable, currBounds))
                {
                    dropped = true;
                    if(droppable.dropOptions.greedy)
                    {
                        intersects.length = 0;
                        intersects.push(droppable);
                        break;
                    }
                    else
                    {
                        intersects.push(droppable);
                    }
                }
            }
        }

        // call drop on intersects
        for(i = intersects.length - 1; i >= 0; i--)
        {
            if(intersects[i].dropOptions.drop)
            {
                intersects[i].dropOptions.drop(item, mouse);
            }
        }
    }
    else
    {
        // if no droppables, drop is always true
        dropped = true;
    }

    // revert
    if ((options.revert === 'invalid' && !dropped) || (options.revert === 'valid' && dropped) || options.revert === true)
    {
        // TODO: better Tweening
        if(options.revertDuration)
        {
            // mark item as tweening
            item.tweening = true;

            // add to queue
            this.tweeningItems.push({
                time: Date.now(),
                duration: options.revertDuration,
                item: item,
                mouse: mouse,
                x: item.dragElement.x,
                y: item.dragElement.y,
                dx: item.dragElement.x - item.original.x,
                dy: item.dragElement.y - item.original.y
            });

            // if ticker is not running -> start it
            if(!this.isTicking)
            {
                this.isTicking = true;
                this.tick();
            }
        }
        else
        {
            item.dragElement.x = item.original.x;
            item.dragElement.y = item.original.y;
            this.stop(item, mouse);
        }
    }
    else
    {
        if(item.dragElement !== item)
        {
            item.x = item.dragElement.x;
            item.y = item.dragElement.y;
        }
        this.stop(item, mouse);
    }

    // TODO: visual feedback for droppables
};

/**
 * Tick emitter for revert tweening.
 *
 * @method tick
 * @private
 */
PIXI.DragAndDropManager.prototype.tick = function()
{
    // stop ticker if no elements tweening
    var length = this.tweeningItems.length;
    if(!length)
    {
        this.isTicking = false;
        return;
    }

    // call next tick
    requestAnimationFrame(this.boundTick);
    
    var now = Date.now(),
        tween, elapsed, item;

    for(var i = length - 1; i >= 0; i--)
    {
        tween = this.tweeningItems[i];
        elapsed = now - tween.time;
        item = tween.item;

        // tween is over
        if(elapsed >= tween.duration)
        {
            // stop tweening
            item.tweening = false;

            item.dragElement.x = item.original.x;
            item.dragElement.y = item.original.y;

            this.stop(item, tween.mouse);

            // remove item from list
            this.tweeningItems.splice(i,1);
        }
        else
        {
            item.dragElement.x = tween.x - tween.dx * elapsed / tween.duration;
            item.dragElement.y = tween.y - tween.dy * elapsed / tween.duration;
        }
    }
};

/**
 * Is called when the drop process is over.
 *
 * @method stop
 * @param item {displayObject} A draggable element.
 * @param mouse {Event} The DOM event of a mouse.
 * @private
 */
PIXI.DragAndDropManager.prototype.stop = function(item, mouse)
{
    // revert alpha
    item.dragElement.alpha = item.originalAlpha;

    // destroy helper sprite
    this.destroyHelperSprite(item);

    // reset snap elements array
    if(item.dragOptions.snap)
    {
        item.snapElements.length = 0;
    }

    // call custom stop callback
    if(item.dragOptions.stop)
    {
        item.dragOptions.stop(item, mouse);
    }
};

/**
 * Is called when the draggable elements are sorted from close to far.
 *
 * @method closestSort
 * @param a {displayObject} A draggable element.
 * @param b {displayObject} A draggable element.
 * @private
 */
PIXI.DragAndDropManager.prototype.closestSort = function(a, b)
{
    if(a.snapBounds.snapDist < b.snapBounds.snapDist)
    {
        return -1;
    }
    if(a.snapBounds.snapDist > b.snapBounds.snapDist)
    {
        return 1;
    }
    return 0;
};

/**
* Destroys the helper sprite.
*
* @method destroyHelperSprite
* @private
*/
PIXI.DragAndDropManager.prototype.destroyHelperSprite = function(item)
{
    // make sure it's a helper and not the original
    if(item.dragElement && item.dragElement !== item)
    {
        item.dragElement.parent.removeChild(item.dragElement);
        item.dragElement.texture.destroy(true);
        item.dragElement = null; // TODO: Maybe pooling?
    }
};

/**
 * Is called when the draggable object is dropping.
 *
 * @method intersect
 * @param item {displayObject} The draggable element.
 * @param mouse {Event} The DOM event of a mouse.
 * @param droppable {displayObject} The droppable element.
 * @param currBounds {PIXI.Rectangle} The current bounds of the draggable element.
 * @private
 */
PIXI.DragAndDropManager.prototype.intersect = function(item, mouse, droppable, currBounds)
{
    var bounds;           
    switch(droppable.dropOptions.tolerance)
    {

        // the draggable object must be at least 50% over the target on both axes
        case 'intersect':
            bounds = droppable.getBounds();
            return (bounds.x < currBounds.x + (currBounds.width/2) && currBounds.x2 - (currBounds.width/2) < bounds.x+bounds.width && bounds.y < currBounds.y + (currBounds.height/2) && currBounds.y2 - (currBounds.height/2) < bounds.y+bounds.height);
        
        // the draggable object must fit into the target
        case 'fit':
            bounds = droppable.getBounds();
            return (bounds.x <= currBounds.x && currBounds.x2 <= bounds.x+bounds.width && bounds.y <= currBounds.y && currBounds.y2 <= bounds.y+bounds.height);
        
        // the mouse pointer must be inside the target
        case 'pointer':
            return item.stage.interactionManager.hitTest(droppable, mouse);

        // the draggable object must at least slightly touch the target
        case 'touch':
            bounds = droppable.getBounds();
            return (
                (currBounds.y >= bounds.y && currBounds.y <= bounds.y+bounds.height) ||
                (currBounds.y2 >= bounds.y && currBounds.y2 <= bounds.y+bounds.height) ||
                (currBounds.y < bounds.y && currBounds.y2 > bounds.y+bounds.height)
            ) && (
                (currBounds.x >= bounds.x && currBounds.x <= bounds.x+bounds.width) ||
                (currBounds.x2 >= bounds.x && currBounds.x2 <= bounds.x+bounds.width) ||
                (currBounds.x < bounds.x && currBounds.x2 > bounds.x+bounds.width)
            );

        // unsupported tolerance
        default:
            return false;
    }
};

/**
 * Is called when the mouse button is pressed down on the draggable element.
 * "this" refers to the draggable element.
 *
 * @static
 * @method onMouseDown
 * @param mouse {Event} The DOM event of a mouse button being pressed down.
 * @private
 */
PIXI.DragAndDropManager.onMouseDown = function(mouse)
{
    //var item = mouse.target;

    // regular event
    if(this.dragOptions.mousedown)
    {
        this.dragOptions.mousedown(mouse);
    }

    // item.__isDragging true to notify the other methods that this element is being dragged.
    this.__isDragging = true;
    this.stage.interactionManager.DragAndDropManager.onDrag(this, mouse);
};

/**
 * Is called when the mouse moves across the draggable element.
 * "this" refers to the draggable element.
 *
 * @static
 * @method onMouseMove
 * @param mouse {Event} The DOM event of the mouse moving.
 * @private
 */
PIXI.DragAndDropManager.onMouseMove = function(mouse)
{
    //var item = mouse.target;

    // regular event
    if(this.dragOptions.mousemove)
    {
        this.dragOptions.mousemove(mouse);
    }

    // item.__isDragging must be set true to emit drag move
    if(this.__isDragging)
    {

        // the first drag move
        if(!this.__dragStart)
        {
            this.__dragStart = true;
            this.stage.interactionManager.DragAndDropManager.onDragStart(this, mouse);
        }
        else
        {
            this.stage.interactionManager.DragAndDropManager.onDragMove(this, mouse);
        }
    }
};

/**
 * Is called when the mouse button is released on the draggable element.
 * "this" refers to the draggable element.
 *
 * @static
 * @method onMouseUp
 * @param mouse {Event} The DOM event of a mouse button being released.
 * @private
 */
PIXI.DragAndDropManager.onMouseUp = function(mouse)
{
    //var item = mouse.target;

    // regular event
    if(this.dragOptions.mouseup)
    {
        this.dragOptions.mouseup(mouse);
    }

     // item.__isDragging must be set true to emit drop
    if(this.__isDragging)
    {
        this.__isDragging = false;
        if(this.__dragStart)
        {
            this.__dragStart = false;
            this.stage.interactionManager.DragAndDropManager.onDrop(this, mouse);
        }
    }
};

/**
 * Is called when the mouse button is released outside the draggable element.
 * "this" refers to the draggable element.
 *
 * @static
 * @method onMouseUpOutside
 * @param mouse {Event} The DOM event of a mouse button being released.
 * @private
 */
PIXI.DragAndDropManager.onMouseUpOutside = function(mouse)
{
    //var item = mouse.target;

    // regular event
    if(this.dragOptions.mouseupoutside)
    {
        this.dragOptions.mouseupoutside(mouse);
    }

    // check for drop!
    if(this.__isDragging)
    {
        this.__isDragging = false;
        if(this.__dragStart)
        {
            this.__dragStart = false;
            this.stage.interactionManager.DragAndDropManager.onDrop(this, mouse);
        }
    }
};

// the default drag abd drop options
PIXI.DragAndDropManager.options = {

    drag: {
        distance: 1,
        axis: null,
        containment: null,
        cursor: 'inherit',
        cursorAt: null,
        grid: false,
        handle: null,
        cancel: null,
        helper: 'original',
        alpha: 1,
        revert: false,
        revertDuration: 500,
        label: null,
        snap: null,
        snapMode: 'both',
        snapSort: false,
        snapTolerance: 20,
        disabled: false,

        // special drag events
        drag: null,
        start: null,
        stop: null,

        // regular mouse // tap events
        mousedown: null,
        mousemove: null,
        mouseup: null,
        mouseupoutside: null
    },

    drop: {
        label: null,
        drop: null,
        accept: true,
        greedy: false,
        disabled: false,
        tolerance: 'intersect'
    }
};

/**
 * We are hooking into the PIXI.InteractionManager to avoid core changes.
 * This is pretty hacky.
 *
 * @method rebuildInteractiveGraph
 * @private
 */
PIXI.InteractionManager.prototype.rebuildInteractiveGraph = (function()
{

    // store previously set PIXI.InteractionManager.prototype.rebuildInteractiveGraph
    var rebuildInteractiveGraph = PIXI.InteractionManager.prototype.rebuildInteractiveGraph;

    return function()
    {

        // make sure the InteractionManager has a DragAndDropManager attached.
        if(!this.DragAndDropManager)
        {
            // create a brand new instance
            this.DragAndDropManager = new PIXI.DragAndDropManager();
        }
        else
        {
            // clear the old draggable and droppable tree.
            this.DragAndDropManager.clear();
        }

        // call original PIXI.InteractionManager.prototype.rebuildInteractiveGraph
        rebuildInteractiveGraph.call(this);

        // collect draggables & droppables from the interactive tree.
        for(var i = this.interactiveItems.length - 1; i >= 0; i--)
        {
            this.DragAndDropManager.collect(this.interactiveItems[i]);
        }
    };
})();
