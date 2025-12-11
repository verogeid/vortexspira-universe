// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 
import * as debug from './debug.js'; 
import * as data from './data.js'; // Necesario para data.SWIPE_SLIDE_SPEED

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const app = this;
    const swiper = app.STATE.detailCarouselInstance;
    if (!swiper) return;

    // ⭐️ FIX CLAVE 1: Bloquear si ya hay una transición en curso (UNIFICADO) ⭐️
    if (app.STATE.keyboardNavInProgress) {
        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Transición en curso. Bloqueado.');
        return;
    }
    
    // ⭐️ Nuevo: Obtener todos los elementos enfocables (Element Index) ⭐️
    const focusableElements = nav_base_details._getFocusableDetailElements(app);
    const totalElements = focusableElements.length;
    if (totalElements === 0) return;
    
    // ⭐️ Nuevo: Determinar el índice actual basado en el elemento activo ⭐️
    // Si el foco no está en un elemento enfocable, usamos el índice guardado como fallback.
    let currentElement = document.activeElement;
    let currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex === -1) {
        // Usar el índice guardado (que es el índice en la lista enfocable, no el índice del slide)
        currentIndex = app.STATE.lastDetailFocusIndex || 0;
        
        // Fallback: Asegurarse de que el índice es válido si el foco se perdió
        if (currentIndex < 0 || currentIndex >= totalElements) {
             currentIndex = 0;
        }
    }

    let newIndex = currentIndex;
    
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `--- INICIO: _handleDetailNavigation (Key: ${key}) ---`);
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `Current Focus Index (List): ${currentIndex}, Total Elements: ${totalElements}`);
    
    switch (key) {
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            // No hacemos wrap. Nos quedamos en el primer elemento.
            if (newIndex < 0) newIndex = 0; 
            break;
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            // No hacemos wrap. Nos quedamos en el último elemento.
            if (newIndex >= totalElements) newIndex = totalElements - 1; 
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            // Ignoramos el movimiento lateral.
            debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Movimiento lateral ignorado.');
            return; 
        case 'Enter':
        case ' ':
            // Lógica para Enter/Space 
            const targetElement = focusableElements[currentIndex];
            
            if (targetElement) {
                // Si es un botón de volver (en móvil o fijo de escritorio)
                if (targetElement.classList.contains('card-volver-vertical') || targetElement.id === 'card-volver-fija-elemento') {
                    app._handleVolverClick();
                    return;
                }
                
                // Si es un botón de acción (detail-action-item)
                if (targetElement.classList.contains('detail-action-item')) {
                    const btn = targetElement.querySelector('.detail-action-btn');
                    if (btn && !btn.classList.contains('disabled')) {
                        btn.click(); 
                        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Botón de acción activado.');
                        return;
                    }
                } 
                
                // Si es un fragmento de texto o título, simula el avance al siguiente elemento.
                if (targetElement.classList.contains('detail-text-fragment') || targetElement.classList.contains('detail-title-slide')) {
                    newIndex = currentIndex + 1;
                    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: Avanzando al siguiente fragmento.');
                    if (newIndex >= totalElements) {
                        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: Ya es el último slide. Retornando.');
                        return; // Si es el último, no hacer nada.
                    }
                }
            } else {
                 debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: No hay contenido enfocable en el slide actual.');
                 return; // No hay nada enfocable en el slide actual
            }
            break;
    }

    if (newIndex !== currentIndex) {
        const newFocusElement = focusableElements[newIndex];

        if (newFocusElement) {
            debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `FORZANDO FOCO NATIVO. Nuevo Índice: ${newIndex}`);
            
            // ⭐️ FIX CLAVE 2: Aplicar foco nativo (sin preventScroll para permitir que el navegador haga scroll) ⭐️
            newFocusElement.focus();
            
            // ⭐️ FIX CLAVE 3: Forzar la actualización visual (blur/sharpness) inmediatamente ⭐️
            nav_base_details._updateDetailFocusState(app);

            // ⭐️ FIX CLAVE 4: Guardar el índice del elemento (no el índice del slide) para el focus trap ⭐️
            app.STATE.lastDetailFocusIndex = newIndex; 
            
        } else {
             debug.logWarn('nav_keyboard_details', `No se encontró elemento enfocable en el índice ${newIndex}.`);
        }
    } else {
        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Índice sin cambios. No se llama a focus.');
    }
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, '--- FIN: _handleDetailNavigation ---');
}

// --- code/nav-keyboard-details.js ---