// --- code/nav-base.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (Estáticos) ⭐️
    App.setupListeners = function() {
      // 1. Listener para "Volver" (MÓVIL / TABLET - BOTÓN GLOBAL)
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
          this.DOM.btnVolverNav.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this._handleVolverClick();
              }
          });
      }

      // 2. Listener para la Tarjeta Volver Fija (DESKTOP)
      if (this.DOM.cardVolverFijaElemento) { 
          this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
      }
    };

    // ⭐️ 2. LISTENER DE CLIC Y HOVER DEL TRACK (Dinámico) ⭐️
    App.setupTrackPointerListeners = function() { 
        if (this.DOM.track) {
            // --- Clic ---
            if (this.DOM.track._clickListener) {
                this.DOM.track.removeEventListener('click', this.DOM.track._clickListener);
            }
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);

            // --- MouseOver ---
            if (this.DOM.track._mouseoverListener) {
                this.DOM.track.removeEventListener('mouseover', this.DOM.track._mouseoverListener);
            }
            this.DOM.track._mouseoverListener = this._handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
        }
    };


    // ⭐️ 3. MANEJADORES DE EVENTOS ⭐️
    
    /**
     * Al hacer CLIC: Mueve el foco real y desliza el carrusel.
     */
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('[data-id]'); 
      if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;

      const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const newIndex = allCards.findIndex(c => c === tarjeta);
      
      if (newIndex === -1) return;

      // ⭐️ CORRECCIÓN: Capturar el índice ANTES de actualizar
      const parentFocusIndex = this.STATE.currentFocusIndex;
      const indexChanged = newIndex !== parentFocusIndex;

      // Actualizar el estado al nuevo índice clicado
      this.STATE.currentFocusIndex = newIndex;
      App.stackUpdateCurrentFocus(newIndex); 
      
      // Centrar la tarjeta clicada
      this._updateFocus(true); 

      // --- Manejar casos que NO navegan ---
      if (tarjeta.classList.contains('disabled')) return;
      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverClick();
          return;
      }
      
      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;

      // ⭐️ CORRECCIÓN (RACE CONDITION): Esperar a que la animación termine
      const delay = indexChanged ? 300 : 0; 

      setTimeout(() => {
          this._handleCardClick(id, tipo, parentFocusIndex);
      }, delay);
    };

    /**
     * Al hacer HOVER: Mueve el foco VISUAL.
     */
    App._handleTrackMouseOver = function(e) {
        const tarjeta = e.target.closest('[data-id]');
        if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;

        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newIndex = allCards.findIndex(c => c === tarjeta);

        if (newIndex > -1 && newIndex !== this.STATE.currentFocusIndex) {
            this._updateVisualFocus(newIndex);
        }
    };

    /**
     * ⭐️ NUEVA FUNCIÓN LIGERA (Solo para Hover) ⭐️
     */
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


    /**
     * Manejador centralizado para la activación de tarjetas.
     */
    App._handleCardClick = function(id, tipo, parentFocusIndex) {
        // ⭐️ CORRECCIÓN: Usar el índice pasado o el actual
        const focusParaGuardar = (parentFocusIndex !== undefined) ? parentFocusIndex : this.STATE.currentFocusIndex;

        if (tipo === 'categoria') {
            App.stackPush(id, focusParaGuardar);
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    // ⭐️ 4. LÓGICA DE NAVEGACIÓN Y VISTAS ⭐️

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
     * Muestra la vista de detalle del curso.
     * ⭐️ MODIFICADO: Renderizado de enlaces en formato Lista/Tabla con iconos ⭐️
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
      if (!curso) return;

      // Helper para elegir el icono
      const getIconForAction = (text) => {
          const lower = text.toLowerCase();
          if (lower.includes('instalar') || lower.includes('descargar')) return '⬇️';
          if (lower.includes('adquirir') || lower.includes('comprar')) return '🛒';
          return '🔗'; // Default
      };

      // Generar HTML de la nueva lista
      let enlacesHtml = '';
      if (curso.enlaces && curso.enlaces.length > 0) {
          const itemsHtml = curso.enlaces.map(enlace => {
              const icono = getIconForAction(enlace.texto);
              return `
                <div class="detail-action-item">
                    <span class="detail-action-text">${enlace.texto}</span>
                    <a href="${enlace.url || '#'}" 
                       class="detail-action-btn" 
                       target="_blank" 
                       tabindex="0"
                       aria-label="${enlace.texto}">
                       ${icono}
                    </a>
                </div>`;
          }).join('');
          
          enlacesHtml = `<div class="detail-actions-list">${itemsHtml}</div>`;
      }

      this.DOM.detalleContenido.innerHTML = `
        <h2>${curso.titulo}</h2>
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
        ${enlacesHtml || '<p>No hay acciones disponibles para este curso.</p>'}
      `;

      // Determinar modo
      const screenWidth = window.innerWidth;
      const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
      const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');

      let primerElementoFocuseable = null;

      if (!isMobile && !isTablet) { // Solo Desktop
          this.DOM.infoAdicional.classList.add('visible'); 
          this.DOM.cardVolverFija.classList.add('visible'); 
          this.DOM.cardNivelActual.classList.remove('visible'); 
          
          this.DOM.cardVolverFijaElemento.classList.add('visible');
          this.DOM.cardVolverFijaElemento.innerHTML = `<h3>↩</h3>`; 
          this.DOM.cardVolverFijaElemento.tabIndex = 0;
          primerElementoFocuseable = this.DOM.cardVolverFijaElemento;

      } else { // Móvil O Tablet
          this.DOM.infoAdicional.classList.remove('visible');
          this.DOM.cardVolverFija.classList.remove('visible');
          
          // Buscar el primer botón de la nueva lista
          const firstLink = this.DOM.detalleContenido.querySelector('.detail-action-btn');
          primerElementoFocuseable = firstLink; 
      }

      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };

    // ⭐️ 5. FUNCIONES DE AYUDA (Helpers) ⭐️
    
    /**
     * Helper para nav-keyboard.js (Vista Detalle)
     * ⭐️ MODIFICADO: Busca la nueva clase .detail-action-btn ⭐️
     */
    App._getFocusableDetailElements = function() {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;
        
        // CAMBIO AQUÍ: Selector actualizado
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('.detail-action-btn'));
        let elements = [];

        if (!isMobile && !isTablet && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
            elements.push(this.DOM.cardVolverFijaElemento);
        } 

        elements.push(...detailLinks);
        return elements.filter(el => el && el.tabIndex !== -1);
    };
    
    /**
     * Helper para nav-tactil.js (Swipe)
     */
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        const isFocusable = (card) => {
            return card && card.dataset.id && card.dataset.tipo !== 'relleno';
        };
        if (isFocusable(columnCards[targetRow])) {
            return columnCards[targetRow];
        }
        for (let i = targetRow - 1; i >= 0; i--) {
            if (isFocusable(columnCards[i])) {
                return columnCards[i];
            }
        }
        for (let i = targetRow + 1; i < columnCards.length; i++) {
            if (isFocusable(columnCards[i])) {
                return columnCards[i];
            }
        }
        return null;
    };

})();