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
                const p00 = Ray.fromAngle(0, 0, Math.toRadians(direction - 90), 0).B;
                let p10 = canvas.grid.getTranslatedPoint(p00, direction, distance);
                return new PIXI.Polygon(p00.x, p00.y, p10.x, p10.y);
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

// EMULATE gridTemplates SETTING & ANGLE SNAPPING
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype._onDragLeftMove', function(wrapped, event) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped(event);
        }
        // unpack data from event
        const { destination, preview, origin } = event.interactionData;
        // compute the ray for angle
        const ray = new Ray(origin, destination);
        // compute the snapped distance for the measured template
        const distance = (Math.round(canvas.grid.measurePath([origin, destination]).distance / canvas.grid.distance) * canvas.grid.distance);
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
        // Update the preview object distance
        preview.document.distance = distance;
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

// ENHANCED HIGHLIGHTING
// TODO look into why the origin is not snapped till placed
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype._getGridHighlightPositions', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        }
        // ensure x,y origin is snapped
        const origin = hexSnapper(this.areaShape, {x: this.document.x, y: this.document.y});
        this.document.x = origin.x;
        this.document.y = origin.y;
        // only override logic on line template
        if (this.areaShape != "line") {
            return wrapped();
        }
        // get constants
        const {direction, distance} = this.document;
        // calculate ray
        const ray = new Ray(canvas.grid.getTranslatedPoint({x: origin.x, y: origin.y}, direction, (canvas.grid.distance * 0.5)), canvas.grid.getTranslatedPoint({x: origin.x, y: origin.y}, direction, distance));
        // calculate direct grid points along the ray and save the highlight point of the position
        const positions = [];
        for (const position of canvas.grid.getDirectPath([ray.A, ray.B])) {
            positions.push(canvas.grid.getTopLeftPoint(position));
        }
        // limit the number of points to the distance
        return positions.slice(0, (distance / canvas.grid.distance)+.1)
    }, 'MIXED');
});


// SNAP POINT helper
function hexSnapper(type, point) {
    const M = CONST.GRID_SNAPPING_MODES;
    let snappingMode = 0;
    switch (type) {
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
            snappingMode = M.EDGE_MIDPOINT | M.VERTEX;
            break;
        default:
            snappingMode = M.CENTER | M.VERTEX;
            break;
    }
    return canvas.grid.getSnappedPoint(point, {
        mode: snappingMode,
        resolution: 1,
    });
}
// SNAP POINT (movement)
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype.getSnappedPoint', function(wrapped, point) {
        if (!canvas.ready || !canvas.grid || !canvas.grid.isHexagonal) {
            return wrapped(point);
        }
        // TODO is there a way that also works on creation?
        let template = this.preview.children.at(0);
        if (template) {
            return hexSnapper(template.areaShape, point);
        } else {
            return { x: point.x, y: point.y };
        }
    }, 'MIXED');
});
// SNAP POINT (placement)
Hooks.on("preCreateMeasuredTemplate", (template) => {
    if (!canvas.ready || !canvas.grid || !canvas.grid.isHexagonal) {
        return;
    }
    if (!template || template.destroyed) return;
    let point = hexSnapper(template.areaShape, { x: template.x, y: template.y });
    template.updateSource({
        x: point.x,
        y: point.y,
    });
});
// SNAP POINT (chat movement)
Hooks.on("refreshMeasuredTemplate", (template) => {
    if (!canvas.ready || !canvas.grid || !canvas.grid.isHexagonal) {
        return;
    }
    if (!template || template.destroyed) return;
    let point = hexSnapper(template.areaShape, { x: template.x, y: template.y });
    if ((template.x !== point.x) || (template.y !== point.y)) {
        template.x = point.x;
        template.y = point.y;
    }
});
