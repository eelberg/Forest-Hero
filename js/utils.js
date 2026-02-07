// ===========================================
// utils.js - Funciones de utilidad y probabilidad
// ===========================================

/**
 * Genera un entero aleatorio entre min y max (inclusive).
 */
export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Elige un elemento aleatorio de un array.
 */
export function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Elige N elementos aleatorios sin repetir de un array.
 */
export function randSample(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

/**
 * Lanza un dado de probabilidad.
 * thresholds: array de { chance, result } ordenado.
 * Las chances deben sumar 1 (o ~1).
 * Ejemplo: [{ chance: 0.4, result: 'escape' }, { chance: 0.3, result: 'caught' }, ...]
 */
export function rollProbability(thresholds) {
    const roll = Math.random();
    let cumulative = 0;
    for (const t of thresholds) {
        cumulative += t.chance;
        if (roll < cumulative) {
            return t.result;
        }
    }
    // Fallback al ultimo resultado
    return thresholds[thresholds.length - 1].result;
}

/**
 * Calcula distancia Manhattan entre dos posiciones {row, col}.
 */
export function manhattanDistance(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/**
 * Mezcla un array in-place (Fisher-Yates shuffle).
 */
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Clamp: restringe un valor entre min y max.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Función sigmoide: transición suave entre 0 y 1.
 * σ(x) = 1 / (1 + e^(-x))
 */
export function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}
