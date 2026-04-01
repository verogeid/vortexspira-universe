/* --- code/nav-mouse-swipe.js --- */

import * as debug from './debug.js';
import * as data from './data.js';

let _swipeDirection = 'next';

export function setupTouchListeners() {
    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;

        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                    "SWIPE: Vinculando listeners.");

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
    if (this.STATE.isNavigatingBack) return; 

    if (swiper.activeIndex !== swiper.previousIndex) {
        _swipeDirection = swiper.activeIndex > swiper.previousIndex ? 'next' : 'prev';

        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    `⚡️ START SlideChange. Dir: ${_swipeDirection} | Prev: ${swiper.previousIndex} -> Act: ${swiper.activeIndex}`);
    }
};

/**
 * Sincroniza el foco al finalizar una transición de carrusel.
 */
export function handleSlideChangeEnd(swiper) {
    if (!this.STATE.carouselInstance || this.STATE.isNavigatingBack) return; 

    // 🛡️ LÓGICA DE PROTECCIÓN SELECTIVA 🛡️
    // Solo bloqueamos si el teclado declaró explícitamente que tiene el control del foco exacto.
    // En Loops o giros vacíos, dejamos pasar para que el Skipper resuelva el destino.
    if (this.STATE.isKeyboardLockedFocus) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                  "🔒 SWIPE: Foco bloqueado por teclado. Ignorando mouse logic.");

        this.STATE.isKeyboardLockedFocus = false; 

        return; 
    }

    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
              `🏁 END SlideChange. RealIdx: ${swiper.realIndex} | ActiveIdx: ${swiper.activeIndex}`
    );

    const { currentFocusIndex, itemsPorColumna } = this.STATE;

    const isMobile = document.body.getAttribute('data-layout') === 'mobile';

    // Usar la referencia interna de Swiper para saber qué slide es el activo visualmente
    const activeSlideEl = swiper.slides[swiper.activeIndex];
    
    if (!activeSlideEl) {
        debug.logWarn('nav_mouse_swipe', 
            'No se encontró slide activo en swiper.slides');

        return;
    }

    // 🟢 FIX 1: Recogemos TODA la cuadrícula geométrica (incluyendo rellenos)
    const allCardsInSlide = Array.from(activeSlideEl.querySelectorAll('.card'));
    
    // 🟢 FIX 2: Filtramos las válidas SOLO para la lógica del Skipper
    const validCards = allCardsInSlide.filter(
        c => c.dataset.id && c.dataset.tipo !== 'relleno'
    );

    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                `Cards en slide activo: ${validCards.length}`);

    // ⭐️ SKIPPER ⭐️
    // Si la columna está vacía (relleno puro), saltamos automáticamente a la siguiente
    if (validCards.length === 0 && !isMobile) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                    `SWIPE: Columna vacía. Saltando (${_swipeDirection})...`);

        // 🛡️ 1. LEVANTAMOS ESCUDOS: Bloqueamos teclado y ratón
        this.blockUI();

        // 🟢 FIX A11Y: Solo anunciar si hay animación. Si el salto es instantáneo, 
        // sobra el aviso porque el usuario ya estará en la siguiente tarjeta útil.
        if (!data.SWIPER.prefersReducedMotion()) {
            this.announceA11y(this.getString('toast.skipColumn'), 'assertive');

            // Marcar que ya anunciamos esta columna vacía
            this.STATE.emptyColumnAnnounced = true;
        }
        
        _swipeDirection === 'next' ? 
            swiper.slideNext(data.SWIPER.SLIDE_SPEED) : 
            swiper.slidePrev(data.SWIPER.SLIDE_SPEED);

        // 🔴 NO BAJAMOS EL FLAG PADRE: El carrusel continúa en movimiento
        return; 
    }

    // 🛡️ 2. BAJAMOS ESCUDOS: Hemos aterrizado en una columna con datos útiles
    if (this.STATE.isUIBlocked) {
        this.unblockUI();
    }

    // 🟢 LLEGADA EXITOSA DE UN SKIP: Purga física del Loop ANTES de leer geometría
    if (this.STATE.emptyColumnAnnounced) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    "Limpiando anuncio de columna vacía y forzando loopFix.");
                    
        this.STATE.emptyColumnAnnounced = false;
        
        swiper.loopFix();
        swiper.update();
        
        this.announceA11yStop();
    }
    
    // ⭐️ CÁLCULO DE FOCO DESTINO ⭐️
    let targetRow;

    if (this.STATE.forceFocusRow !== undefined && this.STATE.forceFocusRow !== null) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    `Usando forceFocusRow: ${this.STATE.forceFocusRow}`);

        if (this.STATE.forceFocusRow === 'last') {
            targetRow = validCards.length - 1; // Matemáticamente la última fila posible
        } else {
            targetRow = this.STATE.forceFocusRow; 
        }
        this.STATE.forceFocusRow = null; 
    } else {
        targetRow = isMobile ? 0 : currentFocusIndex % itemsPorColumna;

        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    `Calculando targetRow: idx(${currentFocusIndex}) % cols(${itemsPorColumna}) = ${targetRow}`);
    }

    // 🟢 FIX 3: Le pasamos la geometría completa a la función para que el índice coincida
    const newFocusCard = this.findBestFocusInColumn(allCardsInSlide, targetRow);
    
    if (newFocusCard) {
        // 🟢 FIX CRÍTICO: Usar 'data-pos' (Lógico) en lugar de indexOf (Físico)
        // Esto inmuniza la lógica contra los clones de Swiper Loop.
        const newLogicalIndex = parseInt(newFocusCard.dataset.pos, 10);

        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    `Candidato Foco: ID=${newFocusCard.dataset.id} | LogicalPos=${newLogicalIndex} | CurrentIdx=${this.STATE.currentFocusIndex}`);

        if (!isNaN(newLogicalIndex)) {
            if (this.STATE.currentFocusIndex !== newLogicalIndex) {
                debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                            `🚨 CORRIGIENDO FOCO: ${this.STATE.currentFocusIndex} -> ${newLogicalIndex}`);

                this.STATE.currentFocusIndex = newLogicalIndex;
            } 
                
            debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                            `Foco estable (Lógico). Re-sincronizando físico.`);

            this._updateFocus(false); 
        }
    } else {
        debug.logWarn('nav_mouse_swipe', 
                        'No se encontró tarjeta candidata en el slide activo.');
    }
};

/* --- code/nav-mouse-swipe.js --- */