// --- code/render-base.js ---
(function() {

    // Almacena el estado de la última comprobación de móvil para el ResizeObserver
    let _lastIsMobile = window.innerWidth <= 768; 

    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL (ROUTER) ⭐️
    App.renderNavegacion = function() {
        if (!this.STATE.fullData) {
            console.error("No se puede renderizar: Datos no cargados.");
            return;
        }

        console.log(`Renderizando nivel: ${this.STATE.navStack.length > 0 ? this.STATE.navStack[this.STATE.navStack.length - 1] : 'Raíz'}`);

        const isSubLevel = this.STATE.navStack.length > 0;
        const isMobile = window.innerWidth <= 768; 

        // CRÍTICO: Definir las funciones de renderizado y control. 
        const renderHtmlFn = isMobile ? App._generateCardHTML_Mobile : App._generateCardHTML_Desktop;
        const initCarouselFn = isMobile ? App._destroyCarousel : App._initCarousel; // Destruimos en móvil

        // --- Configuración de Parámetros ---
        let calculatedItemsPerColumn = isMobile ? 1 : 3; 
        this.STATE.itemsPorColumna = calculatedItemsPerColumn;

        // 🚨 1. SELECCIÓN DINÁMICA DE ELEMENTOS DEL DOM 🚨
        const desktopView = document.getElementById('vista-navegacion-desktop');
        const mobileView = document.getElementById('vista-navegacion-mobile');

        // CRÍTICO: Actualizar la referencia DOM.track y vistaNav en App 
        this.DOM.vistaNav = isMobile ? mobileView : desktopView; 
        this.DOM.track = isMobile ? document.getElementById('track-mobile') : document.getElementById('track-desktop');

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
            console.warn(`Nodo no encontrado para el ID: ${this.STATE.navStack[this.STATE.navStack.length - 1]}. Volviendo a la raíz.`);
            this.STATE.navStack.pop(); 
            this.renderNavegacion();
            return;
        }

        // Si es un subnivel, añadir la tarjeta "Volver" al inicio de la lista móvil
        if (isSubLevel && isMobile) {
             itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
        }

        // 3. Destruir e Inicializar Vistas
        App._destroyCarousel(); // Aseguramos que se destruya antes de renderizar

        // 4. GENERAR HTML DE LAS TARJETAS (delegado a los archivos específicos)
        let htmlContent = renderHtmlFn(itemsDelNivel, this.STATE.itemsPorColumna);

        // 5. INYECTAR Y GESTIONAR VISTAS
        this.DOM.track.innerHTML = htmlContent;

        if (isMobile) {
            desktopView.classList.remove('active');
            mobileView.classList.add('active');
        } else {
            mobileView.classList.remove('active');
            desktopView.classList.add('active');
        }

        // 6. INICIALIZAR EL CARRUSEL (delegado, solo se inicializará si es desktop)
        let initialSlideIndex = 0;
        if (this.STATE.currentFocusIndex >= 0 && !isMobile) {
             // Calcula qué columna contiene la tarjeta enfocada
            initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        }
        initCarouselFn(initialSlideIndex, this.STATE.itemsPorColumna, isMobile);


        // ⭐️ Llamar a los listeners de navegación ⭐️
        if (typeof this.setupTrackClickListener === 'function') {
             this.setupTrackClickListener();
        }
        // Llamar al setup táctil DESPUÉS de initCarousel
        if (typeof this.setupTouchListeners === 'function') {
            this.setupTouchListeners();
        }

        // 7. GESTIÓN DE FOCO INICIAL Y VISTAS LATERALES
        this._updateNavViews(isSubLevel, isMobile);
        this._updateFocus(false); // false = no deslizar

        // 8. Configurar el ResizeObserver la primera vez
        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };


    // ⭐️ 2. FUNCIÓN DE PINTADO DE TARJETA INDIVIDUAL (Común) ⭐️
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null) {

        const wrapperTag = 'article'; // Siempre <article>

        if (esRelleno) {
            // Tarjetas de Relleno 
            return `<article class="card card--relleno" data-tipo="relleno" tabindex="-1"></article>`;
        }

        if (tipoEspecial === 'volver-vertical') {
            return `
                <${wrapperTag} class="card card-volver-vertical" 
                    data-id="volver-nav" 
                    data-tipo="volver-vertical" 
                    role="button" 
                    tabindex="-1">
                    <h3>🔙&#xFE0E;</h3>
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
        const isMobile = window.innerWidth <= 768; 

        // 1. Limpiar focos anteriores
        // ❗️ FIX: Limpiar no solo los slides, sino TODAS las tarjetas dentro del track
        const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
        allCardsInTrack.forEach(card => {
             card.classList.remove('focus-visible');
             card.tabIndex = -1;
        });

        // 2. Obtener la nueva tarjeta REAL (excluyendo rellenos)
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        // Normalizar el índice para el loop
        let normalizedIndex = currentFocusIndex % allCards.length;
        if (normalizedIndex < 0) normalizedIndex += allCards.length;

        const nextFocusedCard = allCards[normalizedIndex];

        // 3. Actualizar el estado con el índice normalizado
        this.STATE.currentFocusIndex = normalizedIndex;


        // 4. Aplicar nuevo foco y mover
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.tabIndex = 0;

            // Mover el foco real del navegador
            if (shouldSlide) {
                nextFocusedCard.focus(); 
            } else {
                nextFocusedCard.focus({ preventScroll: true }); 
            }

            // 5. DELEGAR LA ACCIÓN DE DESLIZAMIENTO/SCROLL
            if (!isMobile && carouselInstance && shouldSlide) {
                // Lógica de DESKOP: Swiper
                const targetSwiperSlide = Math.floor(normalizedIndex / itemsPorColumna); 
                // ❗️ FIX: El índice real de swiper es +1 por el slide de relleno inicial
                carouselInstance.slideToLoop(targetSwiperSlide + 1, 400); 
            } else if (isMobile && shouldSlide) {
                // Lógica de MOBILE: Scroll (solo si shouldSlide es true)
                nextFocusedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };


    // ⭐️ 4. LÓGICA DE CONTROL DEL CARRUSEL (DELEGACIÓN) ⭐️
    // Estas funciones deben ser implementadas en render-desktop.js y render-mobile.js
    App._initCarousel = App._initCarousel || function() { console.error("App._initCarousel no está definido."); };
    App._destroyCarousel = App._destroyCarousel || function() { 
        if (this.STATE.carouselInstance) {
            this.STATE.carouselInstance.destroy(true, true);
            this.STATE.carouselInstance = null;
        }
    };


    // ⭐️ 5. UTILIDADES DE VISTAS LATERALES Y DATOS (Común) ⭐️
    App._updateNavViews = function(isSubLevel, isMobile) {
        // Lógica de visibilidad de cardVolverFija, infoAdicional, btnVolverNav
        if (!isMobile) {
            this.DOM.cardVolverFija.style.display = 'flex';
            this.DOM.infoAdicional.style.display = 'block'; 
            this.DOM.btnVolverNav.style.display = 'none'; 

            if (isSubLevel) {
                this.DOM.cardVolverFija.tabIndex = 0; 
            } else {
                this.DOM.cardVolverFija.tabIndex = -1;
            }
        } else {
            this.DOM.cardVolverFija.style.display = 'none'; 
            this.DOM.infoAdicional.style.display = 'none';

            if (isSubLevel) {
                this.DOM.btnVolverNav.style.display = 'block'; 
            } else {
                this.DOM.btnVolverNav.style.display = 'none';
            }
        }
    };

    App._setupResizeObserver = function() {
        console.log("ResizeObserver configurado.");
        this.STATE.resizeObserver = new ResizeObserver(() => {
            const currentIsMobile = window.innerWidth <= 768;

            if (currentIsMobile !== _lastIsMobile && this.STATE.initialRenderComplete) {
                console.log(`Cambiando de vista: ${currentIsMobile ? 'Móvil' : 'Escritorio'}`);
                _lastIsMobile = currentIsMobile;
                this.renderNavegacion(); 
            }
        });

        this.STATE.resizeObserver.observe(document.body);
    };

    App._findNodoById = function(id, nodos) {
        if (!nodos || !id) return null;
        for (const n of nodos) {
            if (n.id === id) return n;

            if (n.subsecciones && n.subsecciones.length > 0) {
                const encontrado = this._findNodoById(id, n.subsecciones);
                if (encontrado) return encontrado;
            }
            if (n.cursos && n.cursos.length > 0) {
                // Los cursos no tienen más sub-árboles, pero hay que buscarlos
                const cursoEncontrado = n.cursos.find(c => c.id === id);
                if (cursoEncontrado) return cursoEncontrado;
            }
        }
        return null;
    };

    App._tieneContenidoActivo = function(nodoId) {
        const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
        if (!nodo) return false;
        
        // Un curso (nodo final) siempre está "activo"
        if (nodo.titulo) return true; 

        // Una categoría está activa si tiene cursos...
        if (nodo.cursos && nodo.cursos.length > 0) {
            return true;
        }

        // ...o si tiene subsecciones que TENGAN contenido activo
        if (nodo.subsecciones && nodo.subsecciones.length > 0) {
            for (const sub of nodo.subsecciones) {
                // Búsqueda recursiva
                if (this._tieneContenidoActivo(sub.id)) {
                    return true;
                }
            }
        }
        
        // Si no tiene cursos ni subsecciones activas, no está activo
        return false;
    };

})();
