// --- code/nav-mouse-swipe.js ---

import * as debug from './debug.js';
import * as data from './data.js';

let _swipeDirection = 'next';

export function setupTouchListeners() {
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "setupTouchListeners: Vinculando eventos Swiper.");
    
    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;
        swiper.on('slideChangeTransitionStart', handleSlideChangeStart.bind(this));
        swiper.on('slideChangeTransitionEnd', handleSlideChangeEnd.bind(this));
    }
};

export function handleSlideChangeStart(swiper) {
    if (this.STATE.keyboardNavInProgress) return;
    _swipeDirection = swiper.activeIndex > swiper.previousIndex ? 'next' : 'prev';
};

export function handleSlideChangeEnd(swiper) {
    // Liberamos el flag de teclado si venimos de una interacción de flechas/rueda en el carrusel
    if (this.STATE.keyboardNavInProgress) {
        this.STATE.keyboardNavInProgress = false;
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, "Flag liberado tras transitionEnd de Swiper.");
        this._updateFocus(false); 
        return; 
    }

    const { currentFocusIndex, itemsPorColumna } = this.STATE;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    let targetRow = isMobile ? 0 : currentFocusIndex % itemsPorColumna;
    const activeSlideEl = swiper.slides[swiper.activeIndex];
    if (!activeSlideEl) return;

    const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
    if (columnCards.length === 0) return;

    // ⭐️ RESTAURADO: Lógica de búsqueda de mejor foco en la columna ⭐️
    const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);

    // ⭐️ RESTAURADO: Lógica de salto si la columna es solo de relleno (Tablet/Desktop) ⭐️
    if (!newFocusCard && !isMobile) { 
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "Columna vacía. Saltando...");
        _swipeDirection === 'next' ? swiper.slideNext(data.SWIPE_SLIDE_SPEED) : swiper.slidePrev(data.SWIPE_SLIDE_SPEED);
        return; 
    }
    
    if (!newFocusCard) return; 

    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newGlobalIndex = allCards.indexOf(newFocusCard);

    if (newGlobalIndex > -1) {
        this.STATE.currentFocusIndex = newGlobalIndex;
        this._updateFocus(false); 
    }
};

// --- code/nav-mouse-swipe.js ---