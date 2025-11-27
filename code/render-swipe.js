// --- code/render-swipe.js (REFRACTORIZADO A ES MODULE) ---

import * as debug from './debug.js';

// ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA SWIPER ⭐️
/**
 * Genera el HTML para la vista de carrusel (Desktop/Tablet).
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _generateCardHTML_Carousel(items, itemsPerSlide) {
    // 'this' es la instancia de App
    let html = '';

    // 1. Añadir la columna de Relleno al PRINCIPIO
    let rellenoInicial = '';
    for (let k = 0; k < itemsPerSlide; k++) {
        rellenoInicial += this._generarTarjetaHTML({ tipo: 'relleno' }, false, true); // Método delegado
    }
    html += `<div class="swiper-slide"><div class="cards-column-group">${rellenoInicial}</div></div>`;


    // 2. Preparar datos con relleno (para el final)
    const totalItems = items.length;
    let totalSlotsDeseados = Math.ceil(totalItems / itemsPerSlide) * itemsPerSlide; 

    // Swiper (con loop:true y slidesPerView:3) necesita 
    // al menos (3 * 2 = 6) slides para funcionar sin warnings.
    // 5 slides de datos + 1 de relleno = 6.
    const minDataSlides = 6; 

    if (totalSlotsDeseados < (minDataSlides * itemsPerSlide)) {
        totalSlotsDeseados = (minDataSlides * itemsPerSlide);
    }

    const itemsConRelleno = [...items];
    for (let i = totalItems; i < totalSlotsDeseados; i++) {
        itemsConRelleno.push({ nombre: '', id: `relleno-${i}`, tipo: 'relleno' });
    }

    // 3. Iterar para crear los slides
    for (let i = 0; i < itemsConRelleno.length; i += itemsPerSlide) {
        let slideContent = '';

        // Generar el contenido de la columna (2 o 3 tarjetas)
        for (let j = 0; j < itemsPerSlide; j++) {
            const item = itemsConRelleno[i + j];
            if (item) {
                const esRelleno = item.tipo === 'relleno';
                if (esRelleno) {
                    slideContent += this._generarTarjetaHTML(item, false, true); // Método delegado
                } else {
                    const estaActivo = this._tieneContenidoActivo(item.id); // Método delegado
                    slideContent += this._generarTarjetaHTML(item, estaActivo, false); // Método delegado
                }
            } else {
                slideContent += this._generarTarjetaHTML({ tipo: 'relleno' }, false, true); // Método delegado
            }
        }
        html += `<div class="swiper-slide"><div class="cards-column-group">${slideContent}</div></div>`;
    }

    this.DOM.track.style.gridTemplateRows = '';
    return html;
};


// ⭐️ 2. INICIALIZACIÓN DE SWIPER (genérico) ⭐️
/**
 * Inicializa la instancia de Swiper.
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _initCarousel_Swipe(initialSwiperSlide, itemsPorColumna, isMobile, swiperId) {
    // 'this' es la instancia de App
    
    // Nota: La destrucción está separada para ser segura.
    if (isMobile) {
        this._destroyCarousel();
        return;
    }

    if (this.STATE.carouselInstance) {
        this._destroyCarousel();
    }

    // Asumimos que la biblioteca Swiper está globalmente disponible.
    const swiperConfig = {
        direction: 'horizontal', 

        // slidesPerView se ajusta al layout Desktop (3) o Tablet (ajustado por CSS/layout)
        slidesPerView: 3, 
        
        slidesPerGroup: 1, 
        loop: true, 
        
        initialSlide: initialSwiperSlide + 1, 

        touchRatio: 1, 
        simulateTouch: true, 
        centeredSlides: true,
        mousewheel: { sensitivity: 1 }, 
        keyboard: { enabled: false }, 
        speed: 400,
    };

    this.STATE.carouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);

    if (this.STATE.carouselInstance) {
        this.STATE.carouselInstance.update(); 
        debug.log('render_swipe', debug.DEBUG_LEVELS.BASIC, `Swiper inicializado en ${swiperId}. Slide inicial: ${initialSwiperSlide + 1}`);

        // Enganchar los listeners táctiles AQUI, justo después de crear la instancia.
        if (typeof this.setupTouchListeners === 'function') {
            this.setupTouchListeners(); // Método delegado
        }
    }
};


// ⭐️ 3. DESTRUCCIÓN DE SWIPER (Real) ⭐️
/**
 * Destruye la instancia activa de Swiper.
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _destroyCarouselImpl() {
    // 'this' es la instancia de App
    if (this.STATE.carouselInstance) {
        this.STATE.carouselInstance.destroy(true, true);
        this.STATE.carouselInstance = null;
        debug.log('render_swipe', debug.DEBUG_LEVELS.BASIC, "Swiper destruido.");
    }
};