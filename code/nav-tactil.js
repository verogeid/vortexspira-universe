// --- code/nav-tactil.js ---

import * as debug from './debug.js';
import * as data from './data.js';

let _swipeDirection = 'next';

// ⭐️ 1. CONFIGURACIÓN DE LISTENERS TÁCTILES (SWIPER) ⭐️
/**
 * Configura los listeners de Swiper (táctil y rueda de ratón).
 * Se llama con .call(this) desde _initCarousel_Swipe.
 */
export function setupTouchListeners() {
    // 'this' es la instancia de App
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;

    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;

        // --- Limpiar listeners antiguos ---
        if (swiper._slideChangeStartHandler) {
             swiper.off('slideChangeTransitionStart', swiper._slideChangeStartHandler);
        }
        if (swiper._slideChangeEndHandler) {
             swiper.off('slideChangeTransitionEnd', swiper._slideChangeEndHandler);
        }
        
        // --- Guardar handlers con bind(this) para mantener el contexto ---
        swiper._slideChangeStartHandler = handleSlideChangeStart.bind(this);
        swiper._slideChangeEndHandler = handleSlideChangeEnd.bind(this);
        
        // ⭐️ Escuchar DOS eventos ⭐️
        swiper.on('slideChangeTransitionStart', swiper._slideChangeStartHandler);
        swiper.on('slideChangeTransitionEnd', swiper._slideChangeEndHandler);
        
        debug.log('nav_tactil', debug.DEBUG_LEVELS.BASIC, "Listeners de Swiper (táctil) configurados.");
    }
};

// ⭐️ 2. HANDLER: Detectar la dirección del swipe ⭐️
export function handleSlideChangeStart(swiper) {
    // 'this' es la instancia de App
    if (this.STATE.keyboardNavInProgress) return;

    if (swiper.activeIndex === swiper.previousIndex) return;
    _swipeDirection = swiper.activeIndex > swiper.previousIndex ? 'next' : 'prev';

    // Manejar el salto del loop (Solo para horizontal/loop)
    if (swiper.params.loop) {
        if (swiper.previousIndex === swiper.slides.length - 1 && swiper.activeIndex === 0) {
            _swipeDirection = 'next';
        }
        if (swiper.previousIndex === 0 && swiper.activeIndex === swiper.slides.length - 1) {
            _swipeDirection = 'prev';
        }
    }
};


// ⭐️ 3. HANDLER: Comprobar contenido y saltar si está vacío ⭐️
export function handleSlideChangeEnd(swiper) {
    // 'this' es la instancia de App
    
    // ❗️ 1. COMPROBAR LA BANDERA DEL TECLADO ❗️
    if (this.STATE.keyboardNavInProgress) {
        this.STATE.keyboardNavInProgress = false;
        return;
    }

    // --- El resto es la lógica de SWIPE TÁCTIL (o Rueda de Ratón) ---
    
    const { currentFocusIndex, itemsPorColumna } = this.STATE;
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    
    let targetRow;
    if (isMobile) {
        // En móvil (1xN), el targetRow es siempre 0.
        targetRow = 0; 
    } else {
        // En Desktop/Tablet, calculamos la fila objetivo.
        targetRow = currentFocusIndex % itemsPorColumna;
    }

    const activeSlideEl = swiper.slides[swiper.activeIndex];
    if (!activeSlideEl) return;

    // En móvil, la columna de tarjetas es directamente el swiper-slide
    const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
    if (columnCards.length === 0) return;

    // Asumimos que findBestFocusInColumn es un helper delegado en la instancia
    const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);


    // ⭐️ 2. LÓGICA DE SALTO (SI ESTÁ VACÍO) ⭐️
    if (!newFocusCard && !isMobile) { // Solo saltamos automáticamente en Desktop/Tablet
        debug.logWarn('nav_tactil', "Columna vacía, saltando a la siguiente...");
        if (_swipeDirection === 'next') {
            swiper.slideNext(data.SWIPE_SLIDE_SPEED);
        } else {
            swiper.slidePrev(data.SWIPE_SLIDE_SPEED);
        }
        return; 
    }
    
    // Si estamos en móvil y no hay tarjeta enfocable, simplemente no hacemos nada (el foco se queda donde estaba)
    if (!newFocusCard && isMobile) return; 

    // 3. Encontrar el índice GLOBAL de esta nueva tarjeta
    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newGlobalIndex = allCards.findIndex(card => card === newFocusCard);

    if (newGlobalIndex > -1) {
        // 4. Actualizar el estado y el foco
        this.STATE.currentFocusIndex = newGlobalIndex;
        
        // El deslizamiento YA ocurrió (drag o rueda). Solo sincronizamos el foco.
        this._updateFocus(false); // Método delegado
    }
};

// --- code/nav-tactil.js ---