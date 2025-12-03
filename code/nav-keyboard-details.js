// --- code/nav-keyboard-details.js ---

import * as nav_details from './nav-details.js'; // Necesario para _getFocusableDetailElements

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const activeElement = document.activeElement;
    
    // Obtenemos todos los elementos navegables del módulo nav-details
    const focusableElements = nav_details._getFocusableDetailElements.call(this)
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
            firstElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // ⭐️ AÑADIDO: Scroll al primer elemento ⭐️
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
            else if (activeElement.classList.contains('detail-action-btn') && !activeElement.classList.contains('disabled')) {
                activeElement.click(); 
                return;
            }
            break;
    }
    
    // Aplicar el nuevo foco
    if (newIndex !== currentIndex && focusableElements[newIndex]) {
        const elementToFocus = focusableElements[newIndex];
        elementToFocus.focus();
        // ⭐️ CORRECCIÓN CLAVE: Scroll al elemento enfocado ⭐️
        elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}