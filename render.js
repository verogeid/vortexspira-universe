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

        // 🚨 1. SELECCIÓN DINÁMICA DE ELEMENTOS DEL DOM 🚨
        const desktopView = document.getElementById('vista-navegacion-desktop');
        const mobileView = document.getElementById('vista-navegacion-mobile');
        const desktopTrack = document.getElementById('track-desktop');
        const mobileTrack = document.getElementById('track-mobile');
        
        const targetTrack = isMobile ? mobileTrack : desktopTrack;
        
        // ⭐️ CRÍTICO: Actualizar la referencia DOM.track y vistaNav en App ⭐️
        this.DOM.track = targetTrack;
        this.DOM.vistaNav = isMobile ? mobileView : desktopView; 
        
        // 2. Control de Vistas (Mostrar / Ocultar)
        if (isMobile) {
            desktopView.classList.remove('active');
            mobileView.classList.add('active');
        } else {
            mobileView.classList.remove('active');
            desktopView.classList.add('active');
        }

        this.STATE.itemsPorColumna = calculatedItemsPerColumn;
        
        // 🚨 OBTENER VALOR: Usamos const para evitar conflictos de ámbito 🚨
        const { itemsPorColumna } = this.STATE;
        
        // 4. Obtener los ítems del nivel
        let itemsDelNivel = [];
        if (!isSubLevel) {
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else {
            const currentLevelId = this.STATE.navStack[this.STATE.navStack.length - 1];
            const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion);

            if (nodoActual) {
                const subsecciones = nodoActual.subsecciones || [];
                const cursos = nodoActual.cursos || [];
                itemsDelNivel = subsecciones.concat(cursos);
            } else {
                console.warn(`Nodo no encontrado para el ID: ${currentLevelId}. Volviendo a la raíz.`);
                this.STATE.navStack.pop(); 
                this.renderNavegacion();
                return;
            }
        }
        
        // 5. Generación de HTML
        targetTrack.innerHTML = '';
        let html = '';
        const isSwiperSlide = !isMobile;
        
        // 5.1. Tarjeta 'Volver' en Móvil
        if (isSubLevel && isMobile) {
            html += this._generarTarjetaHTML({}, false, false, 'volver-vertical', false); 
        }

        // 5.2. Insertar los elementos del JSON
        for (const item of itemsDelNivel) {
            const estaActivo = this._tieneContenidoActivo(item.id);
            html += this._generarTarjetaHTML(item, estaActivo, false, null, isSwiperSlide);
        }
        
        // 5.3. Lógica del Relleno Derecho (SOLO DESKTOP)
        if (!isMobile) {
            const totalItems = itemsDelNivel.length; 
            const totalSlotsDeseados = 9; 

            // Calculamos el número exacto de rellenos para llegar a 9
            const numRellenoDerecho = totalSlotsDeseados - totalItems;
            
            for (let i = 0; i < numRellenoDerecho; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true, null, true); 
            }
            
            // Aplicar reglas de Grid en el track DESKTOP (fijo a 3)
            targetTrack.style.gridTemplateRows = `repeat(${itemsPorColumna}, 1fr)`;

        } else {
            // Asegurar que no haya reglas de Grid en línea en móvil
            targetTrack.style.gridTemplateRows = '';
        }

        targetTrack.innerHTML = html;


        // 6. Gestión de Tarjeta "Volver" Fija (Escritorio) y Área de Información Adicional
        if (!isMobile) { 
            this.DOM.infoAdicional.style.display = 'flex'; 
            
            if (isSubLevel) {
                this.DOM.cardVolverFija.style.display = 'flex'; 
                this.DOM.cardVolverFija.tabIndex = 0; 
            } else {
                this.DOM.cardVolverFija.style.display = 'none'; 
                this.DOM.cardVolverFija.tabIndex = -1;
            }
            this.DOM.btnVolverNav.style.display = 'none'; 
        } else {
            this.DOM.cardVolverFija.style.display = 'none'; 
            this.DOM.infoAdicional.style.display = 'none';
            
            if (isSubLevel) {
                this.DOM.btnVolverNav.style.display = 'block'; 
            } else {
                this.DOM.btnVolverNav.style.display = 'none';
            }
        }

        // FIX: Llamar a setupTrackClickListener después de que DOM.track esté definido
        if (typeof this.setupTrackClickListener === 'function') {
             this.setupTrackClickListener();
        }

        // 7. Lógica de Foco Inicial y Carousel
        const allSlides = this.DOM.track.children;
        
        let firstEnabledIndex = 0;
        
        if (isMobile && isSubLevel) {
             // El primer elemento es la tarjeta Volver vertical
             firstEnabledIndex = 0;
        }

        if (allSlides[firstEnabledIndex]) {
            allSlides[firstEnabledIndex].tabIndex = 0;
        }
        
        const numColumnas = Math.ceil(allSlides.length / itemsPorColumna);

        // Inicializar Swiper solo si es Desktop
        this._initCarousel(0, numColumnas, isMobile);
        
        this.STATE.currentFocusIndex = firstEnabledIndex;
        this._updateFocus(false);
        
        if (!isMobile && this.STATE.carouselInstance) {
            this.STATE.carouselInstance.slideToLoop(0, 0); 
        }
    };


    // ----------------------------------------------------------------------------------
    // ⭐️ Funciones de Soporte ⭐️
    // ----------------------------------------------------------------------------------

    // --- GESTIÓN DE RESIZE Y RESPONSIVIDAD ---
    
    App._setupResizeObserver = function() {
        console.log("ResizeObserver configurado.");
        this.STATE.resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === document.body) {
                    this._handleResize(entry.contentRect.width);
                }
            }
        });

        this.STATE.resizeObserver.observe(document.body);
        this._handleResize(window.innerWidth);
    };

    App._handleResize = function(newWidth) {
        const currentIsMobile = newWidth <= 768;
        
        if (currentIsMobile !== _lastIsMobile && this.STATE.initialRenderComplete) {
            console.log(`Cambiando de vista: ${currentIsMobile ? 'Móvil' : 'Escritorio'}`);
            logDebug(`Layout cambiado a ${currentIsMobile ? 'Móvil' : 'Escritorio'}. Re-renderizando.`);
            _lastIsMobile = currentIsMobile;
            this.renderNavegacion(); 
        }
    };

    // --- GESTIÓN DEL CARRUSEL (SWIPER) ---

    App._initCarousel = function(initialSwiperSlide, numColumnas, isMobile) {
        if (this.STATE.carouselInstance) return;
        
        // FIX CRÍTICO: No inicializar Swiper en modo móvil
        if (isMobile) {
            console.log("Swiper Initialization Skipped: Mobile Mode.");
            return;
        }

        const swiperConfig = {
            direction: 'horizontal', 
            slidesPerView: 'auto', 
            grid: false, 
            centeredSlides: true, 
            mousewheel: { sensitivity: 1 }, 
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

    App._destroyCarousel = function() {
        if (this.STATE.carouselInstance) {
            this.STATE.carouselInstance.destroy(true, true);
            this.STATE.carouselInstance = null;
        }
    };

    // _updateFocus: Actualiza el foco dentro del carrusel 
    App._updateFocus = function(shouldSlide = true) {
        // FIX: Desestructurar el STATE aquí
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        const isMobile = window.innerWidth <= 768;
        const allSlides = Array.from(this.DOM.track.children);

        // 1. Quitar el foco anterior y resetear tabIndex
        allSlides.forEach(child => {
            child.classList.remove('focus-visible');
            child.tabIndex = -1; 
        });

        // 2. Obtener y preparar la nueva tarjeta activa
        const targetSlide = allSlides[currentFocusIndex];
        if (targetSlide) {
            targetSlide.classList.add('focus-visible');
            targetSlide.tabIndex = 0; 

            // 3. Mover el foco real del navegador
            if (shouldSlide) {
                targetSlide.focus(); 
            } else {
                targetSlide.focus({ preventScroll: true }); 
            }

            // 4. Mover el Swiper (solo en desktop)
            const isSwiper = carouselInstance && !isMobile;
            if (isSwiper && shouldSlide) {
                const targetSwiperSlide = Math.floor(currentFocusIndex / itemsPorColumna);
                carouselInstance.slideToLoop(targetSwiperSlide, 400); 
            }
            
            // 5. Asegurar visibilidad (scroll) en móvil
            if (isMobile) {
                targetSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };

    // --- HELPERS DE DATOS (Mantenidos) ---
    
    App._findNodoById = function(id, nodos) {
        if (!nodos) return null;
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
    
    // ⭐️ GENERADOR DE HTML (Adaptado para mobile/desktop) ⭐️

    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null, isSwiperSlide = true) {
        
        const wrapperTag = isSwiperSlide ? 'div' : 'article';
        const swiperClass = isSwiperSlide ? 'swiper-slide' : '';

        if (esRelleno) {
            return `<div class="swiper-slide disabled" data-tipo="relleno" tabindex="-1"></div>`;
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
        
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAria = estaActivo ? '' : 'aria-disabled="true"';
        
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

})();