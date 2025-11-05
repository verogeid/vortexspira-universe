// --- app.js ---

(function() {

  const App = {
    // --- 1. PROPIEDADES ---
    DOM: {}, 
    STATE: {
      fullData: null,
      navStack: [],
      itemsPorColumna: 3, 
      carouselInstance: null,
      resizeObserver: null,
      currentFocusIndex: 0,
      isInitialLoad: true
    },

    // --- 2. INICIALIZACIÓN (ESTRUCTURA MÁS ROBUSTA) ---
    async init() {
      console.log("App: Iniciando...");
      
      // Cachear el DOM
      this.DOM.track = document.getElementById('track-navegacion');
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion');
      this.DOM.vistaNav = document.getElementById('vista-navegacion');
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.btnVolverDetalle = document.getElementById('btn-volver-a-navegacion');
      this.DOM.swiperContainer = document.getElementById('nav-swiper'); 
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija');

      // 2.1. Cargar los datos (DEBE SER LO PRIMERO)
      try {
        await this.loadData();
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        this.DOM.track.innerHTML = "<p>Error al cargar el contenido.</p>";
        return;
      }
      
      // 2.2. Configurar listeners (para que el DOM sea interactivo inmediatamente)
      this.setupListeners();

      // 2.3. Configurar el observador ANTES de renderizar el contenido
      this._setupResizeObserver();
      
      // 2.4. Renderizar el estado inicial (Ahora que los datos están garantizados)
      this.renderNavegacion(); 
      
      // 2.5. Desactivar el flag de carga inicial con un retraso para ignorar el primer resize
      setTimeout(() => {
          this.STATE.isInitialLoad = false;
          console.log("Carga inicial completada. Observer activo.");
      }, 500); // 500ms es un tiempo seguro para que el navegador termine el reflow inicial.
    },

    // --- 3. CARGA DE DATOS ---
    async loadData() {
      try {
        const response = await fetch('./cursos.json'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.STATE.fullData = await response.json();
        console.log("Datos cargados con éxito."); // Mensaje de éxito aquí
      } catch (e) {
        console.error("No se pudo cargar 'cursos.json'", e);
        throw e;
      }
    },

    // --- 4. RENDERIZADO PRINCIPAL (Sin cambios) ---
    renderNavegacion() {
      console.log(`Renderizando nivel: ${this.STATE.navStack.length > 0 ? this.STATE.navStack[this.STATE.navStack.length - 1] : 'Raíz'}`);

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
      
      // 4.3. Generar HTML para cada nodo
      for (const item of itemsARenderizar) {
        const estaActivo = this._tieneContenidoActivo(item.id);
        html += this._generarTarjetaHTML(item, estaActivo);
      }
      
      // --- Lógica de Relleno de Rejilla ---
      const totalItems = itemsARenderizar.length;
      const { itemsPorColumna } = this.STATE;
      const itemsFaltantes = totalItems % itemsPorColumna;

      if (itemsFaltantes > 0) {
          const numRelleno = itemsPorColumna - itemsFaltantes;
          for (let i = 0; i < numRelleno; i++) {
              html += this._generarTarjetaHTML({nombre: ''}, false, true); 
          }
      }

      this.DOM.track.innerHTML = html;

      // 4.5. Gestionar botón/tarjeta "Volver"
      const isSubLevel = this.STATE.navStack.length > 0;
      this.DOM.btnVolverNav.style.display = isSubLevel ? 'block' : 'none';
      this.DOM.cardVolverFija.style.display = isSubLevel ? 'flex' : 'none';

      // 4.6. Lógica de Foco Inicial (Centrado)
      const allSlides = this.DOM.track.children;
      let firstEnabledIndex = 0;
      for (let i = 0; i < allSlides.length; i++) {
        if (!allSlides[i].classList.contains('disabled') && allSlides[i].dataset.tipo !== 'relleno') {
          firstEnabledIndex = i;
          break;
        }
      }
      
      const initialSwiperSlide = Math.floor(firstEnabledIndex / this.STATE.itemsPorColumna);
      const numColumnas = Math.ceil(allSlides.length / this.STATE.itemsPorColumna);

      this._initCarousel(initialSwiperSlide, numColumnas);
      
      this.STATE.currentFocusIndex = firstEnabledIndex;
      this._updateFocus(false);
    },

    // --- 5. SETUP LISTENERS (Sin cambios) ---
    setupListeners() {
      this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      this.DOM.btnVolverNav.addEventListener('click', this._handleVolverNav.bind(this));
      this.DOM.btnVolverDetalle.addEventListener('click', this._handleVolverDetalle.bind(this));
      this.DOM.cardVolverFija.addEventListener('click', this._handleVolverNav.bind(this));
      
      document.addEventListener('keydown', (e) => {
        if (this.DOM.vistaNav.classList.contains('active')) {
          if (e.key === 'Escape') {
            if (this.STATE.navStack.length > 0) this._handleVolverNav();
          } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
            e.preventDefault(); 
            this._handleKeyNavigation(e.key);
          }
        } 
        else if (this.DOM.vistaDetalle.classList.contains('active') && e.key === 'Escape') {
          this._handleVolverDetalle();
        }
      });
    },

    // --- 6. HANDLERS DE EVENTOS (Sin cambios) ---
    _handleTrackClick(e) {
      const tarjeta = e.target.closest('.swiper-slide');
      
      if (!tarjeta || tarjeta.classList.contains('disabled') || tarjeta.dataset.tipo === 'relleno') {
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
    
    _handleKeyNavigation(key) {
      const { itemsPorColumna } = this.STATE;
      const allSlides = this.DOM.track.children;
      const totalItems = allSlides.length;
      let newIndex = this.STATE.currentFocusIndex;

      if (totalItems === 0) return;
      
      const oldIndex = newIndex;

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
          const focusedCard = allSlides[newIndex];
          if (focusedCard) focusedCard.click();
          return;
      }
      
      if (allSlides[newIndex].classList.contains('disabled') || allSlides[newIndex].dataset.tipo === 'relleno') {
         newIndex = oldIndex;
      }
      
      this.STATE.currentFocusIndex = newIndex;
      this._updateFocus(true);
    },

    _updateFocus(shouldSlide = true) {
      const { currentFocusIndex, itemsPorColumna, carouselInstance } = this.STATE;
      
      Array.from(this.DOM.track.children).forEach(child => {
        child.classList.remove('focus-visible');
      });

      const targetSlide = this.DOM.track.children[currentFocusIndex];
      if (targetSlide) {
        targetSlide.classList.add('focus-visible');

        const targetSwiperSlide = Math.floor(currentFocusIndex / itemsPorColumna);
        if (carouselInstance && shouldSlide) {
          carouselInstance.slideTo(targetSwiperSlide, 400); 
        }
      }
    },
    
    _handleVolverNav() {
      if (this.STATE.navStack.length > 0) {
        this.STATE.navStack.pop();
        this.renderNavegacion();
      }
    },

    _mostrarDetalle(cursoId) {
      const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion);
      if (!curso) return;
      
      let enlacesHtml = (curso.enlaces || []).map(enlace => 
        `<a href="${enlace.url || '#'}" class="enlace-curso" target="_blank">${enlace.texto}</a>`
      ).join('');

      this.DOM.detalleContenido.innerHTML = `
        <h2>${curso.titulo}</h2>
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
        <div class="enlaces-curso">
          ${enlacesHtml || 'No hay enlaces para este curso.'}
        </div>
      `;
      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');
    },
    
    _handleVolverDetalle() {
      this.DOM.vistaDetalle.classList.remove('active');
      this.DOM.vistaNav.classList.add('active');
    },

    // --- 7. LÓGICA DE RESPONSIVE Y CARRUSEL (Sin cambios) ---
    _setupResizeObserver() {
      this.STATE.resizeObserver = new ResizeObserver(entries => {
        // Ejecutar la lógica de reflow SÓLO después de que el flag sea false
        if (this.STATE.isInitialLoad) return; 

        for (let entry of entries) {
          const height = entry.contentRect.height;
          this._updateGridRows(height);
        }
      });
      // Observar el contenedor principal, que determina el espacio vertical
      this.STATE.resizeObserver.observe(document.getElementById('app-container'));
    },

    _updateGridRows(height) {
      let newItemsPorColumna = 3; 
      if (height <= 800) newItemsPorColumna = 2;
      if (height <= 500) newItemsPorColumna = 1;

      if (newItemsPorColumna !== this.STATE.itemsPorColumna) {
        console.log(`Reflow: Cambiando a ${newItemsPorColumna} filas.`);
        this.STATE.itemsPorColumna = newItemsPorColumna;
        this.renderNavegacion(); 
      }
    },

    _initCarousel(initialSwiperSlide, numColumnas) {
      if (this.STATE.carouselInstance) return;

      this.STATE.carouselInstance = new Swiper(this.DOM.swiperContainer, {
        direction: 'horizontal',
        slidesPerView: 1, 
        grid: {
          rows: this.STATE.itemsPorColumna,
          fill: 'column',
        },
        centeredSlides: true,
        mousewheel: { enabled: true, passive: false },
        grabCursor: true,
        loop: numColumnas > 3,
        initialSlide: initialSwiperSlide,
        keyboard: { enabled: false },
        speed: 400,
      });
    },

    _destroyCarousel() {
      if (this.STATE.carouselInstance) {
        this.STATE.carouselInstance.destroy(true, true);
        this.STATE.carouselInstance = null;
      }
    },
    
    // --- 8. HELPERS (Funciones auxiliares) ---
    _findNodoById(id, nodos) {
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
    },
    
    _tieneContenidoActivo(nodoId) {
      const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
      if (!nodo) return false;
      if (nodo.cursos && nodo.cursos.length > 0) return true;
      if (nodo.titulo) return true;
      if (!nodo.subsecciones || nodo.subsecciones.length === 0) return false;
      return nodo.subsecciones.some(subseccion => 
        this._tieneContenidoActivo(subseccion.id)
      );
    },

    _generarTarjetaHTML(nodo, estaActivo, esRelleno = false) {
      if (esRelleno) {
        return `<div class="swiper-slide disabled" data-tipo="relleno" tabindex="-1"></div>`;
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
    }
  };

  // --- 9. PUNTO DE ENTRADA ---
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

})();
