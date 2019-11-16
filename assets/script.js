// @todo saving
// @todo pen lines
// @todo pen color
// @todo pen hardness
// @todo moveable characters
// @todo dynamic lighting
// @todo fog effect
// @todo weather, snow, etc.
// @todo responsive css
// @todo scss
// @todo blog it
// @todo optimise for touch - currently wip
// @todo use pointerlockapi
// @todo add hex grid
// @todo add a gallery of preset images, including some blank ones
// @todo multiple images at once? ctrl key
// @todo allow setting transparent colour from edge
// @todo allow setting background that isn't the current image?
// @todo break out into seperate files
// @todo improve menus
// @todo remove alert/prompt/confirm with something better
// @todo add undo/redo
// @todo add cut/copy/paste
// @todo fix preview titles
// @todo add cross site integrity for unpkg things

const Mc = {
	root: null,
	maps: new Map(),

	config: {
		border: 80, // px
		gridMax: 500, // px
		gridMin: 4, // px
		hideDelay: 5000, // ms
		keyGridSpeed: 1, // px
		keyMoveSpeed: 5, // px
		keyRotSpeed: 3, // deg
		keyZoomSpeed: 0.1,
		mouseRotSpeed: 3, //deg
		mouseZoomSpeed: 0.03, // px
		penSize: 15, // px
		zoomMax: 5.0,
		zoomMin: 0.1,
	},

	selectors: {
		emptyText: "#empty-text p",
		menu: "#other",
		rootNode: "#mapclusion",
	},

	state: {
		mapsCreated: 0,
		mouseDown: false,
		mouseLastMoved: null,
		moveOffsetX: 0,
		moveOffsetY: 0,
		touchCount: 0,
		touchEnabled: false,
		windowHeight: null,
		windowWidth: null,
	},

	text: {
		almostThere: "Almost there, release the map to start!",
		initError: "Could not create MapClusion!",
		tabClosing: "Are you sure you want to exit, loosing any maps?",
	},

	listeners: {
		touchstart(e) {
			// Prevent the icons from hiding
			Mc.state.touchEnabled = true;
			Mc.state.touchCount = e.touches.length;
		},
		mousemove(e) {
			Mc.state.mouseLastMoved = Date.now();
			Mc.root.classList.remove("inactive");
		},
		keydown(e) {
			// Only check events if the correct set of modifiers is set
			if (!e.altKey && !e.ctrlKey) {
				switch (e.key) {
					case "m": case "M":
						Mc.mode = "move";
						break;
					case "d": case "D":
						Mc.mode = "draw";
						break;
					case "p": case "P":
						Mc.mode = "play";
						break;
					case "r": case "R":
						Mc.RollDice();
						break;
					case "n": case "N":
						Mc.GenerateName();
						break;
					case "g": case "G":
						if (Mc.map) Mc.map.gridShow = !Mc.map.gridShow;
						break;
					case "+": case "=":
						if (Mc.map) Mc.map.gridSize += Mc.config.keyGridSpeed;
						break;
					case "-": case "_":
						if (Mc.map) Mc.map.gridSize -= Mc.config.keyGridSpeed;
						break;
					case "ArrowUp":
						if (Mc.map) {
							if (e.shiftKey) {
								Mc.map.gridY -= Mc.config.keyGridSpeed;
							} else {
								Mc.map.y -= Mc.config.keyMoveSpeed;
							}
						}
						break;
					case "ArrowDown":
						if (Mc.map) {
							if (e.shiftKey) {
								Mc.map.gridY += Mc.config.keyGridSpeed;
							} else {
								Mc.map.y += Mc.config.keyMoveSpeed;
							}
						}
						break;
					case "ArrowLeft":
						if (Mc.map) {
							if (e.shiftKey) {
								Mc.map.gridX -= Mc.config.keyGridSpeed;
							} else {
								Mc.map.x -= Mc.config.keyMoveSpeed;
							}
						}
						break;
					case "ArrowRight":
						if (Mc.map) {
							if (e.shiftKey) {
								Mc.map.gridX += Mc.config.keyGridSpeed;
							} else {
								Mc.map.x += Mc.config.keyMoveSpeed;
							}
						}
						break;
					case "h": case "H":
						Mc.ResetPosition();
						break;
					case "1": case "2": case "3":
					case "4": case "5": case "6":
					case "7": case "8": case "9":
						console.log("Loading Map " + (parseInt(e.key) - 1))
						Mc.map = parseInt(e.key) - 1;
						break;
					case "0":
						console.log("Loading Map 10");
						Mc.map = 10;
						break;
				}
			} else if (!e.altKey && e.ctrlKey) {
				switch (e.key) {
					case "ArrowUp":
						if (Mc.map) Mc.map.scale += Mc.config.keyZoomSpeed;
						break;
					case "ArrowDown":
						if (Mc.map) Mc.map.scale -= Mc.config.keyZoomSpeed;
						break;
					case "ArrowLeft":
						if (Mc.map) Mc.map.rotate += Mc.config.keyRotSpeed;
						break;
					case "ArrowRight":
						if (Mc.map) Mc.map.rotate -= Mc.config.keyRotSpeed;
						break;
				}
			} else if (e.altKey && !e.ctrlKey) {
				// Nothing yet...
			} else {
				// Nothing yet...
			}
		},
		drop(e) {
			e.preventDefault();

			let imageAdded = false;
			for (var i = 0; i < e.dataTransfer.files.length; i++) {
				if (e.dataTransfer.files[i].type.startsWith("image/")) {
					Mc.AddMapPath(URL.createObjectURL(e.dataTransfer.files[i]));
					imageAdded = true;
				}
			}

			let text = document.querySelector(Mc.selectors.emptyText);
			text.innerText = text.dataset.originalText;
		},
		dragover(e) {
			e.preventDefault();
			let text = document.querySelector(Mc.selectors.emptyText);
			// This event may trigger more than once, overiding the first value
			if(!text.dataset.originalText) {
				text.dataset.originalText = text.innerText;
			}
			text.innerText = Mc.text.almostThere;
		},
		dragleave(e) {
			let text = document.querySelector(Mc.selectors.emptyText);
			text.innerText = text.dataset.originalText;
		},
		resize(e) {
			console.log(window.innerHeight - Mc.state.windowHeight);

			// @todo change scale as window size changes

			Mc.state.windowHeight = window.innerHeight;
			Mc.state.windowWidth  = window.innerWidth;
		},
		beforeunload(e) {
			// @todo remove this before release
			// if (Mc.map) {
				// e.preventDefault()
				// return Mc.text.tabClosing;
			// }
		},
	},

	timers: [
		[1000, () => {
			if (
				!Mc.state.touchEnabled &&
				Mc.state.mouseLastMoved &&
				Date.now() - Mc.state.mouseLastMoved > Mc.config.hideDelay
			) {
				Mc.root.classList.add("inactive");
			} else {
				Mc.root.classList.remove("inactive");
			}
		}]
	],

	_name: 0,
	get map() {
		return Mc.maps[Mc._name];
	},
	set map(name) {
		if(name == Mc._name) return;

		if (!(name in Mc.maps)) {
			console.warn("Missing map name: " + name + "!");
			return;
		}
		Mc._name = name;

		for(let map in Mc.maps) {
			if (Mc.maps[map].node) {
				Mc.maps[map].back.style.opacity = 0;
				Mc.maps[map].node.style.display = "none";
				Mc.maps[map].preview.classList.remove("active");
			}
		}

		let map = Mc.maps[Mc._name];
		if (map.node) {
			map.back.style.opacity = 0.2;
			map.node.style.display = "block";
			Mc.maps[Mc._name].preview.classList.add("active");
		} else {
			Mc.root.querySelector("#layers")
				.appendChild(Mc.CreateMap(map));
			Mc.root.querySelector("#backgrounds")
				.appendChild(Mc.CreateBackground(map));
		}
		Mc.maps[Mc._name].preview.classList.add("active");
	},

	_mode: null,
	get mode() {return Mc._mode;},
	set mode(value) {
		Mc._mode = value;
		Mc.state.mouseDown = false;

		Mc.root.dataset.mode = Mc._mode;

		Mc.root.querySelectorAll("#controls ul li").forEach((control, _) => {
			control.classList.toggle(
				"active", control.dataset.control == Mc._mode
			);
		});
	},

	Init() {
		Mc.root = document.querySelector(Mc.selectors.rootNode);
		Mc.mode = "move"; // Here so the setter fires

		Mc.state.windowHeight = window.innerHeight;
		Mc.state.windowWidth  = window.innerWidth;

		new Sortable(Mc.root.querySelector("ul#previews-list"));

		Mc.SetListeners(true);
		Mc.SetTimers(true);
	},
	AddMap(event) {
		for(let file of event.target.files) {
			Mc.AddMapPath(URL.createObjectURL(file));
		}
		// Clear after loading images
		event.target.value = "";
	},
	AddMapPath(path) {
		if (!path) return;

		// @todo replace this with css
		Mc.root.querySelector(Mc.selectors.emptyText).style.display = "none";

		Mc.state.mapsCreated += 1;
		Mc.maps[Mc.state.mapsCreated] = {
			name: Mc.state.mapsCreated,
			path: path,
			canvas: null,
			context: null,
			background: null,
			preview: null,
			image: null,
			node: null,
			grid: null,

			_scale: 1,
			_rotate: 0,
			_x: 0,
			_y: 0,
			_gridShow: false,
			_gridSize: 40,
			_gridX: 50,
			_gridY: 50,

			get x() {return this._x;},
			set x(value) {
				this._x = value;
				if (this.node) {
					this.node.style.left = this._x + "px";
				}
			},

			get y() {return this._y;},
			set y(value) {
				this._y = value;
				if (this.node) {
					this.node.style.top = this._y + "px";
				}
			},

			get scale() {return this._scale;},
			set scale(value) {
				this._scale = clamp(
					value, Mc.config.zoomMin, Mc.config.zoomMax
				);

				if (this.node) {
					this.node.style.transform = "rotate(" + this._rotate +
						"deg) scale(" + this._scale + ")";
				}
			},

			get rotate() {return this._rotate;},
			set rotate(value) {
				this._rotate = value;
				if (this.node) {
					this.node.style.transform = "rotate(" + this._rotate +
						"deg) scale(" + this._scale + ")";
				}
			},

			get gridShow() {return this._gridShow;},
			set gridShow(value) {
				this._gridShow = value;
				if (this.grid) {
					this.grid.classList.toggle("grid", this._gridShow);
				}
			},

			get gridSize() {return this._gridSize;},
			set gridSize(value) {
				this._gridSize = clamp(
					value, Mc.config.gridMin, Mc.config.gridMax
				);

				if (this.grid) {
					this.grid.style.backgroundSize =
						this._gridSize + "px " + this._gridSize + "px";
				}
			},

			get gridX() {return this._gridX;},
			set gridX(value) {
				this._gridX = value;

				if (this.grid) {
					this.grid.style.backgroundPosition =
						this._gridX + "% " + this._gridY + "%";
				}
			},

			get gridY() {return this._gridY;},
			set gridY(value) {
				this._gridY = value;

				if (this.grid) {
					this.grid.style.backgroundPosition =
						this._gridX + "% " + this._gridY + "%";
				}
			},
		};

		Mc.root.querySelector("ul#previews-list")
			.appendChild(Mc.CreatePreview(Mc.maps[Mc.state.mapsCreated]));
		Mc.map = Mc.state.mapsCreated;
	},
	DownloadArchive() {
		var zip = new JSZip();
		zip.file("Hello.txt", "Hello World\n");
		var img = zip.folder("images");
		img.file("smile.gif", imgData, {base64: true});
		zip.generateAsync({type:"blob"}).then(function(content) {
			// see FileSaver.js
			saveAs(content, "example.zip");
		});
	},
	CreatePreview(map) {
		map.preview = document.createElement("li");

		let anchor = document.createElement("a");
		let span = document.createElement("span");
		span.innerText = Mc.state.mapsCreated;
		anchor.appendChild(span);
		let name = Mc.state.mapsCreated;
		anchor.addEventListener("click", e => {
			e.preventDefault();
			if (e.buttons == 0) Mc.map = name;
		});
		anchor.addEventListener("contextmenu", e => {
			e.preventDefault();
			if (confirm("Do you want to permantly delete map " + name + "?")) {
				Mc.DeleteMap(name);
			}
			return false;
		});
		anchor.title = map.path;
		map.preview.appendChild(anchor);

		return map.preview;
	},
	CreateBackground(map) {
		map.back = document.createElement("div");
		map.back.style.backgroundImage = "url(" + map.path + ")";
		return map.back;
	},
	CreateMap(map) {
		map.node = document.createElement("div");

		map.image = document.createElement("img");
		map.image.src = map.path;

		map.grid = document.createElement("div");
		map.gridSize = map.gridSize;

		map.canvas = document.createElement("canvas");
		map.context = map.canvas.getContext("2d");

		map.node.appendChild(map.image);
		map.node.appendChild(map.grid);
		map.node.appendChild(map.canvas);

		map.image.addEventListener("load", e => {
			// @todo make this better
			map.grid.style.marginTop    = (-map.image.naturalHeight / 2) + "px";
			map.grid.style.marginLeft   = (-map.image.naturalWidth  / 2) + "px";
			map.image.style.marginTop   = (-map.image.naturalHeight / 2) + "px";
			map.image.style.marginLeft  = (-map.image.naturalWidth  / 2) + "px";
			map.canvas.style.marginTop  = (-map.image.naturalHeight / 2) + "px";
			map.canvas.style.marginLeft = (-map.image.naturalWidth  / 2) + "px";
			map.canvas.height           = map.image.naturalHeight;
			map.canvas.width            = map.image.naturalWidth;
			map.grid.style.height       = map.image.naturalHeight + "px";
			map.grid.style.width        = map.image.naturalWidth + "px";

			Mc.AutoScale();
		}, true);

		map.node.addEventListener("mousedown", e => {
			Mc.state.mouseDown = true;

			Mc.state.moveOffsetX = map.node.offsetLeft - e.clientX;
			Mc.state.moveOffsetY = map.node.offsetTop  - e.clientY;
		}, true);

		map.node.addEventListener("mouseup", e => {
			Mc.state.mouseDown = false;
		}, true);

		map.node.addEventListener("mouseout", e => {
			if (Mc.mode != "draw") {
				Mc.state.mouseDown = false;
			}
		}, true);

		map.node.addEventListener("mousemove", e => {
			e.preventDefault();
			if (Mc.state.mouseDown) {
				if (Mc.mode == "move") {
					map.x = e.clientX + Mc.state.moveOffsetX;
					map.y = e.clientY + Mc.state.moveOffsetY;
				} else if (Mc.mode == "draw") {
					if (e.buttons == 1) {
						map.context.fillRect(
							e.offsetX, e.offsetY,
							Mc.config.penSize, Mc.config.penSize
						);
					} else {
						map.context.clearRect(
							e.offsetX, e.offsetY,
							Mc.config.penSize, Mc.config.penSize
						);
					}
				}
			}
		}, true);

		map.node.addEventListener("click", e => {
			Mc.map = map.name;
		}, true);

		map.node.addEventListener("dblclick", e => {
			if (Mc.mode == "move") map.scale++;
		}, true);

		map.node.addEventListener("contextmenu", e => {
			e.preventDefault();
			return false;
		}, true);

		map.node.addEventListener("touchstart", e => {
			e.preventDefault();
			// @todo improve
			Mc.state.touchCount = e.touches.length;
			if (Mc.state.touchCount == 0) {
				Mc.state.moveOffsetX=map.node.offsetLeft-e.touches[0].clientX;
				Mc.state.moveOffsetY=map.node.offsetTop -e.touches[0].clientY;
			}
		}, true);

		map.node.addEventListener("touchmove", e => {
			e.preventDefault();
			if (Mc.state.touchCount == 1) {
				if (Mc.mode == "move") {
					map.x = e.touches[0].clientX + Mc.state.moveOffsetX;
					map.y = e.touches[0].clientY + Mc.state.moveOffsetY;
				}
			}
		}, true);

		map.node.addEventListener("touchend", e => {
			e.preventDefault();
			Mc.state.touchCount = e.touches.length;
		}, true);

		map.node.addEventListener("dragstart", e => {
			e.preventDefault();
		}, true);

		map.node.addEventListener("wheel", e => {
			e.preventDefault();

			if (Mc.mode == "move") {
				let zoomDelta = Math.sign(e.ctrlKey?event.deltaX:event.deltaY);
				let rotDelta  = Math.sign(e.ctrlKey?event.deltaY:event.deltaX);

				let oldScale = map.scale;
				map.scale *= 1 + Mc.config.mouseZoomSpeed * zoomDelta;

				let scaleDelta = oldScale - map.scale;
				let rotH = (e.offsetX - e.target.clientWidth  / 2) * scaleDelta;
				let rotV = (e.offsetY - e.target.clientHeight / 2) * scaleDelta;
				let rads = map.rotate / 180.0 * Math.PI;
				map.x += rotH * Math.cos(rads) + rotV * Math.sin(rads+Math.PI);
				map.y += rotV * Math.cos(rads) - rotH * Math.sin(rads+Math.PI);

				map.rotate += rotDelta * Mc.config.mouseRotSpeed;
			} else if (Mc.mode == "draw") {
				Mc.config.penSize += Math.sign(event.deltaX || event.deltaY);
			}
		}, true);

		return map.node;
	},
	DeleteMap(name) {
		if (!(name in Mc.maps)) return;

		let old = Mc.maps[name];
		if (old.back) old.back.parentNode.removeChild(old.back);
		if (old.node) old.node.parentNode.removeChild(old.node);
		if (old.preview) old.preview.parentNode.removeChild(old.preview);
		delete Mc.maps[name];

		if (Mc.maps.size == 0) {
			// @todo replace this with css
			Mc.root.querySelector(Mc.selectors.emptyText)
				.style.display = "block";
		}

		// @todo select the next layer
		Mc.map = -1;
	},
	AutoScale() {
		if (!Mc.root || !Mc.map) return;

		if (
			(Mc.root.clientHeight-Mc.config.border)/Mc.map.image.naturalHeight>
			(Mc.root.clientWidth -Mc.config.border)/Mc.map.image.naturalWidth
		) {
			Mc.map.scale = (Mc.root.clientWidth  - Mc.config.border) / 
				Mc.map.image.naturalWidth;
		} else {
			Mc.map.scale = (Mc.root.clientHeight - Mc.config.border) /
				Mc.map.image.naturalHeight;
		}
	},
	SetListeners(state) {
		for(let name in Mc.listeners) {
			window.removeEventListener(name, Mc.listeners[name], true);
			if (state) window.addEventListener(name, Mc.listeners[name], true);
		}
	},
	SetTimers(state) {
		for(let timer of Mc.timers) {
			clearInterval(timer[1]);
			if (state) setInterval(timer[1], timer[0]);
		}
	},
	RollDice() {
		alert(dice.parse(prompt('Dice Roller')));
	},
	GenerateName() {
		let generator = generator$dungeon_and_dragons$humans;
		alert(titleCase(generator(Math.round(Math.random()))))
	},
	ResetPosition() {
		if (!Mc.map) return;

		Mc.map.x = Mc.map.y = Mc.map.rotate = 0;
		Mc.map.scale = 1;
		Mc.AutoScale();
	},
	ToggleMenu(state) {
		let menu = document.querySelector(Mc.selectors.menu);
		menu.classList.toggle('active', state);
	}
}

window.addEventListener("load", Mc.Init, true);
