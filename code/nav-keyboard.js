// --- code/nav-keyboard.js ---
(function() {

    // ⭐️ 1. LISTENER CENTRAL DE TECLADO ⭐️
    document.addEventListener('keydown', (e) => {
        if (!App || !App.DOM || !App.DOM.vistaNav) return; // App no está lista

        const isNavActive = App.DOM.vistaNav.classList.contains('active');
        const isDetailActive = App.DOM.vistaDetalle.classList.contains('active');

        if (e.key === 'Escape') {
            e.preventDefault();
            App._handleVolverClick(); 
            return;
        }

        if (isNavActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                if (document.activeElement === App.DOM.cardVolverFija) {
                     return; // Dejar que el handler de nav-base se ocupe
                }
                e.preventDefault(); 
                App._handleKeyNavigation(e.key);
            } 
            else if (e.key === 'Tab') {
                e.preventDefault();
                App._handleFocusTrap(e, 'nav');
            }
        } 
        else if (isDetailActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                App._handleDetailNavigation(e.key);
            }
            else if (e.key === 'Tab') {
                e.preventDefault();
                App._handleFocusTrap(e, 'detail');
            }
        }
    });

    // ⭐️ 2. NAVEGACIÓN POR TECLADO (FLECHAS) - VISTA NAV ⭐️
    App._handleKeyNavigation = function(key) {
        
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;
        const { carouselInstance } = App.STATE;
        let currentIndex = App.STATE.currentFocusIndex;
        let newIndex = currentIndex;
        let shouldSlide = true; 

        switch (key) {
            case 'ArrowUp':
                App._changeFocusVertical(-1); // Llama a helper en nav-base
                shouldSlide = false;
                break;

            case 'ArrowDown':
                App._changeFocusVertical(1); // Llama a helper en nav-base
                shouldSlide = false;
                break;

            case 'ArrowLeft':
                if (!isMobile && carouselInstance) {
                    carouselInstance.slidePrev();
                    shouldSlide = false; // El swipe (nav-tactil) se encargará del foco
                } else {
                    newIndex = (currentIndex > 0) ? currentIndex - 1 : currentIndex;
                }
                break;

            case 'ArrowRight':
                if (!isMobile && carouselInstance) {
                    carouselInstance.slideNext();
                    shouldSlide = false; // El swipe (nav-tactil) se encargará del foco
                } else {
                    const totalCards = App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])').length;
                    newIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : currentIndex;
                }
                break;

            case 'Enter':
            case ' ':
                const allCards = Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
                const activeCard = allCards[currentIndex];
                if (activeCard) {
                    activeCard.click(); // Simular clic
                }
                return;
        }

        if (shouldSlide && newIndex !== currentIndex) {
            App.STATE.currentFocusIndex = newIndex;
            App._updateFocus(true); 
        }
    };

    // ⭐️ 3. NAVEGACIÓN EN DETALLES (VISTA DETALLE) ⭐️
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

    // ⭐️ 4. MANEJO DE FOCO (TAB) ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;
        const isTablet = screenWidth > 600 && screenWidth <= 768;
        
        let focusableElements = [];
        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        const allCards = App.DOM.track ? Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
        const activeCard = allCards[App.STATE.currentFocusIndex] || null;

        if (viewType === 'nav') {
            if (isMobile || isTablet) { // Móvil y Tablet
                const btnVolver = App.DOM.btnVolverNav.style.display === 'block' ? App.DOM.btnVolverNav : null;
                focusableElements = [btnVolver, activeCard, ...footerLinks].filter(Boolean);
            } else { // Desktop
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

        if (e.shiftKey) { // Shift + Tab
            nextIndex = (currentIndex <= 0) ? focusableElements.length - 1 : currentIndex - 1;
        } else { // Tab
            nextIndex = (currentIndex >= focusableElements.length - 1) ? 0 : currentIndex + 1;
        }

        // Quitar foco visual de la tarjeta si salimos de ella
        if (activeCard && activeCard.classList.contains('focus-visible')) {
            if (focusableElements[currentIndex] === activeCard && focusableElements[nextIndex] !== activeCard) {
                activeCard.classList.remove('focus-visible');
            }
        }
        // Añadir foco visual si entramos
        if (focusableElements[nextIndex] === activeCard) {
            activeCard.classList.add('focus-visible');
        }
        // Quitar foco visual de Volver Fijo si salimos
        if (App.DOM.cardVolverFija && document.activeElement === App.DOM.cardVolverFija) {
            App.DOM.cardVolverFija.classList.remove('focus-visible');
        }
        // Añadir foco visual a Volver Fijo si entramos
        if (focusableElements[nextIndex] === App.DOM.cardVolverFija) {
            focusableElements[nextIndex].classList.add('focus-visible');
        }

        focusableElements[nextIndex].focus();
    };

})();