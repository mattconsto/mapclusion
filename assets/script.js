// @todo dragging images
// @todo file browser
// @todo saving
// @todo loading
// @todo pen lines
// @todo pen color
// @todo pen hardness
// @todo moveable characters
// @todo dynamic lighting
// @todo fog effect
// @todo idk, something else?
// @todo responsive css
// @todo scss
// @todo refector
// @todo git it
// @todo blog it
// @todo optimise for touch - currently wip
// @todo use pointerlockapi

const Mc = {
	root: null,
	maps: [],

	state: {
		touchEnabled: false,
		touchCount: 0,
		mouseDown: false,
		moveOffset: {x: 0, y: 0},
		mouseLastMoved: Date.now(),
	},

	config: {
		border: 80,
		hideDelay: 5000,
		keyGridSpeed: 2,
		keyMoveSpeed: 5,
		keyRotSpeed: 3,
		keyZoomSpeed: 0.1,
		mouseRotSpeed: 3,
		mouseZoomSpeed: 0.03,
		penSize: 15,
		zoomMax: 5.0,
		zoomMin: 0.1,
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
			// Only check  events if the correct set of modifiers is set
			if(!e.altKey && !e.ctrlKey) {
				switch(e.key.toLowerCase()) {
					case "m": Mc.mode = "move";  break;
					case "d": Mc.mode = "draw";  break;
					case "p": Mc.mode = "play";  break;
					case "r": Mc.RollDice();     break;
					case "n": Mc.GenerateName(); break;
					case "a":
						Mc.AddMap(prompt('Please enter a path to the image'))
						break;
					case "g":
						Mc.map.gridShow = !Mc.map.gridShow;
						break;
					case "+": case "=":
						Mc.map.gridSize += Mc.config.keyGridSpeed;
						break;
					case "-": case "_":
						Mc.map.gridSize -= Mc.config.keyGridSpeed;
						break;
					case "arrowup":
						Mc.map.y -= Mc.config.keyMoveSpeed;
						break;
					case "arrowdown":
						Mc.map.y += Mc.config.keyMoveSpeed;
						break;
					case "arrowleft":
						Mc.map.x -= Mc.config.keyMoveSpeed;
						break;
					case "arrowright":
						Mc.map.x += Mc.config.keyMoveSpeed;
						break;
					case "h": Mc.ResetPosition(); break;
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
			} else if(!e.altKey && e.ctrlKey) {
				switch(e.key.toLowerCase()) {
					case "arrowup":
						Mc.map.scale += Mc.config.keyZoomSpeed;
						break;
					case "arrowdown":
						Mc.map.scale -= Mc.config.keyZoomSpeed;
						break;
					case "arrowleft":
						Mc.map.rotate += Mc.config.keyRotSpeed;
						break;
					case "arrowright":
						Mc.map.rotate -= Mc.config.keyRotSpeed;
						break;
				}
			} else if(e.altKey && !e.ctrlKey) {
				// Nothing yet...
			} else {
				// Nothing yet...
			}
		}
	},

	timers: [
		[1000, () => {
			if(
				!Mc.state.touchEnabled &&
				Date.now() - Mc.state.mouseLastMoved > Mc.config.hideDelay
			) {
				Mc.root.classList.add("inactive");
			} else {
				Mc.root.classList.remove("inactive");
			}
		}]
	],

	_index: 0,
	get map() {
		return Mc.maps[Mc._index];
	},
	set map(index) {
		if(index < 0 || index >= Mc.maps.length) {
			console.warn("Invalid map index!");
			return;
		}
		Mc._index = index;

		for(let index in Mc.maps) {
			if(Mc.maps[index].node) {
				Mc.maps[index].background.style.opacity = 0;
				Mc.maps[index].node.style.display = "none";
				Mc.maps[index].preview.classList.remove("active");
			}
		}

		let map = Mc.maps[index];
		if(map.node) {
			map.background.style.opacity = 0.2;
			map.node.style.display = "block";
			Mc.maps[index].preview.classList.add("active");
		} else {
			Mc.root.querySelector("#layers")
				.appendChild(Mc.CreateMap(map));
			Mc.root.querySelector("#backgrounds")
				.appendChild(Mc.CreateBackground(map));
		}
		Mc.maps[index].preview.classList.add("active");
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

	Init(node) {
		if(!node) {
			alert("Could not create MapClusion!");
			return;
		}

		Mc.root = node;
		Mc.mode = "move"; // Here so the setter fires

		Mc.SetListeners(true);
		Mc.SetTimers(true);
	},
	AddMap(path) {
		if(!path) return;

		Mc.maps.push({
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

			get x() {return this._x;},
			set x(value) {
				this._x = value;
				if(this.node) {
					this.node.style.left = this._x + "px";
				}
			},

			get y() {return this._y;},
			set y(value) {
				this._y = value;
				if(this.node) {
					this.node.style.top = this._y + "px";
				}
			},

			get scale() {return this._scale;},
			set scale(value) {
				this._scale = clamp(
					value, Mc.config.zoomMin, Mc.config.zoomMax
				);

				if(this.node) {
					this.node.style.transform = "rotate(" + this._rotate +
						"deg) scale(" + this._scale + ")";
				}
			},

			get rotate() {return this._rotate;},
			set rotate(value) {
				this._rotate = value;
				if(this.node) {
					this.node.style.transform = "rotate(" + this._rotate +
						"deg) scale(" + this._scale + ")";
				}
			},

			get gridShow() {return this._gridShow;},
			set gridShow(value) {
				this._gridShow = value;
				if(this.grid) {
					this.grid.classList.toggle("grid", this._gridShow);
				}
			},

			get gridSize() {return this._gridSize;},
			set gridSize(value) {
				this._gridSize = value;
				if(this.grid) {
					this.grid.style.backgroundSize = value+"px "+value+"px";
				}
			}
		});

		Mc.root.querySelector("#previews ul")
			.appendChild(Mc.CreatePreview(Mc.maps[Mc.maps.length - 1]));
		Mc.map = Mc.maps.length - 1;
	},
	CreatePreview(map) {
		map.preview = document.createElement("li");

		let anchor = document.createElement("a");
		let span = document.createElement("span");
		span.innerText = Mc.maps.length;
		anchor.appendChild(span);
		let index = Mc.maps.length - 1;
		anchor.addEventListener("click", e => {
			Mc.map = index;
		});
		anchor.title = map.path;
		map.preview.appendChild(anchor);

		return map.preview;
	},
	CreateBackground(map) {
		map.background = document.createElement("div");
		map.background.style.backgroundImage = "url(" + map.path  + ")";
		return map.background;
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
			map.grid.style.marginTop   = (-map.image.naturalHeight / 2) + "px";
			map.grid.style.marginLeft  = (-map.image.naturalWidth  / 2) + "px";
			map.image.style.marginTop   = (-map.image.naturalHeight / 2) + "px";
			map.image.style.marginLeft  = (-map.image.naturalWidth  / 2) + "px";
			map.canvas.style.marginTop  = (-map.image.naturalHeight / 2) + "px";
			map.canvas.style.marginLeft = (-map.image.naturalWidth  / 2) + "px";
			map.canvas.height = map.image.naturalHeight;
			map.canvas.width  = map.image.naturalWidth;
			map.grid.style.height = map.image.naturalHeight + "px";
			map.grid.style.width  = map.image.naturalWidth + "px";

			Mc.AutoScale();
		}, true);

		map.node.addEventListener("mousedown", e => {
			Mc.state.mouseDown = true;

			Mc.state.moveOffset.x = map.node.offsetLeft - e.clientX;
			Mc.state.moveOffset.y = map.node.offsetTop  - e.clientY;
		}, true);

		map.node.addEventListener("mouseup", e => {
			Mc.state.mouseDown = false;
		}, true);

		map.node.addEventListener("mouseout", e => {
			if(Mc.mode != "draw") {
				Mc.state.mouseDown = false;
			}
		}, true);

		map.node.addEventListener("mousemove", e => {
			e.preventDefault();
			if(Mc.state.mouseDown) {
				if(Mc.mode == "move") {
					map.x = e.clientX + Mc.state.moveOffset.x;
					map.y = e.clientY + Mc.state.moveOffset.y;
				} else if(Mc.mode == "draw") {
					if(e.buttons == 1) {
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

		map.node.addEventListener("dblclick", e => {
			if(Mc.mode == "move") map.scale++;
		}, true);

		map.node.addEventListener("touchstart", e => {
			e.preventDefault();
			Mc.state.touchCount = e.touches.length;
			if(Mc.state.touchCount == 0) {
				Mc.state.moveOffset.x = map.node.offsetLeft - e.touches[0].clientX;
				Mc.state.moveOffset.y = map.node.offsetTop  - e.touches[0].clientY;
			
			}
		}, true);

		map.node.addEventListener("touchmove", e => {
			e.preventDefault();
			if(Mc.state.touchCount == 1) {
				if(Mc.mode == "move") {
					map.x = e.touches[0].clientX + Mc.state.moveOffset.x;
					map.y = e.touches[0].clientY + Mc.state.moveOffset.y;
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

			if(Mc.mode == "move") {
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
			} else if(Mc.mode == "draw") {
				Mc.config.penSize += Math.sign(event.deltaX || event.deltaY);
			}
		}, true);

		return map.node;
	},
	AutoScale() {
		if(
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
			if(state) window.addEventListener(name, Mc.listeners[name], true);
		}
	},
	SetTimers(state) {
		for(let index in Mc.timers) {
			clearInterval(Mc.timers[index][1]);
			if(state) setInterval(Mc.timers[index][1], Mc.timers[index][0]);
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
		Mc.map.x = Mc.map.y = Mc.map.rotate = 0;
		Mc.map.scale = 1;
		Mc.AutoScale();
	}
}

window.addEventListener("load", () =>
	Mc.Init(document.getElementById("mapclusion"))
, true);
