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
            calculatedItemsPerColumn = 3; 
        } else {
            calculatedItemsPerColumn = 1;
        }
        
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
        
        // 3. GENERAR HTML DE LAS TARJETAS (incluyendo relleno si es necesario)
        let htmlContent = this._generateCardHTML(itemsDelNivel, isMobile, this.STATE.itemsPorColumna);

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
            const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
            let initialSlideIndex = 0;
            if (this.STATE.currentFocusIndex >= 0) {
                 // Calcula qué columna contiene la tarjeta enfocada
                initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
            }
            this._initCarousel(initialSlideIndex, this.STATE.itemsPorColumna, isMobile);
        }
        
        // Llamar a setupTrackClickListener después de que DOM.track esté definido
        if (typeof this.setupTrackClickListener === 'function') {
             this.setupTrackClickListener();
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

        // 1. Renderizar tarjetas reales
        for (const nodo of items) {
            if (nodo.tipoEspecial === 'volver-vertical') {
                html += this._generarTarjetaHTML(nodo, true, false, 'volver-vertical', !isMobile);
                continue;
            }
            const estaActivo = this._tieneContenidoActivo(nodo.id);
            html += this._generarTarjetaHTML(nodo, estaActivo, false, null, !isMobile);
        }

        // 2. Relleno (Padding) para Desktop (SOLO SI NO ES MÓVIL)
        if (!isMobile) {
            const totalItems = items.length; 
            const totalSlotsDeseados = Math.ceil(totalItems / itemsPorColumna) * itemsPorColumna; // Multiplo de 3
            const numRellenoDerecho = totalSlotsDeseados - totalItems;
            
            for (let i = 0; i < numRellenoDerecho; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true, null, true); 
            }
            
            // Aplicar reglas de Grid en el track DESKTOP (fijo a 3)
            this.DOM.track.style.gridTemplateRows = `repeat(${itemsPorColumna}, 1fr)`;

        } else {
            // Asegurar que no haya reglas de Grid en línea en móvil
            this.DOM.track.style.gridTemplateRows = '';
        }
        
        return html;
    };


    // ⭐️ 3. FUNCIÓN DE PINTADO DE TARJETA INDIVIDUAL ⭐️
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null, isSwiperSlide = true) {
        
        const wrapperTag = isSwiperSlide ? 'div' : 'article';
        const swiperClass = isSwiperSlide ? 'swiper-slide' : '';

        if (esRelleno) {
            // Tarjetas de Relleno (borde discontinuo en CSS)
            return `<div class="swiper-slide" data-tipo="relleno" tabindex="-1"></div>`;
        }
        
        if (tipoEspecial === 'volver-vertical') {
            return `
                <${wrapperTag} class="${swiperClass} card-volver-vertical" 
                    data-id="volver-nav" 
                    data-tipo="volver-vertical" 
                    role="button" 
                    tabindex="-1">
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
        
        if (isMobile) {
            console.log("Swiper Initialization Skipped: Mobile Mode.");
            return;
        }
        
        const swiperConfig = {
            direction: 'horizontal', 
            // Muestra 3 tarjetas (una columna completa)
            slidesPerView: itemsPorColumna, 
            // Desplaza por grupos de 3 (una columna) en mousewheel y drag
            slidesPerGroup: itemsPorColumna, 
            
            // ⭐️ FIX CILÍNDRICO: Desactivamos la cuadrícula estricta para que el loop funcione.
            grid: false, 
            
            // Deshabilitar centrado para usar slidePerGroup: 3
            centeredSlides: false, 
            mousewheel: { 
                sensitivity: 1 
            }, 
            // Activamos el modo loop para la simulación cilíndrica
            loop: true, 
            initialSlide: initialSwiperSlide,
            keyboard: { enabled: false }, 
            speed: 400,
            freeMode: false,
            scrollbar: false,
            watchSlidesProgress: true,
        };

        this.STATE.carouselInstance = new Swiper(document.getElementById('nav-swiper'), swiperConfig);
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
        const allSlides = Array.from(this.DOM.track.children);
        allSlides.forEach(child => {
            child.classList.remove('focus-visible');
            child.tabIndex = -1; 
        });

        // 2. Obtener la nueva tarjeta REAL (excluyendo rellenos)
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;
        
        // Normalizar el índice para el loop (si se navega más allá del final/inicio)
        let normalizedIndex = currentFocusIndex % allCards.length;
        if (normalizedIndex < 0) normalizedIndex += allCards.length;
        
        const nextFocusedCard = allCards[normalizedIndex];
        
        // 3. Actualizar el estado con el índice normalizado
        this.STATE.currentFocusIndex = normalizedIndex;


        // 4. Aplicar nuevo foco
        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.tabIndex = 0;
            
            // Mover el foco real del navegador
            if (shouldSlide) {
                nextFocusedCard.focus(); 
            } else {
                nextFocusedCard.focus({ preventScroll: true }); 
            }

            // 5. Mover el Swiper (solo en desktop)
            const isSwiper = carouselInstance && !isMobile;
            if (isSwiper && shouldSlide) {
                // targetSwiperSlide calcula el índice de columna (0, 1, 2, ...)
                const targetSwiperSlide = Math.floor(normalizedIndex / itemsPorColumna); 
                // Mueve el carrusel a la columna que contiene la tarjeta enfocada
                carouselInstance.slideToLoop(targetSwiperSlide, 400); 
            }
            
            // 6. Asegurar visibilidad (scroll) en móvil
            if (isMobile) {
                nextFocusedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };


    // ⭐️ 6. UTILIDADES DE VISTAS LATERALES ⭐️
    App._updateNavViews = function(isSubLevel, isMobile) {
        // Gestión de la Tarjeta 'Volver' Fija (Desktop) y Área de Información Adicional
        if (!isMobile) {
            // FIX: La tarjeta Volver Fija e Info Adicional SIEMPRE deben ser visibles en desktop
            this.DOM.cardVolverFija.style.display = 'flex';
            this.DOM.infoAdicional.style.display = 'block'; // Usamos 'block' para respetar el grid
            this.DOM.btnVolverNav.style.display = 'none'; 
            
            if (isSubLevel) {
                // Activar tarjeta "Volver" (Borde continuo azul)
                this.DOM.cardVolverFija.tabIndex = 0; 
            } else {
                // Desactivar tarjeta "Volver" (Borde discontinuo gris)
                this.DOM.cardVolverFija.tabIndex = -1;
            }
        } else {
            // Lógica móvil (card fija invisible, info adicional invisible)
            this.DOM.cardVolverFija.style.display = 'none'; 
            this.DOM.infoAdicional.style.display = 'none';
            
            if (isSubLevel) {
                this.DOM.btnVolverNav.style.display = 'block'; 
            } else {
                this.DOM.btnVolverNav.style.display = 'none';
            }
        }
    };

    // ⭐️ 7. GESTIÓN DE EVENTOS DE REDIMENSIONAMIENTO ⭐️
    App._setupResizeObserver = function() {
        console.log("ResizeObserver configurado.");
        this.STATE.resizeObserver = new ResizeObserver(() => {
            const currentIsMobile = window.innerWidth <= 768;
            
            if (currentIsMobile !== _lastIsMobile && this.STATE.initialRenderComplete) {
                console.log(`Cambiando de vista: ${currentIsMobile ? 'Móvil' : 'Escritorio'}`);
                logDebug(`Layout cambiado a ${currentIsMobile ? 'Móvil' : 'Escritorio'}. Re-renderizando.`);
                _lastIsMobile = currentIsMobile;
                this.renderNavegacion(); 
            }
        });

        this.STATE.resizeObserver.observe(document.body);
    };

    // --- HELPERS DE DATOS (Mantenidos) ---
    
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
        
        const hasSubsecciones = nodo.subsecciones && nodo.subsecciones.length > 0;
        const hasCursos = nodo.cursos && nodo.cursos.length > 0;
        
        if (hasSubsecciones) {
            for (const sub of nodo.subsecciones) {
                if (this._tieneContenidoActivo(sub.id)) {
                    return true;
                }
            }
        }
        
        return hasCursos;
    };
    
})();