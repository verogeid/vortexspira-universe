// --- code/render-base.js ---
const LOGO_OBRAS = '🚧';
const LOGO_CARPETA = '📁';
const LOGO_CURSO = '📚';
const LOGO_VOLVER = '↩';

(function() {

    // Almacena el modo actual (móvil, tablet, escritorio)
    let _lastMode = 'desktop'; 

    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL (ROUTER) ⭐️
    App.renderNavegacion = function() {
        if (!this.STATE.fullData) {
            logError('navBase', "No se puede renderizar: Datos no cargados.");
            return;
        }

        const currentLevelState = App.stackGetCurrent();
        if (!currentLevelState) {
            logError('renderBase', "Pila de navegación no inicializada. Abortando render.");
            return;
        }

        const currentLevelId = currentLevelState.levelId;
        const isSubLevel = !!currentLevelId;
        this.STATE.currentFocusIndex = currentLevelState.focusIndex;

        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

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
                calculatedItemsPerColumn = 2; // 2 filas en Tablet
                swiperId = '#nav-swiper-tablet';
            } else {
                calculatedItemsPerColumn = 3; // 3 filas en Desktop
                swiperId = '#nav-swiper';
            }
        }
        this.STATE.itemsPorColumna = calculatedItemsPerColumn;

        const desktopView = document.getElementById('vista-navegacion-desktop');
        const tabletView = document.getElementById('vista-navegacion-tablet');
        const mobileView = document.getElementById('vista-navegacion-mobile');
        
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

        if (!isSubLevel) {
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else if (nodoActual) {
            itemsDelNivel = (nodoActual.subsecciones || []).concat(nodoActual.cursos || []);
        } else { 
            logWarn('navBase', `Nodo ${currentLevelId} no encontrado. Volviendo al nivel anterior.`);
            App.stackPop(); 
            this.renderNavegacion();
            return;
        }
        
        // ⭐️ Lógica de inyección de tarjetas para MÓVIL ⭐️
        if (isMobile) {
            if (isSubLevel) {
                itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
            }
            
            // Fallback robusto para el título
            const rootText = (typeof App.getString === 'function' ? App.getString('breadcrumbRoot') : 'Nivel Raíz') || 'Nivel Raíz';
            const breadcrumbText = isSubLevel ? (nodoActual.nombre || 'Nivel') : rootText;
            
            itemsDelNivel = [{ id: 'breadcrumb-nav', tipoEspecial: 'breadcrumb-vertical', texto: breadcrumbText }].concat(itemsDelNivel);
        }

        // 5. GESTIÓN DE VISTAS
        App._destroyCarousel(); 
        let htmlContent = renderHtmlFn(itemsDelNivel, this.STATE.itemsPorColumna);
        this.DOM.track.innerHTML = htmlContent;

        let initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        initCarouselFn(initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId);

        if (typeof this.setupTrackPointerListeners === 'function') {
            this.setupTrackPointerListeners();
        }
        
        // ⭐️⭐️⭐️ CORRECCIÓN: Pasamos 'isTablet' también para gestionar la columna derecha ⭐️⭐️⭐️
        this._updateNavViews(isSubLevel, isMobile, isTablet, nodoActual); 
        
        if (typeof this._updateVisualFocus === 'function') {
            this._updateVisualFocus(this.STATE.currentFocusIndex);
        } else {
            this._updateFocus(false); // Fallback
        }

        // 6. EL "SWAP"
        desktopView.classList.remove('active');
        tabletView.classList.remove('active');
        mobileView.classList.remove('active');
        this.DOM.vistaNav.classList.add('active'); 

        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };


    // ⭐️ 2. FUNCIÓN DE PINTADO DE TARJETA INDIVIDUAL ⭐️
    // ⭐️ CORRECCIÓN: Usamos 'tipoEspecialArg' para evitar conflictos y leemos del nodo si es null
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecialArg = null) {

        const wrapperTag = 'article';
        
        // ⭐️ CORRECCIÓN CRÍTICA: Si no se pasa argumento, mirar si el nodo tiene la propiedad
        // Esto arregla el problema de "Sin Título" en el Breadcrumb móvil
        const tipoEspecial = tipoEspecialArg || nodo.tipoEspecial;

        if (esRelleno) {
            return `<article class="card card--relleno" data-tipo="relleno" tabindex="-1" aria-hidden="true"></article>`;
        }

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
                    <h3>${LOGO_VOLVER}</h3>
                </${wrapperTag}>
            `;
        }

        const isCourse = !!nodo.titulo;
        const tipo = isCourse ? 'curso' : 'categoria';
        const tipoData = `data-tipo="${tipo}"`;
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAriaDisabled = estaActivo ? '' : 'aria-disabled="true"';
        const tabindex = '-1'; 
        
        let displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';
        if (tipo === 'categoria') {
            if (!estaActivo) {
                displayTitle = LOGO_OBRAS + ' ' + displayTitle;
            } else {
                displayTitle = LOGO_CARPETA + ' ' + displayTitle;
            }
        } else {
            displayTitle = LOGO_CURSO + ' ' + displayTitle; 
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
            </${wrapperTag}>
        `;
    };


    // ⭐️ 3. LÓGICA DE FOCO Y NAVEGACIÓN ⭐️
    App._updateFocus = function(shouldSlide = true) {
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;

        // 1. Limpiar focos
        const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
        allCardsInTrack.forEach(card => {
            card.classList.remove('focus-visible');
            card.tabIndex = -1;
            card.removeAttribute('aria-current'); 
        });
        if (App.DOM.cardVolverFijaElemento) {
            App.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
            App.DOM.cardVolverFijaElemento.removeAttribute('aria-current'); 
        }

        // 2. Obtener nueva tarjeta
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        // 3. Normalizar índice
        let normalizedIndex = currentFocusIndex;
        if (normalizedIndex < 0) normalizedIndex = 0;
        if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
        
        const nextFocusedCard = allCards[normalizedIndex];
        this.STATE.currentFocusIndex = normalizedIndex;

        App.stackUpdateCurrentFocus(normalizedIndex);

        // 4. Aplicar foco
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.tabIndex = 0;
            nextFocusedCard.setAttribute('aria-current', 'true'); 

            if (shouldSlide) {
                nextFocusedCard.focus(); 
            } else {
                nextFocusedCard.focus({ preventScroll: true }); 
            }

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


    // ⭐️ 4. LÓGICA DE CONTROL DEL CARRUSEL (Stubs) ⭐️
    App._generateCardHTML_Carousel = App._generateCardHTML_Carousel || function() {logError('navBase', "render-swipe.js no cargado"); return ""; };
    App._generateCardHTML_Mobile = App._generateCardHTML_Mobile || function() { logError('navBase', "render-mobile.js no cargado"); return ""; };
    App._initCarousel_Swipe = App._initCarousel_Swipe || function() { logError('navBase', "render-swipe.js no cargado"); };
    App._initCarousel_Mobile = App._initCarousel_Mobile || function() { logError('navBase', "render-mobile.js no cargado"); };
    App._destroyCarousel = App._destroyCarousel || function() { };


    // ⭐️ 5. UTILIDADES DE VISTAS LATERALES Y DATOS (REESCRITO CON CLASES) ⭐️
    // ⭐️ CORRECCIÓN: Añadido parámetro 'isTablet'
    App._updateNavViews = function(isSubLevel, isMobile, isTablet, nodoActual) {
        
        // --- 1. Visibilidad de Sidebars y Botón Móvil ---
        if (isMobile) { 
            // --- MÓVIL (Sin sidebars) ---
            this.DOM.cardVolverFija.classList.remove('visible'); 
            this.DOM.infoAdicional.classList.remove('visible'); 
            
            // El botón volver se inyecta en el track en móvil
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;

        } else { 
            // --- DESKTOP Y TABLET ---
            
            // ⭐️ Lógica Específica Tablet: Ocultar Info Adicional (derecha)
            if (isTablet) {
                this.DOM.infoAdicional.classList.remove('visible');
            } else {
                this.DOM.infoAdicional.classList.add('visible'); 
            }

            this.DOM.btnVolverNav.classList.remove('visible'); 
            this.DOM.btnVolverNav.tabIndex = -1;
            
            this.DOM.cardVolverFija.classList.add('visible'); 

            // 2. Breadcrumb
            this.DOM.cardNivelActual.classList.add('visible');
            if (isSubLevel) {
                const nombreNivel = nodoActual.nombre || nodoActual.titulo || 'Nivel';
                this.DOM.cardNivelActual.innerHTML = `<h3>${nombreNivel}</h3>`;
            } else {
                this.DOM.cardNivelActual.innerHTML = `<h3>${App.getString('breadcrumbRoot')}</h3>`;
            }

            // 3. Botón Volver (Izquierda)
            if (isSubLevel) {
                this.DOM.cardVolverFijaElemento.classList.add('visible'); 
                this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${LOGO_VOLVER}</h3>`; 
                this.DOM.cardVolverFijaElemento.tabIndex = 0;
            } else {
                this.DOM.cardVolverFijaElemento.classList.remove('visible'); 
                this.DOM.cardVolverFijaElemento.innerHTML = ''; 
                this.DOM.cardVolverFijaElemento.tabIndex = -1;
            }
        }
    };

    // ⭐️ 6. RESIZE OBSERVER ⭐️
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
                const lastWasMobile = (_lastMode === 'mobile');
                const newIsMobile = (newMode === 'mobile');

                let focusDelta = 0;
                if (isSubLevel) {
                    if (lastWasMobile && !newIsMobile) focusDelta = -2; 
                    else if (!lastWasMobile && newIsMobile) focusDelta = 2; 
                } else {
                    if (lastWasMobile && !newIsMobile) focusDelta = -1; 
                    else if (!lastWasMobile && newIsMobile) focusDelta = 1; 
                }
                
                if (focusDelta !== 0) {
                    this.STATE.currentFocusIndex = Math.max(0, this.STATE.currentFocusIndex + focusDelta);
                    App.stackUpdateCurrentFocus(this.STATE.currentFocusIndex);
                }
                
                _lastMode = newMode;
                this.renderNavegacion(); 
            }
        });

        this.STATE.resizeObserver.observe(document.body);
    };

    // ⭐️ 7. HELPERS ⭐️
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