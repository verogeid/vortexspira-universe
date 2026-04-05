/* --- code/features/navigation/nav-base-pc.js --- */

import * as debug from '../../debug/debug.js';
import * as data from '../../services/data.js';

let _swipeDirection = 'next';

export function handleSlideChangeStart(app, swiper) {
    if (app.STATE.isNavigatingBack) return; 

    if (swiper.activeIndex !== swiper.previousIndex) {
        _swipeDirection = swiper.activeIndex > swiper.previousIndex ? 'next' : 'prev';
        debug.log('nav_base_pc', debug.DEBUG_LEVELS.DEEP, `⚡️ START SlideChange. Dir: ${_swipeDirection}`);
    }
}

export function handleSlideChangeEnd(app, swiper) {
    if (!app.STATE.carouselInstance || app.STATE.isNavigatingBack || app.STATE._isLoopFixing) return;

    if (app.STATE.isKeyboardLockedFocus) {
        app.STATE.isKeyboardLockedFocus = false; 
        return; 
    }

    const { currentFocusIndex, itemsPorColumna } = app.STATE;
    const activeSlideEl = swiper.slides[swiper.activeIndex];
    if (!activeSlideEl) return;

    const allCardsInSlide = Array.from(activeSlideEl.querySelectorAll('.card'));
    const validCards = allCardsInSlide.filter(c => c.dataset.id && c.dataset.tipo !== 'relleno');

    // ⭐️ SKIPPER ⭐️ (Solo para PC/Tablet)
    if (validCards.length === 0) {
        app.blockUI();
        if (typeof data.SWIPER.prefersReducedMotion === 'function' && !data.SWIPER.prefersReducedMotion()) {
            app.announceA11y(app.getString('toast.skipColumn'), 'assertive');
            app.STATE.emptyColumnAnnounced = true;
        }
        _swipeDirection === 'next' ? 
            swiper.slideNext(data.SWIPER.SLIDE_SPEED) : 
            swiper.slidePrev(data.SWIPER.SLIDE_SPEED);
        return; 
    }

    if (app.STATE.isUIBlocked) app.unblockUI();

    if (app.STATE.emptyColumnAnnounced) {
        app.STATE.emptyColumnAnnounced = false;
        app.STATE._isLoopFixing = true;
        swiper.loopFix();
        swiper.update();
        requestAnimationFrame(() => app.STATE._isLoopFixing = false);
        app.announceA11yStop();
    }
    
    let targetRow;
    if (app.STATE.forceFocusRow !== undefined && app.STATE.forceFocusRow !== null) {
        targetRow = app.STATE.forceFocusRow === 'last' ? validCards.length - 1 : app.STATE.forceFocusRow; 
        app.STATE.forceFocusRow = null; 
    } else {
        targetRow = currentFocusIndex % itemsPorColumna;
    }

    const newFocusCard = findBestFocusInColumn(allCardsInSlide, targetRow);
    if (newFocusCard) {
        const newLogicalIndex = parseInt(newFocusCard.dataset.pos, 10);
        if (!isNaN(newLogicalIndex)) {
            if (app.STATE.currentFocusIndex !== newLogicalIndex) {
                app.STATE.currentFocusIndex = newLogicalIndex;
            } 
            app._updateFocus(false); 
        }
    }
}

// Movida desde nav-base.js (Solo se usa en PC)
export function findBestFocusInColumn(columnCards, targetRow) {
    const isValid = (card) => card && card.dataset.id && card.dataset.tipo !== 'relleno';
    if (isValid(columnCards[targetRow])) return columnCards[targetRow];
    for (let i = 1; i < columnCards.length; i++) {
        if (isValid(columnCards[targetRow - i])) return columnCards[targetRow - i];
        if (isValid(columnCards[targetRow + i])) return columnCards[targetRow + i];
    }
    return null;
}

/* --- code/features/navigation/nav-base-pc.js --- */