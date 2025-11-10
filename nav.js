// --- nav.js ---

(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (UNIFICADA) ⭐️
    App.setupListeners = function() {
      
      // 5.2. Listener para "Volver" (MÓVIL)
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
          // 🚨 FIX: Listener para Enter/Espacio en botón Volver móvil 🚨
          this.DOM.btnVolverNav.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this._handleVolverClick();
              }
          });
      }
      
      // 5.3. Listener para la Tarjeta Volver Fija (DESKTOP)
      if (this.DOM.cardVolverFija) {
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverClick.bind(this));
          // 🚨 FIX: Listener para Enter/Espacio en tarjeta Volver fija 🚨
          this.DOM.cardVolverFija.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  this._handleVolverClick();
              }
          });
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
                
                // Si el foco está en la tarjeta "Volver" fija, lo manejamos con el listener específico (ya corregido arriba).
                if (document.activeElement === this.DOM.cardVolverFija) {
                     return;
                }
                
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
      
      // Llamar a la función centralizada de manejo de clic/activación 
      this._handleCardClick(id, tipo);
    };

    /**
     * 🚨 NUEVA FUNCIÓN: Manejador centralizado para la activación (clic, Enter, Espacio) 🚨
     * @param {string} id - El ID del nodo a navegar.
     * @param {string} tipo - El tipo de nodo ('categoria' o 'curso').
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
    
    // ⭐️ 3. NAVEGACIÓN POR TECLADO (FLECHAS) - VISTA NAV ⭐️
    App._handleKeyNavigation = function(key) {
      
      // Verificar si el foco está DENTRO del Swiper 
      const activeElement = document.activeElement;
      if (!activeElement || !activeElement.closest('#track-desktop, #track-mobile')) {
          return; 
      }
      
      const isMobile = window.innerWidth <= 768;
      const { itemsPorColumna } = this.STATE;
      
      // Solo consideramos las tarjetas que tienen un data-id real (excluye relleno)
      const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const totalCards = allCards.length;
      
      // Buscar el índice de la tarjeta activa dentro de la lista filtrada (allCards)
      let currentIndex = allCards.findIndex(card => card.classList.contains('focus-visible'));
      
      if (currentIndex === -1 || totalCards === 0) {
          // Si el foco no está en una tarjeta o no hay tarjetas reales, no hacemos nada.
          return;
      }

      let newIndex = currentIndex;
      let nextElementToClick = allCards[currentIndex]; // Por defecto, es el elemento actual

      switch (key) {
        case 'ArrowUp':
            // Navegación secuencial vertical
            newIndex = (currentIndex > 0) ? currentIndex - 1 : (isMobile ? currentIndex : totalCards - 1);
            break;
        case 'ArrowDown':
            // Navegación secuencial vertical
            newIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : (isMobile ? currentIndex : 0);
            break;
        case 'ArrowLeft':
            // Navegación horizontal: saltar una columna (3 tarjetas) hacia la izquierda
            if (!isMobile) {
                newIndex = currentIndex - itemsPorColumna;
                // Si salta más allá del inicio, loop al final
                newIndex = (newIndex < 0) ? totalCards - 1 : newIndex;
            } else {
                // En móvil, izquierda/derecha actúa como arriba/abajo
                newIndex = (currentIndex > 0) ? currentIndex - 1 : currentIndex;
            }
            break;
        case 'ArrowRight':
            // Navegación horizontal: saltar una columna (3 tarjetas) hacia la derecha
            if (!isMobile) {
                newIndex = currentIndex + itemsPorColumna;
                // Si salta más allá del final, loop al inicio
                newIndex = (newIndex >= totalCards) ? 0 : newIndex;
            } else {
                // En móvil, izquierda/derecha actúa como arriba/abajo
                newIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : currentIndex;
            }
            break;
        case 'Enter':
        case ' ':
          // ACTIVACIÓN: Activar click sobre el elemento enfocado
          nextElementToClick.click();
          return;
      }
      
      // Si el índice cambia, actualizamos el foco
      if (newIndex !== currentIndex) {
          this.STATE.currentFocusIndex = newIndex;
          this._updateFocus(true);
      }
    };

    // ⭐️ 4. FUNCIÓN HELPER: _handleFocusTrap (TAB) - DOBLE HALO FIX ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const isMobile = window.innerWidth <= 768;
        let focusableElements = [];
        
        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        // Buscar la tarjeta activa por el tabindex="0" en el track correcto
        const activeCard = this.DOM.track ? this.DOM.track.querySelector('[tabindex="0"]') : null;

        if (viewType === 'nav') {
            if (isMobile) {
                const btnVolver = this.DOM.btnVolverNav.style.display === 'none' ? null : this.DOM.btnVolverNav;
                // En móvil, la tarjeta "Volver" vertical está dentro del track
                focusableElements = [btnVolver, activeCard, ...footerLinks].filter(Boolean);
            } else {
                const cardVolver = this.DOM.cardVolverFija.tabIndex === 0 ? this.DOM.cardVolverFija : null;
                // 🚨 FIX: Incluir la tarjeta activa del track en el focus trap para desktop, si existe. 🚨
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
        
        // FIX CRÍTICO DOBLE HALO: Quitar la clase de foco visual del elemento anterior
        if (activeCard && activeCard.classList.contains('focus-visible')) {
            // Solo quitar el foco visual si estamos saliendo de la tarjeta navegable
            if (focusableElements[currentIndex] === activeCard && focusableElements[nextIndex] !== activeCard) {
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
        } else if (isMobile && this.DOM.btnVolverNav.style.display === 'block') {
            // Solo considerar el botón móvil si está visible
            elements.push(this.DOM.btnVolverNav);
        }
        
        // Agregar enlaces del curso
        elements.push(...detailLinks);
        
        return elements.filter(el => el && el.tabIndex !== -1);
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
        // 1. Caso Detalle -> Navegación
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            
            // Reestablecer tabIndex de elementos de detalle
            this.DOM.cardVolverFija.tabIndex = -1;
            this.DOM.btnVolverNav.tabIndex = -1;
            
            this.DOM.vistaNav.classList.add('active');
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
          // Mostrar y activar la tarjeta "Volver" (Desktop)
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