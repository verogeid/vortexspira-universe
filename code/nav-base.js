// --- code/nav-base.js (REFRACTORIZADO A ES MODULE) ---

import * as debug from './debug.js';
import * as data from './data.js';

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
  
  _setupDetailFocusHandler.call(this); // Llamada con contexto de instancia
};

// ⭐️ HELPER: Clic en fila -> Solo pone foco (NO click) ⭐️
export function _handleActionRowClick(e) {
    // 'this' es la instancia de App
    debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Clic en fila de acción (Detalle) detectado.');
    
    if (!e.target.closest('.detail-action-btn')) {
        const btn = e.currentTarget.querySelector('.detail-action-btn');
        if (btn) {
            btn.focus(); 
        }
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
  // ⭐️ CORRECCIÓN: Verifica que el evento 'e' exista antes de usarlo ⭐️
  if (!e || !e.target) {
      debug.logWarn('nav_base', 'Clic de track ignorado: Evento o target indefinido.');
      return;
  }
  
  // 'this' es la instancia de App
  debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'CLICK/TAP DETECTADO:', e.type, 'Target:', e.target); 
  
  const tarjeta = e.target.closest('[data-id]'); 
  if (!tarjeta || tarjeta.dataset.tipo === 'relleno') {
      debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Clic ignorado: No es tarjeta válida (relleno o null).');
      return;
  }
  debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Tarjeta seleccionada:', tarjeta.dataset.id); 
  
  const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
  const newIndex = allCards.findIndex(c => c === tarjeta);
  
  if (newIndex === -1) {
      debug.logWarn('nav_base', 'Tarjeta seleccionada no encontrada en la lista de tarjetas activas.');
      return;
  }

  const parentFocusIndex = this.STATE.currentFocusIndex;
  const indexChanged = newIndex !== parentFocusIndex;

  this.STATE.currentFocusIndex = newIndex;
  this.stackUpdateCurrentFocus(newIndex); // Método delegado
  this._updateFocus(true); // Método delegado

  if (tarjeta.classList.contains('disabled')) return;
  if (tarjeta.dataset.tipo === 'volver-vertical') {
      this._handleVolverClick(); // Método delegado
      return;
  }
  
  const id = tarjeta.dataset.id;
  const tipo = tarjeta.dataset.tipo;
  const delay = indexChanged ? 300 : 0; 

  setTimeout(() => {
      this._handleCardClick(id, tipo, parentFocusIndex); // Método delegado
  }, delay);
};

export function _handleTrackMouseOver(e) {
    // 'this' es la instancia de App
    const tarjeta = e.target.closest('[data-id]');
    if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;
    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const newIndex = allCards.findIndex(c => c === tarjeta);
    if (newIndex > -1 && newIndex !== this.STATE.currentFocusIndex) {
        this._updateFocus(false); // Método delegado (solo sincroniza foco visual, sin slide)
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
        this._mostrarDetalle(id);             // Método delegado
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


export function _mostrarDetalle(cursoId) {
    // 'this' es la instancia de App
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Mostrando detalle del curso:', cursoId);
    const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion); // Método delegado
    if (!curso) {
        debug.logWarn('nav_base', 'Curso no encontrado para ID:', cursoId);
        return;
    }

    // ⭐️ Reasignar referencias de detalle ANTES de inyectar
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    this.DOM.vistaDetalle = isMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    this.DOM.detalleContenido = isMobile ? document.getElementById('detalle-contenido-mobile') : document.getElementById('detalle-contenido-desktop');


    const getIconHtml = (text) => {
        const lower = text.toLowerCase();
        if (lower.includes('adquirir') || lower.includes('comprar')) { return '🛒&#xFE0E;'; }
        let iconClass = 'icon-link'; 
        if (lower.includes('instalar') || lower.includes('descargar') || lower.includes('pwa')) { iconClass = 'icon-download'; }
        return `<i class="action-icon ${iconClass}"></i>`; 
    };

    let enlacesHtml = '';
    if (curso.enlaces && curso.enlaces.length > 0) {
        const itemsHtml = curso.enlaces.map(enlace => {
            const iconHtml = getIconHtml(enlace.texto);
            const isDisabled = !enlace.url || enlace.url === '#';
            const hrefAttr = isDisabled ? '' : `href="${enlace.url}"`;
            
            const classDisabledBtn = isDisabled ? 'disabled' : '';
            const classDisabledText = ''; 
            
            const tabIndex = '0'; 
            const targetAttr = isDisabled ? '' : 'target="_blank"';
            
            const onclickAttr = isDisabled ? 'onclick="return false;"' : '';

            return `
              <div class="detail-action-item" onclick="App._handleActionRowClick(event)" style="cursor: pointer;">
                  <span class="detail-action-text ${classDisabledText}">${enlace.texto}</span>
                  <a ${hrefAttr} 
                     class="detail-action-btn ${classDisabledBtn}" 
                     ${targetAttr} 
                     tabindex="${tabIndex}" 
                     ${onclickAttr}
                     aria-label="${enlace.texto} ${isDisabled ? '(No disponible)' : ''}">
                     ${iconHtml}
                  </a>
              </div>`;
        }).join('');
        enlacesHtml = `<div class="detail-actions-list">${itemsHtml}</div>`;
    }

    let mobileBackHtml = '';
    
    if (isMobile) {
        mobileBackHtml = `
          <div class="mobile-back-header">
              <article class="card card-volver-vertical" 
                       role="button" 
                       tabindex="0" 
                       onclick="App._handleVolverClick()"
                       aria-label="Volver">
                  <h3>${data.LOGO_VOLVER} Volver</h3>
              </article>
          </div>
        `;
    }

    const titleHtml = `<h2 tabindex="0" style="outline:none;">${curso.titulo}</h2>`;

    this.DOM.detalleContenido.innerHTML = `
      ${mobileBackHtml}
      <div id="detalle-bloque-texto" tabindex="0"> 
        ${titleHtml}
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
      </div>
      <div id="detalle-bloque-acciones">
        ${enlacesHtml || '<p>No hay acciones disponibles para este curso.</p>'}
      </div>
    `;

    // ⭐️ Activación de la vista ⭐️
    this.DOM.vistaNav.classList.remove('active');
    this.DOM.vistaDetalle.classList.add('active');
    
    const screenWidth = window.innerWidth;
    const isTablet = screenWidth >= data.TABLET_MIN_WIDTH && screenWidth <= data.TABLET_MAX_WIDTH;

    let primerElementoFocuseable = null;

    if (!isMobile) { 
        // DESKTOP/TABLET
        if (this.DOM.cardNivelActual) {
           this.DOM.cardNivelActual.innerHTML = `<h3>${curso.titulo || 'Curso'}</h3>`;
           this.DOM.cardNivelActual.classList.add('visible'); 
        }
        
        this.DOM.cardVolverFija.classList.add('visible'); 
        this.DOM.cardVolverFijaElemento.classList.add('visible');
        this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`; 
        this.DOM.cardVolverFijaElemento.tabIndex = 0;
        
        primerElementoFocuseable = this.DOM.cardVolverFijaElemento;
        
    } else { 
        // MÓVIL
        this.DOM.infoAdicional.classList.remove('visible');
        this.DOM.cardVolverFija.classList.remove('visible');
        
        const firstInteractive = this.DOM.detalleContenido.querySelector('.card, .detail-action-btn');
        primerElementoFocuseable = firstInteractive; 
    }

    if (primerElementoFocuseable) {
        primerElementoFocuseable.focus();
        debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 'Foco en detalle:', primerElementoFocuseable.tagName, primerElementoFocuseable.id);
    }
};

/**
 * ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK) ⭐️
 */
export function _setupDetailFocusHandler() {
    // 'this' es la instancia de App
    document.addEventListener('focusin', (e) => {
        const focusedEl = e.target;
        const isDetailView = this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active'); 

        if (isDetailView) {
            const detailContainer = this.DOM.vistaDetalle; 
            const textBlock = detailContainer.querySelector('#detalle-bloque-texto');
            const actionsBlock = detailContainer.querySelector('.detail-actions-list');

            const isTextContentArea = focusedEl === textBlock || focusedEl.closest('#detalle-bloque-texto');
            const isActionContentArea = focusedEl === actionsBlock || focusedEl.closest('.detail-actions-list') || focusedEl.classList.contains('detail-action-btn');

            if (isTextContentArea) {
                detailContainer.classList.add('mode-focus-text');
                detailContainer.classList.remove('mode-focus-actions');
            } else if (isActionContentArea) {
                detailContainer.classList.add('mode-focus-actions');
                detailContainer.classList.remove('mode-focus-text');
            } else {
                detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
            }
        }
    });
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

export function _getFocusableDetailElements() {
    // 'this' es la instancia de App
    const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('.card, .detail-action-btn, #detalle-bloque-texto'));
    let elements = [];
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    if (!isMobile && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
        elements.push(this.DOM.cardVolverFijaElemento);
    } 
    elements.push(...detailLinks);
    return elements;
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