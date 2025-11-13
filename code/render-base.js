// --- code/render-base.js ---
(function() {

    // Almacena el modo actual (móvil, tablet, escritorio)
    let _lastMode = 'desktop'; 

    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL (ROUTER) ⭐️
    App.renderNavegacion = function() {
        if (!this.STATE.fullData) {
            console.error("No se puede renderizar: Datos no cargados.");
            return;
        }

        const isSubLevel = this.STATE.navStack.length > 0;

        // ⭐️ 1. DEFINIR LOS 3 MODOS ⭐️
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;
        const isTablet = screenWidth > 600 && screenWidth <= 768;
        const isDesktop = screenWidth > 768;

        // ⭐️ 2. ELEGIR LAS FUNCIONES Y VARIABLES ⭐️
        let renderHtmlFn;
        let initCarouselFn;
        let calculatedItemsPerColumn;
        let swiperId = null;
        
        // Actualizar el modo actual para el ResizeObserver
        if (isMobile) _lastMode = 'mobile';
        else if (isTablet) _lastMode = 'tablet';
        else _lastMode = 'desktop';


        if (isMobile) {
            renderHtmlFn = App._generateCardHTML_Mobile;
            initCarouselFn = App._initCarousel_Mobile; // Apunta a la función móvil
            calculatedItemsPerColumn = 1;
            
        } else {
            // Tablet y Desktop USAN EL MISMO MOTOR
            renderHtmlFn = App._generateCardHTML_Carousel;
            initCarouselFn = App._initCarousel_Swipe; // Apunta a la función del carrusel
            
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
        const nodoActual = this._findNodoById(this.STATE.navStack[this.STATE.navStack.length - 1], this.STATE.fullData.navegacion);
        let itemsDelNivel = [];

        if (!isSubLevel) {
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else if (nodoActual) {
            const subsecciones = nodoActual.subsecciones || [];
            const cursos = nodoActual.cursos || [];
            itemsDelNivel = subsecciones.concat(cursos);
        } else {
            console.warn(`Nodo no encontrado. Volviendo a la raíz.`);
            this.STATE.navStack.pop(); 
            this.renderNavegacion();
            return;
        }
        if (isSubLevel && isMobile) {
            itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
        }

        // ⭐️ 5. GESTIÓN DE VISTAS (FLUJO "ANTI-PARPADEO") ⭐️

        // 1. Destruir carrusel antiguo (no afecta a lo visual)
        App._destroyCarousel(); 

        // 2. Generar el HTML
        let htmlContent = renderHtmlFn(itemsDelNivel, this.STATE.itemsPorColumna);

        // 3. Inyectar HTML en la vista de destino (aún oculta)
        this.DOM.track.innerHTML = htmlContent;

        // 4. INICIALIZAR EL CARRUSEL (sobre la vista oculta)
        let initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        initCarouselFn(initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId);

        // 5. LISTENERS Y FOCO INICIAL (sobre la vista oculta)
        if (typeof this.setupTrackClickListener === 'function') {
            this.setupTrackClickListener();
        }
        if (typeof this.setupTouchListeners === 'function') {
            this.setupTouchListeners();
        }
        this._updateNavViews(isSubLevel, isMobile || isTablet); 
        this._updateFocus(false); // Foco inicial sin scroll

        // 6. ⭐️ EL "SWAP" ⭐️
        // Ocultamos las otras vistas y mostramos la nueva en un solo paso.
        desktopView.classList.remove('active');
        tabletView.classList.remove('active');
        mobileView.classList.remove('active');
        
        this.DOM.vistaNav.classList.add('active'); // ¡Mostrar!


        // 7. RESIZE OBSERVER
        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };


    // ⭐️ 2. FUNCIÓN DE PINTADO DE TARJETA INDIVIDUAL (Común) ⭐️
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null) {

        const wrapperTag = 'article';

        if (esRelleno) {
            return `<article class="card card--relleno" data-tipo="relleno" tabindex="-1"></article>`;
        }

        if (tipoEspecial === 'volver-vertical') {
            return `
                <${wrapperTag} class="card card-volver-vertical" 
                    data-id="volver-nav" 
                    data-tipo="volver-vertical" 
                    role="button" 
                    tabindex="-1">
                    <h3>↩️&#xFE0E;</h3>
                </${wrapperTag}>
            `;
        }

        const isCourse = !!nodo.titulo;
        const tipoData = isCourse ? 'data-tipo="curso"' : 'data-tipo="categoria"';
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAria = estaActivo ? '' : 'aria-disabled="true"';
        const tabindex = '-1'; 
        let hint = '';
        if (!estaActivo) hint = '<span>🚧</span>';
        const displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';

        return `
            <${wrapperTag} class="card ${claseDisabled}" 
                data-id="${nodo.id}" 
                ${tipoData}
                role="button" 
                tabindex="${tabindex}" 
                ${tagAria}>
                <h3>${displayTitle}</h3>
                ${hint}
            </${wrapperTag}>
        `;
    };


    // ⭐️ 3. LÓGICA DE FOCO Y NAVEGACIÓN (Unificado) ⭐️
    App._updateFocus = function(shouldSlide = true) {
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;

        // 1. Limpiar focos anteriores
        const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
        allCardsInTrack.forEach(card => {
            card.classList.remove('focus-visible');
            card.tabIndex = -1;
        });
        // Limpiar el foco visual de la tarjeta "Volver"
        if (App.DOM.cardVolverFija) {
            App.DOM.cardVolverFija.classList.remove('focus-visible');
        }

        // 2. Obtener la nueva tarjeta REAL (excluyendo rellenos)
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        // 3. Normalizar el índice para el loop y los límites
        let normalizedIndex = currentFocusIndex;
        if (normalizedIndex < 0) normalizedIndex = 0;
        if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
        
        const nextFocusedCard = allCards[normalizedIndex];
        
        // Sincronizar estado con el índice normalizado
        this.STATE.currentFocusIndex = normalizedIndex;

        // 4. Aplicar nuevo foco y mover
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.tabIndex = 0;

            if (shouldSlide) {
                nextFocusedCard.focus(); 
            } else {
                nextFocusedCard.focus({ preventScroll: true }); 
            }

            // 5. DELEGAR LA ACCIÓN DE DESLIZAMIENTO/SCROLL
            if (!isMobile && carouselInstance && shouldSlide) {
                const targetSwiperSlide = Math.floor(normalizedIndex / itemsPorColumna); 
                carouselInstance.slideToLoop(targetSwiperSlide + 1, 400); 
            } else if (isMobile && shouldSlide) {
                nextFocusedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };


    // ⭐️ 4. LÓGICA DE CONTROL DEL CARRUSEL (Stubs/Fallbacks) ⭐️
    // Estas funciones serán sobreescritas por render-swipe.js y render-mobile.js
    App._generateCardHTML_Carousel = App._generateCardHTML_Carousel || function() { console.error("render-swipe.js no cargado"); return ""; };
    App._generateCardHTML_Mobile = App._generateCardHTML_Mobile || function() { console.error("render-mobile.js no cargado"); return ""; };
    App._initCarousel_Swipe = App._initCarousel_Swipe || function() { console.error("render-swipe.js no cargado"); };
    App._initCarousel_Mobile = App._initCarousel_Mobile || function() { console.error("render-mobile.js no cargado"); };
    App._destroyCarousel = App._destroyCarousel || function() { /* El destructor real está en render-swipe.js */ };


    // ⭐️ 5. UTILIDADES DE VISTAS LATERALES Y DATOS (Común) ⭐️
    App._updateNavViews = function(isSubLevel, isMobileOrTablet) {
        
        if (!isMobileOrTablet) { // Solo desktop
            this.DOM.cardVolverFija.style.display = 'flex';
            this.DOM.infoAdicional.style.display = 'block'; 
            this.DOM.btnVolverNav.style.display = 'none'; 
            if (isSubLevel) {
                this.DOM.cardVolverFija.tabIndex = 0; 
            } else {
                this.DOM.cardVolverFija.tabIndex = -1;
            }
        } else { // Móvil O Tablet
            this.DOM.cardVolverFija.style.display = 'none'; 
            this.DOM.infoAdicional.style.display = 'none';
            if (isSubLevel) {
                this.DOM.btnVolverNav.style.display = 'block'; 
            } else {
                this.DOM.btnVolverNav.style.display = 'none';
            }
        }
    };

    // ⭐️ 6. RESIZE OBSERVER (Con ajuste de foco) ⭐️
    App._setupResizeObserver = function() {
        console.log("ResizeObserver (3 modos) configurado.");
        
        const getMode = (width) => {
            if (width <= 600) return 'mobile';
            if (width <= 768) return 'tablet';
            return 'desktop';
        };

        _lastMode = getMode(window.innerWidth);

        this.STATE.resizeObserver = new ResizeObserver(() => {
            const newMode = getMode(window.innerWidth);

            if (newMode !== _lastMode && this.STATE.initialRenderComplete) {
                console.log(`Cambiando de vista: ${_lastMode} -> ${newMode}`);
                
                // Lógica de ajuste de foco
                const isSubLevel = this.STATE.navStack.length > 0;
                if (isSubLevel) {
                    const lastWasCarousel = (_lastMode === 'tablet' || _lastMode === 'desktop');
                    const newIsMobile = (newMode === 'mobile');
                    
                    if (lastWasCarousel && newIsMobile) {
                        // De Desktop/Tablet -> Móvil: Añadimos "Volver", así que +1
                        this.STATE.currentFocusIndex++;
                        console.log("Ajuste de foco: +1 (Volver añadido)");
                    } else if (!lastWasCarousel && !newIsMobile) {
                        // De Móvil -> Desktop/Tablet: Quitamos "Volver", así que -1
                        this.STATE.currentFocusIndex = Math.max(0, this.STATE.currentFocusIndex - 1);
                        console.log("Ajuste de foco: -1 (Volver quitado)");
                    }
                }

                _lastMode = newMode;
                this.renderNavegacion(); 
            }
        });

        this.STATE.resizeObserver.observe(document.body);
    };

    // ⭐️ 7. HELPERS _findNodoById y _tieneContenidoActivo (sin cambios) ⭐️
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