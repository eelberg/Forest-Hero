// ===========================================
// arcade-audio.js — SFX opcionales (rutas en visual-config)
// ===========================================

import { ARCADE_AUDIO } from './visual-config.js';

const cache = new Map();

function getAudio(url) {
    if (!url) return null;
    let a = cache.get(url);
    if (!a) {
        a = new Audio(url);
        a.preload = 'auto';
        cache.set(url, a);
    }
    return a;
}

/**
 * Intenta reproducir un clip; falla en silencio si el archivo no existe.
 * @param {'uiClick'|'combatHit'|'move'} key
 */
export function playArcadeSound(key) {
    const url = ARCADE_AUDIO[key];
    if (!url) return;
    const audio = getAudio(url);
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 0.35;
    audio.play().catch(() => {});
}
