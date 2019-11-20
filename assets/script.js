const Mc = {
	root: null,
	maps: new Map(),

	config: { // Changed by user
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

	state: { // Changes, saved
		mapsCreated: 0,
		mapsOrder: [],
		mapsVisible: [],
	},

	scratch: { // Changes, not saved
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
			Mc.scratch.touchEnabled = true;
			Mc.scratch.touchCount = e.touches.length;
		},
		mousemove(e) {
			Mc.scratch.mouseLastMoved = Date.now();
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
						Mc.LoadMap(parseInt(e.key) - 1);
						break;
					case "0":
						console.log("Loading Map 10");
						Mc.LoadMap(10);
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
			if (!text.dataset.originalText) {
				text.dataset.originalText = text.innerText;
			}
			text.innerText = Mc.text.almostThere;
		},
		dragleave(e) {
			let text = document.querySelector(Mc.selectors.emptyText);
			text.innerText = text.dataset.originalText;
		},
		resize(e) {
			console.log(window.innerHeight - Mc.scratch.windowHeight);

			// @todo change scale as window size changes

			Mc.scratch.windowHeight = window.innerHeight;
			Mc.scratch.windowWidth  = window.innerWidth;
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
				!Mc.scratch.touchEnabled &&
				Mc.scratch.mouseLastMoved &&
				Date.now() - Mc.scratch.mouseLastMoved > Mc.config.hideDelay
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
	LoadMap(name, toggle) {
		if (!(name in Mc.maps)) {
			console.warn("Missing map name: " + name + "!");
			return;
		}

		if (!toggle) {
			for(let map in Mc.maps) {
				Mc.maps[map].visible = false;
			}
		}

		Mc._name = name;
		let map = Mc.maps[Mc._name];

		if (!map.node) {
			Mc.root.querySelector("#layers")
				.appendChild(Mc.CreateMap(map));
			Mc.root.querySelector("#backgrounds")
				.appendChild(Mc.CreateBackground(map));
		}

		// Keep track of visible maps
		map.visible = toggle ? !map.visible : true;
		Mc.state.mapsVisible = Mc.state.mapsVisible.filter(name => {
			return Mc.maps[name] && Mc.maps[name].visible;
		});
		if (map.visible) {
			Mc.state.mapsVisible.push(Mc._name);
		} else {
			// Find the next map, defaulting to -1 if not found
			Mc._name = Mc.state.mapsVisible.length > 0 ?
				Mc.state.mapsVisible[Mc.state.mapsVisible.length - 1] :
				-1;
		}
	},

	_mode: null,
	get mode() {return Mc._mode;},
	set mode(value) {
		Mc._mode = value;
		Mc.scratch.mouseDown = false;

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

		Mc.scratch.windowHeight = window.innerHeight;
		Mc.scratch.windowWidth  = window.innerWidth;

		let previewList = Mc.root.querySelector("ul#previews-list");
		let sortable = new Sortable(previewList);
		previewList.addEventListener("sort", e => {
			let dragged = Mc.maps[e.item.dataset.name];
			Mc.state.mapsOrder.splice(
				e.newIndex,
				0,
				Mc.state.mapsOrder.splice(e.oldIndex, 1)[0]
			);
			let parent = dragged.node.parentNode;
			parent.removeChild(dragged.node);
			// @todo this smells
			if (
				Mc.state.mapsOrder.indexOf(dragged.name) == -1 ||
				Mc.state.mapsOrder.indexOf(dragged.name) >=
					Mc.state.mapsOrder.length -1
			) {
				parent.appendChild(dragged.node);
			} else {
				parent.insertBefore(
					dragged.node,
					Mc.maps[
						Mc.state.mapsOrder[
							Mc.state.mapsOrder.indexOf(dragged.name) + 1
						]
					].node
				);
			}
		}, true);

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
	AddMapPath(path, name, state) {
		if (!path) return;

		// @todo replace this with css
		Mc.root.querySelector(Mc.selectors.emptyText).style.display = "none";

		if (!name) {
			Mc.state.mapsCreated += 1;
			name = Mc.state.mapsCreated;
		}

		Mc.maps[name] = {
			name: name,
			path: path,

			canvas: null,
			context: null,
			background: null,
			preview: null,
			image: null,
			node: null,
			grid: null,

			state: state || {
				visible: true,
				scale: 1,
				rotate: 0,
				x: 0,
				y: 0,
				gridShow: false,
				gridSize: 40,
				gridX: 50,
				gridY: 50,
			},

			get visible() {return this.state.visible;},
			set visible(value) {
				this.state.visible = value;
				if (this.node) {
					this.node.style.display = this.state.visible ? "block" : "none";
				}
				if (this.back) {
					this.back.style.opacity = this.state.visible ? 0.2 : 0;
				}
				if (this.preview) {
					this.preview.classList.toggle("active", this.state.visible);
				}
			},

			get x() {return this.state.x;},
			set x(value) {
				this.state.x = value;
				if (this.node) {
					this.node.style.left = this.state.x + "px";
				}
			},

			get y() {return this.state.y;},
			set y(value) {
				this.state.y = value;
				if (this.node) {
					this.node.style.top = this.state.y + "px";
				}
			},

			get scale() {return this.state.scale;},
			set scale(value) {
				this.state.scale = clamp(
					value, Mc.config.zoomMin, Mc.config.zoomMax
				);

				if (this.node) {
					this.node.style.transform = "rotate(" + this.state.rotate +
						"deg) scale(" + this.state.scale + ")";
				}
			},

			get rotate() {return this.state.rotate;},
			set rotate(value) {
				this.state.rotate = value;
				if (this.node) {
					this.node.style.transform = "rotate(" + this.state.rotate +
						"deg) scale(" + this.state.scale + ")";
				}
			},

			get gridShow() {return this.state.gridShow;},
			set gridShow(value) {
				this.state.gridShow = value;
				if (this.grid) {
					this.grid.classList.toggle("grid", this.state.gridShow);
				}
			},

			get gridSize() {return this.state.gridSize;},
			set gridSize(value) {
				this.state.gridSize = clamp(
					value, Mc.config.gridMin, Mc.config.gridMax
				);

				if (this.grid) {
					this.grid.style.backgroundSize =
						this.state.gridSize + "px " + this.state.gridSize + "px";
				}
			},

			get gridX() {return this.state.gridX;},
			set gridX(value) {
				this.state.gridX = value;

				if (this.grid) {
					this.grid.style.backgroundPosition =
						this.state.gridX + "% " + this.state.gridY + "%";
				}
			},

			get gridY() {return this.state.gridY;},
			set gridY(value) {
				this.state.gridY = value;

				if (this.grid) {
					this.grid.style.backgroundPosition =
						this.state.gridX + "% " + this.state.gridY + "%";
				}
			},
		};

		Mc.state.mapsOrder.push(name);
		Mc.root.querySelector("ul#previews-list")
			.appendChild(Mc.CreatePreview(Mc.maps[name]));
		Mc.LoadMap(name);
	},
	async LoadProject(event) {
		if (event.target.files.length != 1) {
			alert("Please select exactly one project file");
			return;
		}

		if (Mc.maps.length > 0 && !confirm("Load project, deleting the current project")) return;

		for (let name in Mc.maps) {
			Mc.DeleteMap(name);
		}

		// @todo heaps of error checking
		let zip = new JSZip();
		zip.loadAsync(event.target.files[0]).then(async _ => {
			Mc.state = JSON.parse(await zip.file("state.json").async("string"));
			let maps = zip.folder("maps");
			let folders = Object.keys(maps.files)
				.filter(path => path != maps.root && path.startsWith(maps.root))
				.map(path => path.split("/")[1])
				.filter((value, index, self) => self.indexOf(value) === index);

			for (let folder of folders) {
				let map = maps.folder(folder);
				// @todo less hardcoding
				let state = JSON.parse(await map.file("state.json").async("string"));
				let image = await map.file("image.jpg").async("blob");
				let drawing = await map.file("drawing.png").async("blob");
				Mc.AddMapPath(URL.createObjectURL(image), folder, state);
				// @todo this smells
				Mc.maps[folder].previewBitmap = await createImageBitmap(drawing);
			}
		});
	},
	async DownloadProject() {
		let zip = new JSZip();
		zip.file("state.json", JSON.stringify(Mc.state));
		let maps = zip.folder("maps");

		for (let name in Mc.maps) {
			let folder = maps.folder(name);
			folder.file("state.json", JSON.stringify(Mc.maps[name].state));
			let image = await fetch(Mc.maps[name].path).then(r => r.blob());
			folder.file("image.jpg", image); // @todo don't assume name
			let drawing = await canvasToBlob(Mc.maps[name].canvas);
			folder.file("drawing.png", drawing);
		}

		zip.generateAsync({type:"blob"}).then(content => {
			let anchor = document.createElement("a");
			anchor.href = URL.createObjectURL(content);
			// @todo ask for name
			anchor.download = "project.zip";
			anchor.click();
		});
	},
	CreatePreview(map) {
		map.preview = document.createElement("li");
		map.preview.dataset.name = map.name;

		let anchor = document.createElement("a");
		let span = document.createElement("span");
		span.innerText = map.name;
		anchor.appendChild(span);
		anchor.addEventListener("click", e => {
			e.preventDefault();
			if (e.buttons == 0) Mc.LoadMap(map.name, e.ctrlKey);
		});
		anchor.addEventListener("contextmenu", e => {
			e.preventDefault();
			if (confirm("Do you want to permantly delete map " + map.name + "?")) {
				Mc.DeleteMap(map.name);
			}
			return false;
		});
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

			if (map.previewBitmap) {
				map.x = map.x; // trigger setters
				map.y = map.y; // trigger setters
				map.scale = map.scale; // trigger setters
				map.gridShow = map.gridShow; // trigger setters
				map.gridSize = map.gridSize; // trigger setters
				map.gridX = map.gridX; // trigger setters

				map.context.drawImage(map.previewBitmap, 0, 0);
				delete map.previewBitmap;
			} else {
				Mc.AutoScale();
			}
		}, true);

		map.node.addEventListener("mousedown", e => {
			Mc.scratch.mouseDown = true;

			// Switches keyboard controls to the last map clicked
			Mc._name = map.name;

			Mc.scratch.moveOffsetX = map.node.offsetLeft - e.clientX;
			Mc.scratch.moveOffsetY = map.node.offsetTop  - e.clientY;
		}, true);

		map.node.addEventListener("mouseup", e => {
			Mc.scratch.mouseDown = false;
		}, true);

		map.node.addEventListener("mouseout", e => {
			if (Mc.mode != "draw") {
				Mc.scratch.mouseDown = false;
			}
		}, true);

		map.node.addEventListener("mousemove", e => {
			e.preventDefault();
			if (Mc.scratch.mouseDown) {
				if (Mc.mode == "move") {
					map.x = e.clientX + Mc.scratch.moveOffsetX;
					map.y = e.clientY + Mc.scratch.moveOffsetY;
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

		map.node.addEventListener("dblclick", e => {
			if (Mc.mode == "move") map.scale++;
		}, true);

		map.node.addEventListener("contextmenu", e => {
			e.preventDefault();
			return false;
		}, true);

		map.node.addEventListener("touchstart", e => {
			e.preventDefault();

			// Switches keyboard controls to the last map touched
			Mc._name = map.name;

			// @todo improve
			Mc.scratch.touchCount = e.touches.length;
			if (Mc.scratch.touchCount == 0) {
				Mc.scratch.moveOffsetX=map.node.offsetLeft-e.touches[0].clientX;
				Mc.scratch.moveOffsetY=map.node.offsetTop -e.touches[0].clientY;
			}
		}, true);

		map.node.addEventListener("touchmove", e => {
			e.preventDefault();
			if (Mc.scratch.touchCount == 1) {
				if (Mc.mode == "move") {
					map.x = e.touches[0].clientX + Mc.scratch.moveOffsetX;
					map.y = e.touches[0].clientY + Mc.scratch.moveOffsetY;
				}
			}
		}, true);

		map.node.addEventListener("touchend", e => {
			e.preventDefault();
			Mc.scratch.touchCount = e.touches.length;
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
		Mc.LoadMap(-1);
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
