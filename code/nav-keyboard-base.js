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
        if (!app.DOM.track) return;
        if (!app.DOM.track.contains(e.target)) {
            const ghosts = app.DOM.track.querySelectorAll('.card.focus-visible');
            ghosts.forEach(c => c.classList.remove('focus-visible'));
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
                const closeBtn = document.getElementById('a11y-close');
                if (closeBtn) closeBtn.click();
                return;
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
            if (e.key !== 'F5' && e.key !== 'F12') { 
                e.stopPropagation();
            }
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
                if (isNavActive) nav_keyboard_swipe._handleSwipeNavigation(e.key, app);
                else nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                app.STATE.keyboardNavInProgress = false;
                return;
            }
            
            _handleActionKeys(e); 
        }

        // 4. CURSORES (FLECHAS) - Navegación Principal
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const isInCentralTrack = focused.closest('#track-desktop, #track-tablet, #track-mobile, #detalle-track-desktop, #detalle-track-mobile');

            if (isInCentralTrack) {
                debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 
                            `Flecha interceptada en track central. Bloqueando propagación.`);

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                app.STATE.keyboardNavInProgress = true;
                if (isNavActive) nav_keyboard_swipe._handleSwipeNavigation(e.key, app);
                else nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                
                setTimeout(() => { app.STATE.keyboardNavInProgress = false; }, 50);
            } else {
                const section = focused.closest('#info-adicional, footer, #app-header, #card-volver-fija, #vista-volver');
                if (section) {
                    e.preventDefault();
                    _handleLocalSectionNavigation(e.key, section);
                    if (isDetailActive) nav_base_details._clearDetailVisualStates(app);
                } else if (document.activeElement === document.body) {
                    e.preventDefault();
                    app.STATE.keyboardNavInProgress = true;
                    if (isNavActive) nav_keyboard_swipe._handleSwipeNavigation(e.key, app);
                    else if (isDetailActive) nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                    setTimeout(() => { app.STATE.keyboardNavInProgress = false; }, 50);
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
    
    if (next !== undefined && focusables[next]) focusables[next].focus();
}

function _setupInfoAccordion() {
    const panels = this.DOM.infoAdicional?.querySelectorAll('details');
    if (!panels) return;

    panels.forEach(panel => {
        const summary = panel.querySelector('summary');
        summary?.addEventListener('click', () => {
            if (!panel.open) { 
                panels.forEach(other => { if (other !== panel) other.open = false; });
            }
        });
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
        app.STATE.keyboardNavInProgress = false; 
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

    const sections = {
        central: () => {
            if (viewType === 'nav') {
                const cards = Array.from(app.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
                const current = cards[app.STATE.currentFocusIndex];
                if (isVisible(current)) return [current];
                const fallback = cards.find(isVisible);
                return fallback ? [fallback] : [];
            }
            return nav_base_details._getFocusableDetailElements(app).filter(el => !el.classList.contains('card-volver-vertical') && isVisible(el));
        },
        info: () => Array.from(app.DOM.infoAdicional?.querySelectorAll('summary, a') || []).filter(isVisible),
        footer: () => Array.from(document.querySelectorAll('footer a')).filter(isVisible),
        header: () => Array.from(app.DOM.header.querySelectorAll('a, button')).filter(isVisible),
        volver: () => {
            if (isMobile && viewType === 'detail') return [app.DOM.detalleTrack.querySelector('.card-volver-vertical')].filter(isVisible);
            return [app.DOM.cardVolverFijaElemento].filter(isVisible);
        }
    };

    let sequence = (isDesktop || isTabletLS) ? 
        [sections.central(), sections.info(), sections.footer(), sections.header(), sections.volver()] : 
        (!isMobile ? [sections.central(), sections.footer(), sections.header(), sections.volver()] : [sections.central(), sections.footer(), sections.header()]);

    const groups = sequence.filter(g => g.length > 0);
    let gIdx = groups.findIndex(g => g.includes(document.activeElement));
    if (gIdx === -1) gIdx = 0;

    let nextG = e.shiftKey ? (gIdx <= 0 ? groups.length - 1 : gIdx - 1) : (gIdx >= groups.length - 1 ? 0 : gIdx + 1);
    const target = e.shiftKey ? groups[nextG][groups[nextG].length - 1] : groups[nextG][0];
    if (target) target.focus();
}

/* --- code/nav-keyboard-base.js --- */