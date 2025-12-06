// --- code/nav-base-details.js ---

import * as data from './data.js';
import * as debug from './debug.js'; // Necesario para debug

// ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK Y FRAGMENTOS) ⭐️
/**
 * Función que actualiza las clases CSS en función del índice del slide activo.
 * Se llama desde render-details.js (listener slideChangeTransitionEnd).
 */
export function _updateDetailFocusState(appInstance) {
    const swiper = appInstance.STATE.detailCarouselInstance; 
    if (!swiper) return;

    const detailContainer = appInstance.DOM.vistaDetalle; 
    const slides = swiper.slides;
    
    // 1. Obtener el índice del slide enfocado (gestionado por Swiper)
    const focusedIndex = swiper.activeIndex;
    
    // ⭐️ Guardar el índice del elemento enfocado para la función de retorno del foco ⭐️
    appInstance.STATE.lastDetailFocusIndex = focusedIndex; 

    // 2. Proximidad y aplicación de clases
    slides.forEach((slide, index) => {
        const diff = Math.abs(index - focusedIndex);

        // Limpiar
        slide.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
        
        // El contenido real que queremos desenfocar/enfocar está dentro de la diapositiva.
        const content = slide.querySelector('.detail-text-fragment, .detail-action-item, .detail-title-slide, .card-volver-vertical, .card-breadcrumb-vertical');
        if (content) {
            content.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
            content.classList.remove('focus-current-hover'); // Limpiar hover por si acaso

            if (diff === 0) {
                content.classList.add('focus-current');
                // Forzamos el foco del teclado al contenido real dentro de la slide.
                // ⭐️ FIX CLAVE: Añadir { preventScroll: true } para evitar el scroll nativo si Swiper ya ha posicionado el slide. ⭐️
                content.focus({ preventScroll: true }); 
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
        const isTextFocus = focusedSlide.querySelector('.detail-text-fragment') || focusedSlide.querySelector('.detail-title-slide');
        const isActionFocus = focusedSlide.querySelector('.detail-action-item');

        detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
        
        if (isActionFocus) {
            detailContainer.classList.add('mode-focus-actions');
        } else {
            detailContainer.classList.add('mode-focus-text');
        }
    }
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
    // Apuntamos a la fila, ya que es el elemento secuencial enfocable.
    // Con Swiper, debemos encontrar el slide padre y saltar a él.
    const slide = e.currentTarget.closest('.swiper-slide');
    if (slide) {
        const swiper = App.STATE.detailCarouselInstance;
        const slides = swiper.slides;
        const targetIndex = swiper ? slides.indexOf(slide) : -1;
        
        if (swiper && targetIndex > -1 && targetIndex !== swiper.activeIndex) {
             // Si el slide no está activo, deslizamos a él.
             swiper.slideTo(targetIndex, data.SWIPE_SLIDE_SPEED);
             // El foco se actualizará en el evento 'slideChangeTransitionEnd'
        } else if (e.currentTarget) {
             // ⭐️ FIX CLAVE: Si ya estamos en el slide, forzamos el foco nativo (sin scroll) y el refresh del blur/foco. ⭐️
             e.currentTarget.focus({ preventScroll: true });
             _updateDetailFocusState(App);
        }
    }
};

/**
 * Maneja el evento de cambio de slide de Swiper y sincroniza el foco.
 */
export function _handleSlideChangeEnd(swiper, appInstance) {
    _updateDetailFocusState(appInstance);
}

// --- code/nav-base-details.js ---
