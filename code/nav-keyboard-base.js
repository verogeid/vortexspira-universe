/* --- code/nav-keyboard-base.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 
import * as nav_keyboard_details from './nav-keyboard-details.js'; 
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js'; 

export function initKeyboardControls() {
    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.BASIC, 'Inicializando controles de teclado (CAPTURE Mode)');

    /* Listener para limpiar el Ghost cuando el foco se va fuera del track */
    document.addEventListener('focusin', (e) => {
        const app = this;
        if (!app.DOM.track) return;
        if (!app.DOM.track.contains(e.target)) {
            const ghosts = app.DOM.track.querySelectorAll('.card.focus-visible');
            ghosts.forEach(c => c.classList.remove('focus-visible'));
        }
    });

    // ⭐️ LISTENER PRINCIPAL EN FASE DE CAPTURA ⭐️
    // Interceptamos antes de que llegue a los hijos (Swiper)
    document.addEventListener('keydown', (e) => {
        const app = this; 
        if (!app?.DOM?.vistaNav) return; 

        const isNavActive = app.DOM.vistaNav.classList.contains('active');
        const isDetailActive = app.DOM.vistaDetalle.classList.contains('active');
        const focused = document.activeElement;

        // Log para ver quién recibe la tecla
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `Key: ${e.key} | Target: ${e.target.tagName}`);

        // 1. ESCAPE
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation(); // Stop bubbling
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
        if (e.key === 'Enter' || e.key === ' ') {
            const isInSwipe = focused.closest('#track-desktop, #track-tablet, #track-mobile');
            const isInDetail = focused.closest('#detalle-track-desktop, #detalle-track-mobile');

            if (isInSwipe || isInDetail) {
                e.preventDefault();
                e.stopPropagation(); // Bloqueamos para que Swiper no haga clic o slide
                
                app.STATE.keyboardNavInProgress = true;
                if (isNavActive) nav_keyboard_swipe._handleSwipeNavigation(e.key, app);
                else nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                app.STATE.keyboardNavInProgress = false;
                return;
            }
        }

        // 4. CURSORES (FLECHAS)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const isInCentralTrack = focused.closest('#track-desktop, #track-tablet, #track-mobile, #detalle-track-desktop, #detalle-track-mobile');

            if (isInCentralTrack) {
                debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `Flecha interceptada en track central. Bloqueando propagación.`);
                
                // ⭐️ EL MURO: Detenemos todo para que Swiper no reciba la tecla ⭐️
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                app.STATE.keyboardNavInProgress = true;
                if (isNavActive) nav_keyboard_swipe._handleSwipeNavigation(e.key, app);
                else nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                
                setTimeout(() => { app.STATE.keyboardNavInProgress = false; }, 50);
            } else {
                // Navegación periférica
                const section = focused.closest('#info-adicional, footer, #app-header, #card-volver-fija, #vista-volver');
                if (section) {
                    e.preventDefault();
                    _handleLocalSectionNavigation(e.key, section);
                    if (isDetailActive) nav_base_details._clearDetailVisualStates(app);
                } else if (document.activeElement === document.body) {
                    // Rescate
                    e.preventDefault();
                    app.STATE.keyboardNavInProgress = true;
                    if (isNavActive) nav_keyboard_swipe._handleSwipeNavigation(e.key, app);
                    else if (isDetailActive) nav_keyboard_details._handleDetailNavigation.call(app, e.key);
                    setTimeout(() => { app.STATE.keyboardNavInProgress = false; }, 50);
                }
            }
        }
    }, { capture: true }); // <--- IMPORTANTE: capture: true
    
    _setupInfoAccordion.call(this);
    _setupWheelListener.call(this);
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
    // ⭐️ WHEEL también en modo CAPTURE ⭐️
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
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `Wheel: ${e.deltaY}. Bloqueando propagación.`);
        
        // Bloqueo total del evento de rueda
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
    const width = window.innerWidth;
    const isMobile = width <= data.MAX_WIDTH.MOBILE;
    const isDesktop = width >= data.MAX_WIDTH.TABLET_LANDSCAPE;
    const isTabletLS = width > data.MAX_WIDTH.TABLET_PORTRAIT && width < data.MAX_WIDTH.TABLET_LANDSCAPE;
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
        header: () => [app.DOM.btnA11y].filter(isVisible),
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