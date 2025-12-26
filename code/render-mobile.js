/* --- code/render-mobile.js --- */

import * as debug from './debug.js';
import * as data from './data.js';

export function _generateCardHTML_Mobile(items, itemsPerColumna) {
    let html = '';
    
    for (let i = 0; i < items.length; i++) {
        const nodo = items[i];

        // ⭐️ AGRUPACIÓN: Si es Breadcrumb y el siguiente es Volver, van juntos ⭐️
        if (nodo.tipoEspecial === 'breadcrumb-vertical') {
            if (i + 1 < items.length && items[i+1].tipoEspecial === 'volver-vertical') {
                const volverNode = items[i+1];
                
                // Inyectamos style="margin-bottom: 10px;" al string HTML del breadcrumb para separarlo
                let breadcrumbHtml = this._generarTarjetaHTML(nodo, true, false, nodo.tipoEspecial);
                breadcrumbHtml = breadcrumbHtml.replace('class="card', 'style="margin-bottom: 10px;" class="card');

                html += `<div class="swiper-slide">
                    ${breadcrumbHtml}
                    ${this._generarTarjetaHTML(volverNode, true, false, volverNode.tipoEspecial)}
                </div>`;
                
                i++; // Saltamos el nodo Volver porque ya lo hemos pintado
                continue;
            }
        }

        // Caso fallback por si aparecen sueltos
        if (nodo.tipoEspecial === 'volver-vertical' || nodo.tipoEspecial === 'breadcrumb-vertical') {
            html += `<div class="swiper-slide">${this._generarTarjetaHTML(nodo, true, false, nodo.tipoEspecial)}</div>`; 
            continue;
        }

        const esRelleno = nodo.tipo === 'relleno';
        const estaActivo = esRelleno ? false : this._tieneContenidoActivo(nodo.id); 
        html += `<div class="swiper-slide">${this._generarTarjetaHTML(nodo, estaActivo, esRelleno)}</div>`; 
    }

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
        touchStartPreventDefault: false, // Permitir clic nativo
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
/* --- code/render-mobile.js --- */