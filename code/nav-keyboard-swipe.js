/* --- code/nav-keyboard-swipe.js --- */

import * as data from './data.js';
import * as debug from './debug.js';

export function _handleSwipeNavigation(key, appInstance) {
    const app = appInstance;
    const swiper = app.STATE.carouselInstance;

    // 🟢 EL SEGURO DE VIDA
    const releaseLock = () => {
        setTimeout(() => {
            app.STATE.keyboardNavInProgress = false;
        }, data.SWIPER.SLIDE_SPEED);
    };

    if (!swiper) {
        releaseLock();
        return;
    }

    const isMobile = document.body.getAttribute('data-layout') === 'mobile';
    
    const allValidCards = Array.from(app.DOM.track.querySelectorAll(
        '.card:not([data-tipo="relleno"])'
    ));

    // --- LÓGICA MOBILE (Lista Vertical con Loop) ---
    if (isMobile) {
        let newIndex = app.STATE.currentFocusIndex;
        
        switch (key) {
            case 'ArrowUp':
            case 'ArrowLeft': 
                newIndex--;
                break;
            case 'ArrowDown':
            case 'ArrowRight':
                newIndex++;
                break;
            case 'Enter':
            case ' ':
                const currentCard = document.activeElement.closest('.card');
                if (currentCard && !currentCard.classList.contains('disabled')) {
                    const { id, tipo } = currentCard.dataset;
                    if (tipo === 'volver-vertical') app._handleVolverClick();
                    else app._handleCardClick(id, tipo);
                }
                releaseLock();
                return;

            default: 
                releaseLock();
                return;
        }

        // Loop infinito manual para móvil
        if (newIndex < 0) newIndex = allValidCards.length - 1; 
        else if (newIndex >= allValidCards.length) newIndex = 0; 

        if (newIndex !== app.STATE.currentFocusIndex) {
            app.STATE.currentFocusIndex = newIndex;
            app._updateFocus(true);
        }
        releaseLock();
        return;
    }

    // --- LÓGICA DESKTOP / TABLET (Columnas) ---

    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.EXTREME, 
        `🚀 [WHEEL TRACE 3] Inicio lógica Desktop.
        - Foco nativo actual: <${document.activeElement.tagName}> class="${document.activeElement.className}"
        - Índice STATE guardado: ${app.STATE.currentFocusIndex}`);

    // 1. Intentamos leer el foco físico nativo
    let currentCard = document.activeElement.closest('.card');

    // 🟢 2. FIX (Blindspot del Ratón): Si no hay foco físico, rescatamos la última posición conocida del STATE
    if (!currentCard) {
        currentCard = app.DOM.track.querySelector(
            `.card[data-pos="${app.STATE.currentFocusIndex}"]`
        );
    }

    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.EXTREME, 
        `🔍 [WHEEL TRACE 4] Resolución de Tarjeta:
        - Tarjeta encontrada: ${!!currentCard}
        - ID Tarjeta: ${currentCard ? currentCard.dataset.id : 'N/A'}`);

    // 3. Si a pesar del rescate seguimos sin tarjeta (fallo crítico de DOM), abortamos
    if (!currentCard) { 
        releaseLock();
        return; 
    }

    const currentSlide = currentCard.closest('.swiper-slide');
    if (!currentSlide) { releaseLock(); return; }

    const columnCards = Array.from(currentSlide.querySelectorAll(
        '.card:not([data-tipo="relleno"])'
    ));
    const currentRowIndex = columnCards.indexOf(currentCard);
    const totalRowsInColumn = columnCards.length;

    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.EXTREME, 
        `⚙️ [WHEEL TRACE 5] Pre-Switch Matemático:
        - currentRowIndex: ${currentRowIndex}
        - totalRowsInColumn: ${totalRowsInColumn}
        - Lógica aplicable para ${key}: ¿Movimiento interno o salto de Swiper?`);

    switch (key) {
        case 'ArrowUp':
            if (currentRowIndex > 0) {
                // A. Movimiento Interno: Subir en la misma columna
                const prevCard = columnCards[currentRowIndex - 1];
                if (prevCard) {
                    // 🟢 FIX: Usar data-pos para movimiento vertical interno
                    const newPos = parseInt(prevCard.dataset.pos, 10);
                    if (!isNaN(newPos)) {
                        app.STATE.currentFocusIndex = newPos;
                        app._updateFocus(false);
                    }
                }

            } else {
                // B. Extremo Superior
                if (app.STATE.currentFocusIndex === 0) {
                    app.STATE.forceFocusRow = 'last'; 

                    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, 
                                "NAV: Inicio Absoluto -> Slide Anterior (Loop)");

                    app.STATE.isKeyboardLockedFocus = false; 
                    swiper.slidePrev(data.SWIPER.SLIDE_SPEED);

                } else {
                    app.STATE.currentFocusIndex--;
                    app.STATE.isKeyboardLockedFocus = true;
                    
                    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, 
                              "🔒 FLAG: isKeyboardLockedFocus = true (Columna Anterior)");
                    app._updateFocus(true); 
                }
            }
            break;

        case 'ArrowDown':
            if (currentRowIndex < totalRowsInColumn - 1) {
                // A. Movimiento Interno
                const nextCard = columnCards[currentRowIndex + 1];
                if (nextCard) {
                    // 🟢 FIX: Usar data-pos para movimiento vertical interno
                    const newPos = parseInt(nextCard.dataset.pos, 10);
                    if (!isNaN(newPos)) {
                        app.STATE.currentFocusIndex = newPos;
                        app._updateFocus(false);
                    }
                }

            } else {
                // B. Extremo Inferior
                if (app.STATE.currentFocusIndex >= allValidCards.length - 1) {
                    app.STATE.forceFocusRow = 0; 

                    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, 
                                "NAV: Fin Absoluto -> Slide Siguiente (Loop)");

                    app.STATE.isKeyboardLockedFocus = false;
                    swiper.slideNext(data.SWIPER.SLIDE_SPEED);
                    
                } else {
                    app.STATE.currentFocusIndex++;
                    app.STATE.isKeyboardLockedFocus = true;
                    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, 
                                "🔒 FLAG: isKeyboardLockedFocus = true (Columna Siguiente)");
                    app._updateFocus(true); 
                    
                }
            }
            break;

        case 'ArrowLeft':
            debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, 
                        "NAV: Izquierda -> Slide Anterior");

            app.STATE.forceFocusRow = null; 

            // 🔓 NO BLOQUEAMOS
            app.STATE.isKeyboardLockedFocus = false;
            
            swiper.slidePrev(data.SWIPER.SLIDE_SPEED);
            break;

        case 'ArrowRight':
            debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, 
                        "NAV: Derecha -> Slide Siguiente");

            app.STATE.forceFocusRow = null; 
            
            // 🔓 NO BLOQUEAMOS
            app.STATE.isKeyboardLockedFocus = false;
            
            swiper.slideNext(data.SWIPER.SLIDE_SPEED);
            break;

        case 'Enter':
        case ' ':
            if (!currentCard.classList.contains('disabled')) {
                const { id, tipo } = currentCard.dataset;
                
                debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, 
                            `ACCION: Ejecutando ${id}`);
                            
                if (tipo === 'volver-vertical') app._handleVolverClick();
                else app._handleCardClick(id, tipo);
            }
            break;
    }

    releaseLock();
}

// --- code/nav-keyboard-swipe.js ---