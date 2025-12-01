// --- code/nav-keyboard-base.js ---

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_details from './nav-details.js'; // Necesario para _getFocusableDetailElements en el trap de detalle
import * as nav_keyboard_details from './nav-keyboard-details.js'; // Necesario para delegar la navegación de detalle
import * as nav_base from './nav-base.js'; // Necesario para _updateFocusImpl

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
            if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
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
                _handleKeyNavigation.call(app, e.key);
            }
        } 
        else if (isDetailActive) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                // Delegamos al nuevo módulo de detalles de teclado
                nav_keyboard_details._handleDetailNavigation.call(app, e.key);
            }
        }
    });
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

export function _handleKeyNavigation(key) {
    // 'this' es la instancia de App
    const { itemsPorColumna } = this.STATE; 
    let currentIndex = this.STATE.currentFocusIndex;
    let newIndex = currentIndex;

    const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
    const totalCards = allCards.length;
    if (totalCards === 0) return;

    switch (key) {
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = totalCards - 1;
            break;
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            if (newIndex >= totalCards) newIndex = 0;
            break;
        case 'ArrowLeft':
            newIndex = currentIndex - itemsPorColumna;
            if (newIndex < 0) newIndex = totalCards - 1; 
            break;
        case 'ArrowRight':
            newIndex = currentIndex + itemsPorColumna;
            if (newIndex >= totalCards) newIndex = 0;
            break;
        case 'Enter':
        case ' ':
            if (allCards[currentIndex]) {
                const tarjeta = allCards[currentIndex];
                if (tarjeta.dataset.tipo === 'volver-vertical') {
                     if (typeof this._handleVolverClick === 'function') {
                        this._handleVolverClick();
                     }
                    return;
                }
                if (tarjeta.classList.contains('disabled')) return;

                const id = tarjeta.dataset.id;
                const tipo = tarjeta.dataset.tipo;
                
                if (typeof this._handleCardClick === 'function') {
                    this._handleCardClick(id, tipo); 
                }
            }
            return; 
    }

    if (newIndex !== currentIndex) {
        this.STATE.keyboardNavInProgress = true; 
        this.STATE.currentFocusIndex = newIndex;
        // Delegamos a _updateFocusImpl en nav_base
        nav_base._updateFocusImpl.call(this, true);
    }
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
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = focusableElements.length - 1;
            break;
        case 'ArrowRight':
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            if (newIndex >= focusableElements.length) newIndex = 0;
            break;
    }

    if (newIndex !== currentIndex) {
        focusableElements[newIndex].focus();
    }
};

export function _handleFocusTrap(e, viewType) {
    // 'this' es la instancia de App
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    const isTabletLandscape = screenWidth >= data.TABLET_LANDSCAPE_MIN_WIDTH && screenWidth <= data.TABLET_MAX_WIDTH;
    const isDesktop = screenWidth >= data.DESKTOP_MIN_WIDTH;

    const footerLinks = Array.from(document.querySelectorAll('footer a'));
    const infoPanelLinks = (isDesktop || isTabletLandscape) ? 
        Array.from(this.DOM.infoAdicional.querySelectorAll('summary, a')) : [];

    let groups = [];

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
        const detailContentLinks = nav_details._getFocusableDetailElements.call(this).filter(el => 
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
