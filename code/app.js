// --- code/app.js ---

(function() {

  // ⭐️ DEFINICIÓN DEL OBJETO GLOBAL DE LA APLICACIÓN ⭐️
  window.App = {
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
      log('app', DEBUG_LEVELS.BASIC, "App: Iniciando orquestación...");
      
      // Cachear el DOM (Solo elementos estables y necesarios)
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion'); 
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.swiperContainer = document.getElementById('nav-swiper'); 
      
      // Columnas laterales persistentes
      // 🚨 FIX: La tarjeta interactiva es ahora el elemento anidado dentro del contenedor 🚨
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija-elemento'); 
      this.DOM.infoAdicional = document.getElementById('info-adicional'); 

      
      // 2.1. Configurar el observador (definido en render-base.js)
      if (typeof this._setupResizeObserver === 'function') {
        this._setupResizeObserver();
      }
      
      // 2.2. Cargar los datos (definido en data.js)
      try {
        log('app', DEBUG_LEVELS.BASIC, "Iniciando carga de datos.");
        if (typeof loadData === 'function') {
            await loadData(this); 
        }
      } catch (error) {
        logError('app', `ERROR: Carga de datos fallida. ${error.message}`);

        // Intentar usar un track existente para mostrar el error
        const track = document.getElementById('track-desktop') || document.getElementById('track-mobile');
        if (track) {
            track.innerHTML = "<p>Error al cargar el contenido.</p>";
        }
        return;
      }
      
      // 2.3. Configurar listeners (definido en nav-base.js)
      if (typeof this.setupListeners === 'function') {
          this.setupListeners();
      }

      // 2.4. Renderizar el estado inicial (definido en render-base.js)
      if (typeof this.renderNavegacion === 'function') {
        this.renderNavegacion(); 
      }
      
      // 2.5. Finalizar la carga inicial
      this.STATE.initialRenderComplete = true; 
      log('app', DEBUG_LEVELS.BASIC, "Carga inicial completada. Observer activo.");
    }
  };

  // ⭐️ PUNTO DE ENTRADA ⭐️
  // La llamada a App.init() se ha movido al final del index.html para asegurar la carga completa de módulos.
  
})();