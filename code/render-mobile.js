/* --- code/render-mobile.js --- */

import * as debug from './debug.js';
import * as data from './data.js';

export function _generateCardHTML_Mobile(items, itemsPerColumna) {
    let html = '';
    
    // ⭐️ Nuevo contador para posiciones lógicas de foco ⭐️
    // Usamos esto en lugar de 'i' para que el Breadcrumb no consuma un índice.
    let logicalPos = 0; 
    
    for (let i = 0; i < items.length; i++) {
        const nodo = items[i];

        // ⭐️ AGRUPACIÓN: Si es Breadcrumb y el siguiente es Volver, van juntos ⭐️
        if (nodo.tipoEspecial === 'breadcrumb-vertical') {
            if (i + 1 < items.length && items[i+1].tipoEspecial === 'volver-vertical') {
                const volverNode = items[i+1];
                
                // 1. Renderizamos Breadcrumb
                // 🛑 NO le inyectamos data-pos. El sistema de navegación lo ignorará.
                let breadcrumbHtml = this._generarTarjetaHTML(nodo, true, false, nodo.tipoEspecial);
                breadcrumbHtml = breadcrumbHtml.replace('class="card', 'style="margin-bottom: 10px;" class="card');

                // 2. Renderizamos Volver
                // ✅ LE inyectamos data-pos con el logicalPos actual (será 0).
                let volverHtml = this._generarTarjetaHTML(volverNode, true, false, volverNode.tipoEspecial);
                volverHtml = volverHtml.replace('class="card', `data-pos="${logicalPos}" class="card`);

                html += `<div class="swiper-slide">
                    ${breadcrumbHtml}
                    ${volverHtml}
                </div>`;
                
                // Avanzamos índices
                logicalPos++; // Solo sumamos 1 al foco (por el botón Volver)
                i++; // Saltamos el nodo Volver del array original (i)
                continue;
            }
        }

        // Caso fallback (Breadcrumb suelto, por si acaso)
        if (nodo.tipoEspecial === 'breadcrumb-vertical') {
            let bHtml = this._generarTarjetaHTML(nodo, true, false, nodo.tipoEspecial);
            // Sin data-pos
            html += `<div class="swiper-slide">${bHtml}</div>`; 
            continue;
        }

        // Caso fallback (Volver suelto) o Tarjeta Normal
        const esRelleno = nodo.tipo === 'relleno';
        const estaActivo = esRelleno ? false : this._tieneContenidoActivo(nodo.id); 
        
        let cardHtml = this._generarTarjetaHTML(nodo, estaActivo, esRelleno);

        // Si es una tarjeta válida, le asignamos su posición lógica y aumentamos el contador
        if (!esRelleno) {
            cardHtml = cardHtml.replace('class="card', `data-pos="${logicalPos}" class="card`);
            logicalPos++;
        }

        html += `<div class="swiper-slide">${cardHtml}</div>`; 
    }

    html += `<div class="swiper-slide card-relleno-final" style="height: 100px !important; pointer-events: none;"></div>`;

    if (this.DOM.track) {
         this.DOM.track.style.gridTemplateRows = '';
    }
    return html;
};

// ... (El resto del archivo _initCarousel_Mobile se mantiene igual)
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

        touchStartPreventDefault: false, 
        touchMoveStopPropagation: true, 
        
        grabCursor: true, 
        centeredSlides: false, 
        mousewheel: { enabled: false }, 
        keyboard: { enabled: false }, 
        speed: data.SWIPER.SLIDE_SPEED,
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