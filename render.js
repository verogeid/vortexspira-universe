// --- render.js ---

// Asume que 'App', 'Swiper', y las constantes de color ya existen en el scope global.
// Extenderemos el objeto App.

(function() {

    // ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL ⭐️
    App.renderNavegacion = function() {
        if (!this.STATE.fullData) {
            console.error("No se puede renderizar: Datos no cargados.");
            return;
        }

        console.log(`Renderizando nivel: ${this.STATE.navStack.length > 0 ? this.STATE.navStack[this.STATE.navStack.length - 1] : 'Raíz'}`);

        this._destroyCarousel();
        
        let itemsDelNivel = this.STATE.navStack.length === 0 
                           ? this.STATE.fullData.navegacion 
                           : this._findNodoById(this.STATE.navStack[this.STATE.navStack.length - 1], this.STATE.fullData.navegacion).subsecciones.concat(this._findNodoById(this.STATE.navStack[this.STATE.navStack.length - 1], this.STATE.fullData.navegacion).cursos);

        this.DOM.track.innerHTML = '';
        let html = '';
        const { itemsPorColumna } = this.STATE;
        
        const isSubLevel = this.STATE.navStack.length > 0;
        const isMobile = window.innerWidth <= 768; 

        // ⭐️ 1. INSERCIÓN DEL BOTÓN 'VOLVER' EN EL FLUJO VERTICAL (MÓVIL) ⭐️
        if (isSubLevel && isMobile) {
            html += this._generarTarjetaHTML({ nombre: '← Volver al menú anterior' }, true, false, 'volver-vertical');
        }

        // ⭐️ 2. Lógica del Relleno Izquierdo (ESCRITORIO) ⭐️
        // Forzamos la columna de blur solo en escritorio (cuando no es móvil)
        if (!isMobile) { 
            for (let i = 0; i < itemsPorColumna; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true); 
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
            const elementosNecesariosParaColumnaCompleta = Math.ceil(totalConRellenoIzquierdo / itemsPorColumna) * itemsPorColumna;
            const numRellenoDerecho = elementosNecesariosParaColumnaCompleta - totalConRellenoIzquierdo;
            
            for (let i = 0; i < numRellenoDerecho; i++) {
                html += this._generarTarjetaHTML({nombre: ''}, false, true); 
            }
        }

        this.DOM.track.innerHTML = html;

        // 5. Gestión de Tarjeta/Botón "Volver" (Escritorio)
        if (this.DOM.cardVolverFija) {
          if (!isMobile) { 
              if (isSubLevel) {
                  this.DOM.cardVolverFija.classList.add('active-volver'); 
                  this.DOM.cardVolverFija.tabIndex = 0; 
                  this.DOM.cardVolverFija.style.display = 'flex';
                  this.DOM.btnVolverNav.style.display = 'block';
              } else {
                  this.DOM.cardVolverFija.classList.remove('active-volver');
                  this.DOM.cardVolverFija.tabIndex = -1;
                  this.DOM.cardVolverFija.style.display = 'flex'; 
                  this.DOM.btnVolverNav.style.display = 'none';
              }
          } else {
              this.DOM.cardVolverFija.style.display = 'none'; 
          }
        }


        // 6. Lógica de Foco Inicial y Carousel
        const allSlides = this.DOM.track.children;
        
        let firstEnabledIndex = isMobile || isSubLevel ? 0 : itemsPorColumna;
        const initialSwiperSlide = isMobile ? 0 : (isSubLevel ? 0 : 1); 
        const numColumnas = Math.ceil(allSlides.length / itemsPorColumna);

        this._initCarousel(initialSwiperSlide, numColumnas, isMobile);
        
        this.STATE.currentFocusIndex = firstEnabledIndex;
        this._updateFocus(false);
    };

    // --- 2. GESTIÓN DEL CARRUSEL (SWIPER) ---

    App._initCarousel = function(initialSwiperSlide, numColumnas, isMobile) {
        if (this.STATE.carouselInstance) return;
        
        const swiperConfig = {
            direction: isMobile ? 'vertical' : 'horizontal', // Vertical en móvil
            slidesPerView: isMobile ? 'auto' : 1, // 1 slide (columna) en escritorio, 'auto' en móvil (para scroll vertical)
            
            // Si es móvil, deshabilitamos el grid y dejamos que el overflow haga el scroll.
            grid: isMobile ? {} : { 
                rows: this.STATE.itemsPorColumna,
                fill: 'column',
            },

            centeredSlides: !isMobile, // Centrado solo en horizontal (escritorio)
            mousewheel: isMobile ? { sensitivity: 1 } : true, // Habilitar rueda, más sensible en vertical
            grabCursor: true,
            loop: !isMobile && numColumnas > 3, // Loop solo en horizontal y si hay más de 3 columnas
            initialSlide: initialSwiperSlide,
            keyboard: { enabled: false }, // Usamos nuestra propia navegación por flechas
            speed: 400,
            
            // ⭐️ CRÍTICO: Permitir desplazamiento vertical/scroll en móvil ⭐️
            freeMode: isMobile ? { enabled: true, sticky: false } : false,
            scrollbar: isMobile ? { el: '.swiper-scrollbar', draggable: true } : false,
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
        
        Array.from(this.DOM.track.children).forEach(child => {
          child.classList.remove('focus-visible');
        });

        const targetSlide = this.DOM.track.children[currentFocusIndex];
        if (targetSlide) {
          targetSlide.classList.add('focus-visible');

          const targetSwiperSlide = Math.floor(currentFocusIndex / itemsPorColumna);
          if (carouselInstance && shouldSlide) {
            // Mover al slide correcto (columna)
            carouselInstance.slideTo(targetSwiperSlide, 400); 
            
            // Para móvil, podemos usar scrollIntoView para asegurar que el foco sea visible.
            if (window.innerWidth <= 768) {
                 targetSlide.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
    };

    // ⭐️ 3. HELPERS DE DATOS (Necesarios para el renderizado) ⭐️

    App._findNodoById = function(id, nodos) {
        if (!nodos) return null;
        for (const n of nodos) {
          if (n.id === id) return n;
          if (n.subsecciones && n.subsecciones.length > 0) {
            const encontrado = this._findNodoById(id, n.subsecciones);
            if (encontrado) return encontrado;
          }
          if (n.cursos && n.cursos.length > 0) {
            const encontrado = this._findNodoById(id, n.cursos);
            if (encontrado) return encontrado;
          }
        }
        return null;
    };
      
    App._tieneContenidoActivo = function(nodoId) {
        const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
        if (!nodo) return false;
        if (nodo.cursos && nodo.cursos.length > 0) return true;
        if (nodo.titulo) return true;
        if (!nodo.subsecciones || nodo.subsecciones.length === 0) return false;
        return nodo.subsecciones.some(subseccion => 
          this._tieneContenidoActivo(subseccion.id)
        );
    };
    
    // ⭐️ 4. GENERADOR DE HTML ⭐️

    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecial = null) {
        if (esRelleno) {
          return `<div class="swiper-slide disabled" data-tipo="relleno" tabindex="-1"></div>`;
        }
        
        if (tipoEspecial === 'volver-vertical') {
          // Tarjeta 'Volver' insertada en el flujo (para móvil)
          // La llamaremos 'categoria' para que el clic dispare el _handleTrackClick -> _handleVolverNav
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
        
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAria = estaActivo ? '' : 'aria-disabled="true"';
        const tabindex = estaActivo ? '0' : '-1';
        
        const tipoData = (nodo.subsecciones || nodo.nombre) && !nodo.titulo
                         ? 'data-tipo="categoria"' 
                         : 'data-tipo="curso"';
  
        let hint = '';
        if (!estaActivo) hint = '<span>(Próximamente)</span>';
  
        return `
          <div class="swiper-slide ${claseDisabled}" 
               data-id="${nodo.id}" 
               ${tipoData}
               role="button" 
               tabindex="${tabindex}" 
               ${tagAria}>
            <h3>${nodo.nombre || nodo.titulo}</h3>
            ${hint}
          </div>
        `;
    };

})();
