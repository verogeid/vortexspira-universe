// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 
import * as debug from './debug/debug.js'; 
import * as data from './data.js'; // Necesario para data.SWIPER.SLIDE_SPEED

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const app = this;
    const swiper = app.STATE.detailCarouselInstance;
    if (!swiper) return;

    // 🟢 INICIO DE LA MÁQUINA DE ESTADOS (TECLADO)
    app.STATE.currentTraceId = 'KBD-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    app.STATE.keyboardNavInProgress = true; 
    
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, 
        `\n[TRACE ${app.STATE.currentTraceId}] ⌨️ Pulsada tecla ${key}. Flag keyboardNavInProgress = TRUE`);
    
    const focusableElements = nav_base_details._getFocusableDetailElements(app);
    const totalElements = focusableElements.length;
    if (totalElements === 0) return;
    
    // ⭐️ Nuevo: Determinar el índice actual basado en el índice guardado (que es el índice en la lista enfocable) ⭐️
    let currentIndex = app.STATE._lastDetailFocusIndex || 0;
    
    // Validación de índice guardado
    if (currentIndex < 0 || currentIndex >= totalElements) {
        currentIndex = 0;
    }

    let newIndex = currentIndex;

    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 
                `[TRACE ${app.STATE.currentTraceId}] Current Focus Index (List): ${currentIndex}, Total Elements: ${totalElements}`);
    
    switch (key) {
        case 'ArrowLeft':
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            // ⭐️ FIX CLAVE: Wrap-around para ArrowUp ⭐️
            if (newIndex < 0) newIndex = totalElements - 1; 
            break;

        case 'ArrowRight':
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            // ⭐️ FIX CLAVE: Wrap-around para ArrowDown ⭐️
            if (newIndex >= totalElements) newIndex = 0; 
            break;

        case 'Enter':
        case ' ':
            // Lógica para Enter/Space 
            const targetElement = focusableElements[currentIndex];
            
            if (targetElement) {
                // Si es un botón de volver (en móvil o fijo de escritorio)
                if (targetElement.classList.contains('card-volver-vertical') || 
                    targetElement.id === 'card-volver-fija-elemento') {

                    app._handleVolverClick();
                    return;
                }
                
                // Si es un botón de acción (detail-action-item)
                if (targetElement.classList.contains('detail-action-item')) {
                    const btn = targetElement.querySelector('.detail-action-btn');
                    if (btn && !btn.classList.contains('disabled')) {
                        btn.click(); 

                        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 
                                    `[TRACE ${app.STATE.currentTraceId}] Botón de acción activado.`);

                        return;
                    }
                } 
                
                // Si es un fragmento de texto o título, simula el avance al siguiente elemento.
                if (targetElement.classList.contains('detail-text-fragment') || 
                    targetElement.classList.contains('detail-title-slide')) {

                    newIndex = currentIndex + 1;

                    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 
                                `[TRACE ${app.STATE.currentTraceId}] Enter/Space: Avanzando al siguiente fragmento.`);

                    if (newIndex >= totalElements) {
                        // ⭐️ FIX CLAVE: Wrap-around en Enter/Space ⭐️
                        newIndex = 0; 

                        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 
                                    `[TRACE ${app.STATE.currentTraceId}] Enter/Space: Saltando al primer fragmento.`);
                    }
                }

            } else {
                debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 
                            `[TRACE ${app.STATE.currentTraceId}] Enter/Space: No hay contenido enfocable en el índice actual.`);

                return; 
            }
            break;
    }

    if (newIndex !== currentIndex) {
        const newFocusElement = focusableElements[newIndex];

        if (newFocusElement) {
            debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${app.STATE.currentTraceId}] Aplicando foco a índice ${newIndex}`);

            // 1. Aplicar Foco
            newFocusElement.focus({ preventScroll: true }); // Bloqueamos el salto nativo

            app.STATE._lastDetailFocusIndex = newIndex;
            
            debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${app.STATE.currentTraceId}] 4. Llamando sincrónicamente a _updateDetailFocusState`);

            // ⭐️ FIX CLAVE 3: Forzar la actualización visual (blur/sharpness) inmediatamente ⭐️
            nav_base_details._updateDetailFocusState(app, null, app.STATE.currentTraceId); // Pasamos el traceId para mantener la trazabilidad en los logs

            // ⭐️ FIX CLAVE 4: Guardar el índice del elemento (no el índice del slide) para el focus trap ⭐️
            app.STATE._lastDetailFocusIndex = newIndex; 

            // 🟢 FIX CRÍTICO: Apagar la bandera del teclado tras el éxito, porque
            // en la vista detalle hemos desactivado el control de Swiper por defecto.
            app.STATE.keyboardNavInProgress = false
            
        } else {
            debug.logWarn('nav_keyboard_details', 
                            `No se encontró elemento enfocable en el índice ${newIndex}.`);

            // Aseguramos que se apague también en caso de error
            app.STATE.keyboardNavInProgress = false;
        }
    } else {
        // Si no hubo movimiento, abortamos la máquina de estados
        app.STATE.keyboardNavInProgress = false;

        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, 
            `[TRACE ${app.STATE.currentTraceId}] Índice sin cambios. Flag keyboardNavInProgress = FALSE`);
    }
}

function _checkAndFixVerticalObstruction(app, target, swiper, traceId = 'NA') {
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, 
        `[TRACE ${traceId}-CHK] Iniciando chequeo vertical secundario`);

    const header = document.getElementById('app-header');
    const headerHeight = header?.offsetHeight || 0;
    const footerHeight = document.querySelector('footer')?.offsetHeight || 0;
    
    const parentSlide = target.closest('.swiper-slide');
    const elementToMeasure = parentSlide || target;

    const rect = elementToMeasure.getBoundingClientRect();
    const topRef = rect.top;
    const bottomRef = rect.bottom;
    
    const viewHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    
    // Zonas Seguras (con margen estético)
    const margin = 0; 
    const safeTop = headerHeight + margin; 
    const safeBottom = viewHeight - footerHeight - margin;

    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.EXTREME, 
        `📏 CHECK VISIBILIDAD: 
        Safe Zone: ${safeTop.toFixed(0)}px <-> ${safeBottom.toFixed(0)}px
        Elemento: Top=${topRef.toFixed(1)}px | Bottom=${bottomRef.toFixed(1)}px`);

    let adjustment = 0;
    let reason = "";

    // CASO 1: Obstrucción SUPERIOR (Prioridad Máxima)
    // Si el elemento está cortado por arriba (header), hay que bajarlo SÍ o SÍ.
    if (topRef < safeTop) {
        const deltaDown = safeTop - topRef;
        adjustment = deltaDown;
        reason = "OBSTRUCCIÓN SUPERIOR (Bajando)";
    } 
    // CASO 2: Obstrucción INFERIOR (Negociable)
    // Si está cortado por abajo (footer), intentamos subirlo...
    else if (bottomRef > safeBottom) {
        const deltaUp = bottomRef - safeBottom; // Cuánto NECESITAMOS subir
        
        // Calculamos cuánto espacio libre ("Headroom") tenemos arriba antes de chocar con el Header
        const roomAbove = topRef - safeTop;
        
        // Si hay espacio, subimos.
        if (roomAbove > 0) {
            // Subimos solo lo necesario, o lo máximo permitido si no hay suficiente espacio.
            // Math.min asegura que nunca subamos tanto como para esconder el top bajo el header.
            const actualMoveUp = Math.min(deltaUp, roomAbove);
            
            adjustment = -actualMoveUp; // Negativo = Subir
            reason = `OBSTRUCCIÓN INFERIOR (Subiendo ${actualMoveUp.toFixed(1)}px de ${deltaUp.toFixed(1)}px)`;
        } else {
            // Si roomAbove <= 0, es que ya estamos pegados al header. No podemos subir más.
            reason = "OBSTRUCCIÓN INFERIOR (Ignorada: Tope superior alcanzado)";
        }
    }

    if (Math.abs(adjustment) < 1) {
        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, 
            `[TRACE ${traceId}-CHK] ✅ VISIBLE: Ok. Abortando ajuste secundario.`);

        return;
    }

    // Aplicar Corrección
    const currentTrans = swiper.getTranslate();
    const newTrans = currentTrans + adjustment;

    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.BASIC, 
        `[TRACE ${traceId}-CHK] 🔧 EJECUTANDO setTranslate secundario: ${reason}. Físico: ${currentTrans.toFixed(1)} -> Destino: ${newTrans.toFixed(1)}`);

    swiper.setTransition(data.SWIPER.SLIDE_SPEED);
    swiper.setTranslate(newTrans);
    swiper.updateProgress();
}

// --- code/nav-keyboard-details.js ---