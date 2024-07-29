
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

Hooks.once("ready", () => {
    game.settings.set("core", "gridTemplates", false);
});

// HIGHLIGHT TEMPLATE WALL COLLISIONS

// function to process hex grid maps and highlight them (logic also works on square but it isn't active on there)
async function hexGridHightlight(template, data)  {
    setGridTemplates(canvas);

    if (canvas.grid.isHexagonal) {
        const collisionType = "move";

        const gridPositions = template._getGridHighlightPositions()

        canvas.interface.grid.getHighlightLayer(template.highlightId).clear();

        for (const position of gridPositions) {
            const hasCollision = CONFIG.Canvas.polygonBackends[collisionType].testCollision(
                template.center,
                {
                    x: position.x + (canvas.grid.size / 2),
                    y: position.y + (canvas.grid.size / 2),
                },
                {
                    type: collisionType,
                    mode: "any",
                });
            if (hasCollision) {
                canvas.interface.grid.highlightPosition(template.highlightId, {
                    x: position.x,
                    y: position.y,
                    border: 0x000001,
                    color: 0x000000,
                });
            } else {
                canvas.interface.grid.highlightPosition(template.highlightId, {
                    x: position.x,
                    y: position.y,
                    border: template.document.borderColor,
                    color: template.document.fillColor,
                });
            }
        }
    }
}
// hacky hook to add collisions highlights like square
Hooks.on("refreshMeasuredTemplate", hexGridHightlight);

// SNAP POINT

// logic for setting the template snapping
function setTemplateSnapping() {
    libWrapper.register('pf2e-hex', 'TemplateLayer.prototype.getSnappedPoint', function(wrapped, point) {
        let template = this.preview.children.at(0);
        if (!template) {
            // TODO - need work around for chat templates
        }
        if (template && canvas && canvas.grid && canvas.grid.isHexagonal) {
            const M = CONST.GRID_SNAPPING_MODES;
            let snappingMode = 0;
            switch (template.areaShape) {
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
        } else {
            return wrapped(point);
        }
    }, 'MIXED');
}
// hook to override default template snapping (canvasReady seems to be a good hook point)
Hooks.once("libWrapper.Ready", setTemplateSnapping);