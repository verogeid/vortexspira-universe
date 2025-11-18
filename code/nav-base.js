// --- code/nav-base.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (Estáticos) ⭐️
    App.setupListeners = function() {
      // 1. Listener para "Volver" (MÓVIL / TABLET - BOTÓN GLOBAL)
      // Aunque lo ocultamos por CSS, mantenemos el listener por si acaso se reactiva
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


    // ⭐️ 3. MANEJADORES DE EVENTOS (CORREGIDO CON NAV-STACK Y RACE CONDITION FIX) ⭐️
    
    /**
     * Al hacer CLIC: Mueve el foco real y desliza el carrusel.
     */
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('[data-id]'); 
      if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;

      const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const newIndex = allCards.findIndex(c => c === tarjeta);
      
      if (newIndex === -1) return;

      // ⭐️ CORRECCIÓN: Capturar el índice ANTES de actualizar, para saber desde dónde venimos
      const parentFocusIndex = this.STATE.currentFocusIndex;
      const indexChanged = newIndex !== parentFocusIndex;

      // Actualizar el estado al nuevo índice clicado
      this.STATE.currentFocusIndex = newIndex;
      App.stackUpdateCurrentFocus(newIndex); 
      
      // Centrar la tarjeta clicada (esto inicia la animación de 400ms)
      this._updateFocus(true); 

      // --- Manejar casos que NO navegan o tienen acción especial ---
      if (tarjeta.classList.contains('disabled')) return;
      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverClick();
          return;
      }
      
      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;

      // ⭐️ CORRECCIÓN (RACE CONDITION FIX) ⭐️
      // Esperar a que la animación de centrado (300-400ms) termine 
      // ANTES de navegar. Si navegamos inmediatamente, el nuevo carrusel
      // se inicializa con el offset de la animación antigua.
      
      const delay = indexChanged ? 300 : 0; // Solo esperar si hubo movimiento

      setTimeout(() => {
          this._handleCardClick(id, tipo, parentFocusIndex);
      }, delay);
    };

    /**
     * Al hacer HOVER: Mueve el foco VISUAL, pero NO el foco del navegador.
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
     * ⭐️ NUEVA FUNCIÓN LIGERA (Solo para Hover) (CORREGIDA CON NAV-STACK) ⭐️
     */
    App._updateVisualFocus = function(newIndex) {
        // 1. Limpiar focos visuales anteriores
        const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
        allCardsInTrack.forEach(card => {
            card.classList.remove('focus-visible');
            card.removeAttribute('aria-current');
        });
        if (App.DOM.cardVolverFijaElemento) { 
            App.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
            App.DOM.cardVolverFijaElemento.removeAttribute('aria-current');
        }

        // 2. Obtener la nueva tarjeta REAL
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        // 3. Normalizar y establecer estado
        let normalizedIndex = newIndex;
        if (normalizedIndex < 0) normalizedIndex = 0;
        if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
        
        const nextFocusedCard = allCards[normalizedIndex];
        this.STATE.currentFocusIndex = normalizedIndex;

        App.stackUpdateCurrentFocus(normalizedIndex);

        // 4. Aplicar nuevo foco VISUAL (sin .focus())
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.setAttribute('aria-current', 'true');
        }
    };


    /**
     * Manejador centralizado para la activación de tarjetas (clic, Enter, Espacio)
     * ⭐️ MODIFICADO: Acepta parentFocusIndex para guardar el estado correcto
     */
    App._handleCardClick = function(id, tipo, parentFocusIndex) {
        
        // ⭐️ CORRECCIÓN: Usar el índice pasado explícitamente o el actual por defecto
        const focusParaGuardar = (parentFocusIndex !== undefined) ? parentFocusIndex : this.STATE.currentFocusIndex;

        if (tipo === 'categoria') {
            // Guardamos en la pila el índice de la tarjeta que acabamos de dejar
            App.stackPush(id, focusParaGuardar);
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    // ⭐️ 4. LÓGICA DE NAVEGACIÓN Y VISTAS (CORREGIDA CON NAV-STACK) ⭐️

    /**
     * Handler unificado para CUALQUIER acción de "Volver" (Escape, Botón, Tarjeta)
     */
    App._handleVolverClick = function() {
        // 1. Caso Detalle -> Navegación
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            
            // ⭐️ Ocultar el botón global móvil al salir de detalle ⭐️
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
            
            this.renderNavegacion(); 
        } 
        // 2. Caso Sub-sección -> Nivel anterior
        else if (App.STATE.historyStack.length > 1) { 
            
            App.stackPop(); 
            this.renderNavegacion();

            // Forzar el foco de vuelta al slider o tarjeta "Volver"
             const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
             const isTablet = window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH;
             
             if (!isMobile && !isTablet && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
                 this.DOM.cardVolverFijaElemento.focus();
             } else if (isMobile || isTablet) {
                 // En móvil, el foco va a la tarjeta "Volver" (si existe) o "Breadcrumb"
                 const firstCard = this.DOM.track.querySelector('[data-id]:not([data-tipo="relleno"])');
                 if (firstCard) firstCard.focus();
             }
        }
    };

    /**
     * Muestra la vista de detalle del curso.
     * ⭐️ MODIFICADO: Lógica de visibilidad según las nuevas reglas ⭐️
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
          // Mostrar columna derecha
          this.DOM.infoAdicional.classList.add('visible'); 
          // Mostrar columna izquierda
          this.DOM.cardVolverFija.classList.add('visible'); 

          // ⭐️ REGLA: Ocultar breadcrumb en vista detalle ⭐️
          this.DOM.cardNivelActual.classList.remove('visible'); 
          
          // ⭐️ REGLA: Mostrar botón volver ⭐️
          this.DOM.cardVolverFijaElemento.classList.add('visible');
          this.DOM.cardVolverFijaElemento.innerHTML = `<h3>↩</h3>`; 
          this.DOM.cardVolverFijaElemento.tabIndex = 0;
          primerElementoFocuseable = this.DOM.cardVolverFijaElemento;

      } else { // Móvil O Tablet
          // Ocultar sidebars
          this.DOM.infoAdicional.classList.remove('visible');
          this.DOM.cardVolverFija.classList.remove('visible');
          
          // ⭐️ REGLA: Mostrar botón volver inyectado en la vista (no el global flotante) ⭐️
          // Buscamos si existe un botón 'volver' inyectado en el contenido (si lo hubiera)
          // O simplemente usamos el primer enlace.
          const firstLink = this.DOM.detalleContenido.querySelector('a, button');
          primerElementoFocuseable = firstLink; 
      }

      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };

    // ⭐️ 5. FUNCIONES DE AYUDA (Helpers) ⭐️
    
    /**
     * Helper para nav-keyboard.js (Vista Detalle)
     * ⭐️ MODIFICADO: Ahora usa .classList.contains('visible') ⭐️
     */
    App._getFocusableDetailElements = function() {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;
        
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('a.enlace-curso[tabindex="0"]'));
        let elements = [];

        if (!isMobile && !isTablet && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
            elements.push(this.DOM.cardVolverFijaElemento);
        } 
        // Nota: El botón global flotante ya no se añade aquí porque se ha eliminado/ocultado

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