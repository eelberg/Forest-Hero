// ===========================================
// map.js - Generación del mapa 11x11
// ===========================================

import { randInt, manhattanDistance, clamp, shuffle } from './utils.js';
import { createEnemy } from './entities.js';

const MAP_SIZE = 11;
const SWAMP_PERCENTAGE = 0.20;

/**
 * Genera el mapa completo del juego.
 * Retorna: { grid: 2D array de tiles, playerStart, princessPos }
 */
export function generateMap() {
    // 1. Posición aleatoria del jugador
    const playerStart = {
        row: randInt(0, MAP_SIZE - 1),
        col: randInt(0, MAP_SIZE - 1)
    };

    // 2. Posición de la princesa (al menos 5 casillas Manhattan del jugador)
    const princessPos = placePrincess(playerStart);

    // 3. Crear la cuadrícula con enemigos ponderados
    const grid = createGrid(playerStart, princessPos);

    // 4. Colocar pantanos (20%) asegurando camino entre jugador y princesa
    placeSwamps(grid, playerStart, princessPos);

    return { grid, playerStart, princessPos };
}

/**
 * Coloca a la princesa al menos a 5 casillas Manhattan del jugador.
 */
function placePrincess(playerPos) {
    let pos;
    let attempts = 0;
    do {
        pos = {
            row: randInt(0, MAP_SIZE - 1),
            col: randInt(0, MAP_SIZE - 1)
        };
        attempts++;
    } while (
        (manhattanDistance(playerPos, pos) < 5 ||
        (pos.row === playerPos.row && pos.col === playerPos.col)) &&
        attempts < 1000
    );
    return pos;
}

/**
 * Crea la cuadrícula 11x11 con enemigos distribuidos por peso.
 */
function createGrid(playerStart, princessPos) {
    const grid = [];

    // Calcular distancia máxima posible a la princesa
    const maxDist = calculateMaxDistance(princessPos);

    for (let row = 0; row < MAP_SIZE; row++) {
        grid[row] = [];
        for (let col = 0; col < MAP_SIZE; col++) {
            const pos = { row, col };
            const isPrincessTile = row === princessPos.row && col === princessPos.col;
            const isPlayerStart = row === playerStart.row && col === playerStart.col;

            let enemy;
            if (isPrincessTile) {
                // La casilla de la princesa: hechicero con dragón
                enemy = createEnemy(100, { isPrincessCaptor: true });
            } else {
                // Distribución ponderada por distancia a la princesa
                const dist = manhattanDistance(pos, princessPos);
                const tier = calculateEnemyTier(dist, maxDist);
                enemy = createEnemy(tier);
            }

            grid[row][col] = {
                row,
                col,
                enemy,
                visited: isPlayerStart,
                isPrincessTile,
                isPlayerStart,
                cleared: false,
                isSwamp: false,
            };
        }
    }

    return grid;
}

/**
 * Coloca pantanos en ~20% de las celdas, asegurando que existe
 * un camino transitable entre el jugador y la princesa (BFS).
 */
function placeSwamps(grid, playerStart, princessPos) {
    const totalCells = MAP_SIZE * MAP_SIZE;
    const targetSwamps = Math.floor(totalCells * SWAMP_PERCENTAGE);

    // Generar lista de candidatos (no jugador, no princesa)
    const candidates = [];
    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            if (r === playerStart.row && c === playerStart.col) continue;
            if (r === princessPos.row && c === princessPos.col) continue;
            candidates.push({ row: r, col: c });
        }
    }

    // Mezclar y colocar pantanos uno por uno, verificando conectividad
    shuffle(candidates);

    let placed = 0;
    for (const pos of candidates) {
        if (placed >= targetSwamps) break;

        // Marcar temporalmente como pantano
        grid[pos.row][pos.col].isSwamp = true;

        // Verificar que aún hay camino
        if (hasPath(grid, playerStart, princessPos)) {
            placed++;
        } else {
            // Revertir: este pantano bloquearía el camino
            grid[pos.row][pos.col].isSwamp = false;
        }
    }
}

/**
 * BFS: verifica si hay un camino transitable entre start y end.
 * Las celdas con isSwamp = true son intransitables.
 */
function hasPath(grid, start, end) {
    const visited = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(false));
    const queue = [start];
    visited[start.row][start.col] = true;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
        const cur = queue.shift();

        if (cur.row === end.row && cur.col === end.col) {
            return true;
        }

        for (const [dr, dc] of dirs) {
            const nr = cur.row + dr;
            const nc = cur.col + dc;

            if (nr >= 0 && nr < MAP_SIZE && nc >= 0 && nc < MAP_SIZE &&
                !visited[nr][nc] && !grid[nr][nc].isSwamp) {
                visited[nr][nc] = true;
                queue.push({ row: nr, col: nc });
            }
        }
    }

    return false;
}

/**
 * Calcula la distancia máxima desde la princesa a cualquier esquina.
 */
function calculateMaxDistance(princessPos) {
    const corners = [
        { row: 0, col: 0 },
        { row: 0, col: MAP_SIZE - 1 },
        { row: MAP_SIZE - 1, col: 0 },
        { row: MAP_SIZE - 1, col: MAP_SIZE - 1 }
    ];
    return Math.max(...corners.map(c => manhattanDistance(princessPos, c)));
}

/**
 * Calcula el tier del enemigo basado en distancia a la princesa.
 * Más cerca de la princesa = enemigos más fuertes.
 * Incluye algo de varianza aleatoria (+/-1 tier).
 */
function calculateEnemyTier(distance, maxDistance) {
    // Normalizar: 0 = junto a princesa, 1 = lo más lejos posible
    const normalizedDist = distance / maxDistance;

    // Invertir: cercano a princesa = alto tier
    const baseTier = Math.round((1 - normalizedDist) * 10);

    // Agregar varianza de +/- 1 tier
    const variance = randInt(-1, 1);
    const finalTier = clamp(baseTier + variance, 0, 10) * 10;

    return finalTier;
}

/**
 * Obtiene las casillas adyacentes válidas a una posición (no pantano).
 */
export function getAdjacentTiles(pos, grid) {
    const directions = [
        { row: -1, col: 0, name: 'norte' },
        { row: 1,  col: 0, name: 'sur' },
        { row: 0,  col: -1, name: 'oeste' },
        { row: 0,  col: 1,  name: 'este' },
    ];

    return directions
        .map(d => ({
            row: pos.row + d.row,
            col: pos.col + d.col,
            direction: d.name
        }))
        .filter(p => {
            if (p.row < 0 || p.row >= MAP_SIZE || p.col < 0 || p.col >= MAP_SIZE) return false;
            if (grid && grid[p.row][p.col].isSwamp) return false;
            return true;
        });
}

/**
 * Verifica si una posición está en el borde del mapa.
 */
export function isAtBorder(pos) {
    return pos.row === 0 || pos.row === MAP_SIZE - 1 ||
           pos.col === 0 || pos.col === MAP_SIZE - 1;
}

/**
 * Verifica si un movimiento llevaría fuera del mapa.
 */
export function isMovingOutOfMap(pos, direction) {
    const moves = {
        norte: { row: -1, col: 0 },
        sur:   { row: 1,  col: 0 },
        oeste: { row: 0,  col: -1 },
        este:  { row: 0,  col: 1 },
    };
    const move = moves[direction];
    if (!move) return false;

    const newRow = pos.row + move.row;
    const newCol = pos.col + move.col;

    return newRow < 0 || newRow >= MAP_SIZE || newCol < 0 || newCol >= MAP_SIZE;
}

/**
 * Verifica si la casilla destino es un pantano.
 */
export function isMovingIntoSwamp(pos, direction, grid) {
    const newPos = getNewPosition(pos, direction);
    if (newPos.row < 0 || newPos.row >= MAP_SIZE || newPos.col < 0 || newPos.col >= MAP_SIZE) {
        return false;
    }
    return grid[newPos.row][newPos.col].isSwamp;
}

/**
 * Calcula la nueva posición tras moverse en una dirección.
 */
export function getNewPosition(pos, direction) {
    const moves = {
        norte: { row: -1, col: 0 },
        sur:   { row: 1,  col: 0 },
        oeste: { row: 0,  col: -1 },
        este:  { row: 0,  col: 1 },
    };
    const move = moves[direction];
    return {
        row: pos.row + move.row,
        col: pos.col + move.col
    };
}

/**
 * Obtiene una casilla adyacente aleatoria que no sea pantano (para huir).
 */
export function getRandomAdjacentPosition(pos, grid) {
    const adjacent = getAdjacentTiles(pos, grid);
    const shuffled = shuffle([...adjacent]);
    return shuffled[0] || null;
}

/**
 * Obtiene una posición aleatoria en el mapa que no sea pantano (para teletransporte).
 */
export function getRandomPosition(grid) {
    let attempts = 0;
    let pos;
    do {
        pos = {
            row: randInt(0, MAP_SIZE - 1),
            col: randInt(0, MAP_SIZE - 1)
        };
        attempts++;
    } while (grid && grid[pos.row][pos.col].isSwamp && attempts < 200);
    return pos;
}

export { MAP_SIZE };
