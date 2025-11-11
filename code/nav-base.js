// --- nav-base.js ---

(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (UNIFICADA) ⭐️
    App.setupListeners = function() {

      // Delegamos el listener de teclado global a nav-teclado.js
      // Los listeners de clic/activación son más simples y se mantienen aquí.

      // 1. Listener para "Volver" (MÓVIL)
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
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverClick.bind(this));
          this.DOM.cardVolverFija.addEventListener('keydown', (e) => {
              // Manejamos la activación solo si está activo (tabindex=0)
              if ((e.key === 'Enter' || e.key === ' ') && this.DOM.cardVolverFija.tabIndex === 0) {
                  e.preventDefault();
                  this._handleVolverClick();
              }
          });
      }
      
      // La lógica de 'keydown' para todo el documento se moverá a nav-teclado.js
    };

    // ⭐️ Función para agregar el listener de CLIC al track activo (llamado desde render.js) ⭐️
    App.setupTrackClickListener = function() {
        if (this.DOM.track) {
            // Limpiar listeners anteriores para evitar duplicados
            // Nota: bind(this) crea una nueva función, necesitamos un enfoque diferente para removeEventListener
            // Para simplificar, asumimos que se llamará UNA VEZ o que el DOM.track se reemplaza.

            // Suscribir el listener de clic al track activo
            this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
        }
    };


    // ⭐️ 2. MANEJADOR DE EVENTOS (Track) - CLIC ⭐️
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('[data-id]'); 

      if (!tarjeta) return;

      // Si es una tarjeta deshabilitada o relleno
      if (tarjeta.dataset.tipo === 'relleno' || tarjeta.classList.contains('disabled')) {
        return;
      }

      // Si es el botón 'Volver' vertical (móvil)
      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverClick();
          return;
      }

      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;

      // Llamar a la función centralizada de manejo de clic/activación 
      this._handleCardClick(id, tipo);
    };

    /**
     * Manejador centralizado para la activación de tarjetas (clic, Enter, Espacio)
     */
    App._handleCardClick = function(id, tipo) {
        if (tipo === 'categoria') {
            this.STATE.navStack.push(id);
            // Restablecer el foco al primer elemento de la nueva vista
            this.STATE.currentFocusIndex = 0; 
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    // ⭐️ 3. FUNCIONES DE NAVEGACIÓN Y VISTA (UNIFICADAS) ⭐️

    /**
     * Handler unificado para CUALQUIER acción de "Volver" (Escape, Botón, Tarjeta)
     */
    App._handleVolverClick = function() {
        // 1. Caso Detalle -> Navegación
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.vistaNav.classList.add('active');
            
            // Reestablecer tabIndex de elementos de detalle
            this.DOM.cardVolverFija.tabIndex = -1;
            this.DOM.btnVolverNav.tabIndex = -1;

            this.renderNavegacion(); 

            // Forzar el foco de vuelta a la tarjeta que nos llevó al detalle
            const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
            const activeCard = allCards[this.STATE.currentFocusIndex] || this.DOM.track.querySelector('[tabindex="0"]');

            if (activeCard) {
                activeCard.focus();
            }
        } 
        // 2. Caso Sub-sección -> Nivel anterior
        else if (this.STATE.navStack.length > 0) {
            this.STATE.navStack.pop();
            this.STATE.currentFocusIndex = 0; // Resetear foco al primer elemento del nuevo nivel
            this.renderNavegacion();

            // Forzar el foco de vuelta al slider
            const activeCard = this.DOM.track.querySelector('[tabindex="0"]');
            if (activeCard) {
                activeCard.focus();
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
        // Asegurar que los enlaces tengan tabindex="0" para la trampa y flechas
        `<a href="${enlace.url || '#'}" class="enlace-curso" target="_blank" tabindex="0">${enlace.texto}</a>`
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

      const isMobile = window.innerWidth <= 768; 
      let primerElementoFocuseable = null;

      if (!isMobile) {
          // Mostrar y activar la tarjeta "Volver" (Desktop)
          this.DOM.cardVolverFija.style.display = 'flex';
          this.DOM.cardVolverFija.tabIndex = 0;
          primerElementoFocuseable = this.DOM.cardVolverFija;

          this.DOM.infoAdicional.style.display = 'block'; 
      } else {
          // En móvil, mostrar el botón de volver simple
          this.DOM.btnVolverNav.style.display = 'block';
          this.DOM.btnVolverNav.tabIndex = 0; 
          primerElementoFocuseable = this.DOM.btnVolverNav;
      }

      // Mover el foco al primer elemento de la nueva vista (el botón/tarjeta de volver)
      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };
    
    // ⭐️ 4. FUNCIÓN HELPER: Obtener elementos focuseables del detalle ⭐️
    // Se necesita en la vista detalle para navegación por flechas y Tab
    App._getFocusableDetailElements = function() {
        const isMobile = window.innerWidth <= 768;
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('a.enlace-curso[tabindex="0"]'));
        let elements = [];

        // Añadir la tarjeta Volver o el botón Volver móvil, si están activos
        if (!isMobile && this.DOM.cardVolverFija.tabIndex === 0) {
            elements.push(this.DOM.cardVolverFija);
        } else if (isMobile && this.DOM.btnVolverNav.style.display === 'block') {
            // Solo considerar el botón móvil si está visible
            elements.push(this.DOM.btnVolverNav);
        }

        // Agregar enlaces del curso
        elements.push(...detailLinks);

        // Devolvemos todos los elementos con tabindex=0 (o que son botones/enlaces sin -1)
        return elements.filter(el => el && el.tabIndex !== -1);
    };


})();
