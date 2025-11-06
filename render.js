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
            // Tarjeta 'Volver' solo para móvil, insertada al inicio del carrusel.
            html += this._generarTarjetaHTML({}, false, false, 'volver-vertical'); 
        }

        // ⭐️ 2. Lógica del Relleno Izquierdo (ESCRITORIO) ⭐️
        // El relleno izquierdo es necesario para el centrado del primer elemento en la vista Swiper.
        if (!isMobile) { 
            for (let i = 0; i < itemsPorColumna; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true); // Tarjeta de relleno
            }
        }
        
        // ⭐️ 3. Insertar los elementos del JSON ⭐️
        let elementosVisibles = 0;
        for (const item of itemsDelNivel) {
          // Comprobamos si el elemento tiene contenido (subsecciones o cursos) para habilitarlo
          const estaActivo = this._tieneContenidoActivo(item.id);
          
          html += this._generarTarjetaHTML(item, estaActivo);
          elementosVisibles++;
        }
        
        // ⭐️ 4. Lógica del Relleno Derecho (ESCRITORIO) ⭐️
        if (!isMobile) {
            // Calculamos cuántos elementos de relleno se necesitan para completar las columnas de la derecha
            const totalConRellenoIzquierdo = itemsPorColumna + elementosVisibles;
            const numTotalSlots = Math.ceil(totalConRellenoIzquierdo / itemsPorColumna) * itemsPorColumna;
            const numRellenoDerecho = numTotalSlots - totalConRellenoIzquierdo;
            
            for (let i = 0; i < numRellenoDerecho; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true); 
            }
        }

        this.DOM.track.innerHTML = html;

        // 5. Gestión de Tarjeta "Volver" Fija (Escritorio) y Área de Información Adicional
        if (!isMobile) { 
            // 5a. Mostrar el área de Información Adicional (Siempre visible en desktop)
            // (Aseguramos que el CSS no lo oculte si es desktop)
            this.DOM.infoAdicional.style.display = 'flex'; 
            
            // 5b. Gestión de la Tarjeta Volver Fija (Columna 1/5)
            if (isSubLevel) {
                // Si estamos en un subnivel, la activamos y mostramos
                this.DOM.cardVolverFija.style.display = 'flex'; 
                this.DOM.cardVolverFija.classList.add('active-volver'); 
                this.DOM.cardVolverFija.tabIndex = 0; 
            } else {
                // Si estamos en la raíz, la ocultamos y desactivamos
                this.DOM.cardVolverFija.style.display = 'none'; 
                this.DOM.cardVolverFija.classList.remove('active-volver');
                this.DOM.cardVolverFija.tabIndex = -1;
            }
            // Ocultamos el botón Volver simple (el que está fuera de flujo)
            this.DOM.btnVolverNav.style.display = 'none'; 
        } else {
            // En móvil, aseguramos que el botón Volver fijo y el área de info adicional estén ocultos
            this.DOM.cardVolverFija.style.display = 'none'; 
            this.DOM.infoAdicional.style.display = 'none';
        }


        // 6. Lógica de Foco Inicial y Carousel
        const allSlides = this.DOM.track.children;
        
        // Definir el índice inicial de foco
        let firstEnabledIndex = 0;
        if (!isMobile) {
            // En escritorio, el primer elemento seleccionable es después del relleno izquierdo (índice 3)
            firstEnabledIndex = itemsPorColumna; 
        }
        
        // Recalculamos el número de columnas para Swiper
        const numColumnas = Math.ceil(allSlides.length / itemsPorColumna);

        // Inicializamos Swiper con la configuración correcta (vertical/horizontal)
        this._initCarousel(0, numColumnas, isMobile);
        
        this.STATE.currentFocusIndex = firstEnabledIndex;
        this._updateFocus(false); // Establecer el foco sin animación de slide
        
        // En escritorio, forzar que el Swiper se desplace a la primera columna real
        if (!isMobile && this.STATE.carouselInstance) {
             const targetSwiperSlide = Math.floor(firstEnabledIndex / itemsPorColumna);
             this.STATE.carouselInstance.slideTo(targetSwiperSlide, 0); 
        }
    };

    // --- 2. GESTIÓN DE RESIZE Y RESPONSIVIDAD ---
    
    /**
     * Configura el ResizeObserver para detectar cambios de tamaño de ventana.
     * Es clave para la transición entre móvil y escritorio.
     */
    App._setupResizeObserver = function() {
        console.log("ResizeObserver configurado.");
        this.STATE.resizeObserver = new ResizeObserver(entries => {
            // Solo nos interesa el cambio de tamaño del viewport (el body)
            for (let entry of entries) {
                if (entry.target === document.body) {
                    this._handleResize(entry.contentRect.width);
                }
            }
        });

        this.STATE.resizeObserver.observe(document.body);
        // Llamada inicial para establecer el layout
        this._handleResize(window.innerWidth);
    };

    /**
     * Maneja el evento de redimensionamiento para forzar un re-render si cruza el breakpoint.
     */
    App._handleResize = function(newWidth) {
        const currentIsMobile = newWidth <= 768;
        
        // Si el estado de responsividad cambió (de móvil a escritorio o viceversa)
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
            
            // ⭐️ CORRECCIÓN 1: 
            // Cambiamos '1' por 'auto'. 
            // 'auto' respeta el 'width: clamp(...)' de nuestro CSS.
            slidesPerView: isMobile ? 'auto' : 'auto', 
            
            // ⭐️ CORRECCIÓN 2: 
            // Eliminamos el parámetro 'grid' para desktop.
            // Nuestro CSS en .swiper-wrapper ya gestiona el grid de 3 filas.
            // Dejar esto aquí causa el bug de 'width: 650px'.
            grid: isMobile ? {} : false, // Deshabilitado para desktop

            centeredSlides: !isMobile, 
            mousewheel: { sensitivity: 1 }, 
            loop: !isMobile && numColumnas > 3, 
            initialSlide: initialSwiperSlide,
            keyboard: { enabled: false }, 
            speed: 400,
            
            // Permitir desplazamiento vertical/scroll en móvil 
            freeMode: isMobile ? { enabled: true, sticky: false } : false,
            scrollbar: isMobile ? { el: '.swiper-scrollbar', draggable: true } : false,
            
            watchSlidesProgress: true, // Necesario para algunas animaciones
        };

        this.STATE.carouselInstance = new Swiper(this.DOM.swiperContainer, swiperConfig);
    };

    App._destroyCarousel = function() {
        if (this.STATE.carouselInstance) {
            this.STATE.carouselInstance.destroy(true, true);
            this.STATE.carouselInstance = null;
        }
    };

    App._updateFocus = function(shouldSlide = true) {
        const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
        const isMobile = window.innerWidth <= 768;

        // Quitar el foco anterior
        Array.from(this.DOM.track.children).forEach(child => {
          child.classList.remove('focus-visible');
        });

        const targetSlide = this.DOM.track.children[currentFocusIndex];
        if (targetSlide) {
          targetSlide.classList.add('focus-visible');

          if (carouselInstance && shouldSlide && !isMobile) {
            // Calcular el slide (columna) al que mover
            const targetSwiperSlide = Math.floor(currentFocusIndex / itemsPorColumna);
            carouselInstance.slideTo(targetSwiperSlide, 400); 
          }
          
          // Asegurar que el elemento esté visible, especialmente en móvil (scrollIntoView)
          if (isMobile || !shouldSlide) {
             // Usamos 'nearest' para evitar saltos bruscos si ya está parcialmente visible
             targetSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
    };

    // ⭐️ 4. HELPERS DE DATOS ⭐️
    
    App._findNodoById = function(id, nodos) {
        if (!nodos) return null;
        for (const n of nodos) {
          if (n.id === id) return n;
          
          // Buscar en subsecciones
          if (n.subsecciones && n.subsecciones.length > 0) {
            const encontrado = this._findNodoById(id, n.subsecciones);
            if (encontrado) return encontrado;
          }
          // Buscar en cursos (si el nodo es un contenedor y tiene cursos)
          if (n.cursos && n.cursos.length > 0) {
            // Un curso también es un "nodo" que se puede encontrar por ID
            const cursoEncontrado = n.cursos.find(c => c.id === id);
            if (cursoEncontrado) return cursoEncontrado;
          }
        }
        return null;
    };
      
    App._tieneContenidoActivo = function(nodoId) {
        const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
        if (!nodo) return false;
        
        // Si es un curso (tiene 'titulo'), está activo por definición.
        if (nodo.titulo) return true; 
        
        // Si es una categoría/sección, comprobamos si tiene contenido.
        const hasSubsecciones = nodo.subsecciones && nodo.subsecciones.length > 0;
        const hasCursos = nodo.cursos && nodo.cursos.length > 0;
        
        return hasSubsecciones || hasCursos; // Es activo si tiene CUALQUIERA de los dos.
    };
    
    // ⭐️ 5. GENERADOR DE HTML ⭐️

    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null) {
        if (esRelleno) {
          return `<div class="swiper-slide disabled" data-tipo="relleno" tabindex="-1"></div>`;
        }
        
        if (tipoEspecial === 'volver-vertical') {
          return `
              <div class="swiper-slide card-volver-vertical active-volver" 
                   data-id="volver-nav" 
                   data-tipo="volver-vertical" 
                   role="button" 
                   tabindex="0">
                  <h3>← Volver al menú anterior</h3>
              </div>
          `;
        }
        
        const isCourse = !!nodo.titulo;
        const tipoData = isCourse ? 'data-tipo="curso"' : 'data-tipo="categoria"';
        
        // Si tiene la bandera estaActivo en false, es una tarjeta deshabilitada
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAria = estaActivo ? '' : 'aria-disabled="true"';
        const tabindex = estaActivo ? '0' : '-1';
        
        let hint = '';
        if (!estaActivo) hint = '<span>(Próximamente)</span>';
  
        const displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';

        return `
          <div class="swiper-slide ${claseDisabled}" 
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