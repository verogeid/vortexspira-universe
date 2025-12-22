// --- code/render-swipe.js ---

import * as debug from './debug.js';
import * as data from './data.js';

export function _generateCardHTML_Carousel(items, itemsPerSlide) {
    let html = '';
    let rellenoInicial = '';
    for (let k = 0; k < itemsPerSlide; k++) {
        rellenoInicial += this._generarTarjetaHTML({ tipo: 'relleno' }, false, true);
    }
    html += `<div class="swiper-slide"><div class="cards-column-group">${rellenoInicial}</div></div>`;

    const totalItems = items.length;
    let totalSlotsDeseados = Math.ceil(totalItems / itemsPerSlide) * itemsPerSlide; 
    if (totalSlotsDeseados < (6 * itemsPerSlide)) totalSlotsDeseados = (6 * itemsPerSlide);

    const itemsConRelleno = [...items];
    for (let i = totalItems; i < totalSlotsDeseados; i++) {
        itemsConRelleno.push({ nombre: '', id: `relleno-${i}`, tipo: 'relleno' });
    }

    for (let i = 0; i < itemsConRelleno.length; i += itemsPerSlide) {
        let slideContent = '';
        for (let j = 0; j < itemsPerSlide; j++) {
            const item = itemsConRelleno[i + j];
            if (item) {
                const esRelleno = item.tipo === 'relleno';
                const activo = !esRelleno && this._tieneContenidoActivo(item.id);
                slideContent += this._generarTarjetaHTML(item, activo, esRelleno);
            }
        }
        html += `<div class="swiper-slide"><div class="cards-column-group">${slideContent}</div></div>`;
    }
    return html;
};

export function renderSwipe(app, data) {
    const container = app.DOM.app;
    if (!container) return;

    const itemsPorColumna = app.STATE.itemsPorColumna;
    const initialSlide = Math.floor(app.STATE.currentFocusIndex / itemsPorColumna);
    const html = app._generateCardHTML_Carousel(data.items, itemsPorColumna);
    
    container.innerHTML = `
        <div id="nav-swiper" class="swiper">
            <div class="swiper-wrapper" id="cards-track">
                ${html}
            </div>
        </div>
    `;

    app.DOM.track = document.getElementById('cards-track');
    app._initCarousel_Swipe(initialSlide, itemsPorColumna, false, '#nav-swiper');
}

export function _initCarousel_Swipe(initialSwiperSlide, itemsPorColumna, isMobile, swiperId) {
    this._destroyCarousel();

    const swiperConfig = {
        direction: 'horizontal',
        slidesPerView: 3,
        slidesPerGroup: 1,
        loop: true,
        initialSlide: initialSwiperSlide + 1,
        centeredSlides: true,
        mousewheel: { sensitivity: 1 },
        keyboard: { enabled: false },
        speed: data.SWIPE_SLIDE_SPEED,
        // AAA: Rescate automático ante cambios de grid
        observer: true,
        observeParents: true,
        observeSlideChildren: true
    };

    this.STATE.carouselInstance = new Swiper(swiperId, swiperConfig);

    if (this.STATE.carouselInstance) {
        if (typeof this.setupTouchListeners === 'function') {
            this.setupTouchListeners();
        }
        this._updateFocus(false);
    }
};

export function _destroyCarouselImpl() {
    if (this.STATE.carouselInstance) {
        this.STATE.carouselInstance.destroy(true, true);
        this.STATE.carouselInstance = null;
    }
};

// --- code/render-swipe.js ---