// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 
import * as debug from './debug.js'; // Importar debug

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const app = this;
    const swiper = app.STATE.detailCarouselInstance;
    if (!swiper) return;

    const focusedSlide = swiper.slides[swiper.activeIndex];
    const focusedContent = focusedSlide ? focusedSlide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide') : null;

    // Lógica para que Swiper gestione el movimiento vertical
    switch (key) {
        case 'ArrowUp':
            swiper.slidePrev(app.STATE.keyboardNavInProgress ? 100 : 300); // Velocidad ligeramente más rápida para teclado
            app.STATE.keyboardNavInProgress = true;
            return;
        case 'ArrowDown':
            swiper.slideNext(app.STATE.keyboardNavInProgress ? 100 : 300);
            app.STATE.keyboardNavInProgress = true;
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
                    // Simular clic en el elemento interactivo real (el <a>)
                    btn.click(); 
                    return;
                }
            } else if (focusedContent && focusedContent.classList.contains('detail-title-slide') || focusedContent && focusedContent.classList.contains('detail-text-fragment')) {
                 // Si está sobre el título/fragmento, avanzamos al siguiente slide (simula la lectura).
                 swiper.slideNext(300);
            }
            break;
    }
    
    // Si la tecla no causó una acción de Swiper, liberamos la bandera.
    app.STATE.keyboardNavInProgress = false; 
}

// --- code/nav-keyboard-details.js ---