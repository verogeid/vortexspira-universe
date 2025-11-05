// --- app.js ---

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
      console.log("App: Iniciando orquestación...");
      
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
      this._setupResizeObserver();
      
      // 2.2. Cargar los datos (definido en data.js)
      try {
        await this.loadData(this); // Pasamos 'this' (App) al loadData
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        this.DOM.track.innerHTML = "<p>Error al cargar el contenido.</p>";
        return;
      }
      
      // 2.3. Configurar listeners (definido en nav.js)
      this.setupListeners();

      // 2.4. Renderizar el estado inicial (definido en render.js)
      this.renderNavegacion(); 
      
      // 2.5. Finalizar la carga inicial
      this.STATE.initialRenderComplete = true; 
      console.log("Carga inicial completada. Observer activo.");
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
