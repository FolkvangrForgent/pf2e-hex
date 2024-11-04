
import { getHexagonalShape, convertShapeToGridPolygon, convertGridPolygonToGridHighlightPositions } from './shapes.js';

async function renderersDraw(renderers) {
    if (renderers.size === 0) {
        return;
    }
    renderers.clearHighlights();
    if (renderers.token.isAnimating) {
        return;
    }
    const showBordersHighlights =  canvas.scene.tokenVision && canvas.scene.isInFocus && (game.user.isGM || renderers.token.actor?.alliance === "party") && (renderers.token.controlled || renderers.token.hover || renderers.token.layer.highlightObjects || !!(renderers.token.actor?.isOfType("familiar") ? renderers.token.actor.master?.combatant?.encounter.active : renderers.token.combatant?.encounter.active))
    for (const aura of renderers.values()) {
        await aura.draw(showBordersHighlights);
    }
    if (showBordersHighlights && (renderers.token.hover || renderers.token.layer.highlightObjects)) {
        const { highlightId } = renderers;
        const highlight = canvas.interface.grid.highlightLayers[highlightId] ?? canvas.interface.grid.addHighlightLayer(highlightId);
        highlight.clear();
        for (const aura of renderers.values()) {
            aura.highlight();
        }
    }
}

async function rendererDraw(_, __) {
    return
}


/** Highlight the affected grid squares of this aura and indicate the radius */
function rendererHighlight(renderer) {
    // For now, only highlight if there is an active combat
    const inEncounter = !!(renderer.token.actor?.isOfType("familiar")
        ? renderer.token.actor.master?.combatant?.encounter.active
        : renderer.token.combatant?.encounter.active);
    if (inEncounter) {
        const { highlightLayer } = renderer;
        if (!highlightLayer) return;
        for (const square of renderer.squares) {
            square.highlight(highlightLayer, renderer.appearance);
        }
    }
}

function squares(tokenDocument, radius) {
    // ensure objects exist
    if (!tokenDocument || !tokenDocument.scene || !tokenDocument.scene.grid || !tokenDocument.object) return [];
    // create shape
    const shape = getHexagonalShape(tokenDocument.scene.grid.columns, tokenDocument.hexagonalShape, tokenDocument.width + (radius * 2 / tokenDocument.scene.grid.distance), tokenDocument.height + (radius * 2 / tokenDocument.scene.grid.distance));
    // ensure shape exists
    if (!shape) return [];
    // create polygon
    const polygon = convertShapeToGridPolygon(shape, tokenDocument.scene.grid, tokenDocument.object.center.x, tokenDocument.object.center.y);
    // ensure polygon exists
    if (!polygon) return [];
    // create square objects
    const squares = [];
    for (const position of convertGridPolygonToGridHighlightPositions(polygon, tokenDocument.scene.grid)) {
        squares.push(new CONFIG.PF2E.Aura.square(position.x, position.y))
    }
    return squares;
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

async function auraInitializationInternal() {
    game.settings.register("pf2e-hex", "aura-helper-enabled", {
        name: "pf2e-hex.setting.aura-helper-name",
        hint: "pf2e-hex.setting.aura-helper-hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
    if (!game.settings.get('pf2e-hex', 'aura-helper-enabled')) {
        return
    }
    while (!CONFIG.PF2E) {
        await sleep(100)
    }
    libWrapper.register('pf2e-hex', 'CONFIG.PF2E.Aura.renderer.prototype.squares', function(wrapped) {
        // only override logic on hexagonal grid
        if (!this.token.document.scene.grid.isHexagonal) {
            return wrapped();
        } else {
            return squares(this.token.document, this.radius);
        }
    }, 'MIXED');
    // TokenAura overwrites
    libWrapper.register('pf2e-hex', 'CONFIG.PF2E.Aura.token.prototype.squares', function(wrapped) {
        // only override logic on hexagonal grid
        if (!this.token.scene.grid.isHexagonal) {
            return wrapped();
        } else {
            return squares(this.token, this.radius);
        }
    }, 'MIXED');
    libWrapper.register('pf2e-hex', 'CONFIG.PF2E.Aura.token.prototype.containsToken', function(wrapped, token) {
        // console.warn('CONFIG.PF2E.Aura.token.prototype.containsToken')
        // console.warn(token)
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped(token);
        }
        // If either token is hidden or not rendered, return false early
        if (this.token.hidden || token.hidden || !this.token.object || !token.object) {
            return false;
        }
        // If the token is the one emitting the aura, return true early
        if (token === this.token) {
            return true;
        }
        for (const square of this.squares) {
            // translate position into local token position and check if token shape contains it
            if (token.object.shape.contains((square.center.x - token.object.position.x), (square.center.y - token.object.position.y))) {
                return true;
            }
        }
        return false;
    }, 'MIXED');
    libWrapper.register('pf2e-hex', 'CONFIG.PF2E.Aura.renderers.prototype.draw', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        } else {
            return renderersDraw(this)
        }
    }, 'MIXED');
    libWrapper.register('pf2e-hex', 'CONFIG.PF2E.Aura.renderer.prototype.highlight', function(wrapped) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped();
        } else {
            return rendererHighlight(this);
        }
    }, 'MIXED');
    libWrapper.register('pf2e-hex', 'CONFIG.PF2E.Aura.renderer.prototype.draw', function(wrapped, showBorder) {
        // only override logic on hexagonal grid
        if (!canvas.grid.isHexagonal) {
            return wrapped(showBorder);
        } else {
            return rendererDraw(this, showBorder);
        }
    }, 'MIXED');
}

export function auraInitialization() {
    Hooks.once("libWrapper.Ready", auraInitializationInternal);
}

