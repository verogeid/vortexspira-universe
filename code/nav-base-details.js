// --- code/nav-base-details.js ---

import * as data from './data.js';
import * as debug from './debug.js'; // Necesario para debug

// Helper function to manually clear focus classes
function _clearAllFocusClasses(track) {
    if (!track) return;
    // Limpiamos las clases de foco de todos los elementos candidatos
    track.querySelectorAll('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical, .card-breadcrumb-vertical, .focus-current, .focus-adj-1, .focus-adj-2').forEach(el => {
        el.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
    });
}

/**
 * Helper para obtener todos los elementos enfocables secuencialmente.
 * Este listado define el orden de navegación (teclado/wheel).
 */
export function _getFocusableDetailElements(appInstance) {
    if (!appInstance.DOM.detalleTrack) return [];
    
    // Obtener todos los elementos enfocables por Swiper (contenidos reales)
    const slideContents = Array.from(appInstance.DOM.detalleTrack.querySelectorAll('.swiper-slide')).map(slide => 
        // Se busca el elemento que tenga tabIndex="0" para incluir texto, acciones y volver vertical (en móvil)
        slide.querySelector('.detail-text-fragment[tabindex="0"], .detail-action-item[tabindex="0"], .detail-title-slide + .detail-text-fragment[tabindex="0"], .card-volver-vertical[tabIndex="0"]')
    ).filter(el => el && el.tabIndex !== -1); 

    let elements = [];
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    // Añadir el botón volver fijo de escritorio si está visible
    if (!isMobile && appInstance.DOM.cardVolverFijaElemento && appInstance.DOM.cardVolverFijaElemento.classList.contains('visible') && appInstance.DOM.cardVolverFijaElemento.tabIndex >= 0) { 
        elements.push(appInstance.DOM.cardVolverFijaElemento);
    } 

    elements.push(...slideContents);
    return elements;
};

// ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK Y FRAGMENTOS) ⭐️
/**
 * Función que actualiza las clases CSS en función del índice del elemento enfocado.
 * Se llama desde nav-keyboard-details.js, render-details.js, y el listener focusin.
 */
export function _updateDetailFocusState(appInstance) {
    const swiper = appInstance.STATE.detailCarouselInstance; 
    if (!swiper) return;
    
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, '--- INICIO: _updateDetailFocusState ---');
    
    const detailContainer = appInstance.DOM.vistaDetalle; 
    const focusableElements = _getFocusableDetailElements(appInstance);
    
    // 1. Determinar el elemento actualmente enfocado (activo por teclado o Swiper)
    let focusedElement = focusableElements.find(el => el === document.activeElement);
    
    // Si no hay foco activo, usamos el índice guardado como fallback para aplicar el blur.
    if (!focusedElement && appInstance.STATE.lastDetailFocusIndex > -1) {
        focusedElement = focusableElements[appInstance.STATE.lastDetailFocusIndex];
    }
    
    // Si todavía no hay foco, forzamos el primero (Ej: al cargar)
    if (!focusedElement && focusableElements.length > 0) {
        focusedElement = focusableElements[0];
    }

    if (!focusedElement) {
        debug.logWarn('nav_base_details', 'No se pudo determinar el elemento enfocado para actualizar el blur.');
        return;
    }

    const focusedIndex = focusableElements.indexOf(focusedElement);
    
    // ⭐️ Guardar el índice del elemento enfocado ⭐️
    appInstance.STATE.lastDetailFocusIndex = focusedIndex; 

    // 2. Limpiar clases de todos los elementos enfocables (DEBEMOS LIMPIAR TODOS LOS ELEMENTOS DEL DOM, NO SOLO LOS FOCUSABLES)
    const allContent = appInstance.DOM.detalleTrack.querySelectorAll('.detail-text-fragment, .detail-action-item, .card-volver-vertical');
    allContent.forEach(el => {
        el.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2', 'focus-current-hover');
    });
    
    // Limpiar el botón volver fijo de escritorio también
    if(appInstance.DOM.cardVolverFijaElemento) {
        appInstance.DOM.cardVolverFijaElemento.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
    }


    // 3. Proximidad y aplicación de clases (UNIFICADO)
    focusableElements.forEach((content, index) => {
        const diff = Math.abs(index - focusedIndex);

        if (diff === 0) {
            content.classList.add('focus-current');
        } else if (diff === 1) {
            content.classList.add('focus-adj-1'); 
        } else if (diff === 2) {
            content.classList.add('focus-adj-2'); 
        } 
        // Para diff >= 3, la clase base ya aplica el filtro.
    });

    // 4. Aplicar clases binarias (eliminado)
    detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Modo de máscara: UNIFICADO (Blur por Proximidad)');
    
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, '--- FIN: _updateDetailFocusState ---');
};

/**
 * Maneja el evento de cambio de slide de Swiper y sincroniza el foco.
 */
export function _handleSlideChangeEnd(swiper, appInstance) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Evento: slideChangeTransitionEnd capturado.');
    
    // ⭐️ FIX CLAVE: Resetear la bandera de navegación UNIFICADA ⭐️
    appInstance.STATE.keyboardNavInProgress = false; 
    
    // Re-aplicar el foco al elemento que tiene el foco lógico guardado
    const focusableElements = _getFocusableDetailElements(appInstance);
    const elementToRefocus = focusableElements[appInstance.STATE.lastDetailFocusIndex];
    
    if (elementToRefocus) {
        elementToRefocus.focus({ preventScroll: true });
    }
    
    _updateDetailFocusState(appInstance);
}

// ⭐️ HELPER: Clic en fila -> Solo pone foco (NO click) ⭐️
export function _handleActionRowClick(e) {
    const appInstance = App;
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Acción: _handleActionRowClick (Click en Fila de Detalle)');
    
    e.preventDefault(); 
    
    const targetElement = e.currentTarget;
    const focusableElements = _getFocusableDetailElements(appInstance);
    const targetIndex = focusableElements.indexOf(targetElement);

    if (targetIndex > -1) {
        // Si el elemento clicado no es el foco actual, lo forzamos.
        if (appInstance.STATE.lastDetailFocusIndex !== targetIndex) {
            // 1. Forzar el foco sincrónicamente.
            targetElement.focus();
            // 2. Actualizar el estado de blur.
            _updateDetailFocusState(appInstance);
        }
        
    }
};

// --- code/nav-base-details.js ---