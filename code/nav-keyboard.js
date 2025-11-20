// --- code/nav-keyboard.js ---
(function() {

    // ⭐️ 1. LISTENER CENTRAL ⭐️
    document.addEventListener('keydown', (e) => {
        if (!App || !App.DOM || !App.DOM.vistaNav) return; 

        const isNavActive = App.DOM.vistaNav.classList.contains('active');
        const isDetailActive = App.DOM.vistaDetalle.classList.contains('active');

        if (e.key === 'Tab') {
            e.preventDefault();
            if (isNavActive) {
                App._handleFocusTrap(e, 'nav');
            } else if (isDetailActive) {
                App._handleFocusTrap(e, 'detail');
            }
            return; 
        }
        
        if (e.key === 'Escape') {
            e.preventDefault();
            App._handleVolverClick(); 
            return;
        }

        const isFooterActive = document.activeElement.closest('footer');
        if (isFooterActive) {
            if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                App._handleFooterNavigation(e.key);
            }
            return; 
        }

        if (document.activeElement === App.DOM.cardVolverFijaElemento) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                App._handleVolverClick();
            }
            return; 
        }

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

    // ⭐️ 2. NAVEGACIÓN EN VISTA NAV ⭐️
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
                if (allCards[currentIndex]) {
                    const tarjeta = allCards[currentIndex];
                    if (tarjeta.dataset.tipo === 'volver-vertical') {
                        App._handleVolverClick();
                        return;
                    }
                    if (tarjeta.classList.contains('disabled')) return;

                    const id = tarjeta.dataset.id;
                    const tipo = tarjeta.dataset.tipo;
                    
                    App._handleCardClick(id, tipo); 
                }
                return; 
        }

        if (newIndex !== currentIndex) {
            App.STATE.keyboardNavInProgress = true; 
            App.STATE.currentFocusIndex = newIndex;
            App._updateFocus(true);
        }
    };

    // ⭐️ 3. NAVEGACIÓN EN DETALLES (CORREGIDA) ⭐️
    App._handleDetailNavigation = function(key) {
        const activeElement = document.activeElement;
        // Usamos el helper que ya incluye todos los botones (enabled y disabled)
        // PERO filtramos para quedarnos solo con los de la lista principal (excluyendo sidebar desktop)
        const allFocusables = App._getFocusableDetailElements();
        
        // Filtramos para movernos solo dentro del contenido principal (botones de acción + card volver movil)
        const mainContentElements = allFocusables.filter(el => 
            el.classList.contains('detail-action-btn') || el.classList.contains('card')
        );

        let currentIndex = mainContentElements.indexOf(activeElement);
        
        if (currentIndex === -1) {
            // Si el foco está fuera (ej. Sidebar), entrar al primero
            if (mainContentElements.length > 0) mainContentElements[0].focus();
            return;
        }
        
        let newIndex = currentIndex;
        switch (key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                // ⭐️ TOPE SUPERIOR: No salir si es el primero
                newIndex = (currentIndex > 0) ? currentIndex - 1 : currentIndex;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                // Tope inferior
                newIndex = (currentIndex < mainContentElements.length - 1) ? currentIndex + 1 : currentIndex;
                break;
            case 'Enter':
            case ' ':
                // ⭐️ CLICK SEGURO: Solo si no es disabled
                if (!activeElement.classList.contains('disabled')) {
                    activeElement.click(); 
                }
                return;
        }
        if (newIndex !== currentIndex) {
            mainContentElements[newIndex].focus();
        }
    };

    // ⭐️ 4. MANEJO DE FOCO (TAB) ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;
        
        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        let groups = [];

        if (viewType === 'nav') {
            const allCards = App.DOM.track ? Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
            const activeCard = allCards[App.STATE.currentFocusIndex] || null;

            if (isMobile || isTablet) {
                groups = [ [activeCard].filter(Boolean), footerLinks ];
            } else { 
                const cardVolver = App.DOM.cardVolverFijaElemento.tabIndex === 0 ? App.DOM.cardVolverFijaElemento : null;
                groups = [ [cardVolver].filter(Boolean), [activeCard].filter(Boolean), footerLinks ];
            }
        } 
        else if (viewType === 'detail') {
            // Obtenemos todos los botones del contenido
            const detailLinks = Array.from(App.DOM.detalleContenido.querySelectorAll('.card, .detail-action-btn'));
            
            let volverElement = null;
            if ((isMobile || isTablet)) {
                volverElement = null; // En móvil ya está dentro de detailLinks
            } 
            else if (!isMobile && !isTablet && App.DOM.cardVolverFijaElemento.tabIndex === 0) {
                volverElement = App.DOM.cardVolverFijaElemento;
            }

            groups = [
                [volverElement].filter(Boolean), 
                detailLinks,                     
                footerLinks                      
            ];
        }

        groups = groups.filter(g => g.length > 0);
        if (groups.length === 0) return;

        let currentGroupIndex = -1;
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].includes(document.activeElement)) {
                currentGroupIndex = i;
                break;
            }
        }
        if (currentGroupIndex === -1) currentGroupIndex = 0; 

        let nextGroupIndex;
        if (e.shiftKey) { 
            nextGroupIndex = (currentGroupIndex <= 0) ? groups.length - 1 : currentGroupIndex - 1;
        } else { 
            nextGroupIndex = (currentGroupIndex >= groups.length - 1) ? 0 : currentGroupIndex + 1;
        }

        const nextGroup = groups[nextGroupIndex];
        let elementToFocus;

        if (e.shiftKey) {
            elementToFocus = nextGroup[nextGroup.length - 1];
        } else {
            elementToFocus = nextGroup[0];
        }

        const activeCard = App.DOM.track ? App.DOM.track.querySelector('[data-id].focus-visible') : null;
        if (activeCard && activeCard !== elementToFocus) {
            activeCard.classList.remove('focus-visible');
        }

        if (document.activeElement === App.DOM.cardVolverFijaElemento && elementToFocus !== App.DOM.cardVolverFijaElemento) {
            App.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
        }

        if (elementToFocus === App.DOM.cardVolverFijaElemento) {
             elementToFocus.classList.add('focus-visible');
        }
        
        const allCards = App.DOM.track ? Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
        if (allCards.length > 0 && allCards.includes(elementToFocus)) {
            elementToFocus.classList.add('focus-visible');
        }

        if (elementToFocus) {
            elementToFocus.focus();
        }
    };

    // ⭐️ 5. NAVEGACIÓN EN FOOTER ⭐️
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