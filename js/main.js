// ===========================================
// main.js - Punto de entrada y controlador principal
// ===========================================

import { initGame, getState, addLog, movePlayer, playerFight, playerFlee, playerBribe, useItem, enterTile, calculateScore, GameState } from './game.js';
import { initUI, renderStartScreen, refreshUI, renderEndScreen } from './ui.js';

// --- Callbacks para la UI ---
const callbacks = {
    onMove: handleMove,
    onFight: handleFight,
    onFlee: handleFlee,
    onBribe: handleBribe,
    onUseItem: handleUseItem,
    onRefresh: () => refreshUI(callbacks),
};

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    renderStartScreen(startGame);
});

function startGame() {
    initGame();
    addLog('🌲 Te adentras en un bosque oscuro y misterioso. Criaturas peligrosas acechan entre las sombras.', 'intro');
    addLog('🧭 Usa los botones de dirección para explorar. Tu objetivo: encontrar y rescatar a la princesa.', 'intro');

    refreshUI(callbacks);
}

// --- Transición de fin de juego ---

/**
 * Muestra la UI actualizada con el último mensaje narrativo y un botón
 * "Ver resultado" en el panel de acciones, para que el jugador pueda
 * leer la crónica antes de ver la pantalla final.
 */
function showGameOverTransition(scoreData, ending, deathInfo = {}) {
    refreshUI(callbacks);

    const actionsPanel = document.getElementById('actions');
    actionsPanel.innerHTML = `
        <div class="action-group">
            <h4>📜 Lee la crónica antes de continuar...</h4>
            <button class="btn-action btn-confirm" id="btn-show-result">🏁 Ver resultado final</button>
        </div>`;

    document.getElementById('btn-show-result').addEventListener('click', () => {
        renderEndScreen(scoreData, ending, deathInfo);
    });
}

// --- Handlers ---

function handleMove(direction) {
    const result = movePlayer(direction);

    if (result.gameOver) {
        const scoreData = calculateScore();
        showGameOverTransition(scoreData, result.ending);
        return;
    }

    if (result.encounter) {
        // Nuevo encuentro: la UI se actualiza para mostrar opciones de combate
    }

    refreshUI(callbacks);
}

function handleFight(energy) {
    const result = playerFight(energy);

    if (result.result === 'death') {
        const scoreData = calculateScore();
        showGameOverTransition(scoreData, result.ending, result);
        return;
    }

    refreshUI(callbacks);
}

function handleFlee() {
    const result = playerFlee();

    if (result.result === 'death') {
        const scoreData = calculateScore();
        showGameOverTransition(scoreData, result.ending, result);
        return;
    }

    if (result.result === 'escape' && result.newPos) {
        // Mover a nueva casilla y encontrar nuevo enemigo
        const enterResult = enterTile(result.newPos);

        if (enterResult.gameOver) {
            const scoreData = calculateScore();
            showGameOverTransition(scoreData, enterResult.ending);
            return;
        }
    }

    refreshUI(callbacks);
}

function handleBribe(gold) {
    const result = playerBribe(gold);

    refreshUI(callbacks);
}

function handleUseItem(itemIndex) {
    const result = useItem(itemIndex);

    if (result.result === 'death') {
        const scoreData = calculateScore();
        showGameOverTransition(scoreData, result.ending, result);
        return;
    }

    if (result.result === 'teleport' && result.newPos) {
        const enterResult = enterTile(result.newPos);
        if (enterResult.gameOver) {
            const scoreData = calculateScore();
            showGameOverTransition(scoreData, enterResult.ending);
            return;
        }
    }

    refreshUI(callbacks);
}

// --- Atajos de teclado ---
document.addEventListener('keydown', (e) => {
    const state = getState();
    if (!state || state.phase === GameState.PHASE.GAME_OVER || state.phase === GameState.PHASE.START_SCREEN) return;

    if (state.phase === GameState.PHASE.EXPLORING) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                handleMove('norte');
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                handleMove('sur');
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                handleMove('oeste');
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                handleMove('este');
                break;
        }
    }
});
