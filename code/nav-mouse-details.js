// --- code/nav-mouse-details.js ---

import * as nav_keyboard_details from './nav-keyboard-details.js'; 

/**
 * Lógica de inicialización de los handlers de ratón para la vista de detalle.
 * Se llama desde nav-base.setupListeners.
 */
export function _setupDetailMouseListeners(appInstance) {
    // ⭐️ FIX: Re-implementar el listener global para capturar la rueda del ratón y delegar a la navegación por teclado. ⭐️
    if (appInstance.DOM.appContainer) {
        // Adjuntamos al contenedor principal de la app para asegurar la captura
        appInstance.DOM.appContainer.addEventListener('wheel', _handleDetailWheel.bind(appInstance), { passive: false });
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

    // Solo se debe intentar la navegación si el evento se originó dentro del carrusel de detalle o su contenido
    const targetIsDetailContent = e.target.closest('#vista-detalle-desktop, #vista-detalle-mobile, .detalle-viewport');

    if (targetIsDetailContent) {
        // ⭐️ CORRECCIÓN CLAVE: Interceptamos el scroll nativo y lo convertimos a navegación por foco. ⭐️
        if (e.deltaY !== 0) {
            e.preventDefault(); 
            
            const key = e.deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
            // Delegar a la función de navegación por teclado (que usa slideNext/slidePrev)
            nav_keyboard_details._handleDetailNavigation.call(this, key);
            return;
        }
    }
};

// --- code/nav-mouse-details.js ---