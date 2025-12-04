// --- code/render-mobile.js ---

import * as debug from './debug.js';
import * as data from './data.js';

// ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA MÓVIL ⭐️
/**
 * Genera el HTML para la vista móvil (lista vertical).
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _generateCardHTML_Mobile(items, itemsPerColumna) {
    // 'this' es la instancia de App
    let html = '';

    // En móvil, es una lista vertical simple.
    for (const nodo of items) {

        if (nodo.tipoEspecial === 'volver-vertical' || nodo.tipoEspecial === 'breadcrumb-vertical') {
            html += `<div class="swiper-slide">${this._generarTarjetaHTML(nodo, true, false, nodo.tipoEspecial)}</div>`; // Método delegado
            continue;
        }

        const esRelleno = nodo.tipo === 'relleno';
        const estaActivo = esRelleno ? false : this._tieneContenidoActivo(nodo.id); // Método delegado

        html += `<div class="swiper-slide">${this._generarTarjetaHTML(nodo, estaActivo, esRelleno)}</div>`; // Método delegado
    }

    if (this.DOM.track) {
         this.DOM.track.style.gridTemplateRows = '';
    }
    return html;
};

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
        simulateTouch: true, 
        centeredSlides: false, 
        mousewheel: { sensitivity: 1, releaseOnEdges: true }, 
        keyboard: { enabled: false }, 
        speed: data.SWIPE_SLIDE_SPEED,
    };

    this.STATE.carouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);
    
    debug.log('render_mobile', debug.DEBUG_LEVELS.BASIC, `Swiper vertical inicializado en ${swiperId}. Slide inicial: ${initialSwiperSlide}`);

    if (typeof this.setupTouchListeners === 'function') {
        this.setupTouchListeners(); 
    }
};

// --- code/render-mobile.js ---