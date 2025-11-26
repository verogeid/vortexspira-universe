// --- code/render-base.js ---

(function() {

    let _lastMode = 'desktop'; 

    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL ⭐️
    App.renderNavegacion = function() {
        log('render_base', DEBUG_LEVELS.BASIC, "Iniciando renderNavegacion...");
        
        if (!this.STATE.fullData) {
            logError('render_base', "No se puede renderizar: Datos no cargados.");
            return;
        }

        const currentLevelState = App.stackGetCurrent();
        if (!currentLevelState) return;

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
            log('render_base', DEBUG_LEVELS.DEEP, 'Modo Móvil. Track activo:', this.DOM.track.id); // <-- LÍNEA DE DEPURACIÓN
            
        } else {
            renderHtmlFn = App._generateCardHTML_Carousel;
            initCarouselFn = App._initCarousel_Swipe; 
            
            if (isTablet) {
                // ... (lógica de asignación de tablet sin cambios) ...
                calculatedItemsPerColumn = 2; 
                swiperId = '#nav-swiper-tablet';

                this.DOM.vistaNav = tabletView;
                this.DOM.vistaDetalle = document.getElementById('vista-detalle-desktop'); 
                this.DOM.detalleContenido = document.getElementById('detalle-contenido-desktop');
                this.DOM.track = document.getElementById('track-tablet'); 
            } else {
                // ... (lógica de asignación de desktop sin cambios) ...
                calculatedItemsPerColumn = 3; 
                swiperId = '#nav-swiper';

                this.DOM.vistaNav = desktopView;
                this.DOM.vistaDetalle = document.getElementById('vista-detalle-desktop'); 
                this.DOM.detalleContenido = document.getElementById('detalle-contenido-desktop');
                this.DOM.track = document.getElementById('track-desktop'); 
            }
        }
        this.STATE.itemsPorColumna = calculatedItemsPerColumn;
        
        // -------------------------------------------------------------
        // ⭐️ Obtención de Datos y Renderizado ⭐️
        // -------------------------------------------------------------

        const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion);
        let itemsDelNivel = [];

        // ... (lógica de obtención de datos sin cambios) ...
        if (!isSubLevel) {
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else if (nodoActual) {
            itemsDelNivel = (nodoActual.subsecciones || []).concat(nodoActual.cursos || []);
        } else { 
            App.stackPop(); 
            this.renderNavegacion();
            return;
        }
        
        // Inyección de tarjetas para MÓVIL
        if (isMobile) {
            // ... (lógica de inyección de breadcrumb y volver móvil sin cambios) ...
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
            log('render_base', DEBUG_LEVELS.DEEP, 'Llamando a setupTrackPointerListeners.'); // <-- LÍNEA DE DEPURACIÓN
            this.setupTrackPointerListeners();
        }
        
        this._updateNavViews(isSubLevel, isMobile, isTablet, nodoActual); 
        
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
            } else if (isTablet) {
                tabletView.classList.add('active');
            } else { 
                desktopView.classList.add('active');
            }
        }
        log('render_base', DEBUG_LEVELS.BASIC, 'Renderizado completado.');
        
        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };

    /**
     * ⭐️ FUNCIÓN CENTRAL DE GENERACIÓN DE TARJETA HTML ⭐️
     * (Contiene la corrección de onclick y tabindex="0" en móvil)
     */
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecialArg = null) {
        const wrapperTag = 'article';
        const tipoEspecial = tipoEspecialArg || nodo.tipoEspecial;

        const onclickHandler = `onclick="App._handleTrackClick(event)"`; 

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
        // ⭐️ CORRECCIÓN: Forzar tabindex="0" en modo móvil para asegurar la respuesta de TAP. ⭐️
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

    App._updateFocus = function(shouldSlide = true) {
        // ... (lógica de actualización de foco sin cambios, solo se mantiene el log en nav-base) ...
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

    App._generateCardHTML_Carousel = App._generateCardHTML_Carousel || function() { return ""; };
    App._generateCardHTML_Mobile = App._generateCardHTML_Mobile || function() { return ""; };
    App._initCarousel_Swipe = App._initCarousel_Swipe || function() { };
    App._initCarousel_Mobile = App._initCarousel_Mobile || function() { };
    App._destroyCarousel = App._destroyCarousel || function() { };

    App._updateNavViews = function(isSubLevel, isMobile, isTablet, nodoActual) {
        // ... (lógica de actualización de vistas sin cambios) ...
        
        if (isMobile) { 
            this.DOM.cardVolverFija.classList.remove('visible'); 
            this.DOM.infoAdicional.classList.remove('visible'); 
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
        } else { 
            // Tablet y Desktop
            
            if (isTablet) {
                this.DOM.infoAdicional.classList.remove('visible');
            } else {
                this.DOM.infoAdicional.classList.add('visible'); 
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

    App._setupResizeObserver = function() {
        // ... (lógica de ResizeObserver sin cambios) ...
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

    App._findNodoById = function(id, nodos) {
        // ... (helper sin cambios) ...
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
        // ... (helper sin cambios) ...
        const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
        if (!nodo) return false;
        if (nodo.titulo) return true; 
        if (nodo.cursos && nodo.cursos.length > 0) return true;
        if (nodo.subsecciones && nodo.subsecciones.length > 0) {
            for (const sub of nodo.subsecciones) {
                if (this._tieneContenidoActivo(sub.id)) return true;
            }
        }
        return false;
    };

})();