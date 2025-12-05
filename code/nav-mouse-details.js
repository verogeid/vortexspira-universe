// --- code/nav-mouse-details.js ---

import * as nav_keyboard_details from './nav-keyboard-details.js'; 

/**
 * Lógica de inicialización de los handlers de ratón para la vista de detalle.
 * Se llama desde nav-base.setupListeners.
 */
export function _setupDetailMouseListeners(appInstance) {
    // ⭐️ MODIFICACIÓN: Listener de rueda de ratón (Mouse Wheel) ⭐️
    // Se deja vacío. El nuevo Swiper de detalle maneja el scroll 
    // nativamente a través de su propia configuración (mousewheel: true) en render-details.js.
    /*
    if (appInstance.DOM.appContainer) {
        appInstance.DOM.appContainer.addEventListener('wheel', _handleDetailWheel.bind(appInstance));
    }
    */
};

/**
 * Handler para el evento de rueda de ratón en la vista de detalle.
 * Este handler y toda la lógica asociada han sido eliminados/comentados.
 */
/*
function _handleDetailWheel(e) {
    // Lógica antigua...
};
*/

// --- code/nav-mouse-details.js ---