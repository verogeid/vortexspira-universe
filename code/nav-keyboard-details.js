// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 
import * as debug from './debug.js'; 

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const app = this;
    const swiper = app.STATE.detailCarouselInstance;
    if (!swiper) return;

    const focusedSlide = swiper.slides[swiper.activeIndex];
    const focusedContent = focusedSlide ? focusedSlide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide') : null;

    switch (key) {
        case 'ArrowUp':
            // Llama a slidePrev para mover el foco/snap al elemento adyacente anterior.
            swiper.slidePrev(300);
            return;
        case 'ArrowDown':
            // Llama a slideNext para mover el foco/snap al elemento adyacente siguiente.
            swiper.slideNext(300);
            return;
        case 'ArrowLeft':
        case 'ArrowRight':
            // Ignoramos el movimiento lateral en la vista de detalle
            return; 
        case 'Enter':
        case ' ':
            // Si está sobre una acción, la activamos.
            if (focusedContent && focusedContent.classList.contains('detail-action-item')) {
                const btn = focusedContent.querySelector('.detail-action-btn');
                if (btn && !btn.classList.contains('disabled')) {
                    btn.click(); 
                    return;
                }
            } else if (focusedContent && (focusedContent.classList.contains('detail-title-slide') || focusedContent.classList.contains('detail-text-fragment'))) {
                 // Si está sobre el título/fragmento, avanzamos al siguiente slide (simula la lectura).
                 swiper.slideNext(300);
            }
            break;
    }
}

// --- code/nav-keyboard-details.js ---