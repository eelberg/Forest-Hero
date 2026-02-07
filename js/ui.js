// ===========================================
// ui.js - Renderizado de la interfaz
// ===========================================

import { getState, addLog, GameState } from './game.js';
import { MAP_SIZE } from './map.js';

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
        startScreen: document.getElementById('start-screen'),
        endScreen: document.getElementById('end-screen'),
    };
}

// ===========================
// MINI-MAPA 3x3
// ===========================

/**
 * Icono de bosque según nivel de riesgo (4 niveles).
 * Vegetación progresiva: más densa = más peligro.
 */
function getForestIcon(tier) {
    if (tier <= 30) return '🌱';      // Pasto / hierba baja
    if (tier <= 50) return '🌿';      // Plantas / vegetación media
    if (tier <= 80) return '🪴';      // Arbusto / vegetación densa
    return '🌳';                       // Árboles / bosque cerrado
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

    let html = `<div class="action-group"><h4>⚔️ ¿Cuánta energía inviertes?</h4>`;
    html += `<p class="input-hint">Fuerza del enemigo: ${enemy.totalStrength} | Tu energía: ${state.player.energy}</p>`;
    html += `<div class="input-row">`;
    html += `<input type="range" id="energy-slider" min="1" max="${state.player.energy}" value="${Math.min(enemy.totalStrength, state.player.energy)}" class="energy-slider">`;
    html += `<span id="energy-display" class="energy-display">${Math.min(enemy.totalStrength, state.player.energy)}</span>`;
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

    let html = `<div class="action-group"><h4>💰 ¿Cuántas monedas ofreces?</h4>`;
    html += `<p class="input-hint">Tu oro: ${state.player.gold} monedas</p>`;
    html += `<div class="input-row">`;
    html += `<input type="range" id="gold-slider" min="1" max="${state.player.gold}" value="${Math.min(50, state.player.gold)}" class="gold-slider">`;
    html += `<span id="gold-display" class="gold-display">${Math.min(50, state.player.gold)}</span>`;
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
export function renderEndScreen(scoreData, ending, deathInfo = {}) {
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
            endingTitle = 'Has Caído';
            endingClass = 'ending-death ending-feast';
            endingEmoji = '💀';
    }

    // Subtítulo con causa de muerte
    if (deathInfo.deathCause && deathInfo.killedBy) {
        const causeTexts = {
            flee: `Intentaste huir de ${deathInfo.killedBy}, pero te alcanzó y te dio muerte.`,
            combat: `${deathInfo.killedBy} te derrotó en combate.`,
            pill: 'Usaste la píldora explosiva. No queda nada de ti.',
        };
        endingSubtitle = causeTexts[deathInfo.deathCause] || `${deathInfo.killedBy} acabó contigo.`;
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
                <p class="feast-text">El hechicero, con una sonrisa siniestra, le sirvió la princesa en bandeja de plata a su dragón. La bestia la engulló de un solo bocado y eructó satisfecha. ¡Buen provecho!</p>
            </div>`;
    } else if (ending === 'coward') {
        sceneHtml = `
            <div class="feast-scene">
                <img src="img/dragon_feast.png" alt="El dragón devora a la princesa" class="feast-image">
                <p class="feast-text">Tras tu cobarde huida, el hechicero le sirvió la princesa en bandeja de plata a su dragón. La bestia la engulló de un solo bocado y eructó satisfecha. Tu cobardía le costó la vida.</p>
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

            <button class="btn-action btn-restart" id="btn-restart">🔄 Jugar de Nuevo</button>
        </div>`;

    elements.endScreen.classList.add('visible');
    elements.gameContainer.classList.add('game-over');

    document.getElementById('btn-restart').addEventListener('click', () => {
        location.reload();
    });
}

// ===========================
// PANTALLA DE INICIO
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
