// EMULATE gridTemplates SETTING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._computeShape', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        const {t, distance, direction, angle, width} = this.document;
        switch (t) {
            case "circle":
                return new PIXI.Polygon(canvas.grid.getCircle({x: 0, y: 0}, distance));
            case "cone":
                return new PIXI.Polygon(canvas.grid.getCone({x: 0, y: 0}, distance, direction, angle));
            case "rect":
                let endpoint = canvas.grid.getTranslatedPoint({x: 0, y: 0}, direction, distance);
                return new PIXI.Rectangle(0, 0, endpoint.x, endpoint.y).normalize();
            case "ray":
                const p00 = Ray.fromAngle(0, 0, Math.toRadians(direction - 90), width * canvas.dimensions.distancePixels / 2).B;
                const p01 = Ray.fromAngle(0, 0, Math.toRadians(direction + 90), width * canvas.dimensions.distancePixels / 2).B;
                const p10 = canvas.grid.getTranslatedPoint(p00, direction, distance);
                const p11 = canvas.grid.getTranslatedPoint(p01, direction, distance);
                return new PIXI.Polygon(p00.x, p00.y, p10.x, p10.y, p11.x, p11.y, p01.x, p01.y);
        }
    }, 'MIXED');
});

// EMULATE gridTemplates SETTING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._refreshShape', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        const {x, y, direction, distance} = this.document;
        this.ray = new Ray({x, y}, canvas.grid.getTranslatedPoint({x, y}, direction, distance));
        this.shape = this._computeShape();
    }, 'MIXED');
});

// SNAP POINT (chat fix)
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype.getSnappedPoint', function(wrapped, point) {
        if (!canvas.grid.isHexagonal) {
            return wrapped(point);
        }
        return { x: point.x, y: point.y };
    }, 'MIXED');
});

// SNAP POINT
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._refreshPosition', function(wrapped) {
        // add snapping on hexagonal grid
        if (canvas.grid.isHexagonal) {
            // get snapped mode
            const M = CONST.GRID_SNAPPING_MODES;
            let snappingMode = 0;
            switch (this.areaShape) {
                case "burst":
                    snappingMode = M.VERTEX;
                    break;
                case "emanation":
                    snappingMode = M.CENTER | M.VERTEX;
                    break;
                case "cone":
                    snappingMode = M.CENTER | M.EDGE_MIDPOINT | M.VERTEX;
                    break;
                case "line":
                default:
                    break;
            }
            // get snapped position based on snapping mode
            const origin = canvas.grid.getSnappedPoint({
                x: this.document.x,
                y: this.document.y
            }, {
                mode: snappingMode,
                resolution: 1
            });
            // set document to snapped position
            this.document.x = origin.x;
            this.document.y = origin.y;
        }
        // call wrapped function to continue other logic
        wrapped();
    }, 'WRAPPER');
});

// EMULATE gridTemplates SETTING & ANGLE SNAPPING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype._onDragLeftMove', function(wrapped, event) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped(event);
        }
        // unpack data from event
        const { destination, preview, origin } = event.interactionData;
        // set distance of template
        console.log(preview.document.t)
        if (preview.document.t === "rect") {
            // unsnapped for rectangle
            preview.document.distance = canvas.grid.measurePath([origin, destination]).distance
        } else {
            // compute the snapped distance for the measured template
            preview.document.distance = (Math.round(canvas.grid.measurePath([origin, destination]).distance / canvas.grid.distance) * canvas.grid.distance);
        }
        // compute the ray for angle
        const ray = new Ray(origin, destination);
        // compute custom angle snapping
        let snappedAngle;
        if (["cone", "circle"].includes(preview.document.t)) {
            const snapAngle = Math.PI / 6;
            snappedAngle = Math.toDegrees(Math.floor((ray.angle + Math.PI * 0.125) / snapAngle) * snapAngle);
        } else {
            snappedAngle = Math.toDegrees(ray.angle);
        }
        // Update the preview object angle
        preview.document.direction = Math.normalizeDegrees(snappedAngle);
        // set refresh to true
        preview.renderFlags.set({refreshShape: true});
    }, 'MIXED');
});

// HIGHLIGHT TEMPLATE WALL COLLISIONS
// TODO get collision type from template when pf2e system support is added
// TODO add WallHeight support to collision checks
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype.highlightGrid', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        // highlight border color
        const borderColor = this.document.borderColor;
        // highlight hex normal color
        const normalColor = this.document.fillColor;
        // highlight hex collided color
        const collidedColor = new Color();
        // clear existing highlight layer
        canvas.interface.grid.clearHighlightLayer(this.highlightId);
        // get highlight positions
        const positions = this._getGridHighlightPositions();
        // setup collision type
        const collisionType = "move";
        // iterate over highlight positions checking and coloring accordingly
        for (const {x, y} of positions) {
            // check for collision
            const hasCollision = CONFIG.Canvas.polygonBackends[collisionType].testCollision(
                this.center,
                {
                    x: x + (canvas.grid.size / 2),
                    y: y + (canvas.grid.size / 2),
                },
                {
                    type: collisionType,
                    mode: "any",
                });
            // color based on collision
            canvas.interface.grid.highlightPosition(this.highlightId, {
                x: x,
                y: y,
                border: borderColor,
                color: hasCollision ? collidedColor : normalColor,
            });
        }
    }, 'MIXED');
});

// // ENHANCED HIGHLIGHTING
// function hexPath(origin, direction, distance) {
//     const positions = [];
//     for (let i = 0; i <= distance; i++) {
//         let point = canvas.grid.getTranslatedPoint(origin, direction, canvas.grid.distance * i);
//         positions.push(canvas.grid.getTopLeftPoint(canvas.grid.getCube(point)));
// let snapped = canvas.grid.getCenterPoint(canvas.grid.getCube(point));
// let pg = new PIXI.Polygon(point.x, point.y, snapped.x, snapped.y);
// canvas.interface.grid.addChild(new PIXI.Graphics().beginFill(0x000000, 0.5).lineStyle(2, 0x00FF00, 1).drawShape(pg));
//     }
//     return positions;
// }

// // ENHANCED HIGHLIGHTING
// Hooks.once("libWrapper.Ready", () => {
//     libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._getGridHighlightPositions', function(wrapped) {
//         // only override logic on hexagonal grid
//         if (!canvas.grid.isHexagonal) {
//             return wrapped();
//         }
//         // only override logic on line template
//         if (this.areaShape != "line") {
//             return wrapped();
//         }
//         // get constants
//         const {x, y, direction, distance, width} = this.document;
//         // calculate how many rays to use for template
//         const rayCount = Math.round(width / canvas.dimensions.distance);
//         // calculate lateral offset
//         const offset = (rayCount - 1) * 0.5
//         // calculate direct grid points along rays and save the highlight point of the position
//         const positions = [];
//         for (let o = 0; o < rayCount; o++) {
//             // calculate ray origin
//             const origin = canvas.grid.getTranslatedPoint({x: x, y: y}, direction - 90, (offset - o) * canvas.grid.distance);
// // calculate ray destination
// const destination = canvas.grid.getTranslatedPoint(origin, direction , distance);
// let pg = new PIXI.Polygon(origin.x, origin.y, destination.x, destination.y);
// canvas.interface.grid.addChild(new PIXI.Graphics().beginFill(0x000000, 0.5).lineStyle(2, 0x0000ff, 1).drawShape(pg));
//             // calculate positions for origin and add
//             for (const position of hexPath(origin, direction, Math.round(distance / canvas.grid.distance))) {
//                 // save relevant highlight position
//                 positions.push(position);
//             }
//         }
//         return positions;
//     }, 'MIXED');
// });

// MEASUREMENT CONTROLS
// TODO add toolclips
Hooks.on("getSceneControlButtons", (controls) => {
    // only override logic on hexagonal grid
    if (!canvas || !canvas.ready || !canvas.grid.isHexagonal) {
       return;
    }
    // find measureControls
    const measureControls = controls.find((c) => c.name === "measure");
    // ensure measureControls was found
    if (measureControls === undefined) {
        return;
    }
    // copy of some of the common controls from _getControlButtons
    const commonControls = {
        create: { heading: "CONTROLS.CommonCreate", reference: "CONTROLS.ClickDrag" },
        move: { heading: "CONTROLS.CommonMove", reference: "CONTROLS.Drag" },
        edit: { heading: "CONTROLS.CommonEdit", reference: "CONTROLS.DoubleClick" },
        hide: { heading: "CONTROLS.CommonHide", reference: "CONTROLS.RightClick" },
        delete: { heading: "CONTROLS.CommonDelete", reference: "CONTROLS.Delete" },
        rotate: { heading: "CONTROLS.CommonRotate", content: "CONTROLS.ShiftOrCtrlScroll" },
    };
    // copy of build helper from _getControlButtons
    const buildItems = (...items) => items.map(item => commonControls[item]);
    // setup edited controls
    measureControls.tools = [
        {
          name: "emanation",
          title: "Emanation Template",
          icon: "fa-regular fa-hexagon-xmark",
          toolclip: {
//            src: "toolclips/tools/measure-rect.webm",
            heading: "Emanation Template",
            items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
          }
        },
        {
          name: "burst",
          title: "Burst Template",
          icon: "fa-regular fa-hexagon",
          toolclip: {
//            src: "toolclips/tools/measure-rect.webm",
            heading: "Burst Template",
            items: buildItems("create", "move", "edit", "hide", "delete")
          }
        },
        {
          name: "cone",
          title: "Cone Template",
          icon: "fa-regular fa-rotate-270 fa-triangle",
          toolclip: {
//            src: "toolclips/tools/measure-rect.webm",
            heading: "Cone Template",
            items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
          }
        },
        {
          name: "line",
          title: "Ray Template",
          icon: "fa-regular fa-rotate-90 fa-pipe",
          toolclip: {
//            src: "toolclips/tools/measure-rect.webm",
            heading: "Ray Template",
            items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
          }
        },
        {
          name: "rect",
          title: "CONTROLS.MeasureRect",
          icon: "fa-regular fa-square",
          toolclip: {
//            src: "toolclips/tools/measure-rect.webm",
            heading: "CONTROLS.MeasureRect",
            items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
          }
        },
        {
          name: "clear",
          title: "CONTROLS.MeasureClear",
          icon: "fa-solid fa-trash",
          visible: game.user.isGM,
          onClick: () => canvas.templates.deleteAll(),
          button: true
        }
      ]
});

// BUTTONS
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype._onDragLeftStart', function(wrapped, event) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped(event);
        }
        // get current active tool
        const tool = game.activeTool;
        switch (tool) {
            case "circle":
            case "ray":
                return;
            case "burst":
            case "emanation":
            case "cone":
            case "line":
                const interaction = event.interactionData;
                const previewData = {
                    user: game.user.id,
                    t: ((tool === "emanation") || (tool === "burst")) ? "circle" : (tool === "line") ? "ray" : tool,
                    x: interaction.origin.x,
                    y: interaction.origin.y,
                    sort: Math.max(this.getMaxSort() + 1, 0),
                    distance: 1,
                    direction: 0,
                    fillColor: game.user.color || "#FF0000",
                    hidden: event.altKey,
                    flags: {
                        pf2e: {
                            areaShape: tool
                        }
                    }
                };
                if ( tool === "cone") {
                    previewData.angle = 60;
                } else if ( tool === "line" ) {
                    previewData.width = (CONFIG.MeasuredTemplate.defaults.width * canvas.dimensions.distance);
                }
                const cls = getDocumentClass("MeasuredTemplate");
                const doc = new cls(previewData, {parent: canvas.scene});
                // Create a preview MeasuredTemplate object
                const template = new this.constructor.placeableClass(doc);
                interaction.preview = this.preview.addChild(template);
                template.draw();
                return;
            default:
                return wrapped(event);
        }
    }, 'MIXED');
});