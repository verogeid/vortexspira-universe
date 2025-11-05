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
      initialRenderComplete: false // Controla el primer renderizado
    },

    // --- 2. INICIALIZACIÓN ---
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
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija'); // Elemento problemático

      // 2.1. Configurar el observador ANTES de cargar datos
      this._setupResizeObserver();
      
      // 2.2. Cargar los datos (ESPERA GARANTIZADA)
      try {
        await this.loadData();
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        this.DOM.track.innerHTML = "<p>Error al cargar el contenido.</p>";
        return;
      }
      
      // 2.3. Configurar listeners (AHORA con seguridad)
      this.setupListeners();

      // 2.4. Renderizar el estado inicial
      this.renderNavegacion(); 
      
      // 2.5. Finalizar la carga inicial
      this.STATE.initialRenderComplete = true; 
      console.log("Carga inicial completada. Observer activo.");
    },

    // --- 3. CARGA DE DATOS ---
    async loadData() {
      try {
        const response = await fetch('./cursos.json'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.STATE.fullData = await response.json();
        console.log("Datos cargados con éxito.");
      } catch (e) {
        console.error("No se pudo cargar 'cursos.json'", e);
        throw e;
      }
    },

    // --- 4. RENDERIZADO PRINCIPAL (LÓGICA DE RELLENO CORREGIDA) ---
    renderNavegacion() {
      if (!this.STATE.fullData) {
          console.error("No se puede renderizar: Datos no cargados.");
          return;
      }

      console.log(`Renderizando nivel: ${this.STATE.navStack.length > 0 ? this.STATE.navStack[this.STATE.navStack.length - 1] : 'Raíz'}`);

      this._destroyCarousel();
      
      let itemsDelNivel = [];
      if (this.STATE.navStack.length === 0) {
        itemsDelNivel = this.STATE.fullData.navegacion;
      } else {
        const idNodoActual = this.STATE.navStack[this.STATE.navStack.length - 1];
        const nodoActual = this._findNodoById(idNodoActual, this.STATE.fullData.navegacion);
        if (nodoActual) {
          itemsDelNivel = [
            ...(nodoActual.subsecciones || []),
            ...(nodoActual.cursos || [])
          ];
        }
      }

      this.DOM.track.innerHTML = '';
      let html = '';
      const { itemsPorColumna } = this.STATE;
      
      // ⭐️ 1. Lógica del Relleno Izquierdo (FUERZA LA COLUMNA 1 DE BLUR) ⭐️
      // Insertamos una columna completa de elementos deshabilitados
      for (let i = 0; i < itemsPorColumna; i++) {
          html += this._generarTarjetaHTML({nombre: ''}, false, true); 
      }
      
      // ⭐️ 2. Insertar los elementos del JSON ⭐️
      let elementosVisibles = 0;
      for (const item of itemsDelNivel) {
        const estaActivo = this._tieneContenidoActivo(item.id);
        html += this._generarTarjetaHTML(item, estaActivo);
        elementosVisibles++;
      }
      
      // ⭐️ 3. Lógica del Relleno Derecho ⭐️
      const totalConRellenoIzquierdo = itemsPorColumna + elementosVisibles;
      const elementosNecesariosParaColumnaCompleta = Math.ceil(totalConRellenoIzquierdo / itemsPorColumna) * itemsPorColumna;
      const numRellenoDerecho = elementosNecesariosParaColumnaCompleta - totalConRellenoIzquierdo;
      
      for (let i = 0; i < numRellenoDerecho; i++) {
          html += this._generarTarjetaHTML({nombre: ''}, false, true); 
      }

      this.DOM.track.innerHTML = html;

      // 4.5. Gestionar botón/tarjeta "Volver"
      const isSubLevel = this.STATE.navStack.length > 0;
      
      if (isSubLevel) {
          this.DOM.cardVolverFija.classList.add('active-volver'); // Verde (Habilitado)
          this.DOM.cardVolverFija.style.display = 'flex';
          this.DOM.btnVolverNav.style.display = 'block';
      } else {
          // Nivel Raíz: Deshabilitado (Rojo)
          this.DOM.cardVolverFija.classList.remove('active-volver');
          this.DOM.cardVolverFija.style.display = 'flex'; // Mantener visible (pero rojo/deshabilitado)
          this.DOM.btnVolverNav.style.display = 'none';
      }


      // 4.6. Lógica de Foco Inicial (Centrado)
      const allSlides = this.DOM.track.children;
      
      // El primer elemento visible está en el índice 'itemsPorColumna'
      const firstEnabledIndex = itemsPorColumna; 
      
      // La columna central es la segunda columna, que tiene índice 1
      const initialSwiperSlide = 1; 
      
      const numColumnas = Math.ceil(allSlides.length / itemsPorColumna);

      this._initCarousel(initialSwiperSlide, numColumnas);
      
      this.STATE.currentFocusIndex = firstEnabledIndex;
      this._updateFocus(false);
    },

    // --- 5. SETUP LISTENERS (CORREGIDO CON COMPROBACIONES DE SEGURIDAD) ---
    setupListeners() {
      // ⭐️ Seguridad: Usamos 'if' para prevenir el TypeError ⭐️
      if (this.DOM.track) {
          this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      }
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverNav.bind(this));
      }
      if (this.DOM.btnVolverDetalle) {
          this.DOM.btnVolverDetalle.addEventListener('click', this._handleVolverDetalle.bind(this));
      }
      if (this.DOM.cardVolverFija) {
          this.DOM.cardVolverFija.addEventListener('click', this._handleVolverNav.bind(this));
      }
      
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

    // --- 7. LÓGICA DE RESPONSIVE Y CARRUSEL ---
    _setupResizeObserver() {
      this.STATE.resizeObserver = new ResizeObserver(entries => {
        if (!this.STATE.initialRenderComplete) {
            return;
        }

        for (let entry of entries) {
          const height = entry.contentRect.height;
          this._updateGridRows(height);
        }
      });
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
        
        // CRÍTICO: Para usar ancho fijo de 320px
        slidesPerView: 'auto', 
        
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
