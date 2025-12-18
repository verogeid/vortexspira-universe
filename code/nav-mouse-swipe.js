// --- code/nav-mouse-swipe.js ---

import * as debug from './debug.js';
import * as data from './data.js';

let _swipeDirection = 'next';

export function setupTouchListeners() {
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
    // Si estamos navegando por teclado o la instancia no es válida, ignoramos
    if (!this.STATE.carouselInstance || this.STATE.keyboardNavInProgress) {
        return; 
    }

    const { currentFocusIndex, itemsPorColumna } = this.STATE;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    let targetRow = isMobile ? 0 : currentFocusIndex % itemsPorColumna;
    const activeSlideEl = swiper.slides[swiper.activeIndex];
    if (!activeSlideEl) return;

    const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
    if (columnCards.length === 0) return;

    // Buscamos si hay elementos enfocables en la columna centrada
    const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);

    // Navegación automática SOLO si la columna está vacía tras una acción del usuario
    if (!newFocusCard && !isMobile) { 
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "Columna vacía. Saltando...");
        _swipeDirection === 'next' ? swiper.slideNext(data.SWIPE_SLIDE_SPEED) : swiper.slidePrev(data.SWIPE_SLIDE_SPEED);
        return; 
    }
    
    if (!newFocusCard) return; 

    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newGlobalIndex = allCards.indexOf(newFocusCard);

    if (newGlobalIndex > -1 && this.STATE.currentFocusIndex !== newGlobalIndex) {
        this.STATE.currentFocusIndex = newGlobalIndex;
        this._updateFocus(false); // Sincroniza visualmente sin mover el carrusel
    }
};

// --- code/nav-mouse-swipe.js ---