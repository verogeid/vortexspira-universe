// --- code/nav-keyboard.js ---

(function() {

    // ⭐️ 1. LISTENER CENTRAL DE TECLADO ⭐️
    document.addEventListener('keydown', (e) => {

        // Asume que App y App.DOM están definidos
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
            // Flechas, Enter y Space para el carrusel
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {

                // Si el foco está en la tarjeta "Volver" fija, no hacer nada aquí
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

    // ⭐️ 2. NAVEGACIÓN POR TECLADO (FLECHAS) - VISTA NAV (CORREGIDO) ⭐️
    App._handleKeyNavigation = function(key) {
        
        const isMobile = window.innerWidth <= 768;
        const { carouselInstance } = App.STATE;

        // ❗️ FIX: LEER DESDE EL ESTADO, NO DESDE EL DOM
        let currentIndex = App.STATE.currentFocusIndex;
        let newIndex = currentIndex;
        let shouldSlide = true; // Controla si llamamos a _updateFocus

        switch (key) {
            case 'ArrowUp':
                // ❗️ FIX: Lógica vertical correcta
                App._changeFocusVertical(-1); // Usar el helper dedicado
                shouldSlide = false; // El helper ya llama a _updateFocus
                break;

            case 'ArrowDown':
                // ❗️ FIX: Lógica vertical correcta
                App._changeFocusVertical(1); // Usar el helper dedicado
                shouldSlide = false; // El helper ya llama a _updateFocus
                break;

            case 'ArrowLeft':
                // ❗️ FIX: Delegar a Swiper (para que nav-tactil.js funcione)
                if (!isMobile && carouselInstance) {
                    carouselInstance.slidePrev();
                    shouldSlide = false; // El swipe se encargará del foco
                } else {
                    // Lógica móvil (lineal)
                    newIndex = (currentIndex > 0) ? currentIndex - 1 : currentIndex;
                }
                break;

            case 'ArrowRight':
                // ❗️ FIX: Delegar a Swiper (para que nav-tactil.js funcione)
                if (!isMobile && carouselInstance) {
                    carouselInstance.slideNext();
                    shouldSlide = false; // El swipe se encargará del foco
                } else {
                    // Lógica móvil (lineal)
                    const totalCards = App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])').length;
                    newIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : currentIndex;
                }
                break;

            case 'Enter':
            case ' ':
                const allCards = Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
                const activeCard = allCards[currentIndex];
                if (activeCard) {
                    activeCard.click(); // Simular clic en la tarjeta activa
                }
                return; // No necesita _updateFocus
        }

        // Si el índice cambia (y no es un helper), actualizamos el foco
        if (shouldSlide && newIndex !== currentIndex) {
            App.STATE.currentFocusIndex = newIndex;
            App._updateFocus(true); 
        }
    };

    // ⭐️ 3. HELPER DE FOCO VERTICAL (NUEVO) ⭐️
    // Esta lógica asegura que Arriba/Abajo no cambien de columna en Desktop
    App._changeFocusVertical = function(direction) { // -1 Arriba, 1 Abajo
        const { currentFocusIndex, itemsPorColumna } = App.STATE;
        const allCards = Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        let newIndex = currentFocusIndex + direction;

        // Lógica de Límite de Columna (Desktop)
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) {
            const currentCol = Math.floor(currentFocusIndex / itemsPorColumna);
            const newCol = Math.floor(newIndex / itemsPorColumna);

            // Si se sale de la columna (y no es un loop), no hacer nada
            if (newCol !== currentCol && (newIndex >= 0 && newIndex < allCards.length)) {
                return; 
            }
        }

        // Permitir loop (si -1 -> se va a (total-1), si (total) -> se va a 0)
        if (newIndex < 0) newIndex = allCards.length - 1;
        if (newIndex >= allCards.length) newIndex = 0;

        App.STATE.currentFocusIndex = newIndex;
        App._updateFocus(true); // true = deslizar/scroll
    };


    // ⭐️ 4. _handleFocusTrap (CORREGIDO) ⭐️
    // Corregido para que también lea el estado, no el DOM.
    App._handleFocusTrap = function(e, viewType) {
        const isMobile = window.innerWidth <= 768;
        let focusableElements = [];

        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        
        // ❗️ FIX: Leer la tarjeta activa desde el ESTADO
        const allCards = App.DOM.track ? Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
        const activeCard = allCards[App.STATE.currentFocusIndex] || null;

        if (viewType === 'nav') {
            if (isMobile) {
                const btnVolver = App.DOM.btnVolverNav.style.display === 'block' ? App.DOM.btnVolverNav : null;
                focusableElements = [btnVolver, activeCard, ...footerLinks].filter(Boolean);
            } else {
                const cardVolver = App.DOM.cardVolverFija.tabIndex === 0 ? App.DOM.cardVolverFija : null;
                focusableElements = [cardVolver, activeCard, ...footerLinks].filter(Boolean);
            }
        } 
        else if (viewType === 'detail') {
            const detailInteractive = App._getFocusableDetailElements();
            focusableElements = [...detailInteractive, ...footerLinks].filter(Boolean);
        }

        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement);
        let nextIndex = 0;

        if (e.shiftKey) { // Shift + Tab (hacia atrás)
            nextIndex = (currentIndex <= 0) ? focusableElements.length - 1 : currentIndex - 1;
        } else { // Tab (hacia adelante)
            nextIndex = (currentIndex >= focusableElements.length - 1) ? 0 : currentIndex + 1;
        }

        // --- FIX DOBLE HALO ---
        if (activeCard && activeCard.classList.contains('focus-visible')) {
            if (focusableElements[currentIndex] === activeCard && focusableElements[nextIndex] !== activeCard) {
                activeCard.classList.remove('focus-visible');
            }
        }
        if (focusableElements[nextIndex] === activeCard) {
            activeCard.classList.add('focus-visible');
        }
        // --- Fin FIX ---

        focusableElements[nextIndex].focus();
    };


    // ⭐️ 5. NAVEGACIÓN POR FLECHAS EN DETALLES (Tu código original) ⭐️
    App._handleDetailNavigation = function(key) {
         const activeElement = document.activeElement;
        const focusableDetailElements = App._getFocusableDetailElements();
        let currentIndex = focusableDetailElements.indexOf(activeElement);
        if (currentIndex === -1) return;
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
