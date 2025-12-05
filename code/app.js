// --- code/app.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as i18n from './i18n.js';
import * as nav_stack from './nav-stack.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js';
import * as nav_keyboard_base from './nav-keyboard-base.js';
import * as nav_keyboard_details from './nav-keyboard-details.js';
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js';
import * as nav_mouse_details from './nav-mouse-details.js';
import * as nav_mouse_swipe from './nav-mouse-swipe.js';
import * as render_base from './render-base.js';
import * as render_details from './render-details.js';
import * as render_swipe from './render-swipe.js';

class App {
    constructor() {
        debug.log('global', debug.DEBUG_LEVELS.BASIC, 'VortexSpira Universe - Versión ' + data.VERSION);

        this.DOM = {
            header: document.querySelector('header'),
            appContainer: document.getElementById('app-container'),
            vistaCentral: document.getElementById('vista-central'),
            // Navigation
            vistaNav: document.getElementById('vista-navegacion'),
            track: document.getElementById('nav-track'),
            cardNivelActual: document.getElementById('card-nivel-actual'),
            cardVolverFija: document.getElementById('card-volver-fija'),
            cardVolverFijaElemento: document.getElementById('card-volver-fija-elemento'),
            // Details
            vistaDetalle: document.getElementById('vista-detalle-desktop'), // Default to desktop
            detalleContenido: document.getElementById('detalle-contenido-desktop'), // Default to desktop
            // Mobile
            vistaNavMobile: document.getElementById('vista-navegacion-mobile'),
            vistaDetalleMobile: document.getElementById('vista-detalle-mobile'),
        };

        this.STATE = {
            historyStack: [], // Pila de navegación
            activeLevelId: data.ROOT_LEVEL_ID, // Nivel actual visible
            activeCourseId: null, // Curso de detalle activo
            fullData: null, // Cursos.json completo
            currentLevelData: null, // Datos del nivel actual para renderizado
            lastFocusCard: null, // Última tarjeta enfocada
            lastDetailFocusIndex: 0, // Último fragmento de detalle enfocado
            carouselInstance: null, // Instancia de Swiper
            isDataLoaded: false,
            isMobile: window.innerWidth <= data.MOBILE_MAX_WIDTH,
            isTablet: window.innerWidth >= data.TABLET_MIN_WIDTH && window.innerWidth <= data.TABLET_MAX_WIDTH,
            language: data.DEFAULT_LANGUAGE
        };
        
        // --- INYECCIÓN DE HELPERS DE MÓDULOS EN LA INSTANCIA (Delegación de contexto) ---

        // Navegación Stack
        this.stackPush = nav_stack.pushState.bind(this);
        this.stackPop = nav_stack.popState.bind(this);
        this.stackGetCurrent = nav_stack.getCurrentState.bind(this);
        this.stackGetPrevious = nav_stack.getPreviousState.bind(this);
        this.stackReset = nav_stack.resetStack.bind(this);

        // Helpers de Búsqueda y Estado
        // ⭐️ CORRECCIÓN: Delegación de _findNodoById movida a nav_base ⭐️
        this._findNodoById = nav_base._findNodoById.bind(this); 
        this._getString = i18n.getString.bind(this);

        // Navegación / Render Base
        this._init = render_base._init.bind(this);
        this._loadData = render_base._loadData.bind(this);
        this._mostrarNivel = render_base._mostrarNivel.bind(this);
        this._resetVistaDetalle = render_base._resetVistaDetalle.bind(this);

        // Render Detalle
        this._mostrarDetalle = render_details._mostrarDetalle.bind(this);

        // Handlers de Eventos
        this._handleCardClick = nav_base._handleCardClick.bind(this);
        this._handleVolverClick = nav_base._handleVolverClick.bind(this);
        this._handleActionRowClick = nav_base_details._handleActionRowClick.bind(this);
        this._handleResize = nav_base._handleResize.bind(this);

        // Handlers de Teclado
        this.handleKeyDownBase = nav_keyboard_base.handleKeyDownBase.bind(this);
        this.handleKeyDownDetails = nav_keyboard_details.handleKeyDownDetails.bind(this);
        this.handleKeyDownSwipe = nav_keyboard_swipe.handleKeyDownSwipe.bind(this);

        // Handlers de Mouse/Touch
        this.setupMouseListeners = nav_mouse_details.setupMouseListeners.bind(this);
        this.setupTouchListeners = nav_mouse_swipe.setupTouchListeners.bind(this);
        this.handleTouchStart = nav_mouse_swipe.handleTouchStart.bind(this);
        this.handleTouchMove = nav_mouse_swipe.handleTouchMove.bind(this);
        this.handleTouchEnd = nav_mouse_swipe.handleTouchEnd.bind(this);

        // Métodos de Carousel/Swipe
        this._destroyCarousel = render_swipe._destroyCarousel.bind(this);
        this._initCarousel = render_swipe._initCarousel.bind(this);

        debug.log('global', debug.DEBUG_LEVELS.VERBOSE, 'App constructor finalizado.');
    }

    async start() {
        debug.log('global', debug.DEBUG_LEVELS.BASIC, 'App iniciando...');
        
        try {
            await this._loadData(); // Carga de JSON
            i18n.loadLanguage(this.STATE.language, this.STATE.fullData.i18n);
            this._init();
            
            // Render inicial
            this._mostrarNivel(data.ROOT_LEVEL_ID);

            window.addEventListener('resize', this._handleResize);
            document.addEventListener('keydown', this.handleKeyDownBase);

            debug.log('global', debug.DEBUG_LEVELS.BASIC, 'App iniciada correctamente.');
            
        } catch (error) {
            debug.logError('global', 'Error al iniciar la aplicación:', error);
        }
    }
    
    // Métodos delegados para uso desde el DOM (window.App.method())
    _handleCardClick(event) { nav_base._handleCardClick.call(this, event); }
    _handleVolverClick() { nav_base._handleVolverClick.call(this); }
    _handleActionRowClick(event) { nav_base_details._handleActionRowClick.call(this, event); }
    
    // ❌ ELIMINADO: renderNavegacion ya no existe y causaba TypeError.
}

// Globalizar la instancia para acceso desde el DOM
window.App = new App();

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.App.start();
});

// --- code/app.js ---