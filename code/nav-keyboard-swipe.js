/* --- code/nav-keyboard-swipe.js --- */

import * as data from './data.js';
import * as debug from './debug.js';

export function _handleSwipeNavigation(key, appInstance) {
    const app = appInstance;
    const swiper = app.STATE.carouselInstance;
    
    if (!swiper) return;

    const isMobile = document.body.getAttribute('data-layout') === 'mobile';
    
    const allValidCards = Array.from(app.DOM.track.querySelectorAll('.card:not([data-tipo="relleno"])'));

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
                 return;
            default: return;
        }

        // Loop infinito manual para móvil
        if (newIndex < 0) newIndex = allValidCards.length - 1; 
        else if (newIndex >= allValidCards.length) newIndex = 0; 

        if (newIndex !== app.STATE.currentFocusIndex) {
            app.STATE.currentFocusIndex = newIndex;
            app._updateFocus(true);
        }
        return; 
    }

    // --- LÓGICA DESKTOP / TABLET (Columnas) ---

    const currentCard = document.activeElement.closest('.card');
    if (!currentCard) return; // Seguridad

    const currentSlide = currentCard.closest('.swiper-slide');
    if (!currentSlide) return;

    const columnCards = Array.from(currentSlide.querySelectorAll('.card:not([data-tipo="relleno"])'));
    const currentRowIndex = columnCards.indexOf(currentCard);
    const totalRowsInColumn = columnCards.length;

    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.DEEP, 
                `NAV: Row ${currentRowIndex}/${totalRowsInColumn} | Key: ${key}`);

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
                    swiper.isKeyboardLockedFocus = false; 
                    swiper.slidePrev(data.SWIPER.SLIDE_SPEED);
                } else {
                    app.STATE.currentFocusIndex--;
                    swiper.isKeyboardLockedFocus = true;
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
                // Usamos allValidCards.length como límite lógico aproximado, asumiendo data-pos secuencial
                if (app.STATE.currentFocusIndex >= allValidCards.length - 1) {
                    app.STATE.forceFocusRow = 0; 
                    debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, 
                                "NAV: Fin Absoluto -> Slide Siguiente (Loop)");
                    swiper.isKeyboardLockedFocus = false;
                    swiper.slideNext(data.SWIPER.SLIDE_SPEED);
                } else {
                    app.STATE.currentFocusIndex++;
                    swiper.isKeyboardLockedFocus = true;
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
            
            // 🔓 NO BLOQUEAMOS: Es un cambio de página, necesitamos recalcular el foco en la nueva slide
            swiper.isKeyboardLockedFocus = false;
            
            swiper.slidePrev(data.SWIPER.SLIDE_SPEED);
            break;

        case 'ArrowRight':
            debug.log('nav_keyboard_swipe', debug.DEBUG_LEVELS.BASIC, 
                        "NAV: Derecha -> Slide Siguiente");

            app.STATE.forceFocusRow = null; 
            
            // 🔓 NO BLOQUEAMOS
            swiper.isKeyboardLockedFocus = false;
            
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
}

// --- code/nav-keyboard-swipe.js ---