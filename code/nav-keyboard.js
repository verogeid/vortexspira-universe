// --- code/nav-keyboard.js ---
(function() {

    // ⭐️ 1. LISTENER CENTRAL DE TECLADO (CORREGIDO Y REORDENADO) ⭐️
    document.addEventListener('keydown', (e) => {
        if (!App || !App.DOM || !App.DOM.vistaNav) return; // App no está lista

        // ⭐️ 1. DEFINIR VISTAS ACTIVAS AL INICIO ⭐️
        const isNavActive = App.DOM.vistaNav.classList.contains('active');
        const isDetailActive = App.DOM.vistaDetalle.classList.contains('active');


        // --- MANEJO DE TECLAS GLOBALES ---

        // 2. ⭐️ Tab (Focus Trap) siempre se maneja PRIMERO ⭐️
        if (e.key === 'Tab') {
            e.preventDefault();
            
            if (isNavActive) {
                App._handleFocusTrap(e, 'nav');
            } else if (isDetailActive) {
                App._handleFocusTrap(e, 'detail');
            }
            return; // No hacer nada más
        }
        
        // 3. Escape siempre vuelve
        if (e.key === 'Escape') {
            e.preventDefault();
            App._handleVolverClick(); 
            return;
        }

        // --- MANEJO DE TECLAS CONTEXTUALES (FLECHAS, ENTER, ESPACIO) ---

        // 4. Comprobar si el foco está en el footer (SOLO FLECHAS)
        const isFooterActive = document.activeElement.closest('footer');
        if (isFooterActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                App._handleFooterNavigation(e.key);
            }
            return; // Ignora Tab (ya manejado), Enter, Espacio
        }

        // 5. Comprobar si el foco está en la tarjeta "Volver" (Desktop)
        if (document.activeElement === App.DOM.cardVolverFija) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                App._handleVolverClick();
            }
            return; 
        }

        // 6. Comprobar Vistas (para flechas/enter/espacio en el contenido principal)
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

    // ⭐️ 4. MANEJO DE FOCO (TAB) (CORREGIDO CON LÓGICA DE GRUPOS) ⭐️
    App._handleFocusTrap = function(e, viewType) {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;
        const isTablet = screenWidth > 600 && screenWidth <= 768;
        
        const footerLinks = Array.from(document.querySelectorAll('footer a'));
        let groups = [];

        // --- 1. Definir los grupos de foco ---
        if (viewType === 'nav') {
            const allCards = App.DOM.track ? Array.from(App.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
            const activeCard = allCards[App.STATE.currentFocusIndex] || null;

            if (isMobile || isTablet) {
                const btnVolver = App.DOM.btnVolverNav.style.display === 'block' ? App.DOM.btnVolverNav : null;
                groups = [
                    [btnVolver].filter(Boolean), // Grupo 1: Botón Volver (si existe)
                    [activeCard].filter(Boolean), // Grupo 2: Tarjeta activa
                    footerLinks                   // Grupo 3: Footer
                ];
            } else { 
                const cardVolver = App.DOM.cardVolverFija.tabIndex === 0 ? App.DOM.cardVolverFija : null;
                groups = [
                    [cardVolver].filter(Boolean), // Grupo 1: Tarjeta Volver (si existe)
                    [activeCard].filter(Boolean), // Grupo 2: Tarjeta activa
                    footerLinks                   // Grupo 3: Footer
                ];
            }
        } 
        else if (viewType === 'detail') {
            const detailInteractive = App._getFocusableDetailElements(); // Esto incluye el botón "Volver" Y los enlaces
            groups = [
                detailInteractive, // Grupo 1: Volver + Enlaces del curso
                footerLinks        // Grupo 2: Footer
            ];
        }

        // Filtrar grupos vacíos
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
        // Si no estamos en ningún grupo (p.ej. click en el body), empezamos por el primero
        if (currentGroupIndex === -1) currentGroupIndex = 0; 

        // --- 3. Calcular el siguiente grupo ---
        let nextGroupIndex;
        if (e.shiftKey) { // Moviéndose hacia atrás
            nextGroupIndex = (currentGroupIndex <= 0) ? groups.length - 1 : currentGroupIndex - 1;
        } else { // Moviéndose hacia adelante
            nextGroupIndex = (currentGroupIndex >= groups.length - 1) ? 0 : currentGroupIndex + 1;
        }

        // --- 4. Enfocar el elemento correcto en el siguiente grupo ---
        const nextGroup = groups[nextGroupIndex];
        let elementToFocus;

        if (e.shiftKey) {
            // Ir al ÚLTIMO elemento del grupo anterior
            elementToFocus = nextGroup[nextGroup.length - 1];
        } else {
            // Ir al PRIMER elemento del grupo siguiente
            elementToFocus = nextGroup[0];
        }

        // --- 5. Limpiar/Añadir clases de foco ---
        const activeCard = App.DOM.track ? App.DOM.track.querySelector('[data-id].focus-visible') : null;
        if (activeCard && activeCard !== elementToFocus) {
            activeCard.classList.remove('focus-visible');
        }
        if (elementToFocus === App.DOM.cardVolverFija) {
             elementToFocus.classList.add('focus-visible');
        }

        if (elementToFocus) {
            elementToFocus.focus();
        }
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