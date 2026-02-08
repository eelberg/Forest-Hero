// ===========================================
// ui.js - Renderizado de la interfaz
// ===========================================

import { getState, addLog, GameState } from './game.js';
import { MAP_SIZE } from './map.js';
import { signUpWithEmail, signInWithEmail, signInWithGoogle, signOut, savePseudonym, getFullUserState } from './auth.js';
import { suggestAvailablePseudonym, checkPseudonymAvailable } from './pseudonym.js';
import { getTopScores, submitScore, checkIfTopScore, getUserBestScore } from './leaderboard.js';

// --- Colores por tier de enemigo ---
const TIER_COLORS = {
    0:   '#6aaa64',  // Verde claro (ratón)
    10:  '#7cb342',  // Verde
    20:  '#9e9d24',  // Amarillo verdoso
    30:  '#f9a825',  // Amarillo
    40:  '#ff8f00',  // Naranja
    50:  '#ef6c00',  // Naranja oscuro
    60:  '#d84315',  // Rojo naranja
    70:  '#c62828',  // Rojo
    80:  '#ad1457',  // Rojo oscuro
    90:  '#6a1b9a',  // Púrpura
    100: '#311b92',  // Púrpura oscuro
};

const TIER_BG_COLORS = {
    0:   '#e8f5e9',
    10:  '#f1f8e9',
    20:  '#f9fbe7',
    30:  '#fffde7',
    40:  '#fff8e1',
    50:  '#fff3e0',
    60:  '#fbe9e7',
    70:  '#ffebee',
    80:  '#fce4ec',
    90:  '#f3e5f5',
    100: '#ede7f6',
};

// --- Elementos del DOM ---
let elements = {};

/**
 * Inicializa las referencias a los elementos del DOM.
 */
export function initUI() {
    elements = {
        minimap: document.getElementById('minimap'),
        narrative: document.getElementById('narrative'),
        stats: document.getElementById('stats'),
        actions: document.getElementById('actions'),
        creatureDisplay: document.getElementById('creature-display'),
        killList: document.getElementById('kill-list'),
        inventoryPanel: document.getElementById('inventory-panel'),
        gameContainer: document.getElementById('game-container'),
        welcomeScreen: document.getElementById('welcome-screen'),
        startScreen: document.getElementById('start-screen'),
        endScreen: document.getElementById('end-screen'),
        helpScreen: document.getElementById('help-screen'),
        honorHallScreen: document.getElementById('honor-hall-screen'),
        btnHelp: document.getElementById('btn-help'),
    };

    // Renderizar contenido de ayuda e inicializar botón
    renderHelpScreen();
}

// ===========================
// MINI-MAPA 3x3
// ===========================

/**
 * Icono de bosque según nivel de riesgo (4 niveles).
 * Vegetación progresiva: más densa = más peligro.
 */
function getForestIcon(tier) {
    if (tier <= 30) return '🌾';      // Campo abierto / pasto
    if (tier <= 50) return '🌲';      // Bosque de pinos
    if (tier <= 80) return '🌳';      // Bosque denso
    return '🕳️';                      // Cueva / guarida oscura
}

/**
 * Clase CSS de fondo según nivel de riesgo (4 niveles).
 */
function getForestClass(tier) {
    if (tier <= 30) return 'forest-open';
    if (tier <= 50) return 'forest-plants';
    if (tier <= 80) return 'forest-shrubs';
    return 'forest-dense';
}

const VIEWPORT_RADIUS = 2; // 2 casillas en cada dirección = 5x5

/**
 * Renderiza el mapa 5x5 centrado en el jugador.
 */
export function renderMiniMap() {
    const state = getState();
    const { row, col } = state.player;
    const grid = state.map.grid;
    const size = VIEWPORT_RADIUS * 2 + 1; // 5

    let html = '<div class="minimap-grid">';

    for (let dr = -VIEWPORT_RADIUS; dr <= VIEWPORT_RADIUS; dr++) {
        for (let dc = -VIEWPORT_RADIUS; dc <= VIEWPORT_RADIUS; dc++) {
            const r = row + dr;
            const c = col + dc;

            if (dr === 0 && dc === 0) {
                // Centro: jugador
                html += `<div class="minimap-cell player-cell" title="Tú estás aquí">
                    <span class="cell-icon">${state.player.hasPrincess ? '🦸👸' : '🦸'}</span>
                </div>`;
            } else if (r < 0 || r >= MAP_SIZE || c < 0 || c >= MAP_SIZE) {
                // Fuera del mapa: salida
                html += `<div class="minimap-cell border-cell" title="Salida del bosque">
                    <span class="cell-icon">🌄</span>
                </div>`;
            } else {
                const tile = grid[r][c];

                if (tile.isSwamp) {
                    html += `<div class="minimap-cell swamp-cell" title="Pantano intransitable">
                        <span class="cell-icon">🟢</span>
                    </div>`;
                } else if (tile.cleared) {
                    html += `<div class="minimap-cell cleared-cell" title="Despejada">
                        <span class="cell-icon">✅</span>
                    </div>`;
                } else if (tile.visited) {
                    const tier = tile.enemy.tier;
                    const color = TIER_COLORS[tier] || '#666';
                    const bgColor = TIER_BG_COLORS[tier] || '#f5f5f5';
                    html += `<div class="minimap-cell visited-cell" style="border-color: ${color}; background: ${bgColor}" title="${tile.enemy.fullName}">
                        <span class="cell-icon">${tile.enemy.emoji}</span>
                    </div>`;
                } else {
                    // No visitada: icono de bosque según densidad/peligro
                    const tier = tile.enemy.tier;
                    const forestIcon = getForestIcon(tier);
                    const forestClass = getForestClass(tier);
                    html += `<div class="minimap-cell unknown-cell ${forestClass}" title="Bosque misterioso">
                        <span class="cell-icon">${forestIcon}</span>
                    </div>`;
                }
            }
        }
    }

    html += '</div>';
    elements.minimap.innerHTML = html;
}

// ===========================
// CRIATURA
// ===========================

/**
 * Renderiza la criatura del encuentro actual.
 */
export function renderCreature() {
    const state = getState();

    if (!state.encounter) {
        elements.creatureDisplay.innerHTML = `
            <div class="no-encounter">
                <span class="big-icon">🌲</span>
                <p>El bosque está tranquilo... por ahora.</p>
            </div>`;
        return;
    }

    const { enemy } = state.encounter;
    const tier = enemy.tier;
    const color = TIER_COLORS[tier] || '#666';

    let petHtml = '';
    if (enemy.pet) {
        const petColor = TIER_COLORS[enemy.pet.strength] || '#666';
        petHtml = `
            <div class="pet-display">
                <span class="pet-emoji">${enemy.pet.emoji}</span>
                <div class="pet-info">
                    <span class="pet-name" style="color: ${petColor}">Mascota: ${enemy.pet.fullName}</span>
                    <span class="pet-strength">Fuerza: ${enemy.pet.strength}</span>
                </div>
            </div>`;
    }

    let princessBadge = '';
    if (enemy.isPrincessCaptor) {
        princessBadge = '<div class="princess-badge">👸 ¡Tiene a la princesa!</div>';
    }

    elements.creatureDisplay.innerHTML = `
        <div class="creature-card" style="border-color: ${color}">
            <div class="creature-main">
                <span class="creature-emoji">${enemy.emoji}</span>
                <div class="creature-info">
                    <h3 class="creature-name" style="color: ${color}">${enemy.fullName}</h3>
                    <p class="creature-desc">${enemy.description}</p>
                    <div class="creature-stats">
                        <span class="stat-badge strength" style="background: ${color}">
                            ⚔️ Fuerza: ${enemy.totalStrength}
                        </span>
                        ${enemy.treasure ? `<span class="stat-badge treasure">
                            ${enemy.treasure.emoji} ${enemy.treasure.name}
                        </span>` : ''}
                    </div>
                </div>
            </div>
            ${petHtml}
            ${princessBadge}
        </div>`;
}

// ===========================
// NARRATIVA
// ===========================

/**
 * Renderiza el log narrativo.
 */
export function renderNarrative() {
    const state = getState();
    const log = state.log;

    // Solo mostrar los últimos 50 mensajes
    const recentLog = log.slice(-50);

    let html = '';
    for (const entry of recentLog) {
        const typeClass = `log-${entry.type}`;
        html += `<div class="log-entry ${typeClass}">${entry.message}</div>`;
    }

    elements.narrative.innerHTML = html;
    // Auto-scroll al fondo
    elements.narrative.scrollTop = elements.narrative.scrollHeight;
}

// ===========================
// STATS DEL JUGADOR
// ===========================

/**
 * Renderiza las estadísticas del jugador.
 */
export function renderStats() {
    const state = getState();
    const p = state.player;

    const energyPercent = (p.energy / 1000) * 100;
    let energyColor = '#4caf50';
    if (energyPercent < 20) energyColor = '#f44336';
    else if (energyPercent < 50) energyColor = '#ff9800';

    elements.stats.innerHTML = `
        <div class="stat-row pseudonym-row">
            <span class="stat-label">🛡️ Héroe</span>
            <span class="stat-value pseudonym-value">${p.pseudonym || 'Anónimo'}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">⚡ Energía</span>
            <div class="stat-bar">
                <div class="stat-bar-fill" style="width: ${energyPercent}%; background: ${energyColor}"></div>
            </div>
            <span class="stat-value">${p.energy} / 1000</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">🪙 Oro</span>
            <span class="stat-value gold-value">${p.gold}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">👸 Princesa</span>
            <span class="stat-value ${p.hasPrincess ? 'has-princess' : ''}">${p.hasPrincess ? '¡Rescatada!' : 'Cautiva'}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">💀 Derrotados</span>
            <span class="stat-value">${p.kills.length}</span>
        </div>
    `;
}

// ===========================
// INVENTARIO
// ===========================

/**
 * Renderiza el panel de inventario.
 */
export function renderInventory() {
    const state = getState();
    const inv = state.player.inventory;

    if (inv.length === 0) {
        elements.inventoryPanel.innerHTML = '<p class="empty-inventory">Inventario vacío</p>';
        return;
    }

    let html = '<h4>🎒 Inventario</h4><div class="inventory-items">';
    for (let i = 0; i < inv.length; i++) {
        const item = inv[i];
        html += `
            <div class="inventory-item" title="${item.description}">
                <span class="item-emoji">${item.emoji}</span>
                <span class="item-name">${item.name}</span>
            </div>`;
    }
    html += '</div>';
    elements.inventoryPanel.innerHTML = html;
}

// ===========================
// KILL LIST
// ===========================

/**
 * Renderiza la lista de criaturas matadas.
 */
export function renderKillList() {
    const state = getState();
    const kills = state.player.kills;

    if (kills.length === 0) {
        elements.killList.innerHTML = '<p class="empty-kills">Ninguna criatura derrotada</p>';
        return;
    }

    let html = '<h4>⚔️ Criaturas derrotadas</h4><div class="kill-items">';
    for (const kill of kills) {
        const color = TIER_COLORS[kill.enemy.tier] || '#666';
        html += `
            <div class="kill-item">
                <span class="kill-emoji">${kill.enemy.emoji}</span>
                <span class="kill-name" style="color: ${color}">${kill.enemy.fullName}</span>
                <span class="kill-gold">+${kill.treasureValue}🪙</span>
            </div>`;
    }
    html += '</div>';
    elements.killList.innerHTML = html;
}

// ===========================
// ACCIONES
// ===========================

/**
 * Renderiza los botones de acción según la fase del juego.
 * @param {object} callbacks - { onMove, onFight, onFlee, onBribe, onUseItem }
 */
export function renderActions(callbacks) {
    const state = getState();
    let html = '';

    if (state.phase === GameState.PHASE.EXPLORING) {
        html = renderMovementActions(callbacks);
    } else if (state.phase === GameState.PHASE.ENCOUNTER) {
        html = renderEncounterActions(callbacks);
    } else if (state.phase === GameState.PHASE.FORCED_FIGHT) {
        html = renderForcedFightActions(callbacks);
    } else if (state.phase === GameState.PHASE.FIGHT_INPUT) {
        html = renderFightInput(callbacks, false);
    } else if (state.phase === GameState.PHASE.FORCED_FIGHT_INPUT) {
        html = renderFightInput(callbacks, true);
    } else if (state.phase === GameState.PHASE.BRIBE_INPUT) {
        html = renderBribeInput(callbacks);
    }

    elements.actions.innerHTML = html;
    attachActionListeners(callbacks);
}

function renderMovementActions(callbacks) {
    const state = getState();
    const { row, col } = state.player;

    let html = '<div class="action-group"><h4>🧭 ¿Hacia dónde te diriges?</h4><div class="direction-grid">';

    // Norte
    html += `<div class="dir-spacer"></div>`;
    html += `<button class="btn-action btn-move" data-dir="norte">⬆️ Norte</button>`;
    html += `<div class="dir-spacer"></div>`;

    // Oeste, centro, Este
    html += `<button class="btn-action btn-move" data-dir="oeste">⬅️ Oeste</button>`;
    html += `<div class="dir-center">🦸</div>`;
    html += `<button class="btn-action btn-move" data-dir="este">➡️ Este</button>`;

    // Sur
    html += `<div class="dir-spacer"></div>`;
    html += `<button class="btn-action btn-move" data-dir="sur">⬇️ Sur</button>`;
    html += `<div class="dir-spacer"></div>`;

    html += '</div></div>';
    return html;
}

function renderEncounterActions(callbacks) {
    const state = getState();
    const inv = state.player.inventory;

    let html = '<div class="action-group"><h4>⚔️ ¿Qué haces?</h4><div class="encounter-actions">';

    if (state.player.energy > 0) {
        html += `<button class="btn-action btn-fight" data-action="fight">⚔️ Pelear</button>`;
    }
    html += `<button class="btn-action btn-flee" data-action="flee">🏃 Correr</button>`;

    if (state.player.gold > 0) {
        html += `<button class="btn-action btn-bribe" data-action="bribe">💰 Sobornar</button>`;
    }

    // Items del inventario
    for (let i = 0; i < inv.length; i++) {
        const item = inv[i];
        html += `<button class="btn-action btn-item" data-action="use-item" data-item-index="${i}">
            ${item.emoji} Usar ${item.name}
        </button>`;
    }

    html += '</div></div>';
    return html;
}

function renderForcedFightActions(callbacks) {
    const state = getState();
    let html = '<div class="action-group"><h4>⚔️ ¡Debes pelear!</h4><div class="encounter-actions">';

    if (state.player.energy > 0) {
        html += `<button class="btn-action btn-fight" data-action="forced-fight">⚔️ Pelear</button>`;
    } else {
        html += `<p style="color: var(--accent-red); margin: 0.5rem 0;">No te queda energía para pelear...</p>`;
        html += `<button class="btn-action btn-fight" data-action="forced-fight-no-energy" style="opacity:0.5">💀 Enfrentar tu destino</button>`;
    }

    // Aún puedes usar items
    const inv = state.player.inventory;
    for (let i = 0; i < inv.length; i++) {
        const item = inv[i];
        html += `<button class="btn-action btn-item" data-action="use-item" data-item-index="${i}">
            ${item.emoji} Usar ${item.name}
        </button>`;
    }

    html += '</div></div>';
    return html;
}

function renderFightInput(callbacks, isForced = false) {
    const state = getState();
    const enemy = state.encounter.enemy;

    // Escala: 0 a min(3× fuerza enemigo, energía del jugador)
    const maxSlider = Math.min(enemy.totalStrength * 3, state.player.energy);
    const defaultValue = Math.min(enemy.totalStrength, maxSlider);

    let html = `<div class="action-group"><h4>⚔️ ¿Cuánta energía usas?</h4>`;
    html += `<p class="input-hint">Fuerza del enemigo: ${enemy.totalStrength} | Tu energía: ${state.player.energy}</p>`;
    html += `<div class="input-row">`;
    html += `<input type="range" id="energy-slider" min="1" max="${maxSlider}" value="${defaultValue}" class="energy-slider">`;
    html += `<span id="energy-display" class="energy-display">${defaultValue}</span>`;
    html += `</div>`;
    html += `<div class="input-row">`;
    html += `<button class="btn-action btn-confirm" data-action="confirm-fight">⚔️ ¡A la batalla!</button>`;
    if (!isForced) {
        html += `<button class="btn-action btn-cancel" data-action="cancel-fight">↩️ Cancelar</button>`;
    }
    html += `</div></div>`;
    return html;
}

function renderBribeInput(callbacks) {
    const state = getState();

    // Escala: 0 a min(200, oro del jugador)
    const maxGoldSlider = Math.min(200, state.player.gold);
    const defaultGold = Math.min(50, maxGoldSlider);

    let html = `<div class="action-group"><h4>💰 ¿Cuántas monedas ofreces?</h4>`;
    html += `<p class="input-hint">Tu oro: ${state.player.gold} monedas</p>`;
    html += `<div class="input-row">`;
    html += `<input type="range" id="gold-slider" min="1" max="${maxGoldSlider}" value="${defaultGold}" class="gold-slider">`;
    html += `<span id="gold-display" class="gold-display">${defaultGold}</span>`;
    html += `</div>`;
    html += `<div class="input-row">`;
    html += `<button class="btn-action btn-confirm" data-action="confirm-bribe">💰 Ofrecer</button>`;
    html += `<button class="btn-action btn-cancel" data-action="cancel-bribe">↩️ Cancelar</button>`;
    html += `</div></div>`;
    return html;
}

/**
 * Adjunta event listeners a los botones de acción.
 */
function attachActionListeners(callbacks) {
    // Movimiento
    document.querySelectorAll('.btn-move').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onMove(btn.dataset.dir);
        });
    });

    // Pelear (normal)
    document.querySelectorAll('[data-action="fight"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = getState();
            state.phase = GameState.PHASE.FIGHT_INPUT;
            callbacks.onRefresh();
        });
    });

    // Pelear (forzado - sin opción de cancelar)
    document.querySelectorAll('[data-action="forced-fight"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = getState();
            state.phase = GameState.PHASE.FORCED_FIGHT_INPUT;
            callbacks.onRefresh();
        });
    });

    // Forzado sin energía - muerte segura
    document.querySelectorAll('[data-action="forced-fight-no-energy"]').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onFight(0);
        });
    });

    // Correr
    document.querySelectorAll('[data-action="flee"]').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onFlee();
        });
    });

    // Sobornar
    document.querySelectorAll('[data-action="bribe"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = getState();
            state.phase = GameState.PHASE.BRIBE_INPUT;
            callbacks.onRefresh();
        });
    });

    // Usar item
    document.querySelectorAll('[data-action="use-item"]').forEach(btn => {
        btn.addEventListener('click', () => {
            callbacks.onUseItem(parseInt(btn.dataset.itemIndex));
        });
    });

    // Confirmar pelea
    const confirmFight = document.querySelector('[data-action="confirm-fight"]');
    if (confirmFight) {
        confirmFight.addEventListener('click', () => {
            const slider = document.getElementById('energy-slider');
            callbacks.onFight(parseInt(slider.value));
        });
    }

    // Cancelar pelea
    const cancelFight = document.querySelector('[data-action="cancel-fight"]');
    if (cancelFight) {
        cancelFight.addEventListener('click', () => {
            const state = getState();
            state.phase = GameState.PHASE.ENCOUNTER;
            callbacks.onRefresh();
        });
    }

    // Confirmar soborno
    const confirmBribe = document.querySelector('[data-action="confirm-bribe"]');
    if (confirmBribe) {
        confirmBribe.addEventListener('click', () => {
            const slider = document.getElementById('gold-slider');
            callbacks.onBribe(parseInt(slider.value));
        });
    }

    // Cancelar soborno
    const cancelBribe = document.querySelector('[data-action="cancel-bribe"]');
    if (cancelBribe) {
        cancelBribe.addEventListener('click', () => {
            const state = getState();
            state.phase = GameState.PHASE.ENCOUNTER;
            callbacks.onRefresh();
        });
    }

    // Sliders
    const energySlider = document.getElementById('energy-slider');
    if (energySlider) {
        energySlider.addEventListener('input', () => {
            document.getElementById('energy-display').textContent = energySlider.value;
        });
    }

    const goldSlider = document.getElementById('gold-slider');
    if (goldSlider) {
        goldSlider.addEventListener('input', () => {
            document.getElementById('gold-display').textContent = goldSlider.value;
        });
    }
}

// ===========================
// PANTALLA DE FIN
// ===========================

/**
 * Muestra la pantalla de fin del juego.
 * @param {object} deathInfo - { deathCause, killedBy } opcional
 */
export async function renderEndScreen(scoreData, ending, deathInfo = {}, welcomeCallbacks = null) {
    let endingTitle, endingClass, endingEmoji, endingSubtitle = '';

    switch (ending) {
        case 'victory':
            endingTitle = '¡Victoria Heroica!';
            endingClass = 'ending-victory';
            endingEmoji = '🏆';
            break;
        case 'coward':
            endingTitle = 'Final del Cobarde';
            endingClass = 'ending-coward ending-feast';
            endingEmoji = '🐔';
            break;
        case 'death_with_princess':
            endingTitle = 'Muerte Trágica';
            endingClass = 'ending-death';
            endingEmoji = '💀👸';
            break;
        default:
            endingTitle = 'Fracaso';
            endingClass = 'ending-death ending-feast';
            endingEmoji = '💀';
    }

    // Subtítulo con causa de muerte
    if (deathInfo.deathCause && deathInfo.killedBy) {
        const causeTexts = {
            flee: `Intentaste huir del ${deathInfo.killedBy}, pero te alcanzó y te dio muerte.`,
            combat: `El ${deathInfo.killedBy} te derrotó en combate.`,
            pill: 'Usaste la píldora explosiva. No queda nada de ti.',
        };
        endingSubtitle = causeTexts[deathInfo.deathCause] || `El ${deathInfo.killedBy} acabó contigo.`;
    }

    let killsHtml = '';
    for (const kill of scoreData.kills) {
        const color = TIER_COLORS[kill.enemy.tier] || '#666';
        killsHtml += `
            <div class="end-kill-item">
                <span>${kill.enemy.emoji}</span>
                <span style="color: ${color}">${kill.enemy.fullName}</span>
                <span>Fuerza: ${kill.enemy.totalStrength}</span>
                <span>+${kill.treasureValue}🪙</span>
            </div>`;
    }

    if (scoreData.kills.length === 0) {
        killsHtml = '<p>No derrotaste a ninguna criatura.</p>';
    }

    // Imagen y texto especial según el final
    let sceneHtml = '';
    if (ending === 'death_without_princess') {
        sceneHtml = `
            <div class="feast-scene">
                <img src="img/dragon_feast.png" alt="El dragón devora a la princesa" class="feast-image">
                <p class="feast-text">El hechicero, con una sonrisa siniestra, le sirvió la princesa a su dragón. La bestia la engulló de un solo bocado y eructó satisfecha. ¡Buen provecho!</p>
            </div>`;
    } else if (ending === 'coward') {
        sceneHtml = `
            <div class="feast-scene">
                <img src="img/dragon_feast.png" alt="El dragón devora a la princesa" class="feast-image">
                <p class="feast-text">Tras tu cobarde huida, el hechicero le sirvió la princesa a su dragón. La bestia la engulló de un solo bocado y eructó satisfecha. Tu cobardía le costó la vida.</p>
            </div>`;
    } else if (ending === 'death_with_princess') {
        sceneHtml = `
            <div class="feast-scene">
                <img src="img/death_with_princess.png" alt="El héroe y la princesa yacen muertos en el bosque" class="feast-image">
                <p class="feast-text">El héroe y la princesa yacen juntos en el suelo del bosque. Las criaturas mágicas que lo habitan los rodean en silencio. Tan cerca de la libertad... y sin embargo, tan lejos.</p>
            </div>`;
    } else if (ending === 'victory') {
        sceneHtml = `
            <div class="feast-scene victory-scene">
                <img src="img/victory.png" alt="El rey ordena caballero al héroe" class="feast-image">
                <p class="feast-text">El rey, agradecido por el rescate de su hija, te ordena caballero con su espada ceremonial. La princesa observa con una sonrisa. Las monedas que conseguiste en el bosque son testimonio de tu valor.</p>
            </div>`;
    }

    elements.endScreen.innerHTML = `
        <div class="end-content ${endingClass}">
            <div class="end-emoji">${endingEmoji}</div>
            <h1 class="end-title">${endingTitle}</h1>
            ${endingSubtitle ? `<p class="end-subtitle">${endingSubtitle}</p>` : ''}
            <h2 class="end-score-title">${scoreData.title}</h2>
            ${sceneHtml}

            <div class="end-stats">
                <div class="end-stat">
                    <span class="end-stat-label">Puntaje Total</span>
                    <span class="end-stat-value">${scoreData.score}</span>
                </div>
                <div class="end-stat">
                    <span class="end-stat-label">Oro Acumulado</span>
                    <span class="end-stat-value">${scoreData.totalGold} 🪙</span>
                </div>
                <div class="end-stat">
                    <span class="end-stat-label">Criaturas Derrotadas</span>
                    <span class="end-stat-value">${scoreData.kills.length}</span>
                </div>
                <div class="end-stat">
                    <span class="end-stat-label">Valor de Combate</span>
                    <span class="end-stat-value">${scoreData.totalKillValue}</span>
                </div>
                <div class="end-stat">
                    <span class="end-stat-label">Energía Restante</span>
                    <span class="end-stat-value">${scoreData.energy}</span>
                </div>
            </div>

            <div class="end-kills">
                <h3>Criaturas Derrotadas</h3>
                ${killsHtml}
            </div>

            <div id="end-score-message" class="end-score-message"></div>
            <button class="btn-action btn-restart" id="btn-restart">🔄 Jugar de Nuevo</button>
        </div>`;

    elements.endScreen.classList.add('visible');
    elements.gameContainer.classList.add('game-over');

    // Guardar puntaje en la base de datos
    const state = getState();
    const pseudonym = state.player.pseudonym || 'Anónimo';
    const userId = state.player.userId || null;

    try {
        await submitScore(scoreData, pseudonym, userId, ending);

        // Verificar si entró al top
        const { isTop, position } = await checkIfTopScore(scoreData.score, 'alltime', 10);
        const messageEl = document.getElementById('end-score-message');
        if (isTop && scoreData.score > 0) {
            messageEl.innerHTML = `<p class="top-score-msg">🌟 ¡Tu puntaje entró al <strong>Top ${position}</strong> del Salón de Honor!</p>`;
        }
    } catch (e) {
        console.error('Error guardando puntaje:', e);
    }

    // Botón de volver a jugar
    document.getElementById('btn-restart').addEventListener('click', () => {
        elements.endScreen.classList.remove('visible');
        elements.gameContainer.classList.remove('game-over');

        if (welcomeCallbacks) {
            renderWelcomeScreen(welcomeCallbacks);
        } else {
            location.reload();
        }
    });
}

// ===========================
// PANTALLA DE BIENVENIDA
// ===========================

/**
 * Renderiza la pantalla de bienvenida con opciones de registro, login, juego anónimo y salón de honor.
 * @param {object} welcomeCallbacks - { onPlay(pseudonym, userId), onShowHonorHall() }
 */
export async function renderWelcomeScreen(welcomeCallbacks) {
    const { user, profile, pseudonym } = await getFullUserState();

    if (user && profile) {
        // Usuario autenticado con perfil completo: cargar record personal
        const bestResult = await getUserBestScore(user.uid);
        renderWelcomeLoggedIn(user, profile, bestResult, welcomeCallbacks);
    } else if (user && !profile) {
        // Usuario autenticado pero sin perfil → pedir seudónimo
        renderWelcomeNeedsProfile(user, welcomeCallbacks);
    } else {
        // Visitante
        renderWelcomeGuest(welcomeCallbacks);
    }

    elements.welcomeScreen.classList.add('visible');
}

/**
 * Vista de bienvenida para usuario autenticado.
 * @param {object} bestResult - Resultado de getUserBestScore: { score, title }
 */
function renderWelcomeLoggedIn(user, profile, bestResult, welcomeCallbacks) {
    const recordText = bestResult.score != null
        ? `🏅 Récord: ${bestResult.score.toLocaleString('es-CL')} pts — ${bestResult.title}`
        : '🏅 Aún sin récord — ¡juega tu primera partida!';

    elements.welcomeScreen.innerHTML = `
        <div class="welcome-content">
            <h1 class="welcome-title">🌲 Forest Hero 🌲</h1>
            <div class="welcome-user-info">
                <p class="welcome-greeting">Bienvenido de vuelta,</p>
                <p class="welcome-pseudonym">🛡️ ${profile.pseudonym}</p>
                <p class="welcome-record">${recordText}</p>
            </div>
            <div class="start-image-container">
                <img src="img/princess_captive.png" alt="La princesa cautiva por el hechicero y su dragón" class="start-image">
            </div>
            <div class="welcome-actions">
                <button class="btn-welcome btn-welcome-play" id="btn-play-logged">⚔️ Adentrarse en el Bosque</button>
                <button class="btn-welcome btn-welcome-honor" id="btn-honor-logged">🏆 Salón de Honor</button>
                <button class="btn-welcome btn-welcome-logout" id="btn-logout">🚪 Cerrar Sesión</button>
            </div>
        </div>`;

    document.getElementById('btn-play-logged').addEventListener('click', () => {
        elements.welcomeScreen.classList.remove('visible');
        welcomeCallbacks.onPlay(profile.pseudonym, user.uid);
    });

    document.getElementById('btn-honor-logged').addEventListener('click', () => {
        renderHonorHall(() => renderWelcomeScreen(welcomeCallbacks));
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await signOut();
        renderWelcomeGuest(welcomeCallbacks);
    });
}

/**
 * Vista para usuario autenticado que aún no tiene perfil (seudónimo).
 * Le pedimos que elija un seudónimo antes de jugar.
 */
function renderWelcomeNeedsProfile(user, welcomeCallbacks) {
    const displayName = user.displayName || user.email || 'Héroe';
    elements.welcomeScreen.innerHTML = `
        <div class="welcome-content">
            <h1 class="welcome-title">🌲 Forest Hero 🌲</h1>
            <div class="welcome-user-info">
                <p class="welcome-greeting">¡Bienvenido, ${displayName}!</p>
                <p style="color: #b0b0b0; font-size: 0.9rem; margin-top: 0.5rem;">Elige un seudónimo para ser recordado en el Salón de Honor.</p>
            </div>
            <div class="auth-form">
                <div id="auth-error" class="auth-error"></div>
                <div class="auth-field">
                    <label for="profile-pseudonym">Seudónimo</label>
                    <div class="pseudonym-input-row">
                        <input type="text" id="profile-pseudonym" placeholder="Ej: Marqués de las Montañas" class="auth-input" maxlength="60">
                        <button class="btn-suggest" id="btn-suggest-profile" title="Sugerir seudónimo aleatorio">🎲</button>
                    </div>
                    <span id="pseudonym-status" class="pseudonym-status"></span>
                </div>
                <button class="btn-auth btn-auth-primary" id="btn-save-profile">🛡️ Guardar y Jugar</button>
                <button class="btn-auth-link" id="btn-play-without-profile">Jugar sin seudónimo por ahora</button>
                <div class="auth-divider"><span>o</span></div>
                <button class="btn-auth-link" id="btn-logout-profile">🚪 Cerrar Sesión</button>
            </div>
        </div>`;

    // Sugerir seudónimo aleatorio
    document.getElementById('btn-suggest-profile').addEventListener('click', async () => {
        const btn = document.getElementById('btn-suggest-profile');
        const input = document.getElementById('profile-pseudonym');
        const status = document.getElementById('pseudonym-status');
        btn.disabled = true;
        btn.textContent = '⏳';
        status.textContent = 'Buscando nombre disponible...';
        status.className = 'pseudonym-status checking';

        try {
            const suggested = await suggestAvailablePseudonym();
            input.value = suggested;
            status.textContent = '✓ Disponible';
            status.className = 'pseudonym-status available';
        } catch (e) {
            status.textContent = 'Error al sugerir. Intenta de nuevo.';
            status.className = 'pseudonym-status error';
        }

        btn.disabled = false;
        btn.textContent = '🎲';
    });

    // Verificar disponibilidad mientras escribe
    let checkTimeout;
    document.getElementById('profile-pseudonym').addEventListener('input', (e) => {
        clearTimeout(checkTimeout);
        const value = e.target.value.trim();
        const status = document.getElementById('pseudonym-status');

        if (value.length < 3) {
            status.textContent = value.length > 0 ? 'Mínimo 3 caracteres' : '';
            status.className = 'pseudonym-status';
            return;
        }

        status.textContent = 'Verificando...';
        status.className = 'pseudonym-status checking';

        checkTimeout = setTimeout(async () => {
            const available = await checkPseudonymAvailable(value);
            if (document.getElementById('profile-pseudonym')?.value.trim() === value) {
                status.textContent = available ? '✓ Disponible' : '✗ Ya está en uso';
                status.className = `pseudonym-status ${available ? 'available' : 'taken'}`;
            }
        }, 500);
    });

    // Guardar perfil y jugar
    document.getElementById('btn-save-profile').addEventListener('click', async () => {
        const pseudonym = document.getElementById('profile-pseudonym').value.trim();
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = '';

        if (!pseudonym || pseudonym.length < 3) {
            errorEl.textContent = 'El seudónimo debe tener al menos 3 caracteres.';
            return;
        }

        const available = await checkPseudonymAvailable(pseudonym);
        if (!available) {
            errorEl.textContent = 'Ese seudónimo ya está en uso. Elige otro.';
            return;
        }

        const btn = document.getElementById('btn-save-profile');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const result = await savePseudonym(user.uid, pseudonym);
        if (result.error) {
            errorEl.textContent = 'Error al guardar el seudónimo. Intenta de nuevo.';
            btn.disabled = false;
            btn.textContent = '🛡️ Guardar y Jugar';
            return;
        }

        elements.welcomeScreen.classList.remove('visible');
        welcomeCallbacks.onPlay(pseudonym, user.uid);
    });

    // Jugar sin seudónimo
    document.getElementById('btn-play-without-profile').addEventListener('click', () => {
        elements.welcomeScreen.classList.remove('visible');
        welcomeCallbacks.onPlay(displayName, user.uid);
    });

    // Cerrar sesión
    document.getElementById('btn-logout-profile').addEventListener('click', async () => {
        await signOut();
        renderWelcomeGuest(welcomeCallbacks);
    });

    // Enter key para submit
    const form = elements.welcomeScreen.querySelector('.auth-form');
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            document.getElementById('btn-save-profile').click();
        }
    });

    // Auto-sugerir un seudónimo al cargar
    document.getElementById('btn-suggest-profile').click();
}

/**
 * Vista de bienvenida para visitante (no autenticado).
 */
function renderWelcomeGuest(welcomeCallbacks) {
    elements.welcomeScreen.innerHTML = `
        <div class="welcome-content">
            <h1 class="welcome-title">🌲 Forest Hero 🌲</h1>
            <div class="welcome-story">
                <p>Un bosque oscuro y peligroso se extiende ante ti. Criaturas de toda índole acechan entre los árboles.</p>
                <p>En la parte más oscura y profunda del bosque, un <strong>Hechicero</strong> tiene cautiva a una <strong>Princesa</strong>, custodiada por su temible <strong>Dragón</strong>.</p>
                <p>Tu misión: adentrarte en el bosque, rescatar a la princesa y sacarla a salvo.</p>
                <div class="start-image-container">
                    <img src="img/princess_captive.png" alt="La princesa cautiva por el hechicero y su dragón" class="start-image">
                </div>
            </div>
            <div class="welcome-actions">
                <button class="btn-welcome btn-welcome-register" id="btn-show-register">📝 Registrarse</button>
                <button class="btn-welcome btn-welcome-login" id="btn-show-login">🔑 Iniciar Sesión</button>
                <button class="btn-welcome btn-welcome-anon" id="btn-play-anon">⚔️ Jugar como Anónimo</button>
                <button class="btn-welcome btn-welcome-honor" id="btn-honor-guest">🏆 Salón de Honor</button>
            </div>
            <div id="auth-form-container" class="auth-form-container"></div>
        </div>`;

    document.getElementById('btn-show-register').addEventListener('click', () => {
        showRegisterForm(welcomeCallbacks);
    });

    document.getElementById('btn-show-login').addEventListener('click', () => {
        showLoginForm(welcomeCallbacks);
    });

    document.getElementById('btn-play-anon').addEventListener('click', () => {
        elements.welcomeScreen.classList.remove('visible');
        welcomeCallbacks.onPlay('Anónimo', null);
    });

    document.getElementById('btn-honor-guest').addEventListener('click', () => {
        renderHonorHall(() => renderWelcomeScreen(welcomeCallbacks));
    });
}

/**
 * Muestra el formulario de registro.
 */
function showRegisterForm(welcomeCallbacks) {
    elements.welcomeScreen.innerHTML = `
        <div class="welcome-content">
            <h1 class="welcome-title">🌲 Forest Hero 🌲</h1>
            <div class="auth-form">
                <h3>📝 Crear Cuenta</h3>
                <div id="auth-error" class="auth-error"></div>
                <div class="auth-field">
                    <label for="reg-email">Email</label>
                    <input type="email" id="reg-email" placeholder="tu@email.com" class="auth-input">
                </div>
                <div class="auth-field">
                    <label for="reg-password">Contraseña</label>
                    <input type="password" id="reg-password" placeholder="Mínimo 6 caracteres" class="auth-input">
                </div>
                <div class="auth-field">
                    <label for="reg-pseudonym">Seudónimo</label>
                    <div class="pseudonym-input-row">
                        <input type="text" id="reg-pseudonym" placeholder="Ej: Marqués de las Montañas" class="auth-input" maxlength="60">
                        <button class="btn-suggest" id="btn-suggest" title="Sugerir seudónimo aleatorio">🎲</button>
                    </div>
                    <span id="pseudonym-status" class="pseudonym-status"></span>
                </div>
                <button class="btn-auth btn-auth-primary" id="btn-register-submit">Crear Cuenta</button>
                <div class="auth-divider"><span>o</span></div>
                <button class="btn-auth btn-google" id="btn-google-register">
                    <svg viewBox="0 0 24 24" width="18" height="18" class="google-icon">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Registrarse con Google
                </button>
                <button class="btn-auth-link" id="btn-back-welcome">← Volver</button>
            </div>
        </div>`;

    // Sugerir seudónimo aleatorio
    document.getElementById('btn-suggest').addEventListener('click', async () => {
        const btn = document.getElementById('btn-suggest');
        const input = document.getElementById('reg-pseudonym');
        const status = document.getElementById('pseudonym-status');
        btn.disabled = true;
        btn.textContent = '⏳';
        status.textContent = 'Buscando nombre disponible...';
        status.className = 'pseudonym-status checking';

        try {
            const suggested = await suggestAvailablePseudonym();
            input.value = suggested;
            status.textContent = '✓ Disponible';
            status.className = 'pseudonym-status available';
        } catch (e) {
            status.textContent = 'Error al sugerir. Intenta de nuevo.';
            status.className = 'pseudonym-status error';
        }

        btn.disabled = false;
        btn.textContent = '🎲';
    });

    // Verificar disponibilidad mientras escribe
    let checkTimeout;
    document.getElementById('reg-pseudonym').addEventListener('input', (e) => {
        clearTimeout(checkTimeout);
        const value = e.target.value.trim();
        const status = document.getElementById('pseudonym-status');

        if (value.length < 3) {
            status.textContent = value.length > 0 ? 'Mínimo 3 caracteres' : '';
            status.className = 'pseudonym-status';
            return;
        }

        status.textContent = 'Verificando...';
        status.className = 'pseudonym-status checking';

        checkTimeout = setTimeout(async () => {
            const available = await checkPseudonymAvailable(value);
            if (document.getElementById('reg-pseudonym').value.trim() === value) {
                status.textContent = available ? '✓ Disponible' : '✗ Ya está en uso';
                status.className = `pseudonym-status ${available ? 'available' : 'taken'}`;
            }
        }, 500);
    });

    // Submit registro
    document.getElementById('btn-register-submit').addEventListener('click', async () => {
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const pseudonym = document.getElementById('reg-pseudonym').value.trim();
        const errorEl = document.getElementById('auth-error');

        errorEl.textContent = '';

        if (!email || !password || !pseudonym) {
            errorEl.textContent = 'Todos los campos son obligatorios.';
            return;
        }
        if (pseudonym.length < 3) {
            errorEl.textContent = 'El seudónimo debe tener al menos 3 caracteres.';
            return;
        }
        if (password.length < 6) {
            errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        const available = await checkPseudonymAvailable(pseudonym);
        if (!available) {
            errorEl.textContent = 'Ese seudónimo ya está en uso. Elige otro.';
            return;
        }

        const btn = document.getElementById('btn-register-submit');
        btn.disabled = true;
        btn.textContent = 'Creando cuenta...';

        const { user, error } = await signUpWithEmail(email, password);
        if (error) {
            errorEl.textContent = translateAuthError(error.message);
            btn.disabled = false;
            btn.textContent = 'Crear Cuenta';
            return;
        }

        if (user) {
            await savePseudonym(user.uid, pseudonym);
            elements.welcomeScreen.classList.remove('visible');
            welcomeCallbacks.onPlay(pseudonym, user.uid);
        } else {
            errorEl.textContent = 'Revisa tu email para confirmar la cuenta, luego inicia sesión.';
            btn.disabled = false;
            btn.textContent = 'Crear Cuenta';
        }
    });

    // Google register (popup — retorna el usuario directamente)
    document.getElementById('btn-google-register').addEventListener('click', async () => {
        const pseudonym = document.getElementById('reg-pseudonym').value.trim();
        const errorEl = document.getElementById('auth-error');

        const { user, error } = await signInWithGoogle();
        if (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                errorEl.textContent = translateAuthError(error.message);
            }
            return;
        }

        if (user) {
            // Guardar seudónimo si se proporcionó uno válido
            if (pseudonym.length >= 3) {
                await savePseudonym(user.uid, pseudonym);
                elements.welcomeScreen.classList.remove('visible');
                welcomeCallbacks.onPlay(pseudonym, user.uid);
            } else {
                // Si no tiene seudónimo, mostrar la pantalla logueada para que juegue
                await renderWelcomeScreen(welcomeCallbacks);
            }
        }
    });

    // Enter key para submit
    const registerForm = elements.welcomeScreen.querySelector('.auth-form');
    registerForm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            document.getElementById('btn-register-submit').click();
        }
    });

    // Volver
    document.getElementById('btn-back-welcome').addEventListener('click', () => {
        renderWelcomeGuest(welcomeCallbacks);
    });
}

/**
 * Muestra el formulario de login.
 */
function showLoginForm(welcomeCallbacks) {
    elements.welcomeScreen.innerHTML = `
        <div class="welcome-content">
            <h1 class="welcome-title">🌲 Forest Hero 🌲</h1>
            <div class="auth-form">
                <h3>🔑 Iniciar Sesión</h3>
                <div id="auth-error" class="auth-error"></div>
                <div class="auth-field">
                    <label for="login-email">Email</label>
                    <input type="email" id="login-email" placeholder="tu@email.com" class="auth-input">
                </div>
                <div class="auth-field">
                    <label for="login-password">Contraseña</label>
                    <input type="password" id="login-password" placeholder="Tu contraseña" class="auth-input">
                </div>
                <button class="btn-auth btn-auth-primary" id="btn-login-submit">Iniciar Sesión</button>
                <div class="auth-divider"><span>o</span></div>
                <button class="btn-auth btn-google" id="btn-google-login">
                    <svg viewBox="0 0 24 24" width="18" height="18" class="google-icon">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Iniciar con Google
                </button>
                <button class="btn-auth-link" id="btn-back-welcome">← Volver</button>
            </div>
        </div>`;

    // Submit login
    document.getElementById('btn-login-submit').addEventListener('click', async () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('auth-error');

        errorEl.textContent = '';

        if (!email || !password) {
            errorEl.textContent = 'Ingresa tu email y contraseña.';
            return;
        }

        const btn = document.getElementById('btn-login-submit');
        btn.disabled = true;
        btn.textContent = 'Ingresando...';

        const { user, error } = await signInWithEmail(email, password);
        if (error) {
            errorEl.textContent = translateAuthError(error.message);
            btn.disabled = false;
            btn.textContent = 'Iniciar Sesión';
            return;
        }

        // Login exitoso → mostrar pantalla de bienvenida logueada
        await renderWelcomeScreen(welcomeCallbacks);
    });

    // Google login (popup — retorna el usuario directamente)
    document.getElementById('btn-google-login').addEventListener('click', async () => {
        const errorEl = document.getElementById('auth-error');
        const { user, error } = await signInWithGoogle();
        if (error) {
            if (error.code !== 'auth/popup-closed-by-user') {
                errorEl.textContent = translateAuthError(error.message);
            }
            return;
        }
        if (user) {
            // Login exitoso → mostrar pantalla de bienvenida logueada
            await renderWelcomeScreen(welcomeCallbacks);
        }
    });

    // Enter key para submit
    const loginForm = elements.welcomeScreen.querySelector('.auth-form');
    loginForm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btn-login-submit').click();
        }
    });

    // Volver
    document.getElementById('btn-back-welcome').addEventListener('click', () => {
        renderWelcomeGuest(welcomeCallbacks);
    });
}

/**
 * Traduce mensajes de error de Firebase Auth al español.
 * Firebase usa códigos de error (error.code) pero los mensajes
 * en error.message también son descriptivos.
 */
function translateAuthError(message) {
    const translations = {
        // Mensajes por código de Firebase
        'Firebase: Error (auth/invalid-credential).': 'Email o contraseña incorrectos.',
        'Firebase: Error (auth/wrong-password).': 'Contraseña incorrecta.',
        'Firebase: Error (auth/user-not-found).': 'No existe una cuenta con ese email.',
        'Firebase: Error (auth/email-already-in-use).': 'Ya existe una cuenta con ese email.',
        'Firebase: Error (auth/weak-password).': 'La contraseña debe tener al menos 6 caracteres.',
        'Firebase: Error (auth/invalid-email).': 'El formato del email no es válido.',
        'Firebase: Error (auth/too-many-requests).': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
        'Firebase: Error (auth/popup-closed-by-user).': 'Se cerró la ventana de autenticación.',
        'Firebase: Error (auth/network-request-failed).': 'Error de conexión. Verifica tu internet.',
        'Firebase: Error (auth/account-exists-with-different-credential).': 'Ya existe una cuenta con ese email usando otro método de acceso.',
    };
    return translations[message] || message;
}

// ===========================
// SALÓN DE HONOR
// ===========================

/**
 * Renderiza el Salón de Honor con tabs de periodo.
 * @param {function} onBack - Se llama al presionar "Volver"
 */
export async function renderHonorHall(onBack) {
    elements.honorHallScreen.innerHTML = `
        <div class="honor-hall-content">
            <h1 class="honor-title">🏆 Salón de Honor</h1>
            <div class="honor-tabs">
                <button class="honor-tab active" data-period="alltime">🏛️ Siempre</button>
                <button class="honor-tab" data-period="week">📅 Esta Semana</button>
                <button class="honor-tab" data-period="today">☀️ Hoy</button>
            </div>
            <div id="honor-table-container" class="honor-table-container">
                <p class="honor-loading">Cargando mejores puntajes...</p>
            </div>
            <button class="btn-welcome btn-welcome-back" id="btn-honor-back">← Volver</button>
        </div>`;

    elements.honorHallScreen.classList.add('visible');
    elements.welcomeScreen.classList.remove('visible');

    // Cargar scores iniciales (all time)
    await loadHonorScores('alltime');

    // Tabs
    document.querySelectorAll('.honor-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.honor-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            await loadHonorScores(tab.dataset.period);
        });
    });

    // Volver
    document.getElementById('btn-honor-back').addEventListener('click', () => {
        elements.honorHallScreen.classList.remove('visible');
        if (onBack) onBack();
    });
}

/**
 * Carga y renderiza la tabla de scores para un periodo.
 */
async function loadHonorScores(period) {
    const container = document.getElementById('honor-table-container');
    container.innerHTML = '<p class="honor-loading">Cargando...</p>';

    const { scores, error } = await getTopScores(period, 20);

    if (error) {
        container.innerHTML = '<p class="honor-empty">Error al cargar los puntajes. Intenta de nuevo.</p>';
        return;
    }

    if (scores.length === 0) {
        const periodText = {
            today: 'hoy',
            week: 'esta semana',
            alltime: '',
        };
        container.innerHTML = `<p class="honor-empty">No hay puntajes registrados ${periodText[period] || ''}. ¡Sé el primero!</p>`;
        return;
    }

    let html = `
        <table class="honor-table">
            <thead>
                <tr>
                    <th class="honor-col-pos">#</th>
                    <th class="honor-col-name">Héroe</th>
                    <th class="honor-col-score">Puntaje</th>
                    <th class="honor-col-title">Título</th>
                    <th class="honor-col-princess">👸</th>
                </tr>
            </thead>
            <tbody>`;

    scores.forEach((s, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
        const princessIcon = s.has_princess ? '✅' : '❌';
        html += `
            <tr class="${i < 3 ? 'honor-top-3' : ''}">
                <td class="honor-col-pos">${medal}</td>
                <td class="honor-col-name">${escapeHtml(s.pseudonym)}</td>
                <td class="honor-col-score">${s.score}</td>
                <td class="honor-col-title">${escapeHtml(s.title)}</td>
                <td class="honor-col-princess">${princessIcon}</td>
            </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Escapa HTML para prevenir XSS en seudónimos.
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================
// PANTALLA DE INICIO (historia pre-juego)
// ===========================

export function renderStartScreen(onStart) {
    elements.startScreen.innerHTML = `
        <div class="start-content">
            <h1 class="start-title">🌲 Forest Hero 🌲</h1>
            <div class="start-story">
                <p>Un bosque oscuro y peligroso se extiende ante ti. Criaturas de toda índole acechan entre los árboles.</p>
                <p>En la parte más oscura y profunda del bosque, un <strong>Hechicero</strong> tiene cautiva a una <strong>Princesa</strong>, custodiada por su temible <strong>Dragón</strong>.</p>
                <p>Tu misión: adentrarte en el bosque, rescatar a la princesa y sacarla a salvo.</p>
                <div class="start-image-container">
                    <img src="img/princess_captive.png" alt="La princesa cautiva por el hechicero y su dragón" class="start-image">
                </div>
            </div>
            <button class="btn-start" id="btn-start">⚔️ Adentrarse en el Bosque</button>
        </div>`;

    elements.startScreen.classList.add('visible');

    document.getElementById('btn-start').addEventListener('click', () => {
        elements.startScreen.classList.remove('visible');
        onStart();
    });
}

// ===========================
// PANTALLA DE AYUDA
// ===========================

/**
 * Renderiza la pantalla de ayuda y conecta el botón.
 */
function renderHelpScreen() {
    elements.helpScreen.innerHTML = `
        <div class="help-content">
            <h1>❓ Ayuda</h1>

            <div class="help-section">
                <h3>🎯 Objetivo</h3>
                <p>Adéntrate en el bosque, encuentra al Hechicero que tiene cautiva a la Princesa,
                derrótalo (a él y a su Dragón), y lleva a la Princesa a cualquier borde del mapa para escapar.</p>
            </div>

            <div class="help-section">
                <h3>🧭 Movimiento</h3>
                <p>Usa los botones de dirección (Norte, Sur, Este, Oeste) para moverte por el bosque.
                Los pantanos (🟢) bloquean el paso. Las casillas despejadas (✅) son seguras.
                El color de fondo de las casillas indica el peligro: más oscuro = más peligroso.</p>
            </div>

            <div class="help-section">
                <h3>⚔️ Combate</h3>
                <p>Al encontrar una criatura puedes pelear invirtiendo parte de tu energía.
                Cuanta más energía inviertas respecto a la fuerza del enemigo, mayor la probabilidad de ganar.
                Si ganas, obtienes su tesoro. Si empatas, pierdes la energía pero puedes reintentarlo.
                Si pierdes, mueres.</p>
            </div>

            <div class="help-section">
                <h3>💰 Soborno</h3>
                <p>Puedes ofrecer monedas de oro para que el enemigo te deje pasar.
                Cuantas más monedas ofrezcas, más probable que acepte.
                Si ofreces muy poco, puede sentirse insultado y obligarte a pelear.</p>
            </div>

            <div class="help-section">
                <h3>🏃 Huida</h3>
                <p>Puedes intentar correr. Hay posibilidad de escapar a una casilla adyacente,
                ser atrapado (eliges de nuevo), ser forzado a pelear, o incluso morir en el intento.</p>
            </div>

            <div class="help-section">
                <h3>🎒 Inventario</h3>
                <p>Al derrotar criaturas, hay una pequeña probabilidad de encontrar tesoros escondidos:
                objetos especiales de un solo uso como anillos, espadas, alas mágicas, elixires y más.
                Puedes usarlos durante un encuentro.</p>
            </div>

            <button class="btn-close-help" id="btn-close-help">Entendido</button>
        </div>`;

    // Abrir ayuda
    elements.btnHelp.addEventListener('click', () => {
        elements.helpScreen.classList.add('visible');
    });

    // Cerrar ayuda
    elements.helpScreen.addEventListener('click', (e) => {
        if (e.target === elements.helpScreen || e.target.id === 'btn-close-help') {
            elements.helpScreen.classList.remove('visible');
        }
    });
}

// ===========================
// REFRESH COMPLETO
// ===========================

/**
 * Actualiza toda la UI.
 */
export function refreshUI(callbacks) {
    renderMiniMap();
    renderCreature();
    renderNarrative();
    renderStats();
    renderInventory();
    renderKillList();
    renderActions(callbacks);
}
