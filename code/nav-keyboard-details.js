// --- code/nav-keyboard-details.js ---

import * as nav_base_details from './nav-base-details.js'; 
import * as debug from './debug.js'; 
import * as data from './data.js'; // Necesario para data.SWIPE_SLIDE_SPEED

export function _handleDetailNavigation(key) {
    // 'this' es la instancia de App
    const app = this;
    const swiper = app.STATE.detailCarouselInstance;
    if (!swiper) return;

    // ⭐️ FIX CLAVE: Bloquear si ya hay una transición en curso ⭐️
    if (app.STATE.detailNavInProgress) {
        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Transición en curso. Bloqueado.');
        return;
    }
    
    // ⭐️ FIX CLAVE: Usar el índice de foco guardado, que es síncrono. ⭐️
    let currentIndex = app.STATE.lastDetailFocusIndex; 
    let newIndex = currentIndex;
    const totalSlides = swiper.slides.length; 
    
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `--- INICIO: _handleDetailNavigation (Key: ${key}) ---`);
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `Current Focus Index (State): ${currentIndex}, Total Slides: ${totalSlides}`);
    
    switch (key) {
        case 'ArrowUp':
            newIndex = currentIndex - 1;
            // No hacemos wrap. Nos quedamos en el primer slide.
            if (newIndex < 0) newIndex = 0; 
            break;
        case 'ArrowDown':
            newIndex = currentIndex + 1;
            // No hacemos wrap. Nos quedamos en el último slide.
            if (newIndex >= totalSlides) newIndex = totalSlides - 1; 
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            // Ignoramos el movimiento lateral.
            debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Movimiento lateral ignorado.');
            return; 
        case 'Enter':
        case ' ':
            // Lógica para Enter/Space 
            const focusedSlide = swiper.slides[swiper.activeIndex];
            const focusedContent = focusedSlide ? focusedSlide.querySelector('.detail-action-item, .detail-text-fragment') : null;
            
            if (focusedContent && focusedContent.classList.contains('detail-action-item')) {
                const btn = focusedContent.querySelector('.detail-action-btn');
                if (btn && !btn.classList.contains('disabled')) {
                    btn.click(); 
                    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Botón de acción activado.');
                    return;
                }
            } else if (focusedContent) {
                 // Si está sobre texto/título, simula el avance al siguiente slide.
                 newIndex = currentIndex + 1;
                 debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: Avanzando al siguiente fragmento.');
                 if (newIndex >= totalSlides) {
                    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: Ya es el último slide. Retornando.');
                    return; // Si es el último, no hacer nada.
                 }
            } else {
                 debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Enter/Space: No hay contenido enfocable en el slide actual.');
                 return; // No hay nada enfocable en el slide actual
            }
            break;
    }

    if (newIndex !== currentIndex) {
        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, `FORZANDO SLIDE. Nuevo Índice: ${newIndex}`);
        
        // ⭐️ FIX CLAVE 1: Marcar la transición como activa ⭐️
        app.STATE.detailNavInProgress = true; 
        
        // La clave es usar slideTo para forzar el snap.
        swiper.slideTo(newIndex, 300);
        
        // ⭐️ FIX CLAVE 2: Reset de seguridad (por si Swiper falla al disparar el evento) ⭐️
        setTimeout(() => {
            if (app.STATE.detailNavInProgress) {
                 app.STATE.detailNavInProgress = false;
                 debug.logWarn('nav_keyboard_details', 'Advertencia: Bloqueo de navegación de detalle reseteado por timeout de seguridad.');
            }
        }, 300 + 50); // Velocidad (300ms) + 50ms de margen
        
    } else {
        debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, 'Índice sin cambios. No se llama a slideTo.');
    }
    debug.log('nav_keyboard_details', debug.DEBUG_LEVELS.DEEP, '--- FIN: _handleDetailNavigation ---');
}

// --- code/nav-keyboard-details.js ---