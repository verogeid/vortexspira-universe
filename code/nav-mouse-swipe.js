// --- code/nav-mouse-swipe.js ---

import * as debug from './debug.js';
import * as data from './data.js';

let _swipeDirection = 'next';

export function setupTouchListeners() {
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "Configurando listeners de Swiper (Rueda/Tactil).");
    
    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;

        // FIX PARA MÓVIL: Permitir arrastre con un solo dedo y evitar bloqueos
        swiper.params.touchStartPreventDefault = false;
        swiper.params.threshold = 5; // Sensibilidad de arrastre

        if (swiper._slideChangeStartHandler) swiper.off('slideChangeTransitionStart', swiper._slideChangeStartHandler);
        if (swiper._slideChangeEndHandler) swiper.off('slideChangeTransitionEnd', swiper._slideChangeEndHandler);
        
        swiper._slideChangeStartHandler = handleSlideChangeStart.bind(this);
        swiper._slideChangeEndHandler = handleSlideChangeEnd.bind(this);
        
        swiper.on('slideChangeTransitionStart', swiper._slideChangeStartHandler);
        swiper.on('slideChangeTransitionEnd', swiper._slideChangeEndHandler);
    }
};

export function handleSlideChangeStart(swiper) {
    if (this.STATE.keyboardNavInProgress) return;
    if (swiper.activeIndex === swiper.previousIndex) return;
    _swipeDirection = swiper.activeIndex > swiper.previousIndex ? 'next' : 'prev';
};

export function handleSlideChangeEnd(swiper) {
    // 1. Manejar fin de transición forzada
    if (this.STATE.keyboardNavInProgress) {
        this.STATE.keyboardNavInProgress = false;
        this._updateFocus(false); 
        return; 
    }

    const { itemsPorColumna } = this.STATE;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    // 2. Lógica específica para MÓVIL (Rueda/Arrastre)
    if (isMobile) {
        let offset = (this.STATE.historyStack.length > 1) ? 2 : 0;
        const newGlobalIndex = swiper.activeIndex - offset;
        
        if (newGlobalIndex >= 0) {
            this.STATE.currentFocusIndex = newGlobalIndex;
            this._updateFocus(false);
        }
        return;
    }

    // 3. Lógica para Desktop/Tablet (Snap a columna)
    const targetRow = this.STATE.currentFocusIndex % itemsPorColumna;
    const activeSlideEl = swiper.slides[swiper.activeIndex];
    if (!activeSlideEl) return;

    const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
    const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);

    if (!newFocusCard) { 
        if (_swipeDirection === 'next') swiper.slideNext(data.SWIPE_SLIDE_SPEED);
        else swiper.slidePrev(data.SWIPE_SLIDE_SPEED);
        return; 
    }

    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newIndex = allCards.findIndex(card => card === newFocusCard);

    if (newIndex > -1) {
        this.STATE.currentFocusIndex = newIndex;
        const targetSwiperSlide = Math.floor(newIndex / itemsPorColumna) + 1;
        
        if (swiper.realIndex !== targetSwiperSlide) {
            this._updateFocus(false); 
            this.STATE.keyboardNavInProgress = true; 
            swiper.slideToLoop(targetSwiperSlide, data.SWIPE_SLIDE_SPEED);
        } else {
            this._updateFocus(false);
        }
    }
};