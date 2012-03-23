//
//  Slider Puzzle for mobile browser (webkit optimized)
//  Evan You
//  02-24-2012
//  
//  Built with Zepto.js
//

var PUZZLE = (function ($, window, undefined) {
	"use strict";

	var animating      = false,
		tileSize       = 72,
		animationSpeed = 150,
		setTimeout     = window.setTimeout,
		
		// Templates
		templates = {
			board: function () {
				return '<div id="board"></div>';
			},
			tile: function (id) {
				var offsetTop  = ~~(id / 4) * -tileSize,
					offsetLeft = id % 4 * -tileSize;
				return '<div class="tile">' +
					'<img src="img/globe.jpg" draggable="false" style="top:' + offsetTop + 'px; left:' + offsetLeft + 'px">' +
					'</div>';
			},
			shuffleButton: function () {
				return '<a id="shuffle">Shuffle</a>';
			}
		},
		
		// Utility function for vendor prefixes
		cssTransform = function (x, y) {
			var translation = 'translate(' + x + 'px,' + y + 'px)';
			return {
				'-webkit-transform': translation,
				'-moz-transform': translation,
				'-ms-transform': translation,
				'-o-transform': translation,
				'transform': translation
			};
		};

	// The tile object
	var Tile = function (id, board) {
		this.id = id; // This also stands for the correct position
		this.board = board;
		this.render();
	};
	
	Tile.prototype = {
		
		// Render dom element wrapped in Zepto selector
		render: function () {
			this.el = $(templates.tile(this.id));
		},
		
		// Update and animate to new position
		update: function (position) {
			this.position = position;
			this.x = (position % 4) * tileSize;
			this.y = ~~(position / 4) * tileSize;
			this.el.data('position', position).css(cssTransform(this.x, this.y));
		},
		
		// Determine the legit move direction
		// 0-top, 1-right, 2-bottom, 3-left, -1 if cannot move
		getMovableDirection: function () {
			var row  = ~~(this.position / 4),
				col  = this.position % 4,
				slot = this.board.openSlot;
			if (row === slot.row) {
				return col < slot.col ?  1 : 3;
			} else if (col === slot.col) {
				return row < slot.row ? 2 : 0;
			} else {
				return -1;
			}
		},
		
		// Get neighbor with given direction
		// returns a tile object if there is a nieghbor
		// returns null if the cell in that direction is empty
		// implicitly returns undefined if out of bound
		getNeighbor: function (direction) {
			var n;
			switch(direction) {
				case 0:
					n = this.position - 4;
					break;
				case 1:
					n = this.position + 1;
					break;
				case 2:
					n = this.position + 4;
					break;
				case 3:
					n = this.position - 1;
					break;
				default:
					break;
			}
			if (n >= 0 && n < 16) {
				return this.board.tiles[n];
			}
		}
	};

	// The board object
	var Board = function () {
		this.buildTiles();
		this.shuffle();
		this.render();
		this.update();
	};
	
	Board.prototype = {
		
		// Populate the tiles
		buildTiles: function () {
			// Array holding the tile objects
			// The index here determines the actual position on the board
			// The empty slot is null
			this.tiles = [];
			for (var i = 0; i < 15; i++) {
				this.tiles.push(new Tile(i, this));
			}
			this.tiles.push(null);
			this.setOpenSlot(15);
		},
		
		// Shuffle the tiles
		shuffle: function () {
			var i, j, temp;
			for (i = this.tiles.length - 1; i > 0; i--) {
				j = ~~(Math.random() * (i + 1));
				temp = this.tiles[i];
				this.tiles[i] = this.tiles[j];
				this.tiles[j] = temp;
			}
		},
		
		// Render dom element wrapped in Zepto selector
		render: function () {
			this.el = $(templates.board());
			for (var i = 0, j = this.tiles.length; i < j; i++) {
				if (this.tiles[i]) {
					this.el.append(this.tiles[i].el);
				}
			}
			this.initEvents();
		},
		
		// Delegate touch events on tiles
		initEvents: function () {
			var board = this,
				touch = {}; // Object for holding variables during a touch events cycle
			board.el
				.delegate('.tile', 'touchstart mousedown', function (e) {
					if (!animating && (!e.touches || e.touches.length === 1)) {
						touch.tile = board.tiles[$(this).data('position')];
						touch.direction = touch.tile.getMovableDirection();
						if (touch.direction !== -1) {
							touch.legit = true;
							touch.axis = touch.direction % 2 === 0; // true:y, false:x
							
							// Record original position
							touch.op = touch.axis ? (e.pageY || e.touches[0].pageY) : (e.pageX || e.touches[0].pageX);
							
							// Determine bounds and trigger point
							switch (touch.direction) {
								case 0:
								case 3:
									touch.lowerBound = -tileSize;
									touch.upperBound = 0;
									break;
								case 1:
								case 2:
									touch.lowerBound = 0;
									touch.upperBound = tileSize;
									break;
								default:
									break;
							}
							touch.triggerPoint = (touch.upperBound + touch.lowerBound) / 2;
							
							// Look for other affected tiles
							touch.group = [];
							var t = touch.tile;
							while (t !== null && t !== undefined) {
								touch.group.push(t);
								t = t.getNeighbor(touch.direction);
							}
						}
					}
				})
				.delegate('.tile', 'touchmove mousemove', function (e) {
					var i, j, dx, dy;
					if ((!e.touches || e.touches.length === 1) && touch.legit) {
						if (!touch.dragging) {
							touch.dragging = true;
							for (i = 0, j = touch.group.length; i < j; i++) {
								touch.group[i].el.addClass('drag');
							}
						}
						
						// Record displacement and limit it to the bounds
						var d = (touch.axis ? (e.pageY || e.touches[0].pageY) : (e.pageX || e.touches[0].pageX)) - touch.op;
						touch.dp = Math.max(Math.min(d, touch.upperBound), touch.lowerBound);
						
						// Drag animation
						for (i = 0, j = touch.group.length; i < j; i++) {
							dx = touch.group[i].x + (touch.axis ? 0 : touch.dp);
							dy = touch.group[i].y + (touch.axis ? touch.dp : 0);
							touch.group[i].el.css(cssTransform(dx, dy));
						}
					}
				})
				.delegate('.tile', 'touchend mouseup', function (e) {
					var i, j;
					if (touch.legit) {
						if (touch.dragging && Math.abs(touch.dp) < Math.abs(touch.triggerPoint)) {
							// Dragged but cancelled
							// return all tiles to original position
							for (i = 0, j = touch.group.length; i < j; i++) {
								touch.group[i].el
									.removeClass('drag')
									.css(cssTransform(touch.group[i].x, touch.group[i].y));
							}
							board.lock();
						} else {
							// Triggered a successful move
							// move the tile objects to new positions in array
							board.tiles[board.openSlot.position] = touch.group[touch.group.length - 1];
							for (i = touch.group.length - 1; i >= 0; i--) {
								board.tiles[touch.group[i].position] = (i === 0 ? null : touch.group[i-1]);
							}
							// Animatie
							if (touch.dragging) {
								for (i = 0, j = touch.group.length; i < j; i++) {
									touch.group[i].el.removeClass('drag');
								}
							}
							board.update();
						}
					}
					// Reset
					touch = {};
				});
		},
		
		// Update tiles/slots according to current positions
		update: function () {
			this.lock();
			for (var i = 0, j = this.tiles.length; i < j; i++) {
				if (this.tiles[i]) {
					this.tiles[i].update(i);
				} else {
					this.setOpenSlot(i);
				}
			}
			if (this.gameComplete()) {
				var board = this;
				setTimeout( function () {
					window.alert('Wow you are damn good at slider puzzles... gonna shuffle that so that you can play some more!');
					board.shuffle();
					board.update();
				}, animationSpeed);
			}
		},
		
		// Utility function for setting the empty slot
		setOpenSlot: function (i) {
			this.openSlot = {
				position: i,
				row: ~~(i / 4),
				col: i % 4
			};
		},
		
		// Check if all tiles are in correct position
		gameComplete: function () {
			for (var i = 0, j = this.tiles.length; i < j; i++) {
				if (this.tiles[i] && this.tiles[i].id !== i) {
					return false;
				}
			}
			return true;
		},
		
		// Prevent all touch events for a given duration
		// Used during animation
		lock: function () {
			animating = true;
			setTimeout(function () {
				animating = false;
			}, animationSpeed);
		}
	};

	// Expose initialization function
	return {
		init: function (container) {
			
			// Prevent mobile browser viewport movement
			$(document.body).bind('touchmove', function (e) {
				e.preventDefault();
			});
			
			// Create puzzle
			var board = new Board(),
				shuffleButton = $(templates.shuffleButton()).bind('click', function () {
					if (!animating) {
						board.shuffle();
						board.update();
					}
				});
			
			// Append elements to container
			$(container).append(board.el).append(shuffleButton);
		}
	};

}(Zepto, window));