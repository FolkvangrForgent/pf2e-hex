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
        // only override logic on hexagonal grid
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
                case "hex":
                    snappingMode = M.CENTER;
                    break;
                case "emanation":
                    snappingMode = M.CENTER | M.VERTEX;
                    break;
                case "burst":
                    snappingMode = M.VERTEX;
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

// CUSTOM RENDERING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._refreshTemplate', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        // clear drawing
        const t = this.template.clear();
        // check for non defined shapes to show outline for
        if (this.areaShape === null || this.areaShape === "line") {
            // set the template outline
            t.lineStyle(this._borderThickness, this.document.borderColor, 0.75).beginFill(0x000000, 0.0);
        }
        // check is template has texture
        if ( this.texture ) {
            // draw texture as fill
            t.beginTextureFill({texture: this.texture});
        } else {
            // draw nothing as fill
            t.beginFill(0x000000, 0.0);
        }
        // draw the shape
        t.drawShape(this.shape);
        // draw origin point
        t.lineStyle(this._borderThickness, 0x000000).beginFill(0x000000, 0.5).drawCircle(0, 0, 6);
        // decide if destination point should be drawn
        if (this.document.t === "rect" || this.areaShape === "line") {
            // draw destination point
            t.lineStyle(this._borderThickness, 0x000000).beginFill(0x000000, 0.5).drawCircle(this.ray.dx, this.ray.dy, 6);
        }
        // end fill ???
        t.endFill();
    }, 'MIXED');
});

// CUSTOM RENDERING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._refreshRulerText', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        // get template information
        const {distance, t} = this.document;
        const grid = canvas.grid;
        if ( t === "rect" ) {
            const {A: {x: x0, y: y0}, B: {x: x1, y: y1}} = this.ray;
            const dx = grid.measurePath([{x: x0, y: y0}, {x: x1, y: y0}]).distance;
            const dy = grid.measurePath([{x: x0, y: y0}, {x: x0, y: y1}]).distance;
            const w = Math.round(dx * 10) / 10;
            const h = Math.round(dy * 10) / 10;
            this.ruler.text = `${w}${grid.units} x ${h}${grid.units}`;
        } else {
            if (this.areaShape == "hex") {
                this.ruler.text = ``;
            } else {
                this.ruler.text = `${(Math.round(distance * 10) / 10)}${grid.units}`;
            }
        }
        // check where to render ruler text
        if (this.areaShape === null || this.areaShape === "line") {
            this.ruler.position.set(this.ray.dx + 10, this.ray.dy + 5);
        } else {
            const offset = Ray.fromAngle(0, 0, this.ray.angle, 75);
            this.ruler.position.set(offset.dx, offset.dy);
            this.ruler.position.set(offset.dx + (-this.ruler.width / 2), offset.dy + (this.ruler.height / 2));
        }
    }, 'MIXED');
});

// HIGHLIGHT TEMPLATE WALL COLLISIONS
// TODO get collision type from template when pf2e system support is added
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

// MEASUREMENT CONTROLS
// TODO add toolclips
Hooks.on("getSceneControlButtons", (controls) => {
    // ensure canvas is ready (otherwise page refresh will cause error)
    if (!canvas || !canvas.ready) {
        return;
    }
    // if not hexagon unset weird and custom tools then return
    if (!canvas.grid.isHexagonal) {
        const measure= ui.controls.controls.find(c => c.name === "measure");
        const tool = measure.tools.find(t => t.name === "ray");
        if (game.activeTool === "burst" || game.activeTool === "emanation" || game.activeTool === "hex") {
            let tool = "circle";
            canvas[measure.layer].activate({tool});
        }
        if (game.activeTool === "line") {
            let tool = "ray";
            canvas[measure.layer].activate({tool});
        }
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
            name: "hex",
            title: "pf2e-hex.template.hex",
            icon: "fa-solid fa-hexagon",
            toolclip: {
                src: "/modules/pf2e-hex/src/media/hex.webm",
                heading: "pf2e-hex.template.hex",
                items: buildItems("create", "move", "edit", "hide", "delete")
            }
        },
        {
            name: "emanation",
            title: "pf2e-hex.template.emanation",
            icon: "fa-regular fa-hexagon-xmark",
            toolclip: {
                src: "/modules/pf2e-hex/src/media/emanation.webm",
                heading: "pf2e-hex.template.emanation",
                items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
            }
        },
        {
            name: "burst",
            title: "pf2e-hex.template.burst",
            icon: "fa-regular fa-hexagon",
            toolclip: {
                src: "/modules/pf2e-hex/src/media/burst.webm",
                heading: "pf2e-hex.template.burst",
                items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
            }
        },
        {
            name: "cone",
            title: "pf2e-hex.template.cone",
            icon: "fa-regular fa-rotate-270 fa-triangle",
            toolclip: {
                src: "/modules/pf2e-hex/src/media/cone.webm",
                heading: "pf2e-hex.template.cone",
                items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
            }
        },
        {
            name: "line",
            title: "pf2e-hex.template.line",
            icon: "fa-regular fa-rotate-90 fa-pipe",
            toolclip: {
                src: "/modules/pf2e-hex/src/media/line.webm",
                heading: "pf2e-hex.template.line",
                items: buildItems("create", "move", "edit", "hide", "delete", "rotate")
            }
        },
        {
            name: "rect",
            title: "pf2e-hex.template.rect",
            icon: "fa-regular fa-square",
            toolclip: {
                src: "/modules/pf2e-hex/src/media/rect.webm",
                heading: "pf2e-hex.template.rect",
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
            case "hex":
            case "cone":
            case "line":
                const interaction = event.interactionData;
                const previewData = {
                    user: game.user.id,
                    t: ((tool === "emanation") || (tool === "burst") || (tool === "hex")) ? "circle" : (tool === "line") ? "ray" : tool,
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
                    previewData.angle = game.settings.get('pf2e-hex', 'cone-template-angle');
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

// EMULATE gridTemplates SETTING & ANGLE SNAPPING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype._onDragLeftMove', function(wrapped, event) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped(event);
        }
        // unpack data from event
        const { destination, preview, origin } = event.interactionData;
        // ensure preview is set
        if (!preview) {
            return;
        }
        // set distance of template
        if (preview.document.t === "rect") {
            // unsnapped for rectangle
            preview.document.distance = canvas.grid.measurePath([origin, destination]).distance;
        } else if (preview.areaShape === "hex") {
            // always a single hex
            preview.document.distance = canvas.grid.distance / 2;
        } else {
            // compute the snapped distance for the measured template
            preview.document.distance = (Math.round(canvas.grid.measurePath([origin, destination]).distance / canvas.grid.distance) * canvas.grid.distance);
        }
        // compute the ray for angle
        const ray = new Ray(origin, destination);
        // compute custom angle snapping
        let snappedAngle;
        if (preview.document.t === "cone") {
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

// ANGLE SNAPPING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype._onMouseWheel', function(wrapped, event) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped(event);
        }
        // try and ge a hovered template
        const template = this.hover;
        // determine if there is a template that is not a preview
        if ( !template || template.isPreview ) return;
        // Determine the incremental angle of rotation from event data
        const snap = event.shiftKey ? 30 : 5;
        // turn mouse wheel delta into angle delta
        const delta = snap * Math.sign(event.delta);
        // return rotation based on snap
        return template.rotate(template.document.direction + delta, snap);
    }, 'MIXED');
});

// SETTINGS
Hooks.once('init', () => {
    game.settings.register("pf2e-hex", "cone-template-angle", {
        name: "pf2e-hex.setting.cone-template-angle-name",
        hint: "pf2e-hex.setting.cone-template-angle-hint",
        scope: "world",
        config: true,
        type: Number,
        default: 60
    });
})