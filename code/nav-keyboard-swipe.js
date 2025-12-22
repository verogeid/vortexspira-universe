// --- code/nav-keyboard-swipe.js ---

import * as data from './data.js';
import * as debug from './debug.js';

/**
 * Maneja la navegación por teclado en la vista de Swipe (Menús).
 * Garantiza navegación vertical interna en columnas antes de saltar lateralmente.
 */
export function _handleSwipeNavigation(key, appInstance) {
    const app = appInstance;
    const { itemsPorColumna } = app.STATE; 
    let currentIndex = app.STATE.currentFocusIndex;
    let newIndex = currentIndex;

    const allCards = Array.from(app.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const totalCards = allCards.length;

    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, `RADAR: Tecla ${key} | Foco: ${currentIndex} | Total: ${totalCards}`);

    if (totalCards === 0) return;

    const currentColumn = Math.floor(currentIndex / itemsPorColumna);
    const currentRow = currentIndex % itemsPorColumna;

    switch (key) {
        case 'ArrowUp':
            if (currentRow > 0) {
                newIndex = currentIndex - 1;
            } else {
                newIndex = currentIndex - 1;
                if (newIndex < 0) newIndex = totalCards - 1;
                debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, "CILINDRO: Bucle superior.");
            }
            break;

        case 'ArrowDown':
            const isLastInColumn = (currentRow === itemsPorColumna - 1);
            if (!isLastInColumn && (currentIndex + 1) < totalCards) {
                newIndex = currentIndex + 1;
            } else {
                newIndex = currentIndex + 1;
                if (newIndex >= totalCards) newIndex = 0;
                debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, "CILINDRO: Bucle inferior.");
            }
            break;

        case 'ArrowLeft':
            newIndex = currentIndex - itemsPorColumna;
            if (newIndex < 0) newIndex = (currentIndex === 0) ? totalCards - 1 : 0;
            debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, "LATERAL: Izquierda.");
            break;

        case 'ArrowRight':
            newIndex = currentIndex + itemsPorColumna;
            if (newIndex >= totalCards) newIndex = (currentIndex === totalCards - 1) ? 0 : totalCards - 1;
            debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, "LATERAL: Derecha.");
            break;

        case 'Enter':
        case ' ':
            const tarjeta = allCards[currentIndex];
            if (tarjeta && !tarjeta.classList.contains('disabled')) {
                const { id, tipo } = tarjeta.dataset;
                debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, `ACCION: Ejecutando ${id}`);
                if (tipo === 'volver-vertical') app._handleVolverClick();
                else app._handleCardClick(id, tipo);
            }
            return; 
    }

    if (newIndex !== currentIndex) {
        app.STATE.keyboardNavInProgress = true; 
        app.STATE.currentFocusIndex = newIndex;
        
        const newColumn = Math.floor(newIndex / itemsPorColumna);
        const needsSlide = (newColumn !== currentColumn);
        
        debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, `UPDATE: Nuevo Index ${newIndex} | Mover Slide: ${needsSlide}`);
        app._updateFocus(needsSlide);
    }
}

// --- code/nav-keyboard-swipe.js ---