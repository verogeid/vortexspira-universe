/* --- code/app.js --- */

import * as debug from './debug.js';
import * as debug_diagnostics from './debug.diagnostics.js';
import * as debug_screenReaderSim from './debug.screenReaderSim.js';

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
            isUIBlocked: false,
            isBooting: true, 
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
        //debug.logClear();
        debug.logDebugLevels();
        
        // Mantenemos isBooting = true por defecto desde el constructor
        debug.log('app', debug.DEBUG_LEVELS.BASIC, "🚀 Iniciando App (Modo Silencioso activado)...");

        debug_diagnostics._setupGlobalClickListener();
        debug_diagnostics._setupFocusTracker();
        debug_diagnostics._setupFocusMethodInterceptor();
        debug_diagnostics._setupKeyTracker?.(); 

        debug_diagnostics._watchFlag(this.STATE, 'keyboardNavInProgress');
        debug_diagnostics._watchFlag(this.STATE, 'isNavigatingBack');
        debug_diagnostics._watchFlag(this.STATE, 'isUIBlocked');

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
        
        this.DOM.vistaNav = this.DOM.vistaNav || document.getElementById('vista-navegacion-desktop'); 

        // 🟢 FIX I18N: Priorizar localStorage sobre el navegador
        // Si el usuario ya eligió idioma, lo respetamos. Si no, detectamos.
        let targetLang = localStorage.getItem('vortex_lang') || i18n.detectBrowserLanguage(); 

        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                    `Idioma inicial: ${targetLang} (Origen: ${localStorage.getItem('vortex_lang') ? 'Storage' : 'Browser'})`);

        let loadSuccess = false;

        // 2. Intentar cargar el idioma objetivo
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

            // Fallback a Español si falla el objetivo
            if (targetLang !== 'es') {
                try {
                    await i18n.loadStrings('es');
                    this.STATE.fullData = await data.loadData('es');
                    targetLang = 'es'; // Forzamos español porque el otro falló
                    loadSuccess = true;
                    // También actualizamos localStorage para no fallar en la próxima recarga
                    localStorage.setItem('vortex_lang', 'es');
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

        debug.log('app', debug.DEBUG_LEVELS.BASIC, `I18N Habilitado: ${enableI18n}`);

        a11y.initA11y();

        this.applyStrings(); 

        // Pasamos el flag enableI18n a injectHeaderContent
        if (data.injectHeaderContent) data.injectHeaderContent(this, enableI18n);
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
                this.showToast(this.getString('toast.errorId'));
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

            // 🟢 LÓGICA DE ACTUALIZACIÓN INTELIGENTE
            // Si hay cambio de layout, forzamos render.
            // Si solo es un ajuste menor (mismo modo), dejamos que _mostrarDetalle decida con los buckets.
            const forceRender = (prevMode !== newMode);

            if (forceRender) {
                debug.log('app', debug.DEBUG_LEVELS.IMPORTANT, 
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
        
        this.STATE.initialRenderComplete = true; 

        // 🟢 FIN DE LA SECUENCIA DE ARRANQUE
        // Damos un pequeño respiro para que el DOM se asiente y el anuncio de "Nivel Raíz" salga primero.
        setTimeout(() => {
            document.body.classList.add('app-loaded');
            
            // 🔓 Liberamos el flag de arranque
            this.STATE.isBooting = false;
            debug.log('app', debug.DEBUG_LEVELS.BASIC, "🔓 App cargada. Activando foco real.");

            // 🔥 Forzamos el primer foco real (ahora sí hablará el SR)
            // Usamos 'false' para no animar/deslizar, solo focalizar.
            this._updateFocus(false);

            debug_diagnostics.runFontDiagnostics?.();
            debug_diagnostics.runLayoutDiagnostics?.();
        }, 200); // 200ms es imperceptible visualmente pero suficiente para ordenar eventos A11y

        this._injectA11yAnnouncer();
    }

    // 🟢 Chequeo de existencia de recursos EN (Strings + Data)
    async _checkEnAvailability() {
        try {
            // Verificamos el archivo de datos principal como testigo
            const response = await fetch('./data/cursos_en.json', { method: 'HEAD' });
            return response.ok;
        } catch (e) {
            debug.logWarn('app', 'Chequeo disponibilidad EN fallido', e);
            return false;
        }
    }

    // 🟢 Cambio de Idioma
    toggleLanguage() {
        const current = localStorage.getItem('vortex_lang') || 'es';
        const newLang = current === 'es' ? 'en' : 'es';
        
        localStorage.setItem('vortex_lang', newLang);

        // Feedback sonoro inmediato (antes de recargar)
        const msg = this.getString('header.aria.langSwitch') || "Changing language...";
        
        this.announceA11y(msg, 'assertive');

        // Recarga para aplicar cambios limpiamente
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    // ⭐️ WRAPPERS DE NAVEGACIÓN (Para inyectar diagnóstico)
    
    renderNavegacion() {
        render_base.renderNavegacion.call(this);
        // Ejecutar diagnóstico tras renderizar el menú
        requestAnimationFrame(() => {
            debug_diagnostics.runFontDiagnostics?.();
            debug_diagnostics.runLayoutDiagnostics?.();
        });
    }

    _mostrarDetalle(cursoId, forceRepaint = false) { 
        render_details._mostrarDetalle.call(this, cursoId, forceRepaint);
        this.STATE.activeCourseId = cursoId; 
        // Ejecutar diagnóstico tras renderizar el detalle
        requestAnimationFrame(() => {
            debug_diagnostics.runFontDiagnostics?.();
            debug_diagnostics.runLayoutDiagnostics?.();
        });
    }

    _handleVolverClick() { 
        if (this.STATE.isUIBlocked) 
            return;

        if (this.DOM.vistaDetalle.classList.contains('active'))
            this.STATE.lastDetailFocusIndex = 0;
        
        nav_base._handleVolverClick.call(this); 
        // Ejecutar diagnóstico al volver
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
    }

    showToast(message, duration = 3000) {
        if (!this.DOM.toast) 
            return;

        // 🟢 ANTI-SPAM DE TOAST
        // Si el mensaje es idéntico al que ya se muestra y el toast está activo,
        // no hacemos NADA (ni siquiera reiniciamos el timer, para que no sea eterno si se spamea).
        // Esto evita que el lector de pantalla lea 8 veces "Columna vacía".
        if (this.DOM.toast.classList.contains('active') && this.DOM.toast.textContent === message) {
            debug.log('app', debug.DEBUG_LEVELS.DEEP, `🚫 Toast duplicado ignorado: "${message}"`);

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
        
        
        // 🟢 FIX ZOOM: Usar visualViewport si existe, sino fallback a innerWidth
        const realWidth = window.visualViewport ? 
                        window.visualViewport.width : 
                        window.innerWidth;
        const realHeight = window.visualViewport ? 
                        window.visualViewport.height : 
                        window.innerHeight;
        
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

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                        `Layout Final: ${candidateMode} (W:${effectiveWidth.toFixed(0)} / H:${effectiveHeight.toFixed(0)})`);
        }

        const currentSafe = document.body.getAttribute('data-safe-mode') === 'true';
        if (enableSafeMode !== currentSafe) {
            document.body.setAttribute('data-safe-mode', enableSafeMode ? 'true' : 'false');
            
            debug.log('app', debug.DEBUG_LEVELS.IMPORTANT, 
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
        this.DOM.btnA11y = document.getElementById('btn-config-accesibilidad');
        this.DOM.cardVolverFija = document.getElementById('vista-volver');
        this.DOM.cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento');
        this.DOM.infoAdicional = document.getElementById('info-adicional');
        this.DOM.cardNivelActual = document.getElementById('card-nivel-actual');
        this.DOM.appContainer = document.getElementById('app-container');
        this.DOM.toast = document.getElementById('toast-notification'); 

        // 🟢 FIX A11Y: Configurar Toast
        if (this.DOM.toast) {
            if (!this.DOM.toast.getAttribute('role')) 
                this.DOM.toast.setAttribute('role', 'alert'); 

            if (!this.DOM.toast.getAttribute('aria-live')) 
                this.DOM.toast.setAttribute('aria-live', 'assertive');
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
}

const appInstance = new VortexSpiraApp();
export const init = () => appInstance.init();
export const applyStrings = () => appInstance.applyStrings();
export const injectHeaderContent = () => data.injectHeaderContent(appInstance);
export const injectFooterContent = () => data.injectFooterContent(appInstance);
export const App = appInstance;

/* --- code/app.js --- */