
// TEMPLATES

// FORCE gridTemplates SETTING

// function to change the gridTemplates based on the current scene grid type
async function setGridTemplates(canvas) {
    if (game.user.isGM) {
        if (canvas.grid.isSquare) {
            if (game.settings.get("core", "gridTemplates")) {
                await game.settings.set("core", "gridTemplates", false);
            }
        } else if (canvas.grid.isHexagonal) {
            if (!game.settings.get("core", "gridTemplates")) {
                await game.settings.set("core", "gridTemplates", true);
            }
        }
    }
}
// force grid setting if canvas init happens
Hooks.on('canvasInit', setGridTemplates);
// helper function to delay force the setting on delays
async function setGridTemplatesInitially() {
    if (game.user.isGM) {
        setGridTemplates(game.canvas);
        // this is really stupid but the chat messages error on hex grid if gridTemplates is set to true and there isn't an existing template. IDK if this is a core or pf2e bug (maybe a bit of both)
        let workaround_templates = await game.canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [{}]);
        setTimeout(() => {
            setGridTemplates(game.canvas);
            game.canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", [workaround_templates[0].id]);
        }, 100);
    }
}
// hook on ready as pf2e system also have a "ready" hook that sets the setting (it is hacky yes but it should work)
Hooks.once("ready", setGridTemplatesInitially);

// HIGHLIGHT TEMPLATE WALL COLLISIONS

// logic for wall collisions for template highlight
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'MeasuredTemplate.prototype.highlightGrid', function(wrapped) {
        if (!canvas.ready || !canvas.grid || !canvas.grid.isHexagonal) {
            return wrapped();
        }
        // TODO update when system support is added to templates
        const collisionType = "move";
        canvas.interface.grid.clearHighlightLayer(this.highlightId);
        const positions = this._getGridHighlightPositions()
        for (const {x, y} of positions) {
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
            if (hasCollision) {
                canvas.interface.grid.highlightPosition(this.highlightId, {
                    x: x,
                    y: y,
                    border: this.document.borderColor,
                    color: 0x000000,
                });
            } else {
                canvas.interface.grid.highlightPosition(this.highlightId, {
                    x: x,
                    y: y,
                    border: this.document.borderColor,
                    color: this.document.fillColor,
                });
            }
        }
    }, 'MIXED');
});

// SNAP POINT

// hex grid snapper
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
// logic for snapping the template to the grid (movement)
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
// logic for snapping the template to the grid (placement)
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
// logic for snapping the template shape to the grid
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


// ANGLE SNAPPING

// logic for setting the template angle snapping (pretty much ripped from pf2e and adjusted to hex grids)
Hooks.once("libWrapper.Ready", () => {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype._onDragLeftMove', function(wrapped, event) {
        if (!canvas.ready || !canvas.scene || !canvas.grid.isHexagonal) {
            return wrapped(event);
        }

        const { destination, preview: template, origin } = event.interactionData;
        if (!template || template.destroyed) return;

        const dimensions = canvas.dimensions;

        // Snap the destination to the grid
        const { x, y } = canvas.templates.getSnappedPoint(destination);
        destination.x = x;
        destination.y = y;
        const ray = new Ray(origin, destination);
        const ratio = dimensions.size / dimensions.distance;
        const document = template.document;

        // Update the shape data
        if (["cone", "circle"].includes(document.t)) {
            const snapAngle = Math.PI / 6;
            document.direction = Math.toDegrees(Math.floor((ray.angle + Math.PI * 0.125) / snapAngle) * snapAngle);
        } else {
            document.direction = Math.toDegrees(ray.angle);
        }

        const increment = Math.max(ray.distance / ratio, dimensions.distance);
        document.distance = Math.ceil(increment / dimensions.distance) * dimensions.distance;

        // Draw the pending shape
        template.refresh();
    }, 'MIXED');
});