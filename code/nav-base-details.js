// --- code/nav-base-details.js ---

import * as data from './data.js';
import * as debug from './debug.js';

export function _getFocusableDetailElements(appInstance) {
    if (!appInstance.DOM.detalleTrack) return [];
    return Array.from(appInstance.DOM.detalleTrack.querySelectorAll(
        '.detail-text-fragment[tabindex="0"], .detail-action-item[tabindex="0"], .card-volver-vertical[tabindex="0"]'
    )).filter(el => el.tabIndex !== -1); 
};

/**
 * Limpieza de bordes y efectos de proximidad
 */
export function _clearDetailVisualStates(appInstance) {
    if (!appInstance.DOM.detalleTrack) return;
    appInstance.DOM.detalleTrack.querySelectorAll('.detail-text-fragment, .detail-action-item, .card-volver-vertical')
        .forEach(el => el.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2'));
    appInstance.DOM.cardVolverFijaElemento?.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
}

export function _updateDetailFocusState(appInstance) {
    const focusableElements = _getFocusableDetailElements(appInstance);
    const focusedElement = focusableElements.find(el => el === document.activeElement);
    
    if (!focusedElement) {
        if (document.activeElement.closest('#vista-volver')) {
             _clearDetailVisualStates(appInstance);
             appInstance.DOM.cardVolverFijaElemento?.classList.add('focus-current');
        }
        return;
    }

    const focusedIndex = focusableElements.indexOf(focusedElement);
    appInstance.STATE.lastDetailFocusIndex = focusedIndex; 

    _clearDetailVisualStates(appInstance);
    focusableElements.forEach((content, index) => {
        const diff = Math.abs(index - focusedIndex);
        if (diff === 0) content.classList.add('focus-current');
        else if (diff === 1) content.classList.add('focus-adj-1'); 
        else if (diff === 2) content.classList.add('focus-adj-2'); 
    });
};

export function _handleSlideChangeEnd(swiper, appInstance) {
    appInstance.STATE.keyboardNavInProgress = false; 
    const focusableElements = _getFocusableDetailElements(appInstance);
    const target = focusableElements[appInstance.STATE.lastDetailFocusIndex];
    if (target) target.focus({ preventScroll: true });
    _updateDetailFocusState(appInstance);
}

export function _handleActionRowClick(e) {
    e.currentTarget.focus();
    _updateDetailFocusState(App);
};

// --- code/nav-base-details.js ---