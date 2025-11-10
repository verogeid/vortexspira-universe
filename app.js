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
      logDebug("Iniciando orquestación de la App."); 
      
      // Cachear el DOM (Solo elementos estables y necesarios)
      // 🚨 FIX: Eliminamos el track y vistaNav de aquí, se asignan dinámicamente en render.js
      // this.DOM.track y this.DOM.vistaNav son asignados dentro de renderNavegacion
      
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion'); 
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.swiperContainer = document.getElementById('nav-swiper'); 
      
      // Columnas laterales persistentes
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija'); 
      this.DOM.infoAdicional = document.getElementById('info-adicional'); 

      
      // 2.1. Configurar el observador (definido en render.js)
      // Esta llamada fallaría si los elementos no existieran, pero como existen
      // en el DOM (aunque estén ocultos), la inicialización es segura.
      this._setupResizeObserver();
      
      // 2.2. Cargar los datos (definido en data.js)
      try {
        logDebug("Iniciando carga de datos.");
        // Asumiendo que loadData está definido globalmente en data.js
        if (typeof loadData === 'function') {
            await loadData(this); 
        }
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        logDebug(`ERROR: Carga de datos fallida. ${error.message}`);
        // Intentar usar un track existente para mostrar el error
        const track = document.getElementById('track-desktop') || document.getElementById('track-mobile');
        if (track) {
            track.innerHTML = "<p>Error al cargar el contenido.</p>";
        }
        return;
      }
      
      // 2.3. Configurar listeners (definido en nav.js)
      // Asumiendo que setupListeners está definido globalmente en nav.js
      if (typeof this.setupListeners === 'function') {
          this.setupListeners();
      }

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
    if (typeof injectHeaderLogo === 'function') {
        injectHeaderLogo(); 
    }
    // 2. La inicialización de la App ahora se llama desde el HTML/DOMContentLoaded
  });

})();