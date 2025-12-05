// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const appInstance = this;
    const activeElement = document.activeElement;
    // ⭐️ Nuevo: Referencia a la instancia del Swiper de Detalle ⭐️
    const swiper = appInstance.STATE.detailCarouselInstance;
    
    if (!swiper) return;

    // Obtenemos todos los elementos enfocables del módulo nav-details (fragmentos + filas de acción)
    const focusableElements = nav_base_details._getFocusableDetailElements(appInstance)
        .filter(el => 
            !el.classList.contains('card-volver-vertical') && 
            el.id !== 'card-volver-fija-elemento'
        );

    let currentIndex = focusableElements.indexOf(activeElement);
    const maxIndex = focusableElements.length - 1;
    
    // 1. Manejo del foco inicial o perdido (siempre lo movemos al primer slide enfocable)
    if (currentIndex === -1) {
        const firstElement = focusableElements.find(el => el.classList.contains('detail-text-fragment')) || focusableElements[0];
        if (firstElement) {
             firstElement.focus();
             // Intentamos hacer scroll al inicio del Swiper
             swiper.slideTo(0, 300);
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
            // Ignoramos el movimiento lateral para no romper el orden secuencial vertical
            return; 
        case 'Enter':
        case ' ':
            // Simula la lectura (avanza al siguiente fragmento) o el clic del botón de acción
            if (activeElement.classList.contains('detail-text-fragment')) {
                newIndex = Math.min(maxIndex, currentIndex + 1);
            } 
            else if (activeElement.classList.contains('detail-action-item')) {
                const btn = activeElement.querySelector('.detail-action-btn');
                if (btn && !btn.classList.contains('disabled')) {
                    btn.click(); 
                    return;
                }
            }
            break;
    }
    
    // 2. Aplicar el nuevo foco y sincronizar el slide del Swiper
    if (newIndex !== currentIndex && focusableElements[newIndex]) {
        const elementToFocus = focusableElements[newIndex];
        elementToFocus.focus();
        
        // ⭐️ CLAVE: El elemento está dentro de un slide. Hacemos que el Swiper se mueva a ese slide.
        const slideEl = elementToFocus.closest('.swiper-slide');
        if (slideEl) {
            const slideIndex = swiper.slides.indexOf(slideEl);
            if (slideIndex !== -1) {
                // Usamos slideTo para el movimiento suave.
                swiper.slideTo(slideIndex, 300);
            }
        }
    }
}

// --- code/nav-keyboard-details.js ---