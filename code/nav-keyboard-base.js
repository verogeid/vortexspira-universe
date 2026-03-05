/* --- code/nav-keyboard-base.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 
import * as nav_keyboard_details from './nav-keyboard-details.js'; 
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js'; 

export function initKeyboardControls() {
    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 
                'Inicializando controles de teclado (CAPTURE Mode)');

    document.addEventListener('focusin', (e) => {
        const app = this;
        const target = e.target;

        // 1. Limpieza de tarjetas fantasma en el carrusel
        if (app.DOM.track && !app.DOM.track.contains(target)) {
            const ghosts = app.DOM.track.querySelectorAll('.card.focus-visible');
            ghosts.forEach(c => c.classList.remove('focus-visible'));
        }

        // 🟢 2. NOTARIO DE MEMORIA: Guardar el índice del foco actual en su contenedor
        // Buscamos si el elemento que acaba de recibir foco está en una de nuestras zonas
        const container = target.closest('#info-adicional, footer, #app-header');
        if (container) {
            // Conseguimos todos los elementos enfocables de ESA zona concreta
            const isVisible = (el) => el && el.offsetParent !== null;
            const selector = container.tagName === 'FOOTER' ? 'a' : 
                             container.id === 'info-adicional' ? 'summary, a' : 'a, button';
            
            const focusables = Array.from(container.querySelectorAll(selector)).filter(isVisible);
            
            // ¿En qué posición está el elemento que acabamos de tocar?
            const index = focusables.indexOf(target);
            if (index !== -1) {
                // Lo grabamos a fuego en el contenedor
                container.dataset.lastFocusId = index;
            }
        }
    });

    // ⭐️ LISTENER PRINCIPAL EN FASE DE CAPTURA ⭐️
    document.addEventListener('keydown', (e) => {
        // 🛡️ BLOQUEO TOTAL: Si el UI está bloqueado (toast persistente), ignorar teclado.
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
            if (document.activeElement.type === 'range' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.stopPropagation(); 
                return; // Salimos de la función inmediatamente
            }

            // 2. NAVEGACIÓN INTERNA (Tab + Flechas)
            const isTab = e.key === 'Tab';
            const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

            if (isTab || isArrow) {
                const focusables = Array.from(modalOverlay.querySelectorAll('button, input, [href], [tabindex]:not([tabindex="-1"])'));
                if (focusables.length === 0) return;

                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const current = document.activeElement;
                const currentIndex = focusables.indexOf(current);

                // EXCEPCIÓN SLIDER: Si estamos en un range, Izq/Der ajustan valor, no foco.
                if (current.type === 'range' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
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

                else 
                    nav_keyboard_details._handleDetailNavigation.call(app, e.key);

                app.STATE.keyboardNavInProgress = false;
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
            const isInCentralTrack = focused.closest('#track-desktop, #track-tablet, #track-mobile, #detalle-track-desktop, #detalle-track-mobile');

            if (isInCentralTrack) {
                debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 
                            `Flecha interceptada en track central. Bloqueando propagación.`);

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                app.STATE.keyboardNavInProgress = true;

                if (isNavActive) 
                    nav_keyboard_swipe._handleSwipeNavigation(e.key, app);

                else 
                    nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                
            } else {
                const section = focused.closest('#info-adicional, footer, #app-header, #card-volver-fija, #vista-volver');
        
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

                    else if (isDetailActive) 
                        nav_keyboard_details._handleDetailNavigation.call(app, e.key);
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
        if (tagName === 'BUTTON' || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

        const role = el.getAttribute('role');
        const isInteractive = role === 'button' || role === 'link' || tagName === 'A' || el.classList.contains('card');

        if (isInteractive) {
            if (isSpace) e.preventDefault(); 
            el.click();
        }
    }
}

function _handleLocalSectionNavigation(key, container) {
    const focusables = Array.from(container.querySelectorAll('a, button, summary, [tabindex="0"]'))
                            .filter(el => el.offsetParent !== null);
    const index = focusables.indexOf(document.activeElement);
    let next;

    if (key === 'ArrowDown' || key === 'ArrowRight') next = (index + 1) % focusables.length;
    else if (key === 'ArrowUp' || key === 'ArrowLeft') next = (index - 1 + focusables.length) % focusables.length;
    
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
    this.DOM.appContainer?.addEventListener('wheel', _handleGlobalWheel.bind(this), { passive: false, capture: true });
}

function _handleGlobalWheel(e) {
    const app = this;
    const isNavActive = app.DOM.vistaNav?.classList.contains('active');
    const isDetailActive = app.DOM.vistaDetalle?.classList.contains('active');
    
    if (app.STATE.keyboardNavInProgress || (!isNavActive && !isDetailActive)) return;
    
    const targetIsCentral = e.target.closest('#vista-central, .carousel-viewport, .detalle-viewport');
    if (!targetIsCentral) return;

    if (e.deltaY !== 0) {
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 
                    `Wheel: ${e.deltaY}. Bloqueando propagación.`);

        e.preventDefault(); 
        e.stopPropagation();
        e.stopImmediatePropagation();

        const key = e.deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
        
        app.STATE.keyboardNavInProgress = true; 

        if (isNavActive) nav_keyboard_swipe._handleSwipeNavigation(key, app);
        else nav_keyboard_details._handleDetailNavigation.call(app, key);

        // 🟢 FIX CRÍTICO: Bajamos la bandera incondicionalmente tras el frame actual.
        // Si Swiper anima, lo gestionará él, pero si choca contra un borde, esto nos salva de quedarnos trabados.
        requestAnimationFrame(() => {
            app.STATE.keyboardNavInProgress = false; 
        });
    }
}

export function _handleFocusTrap(e, viewType) {
    const app = this;

    // Usar data-layout en lugar de innerWidth
    const layout = document.body.getAttribute('data-layout') || 'desktop';
    const isMobile = layout === 'mobile';
    const isDesktop = layout === 'desktop';
    const isTabletLS = layout === 'tablet-landscape';

    const isVisible = (el) => el && el.offsetParent !== null;

    // 🟢 HELPER DE MEMORIA: Filtra los visibles y busca si el contenedor tiene memoria.
    const getGroupWithMemory = (containerSelector, selectorString) => {
        const container = document.querySelector(containerSelector);
        if (!container) return [];
        
        const focusables = Array.from(container.querySelectorAll(selectorString)).filter(isVisible);
        if (focusables.length === 0) return [];

        // Si el contenedor guardó memoria de su último índice
        const lastIndex = parseInt(container.dataset.lastFocusId, 10);
        if (!isNaN(lastIndex) && focusables[lastIndex]) {
            return [focusables[lastIndex]];
        }
        
        return focusables; // Fallback normal
    };

    const sections = {
        central: () => {
            // 🟢 CASO A: Estamos en el Menú Principal
            if (viewType === 'nav') {
                const cards = Array.from(app.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
                
                const current = cards[app.STATE.currentFocusIndex];

                if (isVisible(current)) return [current];

                const fallback = cards.find(isVisible);
                return fallback ? [fallback] : [];
            }

            // 🟢 CASO B: Estamos en la Vista de Detalles
            const detailElements = nav_base_details._getFocusableDetailElements(app).filter(el => !el.classList.contains('card-volver-vertical') && isVisible(el));
            
            // Si el estado interno recuerda dónde estábamos, devolvemos SOLO ese elemento.
            // Al ser un array de 1 solo elemento, el TAB y el SHIFT+TAB aterrizarán siempre ahí.
            if (app.STATE.lastDetailFocusIndex !== undefined && detailElements[app.STATE.lastDetailFocusIndex]) {
                return [detailElements[app.STATE.lastDetailFocusIndex]];
            }
            // Fallback: Si no hay historial, devolvemos todo el array (comportamiento original)
            return detailElements;
        },
        // 🟢 FIX: Usamos el helper de memoria para las secciones periféricas
        info: () => getGroupWithMemory('#info-adicional', 'summary, a'),
        footer: () => getGroupWithMemory('footer', 'a'),
        header: () => getGroupWithMemory('#app-header', 'a, button'),
        volver: () => {
            if (isMobile && viewType === 'detail') 
                return [app.DOM.detalleTrack.querySelector('.card-volver-vertical')].filter(isVisible);

            return [app.DOM.cardVolverFijaElemento].filter(isVisible);
        }
    };

    // 🟢 FIX CRÍTICO: Ejecutamos las búsquedas 1 sola vez y guardamos la referencia exacta en memoria
    const arrCentral = sections.central();
    const arrInfo = sections.info();
    const arrFooter = sections.footer();
    const arrHeader = sections.header();
    const arrVolver = sections.volver();

    // Armamos la secuencia usando las referencias exactas
    let sequence = (isDesktop || isTabletLS) ? 
        [arrCentral, arrInfo, arrFooter, arrHeader, arrVolver] : 
        (!isMobile ? [arrCentral, arrFooter, arrHeader, arrVolver] : [arrCentral, arrFooter, arrHeader]);

    const groups = sequence.filter(g => g.length > 0);
    
    // 🟢 FIX: Averiguar a qué grupo físico pertenece el foco actual.
    // Si estamos perdidos en el body (ej: clic fuera), intentamos recuperar el último contenedor conocido
    let currentContainer = document.activeElement.closest('#vista-central, #info-adicional, footer, #app-header, #vista-volver');
    
    if (!currentContainer && app.STATE.lastActiveZoneId) {
        // Rescatamos la última zona conocida
        currentContainer = document.getElementById(app.STATE.lastActiveZoneId) || document.querySelector(app.STATE.lastActiveZoneId);
    }
    
    let groupIdx = -1;
    if (currentContainer) {
        // Buscamos en 'groups' usando la misma referencia de Array
        if (currentContainer.id === 'vista-central') groupIdx = groups.indexOf(arrCentral);
        else if (currentContainer.id === 'info-adicional') groupIdx = groups.indexOf(arrInfo);
        else if (currentContainer.tagName === 'FOOTER') groupIdx = groups.indexOf(arrFooter);
        else if (currentContainer.id === 'app-header') groupIdx = groups.indexOf(arrHeader);
        else if (currentContainer.id === 'vista-volver') groupIdx = groups.indexOf(arrVolver);
        
        // Guardamos la zona para el futuro (si hacemos clic fuera)
        const zoneId = currentContainer.id || currentContainer.tagName.toLowerCase();
        app.STATE.lastActiveZoneId = zoneId;
    }
    
    if (groupIdx === -1) groupIdx = 0;

    // Calcular el siguiente grupo y apuntar
    // Si el currentContainer NO existía (estabamos en el body) y pulsamos TAB normal (sin shift),
    // queremos quedarnos en la zona que acabamos de rescatar, no saltar a la siguiente.
    let nextGroup;
    if (document.activeElement === document.body && !e.shiftKey) {
        nextGroup = groupIdx; // Caemos en la zona rescatada
    } else {
        nextGroup = e.shiftKey ? 
            (groupIdx <= 0 ? groups.length - 1 : groupIdx - 1) : 
            (groupIdx >= groups.length - 1 ? 0 : groupIdx + 1);
    }
    
    const target = e.shiftKey ? groups[nextGroup][groups[nextGroup].length - 1] : groups[nextGroup][0];
    if (target) target.focus();
}

/* --- code/nav-keyboard-base.js --- */