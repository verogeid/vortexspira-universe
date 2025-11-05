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
      initialRenderComplete: false 
    },

    // --- 2. INICIALIZACIÓN ---
    async init() {
      console.log("App: Iniciando...");
      
      this.DOM.track = document.getElementById('track-navegacion');
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion');
      this.DOM.vistaNav = document.getElementById('vista-navegacion');
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.btnVolverDetalle = document.getElementById('btn-volver-a-navegacion');
      this.DOM.swiperContainer = document.getElementById('nav-swiper'); 
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija');

      try {
        await this.loadData();
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        this.DOM.track.innerHTML = "<p>Error al cargar el contenido.</p>";
        return;
      }
      
      this.setupListeners();
      this._setupResizeObserver();
      
      this.renderNavegacion(); 
      this.STATE.initialRenderComplete = true; 
    },

    // --- 3. CARGA DE DATOS (Sin cambios) ---
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

    // --- 4. RENDERIZADO PRINCIPAL (LÓGICA DE RELLENO MODIFICADA) ---
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
      
      // ⭐️ 1. Lógica del Relleno Izquierdo (Mínimo 1 columna de relleno) ⭐️
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
      // Calculamos el total de elementos (Relleno Izquierdo + Visibles)
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
          this.DOM.cardVolverFija.classList.add('active-volver'); // Verde
          this.DOM.cardVolverFija.style.display = 'flex';
          this.DOM.btnVolverNav.style.display = 'block';
      } else {
          // Nivel Raíz: Deshabilitado (Rojo)
          this.DOM.cardVolverFija.classList.remove('active-volver'); // Asegura que se vea roja por defecto
          this.DOM.cardVolverFija.style.display = 'flex'; // Mantener visible pero en rojo (deshabilitado)
          this.DOM.btnVolverNav.style.display = 'none';
      }


      // 4.6. Lógica de Foco Inicial (Centrado)
      const allSlides = this.DOM.track.children;
      
      // ⭐️ FOCO CORREGIDO: El primer elemento visible está en el índice 'itemsPorColumna' ⭐️
      // Si itemsPorColumna=3, el primer elemento real es el índice 3.
      const firstEnabledIndex = itemsPorColumna; 
      
      // La columna central es la segunda columna, que tiene índice 1
      const initialSwiperSlide = 1; 
      
      const numColumnas = Math.ceil(allSlides.length / itemsPorColumna);

      this._initCarousel(initialSwiperSlide, numColumnas);
      
      this.STATE.currentFocusIndex = firstEnabledIndex;
      this._updateFocus(false);
    },

    // --- 5. SETUP LISTENERS (Modificado para el foco fijo) ---
    setupListeners() {
      // ... (listeners de click, volver, keydown se mantienen igual) ...
      this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      this.DOM.btnVolverNav.addEventListener('click', this._handleVolverNav.bind(this));
      this.DOM.btnVolverDetalle.addEventListener('click', this._handleVolverDetalle.bind(this));
      
      // Listener para la Tarjeta Volver Fija
      this.DOM.cardVolverFija.addEventListener('click', this._handleVolverNav.bind(this));
      
      document.addEventListener('keydown', (e) => {
        if (this.DOM.vistaNav.classList.contains('active')) {
          if (e.key === 'Escape') {
            // El ESCAPE funciona como 'Volver' solo si hay niveles en el stack
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
      
      // Listener para enfocar la tarjeta fija con TAB
      this.DOM.swiperContainer.addEventListener('focusin', (e) => {
          if (e.relatedTarget === this.DOM.cardVolverFija) {
              // Si el foco viene de la tarjeta fija, enfocar el primer elemento del carrusel
              this.DOM.track.children[this.STATE.currentFocusIndex].focus();
              e.preventDefault();
          }
      });
      
      // CRÍTICO: Permitir que la tarjeta Volver sea enfocable con el teclado cuando es nivel raíz
      this.DOM.cardVolverFija.tabIndex = isSubLevel ? 0 : -1;
    },

    // ... (El resto de funciones se mantienen igual) ...
    // _handleTrackClick, _handleKeyNavigation, _updateFocus, etc.
    // Solo se debe asegurar que la lógica de _handleKeyNavigation 
    // y _handleTrackClick IGNORAN las tarjetas de relleno (ya implementado).
    
    // Función auxiliar para generar tarjetas (sin cambios)
    _generarTarjetaHTML(nodo, estaActivo, esRelleno = false) {
      if (esRelleno) {
        // Marcamos las de relleno como 'disabled' para que el teclado las ignore
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
