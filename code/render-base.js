// --- code/render-base.js ---
(function() {

    let _lastMode = 'desktop'; 
    
    // ⭐️ Importar las constantes de breakpoint (Patrón actual: variables globales) ⭐️
    const MOBILE_MAX_WIDTH = typeof window.MOBILE_MAX_WIDTH !== 'undefined' ? window.MOBILE_MAX_WIDTH : 600;
    const TABLET_MIN_WIDTH = typeof window.TABLET_MIN_WIDTH !== 'undefined' ? window.TABLET_MIN_WIDTH : 601;
    const TABLET_MAX_WIDTH = typeof window.TABLET_MAX_WIDTH !== 'undefined' ? window.TABLET_MAX_WIDTH : 1024;
    const DESKTOP_MIN_WIDTH = typeof window.DESKTOP_MIN_WIDTH !== 'undefined' ? window.DESKTOP_MIN_WIDTH : 1025;
    const LOGO_VOLVER = typeof window.LOGO_VOLVER !== 'undefined' ? window.LOGO_VOLVER : '↩';
    
    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL ⭐️
    App.renderNavegacion = function() {
        if (typeof log === 'function') {
            log('render_base', DEBUG_LEVELS.BASIC, "Iniciando renderNavegacion...");
        }
        
        if (!this.STATE.fullData) {
            if (typeof logError === 'function') {
                logError('render_base', "No se puede renderizar: Datos no cargados.");
            }
            return;
        }

        const currentLevelState = App.stackGetCurrent();
        if (!currentLevelState) return;

        const currentLevelId = currentLevelState.levelId;
        const isSubLevel = !!currentLevelId;
        this.STATE.currentFocusIndex = currentLevelState.focusIndex;

        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        
        // ⭐️ Detección de rangos para Tablet Landscape y Portrait ⭐️
        const isTabletLandscape = screenWidth >= 801 && screenWidth <= TABLET_MAX_WIDTH;
        const isTabletPortrait = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= 800;
        const isDesktop = screenWidth >= DESKTOP_MIN_WIDTH;

        let renderHtmlFn;
        let initCarouselFn;
        let calculatedItemsPerColumn;
        let swiperId = null;
        
        const desktopView = document.getElementById('vista-navegacion-desktop');
        const tabletView = document.getElementById('vista-navegacion-tablet');
        const mobileView = document.getElementById('vista-navegacion-mobile');
        
        // -------------------------------------------------------------
        // ⭐️ Detección de Modo y Asignación de DOM ⭐️
        // -------------------------------------------------------------
        
        if (isMobile) {
            renderHtmlFn = App._generateCardHTML_Mobile;
            initCarouselFn = App._initCarousel_Mobile; 
            calculatedItemsPerColumn = 1;

            this.DOM.vistaNav = mobileView;
            this.DOM.vistaDetalle = document.getElementById('vista-detalle-mobile'); 
            this.DOM.detalleContenido = document.getElementById('detalle-contenido-mobile');
            
            if (isSubLevel) {
                this.DOM.track = document.getElementById('track-mobile-submenu'); 
                this.DOM.inactiveTrack = document.getElementById('track-mobile-root'); 
            } else {
                this.DOM.track = document.getElementById('track-mobile-root'); 
                this.DOM.inactiveTrack = document.getElementById('track-mobile-submenu'); 
            }
            if (typeof log === 'function') {
                 log('render_base', DEBUG_LEVELS.DEEP, 'Modo Móvil. Track activo:', this.DOM.track.id);
            }
            
        } else {
            renderHtmlFn = App._generateCardHTML_Carousel;
            initCarouselFn = App._initCarousel_Swipe; 
            
            if (isTabletPortrait || isTabletLandscape) {
                // TAMAÑO: 2 elementos por tarjeta para AMBOS modos Tablet
                calculatedItemsPerColumn = 2; 
                swiperId = '#nav-swiper-tablet';

                this.DOM.vistaNav = tabletView;
                this.DOM.track = document.getElementById('track-tablet'); 
            } 
            
            if (isDesktop) {
                // TAMAÑO: 3 elementos por tarjeta
                calculatedItemsPerColumn = 3; 
                swiperId = '#nav-swiper';

                this.DOM.vistaNav = desktopView;
                this.DOM.track = document.getElementById('track-desktop'); 
            }
            
            this.DOM.vistaDetalle = document.getElementById('vista-detalle-desktop'); 
            this.DOM.detalleContenido = document.getElementById('detalle-contenido-desktop');
        }
        this.STATE.itemsPorColumna = calculatedItemsPerColumn;
        
        // -------------------------------------------------------------
        // ⭐️ Obtención de Datos y Renderizado ⭐️
        // -------------------------------------------------------------

        const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion);
        let itemsDelNivel = [];

        if (!isSubLevel) {
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else if (nodoActual) {
            itemsDelNivel = (nodoActual.subsecciones || []).concat(nodoActual.cursos || []);
        } else { 
            App.stackPop(); 
            this.renderNavegacion();
            return;
        }
        
        // Lógica de inyección de tarjetas para MÓVIL
        if (isMobile) {
            if (isSubLevel) {
                itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
            }
            
            let breadcrumbText = 'Nivel Raíz';
            if (isSubLevel && nodoActual) {
                breadcrumbText = nodoActual.nombre || nodoActual.titulo || 'Nivel';
            } else if (typeof App.getString === 'function') {
                breadcrumbText = App.getString('breadcrumbRoot') || 'Nivel Raíz';
            }
            
            if (isSubLevel) {
                itemsDelNivel = [{ 
                    id: 'breadcrumb-nav', 
                    tipoEspecial: 'breadcrumb-vertical', 
                    texto: breadcrumbText 
                }].concat(itemsDelNivel);
            }
        }

        App._destroyCarousel(); 
        let htmlContent = renderHtmlFn(itemsDelNivel, this.STATE.itemsPorColumna);
        this.DOM.track.innerHTML = htmlContent;

        // Ocultar el track inactivo para eliminar el espaciado
        if (isMobile && this.DOM.inactiveTrack) {
            this.DOM.inactiveTrack.style.display = 'none';
            this.DOM.track.style.display = 'flex'; 
        }

        let initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        initCarouselFn(initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId);

        if (typeof this.setupTrackPointerListeners === 'function') {
            if (typeof log === 'function') {
                log('render_base', DEBUG_LEVELS.DEEP, 'Llamando a setupTrackPointerListeners.');
            }
            this.setupTrackPointerListeners();
        }
        
        // ⭐️ Llamada al actualizador de vistas con los nuevos rangos ⭐️
        this._updateNavViews(isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual); 
        
        if (typeof this._updateVisualFocus === 'function') {
             this._updateVisualFocus(this.STATE.currentFocusIndex);
        } else {
            this._updateFocus(false); 
        }

        // --- LÓGICA DE ACTIVACIÓN DE VISTAS ---
        desktopView.classList.remove('active');
        tabletView.classList.remove('active');
        mobileView.classList.remove('active');
        
        const isDetailActive = this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active');
        
        if (isDetailActive) {
            this.DOM.vistaDetalle.classList.add('active');
        } else {
            if (isMobile) {
                mobileView.classList.add('active'); 
                
                if (isSubLevel) {
                    mobileView.classList.add('view-nav-submenu');
                } else {
                    mobileView.classList.add('view-nav-root');
                }
            } 
            // ⭐️ Activa la vista de Tablet (swiper-tablet) para ambos rangos Tablet ⭐️
            else if (isTabletPortrait || isTabletLandscape) {
                tabletView.classList.add('active');
            } 
            else { // Desktop
                desktopView.classList.add('active');
            }
        }
        if (typeof log === 'function') {
             log('render_base', DEBUG_LEVELS.BASIC, 'Renderizado completado.');
        }
        
        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };

    /**
     * ⭐️ FUNCIÓN CENTRAL DE GENERACIÓN DE TARJETA HTML ⭐️
     */
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecialArg = null) {
        const wrapperTag = 'article';
        const tipoEspecial = tipoEspecialArg || nodo.tipoEspecial;

        const onclickHandler = `onclick="App._handleTrackClick(event)"`; 
        
        if (typeof LOGO_VOLVER === 'undefined') { LOGO_VOLVER = '↩'; }
        const LOGO_OBRAS = typeof window.LOGO_OBRAS !== 'undefined' ? window.LOGO_OBRAS : '🚧';
        const LOGO_CARPETA = typeof window.LOGO_CARPETA !== 'undefined' ? window.LOGO_CARPETA : '📁';
        const LOGO_CURSO = typeof window.LOGO_CURSO !== 'undefined' ? window.LOGO_CURSO : '📚';

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
                    tabindex="0"
                    onclick="App._handleVolverClick()"
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

        const isMobileMode = window.innerWidth <= MOBILE_MAX_WIDTH;
        // Forzar tabindex="0" en modo móvil para asegurar la respuesta de TAP.
        const tabindex = isMobileMode ? '0' : '-1';
        
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
                ${onclickHandler} 
                aria-label="${ariaLabel}">
                <h3>${displayTitle}</h3>
            </${wrapperTag}>
        `;
    };

    /**
     * Helper para actualizar el foco visual y el slide de Swiper.
     */
    App._updateFocus = function(shouldSlide = true) {
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;

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
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;
        let normalizedIndex = currentFocusIndex;
        if (normalizedIndex < 0) normalizedIndex = 0;
        if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
        const nextFocusedCard = allCards[normalizedIndex];
        this.STATE.currentFocusIndex = normalizedIndex;
        App.stackUpdateCurrentFocus(normalizedIndex);
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
            } else if (isMobile) {
                nextFocusedCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    /**
     * Actualiza la visibilidad de los paneles laterales (`card-volver-fija` e `info-adicional`).
     */
    App._updateNavViews = function(isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual) {
        if (isMobile) { 
            this.DOM.cardVolverFija.classList.remove('visible'); 
            this.DOM.infoAdicional.classList.remove('visible'); 
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
        } else { 
            // Tablet y Desktop
            
            // ⭐️ Lógica clave: Mostrar info-adicional solo en Desktop (>1025) y Tablet Landscape (801-1024) ⭐️
            if (isDesktop || isTabletLandscape) {
                this.DOM.infoAdicional.classList.add('visible'); 
            } else { // Tablet Portrait (601-800)
                this.DOM.infoAdicional.classList.remove('visible');
            }

            this.DOM.btnVolverNav.classList.remove('visible'); 
            this.DOM.btnVolverNav.tabIndex = -1;
            
            this.DOM.cardVolverFija.classList.add('visible'); 
            this.DOM.cardNivelActual.classList.add('visible');
            
            if (isSubLevel) {
                const nombreNivel = nodoActual ? (nodoActual.nombre || nodoActual.titulo || 'Nivel') : 'Nivel';
                this.DOM.cardNivelActual.innerHTML = `<h3>${nombreNivel}</h3>`;
            } else {
                this.DOM.cardNivelActual.innerHTML = `<h3>${App.getString('breadcrumbRoot')}</h3>`;
            }
            
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

    /**
     * Configura el ResizeObserver para detectar cambios de modo.
     */
    App._setupResizeObserver = function() {
        const getMode = (width) => {
            if (width <= MOBILE_MAX_WIDTH) return 'mobile';
            if (width <= TABLET_MAX_WIDTH) return 'tablet';
            return 'desktop';
        };
        _lastMode = getMode(window.innerWidth);
        this.STATE.resizeObserver = new ResizeObserver(() => {
            const newMode = getMode(window.innerWidth);
            if (newMode !== _lastMode && this.STATE.initialRenderComplete) {
                const isSubLevel = (App.stackGetCurrent() && App.stackGetCurrent().levelId);
                const lastWasMobile = (_lastMode === 'mobile');
                const newIsMobile = (newMode === 'mobile');
                let focusDelta = 0;
                
                // Lógica de corrección del índice de foco al cambiar de modo (solo ejemplo)
                if (isSubLevel) {
                    if (lastWasMobile && !newIsMobile) focusDelta = -2; // Mover de volver/breadcrumb a la primera tarjeta
                    else if (!lastWasMobile && newIsMobile) focusDelta = 2; // Mover al inicio tras añadir volver/breadcrumb
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

    // Asegurar que las funciones de render-swipe/mobile están definidas
    App._generateCardHTML_Carousel = App._generateCardHTML_Carousel || function() { return ""; };
    App._generateCardHTML_Mobile = App._generateCardHTML_Mobile || function() { return ""; };
    App._initCarousel_Swipe = App._initCarousel_Swipe || function() { };
    App._initCarousel_Mobile = App._initCarousel_Mobile || function() { };
    App._destroyCarousel = App._destroyCarousel || function() { };

    // Helpers de búsqueda (asumidos aquí)
    App._findNodoById = App._findNodoById || function() { return null; };
    App._tieneContenidoActivo = App._tieneContenidoActivo || function() { return true; };

})();