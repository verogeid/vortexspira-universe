// --- render.js ---

// Asume que 'App', 'Swiper', y las constantes de color ya existen en el scope global.
// Extenderemos el objeto App.

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
        
        let itemsDelNivel = [];
        const { itemsPorColumna } = this.STATE;
        
        const isSubLevel = this.STATE.navStack.length > 0;
        const isMobile = window.innerWidth <= 768; 
        
        // ⭐️ LÓGICA REFACTORIZADA PARA OBTENER itemsDelNivel ⭐️
        if (!isSubLevel) {
            // Nivel Raíz: Usar la navegación completa
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else {
            // Nivel Sub-sección: Buscar el nodo y concatenar subsecciones y cursos
            const currentLevelId = this.STATE.navStack[this.STATE.navStack.length - 1];
            const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion);

            if (nodoActual) {
                // Aseguramos que subsecciones y cursos sean arrays antes de concatenar.
                const subsecciones = nodoActual.subsecciones || [];
                const cursos = nodoActual.cursos || [];
                itemsDelNivel = subsecciones.concat(cursos);
            } else {
                console.warn(`Nodo no encontrado para el ID: ${currentLevelId}. Volviendo a la raíz.`);
                this.STATE.navStack.pop(); // Limpiar el stack para evitar errores futuros
                this.renderNavegacion(); // Volver a renderizar la raíz
                return;
            }
        }
        
        this.DOM.track.innerHTML = '';
        let html = '';
        
        // ⭐️ 1. INSERCIÓN DEL BOTÓN 'VOLVER' EN EL FLUJO VERTICAL (MÓVIL) ⭐️
        if (isSubLevel && isMobile) {
            html += this._generarTarjetaHTML({}, false, false, 'volver-vertical'); 
        }

        // ⭐️ 2. Lógica del Relleno Izquierdo (ESCRITORIO) ⭐️
        if (!isMobile) { 
            for (let i = 0; i < itemsPorColumna; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true); // Tarjeta de relleno
            }
        }
        
        // ⭐️ 3. Insertar los elementos del JSON ⭐️
        let elementosVisibles = 0;
        for (const item of itemsDelNivel) {
            const estaActivo = this._tieneContenidoActivo(item.id);
            
            html += this._generarTarjetaHTML(item, estaActivo);
            elementosVisibles++;
        }
        
        // ⭐️ 4. Lógica del Relleno Derecho (ESCRITORIO) ⭐️
        if (!isMobile) {
            const totalConRellenoIzquierdo = itemsPorColumna + elementosVisibles;
            const minTotalSlots = itemsPorColumna * 3; 
            const slotsNecesarios = Math.ceil(totalConRellenoIzquierdo / itemsPorColumna) * itemsPorColumna;
            const numTotalSlots = Math.max(minTotalSlots, slotsNecesarios);
            const numRellenoDerecho = numTotalSlots - totalConRellenoIzquierdo;
            
            for (let i = 0; i < numRellenoDerecho; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true); 
            }
        }

        this.DOM.track.innerHTML = html;

        // 5. Gestión de Tarjeta "Volver" Fija (Escritorio) y Área de Información Adicional
        if (!isMobile) { 
            this.DOM.infoAdicional.style.display = 'flex'; 
            
            if (isSubLevel) {
                this.DOM.cardVolverFija.style.display = 'flex'; 
                // ⭐️ CAMBIO: La clase .active-volver ya no es necesaria (CSS unificado)
                // this.DOM.cardVolverFija.classList.add('active-volver'); 
                this.DOM.cardVolverFija.tabIndex = 0; 
            } else {
                this.DOM.cardVolverFija.style.display = 'none'; 
                // this.DOM.cardVolverFija.classList.remove('active-volver');
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


        // 6. Lógica de Foco Inicial y Carousel
        const allSlides = this.DOM.track.children;
        
        // Definir el índice inicial de foco
        let firstEnabledIndex = 0;
        if (!isMobile) {
            firstEnabledIndex = itemsPorColumna; 
        } else if (isSubLevel) {
            firstEnabledIndex = 0;
        }
        
        // ⭐️ CAMBIO: Asignar el tabindex="0" inicial
        // Asegurarnos de que el slide inicial sea focuseable
        if (allSlides[firstEnabledIndex]) {
            allSlides[firstEnabledIndex].tabIndex = 0;
        }
        
        // ⭐️ ESTAS LÍNEAS SON CORRECTAS Y SE MANTIENEN ⭐️
        // Recalculamos el número de columnas para Swiper
        const numColumnas = Math.ceil(allSlides.length / itemsPorColumna);

        // Inicializamos Swiper con la configuración correcta (vertical/horizontal)
        this._initCarousel(0, numColumnas, isMobile);
        
        this.STATE.currentFocusIndex = firstEnabledIndex;
        this._updateFocus(false); // Establecer el foco sin animación de slide
        
        if (!isMobile && this.STATE.carouselInstance) {
            const targetSwiperSlide = Math.floor(firstEnabledIndex / itemsPorColumna);
            this.STATE.carouselInstance.slideTo(targetSwiperSlide, 0); 
        }
    };

    // --- 2. GESTIÓN DE RESIZE Y RESPONSIVIDAD ---
    
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

    // --- 3. GESTIÓN DEL CARRUSEL (SWIPER) ---

    App._initCarousel = function(initialSwiperSlide, numColumnas, isMobile) {
        if (this.STATE.carouselInstance) return;
        
        const swiperConfig = {
            direction: isMobile ? 'vertical' : 'horizontal', 
            slidesPerView: isMobile ? 'auto' : 'auto', 
            grid: isMobile ? {} : false,
            centeredSlides: !isMobile, 
            mousewheel: { sensitivity: 1 }, 
            loop: !isMobile && numColumnas > 3, 
            initialSlide: initialSwiperSlide,
            keyboard: { enabled: false }, 
            speed: 400,
            freeMode: isMobile ? { enabled: true, sticky: false } : false,
            scrollbar: isMobile ? { el: '.swiper-scrollbar', draggable: true } : false,
            watchSlidesProgress: true,
        };

        this.STATE.carouselInstance = new Swiper(this.DOM.swiperContainer, swiperConfig);
    };

    App._destroyCarousel = function() {
        if (this.STATE.carouselInstance) {
            this.STATE.carouselInstance.destroy(true, true);
            this.STATE.carouselInstance = null;
        }
    };

    // ⭐️ CAMBIO: Función _updateFocus completamente reescrita para manejar tabindex y .focus()
    App._updateFocus = function(shouldSlide = true) {
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        const isMobile = window.innerWidth <= 768;
        const allSlides = Array.from(this.DOM.track.children);

        // 1. Quitar el foco anterior y resetear tabIndex
        allSlides.forEach(child => {
            child.classList.remove('focus-visible');
            child.tabIndex = -1; // Reseteamos todas a -1
        });

        // 2. Obtener y preparar la nueva tarjeta activa
        const targetSlide = allSlides[currentFocusIndex];
        if (targetSlide) {
            targetSlide.classList.add('focus-visible');
            targetSlide.tabIndex = 0; // Asignamos el 0 solo a la activa

            // 3. Mover el foco real del navegador
            if (shouldSlide) {
                // preventScroll evita un salto brusco, Swiper/scrollIntoView lo manejarán
                targetSlide.focus({ preventScroll: true }); 
            } else {
                // En la carga inicial (shouldSlide=false), mover el foco
                targetSlide.focus();
            }

            // 4. Mover el Swiper (solo en desktop)
            if (carouselInstance && shouldSlide && !isMobile) {
                const targetSwiperSlide = Math.floor(currentFocusIndex / itemsPorColumna);
                carouselInstance.slideTo(targetSwiperSlide, 400); 
            }
            
            // 5. Asegurar visibilidad (scroll) en móvil
            if (isMobile) {
                targetSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };

    // ⭐️ 4. HELPERS DE DATOS ⭐️
    
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
    
    // ⭐️ 5. GENERADOR DE HTML ⭐️

    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null) {
        if (esRelleno) {
            return `<div class="swiper-slide disabled" data-tipo="relleno" tabindex="-1"></div>`;
        }
        
        if (tipoEspecial === 'volver-vertical') {
            return `
                <div class="swiper-slide card-volver-vertical" 
                    data-id="volver-nav" 
                    data-tipo="volver-vertical" 
                    role="button" 
                    tabindex="-1"> <h3>&larr; Volver al menú anterior</h3>
                </div>
            `;
        }
        
        const isCourse = !!nodo.titulo;
        const tipoData = isCourse ? 'data-tipo="curso"' : 'data-tipo="categoria"';
        
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAria = estaActivo ? '' : 'aria-disabled="true"';
        
        // ⭐️ CAMBIO: Todas las tarjetas (incluso activas) empiezan en -1.
        // _updateFocus les dará el 0 cuando estén activas.
        const tabindex = '-1';
        
        let hint = '';
        if (!estaActivo) hint = '<span>(Próximamente)</span>';

        const displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';

        return `
            <div class.swiper-slide ${claseDisabled}" 
                data-id="${nodo.id}" 
                ${tipoData}
                role="button" 
                tabindex="${tabindex}" 
                ${tagAria}>
            <h3>${displayTitle}</h3>
            ${hint}
            </div>
        `;
    };

})();