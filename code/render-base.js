// --- code/render-base.js ---
(function() {

    // Almacena el modo actual (móvil, tablet, escritorio)
    let _lastMode = 'desktop'; 

    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL (ROUTER) ⭐️
    App.renderNavegacion = function() {
        if (!this.STATE.fullData) {
            logError('navBase', "No se puede renderizar: Datos no cargados.");
            return;
        }

        // ⭐️ MODIFICACIÓN: Leer desde App.stackGetCurrent()
        const currentLevelState = App.stackGetCurrent();
        if (!currentLevelState) {
            logError('renderBase', "Pila de navegación no inicializada. Abortando render.");
            return;
        }

        const currentLevelId = currentLevelState.levelId;
        const isSubLevel = !!currentLevelId; // true si levelId no es null
        
        // ⭐️ IMPORTANTE: Actualizar el STATE global con el foco guardado de la pila
        this.STATE.currentFocusIndex = currentLevelState.focusIndex;

        // ⭐️ 1. DEFINIR LOS 3 MODOS ⭐️
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

        // ⭐️ 2. ELEGIR LAS FUNCIONES Y VARIABLES ⭐️
        let renderHtmlFn;
        let initCarouselFn;
        let calculatedItemsPerColumn;
        let swiperId = null;
        
        if (isMobile) {
            renderHtmlFn = App._generateCardHTML_Mobile;
            initCarouselFn = App._initCarousel_Mobile; 
            calculatedItemsPerColumn = 1;
        } else {
            renderHtmlFn = App._generateCardHTML_Carousel;
            initCarouselFn = App._initCarousel_Swipe; 
            if (isTablet) {
                calculatedItemsPerColumn = 2; // 2 filas
                swiperId = '#nav-swiper-tablet';
            } else {
                calculatedItemsPerColumn = 3; // 3 filas
                swiperId = '#nav-swiper';
            }
        }
        this.STATE.itemsPorColumna = calculatedItemsPerColumn;

        // ⭐️ 3. SELECCIÓN DINÁMICA DE 3 VISTAS ⭐️
        const desktopView = document.getElementById('vista-navegacion-desktop');
        const tabletView = document.getElementById('vista-navegacion-tablet');
        const mobileView = document.getElementById('vista-navegacion-mobile');
        
        // ⭐️ 4. ELEGIR EL DIV Y TRACK (A DÓNDE VAMOS) ⭐️
        if (isMobile) {
            this.DOM.vistaNav = mobileView;
            this.DOM.track = document.getElementById('track-mobile');
        } else if (isTablet) {
            this.DOM.vistaNav = tabletView;
            this.DOM.track = document.getElementById('track-tablet');
        } else {
            this.DOM.vistaNav = desktopView;
            this.DOM.track = document.getElementById('track-desktop');
        }

        // 2. OBTENER DATOS ACTUALES
        const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion);
        let itemsDelNivel = [];

        if (!isSubLevel) { // Estamos en la raíz
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else if (nodoActual) { // Estamos en subnivel
            const subsecciones = nodoActual.subsecciones || [];
            const cursos = nodoActual.cursos || [];
            itemsDelNivel = subsecciones.concat(cursos);
        } else { // Error, nodo no encontrado
            logWarn('navBase', `Nodo ${currentLevelId} no encontrado. Volviendo al nivel anterior.`);
            App.stackPop(); 
            this.renderNavegacion();
            return;
        }
        
        // ⭐️ MODIFICADO: Lógica de inyección de tarjetas para MÓVIL ⭐️
        if (isSubLevel && isMobile) {
            // Inyecta "Volver"
            itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
        }
        if (isMobile) {
             // Inyecta "Breadcrumb"
            const breadcrumbText = isSubLevel ? (nodoActual.nombre || 'Nivel') : App.getString('breadcrumbRoot');
            itemsDelNivel = [{ id: 'breadcrumb-nav', tipoEspecial: 'breadcrumb-vertical', texto: breadcrumbText }].concat(itemsDelNivel);
        }


        // ⭐️ 5. GESTIÓN DE VISTAS (FLUJO "ANTI-PARPADEO") ⭐️

        App._destroyCarousel(); 
        let htmlContent = renderHtmlFn(itemsDelNivel, this.STATE.itemsPorColumna);
        this.DOM.track.innerHTML = htmlContent;

        // 4. INICIALIZAR EL CARRUSEL
        let initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        initCarouselFn(initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId);

        if (typeof this.setupTrackPointerListeners === 'function') {
            this.setupTrackPointerListeners();
        }
        
        // ⭐️ LLAMADA A _updateNavViews (CON LÓGICA DE BREADCRUMB) ⭐️
        this._updateNavViews(isSubLevel, isMobile || isTablet, nodoActual); 
        
        if (typeof this._updateVisualFocus === 'function') {
             this._updateVisualFocus(this.STATE.currentFocusIndex);
        } else {
            this._updateFocus(false); // Fallback
        }

        // 6. ⭐️ EL "SWAP" ⭐️
        desktopView.classList.remove('active');
        tabletView.classList.remove('active');
        mobileView.classList.remove('active');
        this.DOM.vistaNav.classList.add('active'); 

        // 7. RESIZE OBSERVER
        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };


    // ⭐️ 2. FUNCIÓN DE PINTADO DE TARJETA INDIVIDUAL (Modificado) ⭐️
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null) {

        const wrapperTag = 'article';

        if (esRelleno) {
            return `<article class="card card--relleno" data-tipo="relleno" tabindex="-1" aria-hidden="true"></article>`;
        }

        // ⭐️ NUEVO: Tarjeta Breadcrumb para Móvil ⭐️
        if (tipoEspecial === 'breadcrumb-vertical') {
             return `
                <${wrapperTag} class="card card-breadcrumb-vertical" 
                    data-id="breadcrumb-nav" 
                    data-tipo="relleno" 
                    tabindex="-1"
                    aria-hidden="true">
                    <h3>${nodo.texto}</h3>
                </${wrapperTag}>
            `;
        }

        if (tipoEspecial === 'volver-vertical') {
            return `
                <${wrapperTag} class="card card-volver-vertical" 
                    data-id="volver-nav" 
                    data-tipo="volver-vertical" 
                    role="button" 
                    tabindex="-1"
                    aria-label="${App.getString('ariaBackLevel')}">
                    <h3>↩</h3>
                </${wrapperTag}>
            `;
        }

        const isCourse = !!nodo.titulo;
        const tipo = isCourse ? 'curso' : 'categoria';
        const tipoData = `data-tipo="${tipo}"`;
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAriaDisabled = estaActivo ? '' : 'aria-disabled="true"';
        const tabindex = '-1'; 
        let hint = '';
        if (!estaActivo) hint = '<span>🚧</span>';
        
        let displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';
        if (tipo === 'categoria') {
            displayTitle = '📁 ' + displayTitle;
        } else {
            displayTitle = '📚 ' + displayTitle; 
        }
        
        const ariaLabel = `${tipo === 'curso' ? 'Curso' : 'Categoría'}: ${nodo.nombre || nodo.titulo || 'Sin Título'}. ${estaActivo ? 'Seleccionar para entrar.' : 'Contenido no disponible.'}`;

        return `
            <${wrapperTag} class="card ${claseDisabled}" 
                data-id="${nodo.id}" 
                ${tipoData}
                role="button" 
                tabindex="${tabindex}" 
                ${tagAriaDisabled}
                aria-label="${ariaLabel}">
                <h3>${displayTitle}</h3>
                ${hint}
            </${wrapperTag}>
        `;
    };


    // ⭐️ 3. LÓGICA DE FOCO Y NAVEGACIÓN (CORREGIDO CON NAV-STACK) ⭐️
    App._updateFocus = function(shouldSlide = true) {
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;

        // 1. Limpiar focos y aria-current anteriores
        const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
        allCardsInTrack.forEach(card => {
            card.classList.remove('focus-visible');
            card.tabIndex = -1;
            card.removeAttribute('aria-current'); 
        });
        if (App.DOM.cardVolverFijaElemento) { // ⭐️ Corregido
            App.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
            App.DOM.cardVolverFijaElemento.removeAttribute('aria-current'); 
        }

        // 2. Obtener la nueva tarjeta REAL
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        // 3. Normalizar el índice
        let normalizedIndex = currentFocusIndex;
        if (normalizedIndex < 0) normalizedIndex = 0;
        if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
        
        const nextFocusedCard = allCards[normalizedIndex];
        this.STATE.currentFocusIndex = normalizedIndex;

        App.stackUpdateCurrentFocus(normalizedIndex);

        // 4. Aplicar nuevo foco y aria-current
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.tabIndex = 0;
            nextFocusedCard.setAttribute('aria-current', 'true'); 

            if (shouldSlide) {
                nextFocusedCard.focus(); 
            } else {
                nextFocusedCard.focus({ preventScroll: true }); 
            }

            // 5. DELEGAR LA ACCIÓN DE DESLIZAMIENTO/SCROLL
            if (!isMobile && carouselInstance && shouldSlide) {
                
                const targetSwiperSlide = Math.floor(normalizedIndex / itemsPorColumna) + 1; 
                
                if (targetSwiperSlide !== carouselInstance.realIndex) {
                    carouselInstance.slideToLoop(targetSwiperSlide, 400); 
                }

            } else if (isMobile && shouldSlide) {
                nextFocusedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };


    // ⭐️ 4. LÓGICA DE CONTROL DEL CARRUSEL (Stubs/Fallbacks) ⭐️
    App._generateCardHTML_Carousel = App._generateCardHTML_Carousel || function() { logError('navBase', "render-swipe.js no cargado"); return ""; };
    App._generateCardHTML_Mobile = App._generateCardHTML_Mobile || function() { logError('navBase', "render-mobile.js no cargado"); return ""; };
    App._initCarousel_Swipe = App._initCarousel_Swipe || function() { logError('navBase', "render-swipe.js no cargado"); };
    App._initCarousel_Mobile = App._initCarousel_Mobile || function() { logError('navBase', "render-mobile.js no cargado"); };
    App._destroyCarousel = App._destroyCarousel || function() { /* El destructor real está en render-swipe.js */ };


    // ⭐️ 5. UTILIDADES DE VISTAS LATERALES Y DATOS (REESCRITO CON CLASES) ⭐️
    App._updateNavViews = function(isSubLevel, isMobileOrTablet, nodoActual) {
        
        // --- 1. Visibilidad de Sidebars y Botón Móvil ---
        if (isMobileOrTablet) { 
            // --- Móvil O Tablet ---
            this.DOM.cardVolverFija.classList.remove('visible'); // Ocultar sidebar izq
            this.DOM.infoAdicional.classList.remove('visible'); // Ocultar sidebar der
            
            // (El botón volver móvil es ahora una tarjeta inyectada en renderNavegacion)
            // (El breadcrumb móvil es ahora una tarjeta inyectada en renderNavegacion)
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;

        } else { 
            // --- Solo Desktop ---
            this.DOM.infoAdicional.classList.add('visible'); // Mostrar sidebar der
            this.DOM.btnVolverNav.classList.remove('visible'); // Ocultar botón móvil
            this.DOM.btnVolverNav.tabIndex = -1;
            
            this.DOM.cardVolverFija.classList.add('visible'); // Mostrar sidebar izq

            // 2. Breadcrumb (Solo Desktop)
            this.DOM.cardNivelActual.classList.add('visible'); // Siempre visible en nav
            if (isSubLevel) {
                const nombreNivel = nodoActual.nombre || nodoActual.titulo || 'Nivel';
                this.DOM.cardNivelActual.innerHTML = `<h3>${nombreNivel}</h3>`;
            } else {
                this.DOM.cardNivelActual.innerHTML = `<h3>${App.getString('breadcrumbRoot')}</h3>`;
            }

            // 3. Botón Volver (Solo Desktop)
            if (isSubLevel) {
                this.DOM.cardVolverFijaElemento.classList.add('visible'); 
                this.DOM.cardVolverFijaElemento.innerHTML = `<h3>↩</h3>`; 
                this.DOM.cardVolverFijaElemento.tabIndex = 0;
            } else {
                this.DOM.cardVolverFijaElemento.classList.remove('visible'); 
                this.DOM.cardVolverFijaElemento.innerHTML = ''; 
                this.DOM.cardVolverFijaElemento.tabIndex = -1;
            }
        }
    };

    // ⭐️ 6. RESIZE OBSERVER (CORREGIDO CON NAV-STACK) ⭐️
    App._setupResizeObserver = function() {
        log('renderBase', DEBUG_LEVELS.BASIC, "ResizeObserver (3 modos) configurado.");
        
        const getMode = (width) => {
            if (width <= MOBILE_MAX_WIDTH) return 'mobile';
            if (width <= TABLET_MAX_WIDTH) return 'tablet';
            return 'desktop';
        };
        
        _lastMode = getMode(window.innerWidth);
        log('renderBase', DEBUG_LEVELS.BASIC, `Modo inicial establecido en: ${_lastMode}`);

        this.STATE.resizeObserver = new ResizeObserver(() => {
            const newMode = getMode(window.innerWidth);

            if (newMode !== _lastMode && this.STATE.initialRenderComplete) {
                log('renderBase', DEBUG_LEVELS.BASIC, `Cambiando de vista: ${_lastMode} -> ${newMode}`);
                
                const isSubLevel = (App.stackGetCurrent() && App.stackGetCurrent().levelId);
                
                // ⭐️ MODIFICADO: Ajuste de foco al cambiar de modo
                if (isSubLevel) {
                    const lastWasMobile = (_lastMode === 'mobile');
                    const newIsMobile = (newMode === 'mobile');
                    
                    if (lastWasMobile && !newIsMobile) {
                        // De Móvil (con 2 tarjetas extra) a Desktop (sin tarjetas extra)
                        this.STATE.currentFocusIndex = Math.max(0, this.STATE.currentFocusIndex - 2);
                        log('renderBase', DEBUG_LEVELS.BASIC, "Ajuste de foco: -2 (Volver y Breadcrumb quitados)");
                    } else if (!lastWasMobile && newIsMobile) {
                         // De Desktop (sin extra) a Móvil (con 2 tarjetas extra)
                        this.STATE.currentFocusIndex += 2;
                        log('renderBase', DEBUG_LEVELS.BASIC, "Ajuste de foco: +2 (Volver y Breadcrumb añadidos)");
                    }
                } else if (!isSubLevel) {
                     const lastWasMobile = (_lastMode === 'mobile');
                    const newIsMobile = (newMode === 'mobile');
                    // Nivel Raíz: solo se añade/quita el breadcrumb
                    if (lastWasMobile && !newIsMobile) {
                         this.STATE.currentFocusIndex = Math.max(0, this.STATE.currentFocusIndex - 1);
                         log('renderBase', DEBUG_LEVELS.BASIC, "Ajuste de foco: -1 (Breadcrumb quitado)");
                    } else if (!lastWasMobile && newIsMobile) {
                        this.STATE.currentFocusIndex += 1;
                        log('renderBase', DEBUG_LEVELS.BASIC, "Ajuste de foco: +1 (Breadcrumb añadido)");
                    }
                }
                
                App.stackUpdateCurrentFocus(this.STATE.currentFocusIndex);
                _lastMode = newMode;
                this.renderNavegacion(); 
            }
        });

        this.STATE.resizeObserver.observe(document.body);
    };

    // ⭐️ 7. HELPERS _findNodoById y _tieneContenidoActivo ⭐️
    App._findNodoById = function(id, nodos) {
        if (!nodos || !id) return null;
        for (const n of nodos) {
            if (n.id === id) return n;
            if (n.subsecciones && n.subsecciones.length > 0) {
                const encontrado = this._findNodoById(id, n.subsecciones);
                if (encontrado) return encontrado;
            }
            if (n.cursos && n.cursos.length > 0) {
                const cursoEncontrado = n.cursos.find(c => c.id === id);
                if (cursoEncontrado) return cursoEncontrado;
            }
        }
        return null;
    };

    App._tieneContenidoActivo = function(nodoId) {
        const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
        if (!nodo) return false;
        if (nodo.titulo) return true; 

        if (nodo.cursos && nodo.cursos.length > 0) {
            return true;
        }

        if (nodo.subsecciones && nodo.subsecciones.length > 0) {
            for (const sub of nodo.subsecciones) {
                if (this._tieneContenidoActivo(sub.id)) {
                    return true;
                }
            }
        }
        
        return false;
    };

})();