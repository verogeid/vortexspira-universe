// --- code/render-mobile.js ---

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

    /* ⭐️ INSERCIÓN QUIRÚRGICA: Card de relleno para el final del menú ⭐️ */
    html += `<div class="swiper-slide card-relleno-final" style="height: 100px !important; pointer-events: none;"></div>`;

    if (this.DOM.track) {
         this.DOM.track.style.gridTemplateRows = '';
    }
    return html;
};

export function _initCarousel_Mobile(initialSwiperSlide, itemsPorColumna, isMobile, swiperId) {
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

        /* ⭐️ CAMBIO QUIRÚRGICO: Bloqueamos el inicio del scroll nativo ⭐️ */
        /* Esto permite que un solo dedo arrastre la lista inmediatamente */
        touchStartPreventDefault: true, 

        touchMoveStopPropagation: true, 
        grabCursor: true, 
        centeredSlides: false, 
        mousewheel: { enabled: false }, 
        keyboard: { enabled: false }, 
        speed: data.SWIPE_SLIDE_SPEED,
        freeMode: true, 
        freeModeMomentum: true,
        freeModeSticky: true, 
    };

    const container = document.querySelector(swiperId);
    if (container) {
        this.STATE.carouselInstance = new Swiper(container, swiperConfig);
        debug.log('render_mobile', debug.DEBUG_LEVELS.BASIC, `Swiper vertical (1 dedo) inicializado en ${swiperId}`);
    }

    if (typeof this.setupTouchListeners === 'function') {
        this.setupTouchListeners(); 
    }
};

// --- code/render-mobile.js ---
