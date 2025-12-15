// --- code/render-mobile.js ---

import * as debug from './debug.js';
import * as data from './data.js';

// ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA MÓVIL ⭐️
// ... (Código omitido)

// ⭐️ 2. FUNCIÓN DE INICIALIZACIÓN MÓVIL (SWIPER VERTICAL) ⭐️
/**
 * Inicializa la instancia de Swiper vertical para móvil.
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _initCarousel_Mobile(initialSwiperSlide, itemsPorColumna, isMobile, swiperId) {
    // 'this' es la instancia de App

    if (!isMobile) return;

    if (this.STATE.carouselInstance) {
        this._destroyCarousel();
    }
    
    const swiperConfig = {
        direction: 'vertical', 
        slidesPerView: 'auto', 
        slidesPerGroup: 1, 
        loop: false, 
        
        initialSlide: initialSwiperSlide, 

        touchRatio: 1, 
        // ⬇️ MODIFICACIONES PARA ASEGURAR EL CONTROL DEL ARRASTRE VERTICAL EN MÓVIL (FreeMode) ⬇️
        simulateTouch: false, // Se deshabilita la simulación de ratón, mejorando el control táctil real.
        touchStartPreventDefault: false, // Permite clics normales antes de un arrastre.
        touchMoveStopPropagation: true, // CLAVE: Impide que el evento de movimiento se propague y active el scroll nativo del body.
        grabCursor: true, 
        // ⬆️ FIN MODIFICACIONES ⬆️
        centeredSlides: false, 
        mousewheel: { enabled: false }, // ⭐️ Deshabilitar la rueda nativa de Swiper ⭐️
        keyboard: { enabled: false }, 
        speed: data.SWIPE_SLIDE_SPEED,
        // ⭐️ Habilitar arrastre libre (freeMode) para permitir ver todos los elementos ⭐️
        freeMode: true, 
        freeModeMomentum: true,
        freeModeSticky: true, // ⭐️ FIX CLAVE: Añadir snap al modo free (Harmoniza con detalle) ⭐️
    };

    this.STATE.carouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);
    
    debug.log('render_mobile', debug.DEBUG_LEVELS.BASIC, `Swiper vertical inicializado en ${swiperId}. Slide inicial: ${initialSwiperSlide}`);

    if (typeof this.setupTouchListeners === 'function') {
        this.setupTouchListeners(); 
    }
};

// --- code/render-mobile.js ---
