// ===========================================
// combat.js - Mecánicas de combate, huida y soborno
// ===========================================

import { rollProbability, sigmoid, clamp } from './utils.js';

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

// --- Parámetros de curvas continuas ---

// Combate: gaussiana (empate) + sigmoide (ganar/perder)
const FIGHT_DRAW_PEAK = 0.45;   // Probabilidad máxima de empate (cuando ratio ≈ 1)
const FIGHT_DRAW_SIGMA = 0.38;  // Anchura de la campana de empate
const FIGHT_SIGMOID_K = 5;      // Pendiente del sigmoide ganar/perder

// Soborno: dos sigmoides independientes
const BRIBE_ACCEPT_CENTER = 60;  // Oro para 50% de aceptación
const BRIBE_ACCEPT_K = 0.05;    // Sensibilidad de aceptación por moneda
const BRIBE_INSULT_CENTER = 30;  // Oro donde insulto cae a 50% de su máximo
const BRIBE_INSULT_K = 0.06;    // Velocidad de caída del insulto
const BRIBE_ACCEPT_MAX = 0.95;  // Techo de probabilidad de aceptación
const BRIBE_INSULT_MAX = 0.55;  // Techo de probabilidad de insulto

// --- Sistema de combate ---

/**
 * Resuelve un combate usando funciones continuas.
 *
 * Modelo matemático:
 *   ratio = energySpent / enemyStrength
 *   P(empate) = DRAW_PEAK × e^(-(ratio - 1)² / (2σ²))   ← gaussiana centrada en 1
 *   P(ganar)  = (1 - P(empate)) × σ(k × (ratio - 1))     ← sigmoide
 *   P(perder) = 1 - P(ganar) - P(empate)
 *
 * Cada unidad extra de energía siempre mejora la probabilidad de ganar.
 *
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

    // Gaussiana: empate máximo cuando fuerzas son iguales (ratio ≈ 1)
    const drawProb = FIGHT_DRAW_PEAK * Math.exp(
        -Math.pow(ratio - 1, 2) / (2 * Math.pow(FIGHT_DRAW_SIGMA, 2))
    );

    // Sigmoide: probabilidad de ganar crece suavemente con el ratio
    const winProb = (1 - drawProb) * sigmoid(FIGHT_SIGMOID_K * (ratio - 1));

    // Lo que queda es perder
    const loseProb = 1 - winProb - drawProb;

    return rollProbability([
        { chance: winProb, result: FIGHT_RESULT.WIN },
        { chance: drawProb, result: FIGHT_RESULT.DRAW },
        { chance: loseProb, result: FIGHT_RESULT.LOSE },
    ]);
}

// --- Sistema de huida ---

/**
 * Resuelve un intento de huida.
 * @returns {string} FLEE_RESULT
 */
export function flee() {
    return rollProbability([
        { chance: 0.45, result: FLEE_RESULT.ESCAPE },
        { chance: 0.30, result: FLEE_RESULT.CAUGHT },
        { chance: 0.20, result: FLEE_RESULT.FORCED_FIGHT },
        { chance: 0.05, result: FLEE_RESULT.KILLED },
    ]);
}

// --- Sistema de soborno ---

/**
 * Resuelve un intento de soborno usando funciones continuas.
 *
 * Modelo matemático:
 *   P(aceptar)  = ACCEPT_MAX × σ(kAccept × (gold - centerAccept))
 *   P(insultar) = INSULT_MAX × σ(-kInsult × (gold - centerInsult))
 *   P(rechazar) = 1 - P(aceptar) - P(insultar)
 *
 * Cada moneda extra siempre mejora la probabilidad de aceptación
 * y reduce la de insulto.
 *
 * @param {number} goldOffered - Cantidad de oro ofrecida
 * @returns {string} BRIBE_RESULT
 */
export function bribe(goldOffered) {
    // Sigmoide creciente: más oro → más probabilidad de aceptar
    const acceptProb = BRIBE_ACCEPT_MAX * sigmoid(
        BRIBE_ACCEPT_K * (goldOffered - BRIBE_ACCEPT_CENTER)
    );

    // Sigmoide decreciente: más oro → menos probabilidad de insulto
    const insultProb = BRIBE_INSULT_MAX * sigmoid(
        -BRIBE_INSULT_K * (goldOffered - BRIBE_INSULT_CENTER)
    );

    // Rechazar es el residuo, con clamp de seguridad
    const rejectProb = clamp(1 - acceptProb - insultProb, 0, 1);

    return rollProbability([
        { chance: acceptProb, result: BRIBE_RESULT.ACCEPT },
        { chance: rejectProb, result: BRIBE_RESULT.REJECT },
        { chance: insultProb, result: BRIBE_RESULT.INSULT },
    ]);
}
