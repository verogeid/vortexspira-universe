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
      
      // 5.4. Listener central de teclado (MODIFICADO)
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
        // (Aunque sea focuseable, no es clicable)
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
    
    // ⭐️ 3. NAVEGACIÓN POR TECLADO (FLECHAS) ⭐️
    App._handleKeyNavigation = function(key) {
      const { itemsPorColumna } = this.STATE;
      const allSlides = Array.from(this.DOM.track.children);
      const totalItems = allSlides.length;
      let newIndex = this.STATE.currentFocusIndex;

      if (totalItems === 0) return;
      
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
          const focusedCard = allSlides[newIndex];
          if (focusedCard) focusedCard.click();
          return;
      }
      
      // Validar si el índice cambió y es válido
      if (newIndex !== oldIndex && allSlides[newIndex]) {
          this.STATE.currentFocusIndex = newIndex;
          this._updateFocus(true);
      }
    };

    // ⭐️ 4. NUEVA FUNCIÓN HELPER: _handleFocusTrap (TAB) ⭐️
    /**
     * Gestiona el bucle de foco (Tab y Shift+Tab) dentro de la aplicación.
     * @param {KeyboardEvent} e El evento de teclado.
     * @param {'nav' | 'detail'} viewType El tipo de vista activa.
     */
    App._handleFocusTrap = function(e, viewType) {
        const isMobile = window.innerWidth <= 768;
        let focusableElements = [];
        
        // Elementos comunes (siempre están)
        const footerLinks = Array.from(document.querySelectorAll('footer a'));

        if (viewType === 'nav') {
            // En la vista NAV, los focuseables son:
            // 1. Tarjeta "Volver" (si es desktop y visible)
            // 2. La tarjeta activa del slider (la que tiene tabindex="0")
            // 3. Los enlaces del footer
            const activeCard = this.DOM.track.querySelector('.swiper-slide[tabindex="0"]');
            
            if (isMobile) {
                // En móvil: Botón Volver (si existe) -> Slider -> Footer
                const btnVolver = this.DOM.btnVolverNav.style.display === 'none' ? null : this.DOM.btnVolverNav;
                focusableElements = [btnVolver, activeCard, ...footerLinks].filter(Boolean);
            } else {
                // En desktop: Volver Fijo -> Slider -> Footer
                const cardVolver = this.DOM.cardVolverFija.style.display === 'none' ? null : this.DOM.cardVolverFija;
                focusableElements = [cardVolver, activeCard, ...footerLinks].filter(Boolean);
            }
        } 
        else if (viewType === 'detail') {
            // En la vista DETALLE, los focuseables son:
            // 1. Tarjeta/Botón "Volver"
            // 2. Los enlaces del curso
            // 3. Los enlaces del footer
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
        
        focusableElements[nextIndex].focus();
    };


    // ⭐️ 5. FUNCIONES DE NAVEGACIÓN Y VISTA (UNIFICADAS) ⭐️

    /**
     * Handler unificado para CUALQUIER acción de "Volver"
     */
    App._handleVolverClick = function() {
        // Caso 1: Estamos en la vista de Detalle de un curso
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.vistaNav.classList.add('active');
            
            // Re-renderizar la navegación para actualizar el estado visual
            // y restaurar el foco al slider
            this.renderNavegacion(); 
            
            // Forzar el foco de vuelta al slider (específicamente a la tarjeta activa)
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

    /**
     * MODIFICADO: Ahora también controla la visibilidad de las columnas laterales.
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion);
      if (!curso) return;
      
      let enlacesHtml = (curso.enlaces || []).map(enlace => 
        // ⭐️ CAMBIO: Asegurar que los enlaces tengan tabindex="0" para la trampa de foco
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
      
      // ⭐️ CRÍTICO: Gestionar la visibilidad y foco de "Volver" ⭐️
      const isMobile = window.innerWidth <= 768; 
      let primerElementoFocuseable = null;

      if (!isMobile) {
          // Mostrar y activar la tarjeta "Volver"
          this.DOM.cardVolverFija.style.display = 'flex';
          // this.DOM.cardVolverFija.classList.add('active-volver'); // (Clase ya no usada para estilos)
          this.DOM.cardVolverFija.tabIndex = 0;
          primerElementoFocuseable = this.DOM.cardVolverFija;
          
          // Asegurar que la info adicional esté visible también
          this.DOM.infoAdicional.style.display = 'flex';
      } else {
          // En móvil, mostrar el botón de volver simple
          this.DOM.btnVolverNav.style.display = 'block';
          this.DOM.btnVolverNav.tabIndex = 0; // Asegurar que sea focuseable
          primerElementoFocuseable = this.DOM.btnVolverNav;
      }

      // Mover el foco al primer elemento de la nueva vista (el botón/tarjeta de volver)
      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };

})();