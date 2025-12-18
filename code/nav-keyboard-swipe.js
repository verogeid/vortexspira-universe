// --- code/nav-keyboard-swipe.js ---

import * as data from './data.js';

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
    if (totalCards === 0) return;

    // Determinamos posición en la rejilla
    const currentColumn = Math.floor(currentIndex / itemsPorColumna);
    const currentRow = currentIndex % itemsPorColumna;

    switch (key) {
        case 'ArrowUp':
            // Intentar subir en la misma columna
            if (currentRow > 0) {
                newIndex = currentIndex - 1;
            } else {
                // Si estamos arriba, saltar al final de la columna anterior
                newIndex = currentIndex - 1;
                if (newIndex < 0) newIndex = totalCards - 1; // Bucle al final
            }
            break;

        case 'ArrowDown':
            // Intentar bajar en la misma columna
            const isLastInColumn = (currentRow === itemsPorColumna - 1);
            if (!isLastInColumn && (currentIndex + 1) < totalCards) {
                newIndex = currentIndex + 1;
            } else {
                // Si estamos abajo o no hay más en esta columna, saltar a la siguiente
                newIndex = currentIndex + 1;
                if (newIndex >= totalCards) newIndex = 0; // Bucle al principio
            }
            break;

        case 'ArrowLeft':
            // Salto lateral a la columna anterior (misma fila)
            newIndex = currentIndex - itemsPorColumna;
            if (newIndex < 0) newIndex = (currentIndex === 0) ? totalCards - 1 : 0;
            break;

        case 'ArrowRight':
            // Salto lateral a la siguiente columna (misma fila)
            newIndex = currentIndex + itemsPorColumna;
            if (newIndex >= totalCards) newIndex = (currentIndex === totalCards - 1) ? 0 : totalCards - 1;
            break;

        case 'Enter':
        case ' ':
            const tarjeta = allCards[currentIndex];
            if (tarjeta && !tarjeta.classList.contains('disabled')) {
                const { id, tipo } = tarjeta.dataset;
                if (tipo === 'volver-vertical') app._handleVolverClick();
                else app._handleCardClick(id, tipo);
            }
            return; 
    }

    if (newIndex !== currentIndex) {
        app.STATE.keyboardNavInProgress = true; 
        app.STATE.currentFocusIndex = newIndex;
        
        // Determinar si el movimiento requiere que Swiper cambie de slide lateralmente
        const newColumn = Math.floor(newIndex / itemsPorColumna);
        const needsSlide = (newColumn !== currentColumn);
        
        // Pasamos needsSlide a updateFocus para evitar el desplazamiento lateral si seguimos en la misma columna
        app._updateFocus(needsSlide);
    }
}

// --- code/nav-keyboard-swipe.js ---