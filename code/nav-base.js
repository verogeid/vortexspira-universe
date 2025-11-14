// --- MODIFICADO: code/nav-base.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (Estáticos) ⭐️
    App.setupListeners = function() {
      // 1. Listener para "Volver" (MÓVIL / TABLET)
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
      if (this.DOM.cardVolverFija) {
          // 'keydown' se maneja globalmente en nav-keyboard.js
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverClick.bind(this));
      }
    };

    // ⭐️ 2. LISTENER DE CLIC DEL TRACK (Dinámico) ⭐️
    App.setupTrackClickListener = function() {
        if (this.DOM.track) {
            // Limpiar listener anterior para evitar duplicados
            if (this.DOM.track._clickListener) {
                this.DOM.track.removeEventListener('click', this.DOM.track._clickListener);
            }
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);
        }
    };


    // ⭐️ 3. MANEJADORES DE EVENTOS ⭐️
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('[data-id]'); 
      if (!tarjeta) return;

      if (tarjeta.dataset.tipo === 'relleno' || tarjeta.classList.contains('disabled')) {
        return;
      }

      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverClick();
          return;
      }

      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;

      // Sincronizar el foco al hacer clic
      const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const newIndex = allCards.findIndex(c => c === tarjeta);
      if (newIndex > -1) {
          this.STATE.currentFocusIndex = newIndex;
          this._updateFocus(false); // Actualizar foco sin deslizar
      }

      // Actuar sobre la tarjeta
      this._handleCardClick(id, tipo);
    };

    /**
     * Manejador centralizado para la activación de tarjetas (clic, Enter, Espacio)
     */
    App._handleCardClick = function(id, tipo) {
        if (tipo === 'categoria') {
            this.STATE.navStack.push(id);
            this.STATE.currentFocusIndex = 0; // Resetear foco al entrar
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    // ⭐️ 4. LÓGICA DE NAVEGACIÓN Y VISTAS ⭐️

    /**
     * Handler unificado para CUALQUIER acción de "Volver" (Escape, Botón, Tarjeta)
     */
    App._handleVolverClick = function() {
        // 1. Caso Detalle -> Navegación
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            
            // Re-renderizar la vista de navegación (para el modo correcto)
            this.renderNavegacion(); 

            // ⭐️⭐️⭐️ CORRECCIÓN ⭐️⭐️⭐️
            // La lógica de foco que estaba aquí era redundante.
            // renderNavegacion() ya llama a _updateFocus() internamente.
            // Añadir una segunda llamada a .focus() estaba causando el error.
        } 
        // 2. Caso Sub-sección -> Nivel anterior
        else if (this.STATE.navStack.length > 0) {
            this.STATE.navStack.pop();
            this.STATE.currentFocusIndex = 0; // Resetear foco
            this.renderNavegacion();

            // Forzar el foco de vuelta al slider o tarjeta "Volver"
             const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
             const isTablet = window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH;
             
             if (!isMobile && !isTablet && this.DOM.cardVolverFija.tabIndex === 0) {
                 // Modo Desktop: Foco en la tarjeta Volver Fija
                 this.DOM.cardVolverFija.focus();
             } else {
                 // Modo Móvil/Tablet: Foco en el primer elemento del track
                 const activeCard = this.DOM.track.querySelector('[tabindex="0"]');
                 if (activeCard) activeCard.focus();
             }
        }
    };

    /**
     * Muestra la vista de detalle del curso.
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
      if (!curso) return;

      let enlacesHtml = (curso.enlaces || []).map(enlace => 
        `<a href="${enlace.url || '#'}" class="enlace-curso" target="_blank" tabindex="0">${enlace.texto}</a>`
      ).join('');

      this.DOM.detalleContenido.innerHTML = `
        <h2>${curso.titulo}</h2>
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
        <div class="enlaces-curso">
          ${enlacesHtml || 'No hay enlaces para este curso.'}
        </div>
      `;

      // Determinar modo
      const screenWidth = window.innerWidth;
      const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
      const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

      // Ocultar la vista de navegación activa
      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');

      let primerElementoFocuseable = null;

      if (!isMobile && !isTablet) { // Solo Desktop
          this.DOM.cardVolverFija.style.display = 'flex';
          this.DOM.cardVolverFija.tabIndex = 0;
          primerElementoFocuseable = this.DOM.cardVolverFija;
          this.DOM.infoAdicional.style.display = 'block'; 
          
          if (this.DOM.cardNivelActual) {
              this.DOM.cardNivelActual.style.display = 'flex';
              this.DOM.cardNivelActual.innerHTML = `<h3>${curso.titulo}</h3>`; 
          }

      } else { // Móvil O Tablet
          this.DOM.btnVolverNav.style.display = 'block';
          this.DOM.btnVolverNav.tabIndex = 0; 
          primerElementoFocuseable = this.DOM.btnVolverNav;
      }

      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };

    // ⭐️ 5. FUNCIONES DE AYUDA (Helpers) ⭐️
    
    /**
     * Helper para nav-keyboard.js (Vista Detalle)
     */
    App._getFocusableDetailElements = function() {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;
        
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('a.enlace-curso[tabindex="0"]'));
        let elements = [];

        if (!isMobile && !isTablet && this.DOM.cardVolverFija.tabIndex === 0) {
            elements.push(this.DOM.cardVolverFija);
        } else if ((isMobile || isTablet) && this.DOM.btnVolverNav.style.display === 'block') {
            elements.push(this.DOM.btnVolverNav);
        }

        elements.push(...detailLinks);
        return elements.filter(el => el && el.tabIndex !== -1);
    };
    
    /**
     * Helper para nav-tactil.js (Swipe)
     */
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        const isFocusable = (card) => {
            return card && card.dataset.id && card.dataset.tipo !== 'relleno' && !card.classList.contains('disabled');
        };

        // 1. Intentar la misma fila
        if (isFocusable(columnCards[targetRow])) {
            return columnCards[targetRow];
        }
        // 2. Buscar hacia ARRIBA
        for (let i = targetRow - 1; i >= 0; i--) {
            if (isFocusable(columnCards[i])) {
                return columnCards[i];
            }
        }
        // 3. Buscar hacia ABAJO
        for (let i = targetRow + 1; i < columnCards.length; i++) {
            if (isFocusable(columnCards[i])) {
                return columnCards[i];
            }
        }
        // 4. No se encontró nada
        return null;
    };

})();