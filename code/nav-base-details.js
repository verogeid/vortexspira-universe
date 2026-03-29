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

export function _updateDetailFocusState(appInstance, targetOverride = null) {
    const traceId = appInstance.STATE.currentTraceId || 'AUTO';

    debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
        `[TRACE ${traceId}] Iniciando _updateDetailFocusState...`);

    const focusableElements = _getFocusableDetailElements(appInstance);

    // 🟢 FIX: Si nos pasan un fantasma, lo usamos. Si no, buscamos el foco físico del teclado.
    const focusedElement = targetOverride || 
                            focusableElements.find(el => el === document.activeElement);

    if (!focusedElement) {
        if (document.activeElement.closest('#vista-volver')) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
                `[TRACE ${traceId}] Foco detectado en el botón Volver lateral.`);

            _clearDetailVisualStates(appInstance);
            appInstance.DOM.cardVolverFijaElemento?.classList.add('focus-current');

        } else {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
                `[TRACE ${traceId}] No se detectó un elemento enfocado válido en el detalle.`);
        }
        return;
    }

    const focusedIndex = focusableElements.indexOf(focusedElement);
    appInstance.STATE._lastDetailFocusIndex = focusedIndex; 

    debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
        `[TRACE ${traceId}] Índice enfocado: ${focusedIndex}. Aplicando clases visuales de proximidad.`);

    // 🟢 FIX: Usamos la nueva función modular
    _applyVisualClasses(appInstance, focusedIndex);

    // 🟢 Lógica de cámara (Auto-Scroll) específica para la vista de Detalles
    const swiper = appInstance.STATE.detailCarouselInstance;
    
    if (swiper && swiper.params.direction === 'vertical') {
        
        // 🟢 1. PURGA NATIVA: El antídoto contra el secuestro del navegador
        if (swiper.el.scrollTop !== 0) swiper.el.scrollTop = 0;
        if (swiper.wrapperEl.scrollTop !== 0) swiper.wrapperEl.scrollTop = 0;

        const headerEl = document.getElementById('app-header');
        const headerHeight = headerEl ? headerEl.offsetHeight + 10 : 10; 
        
        const footerEl = document.querySelector('footer');
        const footerHeight = footerEl ? footerEl.offsetHeight : 0;
        
        const viewHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const windowBottomLimit = viewHeight - footerHeight;

        // 🟢 2. LÍMITES FÍSICOS ABSOLUTOS (La caja de cristal real)
        const swiperRect = swiper.el.getBoundingClientRect();
        const safeTop = Math.max(headerHeight, swiperRect.top);
        const safeBottom = Math.min(windowBottomLimit, swiperRect.bottom);

        // 🟢 3. MEDICIÓN DEL ELEMENTO
        const isText = focusedElement.classList.contains('detail-text-fragment');
        const parentSlide = focusedElement.closest('.swiper-slide');
        const elementToMeasure = isText ? focusedElement : (parentSlide || focusedElement);

        let rect = elementToMeasure.getBoundingClientRect();
        let topRef = rect.top;
        let bottomRef = rect.bottom;

        // Si es el primer párrafo, anclamos la medición a su título
        if (isText && parentSlide) {
            const staticTitle = parentSlide.querySelector('.detail-title-slide:not([tabindex="0"])');
            if (staticTitle) {
                const firstFocusableInSlide = parentSlide.querySelector('.detail-text-fragment[tabindex="0"]');
                if (focusedElement === firstFocusableInSlide) {
                    topRef = Math.min(topRef, staticTitle.getBoundingClientRect().top);
                }
            }
        }

        // 🟢 4. MATEMÁTICA DE COLISIÓN (La que funcionaba bien)
        let physicalTrans = swiper.getTranslate();
        let adjustment = 0;

        // Evaluamos primero si choca por abajo
        if (bottomRef > safeBottom) {
            // Un poco de aire (10px) para que no quede pegado al ras del suelo
            adjustment = safeBottom - bottomRef - 10; 
        }

        // 🟢 EL VETO IMPERATIVO: El Header manda por encima de todo
        // Si ya chocaba arriba, o si nuestro intento de subirlo lo hace chocar arriba:
        if (topRef + adjustment < safeTop) {
            adjustment = safeTop - topRef; 
            debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${traceId}-UDF] ⚠️ Ajuste SUPERIOR Imperativo: ${adjustment.toFixed(1)}`);
        } else if (adjustment !== 0) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${traceId}-UDF] ⚠️ Ajuste INFERIOR: ${adjustment.toFixed(1)}`);
        }

        let newTrans = physicalTrans + adjustment;

        // Respetar límites absolutos del carrusel para no pasarnos
        const limitTop = swiper.minTranslate(); 
        const limitBottom = swiper.maxTranslate(); 
        if (newTrans > limitTop) newTrans = limitTop;
        if (newTrans < limitBottom) newTrans = limitBottom;

        // 🟢 5. EJECUCIÓN CON ESCUDO (Respetando Rueda de Ratón)
        const isDestinationSame = Math.abs(newTrans - swiper.translate) <= 1;

        if (appInstance.STATE.isAutoScrolling && !isDestinationSame) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${traceId}-UDF] ⛔ IGNORADO: Escudo activo.`);
            return; 
        }

        if (!isDestinationSame) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${traceId}-UDF] 🎥 setTranslate: ${physicalTrans.toFixed(1)} -> ${newTrans.toFixed(1)}`);
            
                // 🛡️ 1. LEVANTAR ESCUDO GLOBAL: Bloqueamos teclado, ratón y touch
            if (typeof appInstance.blockUI === 'function') {
                appInstance.blockUI();
            }
            
            swiper.setTransition(data.SWIPER.SLIDE_SPEED || 300); 
            swiper.setTranslate(newTrans);
            swiper.updateProgress();

            // 🛡️ 2. BAJAR ESCUDO: Cuando termina la animación
            clearTimeout(appInstance.STATE._autoScrollTimeout);

            appInstance.STATE._autoScrollTimeout = setTimeout(() => {
                if (typeof appInstance.unblockUI === 'function') {
                    appInstance.unblockUI();
                }

                // Actualizamos visuales post-animación
                swiper.update();
                
                debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
                    `[TRACE ${traceId}-UDF] 🛡️ Escudo bajado.`);
                    
            }, (data.SWIPER.SLIDE_SPEED || 300) + 50);
        } else {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${traceId}-UDF] 🛑 Destino idéntico.`);
        }
    }
};

export function _handleSlideChangeEnd(swiper, appInstance) {
    debug.log('nav_base_details', debug.DEBUG_LEVELS.BASIC, 'Slide Change End: Evaluando restauración de foco.');
    
    appInstance.STATE.keyboardNavInProgress = false; 

    // 🟢 FIX SILENCIO A11Y: Comparamos el foco físico real con nuestro índice fantasma.
    const focusableElements = _getFocusableDetailElements(appInstance);
    const physicalFocusIndex = focusableElements.indexOf(document.activeElement);

    // 🟢 FIX: Recuperamos el Snap visual sin interrumpir al lector
    // Si no hay foco físico en el detalle, o el radar lo movió:
    if (physicalFocusIndex !== -1 && appInstance.STATE._lastDetailFocusIndex !== physicalFocusIndex) {
        const ghostElement = focusableElements[appInstance.STATE._lastDetailFocusIndex];
        
        if (ghostElement) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.DEEP, 
                `🛑 SILENCIO A11Y: Auto-encuadrando elemento fantasma (${appInstance.STATE._lastDetailFocusIndex}) sin robar foco físico.`);
            
            // Le pasamos el elemento fantasma para que la cámara lo desencubra
            _updateDetailFocusState(appInstance, ghostElement);
        }
        return;
    }

    const target = focusableElements[appInstance.STATE._lastDetailFocusIndex];
    
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

// 🟢 NUEVO: Aplica las clases de opacidad visual sin mover el carrusel ni forzar foco físico
export function _applyVisualClasses(appInstance, activeIndex) {
    const focusableElements = _getFocusableDetailElements(appInstance);
    _clearDetailVisualStates(appInstance);
    
    focusableElements.forEach((content, index) => {
        const diff = Math.abs(index - activeIndex);
        if (diff === 0) content.classList.add('focus-current');
        else if (diff === 1) content.classList.add('focus-adj-1'); 
        else if (diff === 2) content.classList.add('focus-adj-2'); 
    });
}

// 🟢 Escanea qué elemento asoma bajo el header durante el scroll táctil
export function _handleTouchScrollRadar(appInstance) {
    const swiper = appInstance.STATE.detailCarouselInstance;
    if (!swiper || swiper.params.direction !== 'vertical') return;

    const headerEl = document.getElementById('app-header');
    const headerHeight = headerEl ? headerEl.offsetHeight + 10 : 10;

    // 🟢 Necesitamos el footer para medir la zona segura real
    const footerEl = document.querySelector('footer');
    const footerHeight = footerEl ? footerEl.offsetHeight : 0;
    const viewHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const windowBottomLimit = viewHeight - footerHeight;

    // 🟢 FIX CRÍTICO: Los mismos límites seguros de caja para el radar
    const swiperRect = swiper.el.getBoundingClientRect();
    const safeTop = Math.max(headerHeight, swiperRect.top);
    const safeBottom = Math.min(windowBottomLimit, swiperRect.bottom);

    // 🟢 NUEVO: Detección del Vector de Lectura (Dirección del scroll)
    const currentTrans = swiper.translate;
    const lastTrans = appInstance.STATE._radarLastTrans !== undefined ? appInstance.STATE._radarLastTrans : currentTrans;

    // translate negativo = bajar por el documento
    if (currentTrans < lastTrans) {
        appInstance.STATE._isScrollingDown = true;
    } else if (currentTrans > lastTrans) {
        appInstance.STATE._isScrollingDown = false;
    }
    appInstance.STATE._radarLastTrans = currentTrans;

    // Por defecto asumimos avance natural (hacia abajo)
    const isScrollingDown = appInstance.STATE._isScrollingDown !== false;

    const focusableElements = _getFocusableDetailElements(appInstance);
    let validCandidates = [];

    for (let i = 0; i < focusableElements.length; i++) {
        const el = focusableElements[i];
        const isText = el.classList.contains('detail-text-fragment');
        const parentSlide = el.closest('.swiper-slide');
        const elementToMeasure = isText ? el : (parentSlide || el);

        const rect = elementToMeasure.getBoundingClientRect();
        
        // 🟢 FIX: Medición estricta del área verdaderamente visible contra la CAJA de Swiper
        const visibleTop = Math.max(rect.top, safeTop);
        const visibleBottom = Math.min(rect.bottom, safeBottom);
        const visibleHeight = visibleBottom - visibleTop;

        // 🟢 FIX: Cálculo dinámico de "2 líneas" según la tipografía y zoom actuales
        const style = window.getComputedStyle(elementToMeasure);
        let lineHeight = parseFloat(style.lineHeight);

        // Fallback matemático seguro por si el navegador devuelve "normal" en lugar de píxeles
        if (isNaN(lineHeight)) {
            lineHeight = parseFloat(style.fontSize) * 1.5; 
        }
        
        const minimalLinesHeight = lineHeight * data.VIEWPORT.DETAILS.minLinesHeight;

        // Si se ven al menos 2 líneas del elemento (o el elemento entero si mide menos que eso)
        if (visibleHeight >= minimalLinesHeight || 
            (visibleHeight > 0 && 
                visibleHeight >= rect.height - 5)) {
            validCandidates.push(i);
        }
    }

    // 2. 🟢 LÓGICA DE ESPEJO: Seleccionamos el ganador según la dirección
    if (validCandidates.length > 0) {
        // Si leemos hacia abajo, el radar persigue el texto que entra por el footer (el último válido).
        // Si leemos hacia arriba, persigue el texto que entra por el header (el primer válido).
        const targetIndex = isScrollingDown 
            ? validCandidates[validCandidates.length - 1] 
            : validCandidates[0];

        if (appInstance.STATE._lastDetailFocusIndex !== targetIndex) {
            debug.log('nav_base_details', debug.DEBUG_LEVELS.EXTREME, 
                `📡 Radar: Foco a Índice ${targetIndex} (Vector: ${isScrollingDown ? 'Abajo' : 'Arriba'})`);
                
            appInstance.STATE._lastDetailFocusIndex = targetIndex;
            _applyVisualClasses(appInstance, targetIndex);
        }
    }
}

// --- code/nav-base-details.js ---