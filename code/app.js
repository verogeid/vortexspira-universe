/* --- code/app.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as i18n from './i18n.js';
import * as nav_stack from './nav-stack.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js'; 
import * as render_details from './render-details.js'; 
import * as render_base from './render-base.js';
import * as nav_keyboard_base from './nav-keyboard-base.js'; 
import * as nav_keyboard_details from './nav-keyboard-details.js'; 
import * as nav_mouse_swipe from './nav-mouse-swipe.js';
import * as render_swipe from './render-swipe.js';
import * as render_mobile from './render-mobile.js';

class VortexSpiraApp {
    constructor() {
        debug._setupConsoleInterceptor();
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
            isNavigatingBack: false, // Bloqueo para evitar repeticiones en el "Volver"
        };
        window.App = this; 
        
        this.stackInitialize = nav_stack.stackInitialize;
        this.stackGetCurrent = nav_stack.stackGetCurrent;
        this.stackPop = nav_stack.stackPop;
        this.stackPush = nav_stack.stackPush;
        this.stackUpdateCurrentFocus = nav_stack.stackUpdateCurrentFocus;
        this.stackBuildFromId = nav_stack.stackBuildFromId;

        this._findNodoById = nav_base._findNodoById;
        this._tieneContenidoActivo = nav_base._tieneContenidoActivoImpl;
        this.findBestFocusInColumn = nav_base.findBestFocusInColumn;

        this._generarTarjetaHTML = render_base._generarTarjetaHTMLImpl; 
        this._generateCardHTML_Carousel = render_swipe._generateCardHTML_Carousel;
        this._generateCardHTML_Mobile = render_mobile._generateCardHTML_Mobile;
        this._initCarousel_Swipe = render_swipe._initCarousel_Swipe;
        this._initCarousel_Mobile = render_mobile._initCarousel_Mobile;
        this._destroyCarousel = render_swipe._destroyCarouselImpl;
        
        this.setupTouchListeners = nav_mouse_swipe.setupTouchListeners;
        this.renderNavegacion = render_base.renderNavegacion; 
        this._handleActionRowClick = nav_base_details._handleActionRowClick; 
        this._mostrarDetalle = render_details._mostrarDetalle;             
        this.clearConsole = debug.logClear;
    }

    async init() {
        debug.logClear();
        debug._setupGlobalClickListener();
        debug._setupFocusTracker();
        debug._setupFocusMethodInterceptor();
        debug._setupKeyTracker?.(); 
        debug._watchFlag(this.STATE, 'keyboardNavInProgress');
        debug._watchFlag(this.STATE, 'isNavigatingBack');

        this._cacheDOM();
        
        this.DOM.vistaNav = this.DOM.vistaNav || document.getElementById('vista-navegacion-desktop'); 

        try {
            this.STATE.fullData = await data.loadData(); 
        } catch (error) {
            debug.logError('app', "ERROR: Carga de datos fallida. " + error.message);
            return;
        }

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

        nav_base.setupListeners.call(this);
        nav_keyboard_base.initKeyboardControls.call(this); 
        render_base._setupResizeObserver.call(this); 
        
        this.STATE.initialRenderComplete = true; 
        debug.log('app', debug.DEBUG_LEVELS.BASIC, "Carga inicial completada.");
    }

    _updateFocus(shouldSlide) { nav_base._updateFocusImpl.call(this, shouldSlide); }
    _handleTrackClick(e) { nav_base._handleTrackClick.call(this, e); }
    _handleVolverClick() { 
        if (this.DOM.vistaDetalle.classList.contains('active')) {
             this.STATE.lastDetailFocusIndex = 0;
        }
        nav_base._handleVolverClick.call(this); 
    }
    _handleCardClick(id, tipo, parentFocusIndex) { nav_base._handleCardClick.call(this, id, tipo, parentFocusIndex); }
    _mostrarDetalle(cursoId) { 
        this._mostrarDetalle.call(this, cursoId); 
        this.STATE.activeCourseId = cursoId; 
    }
    _handleActionRowClick(e) { this._handleActionRowClick.call(this, e); }
    getString(key) { return i18n.getString(key); }
    applyStrings() { i18n.applyStrings(this); }

    showToast(message) {
        if (!this.DOM.toast) return;
        this.DOM.toast.textContent = message;
        this.DOM.toast.classList.add('active');
        setTimeout(() => this.DOM.toast.classList.remove('active'), 2000);
    }
    
    _cacheDOM() {
        const width = window.innerWidth;
        const isMobile = width <= data.MOBILE_MAX_WIDTH;
        const isDesktop = width >= data.TABLET_LANDSCAPE_MAX_WIDTH;
        
        // Logs de depuración para confirmar el refresco
        debug.log('app', debug.DEBUG_LEVELS.BASIC, `DEBUG_DOM: Refrescando caché. Ancho: ${width}`);

        this.DOM.vistaDetalleDesktop = document.getElementById('vista-detalle-desktop');
        this.DOM.vistaDetalleMobile = document.getElementById('vista-detalle-mobile');
        
        // ⭐️ CLAVE: La referencia 'vistaDetalle' debe cambiar según el modo ⭐️
        this.DOM.vistaDetalle = isMobile ? this.DOM.vistaDetalleMobile : this.DOM.vistaDetalleDesktop;
        this.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop');
        
        // Referencias fijas
        this.DOM.header = document.getElementById('app-header');
        this.DOM.btnA11y = document.getElementById('btn-config-accesibilidad');
        this.DOM.cardVolverFija = document.getElementById('vista-volver');
        this.DOM.cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento');
        this.DOM.infoAdicional = document.getElementById('info-adicional');
        this.DOM.cardNivelActual = document.getElementById('card-nivel-actual');
        this.DOM.appContainer = document.getElementById('app-container');

        // ⭐️ CLAVE: Actualizar a qué track y vistaNav apuntamos ⭐️
        if (isMobile) {
            this.DOM.vistaNav = document.getElementById('vista-navegacion-mobile');
            this.DOM.track = document.getElementById('track-mobile');
        } else if (isDesktop) {
            this.DOM.vistaNav = document.getElementById('vista-navegacion-desktop');
            this.DOM.track = document.getElementById('track-desktop');
        } else {
            this.DOM.vistaNav = document.getElementById('vista-navegacion-tablet');
            this.DOM.track = document.getElementById('track-tablet');
        }
    }
}

const appInstance = new VortexSpiraApp();
export const init = () => appInstance.init();
export const applyStrings = () => appInstance.applyStrings();
export const injectHeaderLogo = () => data.injectHeaderLogo(appInstance);
export const injectFooterContent = () => data.injectFooterContent(appInstance);
export const App = appInstance;

/* --- code/app.js --- */