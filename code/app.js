// --- code/app.js (CLASE PRINCIPAL Y ENTRY POINT) ---

// Importaciones de módulos de la aplicación
import * as data from './data.js';
import * as debug from './debug.js';
import * as i18n from './i18n.js';
import * as nav_stack from './nav-stack.js';

// Importaciones de funciones de nav-base y render-base (como helpers)
import * as nav_base from './nav-base.js';
import * as render_base from './render-base.js';
import * as nav_keyboard from './nav-keyboard.js';
import * as nav_tactil from './nav-tactil.js';
import * as render_swipe from './render-swipe.js';
import * as render_mobile from './render-mobile.js';

class VortexSpiraApp {
    
    constructor() {
        this.DOM = {}; 
        this.STATE = {
            fullData: null,          
            historyStack: [],        
            itemsPorColumna: 3,      
            carouselInstance: null,  
            resizeObserver: null,    
            currentFocusIndex: 0,    
            initialRenderComplete: false, 
            keyboardNavInProgress: false 
        };
        
        // ⭐️ Exposición temporal para onclick en HTML (patrón mixto) ⭐️
        window.App = this; 
        
        // --- INYECCIÓN DE HELPERS DE MÓDULOS EN LA INSTANCIA (Delegación de contexto) ---
        // Stack de Navegación
        this.stackInitialize = nav_stack.stackInitialize;
        this.stackGetCurrent = nav_stack.stackGetCurrent;
        this.stackPop = nav_stack.stackPop;
        this.stackPush =nav_stack.stackPush;
        this.stackUpdateCurrentFocus = nav_stack.stackUpdateCurrentFocus;
        this.stackBuildFromId = nav_stack.stackBuildFromId;

        // Helpers de Búsqueda y Estado
        this._findNodoById = nav_base._findNodoById;
        this._tieneContenidoActivo = nav_base._tieneContenidoActivoImpl;

        // Funciones de Renderizado
        this._generarTarjetaHTML = render_base._generarTarjetaHTMLImpl; 
        this._generateCardHTML_Carousel = render_swipe._generateCardHTML_Carousel;
        this._generateCardHTML_Mobile = render_mobile._generateCardHTML_Mobile;
        this._initCarousel_Swipe = render_swipe._initCarousel_Swipe;
        this._initCarousel_Mobile = render_mobile._initCarousel_Mobile;
        this._destroyCarousel = render_swipe._destroyCarouselImpl;
    }

    // -----------------------------------------------------------------
    // ⭐️ MÉTODOS PÚBLICOS Y DE INICIALIZACIÓN ⭐️
    // -----------------------------------------------------------------
    
    async init() {
        debug.log('app', debug.DEBUG_LEVELS.BASIC, "App: Iniciando orquestación (POO)...");
        
        this._setupGlobalDebugListeners();
        this._cacheDOM();

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
        nav_keyboard.initKeyboardControls.call(this);
        render_base._setupResizeObserver.call(this); 
        
        this.STATE.initialRenderComplete = true; 
        debug.log('app', debug.DEBUG_LEVELS.BASIC, "Carga inicial completada.");
    }

    // -----------------------------------------------------------------
    // ⭐️ MÉTODOS DE SERVICIO Y DELEGACIÓN ⭐️
    // -----------------------------------------------------------------
    
    // Renderizado
    renderNavegacion() { render_base.renderNavegacion.call(this); }
    _updateFocus(shouldSlide) { nav_base._updateFocusImpl.call(this, shouldSlide); }

    // Handlers (Invocados por onclick)
    _handleTrackClick() { nav_base._handleTrackClick.call(this); }
    _handleVolverClick() { nav_base._handleVolverClick.call(this); }
    _handleCardClick(id, tipo, parentFocusIndex) { nav_base._handleCardClick.call(this, id, tipo, parentFocusIndex); }
    _mostrarDetalle(cursoId) { nav_base._mostrarDetalle.call(this, cursoId); }
    
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
    }
    
    /**
     * Configura el listener de clic global para depuración.
     */
    _setupGlobalDebugListeners() {
        if (debug.DEBUG_CONFIG.global > debug.DEBUG_LEVELS.DISABLED) {
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