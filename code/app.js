// --- code/app.js ---

(function() {

  // ⭐️ DEFINICIÓN DEL OBJETO GLOBAL DE LA APLICACIÓN ⭐️
  window.App = {
    
    // --- 1. PROPIEDADES ---
    DOM: {}, 
    STATE: {
      fullData: null,          
      
      // ⭐️ MODIFICADO: Usa la nueva pila de nav-stack.js
      historyStack: [],        
      
      itemsPorColumna: 3,      
      carouselInstance: null,  
      resizeObserver: null,    
      currentFocusIndex: 0,    
      initialRenderComplete: false, 
      keyboardNavInProgress: false 
    },

    // --- 2. INICIALIZACIÓN ---
    async init() {
      if (typeof log === 'function') {
         log('app', DEBUG_LEVELS.BASIC, "App: Iniciando orquestación...");
      }

      // --- ⭐️ CACHEAR EL DOM (Corregido) ⭐️ ---
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.swiperContainerDesktop = document.getElementById('nav-swiper');
      this.DOM.swiperContainerTablet = document.getElementById('nav-swiper-tablet');
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion'); 
      
      // ⭐️ CORREGIDO: IDs de la columna izquierda
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija'); 
      this.DOM.cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento'); 
      
      this.DOM.infoAdicional = document.getElementById('info-adicional'); 
      this.DOM.cardNivelActual = document.getElementById('card-nivel-actual');
      
      // ⭐️ AÑADIDO: Cachear el Toast
      this.DOM.toast = document.getElementById('toast-notification');

      // 2.1. Cargar los datos
      try {
        if (typeof loadData === 'function') {
            await loadData(this); 
        } else {
            logError('app', "ERROR: loadData no está definido.");
            return;
        }
      } catch (error) {
        logError('app', `ERROR: Carga de datos fallida. ${error.message}`);
        return;
      }

      // ⭐️ 2.2. GESTIÓN "DEEP LINKING" E INICIO DE LA PILA ⭐️
      // (Depende de _findNodoById, _mostrarDetalle, y nav-stack.js)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');

        if (targetId) {
            const nodo = this._findNodoById(targetId, this.STATE.fullData.navegacion); 

            if (nodo && nodo.titulo) { // Es un CURSO
                log('app', DEBUG_LEVELS.BASIC, `Deep link a CURSO: ${targetId}`);
                this.stackBuildFromId(targetId, this.STATE.fullData); 
                this.renderNavegacion(); // Renderiza la nav (oculta)
                this._mostrarDetalle(targetId); // Muestra el detalle
            
            } else if (nodo && nodo.nombre) { // Es una CATEGORÍA
                log('app', DEBUG_LEVELS.BASIC, `Deep link a CATEGORÍA: ${targetId}`);
                this.stackBuildFromId(targetId, this.STATE.fullData); 
                this.renderNavegacion();
            
            } else { // ID Inválido
                logWarn('app', `Deep link ID "${targetId}" no encontrado. Cargando raíz.`);
                this.stackInitialize(); 
                this.renderNavegacion();
                if (typeof this.showToast === 'function') {
                    this.showToast(App.getString('toastErrorId'));
                }
            }
        } else {
            // Carga normal (Raíz)
            this.stackInitialize(); 
            this.renderNavegacion();
        }
      } catch (error) {
         logError('app', `ERROR: Fallo al inicializar. ${error.message}`);
         this.stackInitialize(); // Fallback a la raíz
         this.renderNavegacion();
      }

      // 2.3. Configurar listeners estáticos
      if (typeof this.setupListeners === 'function') {
          this.setupListeners(); 
      }
      if (typeof this.setupKeyboardListeners === 'function') {
          this.setupKeyboardListeners(); 
      }

      // 2.4. Configurar el observador
      if (typeof this._setupResizeObserver === 'function') {
        this._setupResizeObserver(); 
      }
      
      // 2.5. Renderizar (ya se llamó en el paso 2.2)

      // 2.6. Finalizar la carga inicial
      this.STATE.initialRenderComplete = true; 
      log('app', DEBUG_LEVELS.BASIC, "Carga inicial completada. Observer activo.");
    
    }, // Fin de App.init()

    /**
     * Muestra una notificación "toast" temporal que se desvanece.
     */
    showToast(message) {
        if (!this.DOM.toast) return;
        if (this.DOM.toast._toastTimer) clearTimeout(this.DOM.toast._toastTimer);
        if (this.DOM.toast._toastTimerFade) clearTimeout(this.DOM.toast._toastTimerFade);

        this.DOM.toast.textContent = message;
        this.DOM.toast.classList.add('active');

        this.DOM.toast._toastTimerFade = setTimeout(() => {
            this.DOM.toast.classList.remove('active');
        }, 2000); 

        this.DOM.toast._toastTimer = setTimeout(() => {
            this.DOM.toast.textContent = '';
        }, 2500); // 2s + 0.5s de transición CSS
    }
  };

  // ⭐️ PUNTO DE ENTRADA ⭐️
  // La llamada a App.init() se mueve al script de 'DOMContentLoaded' en index.html

})();