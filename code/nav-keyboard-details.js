// --- code/nav-keyboard-details.js ---

import * as debug from './debug.js';
import * as data from './data.js';

export function handleDetailKeydown(e) {
    const swiper = this.STATE.detailCarouselInstance;
    if (!swiper) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        swiper.slideNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        swiper.slidePrev();
    } else if (e.key === 'Escape') {
        this._handleVolverClick();
    }
};

/**
 * Vincula el cambio de slide de Swiper (Rueda/Touch) con el sistema de foco.
 */
export function setupDetailCarouselSync(appInstance) {
    const swiper = appInstance.STATE.detailCarouselInstance;
    if (!swiper) return;

    swiper.on('slideChangeTransitionEnd', () => {
        const activeSlide = swiper.slides[swiper.activeIndex];
        if (!activeSlide) return;

        // Buscar el primer elemento que debe recibir el foco
        const focusable = activeSlide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical');
        
        if (focusable) {
            debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, "Sincronizando foco tras movimiento de Swiper.");
            focusable.focus({ preventScroll: true });
        }
    });
}

// --- code/nav-keyboard-details.js ---