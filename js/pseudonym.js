// ===========================================
// pseudonym.js - Generador de seudónimos nobiliarios
// ===========================================

import { db } from './firebase.js';

// Títulos nobiliarios (sin Rey/Reina)
const TITLES = [
    'Marqués', 'Marquesa',
    'Duque', 'Duquesa',
    'Conde', 'Condesa',
    'Vizconde', 'Vizcondesa',
    'Barón', 'Baronesa',
    'Príncipe', 'Princesa',
    'Archiduque', 'Archiduquesa',
    'Lord', 'Lady',
    'Señor', 'Señora',
    'Edecán',
    'Hidalgo', 'Hidalga',
    'Regente',
    'Cónsul',
];

// Lugares y accidentes geográficos
const PLACES = [
    'de las Montañas',
    'del Valle Oscuro',
    'de los Ríos Salvajes',
    'del Lago Encantado',
    'del Bosque Sombrío',
    'de los Volcanes',
    'de las Islas Perdidas',
    'de las Praderas',
    'de los Acantilados',
    'del Desierto',
    'de Timbuctú',
    'del Peñón',
    'de las Cavernas',
    'del Pantano',
    'de la Selva Profunda',
    'de las Colinas',
    'del Fiordo',
    'de la Meseta',
    'del Cañón',
    'de las Dunas',
    'del Glaciar',
    'de la Cascada',
    'del Arrecife',
    'de las Estepas',
    'del Oasis',
    'de la Bahía',
    'del Cabo Tormentoso',
    'de las Cumbres',
    'del Abismo',
    'de la Tundra',
    'de los Manglares',
    'del Páramo',
    'de la Sierra Nevada',
    'del Archipiélago',
    'de las Marismas',
    'del Peñasco',
    'de la Ciénaga',
    'del Desfiladero',
    'de las Llanuras',
    'del Risco',
];

/**
 * Genera un seudónimo aleatorio combinando título + lugar.
 * @returns {string} Ej: "Marqués de las Montañas"
 */
export function generateRandomPseudonym() {
    const title = TITLES[Math.floor(Math.random() * TITLES.length)];
    const place = PLACES[Math.floor(Math.random() * PLACES.length)];
    return `${title} ${place}`;
}

/**
 * Verifica si un seudónimo está disponible en la base de datos.
 * @param {string} pseudonym
 * @returns {Promise<boolean>} true si está disponible
 */
export async function checkPseudonymAvailable(pseudonym) {
    try {
        const snapshot = await db.collection('profiles')
            .where('pseudonym', '==', pseudonym)
            .limit(1)
            .get();

        return snapshot.empty; // Disponible si no hay resultados
    } catch (error) {
        console.error('Error verificando seudónimo:', error);
        return false;
    }
}

/**
 * Genera un seudónimo aleatorio que esté disponible.
 * Reintenta hasta encontrar uno libre (máx 10 intentos).
 * @returns {Promise<string>} Seudónimo disponible
 */
export async function suggestAvailablePseudonym() {
    for (let i = 0; i < 10; i++) {
        const pseudonym = generateRandomPseudonym();
        const available = await checkPseudonymAvailable(pseudonym);
        if (available) return pseudonym;
    }
    // Fallback: agregar un número aleatorio
    const pseudonym = generateRandomPseudonym();
    return `${pseudonym} ${Math.floor(Math.random() * 999) + 1}`;
}
