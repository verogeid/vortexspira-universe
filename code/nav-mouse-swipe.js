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
    if (swiper.isKeyboardLockedFocus) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                    "🔒 SWIPE: Foco bloqueado por teclado. Ignorando mouse logic.");

        swiper.isKeyboardLockedFocus = false; // Reset del candado
        return; 
    }

    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                `🏁 END SlideChange. RealIdx: ${swiper.realIndex} | ActiveIdx: ${swiper.activeIndex}`);

    const { currentFocusIndex, itemsPorColumna } = this.STATE;

    const isMobile = document.body.getAttribute('data-layout') === 'mobile';

    // Usar la referencia interna de Swiper para saber qué slide es el activo visualmente
    const activeSlideEl = swiper.slides[swiper.activeIndex];
    
    if (!activeSlideEl) {
        debug.logWarn('nav_mouse_swipe', 'No se encontró slide activo en swiper.slides');

        return;
    }

    // Filtramos tarjetas reales dentro del slide activo
    const columnCards = Array.from(activeSlideEl.querySelectorAll('.card[data-id]:not([data-tipo="relleno"])'));

    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                `Cards en slide activo: ${columnCards.length}`);

    // ⭐️ SKIPPER ⭐️
    // Si la columna está vacía (relleno puro), saltamos automáticamente a la siguiente
    if (columnCards.length === 0 && !isMobile) { 
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                    `SWIPE: Columna vacía. Saltando (${_swipeDirection})...`);

        // 🟢 A11Y FIX: Notificar al usuario que estamos saltando una zona vacía
        this.announceA11y(this.getString('toast.skipColumn'), 'assertive');

        _swipeDirection === 'next' ? swiper.slideNext(data.SWIPER.SLIDE_SPEED) : swiper.slidePrev(data.SWIPER.SLIDE_SPEED);
        return; 
    }

    // 🟢 Si hemos llegado hasta aquí, es que hay contenido. Ocultamos el aviso de salto.
    this.announceA11yStop();

    // ⭐️ CÁLCULO DE FOCO DESTINO ⭐️
    let targetRow;

    if (this.STATE.forceFocusRow !== undefined && this.STATE.forceFocusRow !== null) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    `Usando forceFocusRow: ${this.STATE.forceFocusRow}`);

        if (this.STATE.forceFocusRow === 'last') {
            targetRow = columnCards.length - 1; 
        } else {
            targetRow = this.STATE.forceFocusRow; 
        }
        this.STATE.forceFocusRow = null; 
    } else {
        targetRow = isMobile ? 0 : currentFocusIndex % itemsPorColumna;

        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    `Calculando targetRow: idx(${currentFocusIndex}) % cols(${itemsPorColumna}) = ${targetRow}`);
    }

    const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);
    
    if (newFocusCard) {
        // 🟢 FIX CRÍTICO: Usar 'data-pos' (Lógico) en lugar de indexOf (Físico)
        // Esto inmuniza la lógica contra los clones de Swiper Loop.
        const newLogicalIndex = parseInt(newFocusCard.dataset.pos, 10);

        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                    `Candidato Foco: ID=${newFocusCard.dataset.id} | LogicalPos=${newLogicalIndex} | CurrentIdx=${this.STATE.currentFocusIndex}`);

        if (!isNaN(newLogicalIndex)) {
            if (this.STATE.currentFocusIndex !== newLogicalIndex) {
                debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.IMPORTANT, 
                            `🚨 CORRIGIENDO FOCO: ${this.STATE.currentFocusIndex} -> ${newLogicalIndex}`);

                this.STATE.currentFocusIndex = newLogicalIndex;
            } else {
                debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                            `Foco estable (Lógico). Re-sincronizando físico.`);
            }
            this._updateFocus(false); 

            // 🚀 SILENT RESET (EL TRUCO DE MAGIA) 🚀
            // Si estamos en un "Clon" (activeIndex != realIndex ajustado), volvemos al original SIN animación.
            // Esto evita que los índices crezcan y asegura que siempre estemos en territorio seguro.
            // Swiper loop mode intenta hacerlo, pero a veces falla en saltos rápidos. Lo forzamos aquí.
            if (swiper.params.loop) {
                // Pequeño delay para dejar que el renderizado del foco termine
                requestAnimationFrame(() => {
                    swiper.slideToLoop(swiper.realIndex, 0); // 0ms = Instantáneo
                    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 
                        `🔄 SILENT LOOP FIX: Reubicado en slide lógico ${swiper.realIndex}`);
                });
            }
        }
    } else {
        debug.logWarn('nav_mouse_swipe', 
                        'No se encontró tarjeta candidata en el slide activo.');
    }
};

/* --- code/nav-mouse-swipe.js --- */