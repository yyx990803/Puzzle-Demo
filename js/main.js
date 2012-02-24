var PUZZLE = (function ($) {

	//Variables

	var moving         = false,
		tileSize       = 72,
		animationSpeed = {
			fast: 150,
			slow: 350
		},
		templates      = {
			wrapper: function () {
				return '<div id="wrapper">'
					+ '<a id="shuffle">Shuffle</a>'
					+ '</div>';
			},
			board: function () {
				return '<div id="board"></div>';
			},
			tile: function (id) {
				var offsetTop  = Math.floor(id / 4) * tileSize * -1,
					offsetLeft = id % 4 * tileSize * -1;
				return '<div class="tile">'
					+ '<img src="img/globe.jpg" style="top:' + offsetTop + 'px; left:' + offsetLeft + 'px">'
					+ '</div>';
			},
			shuffleButton: function () {
				return '<a id="shuffle">Shuffle</a>';
			}
		};

	//The tile object

	var Tile = function (id, board) {
		this.id = id;
		this.board = board;
		this.render();
	};
	Tile.prototype = {
		render: function () {
			this.el = $(templates.tile(this.id));
		},
		update: function (position) {
			this.position = position;
			var el         = this.el,
				offsetTop  = Math.floor(position / 4) * tileSize,
				offsetLeft = (position % 4) * tileSize,
				translate  = 'translate(' + offsetLeft + 'px, ' + offsetTop + 'px)';
			el.data('position', position)
				.addClass('slow')
				.css({
					'-webkit-transform': translate,
					'-moz-transform': translate,
					'-ms-transform': translate,
					'-o-transform': translate,
					'transform': translate
				});
			setTimeout(function () {
				el.removeClass('slow');
			}, animationSpeed.slow);
		},
		isMovable: function () {
			return Math.floor(this.position / 4) === Math.floor(this.board.openSlot / 4) || (this.position % 4) === (this.board.openSlot % 4);
		}
	};

	//The board object

	var Board = function () {
		this.buildTiles();
		this.shuffle();
		this.render();
		this.update();
	};
	Board.prototype = {
		tiles: [],
		buildTiles: function () {
			var i;
			for (i = 0; i < 15; i += 1) {
				this.tiles.push(new Tile(i, this));
			}
			this.tiles.push(null);
			this.openSlot = 15;
		},
		shuffle: function () {
			var i, j, temp;
			for (i = this.tiles.length - 1; i > 0; i -= 1) {
				j = Math.floor(Math.random() * (i + 1));
				temp = this.tiles[i];
				this.tiles[i] = this.tiles[j];
				this.tiles[j] = temp;
			}
		},
		render: function () {
			this.el = $(templates.board());
			var i, j;
			for (i = 0, j = this.tiles.length; i < j; i += 1) {
				if (this.tiles[i]) {
					this.el.append(this.tiles[i].el);
				}
			}
			this.initEvents();
		},
		initEvents: function () {
			var board = this,
				touch = {};
			board.el
				.delegate('.tile', 'touchstart', function (e) {
					if (!moving && e.touches.length === 1) {
						var tile = board.tiles[$(this).data('position')];
						if (tile.isMovable()) {
							touch.x1 = e.touches[0].pageX;
							touch.x2 = e.touches[0].pageY;
						}
					}
				})
				.delegate('.tile', 'touchmove', function (e) {
					if (e.touches.length === 1) {
						var dx = e.touches[0].pageX - touch.x1,
							dy = e.touches[0].pageY - touch.y1;
					}
				})
				.delegate('.tile', 'touchend', function (e) {
					touch = {};
				});
		},
		update: function () {
			this.lock(animationSpeed.slow);
			var i, j;
			for (i = 0, j = this.tiles.length; i < j; i += 1) {
				if (this.tiles[i]) {
					this.tiles[i].update(i);
				} else {
					this.openSlot = i;
				}
			}
		},
		checkGameState: function () {
			var i, j;
			for (i = 0, j = this.tiles.length; i < j; i += 1) {
				if (this.tiles[i] && this.tiles[i].id !== i) {
					return false;
				}
			}
			return true;
		},
		lock: function (duration) {
			moving = true;
			setTimeout(function () {
				moving = false;
			}, duration);
		}
	};

	//Expose initialization function

	return {
		init: function (container) {

			//prevent mobile browser viewport movement

			$(document.body).bind('touchmove', function (e) {
				e.preventDefault();
			});

			//create puzzle

			var board = new Board(),
				shuffleButton = $(templates.shuffleButton()).bind('click', function () {
					if (!moving) {
						board.shuffle();
						board.update();
					}
				});

			$(container).append(board.el).append(shuffleButton);
		}
	};

}(Zepto));

$(document).ready(function () {
	PUZZLE.init(document.body);
});