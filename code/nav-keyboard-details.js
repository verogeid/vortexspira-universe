// --- code/nav-keyboard-details.js ---

import * as debug from './debug.js';
import * as data from './data.js';

/**
 * Maneja la navegación por teclado dentro de la vista de detalles.
 * Las flechas Arriba/Abajo mueven el carrusel vertical.
 */
export function handleDetailKeydown(e) {
    const swiper = this.STATE.detailCarouselInstance;
    if (!swiper) return;

    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `Tecla pulsada en detalle: ${e.key}`);

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        swiper.slideNext();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        swiper.slidePrev();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        this._handleVolverClick();
    }
};

/**
 * Sincroniza el foco automáticamente cuando el carrusel de detalles cambia.
 * Esto asegura que la rueda del ratón y el touch actualicen el foco visual.
 */
export function setupDetailCarouselSync(appInstance) {
    const swiper = appInstance.STATE.detailCarouselInstance;
    if (!swiper) return;

    swiper.on('slideChangeTransitionEnd', () => {
        const activeSlide = swiper.slides[swiper.activeIndex];
        if (!activeSlide) return;

        // Buscamos el elemento que debe recibir el foco en el slide actual
        const focusable = activeSlide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical');
        
        if (focusable) {
            debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, "Sincronizando foco tras movimiento de Swiper.");
            // Usamos preventScroll para que el scroll nativo no interfiera con el centrado de Swiper
            focusable.focus({ preventScroll: true });
        }
    });
}

// --- code/nav-keyboard-details.js ---