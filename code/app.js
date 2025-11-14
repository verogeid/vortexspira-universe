// --- code/app.js ---

(function() {

  // ⭐️ DEFINICIÓN DEL OBJETO GLOBAL DE LA APLICACIÓN ⭐️
  window.App = {
    
    // --- 1. PROPIEDADES ---
    DOM: {}, // Se llena durante la inicialización
    STATE: {
      fullData: null,          // Contendrá el JSON cargado
      navStack: [],            // Pila de navegación (IDs de categorías)
      itemsPorColumna: 3,      // Nº de filas (se actualiza en render-base)
      carouselInstance: null,  // La instancia activa de Swiper
      resizeObserver: null,    // El observador de cambio de tamaño
      currentFocusIndex: 0,    // El índice del elemento enfocado
      initialRenderComplete: false, // Flag para el ResizeObserver
      keyboardNavInProgress: false // Flag para nav-tactil.js
    },

    // --- 2. INICIALIZACIÓN ---
    async init() {
      // Usar 'log' si debug.js está cargado
      if (typeof log === 'function') {
         log('app', DEBUG_LEVELS.BASIC, "App: Iniciando orquestación...");
      } else {
         console.log("App: Iniciando orquestación...");
      }


      // --- Cachear el DOM (Solo elementos estables y necesarios) ---
      // Vistas
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      
      // Contenedores de Carrusel (Swiper se engancha a estos)
      this.DOM.swiperContainerDesktop = document.getElementById('nav-swiper');
      this.DOM.swiperContainerTablet = document.getElementById('nav-swiper-tablet');

      // Elementos de UI persistentes
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion'); 
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija-elemento'); 
      this.DOM.infoAdicional = document.getElementById('info-adicional'); 

      // ⭐️ Cachear el nuevo div de nivel actual
      this.DOM.cardNivelActual = document.getElementById('card-nivel-actual');

      // 2.1. Cargar los datos (definido en data.js)
      try {
        if (typeof loadData === 'function') {
            await loadData(this); 
        } else {
            logError('app', "ERROR: loadData no está definido.");
            return;
        }
      } catch (error) {
        logError('app', `ERROR: Carga de datos fallida. ${error.message}`);
        // Mostrar error si es posible
        const track = document.getElementById('track-desktop') || document.getElementById('track-mobile');
        if (track) {
            track.innerHTML = "<p>Error al cargar el contenido.</p>";
        }
        return;
      }

      // 2.2. Configurar listeners estáticos (definido en nav-base.js y nav-keyboard.js)
      // (Los listeners dinámicos como setupTrackClickListener se llaman desde render-base.js)
      if (typeof this.setupListeners === 'function') {
          this.setupListeners(); // Botones estáticos (Volver)
      }
      if (typeof this.setupKeyboardListeners === 'function') {
          this.setupKeyboardListeners(); // Teclado global
      }

      // 2.3. Configurar el observador (definido en render-base.js)
      // Se configura antes del primer render para que _lastMode se establezca
      if (typeof this._setupResizeObserver === 'function') {
        this._setupResizeObserver();
      }

      // 2.4. Renderizar el estado inicial (definido en render-base.js)
      if (typeof this.renderNavegacion === 'function') {
        this.renderNavegacion(); 
      }

      // 2.5. Finalizar la carga inicial
      this.STATE.initialRenderComplete = true; 
      if (typeof log === 'function') {
        log('app', DEBUG_LEVELS.BASIC, "Carga inicial completada. Observer activo.");
      } else {
        console.log("Carga inicial completada. Observer activo.");
      }
    }
  };

  // ⭐️ PUNTO DE ENTRADA ⭐️
  // La llamada a App.init() se mueve al script de 'DOMContentLoaded' en index.html

})();