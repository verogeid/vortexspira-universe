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
        slide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical')
    ).filter(el => el && el.tabIndex !== -1); 

    let elements = [];
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    // Añadir el botón volver fijo de escritorio si está visible (es el primer elemento)
    if (!isMobile && appInstance.DOM.cardVolverFijaElemento && appInstance.DOM.cardVolverFijaElemento.tabIndex >= 0) { 
        elements.push(appInstance.DOM.cardVolverFijaElemento);
    } 

    elements.push(...slideContents);
    return elements;
};

// ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK Y FRAGMENTOS) ⭐️
/**
 * Función que actualiza las clases CSS en función del índice del elemento enfocable.
 * Se llama desde nav-keyboard-details.js y render-details.js.
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

    if (!focusedElement) {
        debug.logWarn('nav_base_details', 'No se pudo determinar el elemento enfocado para actualizar el blur.');
        return;
    }

    const focusedIndex = focusableElements.indexOf(focusedElement);
    
    // ⭐️ Guardar el índice del elemento enfocado para la navegación y el focus trap ⭐️
    // Se guarda el índice en la lista de elementos enfocables, NO el slide index.
    appInstance.STATE.lastDetailFocusIndex = focusedIndex; 

    // 2. Limpiar clases de todos los elementos enfocables
    focusableElements.forEach(el => {
        el.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2', 'focus-current-hover');
    });

    // 3. Proximidad y aplicación de clases
    focusableElements.forEach((content, index) => {
        const diff = Math.abs(index - focusedIndex);

        if (diff === 0) {
            content.classList.add('focus-current');
        } else if (diff === 1) {
            content.classList.add('focus-adj-1'); 
        } else if (diff === 2) {
            content.classList.add('focus-adj-2'); 
        } else if (diff >= 3) {
            // Nivel base de blur (3+ -> adj-2) ya se aplica por CSS por defecto, 
            // pero nos aseguramos de que no tenga otras clases.
        }
    });

    // 4. Aplicar clases binarias (para máscaras globales)
    const isActionFocus = focusedElement.classList.contains('detail-action-item');

    detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
    
    if (isActionFocus) {
        detailContainer.classList.add('mode-focus-actions');
        debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Modo de máscara: Actions');
    } else {
        detailContainer.classList.add('mode-focus-text');
        debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Modo de máscara: Text');
    }
    
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, '--- FIN: _updateDetailFocusState ---');
};

/**
 * Maneja el evento de cambio de slide de Swiper y sincroniza el foco.
 * (Solo se usa si hay un click en la barra de scroll de Swiper, pero no para teclado/wheel)
 */
export function _handleSlideChangeEnd(swiper, appInstance) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Evento: slideChangeTransitionEnd capturado.');
    
    // ⭐️ FIX: Resetear la bandera de navegación UNIFICADA para permitir la siguiente pulsación. ⭐️
    appInstance.STATE.keyboardNavInProgress = false; 
    
    // Forzamos el foco del teclado al primer elemento del slide recién activo
    const activeSlide = swiper.slides[swiper.activeIndex];
    const firstFocusableInSlide = activeSlide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical');
    
    if (firstFocusableInSlide && firstFocusableInSlide.tabIndex >= 0) {
        firstFocusableInSlide.focus({ preventScroll: true });
    }
    
    // Llama a la función de foco basada en el elemento activo
    _updateDetailFocusState(appInstance);
}

// ⭐️ HELPER: Clic en fila -> Solo pone foco (NO click) ⭐️
export function _handleActionRowClick(e) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Acción: _handleActionRowClick (Click en Fila de Detalle)');
    
    // El foco se aplica directamente al elemento de acción.
    e.preventDefault(); 
    
    // ⭐️ CLAVE: Aplicamos foco nativo. El focusin listener en nav-base lo gestionará. ⭐️
    e.currentTarget.focus();
    
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, `Foco forzado.`);
};

// --- code/nav-base-details.js ---