// ===========================================
// entities.js - Definiciones de enemigos, tesoros, adjetivos
// ===========================================

import { randSample, randChoice, randInt } from './utils.js';

// --- Tipos de enemigos ---
export const ENEMY_TYPES = [
    { strength: 0,   name: 'Ratón',     emoji: '🐭', description: 'Un pequeño ratón indefenso' },
    { strength: 10,  name: 'Sapo',      emoji: '🐸', description: 'Un sapo viscoso y repugnante' },
    { strength: 20,  name: 'Lagarto',   emoji: '🦎', description: 'Un lagarto de escamas afiladas' },
    { strength: 30,  name: 'Lobo',      emoji: '🐺', description: 'Un lobo de ojos brillantes' },
    { strength: 40,  name: 'Duende',    emoji: '👺', description: 'Un duende con una mueca perversa' },
    { strength: 50,  name: 'Brujo',     emoji: '🧙', description: 'Un brujo envuelto en humo negro' },
    { strength: 60,  name: 'Espectro',  emoji: '👻', description: 'Un espectro que flota entre las sombras' },
    { strength: 70,  name: 'Gólem',     emoji: '🗿', description: 'Un gólem de piedra viviente' },
    { strength: 80,  name: 'Ogro',      emoji: '👹', description: 'Un ogro de fuerza descomunal' },
    { strength: 90,  name: 'Dragón',    emoji: '🔥', description: 'Un dragón que exhala fuego infernal' },
    { strength: 100, name: 'Hechicero', emoji: '🧙‍♂️', description: 'Un hechicero de poder inconmensurable' },
];

// --- Adjetivos para enemigos (excepto ratón) ---
export const ADJECTIVES = [
    'Acechante', 'Hostil', 'Horrible', 'Siniestro', 'Corrupto',
    'Malvado', 'Amenazante', 'Pavoroso', 'Despiadado', 'Aterrador'
];

// --- Tesoros regulares ---
export const TREASURES = [
    { value: 10,  name: '10 monedas de oro',              emoji: '🪙' },
    { value: 20,  name: 'Una daga ritual',                 emoji: '🗡️' },
    { value: 30,  name: 'Un collar de colmillos benditos', emoji: '📿' },
    { value: 40,  name: 'Una bolsa de polvos invisibles',  emoji: '👝' },
    { value: 50,  name: 'Un caldero de cobre antiguo',     emoji: '🫕' },
    { value: 60,  name: 'Una gema de alma latente',        emoji: '💎' },
    { value: 70,  name: 'Un corazón de bosque petrificado', emoji: '🪨' },
    { value: 80,  name: 'Una escama de ogro dorada',       emoji: '✨' },
    { value: 90,  name: 'Un orbe de fuego eterno',         emoji: '🔮' },
    { value: 100, name: 'Un cofre del tesoro',             emoji: '💰' },
];

// --- Tesoros escondidos (10% de probabilidad al matar) ---
export const HIDDEN_TREASURES = [
    {
        id: 'anillo_poder',
        name: 'Anillo del poder',
        emoji: '💍',
        description: 'Mata a cualquier enemigo instantáneamente.',
        effect: 'instant_kill'
    },
    {
        id: 'espada_dragones',
        name: 'Espada del maestro de dragones',
        emoji: '⚔️',
        description: 'Mata a cualquier dragón instantáneamente.',
        effect: 'dragon_kill'
    },
    {
        id: 'alas_murcielago',
        name: 'Alas de murciélago',
        emoji: '🦇',
        description: 'Te teletransportan a otro lugar aleatorio del bosque.',
        effect: 'teleport'
    },
    {
        id: 'pildora_explosiva',
        name: 'Píldora explosiva',
        emoji: '💊',
        description: 'Si la usas... explotas y mueres.',
        effect: 'self_destruct'
    },
    {
        id: 'elixir_vida',
        name: 'Elixir de la vida',
        emoji: '🧪',
        description: 'Recuperas toda tu energía original (1000).',
        effect: 'full_heal'
    },
];

// --- Funciones de creación ---

/**
 * Obtiene el tipo base de enemigo por tier (0, 10, 20, ..., 100).
 */
export function getEnemyType(strength) {
    return ENEMY_TYPES.find(e => e.strength === strength) || ENEMY_TYPES[0];
}

/**
 * Crea un enemigo completo con adjetivos, mascota (si hechicero) y tesoro.
 * @param {number} tier - Fuerza base (0, 10, 20, ..., 100)
 * @param {object} options - { isPrincessCaptor: bool }
 */
export function createEnemy(tier, options = {}) {
    const type = getEnemyType(tier);
    const isMouse = tier === 0;
    const isSorcerer = tier === 100;

    // Adjetivos (2 aleatorios, excepto ratón)
    const adjectives = isMouse ? [] : randSample(ADJECTIVES, 2);

    // Nombre completo
    const fullName = isMouse
        ? type.name
        : `${type.name} ${adjectives.join(' y ')}`;

    // Mascota (solo hechiceros)
    let pet = null;
    let totalStrength = tier;

    if (options.isPrincessCaptor) {
        // La princesa siempre está con un hechicero + dragón
        const dragonType = getEnemyType(90);
        const petAdj = randSample(ADJECTIVES, 2);
        pet = {
            ...dragonType,
            adjectives: petAdj,
            fullName: `${dragonType.name} ${petAdj.join(' y ')}`
        };
        totalStrength = 100 + 90;
    } else if (isSorcerer && Math.random() < 0.5) {
        // 50% de probabilidad de tener mascota (no ratón ni hechicero)
        const petTiers = [10, 20, 30, 40, 50, 60, 70, 80, 90];
        const petTier = randChoice(petTiers);
        const petType = getEnemyType(petTier);
        const petAdj = randSample(ADJECTIVES, 2);
        pet = {
            ...petType,
            adjectives: petAdj,
            fullName: `${petType.name} ${petAdj.join(' y ')}`
        };
        totalStrength = 100 + petTier;
    }

    // Tesoro aleatorio (el captor de la princesa no tiene tesoro)
    const treasure = options.isPrincessCaptor ? null : randChoice(TREASURES);

    return {
        ...type,
        tier,
        adjectives,
        fullName,
        pet,
        totalStrength,
        treasure,
        isPrincessCaptor: options.isPrincessCaptor || false,
        defeated: false,
    };
}

/**
 * Lanza la tirada de tesoro escondido (10% de probabilidad).
 * Retorna un tesoro escondido o null.
 */
export function rollHiddenTreasure() {
    if (Math.random() < 0.10) {
        return { ...randChoice(HIDDEN_TREASURES) };
    }
    return null;
}
