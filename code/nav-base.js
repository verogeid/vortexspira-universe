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

/* ⭐️ CORRECCIÓN: Gestión inteligente de clics en Zonas y Elementos ⭐️ */
function _setupGlobalClickRecovery() {
    document.addEventListener('click', (e) => {
        const target = e.target;

        // 1. Si clicamos en algo interactivo, FORZAMOS el foco para asegurar respuesta
        const interactive = target.closest('a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])');
        if (interactive) {
            interactive.focus({ preventScroll: true });
            return;
        }

        // 2. Si clicamos en una ZONA (Header, Footer, Info), llevamos el foco a su interior
        const header = target.closest('#app-header');
        const footer = target.closest('footer');
        const info = target.closest('#info-adicional');
        const volver = target.closest('#vista-volver');

        const zone = header || footer || info || volver;
        if (zone) {
            // Buscamos el primer elemento focusable de esa zona
            const focusable = zone.querySelector('a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                focusable.focus({ preventScroll: true });
                return; 
            }
        }

        // 3. Fallback: Solo si clicamos en el "limbo" (body/fondo) y la nav está activa, recuperamos foco al track
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
    } else {
        this.STATE.isNavigatingBack = false;
    }
};

export function _updateFocusImpl(shouldSlide = true) {
    const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
    const validCards = allCardsInTrack.filter(c => c.dataset.tipo !== 'relleno');
    
    if (!validCards.length) return;

    const idx = Math.max(0, Math.min(this.STATE.currentFocusIndex, validCards.length - 1));
    const target = validCards[idx];
    this.STATE.currentFocusIndex = idx;

    allCardsInTrack.forEach(c => { 
        c.classList.remove('focus-visible'); 
        c.tabIndex = -1; 
    });

    if (target) {
        target.classList.add('focus-visible');
        target.tabIndex = 0;
        target.focus({ preventScroll: true }); 

        if (this.STATE.carouselInstance && shouldSlide) {
            const swiper = this.STATE.carouselInstance;
            const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
            
            let slideTarget;
            if (isMobile) {
                const slide = target.closest('.swiper-slide');
                if (slide && swiper.slides) {
                    slideTarget = Array.from(swiper.slides).indexOf(slide);
                } else {
                    slideTarget = 0;
                }
            } else {
                const parentSlide = target.closest('.swiper-slide');
                if (parentSlide && parentSlide.dataset.swiperSlideIndex !== undefined) {
                    slideTarget = parseInt(parentSlide.dataset.swiperSlideIndex, 10);
                } else {
                    slideTarget = Math.floor(idx / this.STATE.itemsPorColumna);
                }
            }

            swiper.update(); 
            debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, `FOCUS: Moviendo carrusel al slide lógico ${slideTarget} para índice ${idx}`);

            if (typeof swiper.slideToLoop === 'function') {
                const onTransitionEnd = () => {
                    swiper.off('transitionEnd', onTransitionEnd);
                    if (document.activeElement === document.body || !document.activeElement.classList.contains('card')) {
                        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, "FOCUS: Foco recuperado tras transición de Swiper.");
                        target.focus({ preventScroll: true });
                    }
                };
                swiper.on('transitionEnd', onTransitionEnd);
                swiper.slideToLoop(slideTarget, data.SWIPE_SLIDE_SPEED);
            } else {
                swiper.slideTo(slideTarget, data.SWIPE_SLIDE_SPEED);
            }
        }
    }
}

export function _handleTrackClick(e) {
    if (this.STATE.isNavigatingBack) return;

    const tarjeta = e.target.closest('.card[data-id]:not([data-tipo="relleno"])');
    if (!tarjeta) return;

    const validCards = Array.from(this.DOM.track.querySelectorAll('.card:not([data-tipo="relleno"])'));
    const newIdx = validCards.indexOf(tarjeta);

    this.STATE.currentFocusIndex = newIdx;
    this._updateFocus(true);

    if (tarjeta.classList.contains('disabled')) return;
    this._handleCardClick(tarjeta.dataset.id, tarjeta.dataset.tipo);
}

export function _handleCardClick(id, tipo) {
    if (tipo === 'categoria') { 
        this.stackPush(id, this.STATE.currentFocusIndex); 
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