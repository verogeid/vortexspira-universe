// --- code/nav-mouse-details.js ---

import * as nav_keyboard_details from './nav-keyboard-details.js'; 

/**
 * Lógica de inicialización de los handlers de ratón para la vista de detalle.
 * Se llama desde nav-base.setupListeners.
 */
export function _setupDetailMouseListeners(appInstance) {
    // ⭐️ CORRECCIÓN: Quitamos el listener global. Swiper ya maneja la rueda en el contenedor del carrusel (mousewheel: true). ⭐️
    // Si la aplicación tuviera que soportar IE o Edge legacy, necesitaríamos el listener antiguo.
};

/**
 * Handler para el evento de rueda de ratón en la vista de detalle.
 * ⭐️ NOTA: Este handler ya NO es necesario si Swiper está configurado con mousewheel: true ⭐️
 */
function _handleDetailWheel(e) {
    return;
};

// --- code/nav-mouse-details.js ---