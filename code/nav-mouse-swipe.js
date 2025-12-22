/* --- code/nav-mouse-swipe.js --- */

import * as debug from './debug.js';
import * as data from './data.js';

let _swipeDirection = 'next';

export function setupTouchListeners() {
    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "SWIPE: Vinculando listeners.");
        swiper.on('slideChangeTransitionStart', handleSlideChangeStart.bind(this));
        swiper.on('slideChangeTransitionEnd', handleSlideChangeEnd.bind(this));
    }
    this.DOM.track.onclick = (e) => this._handleTrackClick(e);
};

export function detachSwiperEvents(swiper) {
    if (!swiper) return;
    swiper.off('slideChangeTransitionStart');
    swiper.off('slideChangeTransitionEnd');
}

export function handleSlideChangeStart(swiper) {
    if (this.STATE.keyboardNavInProgress || this.STATE.isNavigatingBack) return; 
    _swipeDirection = swiper.activeIndex > swiper.previousIndex ? 'next' : 'prev';
};

/**
 * Sincroniza el foco al finalizar una transición de carrusel.
 */
export function handleSlideChangeEnd(swiper) {
    if (!this.STATE.carouselInstance || this.STATE.isNavigatingBack) return; 

    const { currentFocusIndex, itemsPorColumna } = this.STATE;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    // ⭐️ CORRECCIÓN: Buscamos el slide activo REAL en el DOM, no por índice de Swiper
    const activeSlideEl = swiper.el.querySelector('.swiper-slide-active');
    
    if (!activeSlideEl) return;

    // Filtramos tarjetas reales
    const allCardsInside = Array.from(activeSlideEl.querySelectorAll('.card'));
    const columnCards = allCardsInside.filter(c => c.dataset.id && c.dataset.tipo !== 'relleno');

    debug.logGroupCollapsed('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "SWIPE: Inspeccionando Slide Activo REAL");
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "Elemento:", activeSlideEl);
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "Data-Index:", activeSlideEl.dataset.swiperSlideIndex);
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "IDs encontrados:", columnCards.map(c => c.dataset.id));
    debug.logGroupEnd('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC);

    if (columnCards.length === 0 && !isMobile) { 
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "SWIPE: Columna vacía. Corrigiendo...");
        _swipeDirection === 'next' ? swiper.slideNext(data.SWIPE_SLIDE_SPEED) : swiper.slidePrev(data.SWIPE_SLIDE_SPEED);
        return; 
    }

    let targetRow = isMobile ? 0 : currentFocusIndex % itemsPorColumna;
    const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);
    
    if (newFocusCard) {
        const allValidCards = Array.from(this.DOM.track.querySelectorAll('.card:not([data-tipo="relleno"])'));
        const newGlobalIndex = allValidCards.indexOf(newFocusCard);
        if (newGlobalIndex > -1 && this.STATE.currentFocusIndex !== newGlobalIndex) {
            this.STATE.currentFocusIndex = newGlobalIndex;
            this._updateFocus(false); 
        }
    }
};
/* --- code/nav-mouse-swipe.js --- */