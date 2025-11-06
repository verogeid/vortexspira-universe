// --- nav.js ---

// Asume que la variable App ya existe en el scope global.
(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (UNIFICADA) ⭐️
    App.setupListeners = function() {
      // 5.1. Listener para el track (delegación de eventos)
      if (this.DOM.track) {
          this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      }
      
      // 5.2. Listener para "Volver" (MÓVIL)
      // Apunta al NUEVO handler unificado
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
      }
      
      // 5.3. Listener para la Tarjeta Volver Fija (DESKTOP)
      // Apunta al NUEVO handler unificado
      if (this.DOM.cardVolverFija) {
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverClick.bind(this));
      }
      
      // 5.4. Listener para teclas (Escape y Flechas)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // El Escape también usa la lógica unificada
            this._handleVolverClick(); 
        }
        
        // Navegación con flechas (solo en vista de navegación)
        if (this.DOM.vistaNav.classList.contains('active')) {
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
            e.preventDefault(); 
            this._handleKeyNavigation(e.key);
          }
        } 
      });
    };

    // ⭐️ 2. MANEJADORES DE EVENTOS (Track y Teclas) ⭐️

    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('.swiper-slide');
      
      if (!tarjeta || tarjeta.classList.contains('disabled') || tarjeta.dataset.tipo === 'relleno') {
        return;
      }
      
      // Si es el botón 'Volver' vertical (móvil)
      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverClick(); // Usa el handler unificado
          return;
      }

      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;

      if (tipo === 'categoria') {
        this.STATE.navStack.push(id);
        this.renderNavegacion();
      } else if (tipo === 'curso') {
        this._mostrarDetalle(id);
      }
    };
    
    App._handleKeyNavigation = function(key) {
      const { itemsPorColumna } = this.STATE;
      const allSlides = this.DOM.track.children;
      const totalItems = allSlides.length;
      let newIndex = this.STATE.currentFocusIndex;

      if (totalItems === 0) return;
      
      const oldIndex = newIndex;

      switch (key) {
        case 'ArrowUp':
          newIndex = (newIndex - 1 + totalItems) % totalItems;
          break;
        case 'ArrowDown':
          newIndex = (newIndex + 1) % totalItems;
          break;
        case 'ArrowLeft':
          newIndex = (newIndex - itemsPorColumna + totalItems) % totalItems;
          break;
        case 'ArrowRight':
          newIndex = (newIndex + itemsPorColumna) % totalItems;
          break;
        case 'Enter':
        case ' ':
          const focusedCard = allSlides[newIndex];
          if (focusedCard) focusedCard.click();
          return;
      }
      
      // No mover el foco si el nuevo índice es un relleno (padding)
      if (newIndex < itemsPorColumna || allSlides[newIndex].dataset.tipo === 'relleno') {
         newIndex = oldIndex;
      }
      
      this.STATE.currentFocusIndex = newIndex;
      this._updateFocus(true);
    };

    // ⭐️ 3. FUNCIONES DE NAVEGACIÓN Y VISTA (UNIFICADAS) ⭐️

    /**
     * NUEVO: Handler unificado para CUALQUIER acción de "Volver"
     * (Tarjeta Fija, Botón Móvil, Tecla Escape).
     */
    App._handleVolverClick = function() {
        // Caso 1: Estamos en la vista de Detalle de un curso
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.vistaNav.classList.add('active');
            // Forzamos un re-render de la navegación para que
            // la tarjeta "Volver" muestre el estado correcto (p.ej., "Volver a Front-End")
            this.renderNavegacion(); 
        } 
        // Caso 2: Estamos en una sub-sección (pero en la vista de Navegación)
        else if (this.STATE.navStack.length > 0) {
            this.STATE.navStack.pop();
            this.renderNavegacion();
        }
        // (Si no se cumple nada, estamos en la raíz y no hace nada)
    };

    /**
     * MODIFICADO: Ahora también controla la visibilidad de la tarjeta "Volver".
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion);
      if (!curso) return;
      
      let enlacesHtml = (curso.enlaces || []).map(enlace => 
        `<a href="${enlace.url || '#'}" class="enlace-curso" target="_blank">${enlace.texto}</a>`
      ).join('');

      this.DOM.detalleContenido.innerHTML = `
        <h2>${curso.titulo}</h2>
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
        <div class="enlaces-curso">
          ${enlacesHtml || 'No hay enlaces para este curso.'}
        </div>
      `;
      
      // Cambiar vistas
      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');
      
      // ⭐️ NUEVO: Activar la tarjeta "Volver" (Desktop)
      const isMobile = window.innerWidth <= 768; 
      if (!isMobile) {
          this.DOM.cardVolverFija.style.display = 'flex';
          this.DOM.cardVolverFija.classList.add('active-volver');
          this.DOM.cardVolverFija.tabIndex = 0;
          
          // Aseguramos que la info adicional esté visible también
          this.DOM.infoAdicional.style.display = 'flex';
      }
    };

})();