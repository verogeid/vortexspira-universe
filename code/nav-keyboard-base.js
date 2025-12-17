// --- code/nav-keyboard-base.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 
import * as nav_keyboard_details from './nav-keyboard-details.js'; 
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js'; 
import * as nav_base from './nav-base.js'; 

/**
 * Inicialización de controles de teclado.
 */
export function initKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        const app = this; 
        if (!app?.DOM?.vistaNav) return; 

        const isNavActive = app.DOM.vistaNav.classList.contains('active');
        const isDetailActive = app.DOM.vistaDetalle.classList.contains('active');

        if (e.key === 'Tab') {
            e.preventDefault();
            isNavActive ? _handleFocusTrap.call(app, e, 'nav') : _handleFocusTrap.call(app, e, 'detail');
            return; 
        }
        
        if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof app._handleVolverClick === 'function') app._handleVolverClick(); 
            return;
        }

        if (isNavActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault(); 
                nav_keyboard_swipe._handleSwipeNavigation(e.key, app);
            }
        } 
        else if (isDetailActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                nav_keyboard_details._handleDetailNavigation.call(app, e.key);
            }
        }
    });
    
    _setupWheelListener.call(this);
};

/**
 * HANDLER TOTAL: Configura el radar de rueda de ratón.
 */
function _setupWheelListener() {
    if (this.DOM.appContainer) {
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, "RADAR: Activando captura total de Wheel.");
        this.DOM.appContainer.addEventListener('wheel', _handleGlobalWheel.bind(this), { 
            passive: false,
            capture: true 
        });
    }
};

/**
 * Lógica de intercepción de rueda.
 */
function _handleGlobalWheel(e) {
    const app = this;
    const isNavActive = app.DOM.vistaNav && app.DOM.vistaNav.classList.contains('active');
    const isDetailActive = app.DOM.vistaDetalle && app.DOM.vistaDetalle.classList.contains('active');
    
    debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `RADAR EVENTO: DeltaY=${e.deltaY}, Target=${e.target.tagName}, DetailActive=${isDetailActive}`);

    if (app.STATE.keyboardNavInProgress) {
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 'Keyboard Nav in progress');
        return; 
    }
    if (!isNavActive && !isDetailActive) {
        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, 'Is NOT Nav Active && Is NOT Details Active');
        return;
    }

    const targetIsNav = e.target.closest('.carousel-viewport');
    const targetIsDetail = e.target.closest('#vista-central, .detalle-viewport, #detalle-track-mobile');

    if (isDetailActive || isNavActive || targetIsNav || targetIsDetail) {
        if (e.deltaY !== 0) {
            // ⭐️ COMPORTAMIENTO DIFERENCIADO ⭐️
            if (isNavActive && !isDetailActive) {
                // En menús, dejamos que el evento fluya al Swiper nativo o su lógica
                // pero marcamos el inicio para evitar colisiones de teclado
                return; 
            }

            // En Detalle, interceptamos para simular teclado
            e.preventDefault(); 
            e.stopPropagation();
            
            const key = e.deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
            debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `>>> RUEDA CAPTURADA Y PROCESADA: ${key}`);

            app.STATE.keyboardNavInProgress = true; 
            nav_keyboard_details._handleDetailNavigation.call(app, key);
            
            // Liberación inmediata para permitir fluidez en detalle
            app.STATE.keyboardNavInProgress = false; 
        }
    }
};

export function _handleInfoNavigation(key) {
    const panel = this.DOM.infoAdicional;
    const elements = Array.from(panel.querySelectorAll('summary, a'));
    const currentIndex = elements.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    let newIndex = (key === 'ArrowUp') ? Math.max(0, currentIndex - 1) : Math.min(elements.length - 1, currentIndex + 1);
    if (['Enter', ' '].includes(key)) document.activeElement.click();
    if (newIndex !== currentIndex) elements[newIndex].focus();
};

export function _handleFooterNavigation(key) {
    const focusable = Array.from(document.querySelectorAll('footer a'));
    if (focusable.length === 0) return;
    const cur = focusable.indexOf(document.activeElement);
    if (cur === -1) { focusable[0].focus(); return; }
    let next = (key === 'ArrowLeft') ? (cur - 1 + focusable.length) % focusable.length : (cur + 1) % focusable.length;
    focusable[next].focus();
};

export function _handleFocusTrap(e, viewType) {
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const footerLinks = Array.from(document.querySelectorAll('footer a'));
    let groups = [];
    let detailContentLinks = [];

    if (viewType === 'nav') {
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const activeCard = allCards[this.STATE.currentFocusIndex];
        groups = isMobile ? [[activeCard].filter(Boolean), footerLinks] : [[this.DOM.cardVolverFijaElemento].filter(Boolean), [activeCard].filter(Boolean), footerLinks];
    } else {
        detailContentLinks = nav_base_details._getFocusableDetailElements(this).filter(el => el.id !== 'card-volver-fija-elemento' && !el.classList.contains('card-volver-vertical'));
        const volverElement = isMobile ? this.DOM.detalleTrack.querySelector('.card-volver-vertical') : this.DOM.cardVolverFijaElemento;
        groups = [[volverElement].filter(Boolean), detailContentLinks, footerLinks];
    }

    groups = groups.filter(g => g.length > 0);
    let gIdx = groups.findIndex(g => g.includes(document.activeElement));
    if (gIdx === -1) gIdx = 0; 
    let nextG = e.shiftKey ? (gIdx <= 0 ? groups.length - 1 : gIdx - 1) : (gIdx >= groups.length - 1 ? 0 : gIdx + 1);
    const element = e.shiftKey ? groups[nextG][groups[nextG].length - 1] : groups[nextG][0];
    element?.focus();
};

// --- code/nav-keyboard-base.js ---