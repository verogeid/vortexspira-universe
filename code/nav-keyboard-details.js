// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 
import * as debug from './debug.js'; 

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const app = this;
    const swiper = app.STATE.detailCarouselInstance;
    if (!swiper) return;

    // Usamos el índice del slide activo como índice de foco.
    let currentIndex = swiper.activeIndex;
    let newIndex = currentIndex;
    const totalSlides = swiper.slides.length; 
    
    switch (key) {
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            // No hacemos wrap. Nos quedamos en el primer slide.
            if (newIndex < 0) newIndex = 0; 
            break;
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            // No hacemos wrap. Nos quedamos en el último slide.
            if (newIndex >= totalSlides) newIndex = totalSlides - 1; 
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            // Ignoramos el movimiento lateral.
            return; 
        case 'Enter':
        case ' ':
            // Lógica para Enter/Space 
            const focusedSlide = swiper.slides[swiper.activeIndex];
            const focusedContent = focusedSlide ? focusedSlide.querySelector('.detail-action-item, .detail-text-fragment') : null;
            
            if (focusedContent && focusedContent.classList.contains('detail-action-item')) {
                const btn = focusedContent.querySelector('.detail-action-btn');
                if (btn && !btn.classList.contains('disabled')) {
                    btn.click(); 
                    return;
                }
            } else if (focusedContent) {
                 // Si está sobre texto/título, simula el avance al siguiente slide.
                 newIndex = currentIndex + 1;
                 if (newIndex >= totalSlides) return; // Si es el último, no hacer nada.
            } else {
                 return; // No hay nada enfocable en el slide actual
            }
            break;
    }

    if (newIndex !== currentIndex) {
        // La clave es usar slideTo para forzar el snap, lo cual llama a slideChangeTransitionEnd y _updateDetailFocusState.
        swiper.slideTo(newIndex, 300);
    }
}

// --- code/nav-keyboard-details.js ---