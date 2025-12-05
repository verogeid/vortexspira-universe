// --- code/nav-mouse-details.js ---

import * as nav_keyboard_details from './nav-keyboard-details.js'; 

/**
 * Lógica de inicialización de los handlers de ratón para la vista de detalle.
 * Se llama desde nav-base.setupListeners.
 */
export function _setupDetailMouseListeners(appInstance) {
    // ⭐️ Listener de rueda de ratón (Mouse Wheel) en el contenedor principal ⭐️
    if (appInstance.DOM.appContainer) {
        appInstance.DOM.appContainer.addEventListener('wheel', _handleDetailWheel.bind(appInstance));
    }
};

/**
 * Handler para el evento de rueda de ratón en la vista de detalle.
 */
function _handleDetailWheel(e) {
    // 'this' es la instancia de App
    const isDetailView = this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active');
    
    // Solo actuamos si estamos en la vista de detalle
    if (!isDetailView) return; 

    // Solo se debe intentar la navegación si el evento se originó dentro de la columna de detalle
    const targetIsDetailContent = e.target.closest('#vista-detalle-desktop, #vista-detalle-mobile');
    if (!targetIsDetailContent) return;

    // ⭐️ CORRECCIÓN CLAVE: Interceptamos el scroll nativo y lo convertimos a navegación por foco. ⭐️
    if (e.deltaY !== 0) {
        e.preventDefault(); 
        
        const key = e.deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
        // Delegar a la función de navegación por teclado, que cambia el foco y llama a scrollIntoView
        nav_keyboard_details._handleDetailNavigation.call(this, key);
    }
};

// --- code/nav-mouse-details.js ---