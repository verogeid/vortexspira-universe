// --- nav.js ---

(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (UNIFICADA) ⭐️
    // NOTA: Esta función se llama desde app.js. Los listeners de clic del track
    // se manejan ahora dentro de render.js para asegurar que el targetTrack esté vivo.
    App.setupListeners = function() {
      
      // 5.2. Listener para "Volver" (MÓVIL)
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
      }
      
      // 5.3. Listener para la Tarjeta Volver Fija (DESKTOP)
      if (this.DOM.cardVolverFija) {
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverClick.bind(this));
      }
      
      // 5.4. Listener central de teclado (MODIFICADO para Tab, Flechas y Detalle)
      document.addEventListener('keydown', (e) => {
        const isNavActive = this.DOM.vistaNav ? this.DOM.vistaNav.classList.contains('active') : false;
        const isDetailActive = this.DOM.vistaDetalle ? this.DOM.vistaDetalle.classList.contains('active') : false;
            
        // El 'Escape' siempre debe funcionar
        if (e.key === 'Escape') {
            e.preventDefault();
            this._handleVolverClick(); 
            return;
        }

        // Caso 1: VISTA DE NAVEGACIÓN
        if (isNavActive) {
            // Flechas, Enter y Space para el carrusel (requiere preventDefault)
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault(); 
                this._handleKeyNavigation(e.key);
            } 
            // Interceptar Tab
            else if (e.key === 'Tab') {
                e.preventDefault();
                this._handleFocusTrap(e, 'nav');
            }
        } 
        // Caso 2: VISTA DE DETALLE
        else if (isDetailActive) {
            // Flechas, Enter y Space para la navegación de Detalle
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                this._handleDetailNavigation(e.key);
            }
            // Interceptar Tab
            else if (e.key === 'Tab') {
                e.preventDefault();
                this._handleFocusTrap(e, 'detail');
            }
        }
      });
    };
    
    // ⭐️ Función para agregar el listener de CLIC al track activo (llamado desde render.js) ⭐️
    // Necesario porque el DOM.track se redefine en cada render.
    App.setupTrackClickListener = function() {
        if (this.DOM.track) {
            // Limpiar listeners anteriores para evitar duplicados
            this.DOM.track.removeEventListener('click', this._handleTrackClick.bind(this));
            
            // Suscribir el listener de clic al track activo
            this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
        }
    };


    // ⭐️ 2. MANEJADOR DE EVENTOS (Track) - CORREGIDO PARA [data-id] ⭐️
    App._handleTrackClick = function(e) {
      // FIX CRÍTICO: Buscar la tarjeta por el selector más general [data-id]
      const tarjeta = e.target.closest('[data-id]'); 
      
      if (!tarjeta) {
        return;
      }
      
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

      if (tipo === 'categoria') {
        this.STATE.navStack.push(id);
        this.renderNavegacion();
      } else if (tipo === 'curso') {
        this._mostrarDetalle(id);
      }
    };
    
    // ⭐️ 3. NAVEGACIÓN POR TECLADO (FLECHAS) - VISTA NAV ⭐️
    App._handleKeyNavigation = function(key) {
      
      // Verificar si el foco está DENTRO del Swiper 
      const activeElement = document.activeElement;
      if (!activeElement || !activeElement.closest('#track-desktop, #track-mobile')) {
          return; 
      }
      
      const { itemsPorColumna } = this.STATE;
      const allSlides = Array.from(this.DOM.track.children);
      const totalItems = allSlides.length;
      
      // Usar el elemento enfocado como punto de partida
      const currentFocusedSlide = activeElement.closest('[data-id]');
      let newIndex = Array.from(allSlides).indexOf(currentFocusedSlide);
      
      if (newIndex === -1 || totalItems === 0) return;
      
      const oldIndex = newIndex;

      // Filtrar slides "reales" (no relleno) para navegación
      const navigableSlides = allSlides.map((slide, index) => ({ slide, index }))
                                     .filter(item => item.slide.dataset.tipo !== 'relleno');
      
      const currentNavigableIndex = navigableSlides.findIndex(item => item.index === newIndex);

      switch (key) {
        case 'ArrowUp':
          if (currentNavigableIndex > 0) {
            newIndex = navigableSlides[currentNavigableIndex - 1].index;
          }
          break;
        case 'ArrowDown':
          if (currentNavigableIndex < navigableSlides.length - 1) {
            newIndex = navigableSlides[currentNavigableIndex + 1].index;
          }
          break;
        case 'ArrowLeft':
            let prevColIndex = newIndex - itemsPorColumna;
            // FIX: Permitir el loop en la navegación de columna/fila
            newIndex = (prevColIndex < 0) ? totalItems - 1 : prevColIndex;
          break;
        case 'ArrowRight':
            let nextColIndex = newIndex + itemsPorColumna;
            // FIX: Permitir el loop en la navegación de columna/fila
            newIndex = (nextColIndex >= totalItems) ? 0 : nextColIndex;
          break;
        case 'Enter':
        case ' ':
          // ACTIVACIÓN: Activar click sobre el elemento enfocado
          currentFocusedSlide.click();
          return;
      }
      
      if (newIndex !== oldIndex && allSlides[newIndex]) {
          this.STATE.currentFocusIndex = newIndex;
          this._updateFocus(true);
      }
    };

    // ⭐️ 4. FUNCIÓN HELPER: _handleFocusTrap (TAB) - DOBLE HALO FIX ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const isMobile = window.innerWidth <= 768;
        let focusableElements = [];
        
        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        const activeCard = this.DOM.track.querySelector('[tabindex="0"]');

        if (viewType === 'nav') {
            if (isMobile) {
                const btnVolver = this.DOM.btnVolverNav.style.display === 'none' ? null : this.DOM.btnVolverNav;
                focusableElements = [btnVolver, activeCard, ...footerLinks].filter(Boolean);
            } else {
                const cardVolver = this.DOM.cardVolverFija.style.display === 'none' ? null : this.DOM.cardVolverFija;
                focusableElements = [cardVolver, activeCard, ...footerLinks].filter(Boolean);
            }
        } 
        else if (viewType === 'detail') {
            const detailInteractive = this._getFocusableDetailElements();
            focusableElements = [...detailInteractive, ...footerLinks].filter(Boolean);
        }

        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement);
        let nextIndex = 0;

        if (e.shiftKey) { // Shift + Tab (hacia atrás)
            if (currentIndex === 0 || currentIndex === -1) {
                nextIndex = focusableElements.length - 1;
            } else {
                nextIndex = currentIndex - 1;
            }
        } else { // Tab (hacia adelante)
            if (currentIndex === focusableElements.length - 1) {
                nextIndex = 0;
            } else {
                nextIndex = currentIndex + 1;
            }
        }
        
        // FIX CRÍTICO DOBLE HALO
        if (viewType === 'nav' && activeCard) {
            const activeCardIndexInFocusables = focusableElements.indexOf(activeCard);
            
            if (currentIndex === activeCardIndexInFocusables && nextIndex !== activeCardIndexInFocusables) {
                activeCard.classList.remove('focus-visible');
            }
        }

        focusableElements[nextIndex].focus();
    };


    // ⭐️ 5. NUEVA FUNCIÓN HELPER: Obtener elementos focuseables del detalle ⭐️
    App._getFocusableDetailElements = function() {
        const isMobile = window.innerWidth <= 768;
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('a.enlace-curso[tabindex="0"]'));
        let elements = [];

        // Añadir la tarjeta Volver o el botón Volver móvil, si están activos
        if (!isMobile && this.DOM.cardVolverFija.tabIndex === 0) {
            elements.push(this.DOM.cardVolverFija);
        } else if (isMobile && this.DOM.btnVolverNav.tabIndex === 0) {
            elements.push(this.DOM.btnVolverNav);
        }
        
        // Agregar enlaces del curso
        elements.push(...detailLinks);
        
        return elements;
    };


    // ⭐️ 6. NUEVA FUNCIÓN: Manejo de Navegación por Flechas en Detalles (VISTA DETALLE) ⭐️
    App._handleDetailNavigation = function(key) {
        const activeElement = document.activeElement;
        
        // Obtener todos los elementos navegables (Volver + Links)
        const focusableDetailElements = this._getFocusableDetailElements();
        
        let currentIndex = focusableDetailElements.indexOf(activeElement);
        if (currentIndex === -1) return; // Foco no está en un elemento navegable del detalle

        let newIndex = currentIndex;

        switch (key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                newIndex = (currentIndex > 0) ? currentIndex - 1 : currentIndex;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                newIndex = (currentIndex < focusableDetailElements.length - 1) ? currentIndex + 1 : currentIndex;
                break;
            case 'Enter':
            case ' ':
                // FIX ACTIVACIÓN: Simular click en el elemento activo (Volver o Enlace de Curso)
                activeElement.click(); 
                return;
        }

        if (newIndex !== currentIndex) {
            focusableDetailElements[newIndex].focus();
        }
    };


    // ⭐️ 7. FUNCIONES DE NAVEGACIÓN Y VISTA (UNIFICADAS) ⭐️

    /**
     * Handler unificado para CUALQUIER acción de "Volver"
     */
    App._handleVolverClick = function() {
        // Caso 1: Estamos en la vista de Detalle de un curso
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.vistaNav.classList.add('active');
            
            this.renderNavegacion(); 
            
            // Forzar el foco de vuelta al slider
            const activeCard = this.DOM.track.querySelector('[tabindex="0"]');
            if (activeCard) {
                activeCard.focus();
            }
        } 
        // Caso 2: Estamos en una sub-sección (en la vista de Navegación)
        else if (this.STATE.navStack.length > 0) {
            this.STATE.navStack.pop();
            this.renderNavegacion();
            
            // Forzar el foco de vuelta al slider
            const activeCard = this.DOM.track.querySelector('[tabindex="0"]');
            if (activeCard) {
                activeCard.focus();
            }
        }
    };

    /**
     * MODIFICADO: Ahora también controla la visibilidad de las columnas laterales.
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion);
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
          // Mostrar y activar la tarjeta "Volver"
          this.DOM.cardVolverFija.style.display = 'flex';
          this.DOM.cardVolverFija.tabIndex = 0;
          primerElementoFocuseable = this.DOM.cardVolverFija;
          
          this.DOM.infoAdicional.style.display = 'flex';
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

})();