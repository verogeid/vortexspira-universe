// --- code/nav-base.js (MÓDULO CENTRAL DE NAVEGACIÓN) ---

import * as debug from './debug.js';
import * as data from './data.js';

import * as nav_base_details from './nav-base-details.js'; 
import * as nav_mouse_details from './nav-mouse-details.js';


// ⭐️ 1. SETUP LISTENERS ⭐️
/**
 * Inicializa los listeners de elementos fijos y la vista de detalle.
 * Se llama con .call(this) desde VortexSpiraApp.init()
 */
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
  
  // ⬇️ Delegamos la configuración de handlers de foco y mouse de detalle ⬇️
  _setupDetailFocusHandler.call(this); 
};

// ⬇️ Lógica de inicialización del listener de foco en la vista de detalle. ⬇️
/**
 * Lógica de inicialización del listener de foco en la vista de detalle.
 */
function _setupDetailFocusHandler() {
    // 'this' es la instancia de App
    document.addEventListener('focusin', (e) => {
        const focusedEl = e.target;
        const isDetailView = this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active'); 

        if (isDetailView) {
            const focusedIsContent = focusedEl.closest('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical, #card-volver-fija-elemento');
            
            if (focusedIsContent) {
                // Si el elemento enfocado es parte de la vista de detalle, actualizamos el estado de foco.
                const swiper = this.STATE.detailCarouselInstance;
                
                if (swiper) {
                    // Actualizamos el estado de foco/blur inmediatamente.
                    nav_base_details._updateDetailFocusState(this);
                }
            }
        }
    });

    // ⭐️ NUEVO: Captura de foco por clic para Tablet/Desktop y Mobile ⭐️
    const handleDetailClickSync = (e) => {
        const focusable = e.target.closest('.detail-text-fragment, .detail-action-item');
        if (focusable) {
            // 1. Forzar el foco nativo en el elemento clicado
            focusable.focus();
            
            // 2. Sincronizar la posición del Swiper con el slide que contiene el elemento
            const slide = focusable.closest('.swiper-slide');
            const swiper = this.STATE.detailCarouselInstance;
            if (slide && swiper) {
                const slideIndex = Array.from(slide.parentNode.children).indexOf(slide);
                swiper.slideTo(slideIndex, data.SWIPE_SLIDE_SPEED);
            }
        }
    };

    if (this.DOM.vistaDetalleDesktop) {
        this.DOM.vistaDetalleDesktop.addEventListener('click', handleDetailClickSync);
    }
    if (this.DOM.vistaDetalleMobile) {
        this.DOM.vistaDetalleMobile.addEventListener('click', handleDetailClickSync);
    }
};


// ⭐️ 2. POINTER LISTENERS (Adjuntar listeners programáticos a los tracks) ⭐️
/**
 * Configura los listeners de mouse/touch para los carruseles (Desktop/Tablet).
 */
export function setupTrackPointerListeners() { 
    // 'this' es la instancia de App
    debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Ejecutando setupTrackPointerListeners.');
    
    if (this.DOM.track) {
        // Limpieza de listeners
        if (this.DOM.track._clickListener) { this.DOM.track.removeEventListener('click', this.DOM.track._clickListener); this.DOM.track._clickListener = null; }
        if (this.DOM.track._mouseoverListener) { this.DOM.track.removeEventListener('mouseover', this.DOM.track._mouseoverListener); this.DOM.track._mouseoverListener = null; }
        if (this.DOM.track._touchEndListener) { this.DOM.track.removeEventListener('touchend', this.DOM.track._touchEndListener); this.DOM.track._touchEndListener = null; }

        const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;

        if (!isMobile) {
            this.DOM.track._clickListener = _handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);
            
            this.DOM.track._mouseoverListener = _handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
        } else {
            this.DOM.track._mouseoverListener = _handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
        }
    }
};


// ⭐️ 3. HANDLERS ⭐️

export function _handleTrackClick(e) {
  if (!e || !e.target) return;
  
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

/**
 * Lógica de actualización de foco visual (delegada de render-base.js).
 */
export function _updateFocusImpl(shouldSlide = true) {
    const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;

    const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
    
    allCardsInTrack.forEach(card => {
        card.classList.remove('focus-visible');
        card.tabIndex = -1; 
        card.removeAttribute('aria-current'); 
    });
    if (this.DOM.cardVolverFijaElemento) {
        this.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
        this.DOM.cardVolverFijaElemento.removeAttribute('aria-current'); 
    }
    
    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    if (allCards.length === 0) return;
    
    let normalizedIndex = Math.max(0, Math.min(currentFocusIndex, allCards.length - 1));
    const nextFocusedCard = allCards[normalizedIndex];
    
    this.STATE.currentFocusIndex = normalizedIndex;
    this.stackUpdateCurrentFocus(normalizedIndex);
    
    if (nextFocusedCard) {
        nextFocusedCard.classList.add('focus-visible');
        nextFocusedCard.tabIndex = 0; 
        nextFocusedCard.setAttribute('aria-current', 'true'); 
        
        if (shouldSlide) {
            nextFocusedCard.focus(); 
        } else {
            nextFocusedCard.focus({ preventScroll: true }); 
        }
        
        if (!isMobile && carouselInstance && shouldSlide) {
            const targetSwiperSlide = Math.floor(normalizedIndex / itemsPorColumna) + 1; 
            if (targetSwiperSlide !== carouselInstance.realIndex) {
                this.STATE.keyboardNavInProgress = true; 
                carouselInstance.slideToLoop(targetSwiperSlide, 400);
            }
        } else if (isMobile && carouselInstance && shouldSlide) {
             let offset = (this.STATE.historyStack.length > 1) ? 2 : 0;
             const targetSlideIndex = normalizedIndex + offset;
             this.STATE.keyboardNavInProgress = true; 
             carouselInstance.slideTo(targetSlideIndex, data.SWIPE_SLIDE_SPEED); 
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
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Acción Volver iniciada.');
    
    if (this.DOM.vistaDetalle.classList.contains('active')) {
        this.DOM.vistaDetalle.classList.remove('active'); 
        this.renderNavegacion(); 
        setTimeout(() => {
             this._updateFocus(true); 
        }, data.SWIPE_SLIDE_SPEED); 
        this.STATE.activeCourseId = null;
        
    } 
    else if (this.STATE.historyStack.length > 1) { 
        this.stackPop();
        this.renderNavegacion();
        setTimeout(() => {
             this._updateFocus(true); 
        }, data.SWIPE_SLIDE_SPEED);
        return;
    }
};


// ⭐️ 5. HELPERS DE BÚSQUEDA Y ESTADO ⭐️

export function _findNodoById(id, nodos) {
    if (!nodos || !id) return null;
    for (const n of nodos) {
        if (n.id === id) return n;
        if (n.subsecciones && n.subsecciones.length > 0) {
            const encontrado = this._findNodoById(id, n.subsecciones); 
            if (encontrado) return encontrado;
        }
        if (n.cursos && n.cursos.length > 0) {
            const cursoEncontrado = n.cursos.find(c => c.id === id);
            if (cursoEncontrado) return cursoEncontrado;
        }
    }
    return null;
};

export function _tieneContenidoActivoImpl(nodoId) {
    const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
    if (!nodo) return false;
    if (nodo.titulo) return true; 
    if (nodo.cursos && nodo.cursos.length > 0) return true;
    if (nodo.subsecciones && nodo.subsecciones.length > 0) {
        for (const sub of nodo.subsecciones) {
            if (this._tieneContenidoActivo(sub.id)) return true;
        }
    }
    return false;
};

export function findBestFocusInColumn(columnCards, targetRow) {
    const isFocusable = (card) => { return card && card.dataset.id && card.dataset.tipo !== 'relleno'; };
    if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
    for (let i = targetRow - 1; i >= 0; i--) { 
        if (isFocusable(columnCards[i])) return columnCards[i]; 
    }
    for (let i = targetRow + 1; i < columnCards.length; i++) { 
        if (isFocusable(columnCards[i])) return columnCards[i]; 
    }
    return null;
};

// --- code/nav-base.js (MÓDULO CENTRAL DE NAVEGACIÓN) ---