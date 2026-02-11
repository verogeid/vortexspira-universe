/* --- code/render-swipe.js --- */

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

    
    if (totalSlotsDeseados < (data.SWIPER.NEEDED_SLIDES_TO_LOOP * itemsPerSlide)) totalSlotsDeseados = (data.SWIPER.NEEDED_SLIDES_TO_LOOP * itemsPerSlide);

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
                
                let cardHtml = this._generarTarjetaHTML(item, activo, esRelleno);
                
                if (!esRelleno) {
                    const logicalIndex = i + j; 
                    cardHtml = cardHtml.replace('class="card', `data-pos="${logicalIndex}" class="card`);
                }
                
                slideContent += cardHtml;
            }
        }
        html += `<div class="swiper-slide"><div class="cards-column-group">${slideContent}</div></div>`;
    }
    return html;
}

export function _initCarousel_Swipe(initialSwiperSlide, itemsPorColumna, isMobile, swiperId, isStable = false) {
    this._destroyCarousel();

    const slidesCount = document.querySelectorAll(`${swiperId} .swiper-slide`).length;
    const isLoopViable = slidesCount >= data.SWIPER.NEEDED_SLIDES_TO_LOOP;

    const swiperConfig = {
        direction: 'horizontal',
        slidesPerView: data.SWIPER.SLIDES_PER_VIEW, 
        slidesPerGroup: 1,
        spaceBetween: data.SWIPER.CARD_GAP_PX,
        
        loop: true,

        loopedSlides: data.SWIPER.NEEDED_SLIDES_TO_LOOP * 2,
        preloadImages: true,
        watchSlidesProgress: false,

        centeredSlides: true,
        initialSlide: initialSwiperSlide, 
        
        speed: data.SWIPER.SLIDE_SPEED,
        roundLengths: true,
        observer: true,
        observeParents: true,
        observeSlideChildren: true,
        resizeObserver: true,
        updateOnWindowResize: true,
        
        touchStartPreventDefault: false,
        
        // Desactivación total de controles nativos conflictivos
        mousewheel: false,
        keyboard: { enabled: false },

        // 🟢 FIX A11Y: Desactivar gestión automática de Swiper para evitar conflictos y ruido
        a11y: { enabled: false }
    };

    debug.log('render_swipe', debug.DEBUG_LEVELS.BASIC, 
                `SWIPE: Init ${swiperId} | Loop=${swiperConfig.loop}`);
    
    try {
        this.STATE.carouselInstance = new Swiper(swiperId, swiperConfig);

        if (this.STATE.carouselInstance) {
            // 🟢 Listener quirúrgico para arreglar el desfase de clones
            this.STATE.carouselInstance.on('transitionEnd', () => {
                if (!this.STATE.isBooting) {
                    if (this.STATE.pendingLoopFix) {
                        this.STATE.pendingLoopFix = false; // Reset inmediato

                        this.STATE.carouselInstance.loopFix();
                        this.STATE.carouselInstance.update();

                        debug.log('render_swipe', debug.DEBUG_LEVELS.DEEP, 
                            '🔧 LoopFix aplicado tras navegación.');
                    }
                }
            });

            // 🟢 FIX A11Y: Asegurar SILENCIO TOTAL en el contenedor del track
            if (this.STATE.carouselInstance.wrapperEl) {
                this.STATE.carouselInstance.wrapperEl.removeAttribute('aria-live');
                this.STATE.carouselInstance.wrapperEl.removeAttribute('aria-busy');
            }

            const targetIndex = this.STATE.currentFocusIndex;
            const targetCard = this.DOM.track.querySelector(`.card[data-pos="${targetIndex}"]`);
            
            if (targetCard) {
                const targetSlide = targetCard.closest('.swiper-slide');
                if (targetSlide && targetSlide.dataset.swiperSlideIndex !== undefined) {
                    const realIndex = parseInt(targetSlide.dataset.swiperSlideIndex, 10);

                    debug.log('render_swipe', debug.DEBUG_LEVELS.BASIC, 
                                `SWIPE: Posicionando en data-pos="${targetIndex}" (Slide Lógico ${realIndex})`);

                    this.STATE.carouselInstance.slideToLoop(realIndex, 0, false);
                }
            }

            if (typeof this.setupTouchListeners === 'function') {
                this.setupTouchListeners();
            }
            //this._updateFocus(false);
        }
    } catch (error) {
        debug.logError('render_swipe', 'Error al inicializar Swiper:', error);
    }
}

export function _destroyCarouselImpl() {
    if (this.STATE.carouselInstance) {
        this.STATE.carouselInstance.destroy(true, true);
        this.STATE.carouselInstance = null;
    }
}

/* --- code/render-swipe.js --- */