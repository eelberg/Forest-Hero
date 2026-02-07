// ===========================================
// combat.js - Mecánicas de combate, huida y soborno
// ===========================================

import { rollProbability } from './utils.js';

// --- Resultados posibles ---
export const FIGHT_RESULT = {
    WIN: 'win',
    DRAW: 'draw',
    LOSE: 'lose',
};

export const FLEE_RESULT = {
    ESCAPE: 'escape',         // 40% - Escapas a casilla adyacente
    CAUGHT: 'caught',         // 30% - El enemigo te alcanza, eliges de nuevo
    FORCED_FIGHT: 'forced',   // 20% - Te agarra y te obliga a pelear
    KILLED: 'killed',         // 10% - Te mata
};

export const BRIBE_RESULT = {
    ACCEPT: 'accept',         // El enemigo acepta
    REJECT: 'reject',         // El enemigo rechaza
    INSULT: 'insult',         // El enemigo se siente insultado, pelea forzada
};

// --- Sistema de combate ---

/**
 * Resuelve un combate.
 * @param {number} energySpent - Energía invertida por el jugador
 * @param {number} enemyStrength - Fuerza total del enemigo
 * @returns {string} FIGHT_RESULT
 */
export function fight(energySpent, enemyStrength) {
    // Caso especial: fuerza enemiga 0 (ratón) - siempre ganas
    if (enemyStrength === 0) {
        return FIGHT_RESULT.WIN;
    }

    const ratio = energySpent / enemyStrength;

    if (ratio > 1.8) {
        return rollProbability([
            { chance: 0.95, result: FIGHT_RESULT.WIN },
            { chance: 0.05, result: FIGHT_RESULT.DRAW },
        ]);
    } else if (ratio > 1.3) {
        return rollProbability([
            { chance: 0.70, result: FIGHT_RESULT.WIN },
            { chance: 0.25, result: FIGHT_RESULT.DRAW },
            { chance: 0.05, result: FIGHT_RESULT.LOSE },
        ]);
    } else if (ratio > 0.8) {
        return rollProbability([
            { chance: 0.15, result: FIGHT_RESULT.WIN },
            { chance: 0.60, result: FIGHT_RESULT.DRAW },
            { chance: 0.25, result: FIGHT_RESULT.LOSE },
        ]);
    } else if (ratio > 0.4) {
        return rollProbability([
            { chance: 0.05, result: FIGHT_RESULT.WIN },
            { chance: 0.25, result: FIGHT_RESULT.DRAW },
            { chance: 0.70, result: FIGHT_RESULT.LOSE },
        ]);
    } else {
        return rollProbability([
            { chance: 0.05, result: FIGHT_RESULT.DRAW },
            { chance: 0.95, result: FIGHT_RESULT.LOSE },
        ]);
    }
}

// --- Sistema de huida ---

/**
 * Resuelve un intento de huida.
 * @returns {string} FLEE_RESULT
 */
export function flee() {
    return rollProbability([
        { chance: 0.40, result: FLEE_RESULT.ESCAPE },
        { chance: 0.30, result: FLEE_RESULT.CAUGHT },
        { chance: 0.20, result: FLEE_RESULT.FORCED_FIGHT },
        { chance: 0.10, result: FLEE_RESULT.KILLED },
    ]);
}

// --- Sistema de soborno ---

/**
 * Resuelve un intento de soborno.
 * La probabilidad depende SOLO de la cantidad ofrecida (umbrales fijos).
 * @param {number} goldOffered - Cantidad de oro ofrecida
 * @returns {string} BRIBE_RESULT
 */
export function bribe(goldOffered) {
    if (goldOffered > 100) {
        return rollProbability([
            { chance: 0.90, result: BRIBE_RESULT.ACCEPT },
            { chance: 0.08, result: BRIBE_RESULT.REJECT },
            { chance: 0.02, result: BRIBE_RESULT.INSULT },
        ]);
    } else if (goldOffered >= 50) {
        return rollProbability([
            { chance: 0.60, result: BRIBE_RESULT.ACCEPT },
            { chance: 0.28, result: BRIBE_RESULT.REJECT },
            { chance: 0.12, result: BRIBE_RESULT.INSULT },
        ]);
    } else if (goldOffered >= 20) {
        return rollProbability([
            { chance: 0.30, result: BRIBE_RESULT.ACCEPT },
            { chance: 0.45, result: BRIBE_RESULT.REJECT },
            { chance: 0.25, result: BRIBE_RESULT.INSULT },
        ]);
    } else {
        return rollProbability([
            { chance: 0.05, result: BRIBE_RESULT.ACCEPT },
            { chance: 0.35, result: BRIBE_RESULT.REJECT },
            { chance: 0.60, result: BRIBE_RESULT.INSULT },
        ]);
    }
}
