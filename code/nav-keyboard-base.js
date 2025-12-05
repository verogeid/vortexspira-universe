// --- code/nav-keyboard-base.js ---

import * as nav_keyboard_details from './nav-keyboard-details.js';
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js';
import * as nav_base_details from './nav-base-details.js'; // ⭐️ Importación de helper de detalle ⭐️
import * as debug from './debug.js';

/**
 * Maneja el evento keydown global.
 * @param {Event} e 
 */
export function _handleKeyDown(e) {
    // 'this' es la instancia de App
    const appInstance = this;
    const isDetailView = appInstance.DOM.vistaDetalle.classList.contains('active') || appInstance.DOM.vistaDetalleMobile.classList.contains('active');

    // Módulos que manejan las teclas:
    // 1. Teclas de Navegación (Flechas, Enter, Space)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        e.preventDefault(); 
        
        if (isDetailView) {
            // Navegación secuencial de fragmentos en Detalle
            appInstance._handleDetailNavigation(e.key);
        } else {
            // Navegación entre tarjetas de Navegación (Swipe)
            nav_keyboard_swipe._handleNavigation.call(appInstance, e.key);
        }
    } 
    
    // 2. Tecla de Escape (Volver/Cerrar Detalle)
    else if (e.key === 'Escape') {
        e.preventDefault(); 
        appInstance._handleVolverClick();
    }
    
    // 3. Tecla TAB (Manejo del Focus Trap)
    else if (e.key === 'Tab') {
        // e.preventDefault() NO debe ser llamado aquí para permitir el movimiento nativo
        _handleFocusTrap.call(appInstance, e);
    }
    
    // 4. Teclas PageUp/PageDown (Scroll en detalle)
    else if (isDetailView && (e.key === 'PageUp' || e.key === 'PageDown')) {
        // Permitir el comportamiento nativo del navegador para el scroll de página
    }
    
    // 5. Teclas de Letra (Atajos de búsqueda/etc)
    else if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
        // Actualmente no implementado: Podría ser atajos de búsqueda o salto rápido
    }
}

/**
 * Maneja el Focus Trap (la navegación con TAB) para asegurar que el foco 
 * permanezca dentro de la vista activa (Navegación o Detalle).
 */
function _handleFocusTrap(e) {
    // 'this' es la instancia de App
    const appInstance = this;
    const isDetailView = appInstance.DOM.vistaDetalle.classList.contains('active') || appInstance.DOM.vistaDetalleMobile.classList.contains('active');
    
    let focusableElements = [];
    
    if (isDetailView) {
        // ⭐️ Usar el helper actualizado de nav-base-details ⭐️
        focusableElements = nav_base_details._getFocusableDetailElements(appInstance);
        
        // ⭐️ Incluir el elemento 'Volver' fijo si es Desktop ⭐️
        if (window.innerWidth > 600) {
            if (appInstance.DOM.cardVolverFijaElemento.classList.contains('visible')) {
                focusableElements.unshift(appInstance.DOM.cardVolverFijaElemento);
            }
        }
        
    } else {
        // Vista de Navegación
        focusableElements = nav_keyboard_swipe._getFocusableNavElements(appInstance);
    }

    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    
    // Si el foco está en el contenedor principal de la vista, intentar moverlo al primer elemento.
    // Esto se da cuando se vuelve del detalle o se inicia la app.
    if (document.activeElement === appInstance.DOM.appContainer ||
        document.activeElement === appInstance.DOM.vistaDetalle ||
        document.activeElement === appInstance.DOM.vistaDetalleMobile) {
        
        // Mover el foco a la primera tarjeta/fragmento, no al header.
        e.preventDefault();
        first.focus();
        return;
    }
    
    // Si el foco está en el último elemento (y presionamos TAB)
    if (document.activeElement === last) {
        if (!e.shiftKey) {
            e.preventDefault();
            first.focus();
        }
    } 
    // Si el foco está en el primer elemento (y presionamos SHIFT + TAB)
    else if (document.activeElement === first) {
        if (e.shiftKey) {
            e.preventDefault();
            last.focus();
        }
    }
}

// --- code/nav-keyboard-base.js ---