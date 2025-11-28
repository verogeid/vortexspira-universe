// --- code/nav-base.js (MÓDULO CENTRAL DE NAVEGACIÓN) ---

import * as debug from './debug.js';
import * as data from './data.js';
// Importamos el nuevo módulo de detalle para los listeners y helpers de foco
import * as nav_details from './nav-details.js'; 


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
  
  // Delegamos la configuración de handlers de foco de detalle
  nav_details._setupDetailFocusHandler.call(this); 
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
        debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Listeners CLIC/TOUCH programáticos eliminados.');

        const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;

        if (!isMobile) {
            // DESKTOP/TABLET: Confiamos en la delegación programática (SWIPER) 
            
            this.DOM.track._clickListener = _handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);
            
            this.DOM.track._mouseoverListener = _handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
            debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Listeners programáticos adjuntados para Desktop/Tablet.');

        } else {
            // MÓVIL: Confiamos en el "onclick" en línea (Render-base.js) 
            // Solo adjuntamos mouseover (por si se usa un ratón)
            this.DOM.track._mouseoverListener = _handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
            debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Solo mouseover programático adjuntado para Móvil.');
        }
    }
};


// ⭐️ 3. HANDLERS ⭐️

export function _handleTrackClick(e) {
  if (!e || !e.target) {
      debug.logWarn('nav_base', 'Clic de track ignorado: Evento o target indefinido.');
      return;
  }
  
  const tarjeta = e.target.closest('[data-id]'); 
  if (!tarjeta || tarjeta.dataset.tipo === 'relleno') {
      debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Clic ignorado: No es tarjeta válida (relleno o null).');
      return;
  }
  
  const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
  const newIndex = allCards.findIndex(c => c === tarjeta);
  
  if (newIndex === -1) {
      debug.logWarn('nav_base', 'Tarjeta seleccionada no encontrada en la lista de tarjetas activas.');
      return;
  }

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
    // 'this' es la instancia de App
    const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;

    const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
    
    // 1. Limpiar todos los focos y tabindex
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
    
    let normalizedIndex = currentFocusIndex;
    if (normalizedIndex < 0) normalizedIndex = 0;
    if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
    const nextFocusedCard = allCards[normalizedIndex];
    
    this.STATE.currentFocusIndex = normalizedIndex;
    this.stackUpdateCurrentFocus(normalizedIndex); // Método delegado
    
    // 2. Aplicar foco y tabindex="0" a la tarjeta correcta
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
            // ⭐️ USO DE VELOCIDAD LENTA (400ms) PARA MOVIMIENTO FLUIDO ANTI-FATIGA ⭐️
            if (targetSwiperSlide !== carouselInstance.realIndex) {
                this.STATE.keyboardNavInProgress = true; 
                carouselInstance.slideToLoop(targetSwiperSlide, 400); // Velocidad: 400ms
            }
        } else if (isMobile) {
            nextFocusedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};


export function _handleCardClick(id, tipo, parentFocusIndex) {
    // 'this' es la instancia de App
    const focusParaGuardar = (parentFocusIndex !== undefined) ? parentFocusIndex : this.STATE.currentFocusIndex;
    if (tipo === 'categoria') {
        this.stackPush(id, focusParaGuardar); // Método delegado
        this.renderNavegacion();              // Método delegado
    } else if (tipo === 'curso') {
        // Llama al método delegado en la instancia (this._mostrarDetalle, que ahora apunta a nav-details)
        this._mostrarDetalle(id);             
    }
};


export function _handleVolverClick() {
    // 'this' es la instancia de App
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Acción Volver iniciada.');
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const isTablet = window.innerWidth >= data.TABLET_MIN_WIDTH && window.innerWidth <= data.TABLET_MAX_WIDTH;
    
    if (this.DOM.vistaDetalle.classList.contains('active')) {
        // Salir de detalle
        this.DOM.vistaDetalle.classList.remove('active'); 
        
        // Resetear la vista genérica de detalle al Desktop por si acaso
        this.DOM.vistaDetalle = document.getElementById('vista-detalle-desktop');
        this.DOM.detalleContenido = document.getElementById('detalle-contenido-desktop');
        
        this.DOM.btnVolverNav.classList.remove('visible');
        this.DOM.btnVolverNav.tabIndex = -1;
        
        this.renderNavegacion(); 
        
    } 
    else if (this.STATE.historyStack.length > 1) { 
        // Volver un nivel
        this.stackPop(); // Método delegado
        this.renderNavegacion(); // Método delegado
        
         if (!isMobile && !isTablet && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
             this.DOM.cardVolverFijaElemento.focus();
         } else if (isMobile || isTablet) {
             const firstCard = this.DOM.track.querySelector('[data-id]:not([data-tipo="relleno"])');
             if (firstCard) firstCard.focus();
         }
    } else {
         debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Volver bloqueado: Ya estamos en el nivel raíz.');
    }
};


// ⭐️ 5. HELPERS DE BÚSQUEDA Y ESTADO ⭐️

/**
 * Busca un nodo por ID de forma recursiva.
 * Debe ser llamado usando el método delegado en la instancia (this._findNodoById)
 */
export function _findNodoById(id, nodos) {
    // 'this' es la instancia de App
    if (!nodos || !id) return null;
    for (const n of nodos) {
        if (n.id === id) return n;
        if (n.subsecciones && n.subsecciones.length > 0) {
            // ⭐️ CORRECCIÓN RECURSIVA: Debe usar this._findNodoById ⭐️
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

/**
 * Comprueba si una categoría tiene contenido (cursos o subsecciones activas).
 * Debe ser llamado usando el método delegado en la instancia (this._tieneContenidoActivo)
 */
export function _tieneContenidoActivoImpl(nodoId) {
    // 'this' es la instancia de App
    const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion); // Delegamos a _findNodoById de la instancia
    if (!nodo) return false;
    if (nodo.titulo) return true; 
    if (nodo.cursos && nodo.cursos.length > 0) return true;
    if (nodo.subsecciones && nodo.subsecciones.length > 0) {
        for (const sub of nodo.subsecciones) {
            if (this._tieneContenidoActivo(sub.id)) return true; // Llamada recursiva
        }
    }
    return false;
};

/**
 * Helper usado por nav-tactil para encontrar la mejor tarjeta donde posar el foco en una columna.
 */
export function findBestFocusInColumn(columnCards, targetRow) {
    const isFocusable = (card) => { return card && card.dataset.id && card.dataset.tipo !== 'relleno'; };
    
    // 1. Intentar la fila objetivo
    if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
    
    // 2. Intentar arriba
    for (let i = targetRow - 1; i >= 0; i--) { 
        if (isFocusable(columnCards[i])) return columnCards[i]; 
    }
    
    // 3. Intentar abajo
    for (let i = targetRow + 1; i < columnCards.length; i++) { 
        if (isFocusable(columnCards[i])) return columnCards[i]; 
    }
    return null;
};
