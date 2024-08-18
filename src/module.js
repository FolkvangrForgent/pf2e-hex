// EMULATE gridTemplates SETTING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._computeShape', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        const {t, distance, direction, angle, width} = this.document;
        let endpoint;
        switch (t) {
            case "circle":
                return new PIXI.Polygon(canvas.grid.getCircle({x: 0, y: 0}, distance));
            case "cone":
                return new PIXI.Polygon(canvas.grid.getCone({x: 0, y: 0}, distance, direction, angle));
            case "rect":
                endpoint = canvas.grid.getTranslatedPoint({x: 0, y: 0}, direction, distance);
                return new PIXI.Rectangle(0, 0, endpoint.x, endpoint.y).normalize();
            case "ray":
                endpoint = canvas.grid.getTranslatedPoint({x: 0, y: 0}, direction, distance);
                return new PIXI.Polygon(0, 0, endpoint.x, endpoint.y);
        }
    }, 'MIXED');
});

// ENHANCED LINE HIGHLIGHTING
// TODO add angle as a factor to improve results
function hexNeighborPriority(root, neighbor) {
    if (root.q  === neighbor.q && root.r - 1 === neighbor.r && root.s + 1 === neighbor.s) {
        return 6;
    } else if (root.q + 1 === neighbor.q && root.r - 1 === neighbor.r && root.s === neighbor.s) {
        return 5;
    } else if (root.q - 1 === neighbor.q && root.r === neighbor.r && root.s + 1 === neighbor.s) {
        return 4;
    } else if (root.q + 1 === neighbor.q && root.r === neighbor.r && root.s - 1 === neighbor.s) {
        return 3;
    } else if (root.q - 1 === neighbor.q && root.r + 1 === neighbor.r && root.s === neighbor.s) {
        return 2;
    } else if (root.q === neighbor.q && root.r + 1 === neighbor.r && root.s - 1 === neighbor.s) {
        return 1;
    } else {
        return 0;
    }
}

// ENHANCED LINE HIGHLIGHTING
function hexPath(origin, destination, steps) {
    // find standard form (a*x + b*y + c = 0) parameters for calculating point distance
    const a = (origin.y - destination.y);
    const b = -(origin.x - destination.x);
    const c = -(a * origin.x + b * origin.y);
    // keep track of position found for each step
    const path = [];
    // get origin hex
    let previousHex = canvas.grid.getCube(origin);
    const previousPoint = canvas.grid.getCenterPoint(previousHex);
    let previousDistance = Math.sqrt((previousPoint.x - destination.x) ** 2 + (previousPoint.y - destination.y) ** 2)
    // store staring hex
    path.push(previousPoint);
    // continue till we have steps point
    for (let i = 0; i < (steps - 1); i++) {
        let currentHex;
        let currentDistance;
        let currentPoint;
        let currentLineDistance;
        // iterate of all adjacent spots
        for (const candidateHex of canvas.grid.getAdjacentCubes(previousHex)) {
            // check that point is closer to the destination
            const candidatePoint = canvas.grid.getCenterPoint(candidateHex);
            const candidateDistance = Math.sqrt((candidatePoint.x - destination.x) ** 2 + (candidatePoint.y - destination.y) ** 2)
            if (candidateDistance < previousDistance) {
                // check if this is the closest hex
                const lineDistance = Math.abs(a * candidatePoint.x + b * candidatePoint.y + c) / Math.sqrt(a ** 2 + b ** 2)
                // check if they are equal with tolerance
                let equal = false;
                if (currentLineDistance !== undefined && (Math.abs(currentLineDistance - lineDistance) < 1e-6)) {
                    equal = true;
                }
                if (currentLineDistance === undefined || lineDistance < currentLineDistance || equal) {
                    // logic to try to avoid randomness during ties
                    if (equal) {
                        if (!(hexNeighborPriority(previousHex, currentHex) <= hexNeighborPriority(previousHex, candidateHex))) {
                            continue;
                        }
                    }
                    // set information
                    currentHex = candidateHex;
                    currentPoint = candidatePoint;
                    currentDistance = candidateDistance;
                    currentLineDistance = lineDistance;
                }
            }
        }
        if (!currentHex) {
            break;
        }
        path.push(currentPoint);
        previousHex = currentHex;
        previousDistance = currentDistance;
    }
    return path;
}

// ENHANCED LINE HIGHLIGHTING & HIGHLIGHT TEMPLATE WALL COLLISIONS
// TODO get collision type from template when pf2e system support is added
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._getGridHighlightPositions', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        let highlightPositions = [];
        // only override logic on line template
        if (this.areaShape != "line") {
            highlightPositions = wrapped();
        } else {
            // get necessary information for calculations
            const {x, y, direction, distance, width} = this.document;
            // calculate how many hexs wide the template is
            const hexWidth = Math.round(width / canvas.dimensions.distance);
            // calculate how many hexs long the template is
            const hexLength = Math.round(distance / canvas.grid.distance);
            // keep track of positions
            const linePositions = [];
            // handle ray with no width with custom hex plotter
            if (hexWidth === 1) {
                // calculate ray destination
                const destination = canvas.grid.getTranslatedPoint({x: x, y: y}, direction, distance);
                linePositions.push(hexPath({x: x, y: y}, destination, hexLength));
            // handle ray with no width with custom hex plotter and getDirectPath
            } else {
                // get origin and destination points
                const originPoint = canvas.grid.getCenterPoint({x: x, y: y});
                const destinationPoint = canvas.grid.getTranslatedPoint(originPoint, direction, distance);
                //
                let originPositions;
                let destinationPositions;
                //
                if (Math.sign(((direction - ((Math.toDegrees((new Ray({x: x, y: y}, canvas.grid.getCenterPoint(originPoint))).angle) + 360) % 360) + 360) % 360) - 180) < 0) {
                    originPositions = hexPath(originPoint, canvas.grid.getTranslatedPoint(originPoint, direction - 90, width), Math.ceil(hexWidth / 2)).reverse();
                    for (const hex of hexPath(originPoint, canvas.grid.getTranslatedPoint(originPoint, direction + 90, width), (Math.floor(hexWidth / 2) + 1))) {
                        originPositions.push(hex)
                    }
                    destinationPositions = hexPath(destinationPoint, canvas.grid.getTranslatedPoint(destinationPoint, direction - 90, width), Math.ceil(hexWidth / 2)).reverse();
                    for (const hex of hexPath(destinationPoint, canvas.grid.getTranslatedPoint(destinationPoint, direction + 90, width), (Math.floor(hexWidth / 2) + 1))) {
                        destinationPositions.push(hex)
                    }
                } else {
                    originPositions = hexPath(originPoint, canvas.grid.getTranslatedPoint(originPoint, direction + 90, width), Math.ceil(hexWidth / 2)).reverse();
                    for (const hex of hexPath(originPoint, canvas.grid.getTranslatedPoint(originPoint, direction - 90, width), (Math.floor(hexWidth / 2) + 1))) {
                        originPositions.push(hex)
                    }
                    destinationPositions = hexPath(destinationPoint, canvas.grid.getTranslatedPoint(destinationPoint, direction + 90, width), Math.ceil(hexWidth / 2)).reverse();
                    for (const hex of hexPath(destinationPoint, canvas.grid.getTranslatedPoint(destinationPoint, direction - 90, width), (Math.floor(hexWidth / 2) + 1))) {
                        destinationPositions.push(hex)
                    }
                }
                for (let index = 0; index <= hexWidth; index++) {
                    let originPosition = originPositions[index]
                    let destinationPosition = destinationPositions[index]
                    if (!originPosition || !destinationPosition) {
                        break
                    }
                    linePositions.push(hexPath(originPosition, destinationPosition, hexLength).slice(0, hexLength))
                }
            }
            // turn line positions into relevant highlight positions
            for (const positions of linePositions) {
                for (const position of positions) {
                    // check for collision
                    highlightPositions.push(canvas.grid.getTopLeftPoint(position));
                }
            }
        }
        const pointSource = new foundry.canvas.sources.PointMovementSource({ object: this });
        // get collision type
        const collisionType = game.settings.get('pf2e-hex', 'highlight-default-collision');
        // do collision calculation
        const highlightPositionsWithCollision = []
        for (const position of highlightPositions) {
            const centerPoint = {x: (position.x + (canvas.grid.size / 2)), y: (position.y + (canvas.grid.size / 2))};
            // remove collisions far outside the scene rectangle
            if ((centerPoint.x < canvas.dimensions.sceneRect.x - canvas.dimensions.size) ||
                (centerPoint.x > (canvas.dimensions.sceneRect.x + canvas.dimensions.sceneRect.width + canvas.dimensions.size)) ||
                (centerPoint.y < canvas.dimensions.sceneRect.y - canvas.dimensions.size) ||
                (centerPoint.y > (canvas.dimensions.sceneRect.y + canvas.dimensions.sceneRect.height + canvas.dimensions.size))) {
                continue;
            }
            let collision = false;
            if (collisionType in CONFIG.Canvas.polygonBackends) {
                collision = CONFIG.Canvas.polygonBackends[collisionType].testCollision(
                    this.center,
                    {
                        x: centerPoint.x,
                        y: centerPoint.y,
                    },
                    {
                        type: collisionType,
                        source: pointSource,
                        mode: "any",
                    });
            }
            highlightPositionsWithCollision.push({x: position.x, y: position.y, collision: collision});
        }
        return highlightPositionsWithCollision;
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

// SNAP POINT (chat message placement)
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
        const {distance, width, t} = this.document;
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
            } else if (this.areaShape == "line") {
                this.ruler.text = `${(Math.round(distance / canvas.grid.distance) * canvas.grid.distance)}${grid.units}`;
                if (Math.round(width / canvas.grid.distance) > 1) {
                    this.ruler.text += ` x ${(Math.round(width / canvas.grid.distance) * canvas.grid.distance)}${grid.units} `;
                }
            } else {
                this.ruler.text = `${(Math.round(distance / canvas.grid.distance) * canvas.grid.distance)}${grid.units}`;
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
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype.highlightGrid', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        // highlight hex collided color
        const collidedColor = new Color();
        // clear existing highlight layer
        canvas.interface.grid.clearHighlightLayer(this.highlightId);
        // iterate over highlight positions checking and coloring accordingly
        for (const {x, y, collision} of  this._getGridHighlightPositions()) {
            // color based on collision
            canvas.interface.grid.highlightPosition(this.highlightId, {
                x: x,
                y: y,
                border: this.document.borderColor,
                color: collision ? collidedColor : this.document.fillColor,
            });
        }
    }, 'MIXED');
});

// MEASUREMENT CONTROLS
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
            if (preview.document.distance === 0) {
                preview.document.distance = canvas.grid.distance;
            }
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

// TARGET HELPER
Hooks.on('createMeasuredTemplate', targetHelper);
async function targetHelper(template, context, userId) {
    // only activate when on hex grid (the method should work on square grid but I'll leave that to pf2e-toolbelt implementation)
    if (!canvas.grid.isHexagonal) {
        return;
    }
    // only activate when the target helper is enabled
    if (!game.settings.get('pf2e-hex', 'target-helper-enabled')) {
        return;
    }
    // bail early if control is held
    if (game.keyboard.isModifierActive("Control")) {
        return;
    }
    // only activate when the user is the placer
    if (game.user.id !== userId) {
        return;
    }
    // prompt the user for input
    let inputs;
    try {
        inputs = await foundry.applications.api.DialogV2.wait({
            window: { title: "pf2e-hex.setting.target-helper-name" },
            content:
`<label><input type="checkbox" name="opposition" checked>` + game.i18n.localize("pf2e-hex.target.opposition") + `</label>
<label><input type="checkbox" name="neutral" checked>` + game.i18n.localize("pf2e-hex.target.neutral") + `</label>
<label><input type="checkbox" name="party" checked>` + game.i18n.localize("pf2e-hex.target.party") + `</label>
<label><input type="checkbox" name="self" checked>` + game.i18n.localize("pf2e-hex.target.self") + `</label>
<label><input type="checkbox" name="override">` + game.i18n.localize("pf2e-hex.target.collision_override") + `</label>
<select name="collision">
    <option value="none">` + game.i18n.localize("none") + `</option>
    <option value="move">` + game.i18n.localize("move") + `</option>
    <option value="sight">` + game.i18n.localize("sight") + `</option>
    <option value="light">` + game.i18n.localize("light") + `</option>
    <option value="sound">` + game.i18n.localize("sound") + `</option>
</select>
<label><input type="checkbox" name="delete">` + game.i18n.localize("pf2e-hex.target.delete") + `</label>`,
            buttons: [{
                action: "target",
                label: "pf2e-hex.target.target",
                callback: (event, button, dialog) => [button.form.elements.override.checked, button.form.elements.collision.value, button.form.elements.opposition.checked, button.form.elements.neutral.checked, button.form.elements.party.checked, button.form.elements.self.checked, button.form.elements.delete.checked]
            }],
        })
    } catch {
        return;
    }
    // parse user input
    const override_collision = inputs[0];
    const override_collision_type = inputs[1];
    const target_opposition = inputs[2];
    const target_neutral = inputs[3];
    const target_party = inputs[4];
    const target_self = inputs[5];
    const delete_template = inputs[6];
    // get tokens that intersect with bounding box of grid highlight
    let tokens = canvas.tokens.quadtree.getObjects(canvas.interface.grid.getHighlightLayer(template.object.highlightId).getLocalBounds(undefined, true));
    // iterate over tokens checking if any points of the template lie within token shape
    const targetsIds = []
    for (const position of template.object._getGridHighlightPositions()) {
        const {x, y, collision} = position;
        // get center coordinates instead of top left coordinates
        const realX = (x + (canvas.grid.size / 2));
        const realY = (y + (canvas.grid.size / 2));
        if (tokens.size === 0) {
            break;
        } else {
            for (const token of tokens) {
                // translate position into local token position and check if shape contains it
                if (token.shape.contains((realX - token.position.x), (realY - token.position.y))) {
                    let effected = false;
                    if (override_collision) {
                        if (override_collision_type in CONFIG.Canvas.polygonBackends) {
                            if (!CONFIG.Canvas.polygonBackends[override_collision_type].testCollision(
                                template.object.center,
                                {
                                    x: position.x,
                                    y: position.y,
                                },
                                {
                                    type: override_collision_type,
                                    mode: "any",
                                })) {
                                    effected = true;
                            }
                        } else {
                            effected = true;
                        }
                    } else {
                        if (!collision) {
                            effected = true;
                        }
                    }
                    if (effected) {
                        // remove from tokens list
                        tokens.delete(token);
                        // filter token
                        if (!token.document.hidden && token.actor?.isOfType("creature", "hazard", "vehicle", "familiar")) {
                            if (((token.actor.type === "vehicle" || token.actor.type === "hazard") && target_neutral) || (token.actor.alliance === "opposition" && target_opposition) || (token.actor.alliance === "neutral" && target_neutral) || (token.actor.alliance === "party" && target_party)) {
                                if (template.actor === token.actor) {
                                    if (target_self) {
                                        targetsIds.push(token.id);
                                    }
                                } else {
                                    targetsIds.push(token.id);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    // target tokens
    game.user.updateTokenTargets(targetsIds);
    game.user.broadcastActivity({ targets: targetsIds });
    // delete template
    if (delete_template) {
        template.delete();
    }
}

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
    game.settings.register("pf2e-hex", "highlight-default-collision", {
        name: "pf2e-hex.setting.highlight-collision-name",
        hint: "pf2e-hex.setting.highlight-collision-hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "none": "pf2e-hex.setting.collision-option-none",
            "move": "pf2e-hex.setting.collision-option-move",
            "sight": "pf2e-hex.setting.collision-option-sight",
            "light": "pf2e-hex.setting.collision-option-light",
            "sound": "pf2e-hex.setting.collision-option-sound"
        },
        default: "sight"
    });
    game.settings.register("pf2e-hex", "target-helper-enabled", {
        name: "pf2e-hex.setting.target-helper-name",
        hint: "pf2e-hex.setting.target-helper-hint",
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
})