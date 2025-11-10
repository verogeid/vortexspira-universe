// --- render.js ---

(function() {

    // Almacena el estado de la última comprobación de móvil para el ResizeObserver
    let _lastIsMobile = window.innerWidth <= 768; 

    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL ⭐️
    App.renderNavegacion = function() {
        if (!this.STATE.fullData) {
            console.error("No se puede renderizar: Datos no cargados.");
            return;
        }

        console.log(`Renderizando nivel: ${this.STATE.navStack.length > 0 ? this.STATE.navStack[this.STATE.navStack.length - 1] : 'Raíz'}`);

        // Destruir la instancia anterior de Swiper antes de recrear el HTML
        this._destroyCarousel();
        
        const isSubLevel = this.STATE.navStack.length > 0;
        const isMobile = window.innerWidth <= 768; 
        
        // --- Cálculo de Filas ---
        let calculatedItemsPerColumn = 3; 

        if (!isMobile) {
            // Lógica de Conteo de Columnas (Solo afecta a Desktop)
            calculatedItemsPerColumn = 3; 
        } else {
            calculatedItemsPerColumn = 1;
        }
        
        this.STATE.itemsPorColumna = calculatedItemsPerColumn;

        // 🚨 1. SELECCIÓN DINÁMICA DE ELEMENTOS DEL DOM 🚨
        const desktopView = document.getElementById('vista-navegacion-desktop');
        const mobileView = document.getElementById('vista-navegacion-mobile');
        
        this.DOM.vistaNav = isMobile ? mobileView : desktopView; 
        this.DOM.track = isMobile ? document.getElementById('track-mobile') : document.getElementById('track-desktop');
        
        // 2. OBTENER DATOS ACTUALES
        let currentLevelData = this._getCurrentLevelData();
        
        // Si hay subniveles, la navegación se basa en subsecciones; de lo contrario, en cursos.
        let items = (currentLevelData.subsecciones && currentLevelData.subsecciones.length > 0) 
            ? currentLevelData.subsecciones 
            : currentLevelData.cursos;

        // Si es un subnivel, añadir la tarjeta "Volver" al inicio de la lista móvil
        if (isSubLevel && isMobile) {
            items = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(items);
        }

        // 3. GENERAR HTML DE LAS TARJETAS (incluyendo relleno si es necesario)
        let htmlContent = this._generateCardHTML(items, isMobile, this.STATE.itemsPorColumna);

        // 4. INYECTAR Y GESTIONAR VISTAS
        this.DOM.track.innerHTML = htmlContent;

        if (isMobile) {
            desktopView.classList.remove('active');
            mobileView.classList.add('active');
            this.DOM.btnVolverNav.style.display = isSubLevel ? 'block' : 'none';
        } else {
            mobileView.classList.remove('active');
            desktopView.classList.add('active');

            // 5. INICIALIZAR EL CARRUSEL (Swiper) si no es móvil
            const initialSwiperSlide = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
            this._initCarousel(initialSwiperSlide, this.STATE.itemsPorColumna, isMobile);
        }

        // 6. GESTIÓN DE FOCUS INICIAL Y VISTAS LATERALES
        this._updateNavViews(isSubLevel, isMobile);
        this._updateFocus(false); // No deslizar en la inicialización
        
        // 7. Configurar el ResizeObserver la primera vez
        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };

    // ⭐️ 2. FUNCIÓN DE GENERACIÓN DE HTML ⭐️
    App._generateCardHTML = function(items, isMobile, itemsPorColumna) {
        let html = '';
        const itemsPerCol = isMobile ? 1 : itemsPorColumna;

        // 1. Renderizar tarjetas reales
        for (const nodo of items) {
            // Determina si la tarjeta está activa (tiene contenido o subsecciones)
            const estaActivo = !!nodo.cursos || !!nodo.subsecciones;
            html += this._renderCard(nodo, estaActivo, !isMobile);
        }

        // 2. Relleno (Padding) para Desktop
        if (!isMobile) {
            const numCards = items.length;
            const remainder = numCards % itemsPerCol;
            if (remainder !== 0) {
                const fillCount = itemsPerCol - remainder;
                for (let i = 0; i < fillCount; i++) {
                    // Renderiza tarjetas de relleno pasivas
                    html += this._renderCard({ id: `relleno-${i}` }, false, true, true);
                }
            }
        }
        return html;
    };


    // ⭐️ 3. FUNCIÓN DE PINTADO DE TARJETA INDIVIDUAL ⭐️
    App._renderCard = function(nodo, estaActivo, isSwiperSlide, esRelleno = false) {
        const wrapperTag = isSwiperSlide ? 'div' : 'article';
        const swiperClass = isSwiperSlide ? 'swiper-slide' : '';

        if (esRelleno) {
            // Tarjetas de Relleno (borde discontinuo en CSS)
            return `<div class="swiper-slide" data-tipo="relleno" tabindex="-1"></div>`;
        }
        
        if (nodo.tipoEspecial === 'volver-vertical') {
            return `
                <${wrapperTag} class="${swiperClass} card-volver-vertical" 
                    data-id="volver-nav" 
                    data-tipo="volver-vertical" 
                    role="button" 
                    tabindex="0">
                    <h3>&larr; Volver al menú anterior</h3>
                </${wrapperTag}>
            `;
        }
        
        const isCourse = !!nodo.titulo;
        const tipoData = isCourse ? 'data-tipo="curso"' : 'data-tipo="categoria"';
        
        // La clase 'disabled' se usa para tarjetas que no tienen contenido
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAria = estaActivo ? '' : 'aria-disabled="true"';
        
        // El tabindex será establecido a 0 para el elemento enfocado por _updateFocus
        const tabindex = '-1'; 
        
        let hint = '';
        if (!estaActivo) hint = '<span>(Próximamente)</span>';

        const displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';

        return `
            <${wrapperTag} class="${swiperClass} ${claseDisabled}" 
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


    // ⭐️ 4. LÓGICA DE CONTROL DEL CARRUSEL (SWIPER) ⭐️

    // 4.1. Inicialización de Swiper
    App._initCarousel = function(initialSwiperSlide, itemsPorColumna, isMobile) {
        if (this.STATE.carouselInstance) return;
        
        // FIX CRÍTICO: No inicializar Swiper en modo móvil
        if (isMobile) {
            console.log("Swiper Initialization Skipped: Mobile Mode.");
            return;
        }
        
        // La configuración para desplazamiento por columna de 3 es la clave
        const swiperConfig = {
            direction: 'horizontal', 
            // Muestra 3 tarjetas, que es una columna completa en el layout
            slidesPerView: itemsPorColumna, 
            // Desplaza por grupos de 3 (una columna) en mousewheel y drag
            slidesPerGroup: itemsPorColumna, 
            // Fuerza la disposición de las tarjetas en 3 filas (columnas virtuales)
            grid: {
                rows: itemsPorColumna, 
                fill: 'row'
            },
            // Deshabilitar centrado para usar slidePerGroup: 3
            centeredSlides: false, 
            mousewheel: { 
                sensitivity: 1 // Asegura que el mousewheel se active
            }, 
            loop: true, 
            initialSlide: initialSwiperSlide,
            keyboard: { enabled: false }, 
            speed: 400,
            freeMode: false,
            scrollbar: false,
            watchSlidesProgress: true,
        };

        this.STATE.carouselInstance = new Swiper(document.getElementById('nav-swiper'), swiperConfig);

        // Listener para el evento click de Swiper
        this.STATE.carouselInstance.on('click', (swiper, event) => {
            const slideEl = event.target.closest('.swiper-slide:not(.disabled):not([data-tipo="relleno"])');
            if (slideEl && slideEl.getAttribute('tabindex') !== '-1') {
                const targetId = slideEl.getAttribute('data-id');
                const targetTipo = slideEl.getAttribute('data-tipo');
                this._handleCardClick(targetId, targetTipo);
            }
        });
    };

    // 4.2. Destrucción de Swiper
    App._destroyCarousel = function() {
        if (this.STATE.carouselInstance) {
            this.STATE.carouselInstance.destroy(true, true);
            this.STATE.carouselInstance = null;
        }
    };

    // ⭐️ 5. LÓGICA DE FOCO Y NAVEGACIÓN (Actualización visual) ⭐️
    App._updateFocus = function(shouldSlide = true) {
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        const isMobile = window.innerWidth <= 768; 
        
        // 1. Limpiar focos anteriores
        const previousFocused = document.querySelector('.swiper-slide.focus-visible, .mobile-track article.focus-visible');
        if (previousFocused) {
            previousFocused.classList.remove('focus-visible');
            previousFocused.tabIndex = -1;
        }

        // 2. Obtener la nueva tarjeta
        const cards = Array.from(this.DOM.track.querySelectorAll('div[data-id]:not([data-tipo="relleno"]), article[data-id]:not([data-tipo="relleno"])'));
        if (cards.length === 0) return;
        
        let normalizedIndex = currentFocusIndex % cards.length;
        if (normalizedIndex < 0) normalizedIndex += cards.length;
        
        const nextFocusedCard = cards[normalizedIndex];

        // 3. Aplicar nuevo foco
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.tabIndex = 0;
            // Para accesibilidad en scroll nativo móvil
            if (isMobile) {
                nextFocusedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // 4. Mover el Swiper (solo en desktop)
        const isSwiper = carouselInstance && !isMobile;
        if (isSwiper && shouldSlide) {
            // targetSwiperSlide calcula el índice de columna (0, 1, 2, ...)
            const targetSwiperSlide = Math.floor(normalizedIndex / itemsPorColumna); 
            // Mueve el carrusel a la columna que contiene la tarjeta enfocada
            carouselInstance.slideToLoop(targetSwiperSlide, 400); 
        }
    };


    // ⭐️ 6. UTILIDADES DE VISTAS LATERALES ⭐️
    App._updateNavViews = function(isSubLevel, isMobile) {
        // Gestión de la Tarjeta 'Volver' Fija (Desktop)
        if (!isMobile) {
            if (isSubLevel) {
                this.DOM.cardVolverFija.style.display = 'flex';
                this.DOM.cardVolverFija.tabIndex = 0; // Se vuelve activo/navegable
                this.DOM.infoAdicional.style.display = 'flex'; // La info contextual siempre está
            } else {
                this.DOM.cardVolverFija.style.display = 'none';
                this.DOM.cardVolverFija.tabIndex = -1; // Se vuelve inactivo/no navegable
                this.DOM.infoAdicional.style.display = 'flex'; // La info contextual siempre está
            }
        }
    };

    // ⭐️ 7. GESTIÓN DE EVENTOS DE REDIMENSIONAMIENTO ⭐️
    App._setupResizeObserver = function() {
        this.STATE.resizeObserver = new ResizeObserver(entries => {
            const currentIsMobile = window.innerWidth <= 768;
            if (currentIsMobile !== _lastIsMobile) {
                _lastIsMobile = currentIsMobile;
                console.log(`Modo cambiado: ${currentIsMobile ? 'Móvil' : 'Desktop'}`);
                logDebug(`Modo cambiado: ${currentIsMobile ? 'Móvil' : 'Desktop'}`);
                this.renderNavegacion(); 
            }
        });
        this.STATE.resizeObserver.observe(document.body);
    };

    // ⭐️ 8. FUNCIÓN UTILITARIA (En nav.js se usa this._getCurrentLevelData)
    // Se incluye aquí si no se definió en otro archivo (aunque nav.js lo usa)
    App._getCurrentLevelData = function() {
        let currentData = this.STATE.fullData.navegacion;
        for (const id of this.STATE.navStack) {
            const item = currentData.find(d => d.id === id);
            currentData = item.subsecciones.length > 0 ? item.subsecciones : item.cursos;
        }
        return {
            subsecciones: currentData.filter(d => d.subsecciones),
            cursos: currentData.filter(d => d.titulo)
        };
    };

})();