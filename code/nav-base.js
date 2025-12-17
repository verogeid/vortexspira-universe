// --- code/nav-base.js (MÓDULO CENTRAL DE NAVEGACIÓN) ---

import * as debug from './debug.js';
import * as data from './data.js';

import * as nav_base_details from './nav-base-details.js'; 

export function setupListeners() {
  debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Inicializando listeners de elementos fijos (Volver/Detalle).');
  
  if (this.DOM.btnVolverNav) {
      this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
      this.DOM.btnVolverNav.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._handleVolverClick(); }
      });
  }
  if (this.DOM.cardVolverFijaElemento) { 
      this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
  }
  
  _setupDetailFocusHandler.call(this); 
};

function _setupDetailFocusHandler() {
    document.addEventListener('focusin', (e) => {
        const focusedEl = e.target;
        const isDetailView = this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active'); 

        if (isDetailView) {
            const focusedIsContent = focusedEl.closest('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical, #card-volver-fija-elemento');
            if (focusedIsContent && this.STATE.detailCarouselInstance) {
                nav_base_details._updateDetailFocusState(this);
            }
        }
    });

    const handleDetailClick = (e) => {
        const focusable = e.target.closest('.detail-text-fragment, .detail-action-item');
        if (focusable) {
            focusable.focus();
            const slide = focusable.closest('.swiper-slide');
            if (slide && this.STATE.detailCarouselInstance) {
                const slideIndex = Array.from(slide.parentNode.children).indexOf(slide);
                this.STATE.detailCarouselInstance.slideTo(slideIndex, data.SWIPE_SLIDE_SPEED);
            }
        }
    };

    if (this.DOM.vistaDetalleDesktop) this.DOM.vistaDetalleDesktop.addEventListener('click', handleDetailClick);
    if (this.DOM.vistaDetalleMobile) this.DOM.vistaDetalleMobile.addEventListener('click', handleDetailClick);
};

export function setupTrackPointerListeners() { 
    if (this.DOM.track) {
        if (this.DOM.track._clickListener) this.DOM.track.removeEventListener('click', this.DOM.track._clickListener);
        if (this.DOM.track._mouseoverListener) this.DOM.track.removeEventListener('mouseover', this.DOM.track._mouseoverListener);

        const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;

        if (!isMobile) {
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);
        }
        this.DOM.track._mouseoverListener = this._handleTrackMouseOver.bind(this);
        this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
    }
};

export function _handleTrackClick(e) {
  const tarjeta = e.target.closest('[data-id]'); 
  if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;
  
  const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
  const newIndex = allCards.findIndex(c => c === tarjeta);
  if (newIndex === -1) return;

  const parentFocusIndex = this.STATE.currentFocusIndex;
  const indexChanged = newIndex !== parentFocusIndex;

  this.STATE.currentFocusIndex = newIndex;
  this.stackUpdateCurrentFocus(newIndex); 
  this._updateFocus(true); 

  if (tarjeta.classList.contains('disabled')) return;
  if (tarjeta.dataset.tipo === 'volver-vertical') {
      this._handleVolverClick(); 
      return;
  }
  
  const id = tarjeta.dataset.id;
  const tipo = tarjeta.dataset.tipo;
  const delay = indexChanged ? 300 : 0; 

  setTimeout(() => {
      this._handleCardClick(id, tipo, parentFocusIndex); 
  }, delay);
};

export function _handleTrackMouseOver(e) {
    const tarjeta = e.target.closest('[data-id]');
    if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;
    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newIndex = allCards.findIndex(c => c === tarjeta);
    if (newIndex > -1 && newIndex !== this.STATE.currentFocusIndex) {
        this._updateFocus(false); 
    }
};

export function _updateFocusImpl(shouldSlide = true) {
    const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
    
    allCardsInTrack.forEach(card => { card.classList.remove('focus-visible'); card.tabIndex = -1; });
    
    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    if (allCards.length === 0) return;
    
    const normalizedIndex = Math.max(0, Math.min(currentFocusIndex, allCards.length - 1));
    const nextFocusedCard = allCards[normalizedIndex];
    
    this.STATE.currentFocusIndex = normalizedIndex;
    this.stackUpdateCurrentFocus(normalizedIndex);
    
    if (nextFocusedCard) {
        nextFocusedCard.classList.add('focus-visible');
        nextFocusedCard.tabIndex = 0; 
        if (shouldSlide) nextFocusedCard.focus(); 
        else nextFocusedCard.focus({ preventScroll: true }); 
        
        if (carouselInstance && shouldSlide) {
            if (!isMobile) {
                const targetSlide = Math.floor(normalizedIndex / itemsPorColumna) + 1; 
                if (targetSlide !== carouselInstance.realIndex) {
                    this.STATE.keyboardNavInProgress = true; 
                    carouselInstance.slideToLoop(targetSlide, 400);
                }
            } else {
                let offset = (this.STATE.historyStack.length > 1) ? 2 : 0;
                carouselInstance.slideTo(normalizedIndex + offset, data.SWIPE_SLIDE_SPEED); 
            }
        }
    }
};

export function _handleCardClick(id, tipo, parentFocusIndex) {
    const focusParaGuardar = (parentFocusIndex !== undefined) ? parentFocusIndex : this.STATE.currentFocusIndex;
    if (tipo === 'categoria') {
        this.stackPush(id, focusParaGuardar);
        this.renderNavegacion();
    } else if (tipo === 'curso') {
        this._mostrarDetalle(id);             
    }
};

export function _handleVolverClick() {
    if (this.DOM.vistaDetalle.classList.contains('active')) {
        this.DOM.vistaDetalle.classList.remove('active'); 
        this.renderNavegacion(); 
        setTimeout(() => { this._updateFocus(true); }, data.SWIPE_SLIDE_SPEED); 
        this.STATE.activeCourseId = null;
    } else if (this.STATE.historyStack.length > 1) { 
        this.stackPop(); 
        this.renderNavegacion(); 
        setTimeout(() => { this._updateFocus(true); }, data.SWIPE_SLIDE_SPEED);
    }
};

export function _findNodoById(id, nodos) {
    if (!nodos || !id) return null;
    for (const n of nodos) {
        if (n.id === id) return n;
        if (n.subsecciones) {
            const encontrado = this._findNodoById(id, n.subsecciones); 
            if (encontrado) return encontrado;
        }
        if (n.cursos) {
            const cursoEncontrado = n.cursos.find(c => c.id === id);
            if (cursoEncontrado) return cursoEncontrado;
        }
    }
    return null;
};

export function _tieneContenidoActivoImpl(nodoId) {
    const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
    if (!nodo) return false;
    if (nodo.titulo || (nodo.cursos && nodo.cursos.length > 0)) return true;
    if (nodo.subsecciones) {
        for (const sub of nodo.subsecciones) {
            if (this._tieneContenidoActivo(sub.id)) return true;
        }
    }
    return false;
};

export function findBestFocusInColumn(columnCards, targetRow) {
    const isFocusable = (card) => card && card.dataset.id && card.dataset.tipo !== 'relleno';
    if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
    for (let i = targetRow - 1; i >= 0; i--) if (isFocusable(columnCards[i])) return columnCards[i]; 
    for (let i = targetRow + 1; i < columnCards.length; i++) if (isFocusable(columnCards[i])) return columnCards[i]; 
    return null;
};

// --- code/nav-base.js (MÓDULO CENTRAL DE NAVEGACIÓN) ---