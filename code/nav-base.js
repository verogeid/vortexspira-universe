/* --- code/nav-base.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 

export function setupListeners() {
  if (this.DOM.cardVolverFijaElemento) { 
      this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
  }
  _setupDetailFocusHandler.call(this); 
  _setupGlobalClickRecovery.call(this); 
};

function _setupDetailFocusHandler() {
    document.addEventListener('focusin', (e) => {
        if (this.DOM.vistaDetalle?.classList.contains('active')) {
            const focusedIsContent = e.target.closest('.detail-text-fragment, .detail-action-item, .card-volver-vertical, #card-volver-fija-elemento');
            if (focusedIsContent) nav_base_details._updateDetailFocusState(this);
        }
    });
};

function _setupGlobalClickRecovery() {
    document.addEventListener('click', (e) => {
        const target = e.target;
        const interactive = target.closest('a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])');
        if (interactive) {
            interactive.focus({ preventScroll: true });
            return;
        }
        const zone = target.closest('#app-header, footer, #info-adicional, #vista-volver');
        if (zone) {
            const focusable = zone.querySelector('a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus({ preventScroll: true });
                return; 
            }
        }
        const isNavActive = this.DOM.vistaNav && this.DOM.vistaNav.classList.contains('active');
        if (isNavActive && (document.activeElement === document.body || !document.activeElement)) {
             this._updateFocus(false);
        }
    });
}

export function _handleVolverClick() {
    if (this.STATE.isNavigatingBack) return; 
    
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'ESC: Iniciando proceso Volver.');
    this.STATE.isNavigatingBack = true; 

    if (this.DOM.vistaDetalle?.classList.contains('active')) {
        nav_base_details._clearDetailVisualStates(this); 
        this.DOM.vistaDetalle.classList.remove('active'); 
        this.STATE.activeCourseId = null; 
        this.renderNavegacion(); 
    } 
    else if (this.STATE.historyStack.length > 1) { 
        this.stackPop(); 
        this.renderNavegacion(); 
    } 
    else {
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'ESC: Raíz alcanzada. Bloqueo liberado.');
        this.STATE.isNavigatingBack = false; 
    }
};

export function _updateFocusImpl(shouldSlide = true) {
    const targetPos = this.STATE.currentFocusIndex;
    let target = null;
    let targetSlideIndex = -1;

    // ⭐️ FIX INTELIGENTE DE LOOP: Buscar el elemento más cercano visualmente ⭐️
    // En lugar de buscar ciegamente en el DOM, preguntamos a Swiper dónde estamos
    // y buscamos la tarjeta que esté en el slide activo (o en sus vecinos).
    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;
        const activeIndex = swiper.activeIndex;
        const slides = swiper.slides;

        let bestDistance = Infinity;

        // Recorremos los slides para encontrar aquel que contenga nuestra tarjeta target
        // y que esté a menor distancia del slide actual.
        for (let i = 0; i < slides.length; i++) {
            // Buscamos SOLO dentro de este slide
            const cardInSlide = slides[i].querySelector(`.card[data-pos="${targetPos}"]`);
            
            if (cardInSlide) {
                const distance = Math.abs(i - activeIndex);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    target = cardInSlide;
                    targetSlideIndex = i;
                }
            }
        }
    }

    // Fallback: Si no hay Swiper o algo falló, usamos el método clásico
    if (!target) {
        target = this.DOM.track.querySelector(`.card[data-pos="${targetPos}"]`);
    }

    // Limpieza de estados visuales antiguos
    const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
    allCardsInTrack.forEach(c => { 
        c.classList.remove('focus-visible'); 
        c.tabIndex = -1; 
    });

    debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, `_updateFocusImpl: Idx=${targetPos} | Slide=${shouldSlide} | TargetFound=${!!target}`);

    if (target) {
        target.classList.add('focus-visible');
        target.tabIndex = 0;
        
        // Foco físico
        target.focus({ preventScroll: true }); 

        // Movimiento del Slide
        if (this.STATE.carouselInstance && shouldSlide) {
            const swiper = this.STATE.carouselInstance;

            if (targetSlideIndex > -1) {
                // ⭐️ FIX FLUIDEZ: Usamos slideTo directo al índice calculado ⭐️
                // Esto evita que slideToLoop nos devuelva al slide original causando un salto visual.
                // Al ir al targetSlideIndex (que puede ser un clon), el movimiento es siempre corto y suave.
                swiper.slideTo(targetSlideIndex, data.SWIPER.SLIDE_SPEED);
            } 
            else {
                // Fallback para lógica antigua (móvil o sin clones detectados)
                const isMobile = window.innerWidth <= data.MAX_WIDTH.MOBILE;
                let slideTarget;
                
                if (isMobile) {
                    const slide = target.closest('.swiper-slide');
                    slideTarget = (slide && swiper.slides) ? Array.from(swiper.slides).indexOf(slide) : 0;
                    swiper.slideTo(slideTarget, data.SWIPER.SLIDE_SPEED);
                } 
                else {
                    // En grid desktop sin loop complejo, slideToLoop suele estar bien
                     if (typeof swiper.slideToLoop === 'function') {
                        // Recalcular índice lógico si no lo tenemos
                        const fallbackTarget = Math.floor(targetPos / this.STATE.itemsPorColumna);
                        swiper.slideToLoop(fallbackTarget, data.SWIPER.SLIDE_SPEED);
                    } else {
                        const fallbackTarget = Math.floor(targetPos / this.STATE.itemsPorColumna);
                        swiper.slideTo(fallbackTarget, data.SWIPER.SLIDE_SPEED);
                    }
                }
            }
            swiper.update(); 
        }
    }
}

export function _handleTrackClick(e) {
    if (this.STATE.isNavigatingBack) return;

    const tarjeta = e.target.closest('.card[data-id]:not([data-tipo="relleno"])');
    if (!tarjeta) return;

    // Recalcular índice basado en data-pos, que es más seguro en entornos con clones
    const pos = tarjeta.dataset.pos;
    if (pos !== undefined) {
        this.STATE.currentFocusIndex = parseInt(pos, 10);
        this._updateFocus(true); 

        if (tarjeta.classList.contains('disabled')) return;
        this._handleCardClick(tarjeta.dataset.id, tarjeta.dataset.tipo);
    }
}

export function _handleCardClick(id, tipo) {
    this.stackUpdateCurrentFocus(id);

    if (tipo === 'categoria') { 
        this.stackPush(id); 
        this.renderNavegacion(); 
    }
    else if (tipo === 'curso') {
        this.STATE.activeCourseId = id;
        this._mostrarDetalle(id);
    }
    else if (tipo === 'volver-vertical') {
        this._handleVolverClick();
    }
}

export function _findNodoById(id, nodos) {
    if (!nodos || !id) return null;
    for (const n of nodos) {
        if (n.id === id) return n;
        if (n.subsecciones) {
            const res = this._findNodoById(id, n.subsecciones);
            if (res) return res;
        }
        if (n.cursos) {
            const res = n.cursos.find(c => c.id === id);
            if (res) return res;
        }
    }
    return null;
}

export function _tieneContenidoActivoImpl(nodoId) {
    const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
    if (!nodo) return false;
    if (nodo.titulo || (nodo.cursos && nodo.cursos.length > 0)) return true;
    return (nodo.subsecciones || []).some(sub => this._tieneContenidoActivo(sub.id));
}

export function findBestFocusInColumn(columnCards, targetRow) {
    const isValid = (card) => card && card.dataset.id && card.dataset.tipo !== 'relleno';
    if (isValid(columnCards[targetRow])) return columnCards[targetRow];
    for (let i = 1; i < columnCards.length; i++) {
        if (isValid(columnCards[targetRow - i])) return columnCards[targetRow - i];
        if (isValid(columnCards[targetRow + i])) return columnCards[targetRow + i];
    }
    return null;
}

/* --- code/nav-base.js --- */