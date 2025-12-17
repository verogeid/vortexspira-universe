// --- code/nav-mouse-swipe.js ---

import * as debug from './debug.js';
import * as data from './data.js';

let _swipeDirection = 'next';

// ⭐️ 1. CONFIGURACIÓN DE LISTENERS TÁCTILES (SWIPER) ⭐️
/**
 * Configura los listeners de Swiper (táctil y rueda de ratón).
 * Se llama con .call(this) desde _initCarousel_Swipe.
 */
export function setupTouchListeners() {
    // ⭐️ DIAGNÓSTICO CLAVE: Si ves este log, la función se está llamando. ⭐️
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "DIAGNÓSTICO: setupTouchListeners llamado.");
    
    // 'this' es la instancia de App
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;

    if (this.STATE.carouselInstance) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, "Swiper instance FOUND. Attaching listeners.");
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
        
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "Listeners de Swiper (táctil/rueda) configurados.");
    } else {
        debug.logError('nav_mouse_swipe', "ERROR: this.STATE.carouselInstance es NULL. Los listeners no se adjuntaron.");
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
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, `Transición iniciada. Dirección: ${_swipeDirection}. Activo: ${swiper.activeIndex}`);
};


// ⭐️ 3. HANDLER: Comprobar contenido, saltar si está vacío y aplicar snap-to-center ⭐️
export function handleSlideChangeEnd(swiper) {
    // 'this' es la instancia de App
    
    // ❗️ 1. PASO 2: Manejar el final de una transición FORZADA (por salto o re-centrado) ❗️
    if (this.STATE.keyboardNavInProgress) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "FIN de transición forzada (Centrado o Salto). Aplicando foco definitivo.");
        this.STATE.keyboardNavInProgress = false;
        // La transición forzada ha terminado. Aplicamos el foco definitivo y salimos.
        this._updateFocus(false); 
        return; 
    }

    // --- PASO 1: Inicio de un nuevo gesto (Swipe o Rueda de Ratón) ---
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "INICIO de nuevo gesto. Evaluando columna.");
    
    const { currentFocusIndex, itemsPorColumna } = this.STATE;
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    
    let targetRow;
    if (isMobile) {
        targetRow = 0; 
    } else {
        // En Desktop/Tablet, calculamos la fila objetivo (mantener la misma fila relativa).
        targetRow = currentFocusIndex % itemsPorColumna;
    }
    debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, `Target Row (Fila de origen): ${targetRow}. Swiper Index: ${swiper.activeIndex}`);

    const activeSlideEl = swiper.slides[swiper.activeIndex];
    if (!activeSlideEl) {
        debug.logError('nav_mouse_swipe', "Error: Slide activo no encontrado.");
        return;
    }

    const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
    if (columnCards.length === 0) return;

    // Busca la mejor tarjeta para enfocar en la columna activa 
    const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);


    // ⭐️ 2. LÓGICA DE SALTO (Desktop/Tablet: Si la columna NO tiene elementos enfocables) ⭐️
    if (!newFocusCard && !isMobile) { 
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, "Columna actual VACÍA. Forzando salto a la siguiente/anterior.");
        
        if (_swipeDirection === 'next') {
            swiper.slideNext(data.SWIPE_SLIDE_SPEED);
        } else {
            swiper.slidePrev(data.SWIPE_SLIDE_SPEED);
        }
        // Retornamos. El próximo slideChangeTransitionEnd continuará la evaluación.
        return; 
    }
    
    // Si no hay tarjeta enfocable (sólo debería ocurrir si estamos en el modo raíz si el contenido está vacío)
    if (!newFocusCard) {
         debug.logWarn('nav_mouse_swipe', "No hay tarjetas enfocables en la columna de destino.");
         return; 
    }

    // 3. ENCONTRAR ÍNDICE GLOBAL Y GESTIONAR FOCO/CENTRALIDAD
    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newGlobalIndex = allCards.findIndex(card => card === newFocusCard);

    if (newGlobalIndex > -1) {
        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, `Tarjeta enfocable encontrada. Índice global: ${newGlobalIndex}`);
        this.STATE.currentFocusIndex = newGlobalIndex;

        if (!isMobile) {
            const targetSwiperSlide = Math.floor(newGlobalIndex / itemsPorColumna) + 1; // +1 por el slide de relleno inicial
            
            // ⭐️ LÓGICA DE ESTABILIDAD: Si es inestable, forzamos SNAP. Si es estable, caemos al paso 4. ⭐️
            if (swiper.realIndex !== targetSwiperSlide) {
                 
                // ⭐️ FIX CLAVE: Aplicamos foco inmediatamente antes de forzar el snap. ⭐️
                this._updateFocus(false); 

                debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, `Snap requerido. Forzando centrado a slide: ${targetSwiperSlide}. Current realIndex: ${swiper.realIndex}`);

                // 1. Marcar la bandera.
                this.STATE.keyboardNavInProgress = true; 
                // 2. Forzar el centrado. El foco se reaplicará en el próximo evento (Paso 2).
                swiper.slideToLoop(targetSwiperSlide, data.SWIPE_SLIDE_SPEED);
                return; 
            }
             
            // STABLE: Si el realIndex ya es el correcto, la columna es estable.
             debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.DEEP, 'Columna estable. Aplicando foco inmediato.');
        } 
        
        // 4. APLICAR FOCO FINAL (Para móvil o columna estable en desktop/tablet)
        this._updateFocus(false); // Método delegado
    } else {
         debug.logError('nav_mouse_swipe', "Error: Tarjeta enfocable encontrada en el slide, pero no en la lista global.");
    }
};

// --- code/nav-mouse-swipe.js ---
