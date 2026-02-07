// ===========================================
// game.js - Estado del juego, loop principal
// ===========================================

import { generateMap, isMovingOutOfMap, isMovingIntoSwamp, getNewPosition, getRandomAdjacentPosition, getRandomPosition, getAdjacentTiles } from './map.js';
import { fight, flee, bribe, FIGHT_RESULT, FLEE_RESULT, BRIBE_RESULT } from './combat.js';
import { rollHiddenTreasure } from './entities.js';

// --- Estado global del juego ---
export const GameState = {
    // Fases del juego
    PHASE: {
        START_SCREEN: 'start_screen',
        EXPLORING: 'exploring',       // Eligiendo dirección
        ENCOUNTER: 'encounter',       // Encuentro con enemigo, eligiendo acción
        FIGHT_INPUT: 'fight_input',   // Pidiendo cuánta energía usar
        BRIBE_INPUT: 'bribe_input',   // Pidiendo cuánto oro ofrecer
        FORCED_FIGHT: 'forced_fight', // Forzado a pelear (tras correr/insulto)
        FORCED_FIGHT_INPUT: 'forced_fight_input', // Input de energía en pelea forzada
        GAME_OVER: 'game_over',       // Fin del juego
    }
};

let state = null;

/**
 * Inicializa un nuevo juego.
 */
export function initGame() {
    const { grid, playerStart, princessPos } = generateMap();

    state = {
        phase: GameState.PHASE.EXPLORING,
        player: {
            row: playerStart.row,
            col: playerStart.col,
            energy: 1000,
            gold: 0,
            hasPrincess: false,
            inventory: [],      // Tesoros escondidos
            kills: [],          // { enemy, treasure } de criaturas matadas
        },
        map: {
            grid,
            princessPos,
        },
        encounter: null,        // Encuentro activo
        bribeLostGold: 0,       // Oro perdido en sobornos fallidos con enemigo actual
        log: [],                // Historial de narrativa
    };

    // Marcar la casilla de inicio como visitada y despejada
    // (el héroe apareció aquí sin encontrar enemigos)
    const startTile = state.map.grid[playerStart.row][playerStart.col];
    startTile.visited = true;
    startTile.cleared = true;

    return state;
}

/**
 * Obtiene el estado actual.
 */
export function getState() {
    return state;
}

/**
 * Agrega un mensaje al log narrativo.
 */
export function addLog(message, type = 'normal') {
    state.log.push({ message, type, timestamp: Date.now() });
}

/**
 * Obtiene la casilla actual del jugador.
 */
export function getCurrentTile() {
    return state.map.grid[state.player.row][state.player.col];
}

// ===========================
// MOVIMIENTO
// ===========================

/**
 * Intenta mover al jugador en una dirección.
 * @returns {object} { success, reason, encounter }
 */
export function movePlayer(direction) {
    const pos = { row: state.player.row, col: state.player.col };

    // Verificar si se sale del mapa
    if (isMovingOutOfMap(pos, direction)) {
        return handleExitMap();
    }

    // Verificar si es pantano
    if (isMovingIntoSwamp(pos, direction, state.map.grid)) {
        addLog('🟤 Un pantano denso e intransitable te bloquea el camino. Debes buscar otra ruta.', 'info');
        return { success: false, reason: 'swamp' };
    }

    const newPos = getNewPosition(pos, direction);
    return enterTile(newPos);
}

/**
 * Entra a una casilla (por movimiento o huida).
 */
export function enterTile(newPos) {
    state.player.row = newPos.row;
    state.player.col = newPos.col;

    const tile = state.map.grid[newPos.row][newPos.col];
    tile.visited = true;

    // Reset sobornos perdidos para nuevo encuentro
    state.bribeLostGold = 0;

    if (tile.cleared) {
        addLog('Esta zona ya está despejada. Puedes moverte libremente.', 'info');
        state.phase = GameState.PHASE.EXPLORING;
        return { success: true, encounter: false };
    }

    // Encuentro con enemigo
    const enemy = tile.enemy;

    if (enemy.tier === 0) {
        // Ratón: saqueo automático
        return handleMouseEncounter(tile);
    }

    // Encuentro normal
    state.encounter = { tile, enemy };
    state.phase = GameState.PHASE.ENCOUNTER;

    let encounterMsg = enemy.treasure
        ? `Un ${enemy.fullName} tiene en su poder ${enemy.treasure.name}. Su fuerza es de ${enemy.totalStrength}.`
        : `Un ${enemy.fullName} te bloquea el camino. Su fuerza es de ${enemy.totalStrength}.`;

    if (enemy.pet) {
        encounterMsg += ` Tiene como mascota a un ${enemy.pet.fullName}.`;
    }
    if (enemy.isPrincessCaptor) {
        encounterMsg += ' ¡Tiene a la princesa cautiva!';
    }

    addLog(encounterMsg, 'encounter');

    return { success: true, encounter: true };
}

/**
 * Manejo del ratón (saqueo automático).
 */
function handleMouseEncounter(tile) {
    const enemy = tile.enemy;
    const treasure = enemy.treasure;

    state.player.gold += treasure.value;
    state.player.kills.push({
        enemy: { ...enemy },
        treasureValue: treasure.value,
    });
    tile.cleared = true;
    tile.enemy.defeated = true;

    addLog(
        `🐭 Encuentras un pequeño ratón indefenso. Tomas sus pertenencias libremente ` +
        `(${treasure.emoji} ${treasure.name}, ${treasure.value} monedas). ¡Eres un abusador!`,
        'mouse'
    );

    // Tirar por tesoro escondido
    const hidden = rollHiddenTreasure();
    if (hidden) {
        state.player.inventory.push(hidden);
        addLog(
            `¡Sorpresa! Entre las pertenencias del ratón encuentras: ${hidden.emoji} ${hidden.name} - ${hidden.description}`,
            'hidden_treasure'
        );
    }

    state.phase = GameState.PHASE.EXPLORING;
    return { success: true, encounter: false };
}

/**
 * Manejo de salir del mapa.
 */
function handleExitMap() {
    if (state.player.hasPrincess) {
        // Victoria heroica
        state.phase = GameState.PHASE.GAME_OVER;
        addLog(
            '🏆 ¡Sales del bosque con la princesa a salvo! ' +
            'Las criaturas que mataste son muestra de tu valor, ' +
            'y las riquezas que arrebataste son tu recompensa. ¡Victoria!',
            'victory'
        );
        return { success: true, gameOver: true, ending: 'victory' };
    } else {
        // Cobarde
        state.phase = GameState.PHASE.GAME_OVER;
        addLog(
            '🐔 Sales del bosque sin la princesa. ¡Eres un cobarde! ' +
            'La princesa es devorada por el dragón del hechicero. ' +
            'Te expulsan del reino entre abucheos.',
            'coward'
        );
        return { success: true, gameOver: true, ending: 'coward' };
    }
}

// ===========================
// COMBATE
// ===========================

/**
 * El jugador decide pelear e indica cuánta energía usar.
 */
export function playerFight(energyToSpend) {
    const { enemy } = state.encounter;

    // Si no tiene energía, muerte automática
    if (state.player.energy <= 0) {
        addLog(
            `⚔️ Sin energía para luchar, ${enemy.fullName} te despacha sin piedad.`,
            'combat_draw'
        );
        return handleDeath('combat');
    }

    // Validar energía
    energyToSpend = Math.min(energyToSpend, state.player.energy);
    energyToSpend = Math.max(1, Math.floor(energyToSpend));

    // Gastar energía siempre
    state.player.energy -= energyToSpend;

    const result = fight(energyToSpend, enemy.totalStrength);

    if (result === FIGHT_RESULT.WIN) {
        return handleFightWin();
    } else if (result === FIGHT_RESULT.DRAW) {
        addLog(
            `⚔️ Inviertes ${energyToSpend} de energía en el combate contra ${enemy.fullName} ` +
            `(fuerza: ${enemy.totalStrength}). El combate es parejo y ninguno cede. ` +
            `Pierdes la energía invertida. Te quedan ${state.player.energy} unidades.`,
            'combat_draw'
        );
        state.phase = GameState.PHASE.ENCOUNTER;
        return { result: 'draw', energySpent: energyToSpend };
    } else {
        return handleDeath('combat');
    }
}

/**
 * Maneja la victoria en combate.
 */
function handleFightWin() {
    const { tile, enemy } = state.encounter;
    const treasure = enemy.treasure;
    const treasureValue = treasure ? treasure.value : 0;

    // Obtener tesoro
    if (treasureValue > 0) {
        state.player.gold += treasureValue;
    }

    // Recuperar oro perdido en sobornos fallidos
    const recoveredGold = state.bribeLostGold;
    if (recoveredGold > 0) {
        state.player.gold += recoveredGold;
    }

    // Registrar la muerte
    state.player.kills.push({
        enemy: { ...enemy },
        treasureValue,
    });

    tile.cleared = true;
    tile.enemy.defeated = true;

    let logMsg = treasure
        ? `⚔️ ¡Victoria! Derrotas a ${enemy.fullName}. Obtienes ${treasure.emoji} ${treasure.name} (${treasure.value} monedas).`
        : `⚔️ ¡Victoria! Derrotas a ${enemy.fullName}.`;
    if (recoveredGold > 0) {
        logMsg += ` Recuperas ${recoveredGold} monedas de sobornos fallidos.`;
    }

    addLog(logMsg, 'combat_win');

    // Tirar por tesoro escondido
    const hidden = rollHiddenTreasure();
    if (hidden) {
        state.player.inventory.push(hidden);
        addLog(
            `🎁 ¡Tesoro escondido! Entre los restos encuentras: ${hidden.emoji} ${hidden.name} - ${hidden.description}`,
            'hidden_treasure'
        );
    }

    // Princesa rescatada
    if (enemy.isPrincessCaptor) {
        state.player.hasPrincess = true;
        addLog(
            '👸 ¡Has rescatado a la princesa! Ahora debes sacarla del bosque. ' +
            'Dirígete a cualquier borde del mapa para escapar.',
            'princess_rescued'
        );
    }

    state.encounter = null;
    state.bribeLostGold = 0;
    state.phase = GameState.PHASE.EXPLORING;

    return { result: 'win' };
}

/**
 * Maneja la muerte del jugador.
 */
function handleDeath(cause) {
    state.phase = GameState.PHASE.GAME_OVER;

    let deathMsg;
    if (cause === 'flee') {
        deathMsg = `💀 Intentas correr pero ${state.encounter.enemy.fullName} te alcanza y te da muerte.`;
    } else if (cause === 'pill') {
        deathMsg = '💊💥 Usas la píldora explosiva. Una explosión ensordecedora sacude el bosque. No queda nada de ti.';
    } else {
        deathMsg = `💀 ${state.encounter.enemy.fullName} te derrota en combate.`;
    }

    if (state.player.hasPrincess) {
        deathMsg += ' La princesa, que iba contigo, también muere.';
    } else {
        deathMsg += ' El hechicero, con una sonrisa siniestra, le sirve la princesa en bandeja de plata a su dragón. La bestia la engulle de un solo bocado y eructa satisfecha. ¡Buen provecho!';
    }

    addLog(deathMsg, 'death');

    const enemyName = state.encounter ? state.encounter.enemy.fullName : 'el bosque';
    return {
        result: 'death',
        ending: state.player.hasPrincess ? 'death_with_princess' : 'death_without_princess',
        deathCause: cause,
        killedBy: enemyName,
    };
}

// ===========================
// HUIDA
// ===========================

/**
 * El jugador intenta correr.
 */
export function playerFlee() {
    const result = flee();
    const { enemy } = state.encounter;

    if (result === FLEE_RESULT.ESCAPE) {
        // Escapar a casilla adyacente
        const pos = { row: state.player.row, col: state.player.col };
        const adjPos = getRandomAdjacentPosition(pos, state.map.grid);

        if (adjPos) {
            addLog(
                `🏃 ¡Logras escapar del ${enemy.fullName}! Corres hacia el ${adjPos.direction}.`,
                'flee_escape'
            );
            // Perder lo invertido en sobornos
            state.bribeLostGold = 0;
            state.encounter = null;
            return { result: 'escape', newPos: adjPos };
        } else {
            // No hay casilla adyacente (imposible en 11x11 pero por seguridad)
            addLog('🏃 Intentas correr pero no hay a dónde ir.', 'flee_fail');
            state.phase = GameState.PHASE.ENCOUNTER;
            return { result: 'caught' };
        }
    } else if (result === FLEE_RESULT.CAUGHT) {
        addLog(
            `🏃 Intentas correr pero ${enemy.fullName} te alcanza y te bloquea el paso. ` +
            `Debes decidir qué hacer.`,
            'flee_caught'
        );
        state.phase = GameState.PHASE.ENCOUNTER;
        return { result: 'caught' };
    } else if (result === FLEE_RESULT.FORCED_FIGHT) {
        addLog(
            `🏃 ¡${enemy.fullName} te agarra del cuello cuando intentabas correr! ` +
            `Te obliga a pelear. No hay escapatoria.`,
            'flee_forced'
        );
        state.phase = GameState.PHASE.FORCED_FIGHT;
        return { result: 'forced_fight' };
    } else {
        // KILLED
        return handleDeath('flee');
    }
}

// ===========================
// SOBORNO
// ===========================

/**
 * El jugador intenta sobornar al enemigo.
 */
export function playerBribe(goldToOffer) {
    const { enemy } = state.encounter;

    // Validar oro
    goldToOffer = Math.min(goldToOffer, state.player.gold);
    goldToOffer = Math.max(0, Math.floor(goldToOffer));

    // Pagar el oro
    state.player.gold -= goldToOffer;

    const result = bribe(goldToOffer);

    if (result === BRIBE_RESULT.ACCEPT) {
        const { tile } = state.encounter;
        tile.cleared = true;

        addLog(
            `💰 Ofreces ${goldToOffer} monedas de oro a ${enemy.fullName}. ` +
            `La criatura acepta tu oferta y te deja pasar en paz.`,
            'bribe_accept'
        );

        // Princesa rescatada por soborno
        if (enemy.isPrincessCaptor) {
            state.player.hasPrincess = true;
            addLog(
                '👸 ¡El hechicero libera a la princesa como parte del trato! ' +
                'Ahora debes sacarla del bosque.',
                'princess_rescued'
            );
        }

        state.encounter = null;
        state.bribeLostGold = 0;
        state.phase = GameState.PHASE.EXPLORING;
        return { result: 'accept' };

    } else if (result === BRIBE_RESULT.REJECT) {
        state.bribeLostGold += goldToOffer;
        addLog(
            `💰 Ofreces ${goldToOffer} monedas a ${enemy.fullName}. ` +
            `La criatura toma tus monedas pero rechaza tu oferta con desdén. ` +
            `"No es suficiente", gruñe. Debes decidir qué hacer.`,
            'bribe_reject'
        );
        state.phase = GameState.PHASE.ENCOUNTER;
        return { result: 'reject', goldLost: goldToOffer };

    } else {
        // INSULT
        state.bribeLostGold += goldToOffer;
        addLog(
            `💰 Ofreces ${goldToOffer} monedas a ${enemy.fullName}. ` +
            `¡La criatura se siente insultada por tu miserable oferta! ` +
            `Se queda con tu oro y te obliga a pelear.`,
            'bribe_insult'
        );
        state.phase = GameState.PHASE.FORCED_FIGHT;
        return { result: 'insult', goldLost: goldToOffer };
    }
}

// ===========================
// USAR OBJETOS DEL INVENTARIO
// ===========================

/**
 * El jugador usa un objeto del inventario.
 */
export function useItem(itemIndex) {
    const item = state.player.inventory[itemIndex];
    if (!item) return { result: 'invalid' };

    // Remover del inventario
    state.player.inventory.splice(itemIndex, 1);

    const { enemy, tile } = state.encounter || {};

    switch (item.effect) {
        case 'instant_kill': {
            // Anillo del poder: mata a cualquier enemigo
            if (!state.encounter) {
                addLog('No hay enemigo al que usar el Anillo del poder.', 'error');
                state.player.inventory.push(item); // devolver
                return { result: 'invalid' };
            }
            addLog(
                `💍 ¡Usas el Anillo del poder! Un resplandor dorado envuelve a ` +
                `${enemy.fullName}. La criatura se desintegra al instante.`,
                'item_use'
            );
            return handleFightWin();
        }

        case 'dragon_kill': {
            // Espada del maestro de dragones: solo contra dragones
            if (!state.encounter) {
                addLog('No hay enemigo al que usar la Espada.', 'error');
                state.player.inventory.push(item);
                return { result: 'invalid' };
            }
            const hasDragon = enemy.tier === 90 ||
                (enemy.pet && enemy.pet.strength === 90);
            if (!hasDragon) {
                addLog(
                    `⚔️ Levantas la Espada del maestro de dragones, pero ` +
                    `${enemy.fullName} no es un dragón. La hoja permanece apagada... ` +
                    `la espada se desmorona en tus manos. Has desperdiciado un arma legendaria.`,
                    'item_use'
                );
                // No mata al enemigo; el item ya fue consumido (un solo uso)
                return { result: 'wasted' };
            }
            addLog(
                `⚔️ ¡Desenvainas la Espada del maestro de dragones! La hoja brilla con fuego azul. ` +
                `${enemy.fullName} cae fulminado ante el poder ancestral de la espada.`,
                'item_use'
            );
            return handleFightWin();
        }

        case 'teleport': {
            // Alas de murciélago: teletransporte aleatorio
            const newPos = getRandomPosition(state.map.grid);
            addLog(
                `🦇 ¡Usas las Alas de murciélago! Unas alas oscuras brotan de tu espalda ` +
                `y te elevan por encima de los árboles. Aterrizas en otro lugar del bosque.`,
                'item_use'
            );
            state.encounter = null;
            state.bribeLostGold = 0;
            return { result: 'teleport', newPos };
        }

        case 'self_destruct': {
            // Píldora explosiva: mueres
            return handleDeath('pill');
        }

        case 'full_heal': {
            // Elixir de la vida: restaurar toda la energía
            const energiaAnterior = state.player.energy;
            state.player.energy = 1000;
            addLog(
                `🧪 ¡Bebes el Elixir de la vida! Una energía cálida recorre todo tu cuerpo. ` +
                `Tu energía se restaura por completo (${energiaAnterior} → 1000).`,
                'item_use'
            );
            return { result: 'healed' };
        }

        default:
            return { result: 'invalid' };
    }
}

/**
 * Calcula el puntaje final.
 */
export function calculateScore() {
    const kills = state.player.kills;
    const totalGold = state.player.gold;
    const totalKillValue = kills.reduce((sum, k) => sum + k.enemy.totalStrength, 0);
    const totalTreasureValue = kills.reduce((sum, k) => sum + k.treasureValue, 0);

    let title;
    const score = totalGold + totalKillValue;

    if (score >= 1000) title = 'Leyenda Inmortal';
    else if (score >= 700) title = 'Héroe del Bosque';
    else if (score >= 400) title = 'Guerrero Valiente';
    else if (score >= 200) title = 'Cazador Experimentado';
    else if (score >= 100) title = 'Aventurero Novato';
    else title = 'Caminante Perdido';

    return {
        kills,
        totalGold,
        totalKillValue,
        totalTreasureValue,
        score,
        title,
        hasPrincess: state.player.hasPrincess,
        energy: state.player.energy,
    };
}
