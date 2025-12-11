// --- code/nav-keyboard-base.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 
import * as nav_keyboard_details from './nav-keyboard-details.js'; 
import * as nav_keyboard_swipe from './nav-keyboard-swipe.js'; 
import * as nav_base from './nav-base.js'; 

/**
 * Función de inicialización de los controles de teclado (Entry Point).
 */
export function initKeyboardControls() {
    // Usamos 'app' como alias para 'this' dentro del closure del listener
    document.addEventListener('keydown', (e) => {
        const app = this; 

        if (!app || !app.DOM || !app.DOM.vistaNav) return; 

        const isNavActive = app.DOM.vistaNav.classList.contains('active');
        const isDetailActive = app.DOM.vistaDetalle.classList.contains('active');

        debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `Tecla: ${e.key}. Nav Active: ${isNavActive}, Detail Active: ${isDetailActive}`);

        if (e.key === 'Tab') {
            e.preventDefault();
            if (isNavActive) {
                _handleFocusTrap.call(app, e, 'nav');
            } else if (isDetailActive) {
                _handleFocusTrap.call(app, e, 'detail');
            }
            return; 
        }
        
        if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof app._handleVolverClick === 'function') {
                app._handleVolverClick(); 
            }
            return;
        }

        // Lógica para info panel (derecho)
        const isInfoPanel = document.activeElement.closest('#info-adicional');
        if (isInfoPanel) {
             if (['ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                _handleInfoNavigation.call(app, e.key);
            }
            return;
        }
        
        // Lógica para footer
        const isFooterActive = document.activeElement.closest('footer');
        if (isFooterActive) {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { 
                e.preventDefault(); 
                _handleFooterNavigation.call(app, e.key);
            }
            return; 
        }

        // Lógica para botón Volver Fijo
        if (document.activeElement === app.DOM.cardVolverFijaElemento) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (typeof app._handleVolverClick === 'function') {
                    app._handleVolverClick();
                }
            }
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
                // ⬇️ Delegamos al módulo de detalles de teclado ⬇️
                debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `Delegando tecla ${e.key} a nav_keyboard_details.`);
                nav_keyboard_details._handleDetailNavigation.call(app, e.key);
            }
        }
    });
    
    // ⭐️ AÑADIDO: Inicializar el listener global de rueda de ratón ⭐️
    _setupWheelListener.call(this);
};

// ⭐️ AÑADIDO: Handler centralizado para la rueda del ratón (Mouse Wheel) ⭐️
function _setupWheelListener() {
    // 'this' es la instancia de App
    if (this.DOM.appContainer) {
        // Adjuntamos al contenedor principal de la app para asegurar la captura
        this.DOM.appContainer.addEventListener('wheel', _handleGlobalWheel.bind(this), { passive: false });
    }
};

/**
 * Handler para el evento de rueda de ratón.
 * Delega la navegación de teclado si estamos en móvil.
 */
function _handleGlobalWheel(e) {
    // 'this' es la instancia de App
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    if (!isMobile) return; 

    const isNavActive = this.DOM.vistaNav && this.DOM.vistaNav.classList.contains('active');
    const isDetailActive = this.DOM.vistaDetalle && this.DOM.vistaDetalle.classList.contains('active');
    
    // ⭐️ FIX: Si la navegación está en curso (teclado/rueda), salimos inmediatamente ⭐️
    if (this.STATE.keyboardNavInProgress) return; 

    if (!isNavActive && !isDetailActive) return;

    // Solo actuamos si el evento se origina dentro de las vistas de carrusel móvil
    const targetIsNavContent = e.target.closest('#nav-swiper-mobile'); 
    const targetIsDetailContent = e.target.closest('#detalle-swiper-mobile');

    if (targetIsNavContent || targetIsDetailContent) {
        
        // ⭐️ CORRECCIÓN CLAVE: Interceptamos el scroll nativo ⭐️
        if (e.deltaY !== 0) {
            e.preventDefault(); 
            
            const key = e.deltaY > 0 ? 'ArrowDown' : 'ArrowUp';
            debug.log('nav_keyboard_base', debug.DEBUG_LEVELS.DEEP, `Rueda de ratón capturada. Tecla simulada: ${key}.`);

            // ⭐️ FIX: Bloquear y delegar el evento ⭐️
            this.STATE.keyboardNavInProgress = true; 

            if (isNavActive) {
                // Navegación de menú móvil (Foco secuencial)
                nav_keyboard_swipe._handleSwipeNavigation(key, this);
            } else if (isDetailActive) {
                 // Navegación de detalle (Salto de slide)
                 nav_keyboard_details._handleDetailNavigation.call(this, key);
            }
            // El reset de keyboardNavInProgress se hace en handleSlideChangeEnd (nav-base-details.js / nav-mouse-swipe.js)
            return;
        }
    }
};


export function _handleInfoNavigation(key) {
    // 'this' es la instancia de App
    const panel = this.DOM.infoAdicional;
    const elements = Array.from(panel.querySelectorAll('summary, a'));
    const currentIndex = elements.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (key === 'ArrowUp') newIndex = Math.max(0, currentIndex - 1);
    if (key === 'ArrowDown') newIndex = Math.min(elements.length - 1, currentIndex + 1);
    
    if (key === 'Enter' || key === ' ') {
        document.activeElement.click();
    }

    if (newIndex !== currentIndex) elements[newIndex].focus();
};

export function _handleFooterNavigation(key) {
    // 'this' es la instancia de App
    const focusableElements = Array.from(document.querySelectorAll('footer a'));
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(document.activeElement);
    if (currentIndex === -1) {
        focusableElements[0].focus();
        return;
    }

    let newIndex = currentIndex;
    switch (key) {
        case 'ArrowLeft':
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = focusableElements.length - 1;
            break;
        case 'ArrowRight':
            newIndex = currentIndex + 1;
            if (newIndex >= focusableElements.length) newIndex = 0;
            break;
        case 'ArrowUp':
        case 'ArrowDown':
            return; 
    }

    if (newIndex !== currentIndex) {
        focusableElements[newIndex].focus();
    }
};

export function _handleFocusTrap(e, viewType) {
    // 'this' es la instancia de App
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    const isTabletLandscape = screenWidth > data.TABLET_PORTRAIT_MAX_WIDTH && screenWidth <= data.TABLET_LANDSCAPE_MAX_WIDTH;
    const isDesktop = screenWidth > data.TABLET_LANDSCAPE_MAX_WIDTH;

    const footerLinks = Array.from(document.querySelectorAll('footer a'));
    const infoPanelLinks = (isDesktop || isTabletLandscape) ? 
        Array.from(this.DOM.infoAdicional.querySelectorAll('summary, a')) : [];

    let groups = [];
    let detailContentLinks = [];

    if (viewType === 'nav') {
        const allCards = this.DOM.track ? Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
        const activeCard = allCards[this.STATE.currentFocusIndex] || null;

        if (isMobile) {
            groups = [ [activeCard].filter(Boolean), footerLinks ];
        } else { 
            const cardVolver = (this.DOM.cardVolverFijaElemento && this.DOM.cardVolverFijaElemento.tabIndex === 0) ? this.DOM.cardVolverFijaElemento : null;
            groups = [
                [cardVolver].filter(Boolean),
                [activeCard].filter(Boolean),
                infoPanelLinks,
                footerLinks
            ];
        }
    } 
    else if (viewType === 'detail') {
        // Obtenemos los elementos enfocables del módulo de detalles
        const allFocusableDetailElements = nav_base_details._getFocusableDetailElements(this); 

        // Los elementos de contenido de detalle son los que no son 'Volver Fijo'
        detailContentLinks = allFocusableDetailElements.filter(el => 
            !el.classList.contains('card-volver-vertical') && 
            el.id !== 'card-volver-fija-elemento'
        );
        let volverElement = (!isMobile && (this.DOM.cardVolverFijaElemento && this.DOM.cardVolverFijaElemento.tabIndex === 0)) ? this.DOM.cardVolverFijaElemento : null;

        groups = [
            [volverElement].filter(Boolean),
            detailContentLinks, 
            infoPanelLinks,
            footerLinks
        ];
    }

    groups = groups.filter(g => g.length > 0);
    if (groups.length === 0) return;

    let currentGroupIndex = -1;
    for (let i = 0; i < groups.length; i++) {
        if (groups[i].includes(document.activeElement)) {
            currentGroupIndex = i;
            break;
        }
    }
    // Si el foco estaba en el body o en un elemento fuera de los grupos
    if (currentGroupIndex === -1) currentGroupIndex = 0; 

    let nextGroupIndex;
    if (e.shiftKey) { 
        nextGroupIndex = (currentGroupIndex <= 0) ? groups.length - 1 : currentGroupIndex - 1;
    } else { 
        nextGroupIndex = (currentGroupIndex >= groups.length - 1) ? 0 : currentGroupIndex + 1;
    }

    const nextGroup = groups[nextGroupIndex];
    let elementToFocus;

    if (e.shiftKey) {
        elementToFocus = nextGroup[nextGroup.length - 1];
    } else {
        elementToFocus = nextGroup[0];
    }
    
    // ⭐️ CORRECCIÓN CLAVE: RESTAURAR EL FOCO EN LA VISTA DE DETALLE ⭐️
    // Se utiliza la longitud de detailContentLinks para identificar si el grupo es el de contenido.
    if (viewType === 'detail' && detailContentLinks && nextGroup.length === detailContentLinks.length) {
        
        const lastIndex = this.STATE.lastDetailFocusIndex || 0;
        let restoredElement = detailContentLinks[lastIndex];

        if (restoredElement) {
            elementToFocus = restoredElement;
        } else {
            // Fallback al primer elemento
            elementToFocus = detailContentLinks[0];
        }
    }
    
    // Lógica para aplicar la clase focus-visible durante el trap
    const activeCard = this.DOM.track ? this.DOM.track.querySelector('[data-id].focus-visible') : null;
    if (activeCard && activeCard !== elementToFocus) {
        activeCard.classList.remove('focus-visible');
    }

    if (this.DOM.cardVolverFijaElemento && document.activeElement === this.DOM.cardVolverFijaElemento && elementToFocus !== this.DOM.cardVolverFijaElemento) {
        this.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
    }

    if (elementToFocus === this.DOM.cardVolverFijaElemento) {
         elementToFocus.classList.add('focus-visible');
    }
    
    const allCards = this.DOM.track ? Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])')) : [];
    if (allCards.length > 0 && allCards.includes(elementToFocus)) {
        elementToFocus.classList.add('focus-visible');
    }

    if (elementToFocus) {
        elementToFocus.focus();
    }
};

// --- code/nav-keyboard-base.js ---