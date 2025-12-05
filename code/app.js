// --- code/app.js ---

import * as data from './data.js';
import * as i18n from './i18n.js';
import * as debug from './debug.js';
import * as render_base from './render-base.js';
import * as render_swipe from './render-swipe.js';
import * as render_mobile from './render-mobile.js';
import * as nav_stack from './nav-stack.js';
import * as nav_base from './nav-base.js';
import * as nav_keyboard_base from './nav-keyboard-base.js';
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js';
import * as nav_mouse_swipe from './nav-mouse-swipe.js';
// ⭐️ NUEVOS MÓDULOS DETALLE REFRACTORIZADOS ⭐️
import * as render_details from './render-details.js'; 
import * as nav_base_details from './nav-base-details.js';
import * as nav_keyboard_details from './nav-keyboard-details.js';

/**
 * Clase principal de la aplicación.
 */
class App {
    constructor() {
        this.DOM = {
            appContainer: document.getElementById('app-container'),
            header: document.querySelector('header'),
            vistaNav: document.getElementById('vista-navegacion'),
            vistaDetalle: document.getElementById('vista-detalle-desktop'),
            detalleContenido: document.getElementById('detalle-contenido-desktop'),
            cardVolverFija: document.getElementById('card-volver-fija'),
            cardVolverFijaElemento: document.getElementById('card-volver-fija-elemento'),
            infoAdicional: document.getElementById('info-adicional'),
            // Referencias a los contenedores móviles (actualizadas en render-base)
            vistaNavMobile: document.getElementById('vista-navegacion-mobile'),
            vistaDetalleMobile: document.getElementById('vista-detalle-mobile'),
            headerMobile: document.querySelector('header .header-mobile-wrapper'),
            mobileBackHeader: document.querySelector('.mobile-back-header')
        };
        
        this.STATE = {
            currentLevel: data.ROOT_LEVEL_ID, // ID del nivel actual (menú)
            previousLevel: null,
            fullData: null,
            // ⭐️ Estado del Swiper de Detalle ⭐️
            detailCarouselInstance: null, 
            navCarouselInstance: null, // Instancia del Swiper de Navegación (menús)
            navigationStack: [], // Pila para retroceder en la navegación
            lastDetailFocusIndex: 0, // Índice del último fragmento de detalle enfocado
            isInitializing: true,
            isMobile: window.innerWidth <= data.MOBILE_MAX_WIDTH,
        };
        
        // ⭐️ DELEGACIONES DE FUNCIONES (AÑADIDAS/ACTUALIZADAS) ⭐️
        this._init = render_base._init.bind(this);
        this._loadData = render_base._loadData.bind(this);
        this._findNodoById = render_base._findNodoById.bind(this);
        this._getString = i18n.getString.bind(this);
        
        // Navegación / Render Base
        this._mostrarNivel = render_base._mostrarNivel.bind(this);
        this._resetVistaDetalle = render_base._resetVistaDetalle.bind(this);
        this._handleCardClick = render_base._handleCardClick.bind(this);
        
        // Navegación Táctil (Swipe)
        this._initCarousel_Nav = render_swipe._initCarousel_Nav.bind(this);
        this._handleSwipeCardClick = render_swipe._handleSwipeCardClick.bind(this);
        this._slideNavTo = nav_mouse_swipe._slideNavTo.bind(this);
        
        // Lógica de Detalle
        this._mostrarDetalle = render_details._mostrarDetalle.bind(this); 
        this._updateDetailFocusState = nav_base_details._updateDetailFocusState.bind(this);
        this._handleActionRowClick = nav_base_details._handleActionRowClick.bind(this); // ⭐️ NUEVA DELEGACIÓN ⭐️
        
        // Teclado
        this._handleKeyDown = nav_keyboard_base._handleKeyDown.bind(this);
        this._handleNavigation = nav_keyboard_swipe._handleNavigation.bind(this);
        this._handleDetailNavigation = nav_keyboard_details._handleDetailNavigation.bind(this); 
        this._handleFocusTrap = nav_keyboard_base._handleFocusTrap.bind(this);
        this._handleVolverClick = nav_base._handleVolverClick.bind(this); 

        // Pila de Navegación
        this.stackPush = nav_stack.stackPush.bind(this);
        this.stackPop = nav_stack.stackPop.bind(this);
        this.stackGetCurrent = nav_stack.stackGetCurrent.bind(this);
    }

    /**
     * Inicia la aplicación.
     */
    async start() {
        debug.log('App', debug.DEBUG_LEVELS.BASIC, 'Aplicación iniciada.');
        await this._loadData();
        
        // 1. Inicializar estructura base
        this._init();
        
        // 2. Mostrar el nivel raíz por defecto
        this._mostrarNivel(this.STATE.currentLevel);
        
        // 3. Inicializar los listeners de navegación (Base, Teclado, Ratón, Redimensionamiento)
        nav_base._setupListeners.call(this);
        this._initCarousel_Nav();
        
        this.STATE.isInitializing = false;
        debug.log('App', debug.DEBUG_LEVELS.BASIC, 'Inicialización completa.');
    }
}

// Globalizar la instancia para acceso desde el DOM (onclick/onresize)
window.App = new App();

// Iniciar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    window.App.start();
});

// --- code/app.js ---