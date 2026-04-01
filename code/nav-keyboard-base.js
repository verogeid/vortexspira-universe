/* --- code/nav-keyboard-base.js --- */

import * as debug from './debug/debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 
import * as nav_keyboard_details from './nav-keyboard-details.js'; 
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js'; 

let _isWheelThrottled = false;
let _wheelThrottleTimer = null;

export function initKeyboardControls() {
    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
                'Inicializando controles de teclado y mouse (CAPTURE Mode).');

    // 🟢 CEREBRO ANTI-TRAMPAS DEL NAVEGADOR
    this.STATE._lastMousedownTarget = null;

    document.addEventListener('mousedown', (e) => {
        // 🟢 TELEMETRIA: Registar el clic
        this.STATE.currentTraceId = `CLICK_${Date.now()}`;

        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.EXTREME, 
            `[TRACE: ${this.STATE.currentTraceId}] 🖱️ Mousedown capturado en:`, e.target.tagName, e.target.id);

        this.STATE._lastMousedownTarget = e.target; // Apuntamos exactamente qué píxel tocó el usuario
        
        const container = e.target.closest(
            '#vista-central, #info-adicional, footer, #app-header, #vista-volver'
        );

        if (container) {
            this.STATE._lastActiveZoneId = container.id || container.tagName.toLowerCase();
            
            let isInteractive = e.target.closest(
                'a, button, summary, [tabindex="0"], [role="button"]'
            );
            
            // 🟢 FIX SWIPER: Si el "interactivo" detectado es en realidad el contenedor físico del carrusel 
            // (que Swiper ensucia con tabindex="0"), lo anulamos. Así garantizamos que se trate como Zona Muerta.
            if (isInteractive && (
                isInteractive.classList.contains('swiper') || 
                isInteractive.classList.contains('swiper-wrapper') || 
                isInteractive.id.startsWith('track-')
            )) {
                isInteractive = null;
            }
            
            // 🛑 CLIC EN ZONA MUERTA (No interactiva)
            if (!isInteractive) {

                if (container.id !== 'vista-central') {
                    // 🛑 CLIC EN ZONA MUERTA (Normal)
                    e.preventDefault(); 
                    
                    const rawMemory = container.dataset.lastFocusId;
                    // 🟢 LA CLAVE: Si la memoria se ha purgado (NaN), empezamos por el índice 0
                    const lastIndex = isNaN(parseInt(rawMemory, 10)) ? 0 : parseInt(rawMemory, 10);
                    
                    const isVisible = (el) => el && el.offsetParent !== null;
                    const focusables = Array.from(container.querySelectorAll('a, button, summary, [tabindex="0"], [role="button"]')).filter(isVisible);

                    if (focusables[lastIndex]) {
                        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.EXTREME, 
                            `🛡️ Escudo: Clic en zona muerta. Forzando foco en el índice [${lastIndex}]`);
                        
                        // "Marcamos" físicamente el elemento como foco legítimo
                        focusables[lastIndex].dataset.vortexFocus = "true";
                        focusables[lastIndex].focus({ preventScroll: true });

                    }
                } else {
                    // 🟢 CLIC EN LA ZONA MUERTA DEL SWIPER
                    if (document.activeElement && document.activeElement !== document.body) {
                        document.activeElement.blur();
                        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.EXTREME, 
                            `🖱️ Clic en Swiper: Forzando blur del elemento anterior para liberar el foco.`);
                    }
                    
                    // 🟢 GARANTÍA ABSOLUTA: Ya que Swiper se traga el evento 'click', 
                    // forzamos la recuperación visual desde aquí mismo.
                    if (typeof this._updateFocus === 'function') {
                        this._updateFocus(false);
                    }
                }
            } else if (container.id === 'vista-central') {
                // 🟢 CLIC EN TARJETA: Sin inventos. Si es interactivo (esté deshabilitado o no), 
                // le inyectamos el foco a la fuerza y le plantamos el sello del Notario.
                isInteractive.dataset.vortexFocus = "true";
                isInteractive.focus({ preventScroll: true });
            }
        }
    }, { capture: true });

    // 2. NOTARIO (El Juez Final del Focusin)
    document.addEventListener('focusin', (e) => {
        const traceInfo = this.STATE.currentTraceId || 'SIN_RASTRO';

        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.EXTREME, 
            `[TRACE: ${traceInfo}] 🎯 Focusin disparado para:`, e.target.tagName, e.target.id);

        const app = this;
        const target = e.target;

        if (app.DOM.track && !app.DOM.track.contains(target)) {
            const ghosts = app.DOM.track.querySelectorAll('.card.focus-visible');
            ghosts.forEach(c => c.classList.remove('focus-visible'));
        }

        const container = target.closest(
            '#vista-central, #info-adicional, #app-header, #vista-volver'
        );

        if (container) {
            // 🟢 LIMPIEZA CRUZADA: Si el foco entra en Header/Footer/Info, limpiamos detalles
            if (app.DOM.detalleTrack && !app.DOM.detalleTrack.contains(target)) {
                nav_base_details._clearDetailVisualStates(app);
            }
            
            app.STATE._lastActiveZoneId = container.id || container.tagName.toLowerCase();
            
            const isInteractive = target.closest(
                'a, button, summary, [tabindex="0"], [role="button"]'
            );
            
            // 🟢 CLIC EN ELEMENTO INTERACTIVO
            if (isInteractive && container.id !== 'vista-central') {
                
                // 🟢 FIX DE CARRERA: Leemos la marca física del elemento
                const isScriptFocusing = isInteractive.dataset.vortexFocus === "true";
                isInteractive.removeAttribute('data-vortex-focus'); // Consumimos la marca

                // 🟢 FILTRO DE LA VERDAD
                // Si este foco NO lo hemos forzado nosotros con el script, y hubo un clic de ratón reciente...
                if (!isScriptFocusing && this.STATE._lastMousedownTarget) {
                    
                    const isDetached = !document.body.contains(this.STATE._lastMousedownTarget);
                    
                    if (isDetached) {
                        this.STATE._lastMousedownTarget = null;
                    } else {
                        const clickedInteractive = this.STATE._lastMousedownTarget.closest?.(
                            'a, button, summary, [tabindex="0"], [role="button"]');

                        const userClickedHere = (clickedInteractive === isInteractive) || 
                            isInteractive.contains(this.STATE._lastMousedownTarget);
                        
                        if (!userClickedHere) {
                            debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.EXTREME, 
                                `🛑 ¡TRAMPA! Foco falso del navegador detectado. Rechazando...`);
                            
                            const rawMemory = container.dataset.lastFocusId;
                            // 🟢 FIX PURGA (Notario): Fallback a 0 si la memoria está vacía.
                            const lastIndex = isNaN(parseInt(rawMemory, 10)) ? 
                                                0 : 
                                                parseInt(rawMemory, 10);
                            
                            const isVisible = (el) => el && el.offsetParent !== null;
                            const focusables = Array.from(
                                container.querySelectorAll(
                                    'a, button, summary, [tabindex="0"], [role="button"]'
                                )).filter(isVisible);
                            
                            if (focusables[lastIndex] && focusables[lastIndex] !== isInteractive) {
                                focusables[lastIndex].dataset.vortexFocus = "true";
                                focusables[lastIndex].focus({ preventScroll: true });

                            }
                            return; 
                        }
                    }
                }

                // FLUJO NORMAL DE GUARDADO
                const isVisible = (el) => el && el.offsetParent !== null;
                const focusables = Array.from(container.querySelectorAll('a, button, summary, [tabindex="0"], [role="button"]')).filter(isVisible);

                const index = focusables.indexOf(isInteractive);
                if (index !== -1) {
                    container.dataset.lastFocusId = index;
                    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.EXTREME, 
                        `📝 Notario: Guardado índice [${index}] en la zona '${app.STATE._lastActiveZoneId}'`);
                }
            }
        }
    });

    // ⭐️ LISTENER PRINCIPAL EN FASE DE CAPTURA ⭐️
    document.addEventListener('keydown', (e) => {
        // 🟢 Borramos la huella del ratón en cuanto el usuario toca el teclado
        this.STATE._lastMousedownTarget = null; 
        
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
            `📝 Listener KeyDown: ${this.STATE._lastActiveZoneId}`);

        // 🟢 1. CONTROL COOPERATIVO DEL MENÚ DESPLEGABLE
        const btnMainMenu = document.getElementById('btn-main-menu');
        const isMenuOpen = btnMainMenu && btnMainMenu.getAttribute('aria-expanded') === 'true';

        if (isMenuOpen) {
            // Si pulsan Escape con el menú abierto, SOLO cerramos el menú
            if (e.key === 'Escape') {
                e.preventDefault();
                btnMainMenu.click(); // Invoca el toggleMenu internamente de forma limpia
                btnMainMenu.focus(); // Devolvemos el foco visual
                return; // 🛑 Cortamos aquí. El _handleVolverClick() principal no se enterará.
            }
            
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const navDropdown = document.getElementById('main-menu-dropdown');
                if (navDropdown && !navDropdown.contains(document.activeElement)) {
                    e.preventDefault();
                    return; 
                }
            }
        }
        
        // 🛡️ BLOQUEO TOTAL...
        if (this.STATE.isUIBlocked) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        const app = this; 

        // ============================================================
        // 🛑 TRAMPA DE FOCO Y NAVEGACIÓN MODAL A11Y 🛑
        // ============================================================
        const modalOverlay = document.getElementById('a11y-modal-overlay');
        const isModalOpen = modalOverlay && modalOverlay.classList.contains('active');

        if (isModalOpen) {
            // 1. CERRAR
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                
                document.getElementById('a11y-close')?.click(); // Usamos el botón de cierre para mantener la lógica centralizada
                
                return;
            }

            // 🟢 FIX 1: Si estoy en un Slider y pulso flechas, STOP PROPAGATION.
            // Esto evita que el evento baje hasta el listener del Swiper.
            // NO hacemos preventDefault() para que el slider nativo se mueva.
            if (document.activeElement.type === 'range' && 
                (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {

                e.stopPropagation(); 
                return; // Salimos de la función inmediatamente
            }

            // 2. NAVEGACIÓN INTERNA (Tab + Flechas)
            const isTab = e.key === 'Tab';
            const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

            if (isTab || isArrow) {
                const focusables = Array.from(
                    modalOverlay.querySelectorAll(
                        'button, input, [href], [tabindex]:not([tabindex="-1"])'
                    ));

                if (focusables.length === 0) return;

                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const current = document.activeElement;
                const currentIndex = focusables.indexOf(current);

                // EXCEPCIÓN SLIDER: Si estamos en un range, Izq/Der ajustan valor, no foco.
                if (current.type === 'range' && 
                    (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    // Dejamos pasar el evento al input nativo
                    return; 
                }

                e.preventDefault(); // Bloqueamos scroll o tab por defecto
                e.stopPropagation();

                let nextIndex;

                if (e.shiftKey && isTab) { 
                    // Shift + Tab -> Atrás
                    nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
                } else if (isTab) { 
                    // Tab -> Adelante
                    nextIndex = currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    // Flechas Atrás
                    nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
                } else {
                    // Flechas Adelante (Down/Right)
                    nextIndex = currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
                }

                focusables[nextIndex].focus();
            }

            // Bloqueamos cualquier otra tecla para que no afecte a la app de fondo
            if (e.key !== 'F5' && e.key !== 'F12')
                e.stopPropagation();

            return; 
        }
        // ============================================================
        // 🏁 FIN TRAMPA DE FOCO 🏁
        // ============================================================


        if (!app?.DOM?.vistaNav) return; 

        const isNavActive = app.DOM.vistaNav.classList.contains('active');
        const isDetailActive = app.DOM.vistaDetalle.classList.contains('active');
        const focused = document.activeElement;

        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 
                    `Key: ${e.key} | Target: ${e.target.tagName}`);

        // 1. ESCAPE
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation(); 
            app._handleVolverClick?.(); 
            return;
        }

        // 2. TAB
        if (e.key === 'Tab') {
            e.preventDefault();
            if (isDetailActive) nav_base_details._clearDetailVisualStates(app);
            _handleFocusTrap.call(app, e, isNavActive ? 'nav' : 'detail');
            return; 
        }

        // 3. ENTER / SPACE
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
            const isInSwipe = focused.closest('#track-desktop, #track-tablet, #track-mobile');
            const isInDetail = focused.closest('#detalle-track-desktop, #detalle-track-mobile');

            if (isInSwipe || isInDetail) {
                e.preventDefault();
                e.stopPropagation(); 
                
                app.STATE.keyboardNavInProgress = true;
                
                if (isNavActive) 
                    nav_keyboard_swipe._handleSwipeNavigation(e.key, app);

                else {
                    nav_keyboard_details._handleDetailNavigation.call(app, e.key);

                    // 🟢 Detalles es instantáneo, inyectamos su propio cooldown
                    setTimeout(() => { app.STATE.keyboardNavInProgress = false; }, 150);
                }
                return;
            }
            
            _handleActionKeys(e); 
        }

        // 4. CURSORES (FLECHAS) - Navegación Principal
        if ([
                'ArrowUp', 
                'ArrowDown', 
                'ArrowLeft', 
                'ArrowRight'
            ].includes(e.key)) {
            const isInCentralTrack = focused.closest(
                '#track-desktop, #track-tablet, #track-mobile, #detalle-track-desktop, #detalle-track-mobile'
            );

            if (isInCentralTrack) {
                debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 
                            `Flecha interceptada en track central. Bloqueando propagación.`);

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                app.STATE.keyboardNavInProgress = true;

                if (isNavActive) 
                    nav_keyboard_swipe._handleSwipeNavigation(e.key, app);

                else {
                    nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                    setTimeout(() => { app.STATE.keyboardNavInProgress = false; }, 150);
                }
                
            } else {
                const section = focused.closest(
                    '#info-adicional, #app-header, #card-volver-fija, #vista-volver'
                );
        
                if (section) {
                    e.preventDefault();
                    _handleLocalSectionNavigation(e.key, section);

                    if (isDetailActive) 
                        nav_base_details._clearDetailVisualStates(app);

                } else if (document.activeElement === document.body) {
                    e.preventDefault();
                    app.STATE.keyboardNavInProgress = true;

                    if (isNavActive) 
                        nav_keyboard_swipe._handleSwipeNavigation(e.key, app);

                    else if (isDetailActive) {
                        nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                        setTimeout(() => { app.STATE.keyboardNavInProgress = false; }, 150);
                    }
                }
            }
        }
    }, { capture: true }); 
    
    _setupInfoAccordion.call(this);
    _setupWheelListener.call(this);
}

export function _handleActionKeys(e) {
    const el = document.activeElement;
    if (!el || el === document.body) return;

    const isSpace = (e.key === ' ' || e.code === 'Space');
    const isEnter = (e.key === 'Enter' || e.code === 'Enter');

    if (isSpace || isEnter) {
        const tagName = el.tagName;
        if (tagName === 'BUTTON' || 
            tagName === 'INPUT' || 
            tagName === 'TEXTAREA' || 
            tagName === 'SELECT') return;

        const role = el.getAttribute('role');
        const isInteractive = role === 'button' || 
                                role === 'link' || 
                                tagName === 'A' || 
                                el.classList.contains('card');

        if (isInteractive) {
            if (isSpace) e.preventDefault(); 
            el.click();
        }
    }
}

function _handleLocalSectionNavigation(key, container) {
    const focusables = Array.from(container.querySelectorAll(
        'a, button, summary, [tabindex="0"]'
    )).filter(el => el.offsetParent !== null);

    const index = focusables.indexOf(document.activeElement);
    let next;

    if (key === 'ArrowDown' || 
        key === 'ArrowRight') next = (index + 1) % focusables.length;

    else if (key === 'ArrowUp' || 
            key === 'ArrowLeft') next = (index - 1 + focusables.length) % focusables.length;
    
    if (next !== undefined && focusables[next]) {
        const target = focusables[next];

        target.focus();
        
        // 🟢 FIX MEMORIA: Guardar la referencia del último elemento visitado en el propio contenedor
        container.dataset.lastFocusId = next;
    }
}

function _setupInfoAccordion() {
    const panels = this.DOM.infoAdicional?.querySelectorAll('details');
    if (!panels) return;

    panels.forEach(panel => {
        const summary = panel.querySelector('summary');

        if (summary) {
            summary.setAttribute('role', 'button');

            // Buscamos el contenedor de la lista para vincularlo
            // Usamos el ID específico si existe, o el primer UL/Small hijo
            const descriptionTarget = panel.querySelector('#info-adicional-lista-ayuda');

            const updateAriaState = () => {
                const isOpen = panel.open;
                summary.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                
                // Si está abierto, vinculamos el contenido para que el SR lo lea automáticamente al recibir foco
                if (isOpen && descriptionTarget) {
                    summary.setAttribute('aria-describedby', descriptionTarget.id);
                } else {
                    summary.removeAttribute('aria-describedby');
                }
            };
            
            // Estado inicial
            updateAriaState();

            // Listener para actualizar al alternar
            panel.addEventListener('toggle', updateAriaState);

            summary.addEventListener('click', () => {
                if (!panel.open) { 
                    panels.forEach(other => { if (other !== panel) other.open = false; });
                }
            });
        }
    });
}

function _setupWheelListener() {
    this.DOM.appContainer?.addEventListener(
        'wheel', 
        _handleGlobalWheel.bind(this), { 
            passive: false, 
            capture: true 
        });
}

function _handleGlobalWheel(e) {
    const app = this;
    const isNavActive = app.DOM.vistaNav?.classList.contains('active');
    const isDetailActive = app.DOM.vistaDetalle?.classList.contains('active');
    
    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
        `🐭 [WHEEL TRACE 1] ${Date.now()} Evento detectado. DeltaY: ${e.deltaY}
        - keyboardNavInProgress: ${app.STATE.keyboardNavInProgress}
        - isNavActive: ${isNavActive}
        - isDetailActive: ${isDetailActive}`);

    if (!isNavActive && !isDetailActive) return;
    
    const targetIsCentral = e.target.closest(
        '#vista-central, .carousel-viewport, .detalle-viewport'
    );
    if (!targetIsCentral) return;

    if (e.deltaY !== 0) {
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 
                    `Wheel: ${e.deltaY}. Bloqueando propagación.`);

        e.preventDefault(); 
        e.stopPropagation();
        e.stopImmediatePropagation();

        // 🟢 ESCUDO ANTI-SPAM FÍSICO
        if (_isWheelThrottled) return;

        // Levantamos el freno y lo programamos para soltarse
        _isWheelThrottled = true;
        clearTimeout(_wheelThrottleTimer);

        _wheelThrottleTimer = setTimeout(() => { 
            _isWheelThrottled = false; 
        }, data.SWIPER.SLIDE_SPEED);

        const key = e.deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
        
        // 🟢 2. LEVANTAMOS BANDERA Y DELEGAMOS
        app.STATE.keyboardNavInProgress = true; 

        if (isNavActive) {
            debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.EXTREME, 
                `🐭 [WHEEL TRACE 2] Pasó los bloqueos. Enviando [${key}] a _handleSwipeNavigation.`);

            nav_keyboard_swipe._handleSwipeNavigation(key, app);
        } else {
            nav_keyboard_details._handleDetailNavigation.call(app, key);
        }
    }
}

export function _handleFocusTrap(e, viewType) {
    const app = this;

    const layout = document.body.getAttribute('data-layout') || 'desktop';
    const isMobile = layout === 'mobile';
    const isDesktop = layout === 'desktop';
    const isTabletLS = layout === 'tablet-landscape';

    const isVisible = (el) => el && el.offsetParent !== null;

    const getGroupWithMemory = (containerSelector) => {
        const container = document.querySelector(containerSelector);
        if (!container) return [];
        
        const focusables = Array.from(container.querySelectorAll(
            'a, button, summary, [tabindex="0"]'
        )).filter(isVisible);
        if (focusables.length === 0) return [];

        const lastIndex = parseInt(container.dataset.lastFocusId, 10);
        
        if (!isNaN(lastIndex) && focusables[lastIndex]) {
            debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
                `🧠 Memoria recuperada para ${containerSelector}: index [${lastIndex}]`);

            return [focusables[lastIndex]];
        }
        
        return focusables; 
    };

    const sections = {
        central: () => {
            if (viewType === 'nav') {
                const cards = Array.from(app.DOM.track.querySelectorAll(
                    '[data-id]:not([data-tipo="relleno"])'
                ));
                const current = cards[app.STATE.currentFocusIndex];

                if (isVisible(current)) return [current];

                const fallback = cards.find(isVisible);
                return fallback ? [fallback] : [];
            }
            
            const detailElements = nav_base_details._getFocusableDetailElements(app).filter(
                el => isVisible(el)
            );
            
            if (app.STATE._lastDetailFocusIndex !== undefined && detailElements[app.STATE._lastDetailFocusIndex]) {
                return [detailElements[app.STATE._lastDetailFocusIndex]];
            }
            return detailElements; 
        },
        info: () => getGroupWithMemory('#info-adicional'),
        header: () => getGroupWithMemory('#app-header'),
        volver: () => [app.DOM.cardVolverFijaElemento].filter(isVisible)
    };

    const arrCentral = sections.central();
    const arrInfo = sections.info();
    const arrHeader = sections.header();
    const arrVolver = sections.volver();

    let sequence = (isDesktop || isTabletLS) ? 
        [arrCentral, arrInfo, arrHeader, arrVolver] : 
        (!isMobile ? 
            [arrCentral, arrHeader, arrVolver] : 
            [arrCentral, arrHeader]);

    const groups = sequence.filter(g => g.length > 0);
    
    let currentContainer = document.activeElement.closest(
        '#vista-central, #info-adicional, #app-header, #vista-volver'
    );
    
    let wasRecovered = false;

    if (!currentContainer && app.STATE._lastActiveZoneId) {
        currentContainer = document.getElementById(
            app.STATE._lastActiveZoneId) || 
            document.querySelector(app.STATE._lastActiveZoneId
        );
        wasRecovered = true;
    }
    
    let groupIdx = -1;
    if (currentContainer) {
        if (currentContainer.id === 'vista-central') groupIdx = groups.indexOf(arrCentral);
        else if (currentContainer.id === 'info-adicional') groupIdx = groups.indexOf(arrInfo);
        else if (currentContainer.id === 'app-header') groupIdx = groups.indexOf(arrHeader);
        else if (currentContainer.id === 'vista-volver') groupIdx = groups.indexOf(arrVolver);
        
        app.STATE._lastActiveZoneId = currentContainer.id || 
                                      currentContainer.tagName.toLowerCase();
    }

    if (groupIdx === -1) groupIdx = 0;

    const isLostFocus = !document.activeElement || 
                        document.activeElement === document.body || 
                        document.activeElement === document.documentElement;
    
    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
        `🔍 Focus Trap Activated:
        - Active Element: <${document.activeElement.tagName}>
                           ${document.activeElement.id || 
                           document.activeElement.className}
        - Foco perdido (Body): ${isLostFocus}
        - Zona rescatada de memoria: ${wasRecovered ? 
                                        'SÍ (' + app.STATE._lastActiveZoneId + ')' : 
                                        'NO'}
        - Grupo Actual Index: ${groupIdx}
        - Shift Pulsado: ${e.shiftKey}
        - Elemento a enfocar: <${groups[groupIdx]?.[0]?.tagName}>`);


    // 🟢 RESCATE ABSOLUTO DE MEMORIA 
    if (isLostFocus && !e.shiftKey) {
        // Si estábamos perdidos y pulsamos TAB normal, QUEREMOS QUEDARNOS EN LA ZONA.
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
            `🧠 Rescate de memoria activado para grupo index [${groupIdx}]. Intentando enfocar el último elemento conocido...`);

        const target = groups[groupIdx][0];

        if (target) {
            e.preventDefault();
            target.focus();

        }

    }

    // 🟢 NAVEGACIÓN NORMAL ENTRE ZONAS
    let nextGroup = e.shiftKey ? 
        (groupIdx <= 0 ? groups.length - 1 : groupIdx - 1) : 
        (groupIdx >= groups.length - 1 ? 0 : groupIdx + 1);
    
    // 🟢 CHIVATO MAESTRO
    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
        `🔍 TRAP REPORT:
        - Active Element: <${document.activeElement.tagName}> 
                           ${document.activeElement.id || 
                           document.activeElement.className}
        - Foco perdido (Body): ${isLostFocus}
        - Zona rescatada de memoria: ${wasRecovered ? 
                                        'SÍ (' + app.STATE._lastActiveZoneId + ')' : 
                                        'NO'}
        - Grupo Actual Index: ${groupIdx}
        - Próximo Grupo Index (Salto): ${nextGroup}
        - Shift Pulsado: ${e.shiftKey}
        - Elemento a enfocar: <${groups[nextGroup]?.[0]?.tagName}>`);

    const target = e.shiftKey ? 
                    groups[nextGroup][groups[nextGroup].length - 1] : 
                    groups[nextGroup][0];
    if (target) {
        e.preventDefault()
        target.focus();

    }
}

/* --- code/nav-keyboard-base.js --- */