// --- code/nav-base-details.js ---

import * as data from './data.js';
import * as debug from './debug.js';

export function _getFocusableDetailElements(appInstance) {
    if (!appInstance.DOM.detalleTrack) return [];
    const elements = Array.from(appInstance.DOM.detalleTrack.querySelectorAll(
        '.detail-text-fragment[tabindex="0"], .detail-action-item[tabindex="0"], .card-volver-vertical[tabindex="0"]'
    )).filter(el => el.tabIndex !== -1); 

    debug.log('nav_base_details', debug.DEBUG_LEVELS.EXTREME, 
        `_getFocusableDetailElements: Encontrados ${elements.length} elementos enfocables.`);

    return elements;
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
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Iniciando _updateDetailFocusState...');

    const focusableElements = _getFocusableDetailElements(appInstance);
    const focusedElement = focusableElements.find(el => el === document.activeElement);
    
    if (!focusedElement) {
        if (document.activeElement.closest('#vista-volver')) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
                'Foco detectado en el botón Volver lateral.');

            _clearDetailVisualStates(appInstance);
            appInstance.DOM.cardVolverFijaElemento?.classList.add('focus-current');

        } else {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
                'No se detectó un elemento enfocado válido en el detalle.');
        }
        return;
    }

    const focusedIndex = focusableElements.indexOf(focusedElement);
    appInstance.STATE.lastDetailFocusIndex = focusedIndex; 

    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
        `Índice enfocado: ${focusedIndex}. Aplicando clases visuales de proximidad.`);

    _clearDetailVisualStates(appInstance);
    focusableElements.forEach((content, index) => {
        const diff = Math.abs(index - focusedIndex);
        if (diff === 0) content.classList.add('focus-current');
        else if (diff === 1) content.classList.add('focus-adj-1'); 
        else if (diff === 2) content.classList.add('focus-adj-2'); 
    });

    // 🟢 Lógica de cámara (Auto-Scroll) específica para la vista de Detalles
    const swiper = appInstance.STATE.detailCarouselInstance;
    
    if (swiper && swiper.params.direction === 'vertical') {
        const headerEl = document.getElementById('app-header');
        const headerHeight = headerEl ? headerEl.offsetHeight + 10 : 10; 
        
        const footerEl = document.querySelector('footer');
        const footerHeight = footerEl ? footerEl.offsetHeight : 0;
        
        const viewHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const bottomLimit = viewHeight - footerHeight;

        // Medición Inteligente: Párrafo exacto o slide completo (Botones)
        const isText = focusedElement.classList.contains('detail-text-fragment');
        const parentSlide = focusedElement.closest('.swiper-slide');
        const elementToMeasure = isText ? focusedElement : (parentSlide || focusedElement);

        const rect = elementToMeasure.getBoundingClientRect(); 
        
        // Separamos las coordenadas para poder modificarlas
        let topRef = rect.top;
        let bottomRef = rect.bottom;

        debug.log('nav_base_details', debug.DEBUG_LEVELS.EXTREME, 
            `Medición inicial -> topRef: ${topRef.toFixed(1)}, bottomRef: ${bottomRef.toFixed(1)} | headerH: ${headerHeight}, bottomLim: ${bottomLimit}`);

        // 🟢 FIX DEL TÍTULO: Si es el primer fragmento de texto y hay un título estático encima,
        // ampliamos la caja de medición para que la cámara no corte el título del curso.
        if (isText && parentSlide) {
            // Buscamos un título que NO sea enfocable (es decir, modo Desktop/Tablet)
            const staticTitle = parentSlide.querySelector('.detail-title-slide:not([tabindex="0"])');
            if (staticTitle) {
                // Verificamos si nuestro elemento actual es el primer párrafo de todo el slide
                const firstFocusableInSlide = parentSlide.querySelector('.detail-text-fragment[tabindex="0"]');
                if (focusedElement === firstFocusableInSlide) {
                    const titleRect = staticTitle.getBoundingClientRect();
                    // Empujamos el techo de la medición hacia arriba para englobar el título
                    topRef = Math.min(topRef, titleRect.top);

                    debug.log('nav_base_details', debug.DEBUG_LEVELS.EXTREME, 
                        `Título estático detectado. topRef ajustado a: ${topRef.toFixed(1)}`);
                }
            }
        }

        let currentTrans = swiper.translate;
        let newTrans = currentTrans;

        // 1. ¿Tapado por el Header (arriba)? Usamos topRef (que ahora puede incluir el título)
        if (topRef < headerHeight) {
            const delta = headerHeight - topRef;
            newTrans = currentTrans + delta; 

            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
                `⚠️ Obstrucción SUPERIOR detectada. Delta: ${delta.toFixed(1)}`);
        } 
        // 2. ¿Tapado por el Footer/Teclado/Fondo (abajo)?
        else if (bottomRef > bottomLimit) {
            const delta = bottomRef - bottomLimit;
            newTrans = currentTrans - delta - 20; // 20px de aire inferior
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
                `⚠️ Obstrucción INFERIOR detectada. Delta: ${delta.toFixed(1)}`);
        } else {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.EXTREME, 
                '✅ Elemento visible. No se requiere auto-scroll.');
        }

        // Respetar límites físicos del carrusel para no pasarnos
        const limitTop = swiper.minTranslate(); 
        const limitBottom = swiper.maxTranslate(); 

        if (newTrans > limitTop) newTrans = limitTop;
        if (newTrans < limitBottom) newTrans = limitBottom;

        // Mover cámara solo si hubo colisión
        if (newTrans !== currentTrans) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
                `🎥 Movimiento de cámara (Detalles): ${currentTrans.toFixed(1)} -> ${newTrans.toFixed(1)}`);

            swiper.setTransition(data.SWIPER.SLIDE_SPEED); 
            swiper.setTranslate(newTrans);
            swiper.updateProgress();
        }
    }
};

export function _handleSlideChangeEnd(swiper, appInstance) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
        'Slide Change End: Restaurando foco.');

    appInstance.STATE.keyboardNavInProgress = false; 
    const focusableElements = _getFocusableDetailElements(appInstance);
    const target = focusableElements[appInstance.STATE.lastDetailFocusIndex];

    if (target) {
        target.focus({ preventScroll: true });

    } else {
        debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
            'Slide Change End: No se encontró target para restaurar foco.');
    }

    _updateDetailFocusState(appInstance);
}

export function _handleActionRowClick(e) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
        'Fila de acción interactuada. Evaluando foco...');

    e.currentTarget.focus();
    _updateDetailFocusState(App);
};

// --- code/nav-base-details.js ---