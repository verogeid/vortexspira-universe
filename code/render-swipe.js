// --- code/render-swipe.js ---

import * as debug from './debug.js';
import * as data from './data.js';

/**
 * Genera el HTML para la vista de carrusel (Desktop/Tablet).
 */
export function _generateCardHTML_Carousel(items, itemsPerSlide) {
    let html = '';

    // 1. Columna de Relleno al PRINCIPIO
    let rellenoInicial = '';
    for (let k = 0; k < itemsPerSlide; k++) {
        rellenoInicial += this._generarTarjetaHTML({ tipo: 'relleno' }, false, true);
    }
    html += `<div class="swiper-slide"><div class="cards-column-group">${rellenoInicial}</div></div>`;

    // 2. Preparar datos con relleno
    const totalItems = items.length;
    let totalSlotsDeseados = Math.ceil(totalItems / itemsPerSlide) * itemsPerSlide; 
    const minDataSlides = 6; 

    if (totalSlotsDeseados < (minDataSlides * itemsPerSlide)) {
        totalSlotsDeseados = (minDataSlides * itemsPerSlide);
    }

    const itemsConRelleno = [...items];
    for (let i = totalItems; i < totalSlotsDeseados; i++) {
        itemsConRelleno.push({ nombre: '', id: `relleno-${i}`, tipo: 'relleno' });
    }

    // 3. Crear los slides
    for (let i = 0; i < itemsConRelleno.length; i += itemsPerSlide) {
        let slideContent = '';
        for (let j = 0; j < itemsPerSlide; j++) {
            const item = itemsConRelleno[i + j];
            if (item) {
                const esRelleno = item.tipo === 'relleno';
                if (esRelleno) {
                    slideContent += this._generarTarjetaHTML(item, false, true);
                } else {
                    const estaActivo = this._tieneContenidoActivo(item.id);
                    slideContent += this._generarTarjetaHTML(item, estaActivo, false);
                }
            } else {
                slideContent += this._generarTarjetaHTML({ tipo: 'relleno' }, false, true);
            }
        }
        html += `<div class="swiper-slide"><div class="cards-column-group">${slideContent}</div></div>`;
    }

    if (this.DOM.track) this.DOM.track.style.gridTemplateRows = '';
    return html;
};

/**
 * Inicializa la instancia de Swiper.
 */
export function _initCarousel_Swipe(initialSwiperSlide, itemsPorColumna, isMobile, swiperId) {
    if (isMobile) {
        this._destroyCarousel();
        return;
    }

    this._destroyCarousel();

    const swiperConfig = {
        direction: 'horizontal', 
        slidesPerView: 3, 
        slidesPerGroup: 1, 
        loop: true, 
        initialSlide: initialSwiperSlide + 1, 
        touchRatio: 1, 
        simulateTouch: true, 
        centeredSlides: true,
        mousewheel: { sensitivity: 1 }, 
        keyboard: { enabled: false }, 
        speed: data.SWIPE_SLIDE_SPEED,
    };

    const container = document.querySelector(swiperId);
    if (!container) return;

    this.STATE.carouselInstance = new Swiper(container, swiperConfig);

    if (this.STATE.carouselInstance) {
        this.STATE.carouselInstance.update(); 
        debug.log('render_swipe', debug.DEBUG_LEVELS.BASIC, `Swiper inicializado en ${swiperId}.`);

        // Vinculación de eventos de ratón/toque
        if (typeof this.setupTouchListeners === 'function') {
            this.setupTouchListeners();
        }
    }
};

/**
 * Destruye la instancia activa de Swiper de forma segura.
 */
export function _destroyCarouselImpl() {
    if (this.STATE.carouselInstance) {
        // Desvincular eventos antes de destruir para evitar bucles de foco
        this.STATE.carouselInstance.off('slideChangeTransitionStart');
        this.STATE.carouselInstance.off('slideChangeTransitionEnd');
        this.STATE.carouselInstance.destroy(true, true);
        this.STATE.carouselInstance = null;
        debug.log('render_swipe', debug.DEBUG_LEVELS.BASIC, "Swiper destruido.");
    }
};

// --- code/render-swipe.js ---