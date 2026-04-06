/* --- code/core/app.js --- */

import * as debug from '../debug/debug.js';

import * as data from '../services/data.js';
import * as app_utils from '../services/app-utils.js';

import * as app_feedback from '../features/a11y/app-feedback.js';
import * as app_layout from './app-layout.js';
import * as app_router from './app-router.js';
import * as app_events from './app-events.js';

import * as i18n from '../services/i18n.js';
import * as a11y from '../features/a11y/a11y.js';

import * as nav_stack from '../features/navigation/nav-stack.js';
import * as nav_base from '../features/navigation/nav-base.js';
import * as nav_base_details from '../features/navigation/nav-base-details.js'; 

import * as render_base from '../render/render-base.js';

class VortexSpiraApp {
    constructor() {
        debug._setupConsoleInterceptor();

        this.DOM = {}; 

        this.STATE = {
            currentTraceId: null,
            fullData: null,          
            historyStack: [],        
            itemsPorColumna: 3,      
            carouselInstance: null,  
            resizeObserver: null,    
            currentFocusIndex: 0,   
            _lastMousedownTarget: null,
            initialRenderComplete: false, 
            keyboardNavInProgress: false,
            activeCourseId: null, 
            isSpecialViewActive: false,
            _lastDetailFocusIndex: 0, 
            isNavigatingBack: false, 
            _isDraggingSwiper: false,
            isUIBlocked: false,
            isBooting: true, 
            isTouchDevice: app_layout.isTouchDevice(),
            pendingA11yContext: null,
            emptyColumnAnnounced: false, // Para evitar repetir anuncio de "Columna vacía"
            pendingLoopFix: false, // 🟢 Semáforo para el arreglo del loop
            _lastAnnounced: null // Memoria para el anti-spam
        };
        window.App = this; 
        
        // Asignación de utilidades que no requieren wrapper
        this.stackInitialize = nav_stack.stackInitialize;
        this.stackGetCurrent = nav_stack.stackGetCurrent;
        this.stackPop = nav_stack.stackPop;
        this.stackPush = nav_stack.stackPush;
        this.stackUpdateCurrentFocus = nav_stack.stackUpdateCurrentFocus;
        this.stackBuildFromId = nav_stack.stackBuildFromId;

        // 🟢 INTERCEPTOR DE DATOS: Delegado a app-utils
        this._originalFindNodoById = nav_base._findNodoById;
        this._findNodoById = (id, items) => {
            if (id === 'c-about') return app_utils.buildAboutNode(this);
            return this._originalFindNodoById(id, items);
        };

        this._tieneContenidoActivo = nav_base._tieneContenidoActivoImpl;

        this._generarTarjetaHTML = render_base._generarTarjetaHTMLImpl; 

        // 🟢 DESTRUCTOR UNIVERSAL (Garantiza que móvil pueda limpiar su Swiper)
        // Se ejecuta si 'render-swipe.js' no se ha descargado aún.
        this._destroyCarousel = () => {
            if (this.STATE.carouselInstance) {

                debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                    '🧹 Destruyendo instancia de Swiper activa...');

                this.STATE.carouselInstance.destroy(true, true);
                this.STATE.carouselInstance = null;
            }
        };

        this._generarTarjetaHTML = render_base._generarTarjetaHTMLImpl;
        
        this._handleActionRowClick = nav_base_details._handleActionRowClick; 
        
        // 🟢 PUENTE ASÍNCRONO: Si pulsan teclas en detalles, aseguramos que exista
        this._handleDetailNavigation = async (key) => {
            const mods = await app_utils.loadDetailsModules(this);
            if (mods) mods.keyboard._handleDetailNavigation.call(this, key);
        };
    }

    // 🟢 HELPER MEJORADO: Inyector de CSS Asíncrono
    _injectCSS(href, id) {
        return new Promise((resolve) => {
            let link = document.getElementById(id);
            const absoluteHref = new URL(href, document.baseURI).href;
            
            if (!link) {
                link = document.createElement('link');
                link.id = id;
                link.rel = 'stylesheet';
                
                // ⭐️ El secreto: Esperamos a que el CSS cargue para avisar
                link.onload = () => resolve();
                link.onerror = () => resolve(); // Si falla, resolvemos igual para no bloquear la app
                
                link.href = href;
                document.head.appendChild(link);
            } else {
                if (link.href !== absoluteHref) {
                    link.onload = () => resolve();
                    link.onerror = () => resolve();
                    link.href = href;
                } else {
                    resolve(); // Ya estaba cargado de antes
                }
            }
        });
    }

    // 🟢 LAZY LOAD GEOMÉTRICO: Carga de motores de renderizado
    async _ensureRenderEngine() {
        const layout = document.body.getAttribute('data-layout') || 'desktop';
        
        if (layout === 'mobile' && !this._initCarousel_Mobile) {
            this.blockUI(); // Protegemos la UI si la red es lenta
            try {
                const render_mobile = await import('../render/render-mobile.js');
                this._initCarousel_Mobile = render_mobile._initCarousel_Mobile;
                this._generateCardHTML_Mobile = render_mobile._generateCardHTML_Mobile;

                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    "📱 Módulo Render Mobile cargado dinámicamente");

            } catch(e) {
                debug.logError('app', 'Fallo al cargar motor móvil', e);
            }
            this.unblockUI();
            
        } else if (layout !== 'mobile' && !this._initCarousel_Swipe) {
            this.blockUI();
            try {
                const render_swipe = await import('../render/render-swipe.js');
                this._initCarousel_Swipe = render_swipe._initCarousel_Swipe;
                this._generateCardHTML_Carousel = render_swipe._generateCardHTML_Carousel;
                this._destroyCarousel = render_swipe._destroyCarouselImpl;

                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    "💻 Módulo Render Desktop/Tablet cargado dinámicamente");
            } catch(e) {
                debug.logError('app', 'Fallo al cargar motor desktop', e);
            }
            this.unblockUI();
        }
    }

    async init() {
        debug.logClear();
        debug.logDebugLevels();
        
        // 🟢 DETECCIÓN DE TERMINAL (Touch vs Mouse)
        document.body.setAttribute('data-terminal', this.STATE.isTouchDevice ? 'touch' : 'mouse');

        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
            `Terminal detectado: ${this.STATE.isTouchDevice ? 'Touch' : 'Mouse'}`);

        // Mantenemos isBooting = true por defecto desde el constructor
        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
            "🚀 Iniciando App (Modo Silencioso activado)...");

        if (!debug.isMuted) {
            // 🟢 INYECCIÓN DINÁMICA DE HERRAMIENTAS DE DEBUG
            // 1. Simulador SEO / LD-JSON
            if (debug.DEBUG_CONFIG.seo_sim >= debug.DEBUG_LEVELS.BASIC) {
                import('../debug/debug.ldJsonSim.js').then(m => m.ldJsonSim.init())
                    .catch(e => debug.logError('app', 'Error cargando ldJsonSim', e));
            }

            // 2. Diagnósticos de Layout, Focos y Teclado
            const loadDiag = debug.DEBUG_CONFIG.global >= debug.DEBUG_LEVELS.DISABLED ||
                            debug.DEBUG_CONFIG.global_focus >= debug.DEBUG_LEVELS.DISABLED ||
                            debug.DEBUG_CONFIG.global_font >= debug.DEBUG_LEVELS.DISABLED ||
                            debug.DEBUG_CONFIG.global_layout >= debug.DEBUG_LEVELS.DISABLED ||
                            debug.DEBUG_CONFIG.global_key >= debug.DEBUG_LEVELS.DISABLED ||
                            debug.DEBUG_CONFIG.global_mouse >= debug.DEBUG_LEVELS.DISABLED;
            
            if (loadDiag) {
                import('../debug/debug.diagnostics.js').then(d => {
                    d._setupGlobalClickListener();
                    d._setupFocusTracker();
                    d._setupFocusMethodInterceptor();
                    if (d._setupKeyTracker) d._setupKeyTracker();

                    d._watchFlag(this.STATE, 'keyboardNavInProgress');
                    d._watchFlag(this.STATE, 'isKeyboardLockedFocus');
                    d._watchFlag(this.STATE, 'isNavigatingBack');
                    d._watchFlag(this.STATE, 'isUIBlocked');
                    d._watchFlag(this.STATE, '_lastMousedownTarget');
                    d._watchFlag(this.STATE, '_lastActiveZoneId');

                    // 🟢 Guardamos las funciones en la instancia para uso posterior
                    this._runFontDiagnostics = d.runFontDiagnostics;
                    this._runLayoutDiagnostics = d.runLayoutDiagnostics;
                }).catch(e => debug.logError('app', 'Error cargando diagnostics', e));
            }

            // 3. Simulador de Lector de Pantallas
            // Lo exponemos globalmente para que puedas llamarlo desde la consola si lo necesitas
            window.simularLector = () => {
                import('../debug/debug.screenReaderSim.js').then(m => {
                    window.simularLector = m.enableScreenReaderSimulator;
                    m.enableScreenReaderSimulator();
                }).catch(e => debug.logError('app', 'Error cargando SR Sim', e));
            };
            
            // Si la configuración es EXTREME, lo auto-arrancamos
            if (debug.DEBUG_CONFIG.a11y >= debug.DEBUG_LEVELS.EXTREME) {
                window.simularLector();
            }
        }

        this._setupSmartResize();
        this._updateLayoutMode();
        this._cacheDOM();

        // 🟢 Aseguramos el motor correcto para la resolución de arranque
        await this._ensureRenderEngine();
        
        this.DOM.vistaNav = this.DOM.vistaNav || 
                            document.getElementById('vista-navegacion-desktop'); 

        // 🟢 EXTRAER PARÁMETROS DE URL
        const url = new URL(window.location);
        const urlLang = url.searchParams.get('lang');
        const targetId = url.searchParams.get('id');

        let targetLang;
        let langSource = '';

        // 🟢 FIX I18N: Determinar idioma con nueva jerarquía de prioridades
        if (urlLang && ['es', 'en'].includes(urlLang.toLowerCase())) {
            // 1. Prioridad absoluta: Parámetro URL explícito
            targetLang = urlLang.toLowerCase();
            langSource = 'URL';
            // Guardamos esta preferencia inmediatamente para que persista si navega sin parámetros
            localStorage.setItem('vortex_lang', targetLang);
        } else {
            // 2 y 3. Prioridad secundaria: LocalStorage -> Navegador
            targetLang = localStorage.getItem('vortex_lang') || i18n.detectBrowserLanguage(); 
            langSource = localStorage.getItem('vortex_lang') ? 'Storage' : 'Browser';
            
            // 🟢 FIX URL: Forzamos el idioma en la URL (creándolo si no existe o actualizándolo)
            url.searchParams.set('lang', targetLang);
            window.history.replaceState({}, '', url);
        }

        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    `Idioma inicial: ${targetLang} (Origen: ${langSource})`);

        let loadSuccess = false;

        // 2. Intentar cargar el idioma objetivo
        try {
            const [stringsLoaded, coursesData] = await Promise.all([
                i18n.loadStrings(targetLang),
                app_utils.loadData(targetLang)
            ]);

            if (stringsLoaded && coursesData) {
                this.STATE.fullData = coursesData;
                loadSuccess = true;
            } else {
                throw new Error("Carga parcial fallida");
            }
        } catch (e) {
            debug.logWarn('app', 
                `Fallo cargando idioma '${targetLang}'. Reintentando con 'es'.`, e);

            // Fallback a Español si falla el objetivo
            if (targetLang !== 'es') {
                try {
                    await i18n.loadStrings('es');
                    this.STATE.fullData = await app_utils.loadData('es');
                    targetLang = 'es'; // Forzamos español porque el otro falló
                    loadSuccess = true;
                    // También actualizamos localStorage para no fallar en la próxima recarga
                    localStorage.setItem('vortex_lang', targetLang);

                    url.searchParams.set('lang', targetLang); 
                    window.history.replaceState({}, '', url);

                } catch (errFatal) {
                    debug.logError('app', "CRITICAL: Fallo total de carga.", errFatal);

                    return; 
                }
            }
        }

        if (!loadSuccess) return;

        // 3. Determinar si habilitamos el botón de idioma (I18N)
        // Si estamos en EN, es obvio que existe. Si estamos en ES, verificamos si existe EN.
        let enableI18n = false;
        if (targetLang === 'en') {
            enableI18n = true;
        } else {
            // Estamos en ES, chequeamos si EN está disponible
            enableI18n = await this._checkEnAvailability();
        }

        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
            `I18N Habilitado: ${enableI18n}`);

        a11y.initA11y();

        this.applyStrings(); 

        // 🟢 1. PREPARAR LOCUTOR TEMPRANO
        this._injectA11yAnnouncer();

        // 🟢 2. AVISO DE BIENVENIDA (Universal, sin hardcodear español)
        let appName = this.getString('header.title');
        
        // 🟢 FIX: En lugar de gritarlo, lo guardamos para el primer elemento enfocado
        this.STATE.pendingA11yContext = appName;

        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME,
            `[app.init] Pending A11y Context actualizado: ${this.STATE.pendingA11yContext}`);

        // Pasamos el flag enableI18n a injectHeaderContent
        if (app_utils.injectHeaderContent) 
            app_utils.injectHeaderContent(this, enableI18n);

        if (app_utils.injectFooterContent) 
            app_utils.injectFooterContent(this);

        // 🟢 FIX CRÍTICO: Recalibración síncrona OBRIGATORIA antes de renderizar.
        // Garantiza que el motor de renderizado y la caché del DOM leen el layout final 
        // ya afectado por las preferencias de accesibilidad (tamaño de la fuente, etc.)
        this._updateLayoutMode();
        this._syncHeaderDimensions();
        this._cacheDOM();

        if (targetId) {
            // 🟢 FIX: Si se hace F5 o se comparte un enlace directo
            if (targetId === 'c-about') {
                this._mostrarAbout();

            } else if (this.stackBuildFromId(targetId, this.STATE.fullData)) { 
                const nodo = this._findNodoById(targetId, this.STATE.fullData.navegacion);

                if (nodo && nodo.titulo) { 
                    this._mostrarDetalle(targetId);

                } else {
                    this.renderNavegacion();
                }
            } else {
                // 🟢 ID ROTO DETECTADO DURANTE EL ARRANQUE
                this.stackInitialize(); 
                
                // Inyectamos el error en el Smart Focus ANTES de renderizar
                const errorMsg = this.getString('toast.errorId');
                if (this.STATE.pendingA11yContext) {
                    this.STATE.pendingA11yContext += ". " + errorMsg;
                } else {
                    this.STATE.pendingA11yContext = errorMsg;
                }

                this.renderNavegacion();
                this.showToast(errorMsg); // Mantiene el aviso visual
            }
        } else {
            this.stackInitialize(); 
            this.renderNavegacion();
        }

        nav_base.setupListeners.call(this);

        // 🟢 Encender el Sistema Nervioso Central (Input, UI Lock y Refresco)
        app_events.setupGlobalListeners(this);
        
        // 🟢 NAVEGADOR: Escuchar los botones nativos de Atrás / Adelante delegados al Router
        app_router.setupNavigationListener(this);
        
        this.STATE.initialRenderComplete = true; 

        // 🟢 FIN DE LA SECUENCIA DE ARRANQUE
        setTimeout(() => {
            document.body.classList.add('app-loaded');
            
            // 🔓 Liberamos el flag de arranque
            this.STATE.isBooting = false;

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                "🔓 App cargada. Activando foco real.");

            // 🟢 PRECARGA EN SEGUNDO PLANO (Lazy Load Menu)
            if (window.requestIdleCallback) {
                requestIdleCallback(() => {
                    app_utils.preloadMainMenu(this, 'css');
                });
            } else {
                setTimeout(() => {
                    app_utils.preloadMainMenu(this, 'css');
                }, data.PRELOAD_TIME);
            }

            // 🟢 3. RETRASO ESTRATÉGICO DEL FOCO
            // El foco nativo INTERRUMPE cualquier locución en curso. 
            // Le damos 1 segundo al lector para que termine de decir "VortexSpira EdTech" 
            // y "Navigating in: Root Level" antes de que el foco salte y diga la tarjeta actual.
            setTimeout(() => {
                this._updateFocus(false);

                this.runFontDiagnostics?.();
                this.runLayoutDiagnostics?.();
            }, 1000); 

        }, 200); 

        this._injectA11yAnnouncer();
    }

    // ============================================================================
    // 🧠 SMART FOCUS: Fusión de Contexto y Foco en un solo evento
    // ============================================================================
    applySmartFocus(target) {
        if (!target) return;

        if (this.STATE.pendingA11yContext) {
            const originalLabel = target.getAttribute('aria-label');
            const textToPrepend = this.STATE.pendingA11yContext;
            
            // Si no tiene aria-label (ej: fragmento de texto), usamos su texto visible
            const baseText = originalLabel || target.textContent.trim();
            
            // Inyectamos todo en un solo bloque semántico
            target.setAttribute('aria-label', `${textToPrepend}. ${baseText}`);

            if (originalLabel) {
                target.setAttribute('title', originalLabel);
            } else {
                target.removeAttribute('title'); 
            }
            
            // Restauramos el elemento a su estado original en cuanto el usuario se mueva
            target.addEventListener('blur', function restoreAria() {
                if (originalLabel !== null) {
                    target.setAttribute('aria-label', originalLabel);
                    target.setAttribute('title', originalLabel);
                } else {
                    target.removeAttribute('aria-label');
                    target.removeAttribute('title');
                }
                target.removeEventListener('blur', restoreAria);
            }, { once: true });

            // 🟢 Consumimos el mensaje. Las siguientes tarjetas solo leerán su propio contenido.
            this.STATE.pendingA11yContext = null; 
        }

        // Aplicamos el foco físico real (el Lector de Pantalla leerá el aria-label que acabamos de inflar)
        target.focus({ preventScroll: true });

    }

    // 🟢 Chequeo de existencia de recursos EN (Strings + Data)
    async _checkEnAvailability() {
        try {
            // Verificamos el archivo de datos principal como testigo
            const response = await fetch('./data/courses/cursos_en.json', { method: 'HEAD' });
            return response.ok;
        } catch (e) {
            debug.logWarn('app', 'Chequeo disponibilidad EN fallido', e);
            return false;
        }
    }

    // 🟢 Cambio de Idioma en Caliente (Hot Swap) delegado al Router
    async toggleLanguage() { 
        await app_router.toggleLanguage(this); 
    }

    // ⭐️ WRAPPERS DE NAVEGACIÓN (Para inyectar diagnóstico)
    async renderNavegacion() {
        // 🟢 Salvavidas: Comprobamos si el resize requiere un motor nuevo
        await this._ensureRenderEngine();

        render_base.renderNavegacion.call(this);

        // 🟢 2. PUNTO EXACTO DE PRECARGA:
        // Miramos directamente el track para ver si hay alguna tarjeta que lleve a 'detalle'
        const tieneCursos = this.DOM.track?.querySelector('[data-tipo="curso"]') !== null;

        if (tieneCursos) {
            debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                "🎯 Tarjetas de curso detectadas en el track. Iniciando precarga de detalles...");

            if (window.requestIdleCallback) {
                requestIdleCallback(() => {
                    app_utils.preloadDetailsModules(this, 'css');
                });
            } else {
                setTimeout(() => {
                    app_utils.preloadDetailsModules(this, 'css');
                }, data.PRELOAD_TIME);
            }
        }

        // 🟢 Restaurar el SEO genérico del catálogo
        this.updateSEO(null);

        // Ejecutar diagnóstico tras renderizar el menú
        requestAnimationFrame(() => {
            this.runFontDiagnostics?.();
            this.runLayoutDiagnostics?.();
        });
    }

    async _mostrarDetalle(cursoId, forceRepaint = false) { 
        // 🟢 Salvavidas por si entraron directo a un detalle y no tenían motor base
        await this._ensureRenderEngine();

        // 🟢 Esperamos a que los archivos de detalle existan
        const mods = await app_utils.loadDetailsModules(this);
        if (!mods) return;
        
        mods.render._mostrarDetalle.call(this, cursoId, forceRepaint);
        this.STATE.activeCourseId = cursoId; 
        
        requestAnimationFrame(() => {
            this.runFontDiagnostics?.();
            this.runLayoutDiagnostics?.();
        });
    }

    _handleVolverClick() { 
        if (this.STATE.isUIBlocked) 
            return;

        // 🟢 FIX DEFINITIVO: Si estábamos en "Quiénes Somos"
        if (this.STATE.isSpecialViewActive) {
            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                'Cerrando vista especial. Restaurando estado original.');

            this.STATE.isSpecialViewActive = false;

            // Restauramos la identidad del curso que había debajo (si lo había)
            // Para que cuando nav_base cierre el Detalle, sepa a dónde volver
            this.STATE.activeCourseId = this.STATE._previousCourseId || null;
            this.STATE._previousCourseId = null;

            // Si veníamos de un curso, forzamos que nav_base NO mate nuestro activeCourseId
            // Para eso, ocultamos nosotros la capa y repintamos el curso anterior.
            if (this.STATE.activeCourseId) {
                if (this.DOM.vistaDetalle) {
                    this.DOM.vistaDetalle.classList.remove('active');
                    this.DOM.vistaDetalle.style.display = 'none';
                }
                
                if (this.STATE.activeCourseId) {
                    // Veníamos de un curso: Lo repintamos y ajustamos URL nosotros
                    const url = new URL(window.location);
                    url.searchParams.set('id', this.STATE.activeCourseId);
                    window.history.pushState({}, '', url);
                    
                    this._mostrarDetalle(this.STATE.activeCourseId);
                    return; // Cortamos ejecución aquí, ya estamos donde queríamos
                } else {
                    // Veníamos de un menú (ej: s-qa-adv).
                    // Al poner activeCourseId = null arriba, le estamos diciendo a nav_base
                    // "estoy listo para salir del modo detalle y repintar el menú".
                    // IMPORTANTE: NO usamos 'return' aquí. Dejamos que el flujo baje para que ejecute nav_base._handleVolverClick
                    // y haga su magia nativa.
                }
            }
        }

        // Flujo normal para el resto de la app
        if (this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active'))
            this.STATE._lastDetailFocusIndex = 0;
        
        nav_base._handleVolverClick.call(this); 
        
        requestAnimationFrame(() => {
            this.runFontDiagnostics?.();
            this.runLayoutDiagnostics?.();
        });
    }

    _updateFocus(shouldSlide) { 
        nav_base._updateFocusImpl.call(this, shouldSlide); 
    }
    _handleTrackClick(e) { 
        if (this.STATE.isUIBlocked) 
            return;

        nav_base._handleTrackClick.call(this, e); 
    }
    
    _handleCardClick(id, tipo, parentFocusIndex) { 
        if (this.STATE.isUIBlocked) 
            return;

        nav_base._handleCardClick.call(this, id, tipo, parentFocusIndex); 
    }
    
    _handleActionRowClick(e) { 
        if (this.STATE.isUIBlocked) 
            return;

        this._handleActionRowClick.call(this, e); 
    }
    getString(key) { 
        return i18n.getString(key); 
    }
    applyStrings() { 
        i18n.applyStrings(this); 

        // 🟢 FIX A11Y: Actualizar el idioma del documento HTML
        const currentLang = localStorage.getItem('vortex_lang') || 'es';
        document.documentElement.lang = currentLang;

        const activeCourse = this.STATE.activeCourseId ? 
                             this._findNodoById(this.STATE.activeCourseId, 
                                                this.STATE.fullData.navegacion) : null;

        this.updateSEO(activeCourse);
    }

    // ============================================================================
    // 🟢 MOTOR SEO DINÁMICO E INYECCIÓN DE JSON-LD PARA BOTS/IAs
    // ============================================================================
    updateSEO(curso = null) {
        app_utils.updateSEO(this, curso);
    }

    // ============================================================================
    // 🛡️ MÉTODOS DE FEEDBACK DELEGADOS
    // ============================================================================
    blockUI() { app_feedback.blockUI(this); }
    unblockUI() { app_feedback.unblockUI(this); }

    showToast(message, duration = 3000) { app_feedback.showToast(this, message, duration); }
    hideToast() { app_feedback.hideToast(this); }

    _injectA11yAnnouncer() { app_feedback.injectA11yAnnouncer(this); }
    announceA11y(message, mode = 'polite') { app_feedback.announceA11y(this, message, mode); }
    announceA11yStop() { app_feedback.announceA11yStop(this); }

    // ============================================================================
    // 📐 MÉTODOS DE LAYOUT DELEGADOS
    // ============================================================================
    _isTouchDevice() { return app_layout.isTouchDevice(); }
    _syncHeaderDimensions() { app_layout.syncHeaderDimensions(this); }
    _setupSmartResize() { app_layout.setupSmartResize(this); }
    _updateLayoutMode() { app_layout.updateLayoutMode(this); }
    _cacheDOM() { app_layout.cacheDOM(this); }

    // ============================================================================
    // 🧭 MÉTODOS DE NAVEGACIÓN Y FOCO
    // ============================================================================
    takeFocusSnapshot() { nav_base.takeFocusSnapshot(this); }
    restoreFocusSnapshot() { nav_base.restoreFocusSnapshot(this); }

    // ==========================================
    // 🟢 PAGINA DE "QUIÉNES SOMOS" (FANTASMA)
    // ==========================================
    async _mostrarAbout(pushHistory = true) {
        await app_router.mostrarAbout(this, pushHistory);
    }
}

const appInstance = new VortexSpiraApp();
export const init = () => appInstance.init();
export const applyStrings = () => appInstance.applyStrings();
export const injectHeaderContent = () => app_utils.injectHeaderContent(appInstance);
export const injectFooterContent = () => app_utils.injectFooterContent(appInstance);
export const _mostrarAbout = () => appInstance._mostrarAbout();
export const App = appInstance;

/* --- code/core/app.js --- */