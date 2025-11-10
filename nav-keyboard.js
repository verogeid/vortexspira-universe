// --- nav-keyboard.js ---

(function() {
    
    // ⭐️ 1. LISTENER CENTRAL DE TECLADO ⭐️
    document.addEventListener('keydown', (e) => {
        
        // Asume que App y App.DOM están definidos en render-base/nav-base
        const isNavActive = App.DOM.vistaNav ? App.DOM.vistaNav.classList.contains('active') : false;
        const isDetailActive = App.DOM.vistaDetalle ? App.DOM.vistaDetalle.classList.contains('active') : false;

        // El 'Escape' siempre debe funcionar como "Volver"
        if (e.key === 'Escape') {
            e.preventDefault();
            App._handleVolverClick(); 
            return;
        }

        // Caso 1: VISTA DE NAVEGACIÓN
        if (isNavActive) {
            // Flechas, Enter y Space para el carrusel (requiere preventDefault)
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {

                // Si el foco está en la tarjeta "Volver" fija (ya manejado en nav-base), ignoramos aquí.
                if (document.activeElement === App.DOM.cardVolverFija) {
                     return;
                }

                e.preventDefault(); 
                App._handleKeyNavigation(e.key);
            } 
            // Interceptar Tab
            else if (e.key === 'Tab') {
                e.preventDefault();
                App._handleFocusTrap(e, 'nav');
            }
        } 
        // Caso 2: VISTA DE DETALLE
        else if (isDetailActive) {
            // Flechas, Enter y Space para la navegación de Detalle
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                App._handleDetailNavigation(e.key);
            }
            // Interceptar Tab
            else if (e.key === 'Tab') {
                e.preventDefault();
                App._handleFocusTrap(e, 'detail');
            }
        }
    });

    // ⭐️ 2. NAVEGACIÓN POR TECLADO (FLECHAS) - VISTA NAV ⭐️
    App._handleKeyNavigation = function(key) {
      
      const activeElement = document.activeElement;
      // Verificar si el foco está DENTRO del track correcto
      if (!activeElement || !activeElement.closest('#track-desktop, #track-mobile')) {
          return; 
      }

      const isMobile = window.innerWidth <= 768;
      const { itemsPorColumna } = App.STATE;

      // Solo consideramos las tarjetas que tienen un data-id real (excluye relleno)
      const allCards = Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const totalCards = allCards.length;

      // Buscar el índice de la tarjeta activa dentro de la lista filtrada (allCards)
      let currentIndex = allCards.findIndex(card => card.classList.contains('focus-visible'));

      if (currentIndex === -1 || totalCards === 0) return;

      let newIndex = currentIndex;
      let nextElementToClick = allCards[currentIndex]; 

      switch (key) {
        case 'ArrowUp':
            // Navegación secuencial vertical: sube 1 (Móvil) o salta a la tarjeta anterior de la columna (Desktop)
            newIndex = (currentIndex > 0) ? currentIndex - 1 : (isMobile ? currentIndex : totalCards - 1);
            break;
        case 'ArrowDown':
            // Navegación secuencial vertical: baja 1 (Móvil) o salta a la tarjeta siguiente de la columna (Desktop)
            newIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : (isMobile ? currentIndex : 0);
            break;
        case 'ArrowLeft':
            // Navegación horizontal: salta una columna (3 tarjetas) hacia la izquierda
            if (!isMobile) {
                newIndex = currentIndex - itemsPorColumna;
                // Si salta más allá del inicio, loop al final
                newIndex = (newIndex < 0) ? totalCards + newIndex : newIndex; // Ajuste de loop 
                if (newIndex >= totalCards) newIndex = totalCards - 1; // Si el final no es un múltiplo
            } else {
                // En móvil, izquierda actúa como arriba
                newIndex = (currentIndex > 0) ? currentIndex - 1 : currentIndex;
            }
            break;
        case 'ArrowRight':
            // Navegación horizontal: salta una columna (3 tarjetas) hacia la derecha
            if (!isMobile) {
                newIndex = currentIndex + itemsPorColumna;
                // Si salta más allá del final, loop al inicio
                newIndex = (newIndex >= totalCards) ? newIndex % totalCards : newIndex;
            } else {
                // En móvil, derecha actúa como abajo
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
          App.STATE.currentFocusIndex = newIndex;
          // true indica que debe deslizar/scroll (Swiper/ScrollIntoView)
          App._updateFocus(true); 
      }
    };

    // ⭐️ 3. FUNCIÓN HELPER: _handleFocusTrap (TAB) - DOBLE HALO FIX ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const isMobile = window.innerWidth <= 768;
        let focusableElements = [];

        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        // Buscar la tarjeta activa por el tabindex="0" en el track correcto
        const activeCard = App.DOM.track ? App.DOM.track.querySelector('[tabindex="0"]') : null;

        if (viewType === 'nav') {
            if (isMobile) {
                const btnVolver = App.DOM.btnVolverNav.style.display === 'block' ? App.DOM.btnVolverNav : null;
                // En móvil, la tarjeta "Volver" vertical está dentro del track
                // En móvil, la trampa debe incluir el botón de volver fijo (si está) + tarjetas del track + footer
                focusableElements = [btnVolver, activeCard, ...footerLinks].filter(Boolean);
            } else {
                const cardVolver = App.DOM.cardVolverFija.tabIndex === 0 ? App.DOM.cardVolverFija : null;
                // Desktop: Volver Fijo (si activo) -> Tarjeta Activa -> Footer Links
                focusableElements = [cardVolver, activeCard, ...footerLinks].filter(Boolean);
            }
        } 
        else if (viewType === 'detail') {
            // Usa la función helper de nav-base.js
            const detailInteractive = App._getFocusableDetailElements();
            // Detalle: Volver (tarjeta/botón) -> Links de Curso -> Footer Links
            focusableElements = [...detailInteractive, ...footerLinks].filter(Boolean);
        }

        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement);
        let nextIndex = 0;

        if (e.shiftKey) { // Shift + Tab (hacia atrás)
            if (currentIndex <= 0) {
                nextIndex = focusableElements.length - 1;
            } else {
                nextIndex = currentIndex - 1;
            }
        } else { // Tab (hacia adelante)
            if (currentIndex >= focusableElements.length - 1) {
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

    // ⭐️ 4. NAVEGACIÓN POR FLECHAS EN DETALLES (VISTA DETALLE) ⭐️
    App._handleDetailNavigation = function(key) {
        const activeElement = document.activeElement;

        // Obtener todos los elementos navegables (Volver + Links)
        const focusableDetailElements = App._getFocusableDetailElements();

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
                activeElement.click(); 
                return;
        }

        if (newIndex !== currentIndex) {
            focusableDetailElements[newIndex].focus();
        }
    };

})();
