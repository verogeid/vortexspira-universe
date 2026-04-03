/* --- code/app.js --- */

import * as debug from './debug/debug.js';
import * as debug_ldJsonSim from './debug/debug.ldJsonSim.js';
import * as debug_diagnostics from './debug/debug.diagnostics.js';
import * as debug_screenReaderSim from './debug/debug.screenReaderSim.js';

import * as data from './data.js';
import * as app_utils from './app-utils.js';

import * as i18n from './i18n.js';
import * as a11y from './a11y.js';

import * as nav_stack from './nav-stack.js';
import * as nav_base from './nav-base.js';
import * as nav_base_details from './nav-base-details.js'; 

import * as render_base from './render-base.js';

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
            isTouchDevice: this._isTouchDevice(),
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

        // 🟢 INTERCEPTOR: Fabricamos "c-about" al vuelo para NO tocar this.STATE.fullData.navegacion
        this._originalFindNodoById = nav_base._findNodoById;
        this._findNodoById = (id, items) => {
            if (id === 'c-about') {
                const broadDesc = this.getString('seo.org.description') + 
                                  '. ' + 
                                  this.getString('seo.org.accessibilitySummary');
                                
                return {
                    id: 'c-about',
                    titulo: this.getString('about.title'),
                    descripcion: broadDesc.replace(/\. /g, '. <HR>'),
                    enlaces: [
                        { "texto": "LinkedIn", 
                          "url": "https://www.linkedin.com/company/vortexspira", 
                          "type": "l" 
                        },
                        { "texto": this.getString('about.landing'), 
                          "url": "https://subscribepage.io/vortexspira", 
                          "type": "f" 
                        }
                    ]
                };
            }
            return this._originalFindNodoById(id, items);
        };
        this._tieneContenidoActivo = nav_base._tieneContenidoActivoImpl;
        this.findBestFocusInColumn = nav_base.findBestFocusInColumn;

        this._generarTarjetaHTML = render_base._generarTarjetaHTMLImpl; 

        this.findBestFocusInColumn = nav_base.findBestFocusInColumn;

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
        
        this.clearConsole = debug.logClear;
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
                const render_mobile = await import('./render-mobile.js');
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
                const render_swipe = await import('./render-swipe.js');
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

        debug_ldJsonSim.ldJsonSim.init(); // 🟢 Activamos el espía de SEO/IA

        debug_diagnostics._setupGlobalClickListener();
        debug_diagnostics._setupFocusTracker();
        debug_diagnostics._setupFocusMethodInterceptor();
        debug_diagnostics._setupKeyTracker?.(); 

        debug_diagnostics._watchFlag(this.STATE, 'keyboardNavInProgress');
        debug_diagnostics._watchFlag(this.STATE, 'isKeyboardLockedFocus');
        debug_diagnostics._watchFlag(this.STATE, 'isNavigatingBack');
        debug_diagnostics._watchFlag(this.STATE, 'isUIBlocked');

        debug_diagnostics._watchFlag(this.STATE, '_lastMousedownTarget');
        debug_diagnostics._watchFlag(this.STATE, '_lastActiveZoneId');

        // 🟢 AUTO-ARRANQUE INTELIGENTE DEL SIMULADOR E2E
        // Se ejecuta aquí, centralizado en App, si la configuración lo pide.
        if (!debug.IS_PRODUCTION) {
            // Exponer para debug manual si se desea
            window.simularLector = debug_screenReaderSim.enableScreenReaderSimulator;

            // Arrancar automáticamente si el nivel de debug de a11y es alto
            if (debug.DEBUG_CONFIG.a11y >= debug.DEBUG_LEVELS.EXTREME) {
                // Como init() se suele llamar en DOMContentLoaded, podemos arrancar directo.
                // Si no, la función tiene sus propias guardas, pero aquí garantizamos que sea parte del ciclo de inicio.
                debug_screenReaderSim.enableScreenReaderSimulator();
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

        // 1. Detector de Teclado y Rueda del Ratón (La rueda simula flechas)
        const bootKeyboardModule = async (e) => {
            // Ignoramos si solo pulsa teclas modificadoras, salvo shift
            if (e.type === 'keydown' && 
                [
                    'Control', 
                    'Alt', 
                    'Meta'
                ].includes(e.key)) 
                return;
            
            document.removeEventListener('keydown', bootKeyboardModule, true);
            document.removeEventListener('wheel', bootKeyboardModule, true);
            
            // 🟢 TRAMPA FÍSICA: Si fue la rueda, frenamos el primer "golpe" nativo
            // para que la pantalla no salte bruscamente mientras baja el JS en ese milisegundo.
            if (e.type === 'wheel') {
                const targetIsCentral = e.target.closest(
                    '#vista-central, .carousel-viewport, .detalle-viewport'
                );
                if (targetIsCentral) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            
            try {
                const nav_keyboard_base = await import('./nav-keyboard-base.js');
                
                // 🟢 FIX: Guardamos la función en la app para el futuro
                this.initKeyboardControls = nav_keyboard_base.initKeyboardControls;
                
                this.initKeyboardControls();

                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    '⌨️/⚙️ Teclado o Rueda detectado. Módulo inyectado en caliente.');

            } catch (err) {
                debug.logError('app', 'Fallo al cargar módulo de teclado', err);
            }
        };
        
        // Escuchamos en fase de captura
        document.addEventListener('keydown', bootKeyboardModule, true);
        document.addEventListener('wheel', bootKeyboardModule, { capture: true, passive: false });

        // 2. Detector de Puntero (Ratón / Touch)
        // Agrupamos el Swipe y los clics porque la lógica de Swiper mezcla ambos mundos
        const bootPointerModule = async () => {
            document.removeEventListener('mousemove', bootPointerModule, true);
            document.removeEventListener('touchstart', bootPointerModule, true);
            
            try {
                const nav_mouse_swipe = await import('./nav-mouse-swipe.js');
                
                // 🟢 FIX: Guardamos la función en la app para el futuro
                this.setupTouchListeners = nav_mouse_swipe.setupTouchListeners;
                
                this.setupTouchListeners();

                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    '🖱️/👆 Puntero/Touch detectado. Módulo de swipe inyectado.');

            } catch (err) {
                debug.logError('app', 'Fallo al cargar módulo de puntero', err);
            }
        };
        document.addEventListener('mousemove', bootPointerModule, true);
        document.addEventListener('touchstart', bootPointerModule, true);
        
        this._updateLayoutMode();
        this._syncHeaderDimensions();

        // ====================================================================
        // 🛡️ ESCUDO DE CRISTAL: INTERCEPTOR UNIVERSAL (Teclado, Ratón y Touch)
        // Atrapa las interacciones en Fase de Captura (antes de procesarlas)
        // ====================================================================
        const preventInteraction = (e) => {
            if (this.STATE.isUIBlocked) {
                // Permitimos soltar teclas, pero bloqueamos la acción en sí
                if (e.type !== 'keyup') {
                    e.preventDefault();
                    e.stopPropagation();

                    debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
                        `🛡️ Escudo activo. Bloqueado: ${e.type} ${e.key || ''}`);
                }
            }
        };

        // Escuchamos en fase de captura (true)
        document.addEventListener('keydown', preventInteraction, true);
        document.addEventListener('mousedown', preventInteraction, true);
        document.addEventListener('click', preventInteraction, true);
        document.addEventListener('touchstart', preventInteraction, { passive: false, capture: true });
        document.addEventListener('touchmove', preventInteraction, { passive: false, capture: true });
        // ====================================================================

        window.addEventListener('vortex-layout-refresh', () => {
            // 🟢 ESCUDO: Evitar re-renders fantasmas
            if (this.STATE.isUIBlocked) return;

            const prevMode = document.body.getAttribute('data-layout');
            this._updateLayoutMode();
            const newMode = document.body.getAttribute('data-layout');
            this._syncHeaderDimensions();

            // 🟢 LÓGICA DE ACTUALIZACIÓN INTELIGENTE
            // Si hay cambio de layout, forzamos render.
            // Si solo es un ajuste menor (mismo modo), dejamos que _mostrarDetalle decida con los buckets.
            const forceRender = (prevMode !== newMode);

            if (forceRender) {
                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                            `Layout Change (${prevMode} -> ${newMode}). Forzando render...`);
                this._cacheDOM();
            } else {
                debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                            `Layout Refresh (Mismo modo). Delegando a buckets.`);
            }

            if (this.STATE.activeCourseId) {
                // Pasamos forceRender para saltarnos el chequeo de buckets si cambió el layout drásticamente
                this._mostrarDetalle(this.STATE.activeCourseId, forceRender);
            } else if (forceRender) {
                this.renderNavegacion();
            }

            // Diagnóstico tras refresco de layout
            requestAnimationFrame(() => {
                debug_diagnostics.runFontDiagnostics?.();
                debug_diagnostics.runLayoutDiagnostics?.();
            });
        });
        
        // 🟢 NAVEGADOR: Escuchar los botones nativos de Atrás / Adelante
        window.addEventListener('popstate', (event) => {
            const urlParams = new URL(window.location);
            const targetId = urlParams.searchParams.get('id');
            const targetLang = urlParams.searchParams.get('lang');
            
            // 🟢 DETECTAR CAMBIO DE IDIOMA DESDE EL NAVEGADOR
            const currentLang = localStorage.getItem('vortex_lang') || 'es';
            if (targetLang && targetLang !== currentLang) {

                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    `Cambio de idioma detectado vía Back/Next: ${targetLang}`);

                // Forzamos reload para que el motor cargue los JSON correctos del historial
                window.location.reload(); 
                return;
            }

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                `Navegación nativa detectada. Destino ID: ${targetId} | Lang: ${targetLang}`);

            if (targetId) {
                if (targetId === 'c-about') {
                    this._mostrarAbout(); // false = no empujar historial
                    return; 
                }

                // 🟢 MEJORA DE CONSISTENCIA: ¿El destino ya está en nuestra pila?
                const stackIndex = this.STATE.historyStack.findIndex(s => s.levelId === targetId);
                
                if (stackIndex !== -1 && stackIndex < this.STATE.historyStack.length - 1) {
                    // Es una navegación hacia atrás conocida. Rebobinamos la pila.
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                        `Retroceso detectado hacia nivel conocido: ${targetId}. Rebobinando pila.`);
                    
                    while (this.STATE.historyStack.length - 1 > stackIndex) {
                        this.stackPop();
                    }
                    
                    // Al haber hecho pop, el nivel actual de la pila YA tiene el focusId guardado.
                    // Solo tenemos que ocultar detalles y renderizar.
                    if (this.DOM.vistaDetalle) {
                        this.DOM.vistaDetalle.classList.remove('active');
                        this.DOM.vistaDetalle.style.display = 'none';
                    }
                    this.STATE.activeCourseId = null;
                    
                    // Marcamos como navegación atrás para que renderNavegacion use el focusId guardado
                    this.STATE.isNavigatingBack = true; 
                    this.renderNavegacion();
                    return;
                }
                
                if (this.stackBuildFromId(targetId, this.STATE.fullData)) { 
                    const nodo = this._findNodoById(targetId, this.STATE.fullData.navegacion);
                    
                    if (nodo && (nodo.titulo || nodo.descripcion)) { 
                        this._mostrarDetalle(targetId);
                    } else {
                        if (this.DOM.vistaDetalle) {
                            this.DOM.vistaDetalle.classList.remove('active');
                            this.DOM.vistaDetalle.style.display = 'none';
                        }
                        this.STATE.activeCourseId = null;
                        this.renderNavegacion();
                    }
                } else {
                    if (this.DOM.vistaDetalle) {
                        this.DOM.vistaDetalle.classList.remove('active');
                        this.DOM.vistaDetalle.style.display = 'none';
                    }
                    this.stackInitialize(); 
                    this.renderNavegacion();
                }
            } else {
                if (this.DOM.vistaDetalle) {
                    this.DOM.vistaDetalle.classList.remove('active');
                    this.DOM.vistaDetalle.style.display = 'none';
                }
                this.STATE.activeCourseId = null;
                this.stackInitialize(); 
                this.renderNavegacion();
            }
        });
        
        this.STATE.initialRenderComplete = true; 

        // 🟢 FIN DE LA SECUENCIA DE ARRANQUE
        setTimeout(() => {
            document.body.classList.add('app-loaded');
            
            // 🔓 Liberamos el flag de arranque
            this.STATE.isBooting = false;

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                "🔓 App cargada. Activando foco real.");

            // 🟢 PRECARGA EN SEGUNDO PLANO (Lazy Load Menu & Details)
            if (window.requestIdleCallback) {
                requestIdleCallback(() => {
                    app_utils.preloadMainMenu(this);
                    app_utils.preloadDetailsModules(this);
                });
            } else {
                setTimeout(() => {
                    app_utils.preloadMainMenu(this);
                    app_utils.preloadDetailsModules(this);
                }, data.PRELOAD_TIME);
            }

            // 🟢 3. RETRASO ESTRATÉGICO DEL FOCO
            // El foco nativo INTERRUMPE cualquier locución en curso. 
            // Le damos 1 segundo al lector para que termine de decir "VortexSpira EdTech" 
            // y "Navigating in: Root Level" antes de que el foco salte y diga la tarjeta actual.
            setTimeout(() => {
                this._updateFocus(false);

                debug_diagnostics.runFontDiagnostics?.();
                debug_diagnostics.runLayoutDiagnostics?.();
            }, 1000); 

        }, 200); 

        this._injectA11yAnnouncer();
    }

    // ============================================================================
    // 🛡️ MÉTODOS DE CONTROL DEL ESCUDO (UI Lock)
    // ============================================================================
    blockUI() {
        this.STATE.isUIBlocked = true;
        document.body.classList.add('ui-blocked');

        // 🟢 CAPA DE INVISIBILIDAD ABSOLUTA: Usamos 'inert'
        // 'inert' quita el foco automáticamente, bloquea clics y oculta al lector de pantalla
        // sin violar las reglas de accesibilidad del navegador.
        if (this.DOM.appContainer) 
            this.DOM.appContainer.setAttribute('inert', '');

        if (this.DOM.header) 
            this.DOM.header.setAttribute('inert', '');

        const footer = document.querySelector('footer');
        if (footer) 
            footer.setAttribute('inert', '');

        debug.log('app', debug.DEBUG_LEVELS.EXTREME, '🛡️ ESCUDO ACTIVADO: UI Bloqueada');
    }

    unblockUI() {
        this.STATE.isUIBlocked = false;
        document.body.classList.remove('ui-blocked');

        // 🟢 RETIRAR CAPA DE INVISIBILIDAD
        if (this.DOM.appContainer) 
            this.DOM.appContainer.removeAttribute('inert');

        if (this.DOM.header) 
            this.DOM.header.removeAttribute('inert');

        const footer = document.querySelector('footer');
        if (footer) 
            footer.removeAttribute('inert');

        debug.log('app', debug.DEBUG_LEVELS.EXTREME, '🛡️ ESCUDO DESACTIVADO: UI Liberada');
    }
    // ============================================================================

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
            target.setAttribute('title', `${originalLabel}`);
            
            // Restauramos el elemento a su estado original en cuanto el usuario se mueva
            target.addEventListener('blur', function restoreAria() {
                if (originalLabel !== null) {
                    target.setAttribute('aria-label', originalLabel);
                    target.setAttribute('title', originalLabel);
                } else {
                    target.removeAttribute('aria-label');
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

    // 🟢 Cambio de Idioma en Caliente (Hot Swap)
    async toggleLanguage() {
        this.STATE.currentTraceId = `SWAP_${Date.now()}`;
        const traceTimeStr = new Date().toISOString().split('T')[1];

        debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
            `[TRACE: ${this.STATE.currentTraceId} | ${traceTimeStr}] ` + 
            `⏳ INICIO DE CAMBIO DE IDIOMA`);

        // 1. Memoria de foco: ¿El usuario pulsó el botón de idiomas para iniciar esto?
        const wasLangBtnFocused = document.activeElement && document.activeElement.id === 'btn-lang-toggle';

        // 2. Bloqueamos la UI (El 'inert' expulsará el foco de forma segura)
        this.blockUI();
        
        const msg = this.getString('menu.aria.langSwitch');
        this.announceA11y(msg, 'assertive');

        const current = localStorage.getItem('vortex_lang') || 'es';
        const newLang = current === 'es' ? 'en' : 'es';
        
        try {
            // 2. Descargamos los nuevos datos
            const [stringsLoaded, coursesData] = await Promise.all([
                i18n.loadStrings(newLang),
                app_utils.loadData(newLang)
            ]);

            if (!stringsLoaded || !coursesData) 
                throw new Error("Fallo al cargar nuevos diccionarios");

            // 3. Preparamos la URL base
            const url = new URL(window.location);
            url.searchParams.set('lang', newLang);
            const targetId = url.searchParams.get('id');

            // 3. Aplicamos el nuevo estado base
            this.STATE.fullData = coursesData;
            localStorage.setItem('vortex_lang', newLang);
            document.documentElement.lang = newLang;

            // 🟢 FIX CRÍTICO: DESTRUCCIÓN TOTAL DE LA PILA INMEDIATA
            // Lo hacemos antes de repintar nada para evitar condiciones de carrera con el ResizeObserver
            this.stackInitialize();
            this.STATE.activeCourseId = null;

            if (this.DOM.vistaDetalle) 
                this.DOM.vistaDetalle.classList.remove('active');

            // 🟢 PURGA DE MEMORIA DEL NOTARIO
            // Borramos los atributos data-last-focus-id de todas las zonas
            // para que el teclado parta de cero en la nueva interfaz.
            ['app-header', 'vista-volver', 'info-adicional', 'vista-central'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.removeAttribute('data-last-focus-id');
            });

            debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
                `[TRACE: ${this.STATE.currentTraceId}] 🧹 Limpiando _lastMousedownTarget y _lastActiveZoneId...`);

            // Reseteamos la zona activa
            this.STATE._lastActiveZoneId = null;
            this.STATE._lastMousedownTarget = null;

            // 5. Repintamos la capa estática (Textos, Header, Footer)
            this.applyStrings();

            if (app_utils.injectHeaderContent) {
                // Si el nuevo es EN, forzamos true. Si es ES, verificamos si EN existe.
                const enableI18n = newLang === 'en' ? true : await this._checkEnAvailability();
                app_utils.injectHeaderContent(this, enableI18n);
            }

            if (app_utils.injectFooterContent) 
                app_utils.injectFooterContent(this);

            // 🟢 FIX A11Y UX: Usamos tu sistema de Snapshot para devolver el foco al botón de idiomas
            if (wasLangBtnFocused) {
                this.STATE.resizeSnapshot = { type: 'ID', value: 'btn-lang-toggle' };
            } 

            // 6. ⭐️ RECONSTRUCCIÓN BASADA EN LA URL ⭐️
            if (targetId) {
                // 🟢 FIX: Si estamos en c-about, reconstruimos la pila para el origen, no para el fantasma
                if (targetId === 'c-about') {
                    const originId = this.STATE._previousCourseId; // El curso que estaba debajo
                    
                    if (originId && this.stackBuildFromId(originId, this.STATE.fullData)) {
                        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                            `Pila base reconstruida para ${originId} tras cambio de idioma.`);

                    } else {
                        // Si no hay curso previo, intentamos reconstruir al menos hasta la última categoría
                        this.stackInitialize(); 
                    }

                    window.history.replaceState({}, '', url);
                    this._mostrarAbout(false); // Repintamos c-about en el nuevo idioma
                }
                else if (this.stackBuildFromId(targetId, this.STATE.fullData)) {
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                        `Pila reconstruida para ID ${targetId} en ${newLang}`);

                    // 🟢 IMPORTANTE: pushState aquí anota el cambio de idioma en el historial del navegador
                    window.history.pushState({}, '', url);
                    
                    const nodo = this._findNodoById(targetId, this.STATE.fullData.navegacion);
                    if (nodo && (nodo.titulo || nodo.descripcion)) {
                        this._mostrarDetalle(targetId, true);
                    } else {
                        this.renderNavegacion();
                    }
                } else {
                    debug.logWarn('app', 
                        `El nodo ${targetId} no existe en ${newLang}. Degradando a raíz.`);

                    this.stackInitialize(); 
                    url.searchParams.delete('id');
                    window.history.replaceState({}, '', url);

                    // 🟢 ID ROTO DETECTADO DURANTE EL CAMBIO DE IDIOMA
                    const errorMsg = this.getString('toast.errorId');
                    if (this.STATE.pendingA11yContext) {
                        this.STATE.pendingA11yContext += ". " + errorMsg;
                    } else {
                        this.STATE.pendingA11yContext = errorMsg;
                    }

                    this.renderNavegacion(); 
                    this.showToast(this.getString('toast.errorId'));
                
                }
            } else {
                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    "No hay ID en la URL. Mostrando raíz.");

                window.history.replaceState({}, '', url);
                this.renderNavegacion();
            }

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                `Idioma cambiado a ${newLang}. Interfaz actualizada.`);

            // 7. Liberamos la UI (El DOM vuelve a ser visible)
            this.unblockUI();

            debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
                `[TRACE: ${this.STATE.currentTraceId}] ✅ FIN DE CAMBIO DE IDIOMA. Escudos bajados.`);

            // 🟢 LIMPIEZA ASÍNCRONA DEL SNAPSHOT
            // Le damos tiempo de sobra a renderNavegacion para que consuma la orden de foco
            // antes de borrarla de la memoria para futuros redimensionados.
            setTimeout(() => {
                this.STATE.resizeSnapshot = null;
            }, 500);

        } catch (error) {
            debug.logError('app', 
                'Fallo crítico durante el Hot Swap de idioma', error);

            // Si todo falla, forzamos recarga tradicional como salvavidas
            window.location.reload();
        }
    }

    // ⭐️ WRAPPERS DE NAVEGACIÓN (Para inyectar diagnóstico)
    async renderNavegacion() {
        // 🟢 Salvavidas: Comprobamos si el resize requiere un motor nuevo
        await this._ensureRenderEngine();

        render_base.renderNavegacion.call(this);

        // 🟢 Restaurar el SEO genérico del catálogo
        this.updateSEO(null);

        // Ejecutar diagnóstico tras renderizar el menú
        requestAnimationFrame(() => {
            debug_diagnostics.runFontDiagnostics?.();
            debug_diagnostics.runLayoutDiagnostics?.();
        });
    }

    // 🟢 HELPER: Detección de entorno táctil (Físico vs Virtual)
    _isTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0) ||
                window.matchMedia("(pointer: coarse)").matches);
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
            debug_diagnostics.runFontDiagnostics?.();
            debug_diagnostics.runLayoutDiagnostics?.();
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
            debug_diagnostics.runFontDiagnostics?.();
            debug_diagnostics.runLayoutDiagnostics?.();
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

    // 🟢 MOTOR SEO DINÁMICO E INYECCIÓN DE JSON-LD PARA BOTS/IAs
    updateSEO(curso = null) {
        app_utils.updateSEO(this, curso);
    }

    showToast(message, duration = 3000) {
        if (!this.DOM.toast) 
            return;

        // 🟢 ANTI-SPAM DE TOAST
        // Si el mensaje es idéntico al que ya se muestra y el toast está activo,
        // no hacemos NADA (ni siquiera reiniciamos el timer, para que no sea eterno si se spamea).
        // Esto evita que el lector de pantalla lea 8 veces "Columna vacía".
        if (this.DOM.toast.classList.contains('active') && this.DOM.toast.textContent === message) {
            debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                `🚫 Toast duplicado ignorado: "${message}"`);

            return;
        }

        // 1. Bloquear UI
        this.STATE.isUIBlocked = true;
        document.body.classList.add('ui-blocked'); // Útil para CSS (cursor: wait)
        
        // 2. Preparar mensaje A11y (Vaciar primero)
        this.DOM.toast.textContent = '';
        this.DOM.toast.classList.remove('active');
        
        // Limpiar timer anterior si existía
        if (this._toastTimer) clearTimeout(this._toastTimer);

        // Usamos requestAnimationFrame para asegurar que el DOM procesa el vaciado
        requestAnimationFrame(() => {
            this.DOM.toast.textContent = message;
            this.DOM.toast.classList.add('active');
            
            // 3. Gestionar duración
            if (duration !== null) {
                this._toastTimer = setTimeout(() => {
                    this.hideToast();
                }, duration);
            } else {
                debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                            'Toast persistente activado (UI Bloqueada). Esperando hideToast().');
            }
        });
    }

    // 🟢 Para ocultar el toast manualmente cuando ya no sea necesario
    hideToast() {
        if (!this.DOM.toast) 
            return;

        this.DOM.toast.classList.remove('active');
        if (this._toastTimer) clearTimeout(this._toastTimer);

        // Desbloquear UI
        this.STATE.isUIBlocked = false;
        document.body.classList.remove('ui-blocked');

        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    'Toast oculto. UI Desbloqueada.');
    }

    // 🟢 NUEVO: Inyectar contenedor exclusivo para voz
    _injectA11yAnnouncer() {
        // Si ya existen, salimos
        if (document.getElementById('a11y-announcer-polite')) return;
        
        // Helper para crear canales
        const createAnnouncer = (id, type) => {
            const el = document.createElement('div');
            el.id = id;
            el.setAttribute('role', type === 'assertive' ? 'alert' : 'status');
            el.setAttribute('aria-live', type);
            el.setAttribute('aria-atomic', 'true');
            
            // Estilo sr-only (invisible pero legible)
            Object.assign(el.style, {
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: '0',
                pointerEvents: 'none' // Asegura que no interfiera con interacciones táctiles o de mouse
            });
            
            document.body.appendChild(el);
            return el;
        };

        // Creamos los dos canales
        this.DOM.announcerPolite = createAnnouncer('a11y-announcer-polite', 'polite');
        this.DOM.announcerAssertive = createAnnouncer('a11y-announcer-assertive', 'assertive');
        
        // Mantenemos referencia legacy por si acaso (opcional)
        this.DOM.announcer = this.DOM.announcerPolite;
    }

    // 🟢 FIX A11Y: Usar el canal dedicado
    announceA11y(message, mode = 'polite') {
        // 🟢 Si el modal de A11y está abierto, SILENCIO TOTAL en el resto de la app.
        // Esto evita que al cambiar el tamaño de fuente (y repintarse el fondo) 
        // el lector se ponga a leer el contenido del swiper
        const modal = document.getElementById('a11y-modal-overlay');

        if (modal && modal.classList.contains('active')) {
            debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                `🤫 Silenciado por Modal A11y: "${message}"`);

            return;
        }

        // Aseguramos que existan los canales
        this._injectA11yAnnouncer();

        const el = mode === 'assertive' ? this.DOM.announcerAssertive : this.DOM.announcerPolite;

        // 🟢 TRUE ANTI-SPAM: Si el mensaje ya es el mismo, NO TOCAR EL DOM.
        if (this.STATE._lastAnnounced === message) {
            debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                `🚫 Anti-Spam: Ignorando mensaje repetido "${message}"`);

            return; 
        }

        // Si es un mensaje nuevo, limpiamos y ponemos el nuevo
        this.STATE._lastAnnounced = message;
        el.textContent = ''; 
        
        // Usamos un tick muy breve para asegurar que el SR note el cambio si veníamos de otro texto
        setTimeout(() => {
            el.textContent = message;
            debug.log('app', debug.DEBUG_LEVELS.DEEP, `🗣️ Locutor (${mode}): "${message}"`);
        }, 10);
    }

    announceA11yStop() {
        if (this.DOM.announcerPolite) 
            this.DOM.announcerPolite.textContent = '';

        if (this.DOM.announcerAssertive) 
            this.DOM.announcerAssertive.textContent = '';

        this.STATE._lastAnnounced = null; // 🟢 Resetear memoria al detener

        debug.log('a11y', debug.DEBUG_LEVELS.DEEP, 
            `🗣️ Locutor detenido.`);
    }

    _syncHeaderDimensions() {
        const header = document.getElementById('app-header');
        if (header) {
            const realHeight = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height-real', `${realHeight}px`);

            debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                        `A11y Sync: Header mide ${realHeight}px`);
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
            // 🟢 ESCUDO: Ignorar resizes causados por aplicar 'inert'
            if (this.STATE.isUIBlocked) return;
            
            this._updateLayoutMode();
            this._syncHeaderDimensions();
            this._cacheDOM(); 
            
            if (this.STATE.fullData) {
                if (this.STATE.activeCourseId) {
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                                `SmartResize: Manteniendo vista detalle.`);

                    requestAnimationFrame(() => {
                        this._mostrarDetalle(this.STATE.activeCourseId, false);
                    });
                } else {
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                                `SmartResize: Refrescando menú.`);

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

        // 2. 🟢 ZOOM TÁCTIL (Pinch-to-zoom)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                // Usamos un debounce más corto para que se sienta reactivo al hacer zoom
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(handleResize, 100); 
            });
        }
    }

    _updateLayoutMode() {
        const rootStyle = getComputedStyle(document.documentElement);
        // 1. Detectar el "Elefante" (Zoom de Accesibilidad)
        const scale = parseFloat(rootStyle.getPropertyValue('--font-scale')) || 1;
        
        // 🟢 FIX CRÍTICO: El bucle de 15px del Scrollbar
        const realWidth = window.innerWidth;

        // 🟢 FIX ZOOM: Usar visualViewport si existe, sino fallback a innerWidth
        const realHeight = window.visualViewport ? 
                        window.visualViewport.height : 
                        window.innerHeight;
        
        // Para el ancho, SOLO pisamos el innerWidth si el usuario está
        // activamente haciendo "pinch-to-zoom" táctil (escala > 1).
        if (window.visualViewport && window.visualViewport.scale > 1) {
            realWidth = window.visualViewport.width;
        }
        
        // 2. Determinar Modo Inicial por ANCHO
        const effectiveWidth = realWidth / scale;
        const effectiveHeight = realHeight / scale;
        
        let candidateMode;
        
        if (effectiveWidth <= data.VIEWPORT.MAX_WIDTH.MOBILE) {
            candidateMode = 'mobile';
                
        } else if (effectiveWidth <= data.VIEWPORT.MAX_WIDTH.TABLET_PORTRAIT) {
            candidateMode = 'tablet-portrait';
                
        } else if (effectiveWidth <= data.VIEWPORT.MAX_WIDTH.TABLET_LANDSCAPE) {
            candidateMode = 'tablet-landscape';

        } else candidateMode = 'desktop';

        // 3. 🚨 LÓGICA DE CAÍDA EN CASCADA (FALLBACK) POR ALTURA 🚨
        // Si no cabe verticalmente, degradamos al siguiente diseño más compacto.

        // Desktop (3 filas) -> Si no cabe, baja a Tablet Landscape (2 filas)
        if (candidateMode === 'desktop') {
            if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.DESKTOP) {
                debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
                            `Fallback Altura: Desktop -> Tablet Landscape`);
                
                candidateMode = 'tablet-landscape';
            }
        }

        // Tablet Landscape (2 filas ancho) -> Si no cabe, baja a Tablet Portrait (2 filas estrecho)
        if (candidateMode === 'tablet-landscape') {
            if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.TABLET) {
                debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
                            `Fallback Altura: Tablet Landscape -> Tablet Portrait`);

                candidateMode = 'tablet-portrait';
            }
        } 

        // Tablet Portrait (2 filas estrecho) -> Si no cabe, baja a Mobile (1 fila)
        if (candidateMode === 'tablet-portrait') {
            if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.TABLET) {
                debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
                            `Fallback Altura: Tablet Portrait -> Mobile`);

                candidateMode = 'mobile';
            }
        } 

        // Safe Mode (Último recurso, SOLO en Mobile)
        // Si ya estamos en Mobile y aun así no cabemos, liberamos el footer.
        let enableSafeMode = false;
        
        if (candidateMode === 'mobile') {
            if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.MOBILE) {
                enableSafeMode = true;
            }
        } 

        // 4. Aplicar el Modo Final
        const currentMode = document.body.getAttribute('data-layout');
        if (currentMode !== candidateMode) {
            document.body.setAttribute('data-layout', candidateMode);

            // 🟢 NUEVO: Inyección dinámica del CSS de Layout
            let cssFile = candidateMode;
            // Si es tablet-portrait o tablet-landscape, ambos usan style-tablet.css
            if (candidateMode.includes('tablet')) {
                cssFile = 'tablet'; 
            }
            
            // Inyectamos el archivo exacto que el usuario necesita
            this._injectCSS(`styles/style-${cssFile}.css`, 'vortex-css-layout');

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                        `Layout Final: ${candidateMode} (W:${effectiveWidth.toFixed(0)} / H:${effectiveHeight.toFixed(0)})`);
        }

        const currentSafe = document.body.getAttribute('data-safe-mode') === 'true';
        if (enableSafeMode !== currentSafe) {
            document.body.setAttribute('data-safe-mode', enableSafeMode ? 'true' : 'false');
            
            // 🟢 INYECCIÓN DINÁMICA DE SAFE MODE
            if (enableSafeMode) {
                this._injectCSS('styles/style-safe-mode.css', 'vortex-css-safe');
            } else {
                // Si la pantalla vuelve a crecer, eliminamos el CSS para limpiar la memoria
                const safeLink = document.getElementById('vortex-css-safe');
                if (safeLink) safeLink.remove();
            }

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                `🛡️ Safe Mode: ${enableSafeMode ? 'ON' : 'OFF'} (Solo Mobile) | Eff.Height: ${effectiveHeight.toFixed(0)}px`);
            
            if (!enableSafeMode) {
                window.scrollTo(0, 0);
                if (this.STATE.carouselInstance) 
                    requestAnimationFrame(() => this.STATE.carouselInstance.update());
            }
        }
    }
    
    _cacheDOM() {
        const layout = document.body.getAttribute('data-layout') || 'desktop';
        const isMobile = layout === 'mobile';
        const isDesktopView = layout === 'desktop'; 
        
        debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                    `Refrescando caché DOM. Modo: ${layout}`);

        this.DOM.vistaDetalleDesktop = document.getElementById('vista-detalle-desktop');
        this.DOM.vistaDetalleMobile = document.getElementById('vista-detalle-mobile');
        
        this.DOM.vistaDetalle = isMobile ? this.DOM.vistaDetalleMobile : this.DOM.vistaDetalleDesktop;
        this.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop');
        
        this.DOM.header = document.getElementById('app-header');
        
        this.DOM.cardVolverFija = document.getElementById('vista-volver');
        this.DOM.cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento');
        this.DOM.infoAdicional = document.getElementById('info-adicional');
        this.DOM.cardNivelActual = document.getElementById('card-nivel-actual');
        this.DOM.appContainer = document.getElementById('app-container');
        this.DOM.toast = document.getElementById('toast-notification'); 

        // 🟢 FIX A11Y: Configurar Toast
        if (this.DOM.toast) {
            if (!this.DOM.toast.getAttribute('role')) 
                this.DOM.toast.setAttribute('role', 'status'); 

            if (!this.DOM.toast.getAttribute('aria-hidden')) 
                this.DOM.toast.setAttribute('aria-hidden', true);
        }

        // 🟢 FIX A11Y: SILENCIAR RUIDO (Quitar aria-live de elementos que no deben hablar solos)
        // El track y el título no deben anunciar cambios automáticos, nosotros controlamos el foco y los avisos.
        if (this.DOM.cardNivelActual) 
            this.DOM.cardNivelActual.removeAttribute('aria-live');

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

        // Limpieza extra de tracks
        if (this.DOM.track) this.DOM.track.removeAttribute('aria-live');
        ['track-desktop', 'track-tablet', 'track-mobile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.removeAttribute('aria-live');
        });
    }

    // ==========================================
    // 🟢 PAGINA DE "QUIÉNES SOMOS" (FANTASMA)
    // ==========================================
    async _mostrarAbout(pushHistory = true) {
        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
            'Abriendo página especial: Quiénes Somos');

        if (!this.STATE.isSpecialViewActive) {
            this.STATE._previousCourseId = this.STATE.activeCourseId;
        }

        this.STATE.activeCourseId = 'c-about';
        this.STATE.isSpecialViewActive = true; 

        if (pushHistory) {
            const url = new URL(window.location);
            if (url.searchParams.get('id') !== 'c-about') {
                url.searchParams.set('id', 'c-about');
                window.history.pushState({}, '', url);
            }
        }

        await this._mostrarDetalle('c-about');
    }
}

const appInstance = new VortexSpiraApp();
export const init = () => appInstance.init();
export const applyStrings = () => appInstance.applyStrings();
export const injectHeaderContent = () => app_utils.injectHeaderContent(appInstance);
export const injectFooterContent = () => app_utils.injectFooterContent(appInstance);
export const _mostrarAbout = () => appInstance._mostrarAbout();
export const App = appInstance;

/* --- code/app.js --- */