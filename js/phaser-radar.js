// ===========================================
// phaser-radar.js — Radar 5x5 con Phaser 3 (solo vista; estado desde getState)
// ===========================================

import Phaser from 'phaser';
import { MAP_SIZE } from './map.js';
import {
    VIEWPORT_RADIUS,
    TIER_HEX,
    TIER_FILL_HEX,
    forestDensityLevel,
    forestFillRgba,
    PALETTE,
} from './visual-config.js';

let phaserGame = null;
let resizeObserver = null;
let getStateProvider = null;
let radarSceneInstance = null;

function hexToColor(hex) {
    return parseInt(hex.replace('#', ''), 16);
}

function rgbStringToHexInt(s) {
    const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return 0x08280c;
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    return (r << 16) | (g << 8) | b;
}

function getTierStyle(tier) {
    const stroke = TIER_HEX[tier] || '#888888';
    const fill = TIER_FILL_HEX[tier] || '#1a1a24';
    return { stroke: hexToColor(stroke), fill: hexToColor(fill) };
}

function computeDisplaySize(containerEl) {
    const maxCss = 280;
    const w = Math.min(containerEl.clientWidth || maxCss, maxCss);
    const cells = VIEWPORT_RADIUS * 2 + 1;
    const cell = Math.max(8, Math.floor(w / cells));
    return cell * cells;
}

function drawPlayerCell(g, x, y, s, hasPrincess) {
    const crtGreen = hexToColor(PALETTE.crtGreen);
    const neonAmber = hexToColor(PALETTE.neonAmber);
    const neonPink = hexToColor(PALETTE.neonPink);

    g.fillStyle(0x0d3d12, 1);
    g.fillRect(x, y, s, s);
    g.lineStyle(2, crtGreen, 1);
    g.strokeRect(x + 1, y + 1, s - 2, s - 2);

    const u = s / 8;
    g.fillStyle(neonAmber, 1);
    g.fillRect(x + u * 3, y + u * 2, u * 2, u * 2);
    g.fillStyle(0xffeedd, 1);
    g.fillRect(x + u * 3.25, y + u * 2.25, u * 1.5, u * 1.5);
    g.fillStyle(0x2244aa, 1);
    g.fillRect(x + u * 2.5, y + u * 4, u * 3, u * 3.5);

    if (hasPrincess) {
        g.fillStyle(neonPink, 1);
        g.fillRect(x + u * 5.2, y + u * 3, u * 2, u * 2.5);
    }
}

function drawBorderCell(g, x, y, s) {
    const neonAmber = hexToColor(PALETTE.neonAmber);
    g.fillStyle(0x3d3020, 1);
    g.fillRect(x, y, s, s);
    g.lineStyle(1, neonAmber, 1);
    g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    const step = Math.max(3, s / 6);
    g.lineStyle(1, 0xffc864, 0.25);
    for (let i = -s; i < s; i += step) {
        g.lineBetween(x + i, y, x + i + s, y + s);
    }
}

function drawSwampCell(g, x, y, s) {
    g.fillStyle(0x062018, 1);
    g.fillRect(x, y, s, s);
    const d = Math.max(2, s / 5);
    g.fillStyle(0x00ffc8, 0.15);
    g.fillCircle(x + s * 0.35, y + s * 0.4, d);
    g.fillCircle(x + s * 0.65, y + s * 0.55, d * 0.8);
    g.lineStyle(1, 0x00ffc8, 0.4);
    g.strokeRect(x + 1, y + 1, s - 2, s - 2);
}

function drawClearedCell(g, x, y, s) {
    g.fillStyle(0x142614, 1);
    g.fillRect(x, y, s, s);
    g.lineStyle(1, 0x39ff14, 0.5);
    g.strokeRect(x + 1, y + 1, s - 2, s - 2);
    g.lineStyle(1, 0x39ff14, 0.35);
    g.lineBetween(x + s * 0.2, y + s * 0.2, x + s * 0.8, y + s * 0.8);
    g.lineBetween(x + s * 0.8, y + s * 0.2, x + s * 0.2, y + s * 0.8);
}

function drawVisitedCell(g, x, y, s, fillHex, strokeHex) {
    g.fillStyle(fillHex, 1);
    g.fillRect(x, y, s, s);
    g.lineStyle(2, strokeHex, 1);
    g.strokeRect(x + 1, y + 1, s - 2, s - 2);
    g.fillStyle(strokeHex, 1);
    const r = Math.max(2, s * 0.12);
    g.fillCircle(x + s * 0.5, y + s * 0.5, r);
}

function drawUnknownForestCell(g, x, y, s, level) {
    const fill = rgbStringToHexInt(forestFillRgba(level));
    g.fillStyle(fill, 1);
    g.fillRect(x, y, s, s);
    g.lineStyle(1, 0x00fff0, 0.2);
    g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    const n = 4 + level;
    g.fillStyle(0x000000, 0.12);
    const inner = Math.floor(s - 4);
    for (let i = 0; i < n; i++) {
        const px = x + ((i * 37) % Math.max(1, inner)) + 2;
        const py = y + ((i * 53) % Math.max(1, inner)) + 2;
        g.fillRect(px, py, 2, 2);
    }
}

class RadarScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ForestRadar' });
    }

    create() {
        this.g = this.add.graphics();
        radarSceneInstance = this;
        const state = getStateProvider ? getStateProvider() : null;
        this.syncState(state);
    }

    /**
     * @param {object|null} state
     */
    syncState(state) {
        if (!this.g) return;

        const display = Math.min(this.scale.width, this.scale.height);
        this.g.clear();

        if (!state) {
            this.cameras.main.setBackgroundColor('#050510');
            if (display > 0) {
                this.g.fillStyle(0x050510, 1);
                this.g.fillRect(0, 0, display, display);
            }
            return;
        }

        const { row, col } = state.player;
        const grid = state.map.grid;
        const cells = VIEWPORT_RADIUS * 2 + 1;
        const cell = display / cells;

        this.cameras.main.setBackgroundColor('#050510');
        this.g.fillStyle(0x050510, 1);
        this.g.fillRect(0, 0, display, display);

        const panelEdge = hexToColor(PALETTE.panelEdge);

        for (let dr = -VIEWPORT_RADIUS; dr <= VIEWPORT_RADIUS; dr++) {
            for (let dc = -VIEWPORT_RADIUS; dc <= VIEWPORT_RADIUS; dc++) {
                const r = row + dr;
                const c = col + dc;
                const sx = (dc + VIEWPORT_RADIUS) * cell;
                const sy = (dr + VIEWPORT_RADIUS) * cell;
                const pad = 1;

                if (dr === 0 && dc === 0) {
                    drawPlayerCell(this.g, sx + pad, sy + pad, cell - pad * 2, state.player.hasPrincess);
                } else if (r < 0 || r >= MAP_SIZE || c < 0 || c >= MAP_SIZE) {
                    drawBorderCell(this.g, sx + pad, sy + pad, cell - pad * 2);
                } else {
                    const tile = grid[r][c];
                    if (tile.isSwamp) {
                        drawSwampCell(this.g, sx + pad, sy + pad, cell - pad * 2);
                    } else if (tile.cleared) {
                        drawClearedCell(this.g, sx + pad, sy + pad, cell - pad * 2);
                    } else if (tile.visited) {
                        const { stroke, fill } = getTierStyle(tile.enemy.tier);
                        drawVisitedCell(this.g, sx + pad, sy + pad, cell - pad * 2, fill, stroke);
                    } else {
                        const level = forestDensityLevel(tile.enemy.tier);
                        drawUnknownForestCell(this.g, sx + pad, sy + pad, cell - pad * 2, level);
                    }
                }

                this.g.lineStyle(1, panelEdge, 0.35);
                this.g.strokeRect(sx + 0.5, sy + 0.5, cell - 1, cell - 1);
            }
        }
    }
}

/**
 * @param {HTMLElement} containerEl — #minimap
 * @param {() => object|null} getState
 */
export function initMinimapPhaser(containerEl, getState) {
    getStateProvider = getState;

    if (phaserGame) {
        resizeObserver?.disconnect();
        resizeObserver = null;
        phaserGame.destroy(true);
        phaserGame = null;
        radarSceneInstance = null;
    }

    const size = Math.max(computeDisplaySize(containerEl), 40);

    phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        width: size,
        height: size,
        parent: containerEl,
        backgroundColor: '#050510',
        scene: RadarScene,
        render: {
            pixelArt: true,
            antialias: false,
            roundPixels: true,
        },
        scale: {
            mode: Phaser.Scale.NONE,
        },
        audio: {
            noAudio: true,
        },
        banner: false,
        dom: {
            createContainer: false,
        },
    });

    resizeObserver = new ResizeObserver(() => {
        if (!phaserGame || !radarSceneInstance) return;
        const sz = computeDisplaySize(containerEl);
        if (sz < 40) return;
        phaserGame.scale.resize(sz, sz);
        radarSceneInstance.syncState(getStateProvider ? getStateProvider() : null);
    });
    resizeObserver.observe(containerEl);
}

/**
 * @param {object|null} state
 */
export function renderMinimapPhaser(state) {
    if (radarSceneInstance) {
        radarSceneInstance.syncState(state);
    }
}
