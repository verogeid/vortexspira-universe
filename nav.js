// --- nav.js ---

(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (UNIFICADA) ⭐️
    App.setupListeners = function() {
      // 5.1. Listener para el track (delegación de eventos)
      if (this.DOM.track) {
          this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      }
      
      // 5.2. Listener para "Volver" (MÓVIL)
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
      }
      
      // 5.3. Listener para la Tarjeta Volver Fija (DESKTOP)
      if (this.DOM.cardVolverFija) {
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverClick.bind(this));
      }
      
      // 5.4. Listener para teclas (Escape y Flechas)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
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

    // ⭐️ 2. MANEJADOR DE EVENTOS (Track) ⭐️
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('.swiper-slide');
      
      if (!tarjeta || tarjeta.classList.contains('disabled') || tarjeta.dataset.tipo === 'relleno') {
        return;
      }
      
      // Si es el botón 'Volver' vertical (móvil)
      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverClick();
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
    
    // ⭐️ (Funciones de navegación por teclas omitidas por brevedad) ⭐️
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
      
      // Prevenir el foco en el relleno
      if (newIndex < itemsPorColumna || (allSlides[newIndex] && allSlides[newIndex].dataset.tipo === 'relleno')) {
         newIndex = oldIndex;
      }
      
      this.STATE.currentFocusIndex = newIndex;
      this._updateFocus(true);
    };


    // ⭐️ 3. FUNCIONES DE NAVEGACIÓN Y VISTA (UNIFICADAS) ⭐️

    /**
     * Handler unificado para CUALQUIER acción de "Volver"
     */
    App._handleVolverClick = function() {
        const isMobile = window.innerWidth <= 768;
        
        // Caso 1: Estamos en la vista de Detalle de un curso
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.vistaNav.classList.add('active');
            
            // Re-renderizar la navegación para actualizar el estado visual
            // (esto re-activará la tarjeta volver si aún estamos en subnivel)
            this.renderNavegacion(); 
        } 
        // Caso 2: Estamos en una sub-sección (en la vista de Navegación)
        else if (this.STATE.navStack.length > 0) {
            this.STATE.navStack.pop();
            this.renderNavegacion();
        }
    };

    /**
     * MODIFICADO: Ahora también controla la visibilidad de las columnas laterales.
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
      
      // ⭐️ CRÍTICO: Gestionar la visibilidad de las columnas laterales ⭐️
      const isMobile = window.innerWidth <= 768; 
      if (!isMobile) {
          // Mostrar y activar la tarjeta "Volver"
          this.DOM.cardVolverFija.style.display = 'flex';
          this.DOM.cardVolverFija.classList.add('active-volver');
          this.DOM.cardVolverFija.tabIndex = 0;
          
          // Asegurar que la info adicional esté visible también
          this.DOM.infoAdicional.style.display = 'flex';
      } else {
          // En móvil, mostrar el botón de volver simple
          this.DOM.btnVolverNav.style.display = 'block';
      }
    };

})();