// ===========================================
// leaderboard.js - Gestión de puntajes y salón de honor
// ===========================================

import { db } from './firebase.js';

/**
 * Guarda un puntaje en la base de datos.
 * @param {object} scoreData - Datos del puntaje (de calculateScore())
 * @param {string} pseudonym - Seudónimo del jugador
 * @param {string|null} userId - UID del usuario (null para anónimos)
 * @param {string} ending - Tipo de final (victory, coward, death_with_princess, death_without_princess)
 * @returns {Promise<{success: boolean, error: object|null}>}
 */
export async function submitScore(scoreData, pseudonym, userId, ending) {
    try {
        await db.collection('scores').add({
            userId: userId || null,
            pseudonym: pseudonym || 'Anónimo',
            score: scoreData.score,
            title: scoreData.title,
            totalGold: scoreData.totalGold,
            totalKillValue: scoreData.totalKillValue,
            hasPrincess: scoreData.hasPrincess,
            killsCount: scoreData.kills.length,
            ending: ending,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, error: null };
    } catch (error) {
        console.error('Error guardando puntaje:', error);
        return { success: false, error };
    }
}

/**
 * Obtiene los mejores puntajes según un periodo de tiempo.
 * @param {'today'|'week'|'alltime'} period - Periodo a consultar
 * @param {number} limit - Cantidad máxima de resultados (default 20)
 * @returns {Promise<{scores: Array, error: object|null}>}
 */
export async function getTopScores(period = 'alltime', limit = 20) {
    try {
        let query = db.collection('scores');

        if (period === 'alltime') {
            // Sin filtro de fecha: podemos ordenar directamente por score
            query = query.orderBy('score', 'desc').limit(limit);
        } else {
            // Con filtro de fecha: Firestore requiere que el primer orderBy
            // sea sobre el campo del filtro de desigualdad (createdAt).
            // Obtenemos los docs filtrados por fecha y ordenamos client-side.
            let dateFilter;
            if (period === 'today') {
                dateFilter = new Date();
                dateFilter.setHours(0, 0, 0, 0);
            } else {
                // 'week'
                dateFilter = new Date();
                dateFilter.setDate(dateFilter.getDate() - 7);
                dateFilter.setHours(0, 0, 0, 0);
            }
            query = query
                .where('createdAt', '>=', dateFilter)
                .orderBy('createdAt', 'desc');
        }

        const snapshot = await query.get();
        let scores = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                pseudonym: data.pseudonym,
                score: data.score,
                title: data.title,
                has_princess: data.hasPrincess,
                ending: data.ending,
                created_at: data.createdAt?.toDate?.() || null,
            };
        });

        // Para queries filtradas por periodo, ordenar por score client-side
        if (period !== 'alltime') {
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, limit);
        }

        return { scores, error: null };
    } catch (error) {
        console.error('Error obteniendo puntajes:', error);
        return { scores: [], error };
    }
}

/**
 * Verifica si un puntaje está en el top N de un periodo.
 * @param {number} score - Puntaje a verificar
 * @param {'today'|'week'|'alltime'} period
 * @param {number} topN - Posición máxima (default 10)
 * @returns {Promise<{isTop: boolean, position: number|null}>}
 */
export async function checkIfTopScore(score, period = 'alltime', topN = 10) {
    const { scores } = await getTopScores(period, topN);

    if (scores.length < topN) {
        return { isTop: true, position: scores.length + 1 };
    }

    const lowestTopScore = scores[scores.length - 1]?.score || 0;
    if (score > lowestTopScore) {
        // Encontrar la posición
        const position = scores.findIndex(s => score > s.score) + 1;
        return { isTop: true, position };
    }

    return { isTop: false, position: null };
}
