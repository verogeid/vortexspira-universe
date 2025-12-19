/* --- code/render-mobile.js --- */

import * as debug from './debug.js';
import * as data from './data.js';

export function _generateCardHTML_Mobile(items, itemsPerColumna) {
    let html = '';

    for (const nodo of items) {
        if (nodo.tipoEspecial === 'volver-vertical' || nodo.tipoEspecial === 'breadcrumb-vertical') {
            html += `<div class="swiper-slide">${this._generarTarjetaHTML(nodo, true, false, nodo.tipoEspecial)}</div>`;
            continue;
        }
        const esRelleno = nodo.tipo === 'relleno';
        const estaActivo = esRelleno ? false : this._tieneContenidoActivo(nodo.id);
        html += `<div class="swiper-slide">${this._generarTarjetaHTML(nodo, estaActivo, esRelleno)}</div>`;
    }

    // ⭐️ INYECCIÓN QUIRÚRGICA: Card de relleno para evitar que el footer tape la última info ⭐️
    html += `<div class="swiper-slide" style="height: 120px !important; background: transparent !important; border: none !important; box-shadow: none !important; pointer-events: none;"></div>`;

    return html;
};

export function _initCarousel_Mobile(initialSwiperSlide, itemsPorColumna, isMobile, swiperId) {
    if (!isMobile) return;
    if (this.STATE.carouselInstance) this._destroyCarousel();
    
    const swiperConfig = {
        direction: 'vertical',
        slidesPerView: 'auto',
        slidesPerGroup: 1,
        loop: false,
        initialSlide: initialSwiperSlide,
        touchRatio: 1,
        simulateTouch: true,
        touchStartPreventDefault: true,
        touchMoveStopPropagation: true,
        speed: data.SWIPE_SLIDE_SPEED,
        freeMode: true,
        freeModeMomentum: true,
        freeModeSticky: true,
    };

    const container = document.querySelector(swiperId);
    if (container) {
        this.STATE.carouselInstance = new Swiper(container, swiperConfig);
    }
    if (typeof this.setupTouchListeners === 'function') this.setupTouchListeners(); 
};

/* --- code/render-mobile.js --- */