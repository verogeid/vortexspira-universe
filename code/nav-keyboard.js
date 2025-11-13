// --- code/nav-keyboard.js ---
(function() {

    // ⭐️ 1. LISTENER CENTRAL DE TECLADO ⭐️
    document.addEventListener('keydown', (e) => {
        if (!App || !App.DOM || !App.DOM.vistaNav) return; 

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
                     return; 
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

    // ⭐️ 2. NAVEGACIÓN POR TECLADO (FLECHAS) - VISTA NAV (CORREGIDO) ⭐️
    App._handleKeyNavigation = function(key) {
        
        // Lee el número de filas/columnas (1, 2, o 3) desde el estado
        const { itemsPorColumna } = App.STATE; 
        let currentIndex = App.STATE.currentFocusIndex;
        let newIndex = currentIndex;

        const allCards = Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const totalCards = allCards.length;
        if (totalCards === 0) return;

        switch (key) {
            // ⭐️ Lógica Vertical: Lineal (+1 / -1)
            case 'ArrowUp':
                newIndex = currentIndex - 1;
                if (newIndex < 0) {
                    newIndex = totalCards - 1; // Loop al final
                }
                break;

            case 'ArrowDown':
                newIndex = currentIndex + 1;
                if (newIndex >= totalCards) {
                    newIndex = 0; // Loop al inicio
                }
                break;
            
            // ⭐️ Lógica Horizontal: Salto por Columna
            case 'ArrowLeft':
                newIndex = currentIndex - itemsPorColumna;
                if (newIndex < 0) {
                    // Da la vuelta (ej. índice 1 en col 0 -> va al final)
                    newIndex = totalCards - 1; 
                }
                break;

            case 'ArrowRight':
                newIndex = currentIndex + itemsPorColumna;
                if (newIndex >= totalCards) {
                     // Da la vuelta (ej. índice 8 en col 2 -> va al inicio)
                    newIndex = 0;
                }
                break;

            case 'Enter':
            case ' ':
                if (allCards[currentIndex]) {
                    allCards[currentIndex].click(); // Simular clic
                }
                return; // No necesita actualizar foco
        }

        if (newIndex !== currentIndex) {
            // ❗️ FIJAR LA BANDERA: Informar a nav-tactil que ignore este slide
            App.STATE.keyboardNavInProgress = true; 
            
            App.STATE.currentFocusIndex = newIndex;
            App._updateFocus(true); // Deslizar y enfocar
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
            if (isMobile || isTablet) {
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
        if (e.shiftKey) { 
            nextIndex = (currentIndex <= 0) ? focusableElements.length - 1 : currentIndex - 1;
        } else { 
            nextIndex = (currentIndex >= focusableElements.length - 1) ? 0 : currentIndex + 1;
        }
        if (activeCard && activeCard.classList.contains('focus-visible')) {
            if (focusableElements[currentIndex] === activeCard && focusableElements[nextIndex] !== activeCard) {
                activeCard.classList.remove('focus-visible');
            }
        }
        if (focusableElements[nextIndex] === activeCard) {
            activeCard.classList.add('focus-visible');
        }
        if (App.DOM.cardVolverFija && document.activeElement === App.DOM.cardVolverFija) {
             App.DOM.cardVolverFija.classList.remove('focus-visible');
        }
        if (focusableElements[nextIndex] === App.DOM.cardVolverFija) {
             focusableElements[nextIndex].classList.add('focus-visible');
        }
        focusableElements[nextIndex].focus();
    };

})();