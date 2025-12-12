// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 
import * as debug from './debug.js'; 
import * as data from './data.js'; // Necesario para data.SWIPE_SLIDE_SPEED

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const app = this;
    const swiper = app.STATE.detailCarouselInstance;
    if (!swiper) return;

    // ⭐️ El bloqueo de la bandera fue eliminado aquí ya que la navegación es síncrona. ⭐️
    // La bandera solo se verifica y se gestiona en nav-keyboard-base.js para la rueda de ratón.
    
    const focusableElements = nav_base_details._getFocusableDetailElements(app);
    const totalElements = focusableElements.length;
    if (totalElements === 0) return;
    
    // ⭐️ Nuevo: Determinar el índice actual basado en el índice guardado (que es el índice en la lista enfocable) ⭐️
    let currentIndex = app.STATE.lastDetailFocusIndex || 0;
    
    // Validación de índice guardado
    if (currentIndex < 0 || currentIndex >= totalElements) {
         currentIndex = 0;
    }

    let newIndex = currentIndex;
    
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `--- INICIO: _handleDetailNavigation (Key: ${key}) ---`);
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `Current Focus Index (List): ${currentIndex}, Total Elements: ${totalElements}`);
    
    switch (key) {
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            // ⭐️ FIX CLAVE: Wrap-around para ArrowUp ⭐️
            if (newIndex < 0) newIndex = totalElements - 1; 
            break;
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            // ⭐️ FIX CLAVE: Wrap-around para ArrowDown ⭐️
            if (newIndex >= totalElements) newIndex = 0; 
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
                        // ⭐️ FIX CLAVE: Wrap-around en Enter/Space ⭐️
                        newIndex = 0; 
                        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: Saltando al primer fragmento.');
                    }
                }
            } else {
                 debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: No hay contenido enfocable en el índice actual.');
                 return; 
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