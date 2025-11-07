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
      
      // 5.4. Listener central de teclado (MODIFICADO para Tab y Flechas)
      document.addEventListener('keydown', (e) => {
        const isNavActive = this.DOM.vistaNav.classList.contains('active');
        const isDetailActive = this.DOM.vistaDetalle.classList.contains('active');
            
        // El 'Escape' siempre debe funcionar
        if (e.key === 'Escape') {
            e.preventDefault();
            this._handleVolverClick(); 
            return;
        }

        // Caso 1: VISTA DE NAVEGACIÓN
        if (isNavActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault(); 
                // 🚨 Se llama al manejador que ahora verifica el foco actual
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
            // Interceptar Tab también aquí
            if (e.key === 'Tab') {
                e.preventDefault();
                this._handleFocusTrap(e, 'detail');
            }
        }
      });
    };

    // ⭐️ 2. MANEJADOR DE EVENTOS (Track) ⭐️
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('.swiper-slide');
      
      if (!tarjeta || tarjeta.classList.contains('disabled') || tarjeta.dataset.tipo === 'relleno') {
        // Si la tarjeta está deshabilitada o es relleno, no hacer nada
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
    
    // ⭐️ 3. NAVEGACIÓN POR TECLADO (FLECHAS) - CORREGIDA ⭐️
    App._handleKeyNavigation = function(key) {
      
      // 🚨 FIX CRÍTICO: Verificar si el foco está DENTRO del Swiper 
      const activeElement = document.activeElement;
      if (!activeElement || !activeElement.closest('#track-navegacion')) {
          // Si el elemento activo no está dentro del track (ej. es la tarjeta "Volver"), ignorar las flechas
          return; 
      }
      
      const { itemsPorColumna } = this.STATE;
      const allSlides = Array.from(this.DOM.track.children);
      const totalItems = allSlides.length;
      
      // Usar el elemento enfocado como punto de partida
      const currentFocusedSlide = activeElement.closest('.swiper-slide');
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
            // Saltar a la columna anterior (índice - 3)
            let prevColIndex = newIndex - itemsPorColumna;
            // Asegurarse de que no caiga en el relleno izquierdo
            if (prevColIndex < itemsPorColumna) {
                prevColIndex = newIndex; // No mover si ya está en la primera columna
            }
            newIndex = prevColIndex;
          break;
        case 'ArrowRight':
            // Saltar a la columna siguiente (índice + 3)
            let nextColIndex = newIndex + itemsPorColumna;
            // Asegurarse de que no caiga en el relleno derecho (o fuera de rango)
            if (nextColIndex >= totalItems || allSlides[nextColIndex].dataset.tipo === 'relleno') {
                nextColIndex = newIndex; // No mover si está en la última
            }
            newIndex = nextColIndex;
          break;
        case 'Enter':
        case ' ':
          // Activar el click sobre el elemento que tiene el foco
          currentFocusedSlide.click();
          return;
      }
      
      // Validar si el índice cambió y es válido
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
        // activeCard es la tarjeta del Swiper que actualmente tiene tabindex="0"
        const activeCard = this.DOM.track.querySelector('.swiper-slide[tabindex="0"]');

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
            const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('a.enlace-curso'));
            
            if (isMobile) {
                const btnVolver = this.DOM.btnVolverNav.style.display === 'none' ? null : this.DOM.btnVolverNav;
                focusableElements = [btnVolver, ...detailLinks, ...footerLinks].filter(Boolean);
            } else {
                const cardVolver = this.DOM.cardVolverFija.style.display === 'none' ? null : this.DOM.cardVolverFija;
                focusableElements = [cardVolver, ...detailLinks, ...footerLinks].filter(Boolean);
            }
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
        
        // ⭐️ FIX CRÍTICO DOBLE HALO: Limpiar el estado visual del slide activo al salir ⭐️
        if (viewType === 'nav' && activeCard) {
            const activeCardIndexInFocusables = focusableElements.indexOf(activeCard);
            
            // Si actualmente estamos en la tarjeta activa Y el foco se moverá a otro elemento:
            if (currentIndex === activeCardIndexInFocusables && nextIndex !== activeCardIndexInFocusables) {
                activeCard.classList.remove('focus-visible');
            }
        }

        focusableElements[nextIndex].focus();
    };


    // ⭐️ 5. FUNCIONES DE NAVEGACIÓN Y VISTA (UNIFICADAS) ⭐️

    App._handleVolverClick = function() {
        // Caso 1: Estamos en la vista de Detalle de un curso
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.vistaNav.classList.add('active');
            
            this.renderNavegacion(); 
            
            // Forzar el foco de vuelta al slider
            const activeCard = this.DOM.track.querySelector('.swiper-slide[tabindex="0"]');
            if (activeCard) {
                activeCard.focus();
            }
        } 
        // Caso 2: Estamos en una sub-sección (en la vista de Navegación)
        else if (this.STATE.navStack.length > 0) {
            this.STATE.navStack.pop();
            this.renderNavegacion();
            
            // Forzar el foco de vuelta al slider
            const activeCard = this.DOM.track.querySelector('.swiper-slide[tabindex="0"]');
            if (activeCard) {
                activeCard.focus();
            }
        }
    };

    App._mostrarDetalle = function(cursoId) {
      const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion);
      if (!curso) return;
      
      let enlacesHtml = (curso.enlaces || []).map(enlace => 
        // Asegurar que los enlaces tengan tabindex="0" para la trampa de foco
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