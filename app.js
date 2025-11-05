// --- app.js ---

(function() {

  const App = {
    // --- 1. PROPIEDADES ---
    DOM: {}, 
    STATE: {
      fullData: null,
      navStack: [],
      itemsPorColumna: 3, // Valor por defecto
      carouselInstance: null, // (NUEVO) Para guardar la instancia de Swiper
      resizeObserver: null,   // (NUEVO) Para el 'reflow'
      currentFocusIndex: 0    // (NUEVO) Para la navegación por teclado
    },

    // --- 2. INICIALIZACIÓN ---
    async init() {
      console.log("App: Iniciando...");
      
      // 2.1. Cachear el DOM
      this.DOM.track = document.getElementById('track-navegacion');
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion');
      this.DOM.vistaNav = document.getElementById('vista-navegacion');
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.btnVolverDetalle = document.getElementById('btn-volver-a-navegacion');
      this.DOM.swiperContainer = document.getElementById('nav-swiper'); // (NUEVO)

      // 2.2. Cargar los datos
      try {
        await this.loadData();
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        return;
      }

      // 2.3. Renderizar el estado inicial
      this.renderNavegacion();

      // 2.4. Configurar listeners
      this.setupListeners();
      
      // 2.5. Configurar observador de resize (NUEVO)
      this._setupResizeObserver();
    },

    // --- 3. CARGA DE DATOS ---
    // (Sin cambios)
    async loadData() {
      try {
        const response = await fetch('./cursos.json'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.STATE.fullData = await response.json();
      } catch (e) {
        console.error("No se pudo cargar 'cursos.json'", e);
        throw e;
      }
    },

    // --- 4. RENDERIZADO PRINCIPAL ---
    renderNavegacion() {
      console.log("Renderizando nivel:", this.STATE.navStack);

      // (NUEVO) Destruir carrusel anterior antes de renderizar
      this._destroyCarousel();
      
      let itemsARenderizar = [];
      if (this.STATE.navStack.length === 0) {
        itemsARenderizar = this.STATE.fullData.navegacion;
      } else {
        const idNodoActual = this.STATE.navStack[this.STATE.navStack.length - 1];
        const nodoActual = this._findNodoById(idNodoActual, this.STATE.fullData.navegacion);
        if (nodoActual) {
          itemsARenderizar = [
            ...(nodoActual.subsecciones || []),
            ...(nodoActual.cursos || [])
          ];
        }
      }

      this.DOM.track.innerHTML = '';
      let html = '';
      for (const item of itemsARenderizar) {
        const estaActivo = this._tieneContenidoActivo(item.id);
        html += this._generarTarjetaHTML(item, estaActivo);
      }
      this.DOM.track.innerHTML = html;

      this.DOM.btnVolverNav.style.display = this.STATE.navStack.length > 0 ? 'block' : 'none';
      
      // (NUEVO) Inicializar el carrusel DESPUÉS de pintar el HTML
      this._initCarousel();
      
      // (NUEVO) Poner el foco en el primer elemento
      this.STATE.currentFocusIndex = 0;
      this._updateFocus();
    },

    // --- 5. SETUP LISTENERS ---
    setupListeners() {
      // 5.1. Listener para el track (delegación de eventos)
      this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      
      // 5.2. Listener para "Volver" en Navegación
      this.DOM.btnVolverNav.addEventListener('click', this._handleVolverNav.bind(this));

      // 5.3. Listener para "Volver" en Detalle
      this.DOM.btnVolverDetalle.addEventListener('click', this._handleVolverDetalle.bind(this));

      // 5.4. Listener para teclas (MODIFICADO)
      document.addEventListener('keydown', (e) => {
        // Solo gestionar teclas si estamos en la vista de navegación
        if (this.DOM.vistaNav.classList.contains('active')) {
          if (e.key === 'Escape') {
            if (this.STATE.navStack.length > 0) {
              this._handleVolverNav();
            }
          } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
            e.preventDefault(); // Evitar que la página haga scroll
            this._handleKeyNavigation(e.key);
          }
        } 
        // Si estamos en el detalle, solo 'Escape'
        else if (this.DOM.vistaDetalle.classList.contains('active') && e.key === 'Escape') {
          this._handleVolverDetalle();
        }
      });
    },

    // --- 6. HANDLERS DE EVENTOS ---
    _handleTrackClick(e) {
      // (CLASE MODIFICADA de .card a .swiper-slide)
      const tarjeta = e.target.closest('.swiper-slide');
      
      if (!tarjeta || tarjeta.classList.contains('disabled')) {
        return;
      }

      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;

      if (tipo === 'categoria') {
        this.STATE.navStack.push(id);
        this.renderNavegacion();
      } else if (tipo === 'curso') {
        this._mostrarDetalle(id);
      }
    },
    
    // (NUEVO) Manejador para navegación por teclado
    _handleKeyNavigation(key) {
      const { itemsPorColumna } = this.STATE;
      const totalItems = this.DOM.track.children.length;
      let newIndex = this.STATE.currentFocusIndex;

      if (totalItems === 0) return;

      switch (key) {
        case 'ArrowUp':
          newIndex = (newIndex - 1 + totalItems) % totalItems;
          break;
        case 'ArrowDown':
          newIndex = (newIndex + 1) % totalItems;
          break;
        case 'ArrowLeft':
          newIndex = (newIndex - itemsPorColumna + totalItems) % totalItems;
          break;
        case 'ArrowRight':
          newIndex = (newIndex + itemsPorColumna) % totalItems;
          break;
        case 'Enter':
        case ' ':
          // Simular clic en el elemento enfocado
          const focusedCard = this.DOM.track.children[newIndex];
          if (focusedCard) {
            focusedCard.click();
          }
          return; // No actualizar foco, la vista cambiará
      }
      
      this.STATE.currentFocusIndex = newIndex;
      this._updateFocus();
    },

    // (NUEVO) Función para actualizar el foco visual y del carrusel
    _updateFocus() {
      const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
      
      // Quitar foco de todos
      Array.from(this.DOM.track.children).forEach(child => {
        child.classList.remove('focus-visible');
      });

      // Poner foco en el actual
      const targetSlide = this.DOM.track.children[currentFocusIndex];
      if (targetSlide) {
        targetSlide.classList.add('focus-visible');

        // Mover el carrusel
        // Calculamos a qué columna (slide de Swiper) pertenece el ítem
        const targetSwiperSlide = Math.floor(currentFocusIndex / itemsPorColumna);
        if (carouselInstance) {
          carouselInstance.slideTo(targetSwiperSlide, 400); // 400ms de velocidad
        }
      }
    },
    
    _handleVolverNav() { /* (Sin cambios) */ },
    _mostrarDetalle(cursoId) { /* (Sin cambios) */ },
    _handleVolverDetalle() { /* (Sin cambios) */ },

    // --- 7. LÓGICA DE RESPONSIVE Y CARRUSEL (NUEVA SECCIÓN) ---

    // 7.1. Observador de Resize (Reflow)
    _setupResizeObserver() {
      this.STATE.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          // Usamos la altura del viewport del carrusel
          const height = entry.contentRect.height;
          this._updateGridRows(height);
        }
      });
      // Observar el contenedor de la app
      this.STATE.resizeObserver.observe(document.getElementById('app-container'));
    },

    // 7.2. Actualizar la rejilla (CSS)
    _updateGridRows(height) {
      let newItemsPorColumna = 3; // Estándar
      if (height <= 800) newItemsPorColumna = 2;
      if (height <= 500) newItemsPorColumna = 1;

      // Si el valor cambia, lo actualizamos
      if (newItemsPorColumna !== this.STATE.itemsPorColumna) {
        console.log(`Reflow: Cambiando a ${newItemsPorColumna} filas.`);
        this.STATE.itemsPorColumna = newItemsPorColumna;
        
        // Actualizar el CSS
        this.DOM.track.style.gridTemplateRows = `repeat(${newItemsPorColumna}, 1fr)`;
        
        // Actualizar el carrusel para que sepa que la geometría cambió
        if (this.STATE.carouselInstance) {
          this.STATE.carouselInstance.update();
        }
      }
    },

    // 7.3. Inicializar Swiper
    _initCarousel() {
      if (this.STATE.carouselInstance) return; // Ya existe

      this.STATE.carouselInstance = new Swiper(this.DOM.swiperContainer, {
        // --- Configuración ---
        direction: 'horizontal',
        
        // Agrupa los slides (tarjetas) en columnas
        // Le decimos que muestre 1 columna (de 3 ítems) a la vez
        slidesPerView: 1, 
        
        // (NUEVO) Le decimos a Swiper cuántos ítems forman 1 slide (columna)
        grid: {
          rows: this.STATE.itemsPorColumna,
          fill: 'column',
        },
        
        // Centra el slide activo (la columna)
        centeredSlides: true,
        
        // Mueve el carrusel con la rueda del ratón
        mousewheel: true,
        
        // Permite drag-and-drop
        grabCursor: true,
        
        // Desactiva el loop infinito si hay 3 o menos columnas
        loop: this.DOM.track.children.length > (this.STATE.itemsPorColumna * 3),

        // Le quitamos la navegación por teclado de Swiper
        // porque haremos la nuestra (saltando ítems)
        keyboard: {
          enabled: false,
        },
        
        // Velocidad de la transición
        speed: 400,
      });
    },

    // 7.4. Destruir Swiper
    _destroyCarousel() {
      if (this.STATE.carouselInstance) {
        this.STATE.carouselInstance.destroy(true, true);
        this.STATE.carouselInstance = null;
      }
    },
    
    // --- 8. HELPERS (Funciones auxiliares) ---
    _findNodoById(id, nodos) { /* (Sin cambios) */ },
    _tieneContenidoActivo(nodoId) { /* (Sin cambios) */ },

    // (CLASE MODIFICADA de .card a .swiper-slide)
    _generarTarjetaHTML(nodo, estaActivo) {
      const claseDisabled = estaActivo ? '' : 'disabled';
      const tagAria = estaActivo ? '' : 'aria-disabled="true"';
      const tabindex = estaActivo ? '0' : '-1';
      
      const tipoData = (nodo.subsecciones || nodo.nombre) && !nodo.titulo
                       ? 'data-tipo="categoria"' 
                       : 'data-tipo="curso"';

      let hint = '';
      if (!estaActivo) {
        hint = '<span>(Próximamente)</span>';
      }

      // Añadimos la clase 'swiper-slide'
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
    }
  };

  // --- 9. PUNTO DE ENTRADA ---
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

})();
