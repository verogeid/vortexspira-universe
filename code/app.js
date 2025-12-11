// --- code/app.js (CLASE PRINCIPAL Y ENTRY POINT) ---

// Importaciones de módulos de la aplicación
import * as debug from './debug.js';
import * as data from './data.js';
import * as i18n from './i18n.js';
import * as nav_stack from './nav-stack.js';

// Importaciones de funciones de nav-base y render-base (como helpers)
import * as nav_base from './nav-base.js';
// ⬇️ Módulos de Detalle refactorizados ⬇️
import * as nav_base_details from './nav-base-details.js'; 
import * as render_details from './render-details.js'; 
// ⬆️ Fin Módulos de Detalle refactorizados ⬆️
import * as render_base from './render-base.js';
// ⭐️ CAMBIO: Importar los nuevos módulos de teclado ⭐️
import * as nav_keyboard_base from './nav-keyboard-base.js'; 
import * as nav_keyboard_details from './nav-keyboard-details.js'; 
// ⬇️ MODIFICACIÓN: Reemplazar nav_tactil por nav-mouse-swipe ⬇️
import * as nav_mouse_swipe from './nav-mouse-swipe.js';
// ⬆️ FIN MODIFICACIÓN ⬆️
import * as render_swipe from './render-swipe.js';
import * as render_mobile from './render-mobile.js';

class VortexSpiraApp {
    
    constructor() {
        debug.setupConsoleInterceptor();

        this.DOM = {}; 
        this.STATE = {
            fullData: null,          
            historyStack: [],        
            itemsPorColumna: 3,      
            carouselInstance: null,  
            resizeObserver: null,    
            currentFocusIndex: 0,    
            initialRenderComplete: false, 
            keyboardNavInProgress: false,
            activeCourseId: null, 
            lastDetailFocusIndex: 0, 
            detailNavInProgress: false, // ⭐️ FIX CLAVE: Bandera para sincronizar el foco de detalle ⭐️
        };
        
        // ⭐️ Exposición temporal para onclick en HTML (patrón mixto) ⭐️
        window.App = this; 
        
        // --- INYECCIÓN DE HELPERS DE MÓDULOS EN LA INSTANCIA (Delegación de contexto) ---
        // Stack de Navegación
        this.stackInitialize = nav_stack.stackInitialize;
        this.stackGetCurrent = nav_stack.stackGetCurrent;
        this.stackPop = nav_stack.stackPop;
        this.stackPush = nav_stack.stackPush;
        this.stackUpdateCurrentFocus = nav_stack.stackUpdateCurrentFocus;
        this.stackBuildFromId = nav_stack.stackBuildFromId;

        // Helpers de Búsqueda y Estado
        this._findNodoById = nav_base._findNodoById;
        this._tieneContenidoActivo = nav_base._tieneContenidoActivoImpl;
        this.findBestFocusInColumn = nav_base.findBestFocusInColumn; // Delegación para nav-mouse-swipe

        // Funciones de Renderizado
        this._generarTarjetaHTML = render_base._generarTarjetaHTMLImpl; 
        this._generateCardHTML_Carousel = render_swipe._generateCardHTML_Carousel;
        this._generateCardHTML_Mobile = render_mobile._generateCardHTML_Mobile;
        this._initCarousel_Swipe = render_swipe._initCarousel_Swipe;
        this._initCarousel_Mobile = render_mobile._initCarousel_Mobile;
        this._destroyCarousel = render_swipe._destroyCarouselImpl;
        
        // ⭐️ CORRECCIÓN CLAVE AÑADIDA: Delegación de Listeners de Swipe/Rueda ⭐️
        this.setupTouchListeners = nav_mouse_swipe.setupTouchListeners;

        // ⭐️ FIX: Delegar la función principal de renderizado ⭐️
        this.renderNavegacion = render_base.renderNavegacion; 

        // ⭐️ FUNCIONES DE DETALLE (Delegadas) ⭐️
        this._handleActionRowClick = nav_base_details._handleActionRowClick; 
        this._mostrarDetalle = render_details._mostrarDetalle;             

        this.clearConsole = debug.logClear
    }

    // -----------------------------------------------------------------
    // ⭐️ MÉTODOS PÚBLICOS Y DE INICIALIZACIÓN ⭐️
    // -----------------------------------------------------------------
    
    async init() {
        debug.logClear();

        debug.log('global', debug.DEBUG_LEVELS.BASIC, "VortexSpira Universe - Versión " + this.getString('version'));

        debug.log('app', debug.DEBUG_LEVELS.BASIC, "App: Iniciando orquestación (POO)...");
        
        this._setupGlobalDebugListeners();
        this._cacheDOM();
        
        // ⬇️ MODIFICACIÓN CLAVE: Inicializar vistaNav de forma segura para Deep Link ⬇️
        // Si no está definido, forzamos la referencia a la de Desktop (la más grande)
        this.DOM.vistaNav = this.DOM.vistaNav || document.getElementById('vista-navegacion-desktop'); 
        // ⬆️ FIN MODIFICACIÓN CLAVE ⬆️

        try {
            this.STATE.fullData = await data.loadData(); 
        } catch (error) {
            debug.logError('app', "ERROR: Carga de datos fallida. " + error.message);
            return;
        }

        // --- GESTIÓN DEEP LINKING ---
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');

        if (targetId) {
            if (this.stackBuildFromId(targetId, this.STATE.fullData)) { 
                const nodo = this._findNodoById(targetId, this.STATE.fullData.navegacion);
                if (nodo && nodo.titulo) { 
                    this._mostrarDetalle(targetId);
                } else {
                    this.renderNavegacion();
                }
            } else {
                this.stackInitialize(); 
                this.renderNavegacion();
                this.showToast(this.getString('toastErrorId'));
            }
        } else {
            this.stackInitialize(); 
            this.renderNavegacion();
        }

        // Inicialización de Listeners y ResizeObserver
        nav_base.setupListeners.call(this);
        // ⭐️ CAMBIO: Llamada al nuevo módulo base de teclado ⭐️
        nav_keyboard_base.initKeyboardControls.call(this); 
        render_base._setupResizeObserver.call(this); 
        
        this.STATE.initialRenderComplete = true; 
        debug.log('app', debug.DEBUG_LEVELS.BASIC, "Carga inicial completada.");
    }

    // -----------------------------------------------------------------
    // ⭐️ MÉTODOS DE SERVICIO Y DELEGACIÓN (LLAMADOS DESDE HTML O JS) ⭐️
    // -----------------------------------------------------------------
    
    // Renderizado
    // renderNavegacion() { render_base.renderNavegacion.call(this); } // <-- LÍNEA ELIMINADA (Delegación movida al constructor)
    _updateFocus(shouldSlide) { nav_base._updateFocusImpl.call(this, shouldSlide); }
    
    // Handlers (Invocados por onclick/eventos)
    _handleTrackClick(e) { 
        nav_base._handleTrackClick.call(this, e); 
    }
    
    _handleVolverClick() { 
        // ⭐️ CORRECCIÓN: Al salir de detalle, solo reseteamos el foco, la limpieza de ID se hace en nav-base.js
        if (this.DOM.vistaDetalle.classList.contains('active')) {
             this.STATE.lastDetailFocusIndex = 0;
        }
        nav_base._handleVolverClick.call(this); 
    }
    
    _handleCardClick(id, tipo, parentFocusIndex) { 
        nav_base._handleCardClick.call(this, id, tipo, parentFocusIndex); 
    }
    
    _mostrarDetalle(cursoId) { 
        this._mostrarDetalle.call(this, cursoId); 
        this.STATE.activeCourseId = cursoId; // ⭐️ GUARDAR ID del curso activo ⭐️
    }
    
    _handleActionRowClick(e) {
        this._handleActionRowClick.call(this, e);
    }

    // I18N
    getString(key) { return i18n.getString(key); }
    applyStrings() { i18n.applyStrings(this); }

    // Otros
    
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
    
    /**
     * Caching del DOM. Necesario para inicializar las referencias genéricas de detalle.
     */
    _cacheDOM() {
        const isMobileInit = window.innerWidth <= data.MOBILE_MAX_WIDTH;
        
        // Vistas de Detalle
        this.DOM.vistaDetalleDesktop = document.getElementById('vista-detalle-desktop');
        this.DOM.detalleContenidoDesktop = document.getElementById('detalle-contenido-desktop');
        this.DOM.vistaDetalleMobile = document.getElementById('vista-detalle-mobile');
        this.DOM.detalleContenidoMobile = document.getElementById('detalle-contenido-mobile');

        // Referencias genéricas (apuntan al activo en la inicialización)
        this.DOM.vistaDetalle = isMobileInit ? this.DOM.vistaDetalleMobile : this.DOM.vistaDetalleDesktop;
        this.DOM.detalleContenido = isMobileInit ? this.DOM.detalleContenidoMobile : this.DOM.detalleContenidoDesktop;
        
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
        this.DOM.appContainer = document.getElementById('app-container');
        
        // ⬇️ MODIFICACIÓN: Inicializar vistaNav de forma segura para Deep Link ⬇️
        const isDesktop = window.innerWidth > data.TABLET_LANDSCAPE_MAX_WIDTH
        const isTabletLandscape = window.innerWidth > data.TABLET_PORTRAIT_MAX_WIDTH && window.innerWidth <= data.TABLET_LANDSCAPE_MAX_WIDTH;
        const isTabletPortrait = window.innerWidth > data.MOBILE_MAX_WIDTH && window.innerWidth <= data.TABLET_PORTRAIT_MAX_WIDTH;

        if (isMobileInit) {
            this.DOM.vistaNav = document.getElementById('vista-navegacion-mobile');
            this.DOM.track = document.getElementById('track-mobile');
        } else if (isDesktop) {
            this.DOM.vistaNav = document.getElementById('vista-navegacion-desktop');
            this.DOM.track = document.getElementById('track-desktop');
        } else if (isTabletLandscape || isTabletPortrait) {
            this.DOM.vistaNav = document.getElementById('vista-navegacion-tablet');
            this.DOM.track = document.getElementById('track-tablet');
        }
        // ⬆️ FIN MODIFICACIÓN ⬆️
    }
    
    /**
     * Configura el listener de clic global para depuración.
     */
    _setupGlobalDebugListeners() {
        if (debug.DEBUG_CONFIG.global >= debug.DEBUG_LEVELS.DEEP) {
            document.addEventListener('click', function(e) {
                if (typeof debug.log === 'function') {
                    const targetElement = e.target;
                    const closestCard = targetElement.closest('.card');
                    
                    debug.log('global', debug.DEBUG_LEVELS.DEEP, '❌ CLIC GLOBAL CAPTURADO ❌');
                    debug.log('global', debug.DEBUG_LEVELS.DEEP, 'Origen (e.target):', targetElement.tagName, targetElement.id, targetElement.className);
                    
                    if (closestCard) {
                        debug.log('global', debug.DEBUG_LEVELS.DEEP, 'Elemento Clicado es una Tarjeta.', 'Card ID:', closestCard.dataset.id);
                    }
                }
            }, true); // El 'true' activa la fase de CAPTURA.
        }
    }
}

// -------------------------------------------------------------
// ⭐️ EXPORTACIÓN E INICIALIZACIÓN (Entry Point) ⭐️
// -------------------------------------------------------------

const appInstance = new VortexSpiraApp();

// ⭐️ Funciones que index.html necesita importar ⭐️
export const init = () => appInstance.init();
export const applyStrings = () => appInstance.applyStrings();
export const injectHeaderLogo = () => data.injectHeaderLogo(appInstance);
export const injectFooterContent = () => data.injectFooterContent(appInstance);

// Exportamos la instancia App (para el código HTML onclick)
export const App = appInstance;

// --- code/app.js ---