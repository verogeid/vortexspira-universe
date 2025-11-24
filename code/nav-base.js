// --- code/nav-base.js ---

(function() {

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
    };

    App._handleActionRowClick = function(e) {
        if (!e.target.closest('.detail-action-btn')) {
            const btn = e.currentTarget.querySelector('.detail-action-btn');
            if (btn && !btn.classList.contains('disabled')) {
                btn.focus(); 
            }
        }
    };

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

    App._setupDetailFocusMask = function() {
        const container = document.getElementById('detalle-contenido');
        const textBlock = document.getElementById('detalle-bloque-texto');
        const actionsBlock = document.getElementById('detalle-bloque-acciones');

        if (!container || !textBlock || !actionsBlock) return;

        container.className = 'contenido-curso'; 

        actionsBlock.addEventListener('focusin', () => {
            container.classList.add('mode-focus-actions');
            container.classList.remove('mode-focus-text');
        });
        actionsBlock.addEventListener('mouseenter', () => {
             container.classList.add('mode-focus-actions');
             container.classList.remove('mode-focus-text');
        });

        textBlock.addEventListener('focusin', () => {
            container.classList.add('mode-focus-text');
            container.classList.remove('mode-focus-actions');
        });
        textBlock.addEventListener('mouseenter', () => {
             container.classList.add('mode-focus-text');
             container.classList.remove('mode-focus-actions');
        });
    };

    /**
     * ⭐️ MUESTRA DETALLE DEL CURSO ⭐️
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
      if (!curso) return;

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
              
              // Texto blanco, botón disabled
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

      // ⭐️ HTML MÓVIL: Generado SIEMPRE, oculto por CSS si no es móvil ⭐️
      
      // 1. Breadcrumb para detalle
      let breadcrumbText = 'Nivel Raíz';
      const currentLevel = App.stackGetCurrent();
      if (currentLevel && currentLevel.levelId) {
          const parentNode = App._findNodoById(currentLevel.levelId, App.STATE.fullData.navegacion);
          breadcrumbText = parentNode ? (parentNode.nombre || parentNode.titulo) : 'Nivel';
      }

      const mobileBreadcrumbHtml = `
        <div class="mobile-detail-breadcrumb">
             <article class="card card-breadcrumb-vertical" 
                 data-tipo="relleno" 
                 tabindex="-1" 
                 aria-hidden="true">
                 <h3>${breadcrumbText}</h3>
             </article>
        </div>
      `;

      // 2. Card Volver
      const mobileBackHtml = `
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

      const titleHtml = `<h2>${curso.titulo}</h2>`;
      const descHtml = `<p>${curso.descripcion || 'No hay descripción disponible.'}</p>`;

      // ⭐️ ESTRUCTURA CON BLOQUE DE TEXTO ENFOCABLE ⭐️
      this.DOM.detalleContenido.innerHTML = `
        ${mobileBreadcrumbHtml}
        ${mobileBackHtml}
        
        <div id="detalle-bloque-texto" tabindex="0">
            ${titleHtml}
            ${descHtml}
        </div>
        
        <div id="detalle-bloque-acciones">
            ${enlacesHtml || '<p>No hay acciones disponibles para este curso.</p>'}
        </div>
      `;

      const screenWidth = window.innerWidth;
      const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;
      const isMobile = screenWidth <= MOBILE_MAX_WIDTH; // Variable local para lógica JS inmediata

      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');
      
      this._setupDetailFocusMask();

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
          
          // En móvil, el foco inicial va a la card volver (que está dentro de detalle)
          const backCard = this.DOM.detalleContenido.querySelector('.card-volver-vertical');
          primerElementoFocuseable = backCard; 
      }

      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };

    // ⭐️ 5. HELPERS ⭐️
    App._getFocusableDetailElements = function() {
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('.card, .detail-action-btn'));
        
        // Incluir el bloque de texto para poder navegar a él
        const textBlock = document.getElementById('detalle-bloque-texto');
        
        let elements = [];
        const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
        
        if (!isMobile && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
            elements.push(this.DOM.cardVolverFijaElemento);
        }
        
        if (textBlock) elements.push(textBlock);

        elements.push(...detailLinks);
        return elements.filter(el => el && el.tabIndex !== -1);
    };
    
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        const isFocusable = (card) => { return card && card.dataset.id && card.dataset.tipo !== 'relleno'; };
        if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
        for (let i = targetRow - 1; i >= 0; i--) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        for (let i = targetRow + 1; i < columnCards.length; i++) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        return null;
    };

})();