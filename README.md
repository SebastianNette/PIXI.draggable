PIXI.draggable
==============

The easiest way to get drag &amp; drop done in PIXI.js!

Demo: http://mokgames.com/draggable/

Bag & Skillbar Demo! http://mokgames.com/draggable/demo2.html

#### How to use ####
Simply load the pixi.draggable.js file after your pixi.js file.
```
<script src="pixi.js"></script>
<script src="pixi.draggable.js"></script>
```

#### Creating a draggable sprite ####

```javascript
var sprite = new PIXI.Sprite(texture);
stage.addChild(sprite);

sprite.draggable();
```

#### Only draggable along the x-axis ####

```javascript
var sprite = new PIXI.Sprite(texture);
stage.addChild(sprite);

sprite.draggable({ axis: 'x' });
```

#### Full list of drag options ####

```javascript
{
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
}
```

#### Full list of drop options ####

```javascript
{
  label: null,
  drop: null,
  accept: true,
  greedy: false,
  disabled: false,
  tolerance: 'intersect'
}
```

A tutorial and the sourcecode to achieve all the effects on the demo page will soon be online!
