// --- code/nav-base.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 

export function setupListeners() {
  if (this.DOM.cardVolverFijaElemento) { 
      this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
  }
  _setupDetailFocusHandler.call(this); 
};

function _setupDetailFocusHandler() {
    document.addEventListener('focusin', (e) => {
        if (this.DOM.vistaDetalle?.classList.contains('active')) {
            const focusedIsContent = e.target.closest('.detail-text-fragment, .detail-action-item, .card-volver-vertical, #card-volver-fija-elemento');
            if (focusedIsContent) nav_base_details._updateDetailFocusState(this);
        }
    });
};

export function _handleVolverClick() {
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Acción Volver (Esc/Click).');
    
    if (this.DOM.vistaDetalle?.classList.contains('active')) {
        nav_base_details._clearDetailVisualStates(this); 
        this.DOM.vistaDetalle.classList.remove('active'); 
        this.renderNavegacion(); 
        this.STATE.activeCourseId = null;
    } 
    else if (this.STATE.historyStack.length > 1) { 
        this.stackPop();
        this.renderNavegacion();
    }
};

export function _updateFocusImpl(shouldSlide = true) {
    const cards = Array.from(this.DOM.track.querySelectorAll('.card:not([data-tipo="relleno"])'));
    if (!cards.length) return;
    
    // Solo quitamos la clase visual, mantenemos tabIndex="0"
    cards.forEach(c => { 
        c.classList.remove('focus-visible'); 
        c.tabIndex = 0; 
    });
    
    const idx = Math.max(0, Math.min(this.STATE.currentFocusIndex, cards.length - 1));
    const target = cards[idx];
    this.STATE.currentFocusIndex = idx;

    if (target) {
        target.classList.add('focus-visible');
        // Usar preventScroll: true si no queremos que el navegador fuerce scroll nativo
        target.focus({ preventScroll: !shouldSlide });
        
        if (this.STATE.carouselInstance && shouldSlide) {
            // Salto atómico a la columna correspondiente (+1 por el slide de relleno inicial)
            const slide = Math.floor(idx / this.STATE.itemsPorColumna);
            this.STATE.carouselInstance.slideTo(slide + 1, data.SWIPE_SLIDE_SPEED);
        }
    }
}

export function _handleTrackClick(e) {
    const tarjeta = e.target.closest('[data-id]:not([data-tipo="relleno"])');
    if (!tarjeta) return;
    const cards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newIdx = cards.indexOf(tarjeta);
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
    else if (tipo === 'curso') this._mostrarDetalle(id);
}

export function _findNodoById(id, nodos) {
    if (!nodos || !id) return null;
    for (const n of nodos) {
        if (n.id === id) return n;
        if (n.subsecciones) {
            const res = _findNodoById(id, n.subsecciones);
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
    const isFocusable = (card) => card && card.dataset.id && card.dataset.tipo !== 'relleno';
    if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
    for (let i = 1; i < columnCards.length; i++) {
        if (isFocusable(columnCards[targetRow - i])) return columnCards[targetRow - i];
        if (isFocusable(columnCards[targetRow + i])) return columnCards[targetRow + i];
    }
    return null;
}

// --- code/nav-base.js ---