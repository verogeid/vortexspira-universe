// --- app.js ---

(function() {

  // ⭐️ DEFINICIÓN DEL OBJETO GLOBAL DE LA APLICACIÓN ⭐️
  // (Asumimos que loadData, renderNavegacion, setupListeners, _setupResizeObserver, 
  // y injectHeaderLogo ya han sido definidos en los módulos anteriores.)
  
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
      console.log("App: Iniciando orquestación...");
      logDebug("Iniciando orquestación de la App."); // Usando la consola de emergencia
      
      // Cachear el DOM
      this.DOM.track = document.getElementById('track-navegacion');
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion');
      this.DOM.vistaNav = document.getElementById('vista-navegacion');
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.btnVolverDetalle = document.getElementById('btn-volver-a-navegacion');
      this.DOM.swiperContainer = document.getElementById('nav-swiper'); 
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija');

      // 2.1. Configurar el observador (definido en render.js)
      // Nota: Llamamos al método extendido por render.js
      this._setupResizeObserver();
      
      // 2.2. Cargar los datos (definido en data.js)
      try {
        logDebug("Iniciando carga de datos.");
        // Nota: loadData debe ser implementado para aceptar 'this' (App)
        await loadData(this); 
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        logDebug(`ERROR: Carga de datos fallida. ${error.message}`);
        this.DOM.track.innerHTML = "<p>Error al cargar el contenido.</p>";
        return;
      }
      
      // 2.3. Configurar listeners (definido en nav.js)
      this.setupListeners();

      // 2.4. Renderizar el estado inicial (definido en render.js)
      this.renderNavegacion(); 
      
      // 2.5. Finalizar la carga inicial
      this.STATE.initialRenderComplete = true; 
      logDebug("Carga inicial completada. Observer activo.");
    }
  };

  // ⭐️ PUNTO DE ENTRADA ⭐️
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Inyectar logo/favicon (definido en data.js)
    injectHeaderLogo(); 
    
    // 2. Iniciar la aplicación
    App.init();
  });

})();
