// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; // ⬇️ MODIFICACIÓN: Usar nav_base_details ⬇️

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const activeElement = document.activeElement;
    
    // Obtenemos todos los elementos navegables del módulo nav-details
    const focusableElements = nav_base_details._getFocusableDetailElements(this) // ⬇️ MODIFICACIÓN: Pasar 'this' ⬇️
        .filter(el => 
            !el.classList.contains('card-volver-vertical') && 
            el.id !== 'card-volver-fija-elemento'
        );

    let currentIndex = focusableElements.indexOf(activeElement);
    const maxIndex = focusableElements.length - 1;
    
    // Si el foco está en el título o en un lugar perdido, lo movemos al primer fragmento de texto o al inicio.
    if (currentIndex === -1) {
        const firstElement = focusableElements.find(el => el.classList.contains('detail-text-fragment')) || focusableElements[0];
        if (firstElement) {
            firstElement.focus();
            // Scroll al inicio si es el primer elemento.
            if (this.DOM.detalleContenido) {
                 this.DOM.detalleContenido.scrollTop = 0;
            } else {
                 firstElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
            }
        }
        return;
    }
    
    let newIndex = currentIndex;

    switch (key) {
        case 'ArrowUp':
            newIndex = Math.max(0, currentIndex - 1);
            break;
        case 'ArrowDown':
            newIndex = Math.min(maxIndex, currentIndex + 1);
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            // Ignoramos el movimiento lateral para no romper el orden secuencial
            return; 
        case 'Enter':
        case ' ':
            // Si está sobre un fragmento de texto, avanza al siguiente (simula la lectura).
            if (activeElement.classList.contains('detail-text-fragment')) {
                newIndex = Math.min(maxIndex, currentIndex + 1);
            } 
            // Si está sobre un botón de acción, lo clicamos (salvo si está deshabilitado).
            // El elemento enfocado es el div .detail-action-item, el botón es su hijo 'a.detail-action-btn'
            else if (activeElement.classList.contains('detail-action-item')) {
                const btn = activeElement.querySelector('.detail-action-btn');
                if (btn && !btn.classList.contains('disabled')) {
                    // Simular clic en el elemento interactivo real (el <a>)
                    btn.click(); 
                    return;
                }
            }
            break;
    }
    
    // Aplicar el nuevo foco
    if (newIndex !== currentIndex && focusableElements[newIndex]) {
        const elementToFocus = focusableElements[newIndex];
        elementToFocus.focus();
        
        // ⭐️ CORRECCIÓN CLAVE: Forzar el scroll para que el elemento enfocado esté visible (block: 'center' es más seguro) ⭐️
        if (newIndex === 0 && elementToFocus.classList.contains('detail-text-fragment') && this.DOM.detalleContenido) {
             this.DOM.detalleContenido.scrollTop = 0;
        } else {
             // Usar 'center' para mantenerlo visible en el centro/medio del viewport si es posible
             elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        }
    }
}

// --- code/nav-keyboard-details.js ---