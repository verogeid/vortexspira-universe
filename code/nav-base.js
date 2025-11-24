// --- code/nav-base.js ---
(function() {

    // ⭐️ 1. SETUP LISTENERS ⭐️
    App.setupListeners = function() {
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

    // ⭐️ 2. POINTER LISTENERS ⭐️
    App.setupTrackPointerListeners = function() { 
        if (this.DOM.track) {
            if (this.DOM.track._clickListener) { this.DOM.track.removeEventListener('click', this.DOM.track._clickListener); }
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);

            if (this.DOM.track._mouseoverListener) { this.DOM.track.removeEventListener('mouseover', this.DOM.track._mouseoverListener); }
            this.DOM.track._mouseoverListener = this._handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
        }
    };

    // ⭐️ 3. HANDLERS ⭐️
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('[data-id]'); 
      if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;

      const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const newIndex = allCards.findIndex(c => c === tarjeta);
      
      if (newIndex === -1) return;

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
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
            this.renderNavegacion(); 
        } 
        else if (App.STATE.historyStack.length > 1) { 
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
        }
    };

    /**
     * ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK) ⭐️
     */
    App._setupDetailFocusHandler = function() {
        // Usar el contenedor principal de la aplicación para observar los cambios de foco
        // Se asume que este listener se llama solo una vez en App.init.
        document.addEventListener('focusin', (e) => {
            const focusedEl = e.target;
            const isDetailView = App.DOM.vistaDetalle && App.DOM.vistaDetalle.classList.contains('active');

            // Solo actuar si estamos en la vista de detalle activa
            if (isDetailView) {
                const detailContainer = App.DOM.vistaDetalle; // Puede ser desktop o mobile
                const textBlock = detailContainer.querySelector('#detalle-bloque-texto');
                const actionsBlock = detailContainer.querySelector('.detail-actions-list');


                // 1. Identificar Texto vs Acciones
                // Verificamos si el foco está en el bloque de texto o en el h2 (que es el primer tabbable del bloque)
                const isTextContentArea = focusedEl === textBlock || focusedEl.closest('#detalle-bloque-texto');
                // Verificamos si el foco está en el bloque de acciones
                const isActionContentArea = focusedEl === actionsBlock || focusedEl.closest('.detail-actions-list') || focusedEl.classList.contains('detail-action-btn');

                // 2. Aplicar/Quitar Clases al Contenedor (#vista-detalle-desktop o #vista-detalle-mobile)
                if (isTextContentArea) {
                    detailContainer.classList.add('mode-focus-text');
                    detailContainer.classList.remove('mode-focus-actions');
                    // Aplicar el ghost focus (borde azul) al bloque de texto
                    if (textBlock) textBlock.focus(); 
                } else if (isActionContentArea) {
                    detailContainer.classList.add('mode-focus-actions');
                    detailContainer.classList.remove('mode-focus-text');
                } else {
                    // Limpiar si el foco está fuera de las dos áreas (ej. en el botón volver móvil o título principal)
                    detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
                }
            }
        });
    };
    
    /**
     * ⭐️ MUESTRA DETALLE DEL CURSO ⭐️
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
      if (!curso) return;

      // ⭐️ Scroll Reset ⭐️
      window.scrollTo(0, 0);
      if (this.DOM.vistaDetalle) this.DOM.vistaDetalle.scrollTop = 0;
      if (this.DOM.detalleContenido) this.DOM.detalleContenido.scrollTop = 0;

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
              
              // ⭐️ CORRECCIÓN: Clase disabled SOLO al botón, NO al texto ⭐️
              const classDisabledBtn = isDisabled ? 'disabled' : '';
              const classDisabledText = ''; // Texto siempre limpio (blanco por CSS)
              
              const tabIndex = '0'; 
              const targetAttr = isDisabled ? '' : 'target="_blank"';
              
              // Bloquear acción nativa si está deshabilitado
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
      
      // ⭐️ MÓVIL: Inyectar CARD de volver (Es visible y funciona como breadcrumb) ⭐️
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

      const screenWidth = window.innerWidth;
      const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');
      // La máscara se gestiona en _setupDetailFocusHandler()

      let primerElementoFocuseable = null;

      if (!isMobile) { 
          // DESKTOP/TABLET
          if (isTablet) {
              this.DOM.infoAdicional.classList.remove('visible');
          } else {
              this.DOM.infoAdicional.classList.add('visible'); 
          }
          
          this.DOM.cardVolverFija.classList.add('visible'); 
          this.DOM.cardNivelActual.classList.remove('visible'); 
          
          this.DOM.cardVolverFijaElemento.classList.add('visible');
          this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${LOGO_VOLVER}</h3>`; 
          this.DOM.cardVolverFijaElemento.tabIndex = 0;
          
          primerElementoFocuseable = this.DOM.cardVolverFijaElemento;

      } else { 
          // MÓVIL
          this.DOM.infoAdicional.classList.remove('visible');
          this.DOM.cardVolverFija.classList.remove('visible');
          
          // Foco al primer elemento interactivo (Card Volver en móvil)
          const firstInteractive = this.DOM.detalleContenido.querySelector('.card, .detail-action-btn');
          primerElementoFocuseable = firstInteractive; 
      }

      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };

    // ⭐️ 5. HELPERS ⭐️
    App._getFocusableDetailElements = function() {
        // Incluye card (volver movil), botones y el título h2
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('.card, .detail-action-btn, h2'));
        let elements = [];
        const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
        
        if (!isMobile && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
            elements.push(this.DOM.cardVolverFijaElemento);
        } 
        elements.push(...detailLinks);
        return elements;
    };
    
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        const isFocusable = (card) => { return card && card.dataset.id && card.dataset.tipo !== 'relleno'; };
        if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
        for (let i = targetRow - 1; i >= 0; i--) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        for (let i = targetRow + 1; i < columnCards.length; i++) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        return null;
    };

})();