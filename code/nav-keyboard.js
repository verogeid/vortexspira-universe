// --- MODIFICADO: code/nav-keyboard.js ---
(function() {

    // ⭐️ 1. LISTENER CENTRAL DE TECLADO ⭐️
    document.addEventListener('keydown', (e) => {
        if (!App || !App.DOM || !App.DOM.vistaNav) return; 

        const isNavActive = App.DOM.vistaNav.classList.contains('active');
        const isDetailActive = App.DOM.vistaDetalle.classList.contains('active');

        // --- MANEJO DE TECLAS GLOBALES ---

        // 2. Tab (Focus Trap) siempre se maneja PRIMERO
        if (e.key === 'Tab') {
            e.preventDefault();
            
            if (isNavActive) {
                App._handleFocusTrap(e, 'nav');
            } else if (isDetailActive) {
                App._handleFocusTrap(e, 'detail');
            }
            return; 
        }
        
        // 3. Escape siempre vuelve
        if (e.key === 'Escape') {
            e.preventDefault();
            App._handleVolverClick(); 
            return;
        }

        // --- MANEJO DE TECLAS CONTEXTUALES ---

        // 4. Comprobar si el foco está en el footer
        const isFooterActive = document.activeElement.closest('footer');
        if (isFooterActive) {
            if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                App._handleFooterNavigation(e.key);
            }
            return; 
        }

        // 5. Comprobar si el foco está en la tarjeta "Volver" (Desktop)
        // ⭐️ CORRECCIÓN: Usar cardVolverFijaElemento (el botón), no el contenedor
        if (document.activeElement === App.DOM.cardVolverFijaElemento) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                App._handleVolverClick();
            }
            return; 
        }

        // 6. Comprobar Vistas
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

    // ⭐️ 3. NAVEGACIÓN EN DETALLES ⭐️
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

    // ⭐️ 4. MANEJO DE FOCO (TAB) ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;
        
        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        let groups = [];

        // --- 1. Definir los grupos de foco ---
        if (viewType === 'nav') {
            const allCards = App.DOM.track ? Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
            const activeCard = allCards[App.STATE.currentFocusIndex] || null;

            if (isMobile || isTablet) {
                groups = [
                    [activeCard].filter(Boolean), 
                    footerLinks                   
                ];
            } else { 
                // ⭐️ CORRECCIÓN CRÍTICA: Usar cardVolverFijaElemento
                const cardVolver = App.DOM.cardVolverFijaElemento.tabIndex === 0 ? App.DOM.cardVolverFijaElemento : null;
                
                groups = [
                    [cardVolver].filter(Boolean), // Grupo 1: Botón Volver (si está visible/activo)
                    [activeCard].filter(Boolean), // Grupo 2: Tarjeta activa
                    footerLinks                   // Grupo 3: Footer
                ];
            }
        } 
        else if (viewType === 'detail') {
            const detailLinks = Array.from(App.DOM.detalleContenido.querySelectorAll('a.enlace-curso[tabindex="0"]'));
            let volverElement = null;

            if ((isMobile || isTablet)) {
                volverElement = null; 
            } 
            // ⭐️ CORRECCIÓN CRÍTICA: Usar cardVolverFijaElemento
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

        // --- 2. Encontrar el grupo actual ---
        let currentGroupIndex = -1;
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].includes(document.activeElement)) {
                currentGroupIndex = i;
                break;
            }
        }
        if (currentGroupIndex === -1) currentGroupIndex = 0; 

        // --- 3. Calcular el siguiente grupo ---
        let nextGroupIndex;
        if (e.shiftKey) { 
            nextGroupIndex = (currentGroupIndex <= 0) ? groups.length - 1 : currentGroupIndex - 1;
        } else { 
            nextGroupIndex = (currentGroupIndex >= groups.length - 1) ? 0 : currentGroupIndex + 1;
        }

        // --- 4. Enfocar ---
        const nextGroup = groups[nextGroupIndex];
        let elementToFocus;

        if (e.shiftKey) {
            elementToFocus = nextGroup[nextGroup.length - 1];
        } else {
            elementToFocus = nextGroup[0];
        }

        // --- 5. Limpiar/Añadir clases de foco ---
        const activeCard = App.DOM.track ? App.DOM.track.querySelector('[data-id].focus-visible') : null;
        if (activeCard && activeCard !== elementToFocus) {
            activeCard.classList.remove('focus-visible');
        }

        // ⭐️ CORRECCIÓN: Usar cardVolverFijaElemento
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