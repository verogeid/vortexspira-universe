/* --- code/nav-base.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 

/**
 * Configura los listeners globales de navegación.
 */
export function setupListeners() {
  if (this.DOM.cardVolverFijaElemento) { 
      this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
  }
  _setupDetailFocusHandler.call(this); 
};

/**
 * Manejador interno para el foco en la vista de detalle.
 */
function _setupDetailFocusHandler() {
    document.addEventListener('focusin', (e) => {
        if (this.DOM.vistaDetalle?.classList.contains('active')) {
            const focusedIsContent = e.target.closest('.detail-text-fragment, .detail-action-item, .card-volver-vertical, #card-volver-fija-elemento');
            if (focusedIsContent) nav_base_details._updateDetailFocusState(this);
        }
    });
};

/**
 * Sube un nivel en la navegación o cierra el detalle.
 */
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

/**
 * Actualiza el foco visual y sincroniza la posición del Swiper.
 */
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
                slideTarget = idx + (this.STATE.historyStack.length > 1 ? 2 : 0);
            } else {
                // Prioridad 1: Localización física (ideal para clic y evitar clones)
                const parentSlide = target.closest('.swiper-slide');
                if (parentSlide && parentSlide.dataset.swiperSlideIndex !== undefined) {
                    slideTarget = parseInt(parentSlide.dataset.swiperSlideIndex, 10);
                } else {
                    // Prioridad 2: Cálculo matemático (fallback para teclado)
                    slideTarget = Math.floor(idx / this.STATE.itemsPorColumna);
                }
            }

            swiper.update(); 
            debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, `FOCUS: Moviendo carrusel al slide lógico ${slideTarget} para índice ${idx}`);

            if (typeof swiper.slideToLoop === 'function') {
                // ⭐️ RED DE SEGURIDAD PARA EL FOCO ⭐️
                // Si Swiper reajusta el loop, el foco puede caer al BODY. Lo recuperamos al terminar.
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

/**
 * Maneja el evento de click centralizado en el track.
 */
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

/**
 * Procesa la acción de clic en una tarjeta según su tipo.
 */
export function _handleCardClick(id, tipo) {
    if (tipo === 'categoria') { 
        this.stackPush(id, this.STATE.currentFocusIndex); 
        this.renderNavegacion(); 
    }
    else if (tipo === 'curso') {
        this.STATE.activeCourseId = id;
        this._mostrarDetalle(id);
    }
}

/**
 * Busca un nodo en la estructura de datos por su ID.
 */
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

/**
 * Determina si un nodo tiene contenido navegable activo.
 */
export function _tieneContenidoActivoImpl(nodoId) {
    const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
    if (!nodo) return false;
    if (nodo.titulo || (nodo.cursos && nodo.cursos.length > 0)) return true;
    return (nodo.subsecciones || []).some(sub => this._tieneContenidoActivo(sub.id));
}

/**
 * Busca la mejor tarjeta para enfocar en una columna.
 */
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