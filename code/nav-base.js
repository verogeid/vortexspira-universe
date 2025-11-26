// --- code/nav-base.js ---
(function() {

    // ⭐️ 1. SETUP LISTENERS ⭐️
    App.setupListeners = function() {
      log('nav_base', DEBUG_LEVELS.DEEP, 'Inicializando listeners de elementos fijos (Volver/Detalle).');
      
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
          this.DOM.btnVolverNav.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._handleVolverClick(); }
          });
      }
      if (this.DOM.cardVolverFijaElemento) { 
          this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
      }
      
      // ⭐️ AÑADIDO: Inicializar el manejador de foco para la vista de detalle (Blur Mask) ⭐️
      this._setupDetailFocusHandler();
    };

    // ⭐️ HELPER: Clic en fila -> Solo pone foco (NO click) ⭐️
    App._handleActionRowClick = function(e) {
        log('nav_base', DEBUG_LEVELS.DEEP, 'Clic en fila de acción (Detalle) detectado.');
        
        // Si el clic NO fue directamente en el botón (fue en el texto o contenedor)
        if (!e.target.closest('.detail-action-btn')) {
            const btn = e.currentTarget.querySelector('.detail-action-btn');
            // Si existe y no está deshabilitado (aunque el foco sí se permite en disabled, la acción no)
            // En este caso, queremos mover el foco siempre para que el usuario vea dónde está.
            if (btn) {
                btn.focus(); 
            }
        }
    };

    // ⭐️ 2. POINTER LISTENERS (CLAVE: Adjuntar listeners programáticos a los tracks) ⭐️
    App.setupTrackPointerListeners = function() { 
        log('nav_base', DEBUG_LEVELS.DEEP, 'Ejecutando setupTrackPointerListeners.');
        
        if (this.DOM.track) {
            
            // --- Limpieza de Listeners Antiguos (Importante para evitar duplicados) ---
            if (this.DOM.track._clickListener) { this.DOM.track.removeEventListener('click', this.DOM.track._clickListener); }
            if (this.DOM.track._mouseoverListener) { this.DOM.track.removeEventListener('mouseover', this.DOM.track._mouseoverListener); }
            if (this.DOM.track._touchEndListener) { this.DOM.track.removeEventListener('touchend', this.DOM.track._touchEndListener); }
            log('nav_base', DEBUG_LEVELS.DEEP, 'Listeners antiguos limpiados en:', this.DOM.track.id);

            // --- Adjunción de Listeners Nuevos ---
            
            // ⭐️ 1. Click Listener (Delegación programática) ⭐️
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);
            log('nav_base', DEBUG_LEVELS.DEEP, 'Listener "click" adjuntado.');

            // ⭐️ 2. Touchend Listener (Delegación programática para táctil) ⭐️
            // NOTA: Con el 'onclick' en línea añadido en render-base.js, este listener puede ser redundante o causar duplicidad.
            this.DOM.track._touchEndListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('touchend', this.DOM.track._touchEndListener);
            log('nav_base', DEBUG_LEVELS.DEEP, 'Listener "touchend" adjuntado.');
            
            // ⭐️ 3. Mouse Over Listener (Hover/Foco visual) ⭐️
            this.DOM.track._mouseoverListener = this._handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
            log('nav_base', DEBUG_LEVELS.DEEP, 'Listener "mouseover" adjuntado.');
        } else {
            logError('nav_base', 'this.DOM.track es nulo al adjuntar listeners.');
        }
    };

    // ⭐️ 3. HANDLERS ⭐️
    App._handleTrackClick = function(e) {
      log('nav_base', DEBUG_LEVELS.DEEP, 'CLICK/TAP DETECTADO:', e.type, 'Target:', e.target); // <-- LÍNEA CLAVE DE DEPURACIÓN
      
      const tarjeta = e.target.closest('[data-id]'); 
      if (!tarjeta || tarjeta.dataset.tipo === 'relleno') {
          log('nav_base', DEBUG_LEVELS.DEEP, 'Clic ignorado: No es tarjeta válida (relleno o null).');
          return;
      }
      log('nav_base', DEBUG_LEVELS.DEEP, 'Tarjeta seleccionada:', tarjeta.dataset.id); // <-- LÍNEA CLAVE DE DEPURACIÓN
      
      const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const newIndex = allCards.findIndex(c => c === tarjeta);
      
      if (newIndex === -1) {
          logWarn('nav_base', 'Tarjeta seleccionada no encontrada en la lista de tarjetas activas.');
          return;
      }

      const parentFocusIndex = this.STATE.currentFocusIndex;
      const indexChanged = newIndex !== parentFocusIndex;

      this.STATE.currentFocusIndex = newIndex;
      App.stackUpdateCurrentFocus(newIndex); 
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

    App._handleTrackMouseOver = function(e) {
        const tarjeta = e.target.closest('[data-id]');
        if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newIndex = allCards.findIndex(c => c === tarjeta);
        if (newIndex > -1 && newIndex !== this.STATE.currentFocusIndex) {
            this._updateVisualFocus(newIndex);
        }
    };

    App._updateVisualFocus = function(newIndex) {
        // ... (lógica de actualización visual sin cambios) ...
        const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
        allCardsInTrack.forEach(card => {
            card.classList.remove('focus-visible');
            card.removeAttribute('aria-current');
        });
        if (App.DOM.cardVolverFijaElemento) { 
            App.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
            App.DOM.cardVolverFijaElemento.removeAttribute('aria-current');
        }
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;
        let normalizedIndex = newIndex;
        if (normalizedIndex < 0) normalizedIndex = 0;
        if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
        const nextFocusedCard = allCards[normalizedIndex];
        this.STATE.currentFocusIndex = normalizedIndex;
        App.stackUpdateCurrentFocus(normalizedIndex);
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.setAttribute('aria-current', 'true');
        }
    };

    App._handleCardClick = function(id, tipo, parentFocusIndex) {
        // ... (lógica de click de tarjeta sin cambios) ...
        const focusParaGuardar = (parentFocusIndex !== undefined) ? parentFocusIndex : this.STATE.currentFocusIndex;
        if (tipo === 'categoria') {
            App.stackPush(id, focusParaGuardar);
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    // ⭐️ 4. NAVEGACIÓN Y VOLVER ⭐️
    App._handleVolverClick = function() {
        log('nav_base', DEBUG_LEVELS.BASIC, 'Acción Volver iniciada.');
        const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
        
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            // ... (lógica de salir de detalle sin cambios) ...
            this.DOM.vistaDetalle.classList.remove('active'); 
            
            if (isMobile && document.getElementById('detalle-bloque-acciones-mobile')) {
                 document.getElementById('detalle-bloque-acciones-mobile').style.display = 'none';
            }
            
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
            this.renderNavegacion(); 
            
        } 
        else if (App.STATE.historyStack.length > 1) { 
            // ... (lógica de volver un nivel sin cambios) ...
            App.stackPop(); 
            this.renderNavegacion();
             const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
             const isTablet = window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH;
             if (!isMobile && !isTablet && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
                 this.DOM.cardVolverFijaElemento.focus();
             } else if (isMobile || isTablet) {
                 const firstCard = this.DOM.track.querySelector('[data-id]:not([data-tipo="relleno"])');
                 if (firstCard) firstCard.focus();
             }
        } else {
             log('nav_base', DEBUG_LEVELS.BASIC, 'Volver bloqueado: Ya estamos en el nivel raíz.');
        }
    };

    /**
     * ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK) ⭐️
     */
    App._setupDetailFocusHandler = function() {
        // ... (lógica de focusin en detalle sin cambios) ...
        document.addEventListener('focusin', (e) => {
            const focusedEl = e.target;
            const isDetailView = App.DOM.vistaDetalle && App.DOM.vistaDetalle.classList.contains('active');

            if (isDetailView) {
                const detailContainer = App.DOM.vistaDetalle; 
                const textBlock = detailContainer.querySelector('#detalle-bloque-texto');
                const actionsBlock = detailContainer.querySelector('.detail-actions-list');

                const isTextContentArea = focusedEl === textBlock || focusedEl.closest('#detalle-bloque-texto');
                const isActionContentArea = focusedEl === actionsBlock || focusedEl.closest('.detail-actions-list') || focusedEl.classList.contains('detail-action-btn');

                if (isTextContentArea) {
                    detailContainer.classList.add('mode-focus-text');
                    detailContainer.classList.remove('mode-focus-actions');
                    if (textBlock) textBlock.focus(); 
                } else if (isActionContentArea) {
                    detailContainer.classList.add('mode-focus-actions');
                    detailContainer.classList.remove('mode-focus-text');
                } else {
                    detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
                }
            }
        });
    };
    
    /**
     * ⭐️ MUESTRA DETALLE DEL CURSO ⭐️
     */
    App._mostrarDetalle = function(cursoId) {
      log('nav_base', DEBUG_LEVELS.BASIC, 'Mostrando detalle del curso:', cursoId);
      const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
      if (!curso) {
          logWarn('nav_base', 'Curso no encontrado para ID:', cursoId);
          return;
      }

      // ... (lógica de inyección de HTML de detalle sin cambios) ...

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

      const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
      let mobileBackHtml = '';
      
      if (isMobile) {
          mobileBackHtml = `
            <div class="mobile-back-header">
                <article class="card card-volver-vertical" 
                         role="button" 
                         tabindex="0" 
                         onclick="App._handleVolverClick()"
                         aria-label="Volver">
                    <h3>${LOGO_VOLVER} Volver</h3>
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

      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');
      
      const screenWidth = window.innerWidth;
      const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

      let primerElementoFocuseable = null;

      if (!isMobile) { 
          // ... (lógica de escritorio/tablet sin cambios) ...
          if (this.DOM.cardNivelActual) {
             this.DOM.cardNivelActual.innerHTML = `<h3>${curso.titulo || 'Curso'}</h3>`;
             this.DOM.cardNivelActual.classList.add('visible'); 
          }
          
          if (isTablet) {
              this.DOM.infoAdicional.classList.remove('visible');
          } else {
              this.DOM.infoAdicional.classList.add('visible'); 
          }
          
          this.DOM.cardVolverFija.classList.add('visible'); 
          this.DOM.cardVolverFijaElemento.classList.add('visible');
          this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${LOGO_VOLVER}</h3>`; 
          this.DOM.cardVolverFijaElemento.tabIndex = 0;
          
          primerElementoFocuseable = this.DOM.cardVolverFijaElemento;
          
      } else { 
          // MÓVIL
          this.DOM.infoAdicional.classList.remove('visible');
          this.DOM.cardVolverFija.classList.remove('visible');
          
          const actionBlockMobile = document.getElementById('detalle-bloque-acciones-mobile');
          if (actionBlockMobile) actionBlockMobile.style.display = 'block';

          const firstInteractive = this.DOM.detalleContenido.querySelector('.card, .detail-action-btn');
          primerElementoFocuseable = firstInteractive; 
      }

      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
          log('navBase', DEBUG_LEVELS.DEEP, 'Foco en detalle:', primerElementoFocuseable.tagName, primerElementoFocuseable.id);
      }
    };

    // ⭐️ 5. HELPERS ⭐️
    App._getFocusableDetailElements = function() {
        // ... (helper sin cambios) ...
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('.card, .detail-action-btn, #detalle-bloque-texto'));
        let elements = [];
        const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
        
        if (!isMobile && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
            elements.push(this.DOM.cardVolverFijaElemento);
        } 
        elements.push(...detailLinks);
        return elements;
    };
    
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        // ... (helper sin cambios) ...
        const isFocusable = (card) => { return card && card.dataset.id && card.dataset.tipo !== 'relleno'; };
        if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
        for (let i = targetRow - 1; i >= 0; i--) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        for (let i = targetRow + 1; i < columnCards.length; i++) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        return null;
    };

})();