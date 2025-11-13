// --- code/nav-keyboard.js ---
(function() {

    // ⭐️ 1. LISTENER CENTRAL DE TECLADO (CORREGIDO) ⭐️
    document.addEventListener('keydown', (e) => {
        if (!App || !App.DOM || !App.DOM.vistaNav) return; // App no está lista

        // --- MANEJO DE TECLAS GLOBALES ---

        // 1. Escape siempre vuelve
        if (e.key === 'Escape') {
            e.preventDefault();
            App._handleVolverClick(); 
            return;
        }

        // 2. ⭐️ Tab (Focus Trap) siempre se maneja ⭐️
        if (e.key === 'Tab') {
            e.preventDefault();
            // Determinar en qué vista estamos para pasarla a la trampa
            const isNavActive = App.DOM.vistaNav.classList.contains('active');
            const isDetailActive = App.DOM.vistaDetalle.classList.contains('active');
            
            if (isNavActive) {
                App._handleFocusTrap(e, 'nav');
            } else if (isDetailActive) {
                App._handleFocusTrap(e, 'detail');
            }
            return; // No hacer nada más
        }
        
        // --- MANEJO DE TECLAS CONTEXTUALES (FLECHAS, ENTER, ESPACIO) ---

        // 3. Comprobar si el foco está en la tarjeta "Volver" (Desktop)
        if (document.activeElement === App.DOM.cardVolverFija) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                App._handleVolverClick();
            }
            return; 
        }

        // 4. Comprobar si el foco está en el footer
        const isFooterActive = document.activeElement.closest('footer');
        if (isFooterActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                App._handleFooterNavigation(e.key);
            }
            return; 
        }

        // 5. Comprobar Vistas (para flechas/enter/espacio)
        const isNavActive = App.DOM.vistaNav.classList.contains('active');
        const isDetailActive = App.DOM.vistaDetalle.classList.contains('active');

        if (isNavActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault(); 
                App._handleKeyNavigation(e.key);
            }
        } 
        else if (isDetailActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                App._handleDetailNavigation(e.key);
            }
        }
    });

    // ⭐️ 2. NAVEGACIÓN EN VISTA NAV (Sin cambios) ⭐️
    App._handleKeyNavigation = function(key) {
        
        const { itemsPorColumna } = App.STATE; 
        let currentIndex = App.STATE.currentFocusIndex;
        let newIndex = currentIndex;

        const allCards = Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const totalCards = allCards.length;
        if (totalCards === 0) return;

        switch (key) {
            case 'ArrowUp':
                newIndex = currentIndex - 1;
                if (newIndex < 0) newIndex = totalCards - 1;
                break;
            case 'ArrowDown':
                newIndex = currentIndex + 1;
                if (newIndex >= totalCards) newIndex = 0;
                break;
            case 'ArrowLeft':
                newIndex = currentIndex - itemsPorColumna;
                if (newIndex < 0) newIndex = totalCards - 1; 
                break;
            case 'ArrowRight':
                newIndex = currentIndex + itemsPorColumna;
                if (newIndex >= totalCards) newIndex = 0;
                break;
            case 'Enter':
            case ' ':
                if (allCards[currentIndex]) allCards[currentIndex].click();
                return; 
        }

        if (newIndex !== currentIndex) {
            App.STATE.keyboardNavInProgress = true; 
            App.STATE.currentFocusIndex = newIndex;
            App._updateFocus(true);
        }
    };

    // ⭐️ 3. NAVEGACIÓN EN DETALLES (Sin cambios) ⭐️
    App._handleDetailNavigation = function(key) {
         const activeElement = document.activeElement;
        const focusableDetailElements = App._getFocusableDetailElements();
        let currentIndex = focusableDetailElements.indexOf(activeElement);
        if (currentIndex === -1) {
            if (focusableDetailElements.length > 0) focusableDetailElements[0].focus();
            return;
        }
        
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

    // ⭐️ 4. MANEJO DE FOCO (TAB) (Sin cambios en su lógica interna) ⭐️
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

    // ⭐️ 5. NAVEGACIÓN EN FOOTER (Sin cambios) ⭐️
    App._handleFooterNavigation = function(key) {
        const focusableElements = Array.from(document.querySelectorAll('footer a'));
        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement);
        if (currentIndex === -1) {
            focusableElements[0].focus();
            return;
        }

        let newIndex = currentIndex;
        
        switch (key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                newIndex = currentIndex - 1;
                if (newIndex < 0) newIndex = focusableElements.length - 1;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                newIndex = currentIndex + 1;
                if (newIndex >= focusableElements.length) newIndex = 0;
                break;
        }

        if (newIndex !== currentIndex) {
            focusableElements[newIndex].focus();
        }
    };

})();