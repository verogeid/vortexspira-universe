// --- code/app.js --- (MODIFICADO)

(function() {

  // ⭐️ DEFINICIÓN DEL OBJETO GLOBAL DE LA APLICACIÓN ⭐️
  window.App = {
    
    // --- 1. PROPIEDADES ---
    DOM: {}, 
    STATE: {
      fullData: null,          
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

      // --- ⭐️ CACHEAR EL DOM (Actualizado para contenedores separados) ⭐️ ---
      
      // Vistas Globales
      this.DOM.vistaNav = null; // Se asigna dinámicamente en render-base
      
      // Vista Detalle Escritorio/Tablet (Grid)
      this.DOM.vistaDetalleDesktop = document.getElementById('vista-detalle-desktop');
      this.DOM.detalleContenidoDesktop = document.getElementById('detalle-contenido-desktop');
      
      // Vista Detalle Móvil (Fullscreen)
      this.DOM.vistaDetalleMobile = document.getElementById('vista-detalle-mobile');
      this.DOM.detalleContenidoMobile = document.getElementById('detalle-contenido-mobile');

      // Referencias genéricas (se usarán apuntando al activo)
      this.DOM.vistaDetalle = null; 
      this.DOM.detalleContenido = null; 

      // ⭐️ INICIO CORRECCIÓN (INICIALIZACIÓN DE VISTAS GENÉRICAS) ⭐️
      // Esto evita el 'Cannot read properties of null' en la primera llamada a renderNavegacion().
      
      // Usar 600 como fallback si data.js (donde está MOBILE_MAX_WIDTH) no ha cargado aún.
      const MAX_WIDTH_MOBILE = typeof MOBILE_MAX_WIDTH !== 'undefined' ? MOBILE_MAX_WIDTH : 600;
      const isMobileInit = window.innerWidth <= MAX_WIDTH_MOBILE;
      
      // Asignar al contenedor de vistaDetalle adecuado al iniciar la aplicación.
      this.DOM.vistaDetalle = isMobileInit ? 
          this.DOM.vistaDetalleMobile : 
          this.DOM.vistaDetalleDesktop;
      
      this.DOM.detalleContenido = isMobileInit ?
          this.DOM.detalleContenidoMobile :
          this.DOM.detalleContenidoDesktop;
      // ⭐️ FIN CORRECCIÓN ⭐️

      // Carruseles
      this.DOM.swiperContainerDesktop = document.getElementById('nav-swiper');
      this.DOM.swiperContainerTablet = document.getElementById('nav-swiper-tablet');
      
      // Botones y Laterales
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion'); 
      this.DOM.cardVolverFija = document.getElementById('card-volver-fija'); 
      this.DOM.cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento'); 
      this.DOM.infoAdicional = document.getElementById('info-adicional'); 
      this.DOM.cardNivelActual = document.getElementById('card-nivel-actual');
      this.DOM.toast = document.getElementById('toast-notification');

      // 2.1. Cargar Datos
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

      // 2.2. GESTIÓN DEEP LINKING
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');

        if (targetId) {
            const nodo = this._findNodoById(targetId, this.STATE.fullData.navegacion); 

            if (nodo && nodo.titulo) { // Curso
                log('app', DEBUG_LEVELS.BASIC, `Deep link a CURSO: ${targetId}`);
                this.stackBuildFromId(targetId, this.STATE.fullData); 
                this.renderNavegacion(); 
                this._mostrarDetalle(targetId); // Llama al renderizador específico
            
            } else if (nodo && nodo.nombre) { // Categoría
                log('app', DEBUG_LEVELS.BASIC, `Deep link a CATEGORÍA: ${targetId}`);
                this.stackBuildFromId(targetId, this.STATE.fullData); 
                this.renderNavegacion();
            
            } else { // Inválido
                logWarn('app', `Deep link ID "${targetId}" no encontrado.`);
                this.stackInitialize(); 
                this.renderNavegacion();
                if (typeof this.showToast === 'function') {
                    this.showToast(App.getString('toastErrorId'));
                }
            }
        } else {
            this.stackInitialize(); 
            this.renderNavegacion();
        }
      } catch (error) {
         logError('app', `ERROR: Fallo al inicializar. ${error.message}`);
         this.stackInitialize(); 
         this.renderNavegacion();
      }

      // 2.3. Configuración
      if (typeof this.setupListeners === 'function') { this.setupListeners(); }
      // setupKeyboardListeners se llama implícitamente al cargar nav-keyboard.js
      if (typeof this._setupResizeObserver === 'function') { this._setupResizeObserver(); }
      
      this.STATE.initialRenderComplete = true; 
      log('app', DEBUG_LEVELS.BASIC, "Carga inicial completada.");
    
    }, 

    /**
     * Toast Notification
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
        }, 2500); 
    }
  };

})();