// ===========================================
// visual-config.js — Paleta arcade, grid del radar y audio opcional
// (Solo datos de presentación; la lógica sigue en game.js)
// ===========================================

/** Celdas a cada lado del jugador (viewport = 2*RADIUS+1) — debe coincidir con ui.js */
export const VIEWPORT_RADIUS = 2;

export const GRID_VIEW_SIZE = VIEWPORT_RADIUS * 2 + 1;

/**
 * Tamaño lógico recomendado por celda del minimapa (px en pantalla antes de DPR).
 * Útil si más adante cargas spritesheet alineado a esta cuadrícula.
 */
export const ARCADE_CELL_HINT_PX = 40;

/** Colores de acento por tier de enemigo (hex) — alineados a la UI anterior */
export const TIER_HEX = {
    0: '#81c784',
    10: '#aed581',
    20: '#dce775',
    30: '#ffd54f',
    40: '#ffb74d',
    50: '#ff8a65',
    60: '#e57373',
    70: '#ef5350',
    80: '#f06292',
    90: '#ce93d8',
    100: '#b39ddb',
};

/** Fondos suaves para celdas “visitadas” en el radar */
export const TIER_FILL_HEX = {
    0: '#1a2e1a',
    10: '#1f2e18',
    20: '#2a2e14',
    30: '#2e2a12',
    40: '#2e2210',
    50: '#2e1c10',
    60: '#2e1614',
    70: '#2e1212',
    80: '#2a1220',
    90: '#221a2e',
    100: '#1e182e',
};

/** Paleta general cabina neón (CSS y canvas pueden referenciar la misma idea) */
export const PALETTE = {
    bgDeep: '#0d0221',
    panel: '#150734',
    panelEdge: '#00ffc8',
    neonPink: '#ff00aa',
    neonCyan: '#00fff0',
    neonAmber: '#ffcc00',
    crtGreen: '#39ff14',
    danger: '#ff3366',
};

/**
 * Nivel visual de bosque no visitado (0–3) según tier del enemigo oculto.
 */
export function forestDensityLevel(tier) {
    if (tier <= 30) return 0;
    if (tier <= 50) return 1;
    if (tier <= 80) return 2;
    return 3;
}

/** RGBA para relleno de bosque en el canvas del radar */
export function forestFillRgba(level) {
    const t = [
        [46, 110, 46],
        [30, 90, 28],
        [18, 70, 20],
        [8, 40, 12],
    ][level] || [8, 40, 12];
    return `rgb(${t[0]},${t[1]},${t[2]})`;
}

function publicAsset(relativePath) {
    const base =
        typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL != null
            ? import.meta.env.BASE_URL
            : '/';
    const p = relativePath.replace(/^\//, '');
    return `${base}${p}`.replace(/([^:]\/)\/+/g, '$1');
}

/** Ilustraciones en public/img/ (Vercel / Vite sirven desde la raíz del sitio). */
export function publicImg(filename) {
    return publicAsset(`img/${filename}`);
}

/**
 * Rutas de audio opcionales (Vite: coloca archivos en public/assets/sfx/)
 */
export const ARCADE_AUDIO = {
    uiClick: publicAsset('assets/sfx/ui-click.webm'),
    combatHit: publicAsset('assets/sfx/hit.webm'),
    move: publicAsset('assets/sfx/move.webm'),
};
