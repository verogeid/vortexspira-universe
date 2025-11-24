// --- code/nav-keyboard.js ---
(function() {

    // ⭐️ 1. LISTENER CENTRAL DE TECLADO ⭐️
    document.addEventListener('keydown', (e) => {
        if (!App || !App.DOM || !App.DOM.vistaNav) return; 

        const isNavActive = App.DOM.vistaNav.classList.contains('active');
        const isDetailActive = App.DOM.vistaDetalle.classList.contains('active');

        // --- TECLAS GLOBALES ---
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

        // --- NAVEGACIÓN CONTEXTUAL (FLECHAS) ---

        // 1. Footer
        const isFooterActive = document.activeElement.closest('footer');
        if (isFooterActive) {
            if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                App._handleFooterNavigation(e.key);
            }
            return; 
        }

        // 2. Panel Info Adicional (Desktop)
        const isInfoPanel = document.activeElement.closest('#info-adicional');
        if (isInfoPanel) {
             if (['ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                App._handleInfoNavigation(e.key);
            }
            return;
        }

        // 3. Tarjeta Volver (Desktop/Tablet Lateral)
        if (document.activeElement === App.DOM.cardVolverFijaElemento) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                App._handleVolverClick();
            }
            return; 
        }

        // 4. Vistas Principales
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

    // ⭐️ HELPER: Navegación Panel Derecho (Info) ⭐️
    App._handleInfoNavigation = function(key) {
        const panel = App.DOM.infoAdicional;
        // Buscar summaries (títulos desplegables) y enlaces
        const elements = Array.from(panel.querySelectorAll('summary, a'));
        const currentIndex = elements.indexOf(document.activeElement);
        
        if (currentIndex === -1) return;

        let newIndex = currentIndex;
        if (key === 'ArrowUp') newIndex = Math.max(0, currentIndex - 1);
        if (key === 'ArrowDown') newIndex = Math.min(elements.length - 1, currentIndex + 1);
        
        if (key === 'Enter' || key === ' ') {
            document.activeElement.click(); // Abrir/Cerrar details o seguir enlace
        }

        if (newIndex !== currentIndex) elements[newIndex].focus();
    };

    // ⭐️ 2. NAVEGACIÓN EN VISTA NAV (GRID) ⭐️
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
                    
                    // Caso especial: Tarjeta Volver inyectada en Móvil
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

    // ⭐️ 3. NAVEGACIÓN EN DETALLES (LISTA VERTICAL) ⭐️
    App._handleDetailNavigation = function(key) {
        const activeElement = document.activeElement;
        const focusableDetailElements = App._getFocusableDetailElements();
        
        // Filtramos para navegar solo por el contenido central (Título, Botones, Card Volver Móvil)
        // Excluimos explícitamente el botón volver lateral (que entra por Tab, no por flechas)
        const mainContentElements = focusableDetailElements.filter(el => 
            el.classList.contains('detail-action-btn') || 
            el.classList.contains('card') || 
            el.tagName === 'H2' || 
            el.id === 'detalle-bloque-texto'
        );

        let currentIndex = mainContentElements.indexOf(activeElement);
        
        if (currentIndex === -1) {
            // Si el foco está perdido o fuera de la lista, volver al primero
            if (mainContentElements.length > 0) mainContentElements[0].focus();
            return;
        }
        
        let newIndex = currentIndex;
        switch (key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                // ⭐️ TOPE SUPERIOR: Si es el primero, no hacer nada (no escapar)
                newIndex = (currentIndex > 0) ? currentIndex - 1 : currentIndex;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                // Tope inferior
                newIndex = (currentIndex < mainContentElements.length - 1) ? currentIndex + 1 : currentIndex;
                break;
            case 'Enter':
            case ' ':
                // Clic solo si no es disabled y es interactivo (botones)
                if (!activeElement.classList.contains('disabled') && 
                    activeElement.tagName !== 'DIV' && 
                    activeElement.tagName !== 'H2') {
                    activeElement.click(); 
                }
                return;
        }
        if (newIndex !== currentIndex) {
            mainContentElements[newIndex].focus();
        }
    };

    // ⭐️ 4. MANEJO DE FOCO (TAB TRAP) ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;
        
        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        
        // Panel info solo existe en Desktop
        const infoPanelLinks = (!isMobile && !isTablet) ? 
            Array.from(App.DOM.infoAdicional.querySelectorAll('summary, a')) : [];

        let groups = [];

        // --- DEFINIR GRUPOS DE PESTAÑAS ---
        if (viewType === 'nav') {
            const allCards = App.DOM.track ? Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
            const activeCard = allCards[App.STATE.currentFocusIndex] || null;

            if (isMobile) {
                groups = [ [activeCard].filter(Boolean), footerLinks ];
            } else { 
                // Desktop/Tablet: Incluir tarjeta lateral izquierda
                const cardVolver = App.DOM.cardVolverFijaElemento.tabIndex === 0 ? App.DOM.cardVolverFijaElemento : null;
                groups = [
                    [cardVolver].filter(Boolean),
                    [activeCard].filter(Boolean),
                    infoPanelLinks, // Vacío en tablet
                    footerLinks
                ];
            }
        } 
        else if (viewType === 'detail') {
            // Todos los elementos interactivos del contenido (Título, Botones, Volver Móvil)
            const detailLinks = Array.from(App.DOM.detalleContenido.querySelectorAll('.card, .detail-action-btn, #detalle-bloque-texto'));
            
            // Botón lateral izquierdo (Solo Desktop/Tablet)
            let volverElement = (!isMobile && App.DOM.cardVolverFijaElemento.tabIndex === 0) ? App.DOM.cardVolverFijaElemento : null;

            groups = [
                [volverElement].filter(Boolean),
                detailLinks,
                infoPanelLinks,
                footerLinks
            ];
        }

        groups = groups.filter(g => g.length > 0);
        if (groups.length === 0) return;

        // Encontrar grupo actual
        let currentGroupIndex = -1;
        for (let i = 0; i < groups.length; i++) {
            if (groups[i].includes(document.activeElement)) {
                currentGroupIndex = i;
                break;
            }
        }
        if (currentGroupIndex === -1) currentGroupIndex = 0; 

        // Calcular siguiente grupo
        let nextGroupIndex;
        if (e.shiftKey) { 
            nextGroupIndex = (currentGroupIndex <= 0) ? groups.length - 1 : currentGroupIndex - 1;
        } else { 
            nextGroupIndex = (currentGroupIndex >= groups.length - 1) ? 0 : currentGroupIndex + 1;
        }

        const nextGroup = groups[nextGroupIndex];
        let elementToFocus;

        // Enfocar primer o último elemento del grupo destino
        if (e.shiftKey) {
            elementToFocus = nextGroup[nextGroup.length - 1];
        } else {
            elementToFocus = nextGroup[0];
        }

        // --- LIMPIEZA DE CLASES FOCUS-VISIBLE (Manual Ghost) ---
        
        // Limpiar tarjeta activa del grid
        const activeCard = App.DOM.track ? App.DOM.track.querySelector('[data-id].focus-visible') : null;
        if (activeCard && activeCard !== elementToFocus) {
            activeCard.classList.remove('focus-visible');
        }
        // Limpiar tarjeta lateral izquierda
        if (document.activeElement === App.DOM.cardVolverFijaElemento && elementToFocus !== App.DOM.cardVolverFijaElemento) {
            App.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
        }

        // Aplicar clase al nuevo elemento si es tarjeta
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