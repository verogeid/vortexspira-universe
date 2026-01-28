/* --- code/app.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as i18n from './i18n.js';
import * as a11y from './a11y.js';
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
            isNavigatingBack: false, 
        };
        window.App = this; 
        
        // Asignación de utilidades que no requieren wrapper
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
        this._handleActionRowClick = nav_base_details._handleActionRowClick; 
        this.clearConsole = debug.logClear;
    }

    async init() {
        debug.logClear();
        debug.logDebugLevels();
        
        debug._setupGlobalClickListener();
        debug._setupFocusTracker();
        debug._setupFocusMethodInterceptor();
        debug._setupKeyTracker?.(); 
        debug._watchFlag(this.STATE, 'keyboardNavInProgress');
        debug._watchFlag(this.STATE, 'isNavigatingBack');

        a11y.initA11y();

        this._setupSmartResize();
        this._updateLayoutMode();
        this._cacheDOM();
        
        this.DOM.vistaNav = this.DOM.vistaNav || document.getElementById('vista-navegacion-desktop'); 

        let targetLang = i18n.detectBrowserLanguage(); 
        debug.log('app', debug.DEBUG_LEVELS.BASIC, `Idioma detectado: ${targetLang}`);

        let loadSuccess = false;
        try {
            const [stringsLoaded, coursesData] = await Promise.all([
                i18n.loadStrings(targetLang),
                data.loadData(targetLang)
            ]);

            if (stringsLoaded && coursesData) {
                this.STATE.fullData = coursesData;
                loadSuccess = true;
            } else {
                throw new Error("Carga parcial fallida");
            }
        } catch (e) {
            debug.logWarn('app', `Fallo cargando idioma '${targetLang}'. Reintentando con 'es'.`, e);
            if (targetLang !== 'es') {
                try {
                    await i18n.loadStrings('es');
                    this.STATE.fullData = await data.loadData('es');
                    targetLang = 'es'; 
                    loadSuccess = true;
                } catch (errFatal) {
                    debug.logError('app', "CRITICAL: Fallo total de carga.", errFatal);
                    return; 
                }
            }
        }

        if (!loadSuccess) return;

        this.applyStrings(); 
        if (data.injectHeaderContent) data.injectHeaderContent(this);
        if (data.injectFooterContent) data.injectFooterContent(this);

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
        
        this._updateLayoutMode();
        this._syncHeaderDimensions();

        window.addEventListener('vortex-layout-refresh', () => {
            const prevMode = document.body.getAttribute('data-layout');
            this._updateLayoutMode();
            const newMode = document.body.getAttribute('data-layout');
            this._syncHeaderDimensions();

            if (prevMode !== newMode) {
                debug.log('app', debug.DEBUG_LEVELS.IMPORTANT, `Layout Change (${prevMode} -> ${newMode}). Renderizando...`);
                this._cacheDOM();
                
                if (this.STATE.activeCourseId) {
                    this._mostrarDetalle(this.STATE.activeCourseId);
                } else {
                    this.renderNavegacion();
                }
            }
            // Diagnóstico tras refresco de layout
            requestAnimationFrame(() => {
                debug.runFontDiagnostics?.();
                debug.runLayoutDiagnostics?.();
            });
        });
        
        this.STATE.initialRenderComplete = true; 
        debug.log('app', debug.DEBUG_LEVELS.BASIC, "Carga inicial completada.");

        requestAnimationFrame(() => {
            setTimeout(() => {
                document.body.classList.add('app-loaded');
                // Diagnóstico inicial
                debug.runFontDiagnostics?.();
                debug.runLayoutDiagnostics?.();
            }, 100); 
        });
    }

    // ⭐️ WRAPPERS DE NAVEGACIÓN (Para inyectar diagnóstico)
    
    renderNavegacion() {
        render_base.renderNavegacion.call(this);
        // Ejecutar diagnóstico tras renderizar el menú
        requestAnimationFrame(() => {
            debug.runFontDiagnostics?.();
            debug.runLayoutDiagnostics?.();
        });
    }

    _mostrarDetalle(cursoId) { 
        render_details._mostrarDetalle.call(this, cursoId);
        this.STATE.activeCourseId = cursoId; 
        // Ejecutar diagnóstico tras renderizar el detalle
        requestAnimationFrame(() => {
            debug.runFontDiagnostics?.();
            debug.runLayoutDiagnostics?.();
        });
    }

    _handleVolverClick() { 
        if (this.DOM.vistaDetalle.classList.contains('active')) {
             this.STATE.lastDetailFocusIndex = 0;
        }
        nav_base._handleVolverClick.call(this); 
        // Ejecutar diagnóstico al volver
        requestAnimationFrame(() => {
            debug.runFontDiagnostics?.();
            debug.runLayoutDiagnostics?.();
        });
    }

    _updateFocus(shouldSlide) { nav_base._updateFocusImpl.call(this, shouldSlide); }
    _handleTrackClick(e) { nav_base._handleTrackClick.call(this, e); }
    
    _handleCardClick(id, tipo, parentFocusIndex) { nav_base._handleCardClick.call(this, id, tipo, parentFocusIndex); }
    
    _handleActionRowClick(e) { this._handleActionRowClick.call(this, e); }
    getString(key) { return i18n.getString(key); }
    applyStrings() { i18n.applyStrings(this); }

    showToast(message) {
        if (!this.DOM.toast) return;
        this.DOM.toast.textContent = message;
        this.DOM.toast.classList.add('active');
        setTimeout(() => this.DOM.toast.classList.remove('active'), 2000);
    }

    _syncHeaderDimensions() {
        const header = document.getElementById('app-header');
        if (header) {
            const realHeight = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height-real', `${realHeight}px`);
            debug.log('app', debug.DEBUG_LEVELS.DEEP, `A11y Sync: Header mide ${realHeight}px`);
        }
        const footer = document.querySelector('footer');
        if (footer) {
            const realFooterHeight = footer.offsetHeight;
            document.documentElement.style.setProperty('--footer-height-real', `${realFooterHeight}px`);
        }
    }

    _setupSmartResize() {
        let resizeTimer;
        const handleResize = () => {
            this._updateLayoutMode();
            this._syncHeaderDimensions();
            this._cacheDOM(); 
            
            if (this.STATE.fullData) {
                if (this.STATE.activeCourseId) {
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, `SmartResize: Manteniendo vista detalle.`);
                    requestAnimationFrame(() => {
                        this._mostrarDetalle(this.STATE.activeCourseId);
                    });
                } else {
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, `SmartResize: Refrescando menú.`);
                    requestAnimationFrame(() => {
                        this.renderNavegacion();
                    });
                }
            }
        };
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(handleResize, 100); 
        });
    }

    _updateLayoutMode() {
        const rootStyle = getComputedStyle(document.documentElement);
        // 1. Detectar el "Elefante" (Zoom de Accesibilidad)
        const scale = parseFloat(rootStyle.getPropertyValue('--font-scale')) || 1;
        const realWidth = window.innerWidth;
        const realHeight = window.innerHeight;
        
        // 2. Determinar Modo Inicial por ANCHO
        const effectiveWidth = realWidth / scale;
        const effectiveHeight = realHeight / scale;
        
        let candidateMode;
        
        if (effectiveWidth <= data.MAX_WIDTH.MOBILE) {
            candidateMode = 'mobile';
                
        } else if (effectiveWidth <= data.MAX_WIDTH.TABLET_PORTRAIT) {
            candidateMode = 'tablet-portrait';
                
        } else if (effectiveWidth <= data.MAX_WIDTH.TABLET_LANDSCAPE) {
            candidateMode = 'tablet-landscape';

        } else candidateMode = 'desktop';

        // 3. 🚨 LÓGICA DE CAÍDA EN CASCADA (FALLBACK) POR ALTURA 🚨
        // Si no cabe verticalmente, degradamos al siguiente diseño más compacto.

        // Desktop (3 filas) -> Si no cabe, baja a Tablet Landscape (2 filas)
        if (candidateMode === 'desktop') {
            if (effectiveHeight < data.MIN_CONTENT_HEIGHT.DESKTOP) {
                debug.log('app', debug.DEBUG_LEVELS.IMPORTANT, `Fallback Altura: Desktop -> Tablet Landscape`);
                
                candidateMode = 'tablet-landscape';
            }
        }

        // Tablet Landscape (2 filas ancho) -> Si no cabe, baja a Tablet Portrait (2 filas estrecho)
        if (candidateMode === 'tablet-landscape') {
            if (effectiveHeight < data.MIN_CONTENT_HEIGHT.TABLET) {
                debug.log('app', debug.DEBUG_LEVELS.IMPORTANT, `Fallback Altura: Tablet Landscape -> Tablet Portrait`);

                candidateMode = 'tablet-portrait';
            }
        } 

        // Tablet Portrait (2 filas estrecho) -> Si no cabe, baja a Mobile (1 fila)
        if (candidateMode === 'tablet-portrait') {
            if (effectiveHeight < data.MIN_CONTENT_HEIGHT.TABLET) {
                debug.log('app', debug.DEBUG_LEVELS.IMPORTANT, `Fallback Altura: Tablet Portrait -> Mobile`);

                candidateMode = 'mobile';
            }
        } 

        // Safe Mode (Último recurso, SOLO en Mobile)
        // Si ya estamos en Mobile y aun así no cabemos, liberamos el footer.
        let enableSafeMode = false;
        
        if (candidateMode === 'mobile') {
            if (effectiveHeight < data.MIN_CONTENT_HEIGHT.MOBILE) {
                enableSafeMode = true;
            }
        } 

        // 4. Aplicar el Modo Final
        const currentMode = document.body.getAttribute('data-layout');
        if (currentMode !== candidateMode) {
            document.body.setAttribute('data-layout', candidateMode);

            debug.log('app', debug.DEBUG_LEVELS.BASIC, `Layout Final: ${candidateMode} (W:${effectiveWidth.toFixed(0)} / H:${effectiveHeight.toFixed(0)})`);
        }

        const currentSafe = document.body.getAttribute('data-safe-mode') === 'true';
        if (enableSafeMode !== currentSafe) {
            document.body.setAttribute('data-safe-mode', enableSafeMode ? 'true' : 'false');
            
            debug.log('app', debug.DEBUG_LEVELS.IMPORTANT, 
                `🛡️ Safe Mode: ${enableSafeMode ? 'ON' : 'OFF'} (Solo Mobile) | Eff.Height: ${effectiveHeight.toFixed(0)}px`);
            
            if (!enableSafeMode) {
                window.scrollTo(0, 0);
                if (this.STATE.carouselInstance) requestAnimationFrame(() => this.STATE.carouselInstance.update());
            }
        }
    }
    
    _cacheDOM() {
        const layout = document.body.getAttribute('data-layout') || 'desktop';
        const isMobile = layout === 'mobile';
        const isDesktopView = layout === 'desktop'; 
        
        debug.log('app', debug.DEBUG_LEVELS.DEEP, `Refrescando caché DOM. Modo: ${layout}`);

        this.DOM.vistaDetalleDesktop = document.getElementById('vista-detalle-desktop');
        this.DOM.vistaDetalleMobile = document.getElementById('vista-detalle-mobile');
        
        this.DOM.vistaDetalle = isMobile ? this.DOM.vistaDetalleMobile : this.DOM.vistaDetalleDesktop;
        this.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop');
        
        this.DOM.header = document.getElementById('app-header');
        this.DOM.btnA11y = document.getElementById('btn-config-accesibilidad');
        this.DOM.cardVolverFija = document.getElementById('vista-volver');
        this.DOM.cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento');
        this.DOM.infoAdicional = document.getElementById('info-adicional');
        this.DOM.cardNivelActual = document.getElementById('card-nivel-actual');
        this.DOM.appContainer = document.getElementById('app-container');
        this.DOM.toast = document.getElementById('toast-notification'); 

        if (isMobile) {
            this.DOM.vistaNav = document.getElementById('vista-navegacion-mobile');
            this.DOM.track = document.getElementById('track-mobile');
        } else if (isDesktopView) {
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
export const injectHeaderContent = () => data.injectHeaderContent(appInstance);
export const injectFooterContent = () => data.injectFooterContent(appInstance);
export const App = appInstance;

/* --- code/app.js --- */