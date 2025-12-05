// --- code/nav-base-details.js ---

import * as data from './data.js';

// ⭐️ GESTIÓN DE FOCO EN VISTA DETALLE (BLUR MASK Y FRAGMENTOS) ⭐️
/**
 * Función que actualiza las clases CSS en función del elemento enfocado.
 * Se llama desde nav-base.js (listener focusin).
 */
export function _updateDetailFocusState(focusedEl, appInstance) {
    const detailContainer = appInstance.DOM.vistaDetalle; 
    
    // 1. Obtener TODOS los elementos secuenciales enfocables (Fragmento de texto O Fila de acción)
    const sequenceItems = Array.from(detailContainer.querySelectorAll('.detail-text-fragment, .detail-action-item'));

    // Encontrar el contenedor secuencial del elemento enfocado (puede ser el botón de acción o el fragmento de texto)
    const focusedContainer = focusedEl.closest('.detail-text-fragment') || focusedEl.closest('.detail-action-item');

    // ⭐️ CORRECCIÓN: Limpiar cualquier estado de HOVER/MOUSEOVER ⭐️
    sequenceItems.forEach(item => item.classList.remove('focus-current-hover'));
    
    if (!focusedContainer) {
        // Foco fuera del contenido principal (ej. título, sidebar, footer)
        
        // ⭐️ CORRECCIÓN CLAVE: No limpiar el estado visual si el foco se mueve a un elemento de la trampa ⭐️
        const isTrapElement = focusedEl === appInstance.DOM.cardVolverFijaElemento || 
                              focusedEl.closest('#info-adicional') || 
                              focusedEl.closest('footer');
        
        if (isTrapElement) {
            // El estado visual (blur/nitidez) se congela y se mantiene.
            return;
        }
        
        // Si el foco se mueve a un elemento no controlado (ej. el h2 del curso), limpiar el estado (comportamiento de fallback original)
        sequenceItems.forEach(item => item.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2'));
        detailContainer.classList.remove('mode-focus-actions', 'mode-focus-text');
        return;
    }
    
    // Si llegamos aquí, un fragmento/acción ha sido enfocado.
    const focusedIndex = sequenceItems.indexOf(focusedContainer);
    
    // ⭐️ Guardar el índice del elemento enfocado para la función de retorno del foco ⭐️
    appInstance.STATE.lastDetailFocusIndex = focusedIndex; 

    // 2. Proximidad y aplicación de clases
    sequenceItems.forEach((item, index) => {
        const diff = Math.abs(index - focusedIndex);

        item.classList.remove('focus-current', 'focus-adj-1', 'focus-adj-2');
        
        if (diff === 0) {
            item.classList.add('focus-current');
        } else if (diff === 1) {
            item.classList.add('focus-adj-1'); 
        } else if (diff === 2) {
            item.classList.add('focus-adj-2'); 
        }
    });

    // 3. Aplicar clases binarias para el control de la MÁSCARA (ya no controlan el blur)
    const isTextFocus = focusedContainer.classList.contains('detail-text-fragment');

    if (isTextFocus) {
        detailContainer.classList.add('mode-focus-text');
        detailContainer.classList.remove('mode-focus-actions');
    } else {
        detailContainer.classList.add('mode-focus-actions');
        detailContainer.classList.remove('mode-focus-text');
    }
};

/**
 * Helper para obtener todos los elementos enfocables dentro de la vista de detalle.
 */
export function _getFocusableDetailElements(appInstance) {
    // ⭐️ CORRECCIÓN: Obtener elementos secuenciales que son focales (Fragmento de texto O Fila de acción) ⭐️
    // Se buscan los elementos dentro de la estructura Swiper de detalle.
    const detailElements = Array.from(appInstance.DOM.detalleContenido.querySelectorAll('.detail-text-fragment, .detail-action-item'));
    let elements = [];
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    if (!isMobile && appInstance.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
        elements.push(appInstance.DOM.cardVolverFijaElemento);
    } 
    // Usamos .detail-action-item/fragment para el cálculo de proximidad del blur.
    elements.push(...detailElements);
    return elements;
};

// ⭐️ HELPER: Clic en fila -> Solo pone foco (NO click) ⭐️
export function _handleActionRowClick(e) {
    // Apuntamos a la fila, ya que es el elemento secuencial enfocable.
    e.currentTarget.focus(); 
};

// --- code/nav-base-details.js ---