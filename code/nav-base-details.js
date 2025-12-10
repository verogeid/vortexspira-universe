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

// ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK Y FRAGMENTOS) ⭐️
/**
 * Función que actualiza las clases CSS en función del índice del slide activo.
 * Se llama desde render-details.js (listener slideChangeTransitionEnd).
 */
export function _updateDetailFocusState(appInstance) {
    const swiper = appInstance.STATE.detailCarouselInstance; 
    if (!swiper) return;
    
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, '--- INICIO: _updateDetailFocusState ---');
    
    const detailContainer = appInstance.DOM.vistaDetalle; 
    const slides = swiper.slides;
    
    // 1. Obtener el índice del slide enfocado (gestionado por Swiper)
    const focusedIndex = swiper.activeIndex;
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, `Swiper Active Index: ${focusedIndex}`);
    
    // ⭐️ Guardar el índice del elemento enfocado para la función de retorno del foco ⭐️
    appInstance.STATE.lastDetailFocusIndex = focusedIndex; 

    // 2. Proximidad y aplicación de clases
    slides.forEach((slide, index) => {
        const diff = Math.abs(index - focusedIndex);

        // Limpiar
        slide.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
        
        // El contenido real que queremos desenfocar/enfocar está dentro de la diapositiva.
        // ⭐️ FIX 1.2: Excluir .card-breadcrumb-vertical ya que tiene tabindex="-1" y no debe recibir foco JS ⭐️
        const focusableSelector = '.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical';
        const contentElements = Array.from(slide.querySelectorAll(focusableSelector));

        let content = null;
        
        if (diff === 0) {
            // En el slide enfocado, buscamos el primer elemento con tabindex="0" o más
            content = contentElements.find(el => el.tabIndex >= 0);
            
            // Si no se encuentra un foco lógico (e.g., el slide solo tiene el breadcrumb tabindex="-1"), 
            // usamos el primer elemento para las clases visuales de nitidez.
            if (!content && contentElements.length > 0) {
                 content = contentElements[0]; 
            }
        } else {
             // En slides no enfocados, usamos el primer elemento para aplicar el blur
             content = contentElements[0]; 
        }
        
        if (content) {
            content.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
            content.classList.remove('focus-current-hover'); // Limpiar hover por si acaso

            if (diff === 0) {
                // ⭐️ CLAVE: Solo enfocar si el elemento es realmente enfocable por teclado (tabIndex >= 0) ⭐️
                if (content.tabIndex >= 0) {
                   content.classList.add('focus-current');
                   // Forzamos el foco del teclado al contenido real dentro de la slide.
                   content.focus({ preventScroll: true }); 
                   debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, `Foco aplicado al contenido en slide ${index}.`);
                } else {
                   // Aplicamos la clase visual para la nitidez, pero no llamamos a focus().
                   content.classList.add('focus-current'); 
                   debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, `Clase 'focus-current' aplicada visualmente en slide ${index}.`);
                }

                // Aplicar clase al slide para estilos de contenedor si es necesario
                slide.classList.add('focus-current'); 

            } else if (diff === 1) {
                content.classList.add('focus-adj-1'); 
            } else if (diff === 2) {
                content.classList.add('focus-adj-2'); 
            }
        }
    });

    // 3. Aplicar clases binarias (para máscaras globales)
    const focusedSlide = slides[focusedIndex];
    if (focusedSlide) {
        // La detección del modo se hace buscando los elementos principales
        const isTextFocus = focusedSlide.querySelector('.detail-text-fragment') || focusedSlide.querySelector('.detail-title-slide');
        const isActionFocus = focusedSlide.querySelector('.detail-action-item');

        detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
        
        if (isActionFocus) {
            detailContainer.classList.add('mode-focus-actions');
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Modo de máscara: Actions');
        } else {
            detailContainer.classList.add('mode-focus-text');
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Modo de máscara: Text');
        }
    }
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, '--- FIN: _updateDetailFocusState ---');
};

/**
 * Helper para obtener todos los elementos enfocables (los contenidos de los slides).
 * Esto es necesario para la trampa de foco de nav-keyboard-base.js.
 */
export function _getFocusableDetailElements(appInstance) {
    if (!appInstance.DOM.detalleTrack) return [];
    
    // ⭐️ NOTA: Devolvemos el contenido real dentro de los slides ⭐️
    const slideContents = Array.from(appInstance.DOM.detalleTrack.querySelectorAll('.swiper-slide')).map(slide => 
        slide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical, .card-breadcrumb-vertical')
    ).filter(el => el && el.tabIndex !== -1); // Filtrar solo los focables reales

    let elements = [];
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    // Añadir el botón volver fijo de escritorio si está visible
    if (!isMobile && appInstance.DOM.cardVolverFijaElemento && appInstance.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
        elements.push(appInstance.DOM.cardVolverFijaElemento);
    } 

    elements.push(...slideContents);
    return elements;
};

// ⭐️ HELPER: Clic en fila -> Solo pone foco (NO click) ⭐️
export function _handleActionRowClick(e) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Acción: _handleActionRowClick (Click en Fila de Detalle)');
    
    // Apuntamos a la fila, ya que es el elemento secuencial enfocable.
    // Con Swiper, debemos encontrar el slide padre y saltar a él.
    e.preventDefault(); // ⭐️ FIX CLAVE: Prevenir la acción por defecto (si la hay) ⭐️
    
    const slide = e.currentTarget.closest('.swiper-slide');
    if (slide) {
        const swiper = App.STATE.detailCarouselInstance;
        const slides = swiper.slides;
        const targetIndex = swiper ? slides.indexOf(slide) : -1;
        
        debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, `Target Slide Index para Click: ${targetIndex}, Active Index: ${swiper.activeIndex}`);
        
        if (swiper && targetIndex > -1 && targetIndex !== swiper.activeIndex) {
             // Si el slide no está activo, deslizamos a él.
             
             // ⭐️ FIX CRÍTICO: Limpiar foco visual inmediatamente para dar feedback de que la acción se recibió ⭐️
             _clearAllFocusClasses(App.DOM.detalleTrack);
             
             swiper.slideTo(targetIndex, data.SWIPE_SLIDE_SPEED);
             debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, `SlideTo ejecutado.`);
             // El foco se actualizará en el evento 'slideChangeTransitionEnd'
        } else if (e.currentTarget) {
             // ⭐️ FIX CLAVE: Si ya estamos en el slide, forzamos el foco nativo (sin scroll) y el refresh del blur/foco. ⭐️
             e.currentTarget.focus({ preventScroll: true });
             _updateDetailFocusState(App);
             debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, `Foco forzado y estado de foco actualizado (ya en el slide).`);
        }
    }
};

/**
 * Maneja el evento de cambio de slide de Swiper y sincroniza el foco.
 */
export function _handleSlideChangeEnd(swiper, appInstance) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 'Evento: slideChangeTransitionEnd capturado.');
    _updateDetailFocusState(appInstance);
}

// --- code/nav-base-details.js ---