// ===========================================
// minimap-canvas.js — Vista radar 5x5 (solo dibujo, lee estado ya resuelto)
// ===========================================

import { MAP_SIZE } from './map.js';
import {
    VIEWPORT_RADIUS,
    TIER_HEX,
    TIER_FILL_HEX,
    forestDensityLevel,
    forestFillRgba,
    PALETTE,
} from './visual-config.js';

let canvas = null;
let ctx = null;
let resizeObserver = null;
let getStateProvider = null;

function getTierStyle(tier) {
    const stroke = TIER_HEX[tier] || '#888888';
    const fill = TIER_FILL_HEX[tier] || '#1a1a24';
    return { stroke, fill };
}

/**
 * @param {HTMLElement} containerEl — #minimap
 * @param {() => object|null} getState — misma fuente que el resto de la UI (p. ej. getState)
 */
export function initMinimapCanvas(containerEl, getState) {
    getStateProvider = getState;
    canvas = containerEl.querySelector('canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => {
        layoutCanvas(containerEl);
        const s = getStateProvider ? getStateProvider() : null;
        if (s) drawMinimap(s);
    });
    resizeObserver.observe(containerEl);

    layoutCanvas(containerEl);
}

function layoutCanvas(containerEl) {
    if (!canvas || !ctx) return;

    const maxCss = 280;
    const w = Math.min(containerEl.clientWidth || maxCss, maxCss);
    const cells = VIEWPORT_RADIUS * 2 + 1;
    const cell = Math.max(8, Math.floor(w / cells));
    const display = cell * cells;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(display * dpr);
    canvas.height = Math.floor(display * dpr);
    canvas.style.width = `${display}px`;
    canvas.style.height = `${display}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
}

/**
 * Redibuja el radar a partir del estado del juego (sin mutar estado).
 */
export function renderMinimapCanvas(state) {
    if (!canvas || !ctx) return;
    if (!state) {
        const parent = canvas.parentElement;
        if (parent) layoutCanvas(parent);
        const d = canvas.clientWidth;
        if (d > 0) ctx.clearRect(0, 0, d, d);
        return;
    }
    const parent = canvas.parentElement;
    if (parent && (parent.clientWidth === 0 || canvas.width === 0)) {
        layoutCanvas(parent);
    }
    drawMinimap(state);
}

function drawMinimap(state) {
    const { row, col } = state.player;
    const grid = state.map.grid;
    const display = canvas.clientWidth;
    const cells = VIEWPORT_RADIUS * 2 + 1;
    const cell = display / cells;

    ctx.clearRect(0, 0, display, display);

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, display, display);

    for (let dr = -VIEWPORT_RADIUS; dr <= VIEWPORT_RADIUS; dr++) {
        for (let dc = -VIEWPORT_RADIUS; dc <= VIEWPORT_RADIUS; dc++) {
            const r = row + dr;
            const c = col + dc;
            const sx = (dc + VIEWPORT_RADIUS) * cell;
            const sy = (dr + VIEWPORT_RADIUS) * cell;
            const pad = 1;

            if (dr === 0 && dc === 0) {
                drawPlayerCell(sx + pad, sy + pad, cell - pad * 2, state.player.hasPrincess);
            } else if (r < 0 || r >= MAP_SIZE || c < 0 || c >= MAP_SIZE) {
                drawBorderCell(sx + pad, sy + pad, cell - pad * 2);
            } else {
                const tile = grid[r][c];
                if (tile.isSwamp) {
                    drawSwampCell(sx + pad, sy + pad, cell - pad * 2);
                } else if (tile.cleared) {
                    drawClearedCell(sx + pad, sy + pad, cell - pad * 2);
                } else if (tile.visited) {
                    const { stroke, fill } = getTierStyle(tile.enemy.tier);
                    drawVisitedCell(sx + pad, sy + pad, cell - pad * 2, fill, stroke);
                } else {
                    const level = forestDensityLevel(tile.enemy.tier);
                    drawUnknownForestCell(sx + pad, sy + pad, cell - pad * 2, level);
                }
            }

            ctx.strokeStyle = PALETTE.panelEdge;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 0.5, sy + 0.5, cell - 1, cell - 1);
            ctx.globalAlpha = 1;
        }
    }
}

function drawPlayerCell(x, y, s, hasPrincess) {
    ctx.fillStyle = '#0d3d12';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = PALETTE.crtGreen;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);

    const u = s / 8;
    ctx.fillStyle = PALETTE.neonAmber;
    ctx.fillRect(x + u * 3, y + u * 2, u * 2, u * 2);
    ctx.fillStyle = '#ffeedd';
    ctx.fillRect(x + u * 3.25, y + u * 2.25, u * 1.5, u * 1.5);
    ctx.fillStyle = '#2244aa';
    ctx.fillRect(x + u * 2.5, y + u * 4, u * 3, u * 3.5);

    if (hasPrincess) {
        ctx.fillStyle = PALETTE.neonPink;
        ctx.fillRect(x + u * 5.2, y + u * 3, u * 2, u * 2.5);
    }
}

function drawBorderCell(x, y, s) {
    ctx.fillStyle = '#3d3020';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = PALETTE.neonAmber;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    const step = Math.max(3, s / 6);
    ctx.strokeStyle = 'rgba(255,200,100,0.25)';
    for (let i = -s; i < s; i += step) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i + s, y + s);
        ctx.stroke();
    }
}

function drawSwampCell(x, y, s) {
    ctx.fillStyle = '#062018';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = 'rgba(0,255,200,0.15)';
    const d = Math.max(2, s / 5);
    ctx.beginPath();
    ctx.arc(x + s * 0.35, y + s * 0.4, d, 0, Math.PI * 2);
    ctx.arc(x + s * 0.65, y + s * 0.55, d * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,255,200,0.4)';
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
}

function drawClearedCell(x, y, s) {
    ctx.fillStyle = '#142614';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = 'rgba(57,255,20,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    ctx.strokeStyle = 'rgba(57,255,20,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y + s * 0.2);
    ctx.lineTo(x + s * 0.8, y + s * 0.8);
    ctx.moveTo(x + s * 0.8, y + s * 0.2);
    ctx.lineTo(x + s * 0.2, y + s * 0.8);
    ctx.stroke();
}

function drawVisitedCell(x, y, s, fillHex, strokeHex) {
    ctx.fillStyle = fillHex;
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = strokeHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = strokeHex;
    const r = Math.max(2, s * 0.12);
    ctx.beginPath();
    ctx.arc(x + s * 0.5, y + s * 0.5, r, 0, Math.PI * 2);
    ctx.fill();
}

function drawUnknownForestCell(x, y, s, level) {
    ctx.fillStyle = forestFillRgba(level);
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = 'rgba(0,255,240,0.2)';
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    const n = 4 + level;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < n; i++) {
        const px = x + ((i * 37) % Math.floor(s - 4)) + 2;
        const py = y + ((i * 53) % Math.floor(s - 4)) + 2;
        ctx.fillRect(px, py, 2, 2);
    }
}
