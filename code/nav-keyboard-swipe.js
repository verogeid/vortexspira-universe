// --- code/nav-keyboard-swipe.js ---

/**
 * Maneja la navegación por teclado (flechas y Enter/Espacio) en la vista de Navegación (Swipe).
 */
export function _handleSwipeNavigation(key, appInstance) {
    const app = appInstance;
    const { itemsPorColumna } = app.STATE; 
    let currentIndex = app.STATE.currentFocusIndex;
    let newIndex = currentIndex;

    const allCards = Array.from(app.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const totalCards = allCards.length;
    if (totalCards === 0) return;

    switch (key) {
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = totalCards - 1;
            break;
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            if (newIndex >= totalCards) newIndex = 0;
            break;
        case 'ArrowLeft':
            newIndex = currentIndex - itemsPorColumna;
            if (newIndex < 0) newIndex = totalCards - 1; 
            break;
        case 'ArrowRight':
            newIndex = currentIndex + itemsPorColumna;
            if (newIndex >= totalCards) newIndex = 0;
            break;
        case 'Enter':
        case ' ':
            if (allCards[currentIndex]) {
                const tarjeta = allCards[currentIndex];
                if (tarjeta.dataset.tipo === 'volver-vertical') {
                     if (typeof app._handleVolverClick === 'function') {
                        app._handleVolverClick();
                     }
                    return;
                }
                if (tarjeta.classList.contains('disabled')) return;

                const id = tarjeta.dataset.id;
                const tipo = tarjeta.dataset.tipo;
                
                if (typeof app._handleCardClick === 'function') {
                    app._handleCardClick(id, tipo); 
                }
            }
            return; 
    }

    if (newIndex !== currentIndex) {
        app.STATE.keyboardNavInProgress = true; 
        app.STATE.currentFocusIndex = newIndex;
        // Delegamos a _updateFocusImpl en nav_base
        app._updateFocus(true);
    }
};

// --- code/nav-keyboard-swipe.js ---