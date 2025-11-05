// --- nav.js ---

// Asume que la variable App ya existe en el scope global o será extendida.
// Las funciones auxiliares (_findNodoById, etc.) deben estar definidas antes (p.ej., en render.js o data.js).

(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS ⭐️
    App.setupListeners = function() {
      // 5.1. Listener para el track (delegación de eventos)
      if (this.DOM.track) {
          this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      }
      
      // 5.2. Listener para "Volver" simple (botón)
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverNav.bind(this));
      }

      // 5.3. Listener para "Volver" en Detalle
      if (this.DOM.btnVolverDetalle) {
          this.DOM.btnVolverDetalle.addEventListener('click', this._handleVolverDetalle.bind(this));
      }
      
      // 5.4. Listener para la Tarjeta Volver Fija (Escritorio)
      if (this.DOM.cardVolverFija) {
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverNav.bind(this));
      }
      
      // 5.5. Listener para teclas (Escape y Flechas)
      document.addEventListener('keydown', (e) => {
        if (this.DOM.vistaNav.classList.contains('active')) {
          if (e.key === 'Escape') {
            if (this.STATE.navStack.length > 0) this._handleVolverNav();
          } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
            e.preventDefault(); 
            this._handleKeyNavigation(e.key);
          }
        } 
        else if (this.DOM.vistaDetalle.classList.contains('active') && e.key === 'Escape') {
          this._handleVolverDetalle();
        }
      });
    };

    // ⭐️ 2. MANEJADORES DE EVENTOS ⭐️

    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('.swiper-slide');
      
      if (!tarjeta || tarjeta.classList.contains('disabled') || tarjeta.dataset.tipo === 'relleno') {
        return;
      }
      
      // Si es el botón 'Volver' vertical, activamos la navegación inversa.
      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverNav();
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
      
      if (allSlides[newIndex].classList.contains('disabled') || allSlides[newIndex].dataset.tipo === 'relleno') {
         newIndex = oldIndex;
      }
      
      this.STATE.currentFocusIndex = newIndex;
      this._updateFocus(true);
    };

    // ⭐️ 3. FUNCIONES DE NAVEGACIÓN Y VISTA ⭐️

    App._handleVolverNav = function() {
      if (this.STATE.navStack.length > 0) {
        this.STATE.navStack.pop();
        this.renderNavegacion();
      }
    };

    App._handleVolverDetalle = function() {
      this.DOM.vistaDetalle.classList.remove('active');
      this.DOM.vistaNav.classList.add('active');
    };

    App._mostrarDetalle = function(cursoId) {
      // Nota: asume que _findNodoById existe en el scope global (definido en otro módulo).
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
      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');
    };

})();
