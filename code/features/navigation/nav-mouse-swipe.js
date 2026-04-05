/* --- code/features/navigation/nav-mouse-swipe.js --- */

import * as debug from '../../debug/debug.js';
import * as data from '../../services/data.js';

let _translateDebounceTimer = null;

export function setupTouchListeners() {
    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;

        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
            "SWIPE: Vinculando listeners.");

        const isMobile = document.body.getAttribute('data-layout') === 'mobile';
        const isVertical = swiper.params.direction === 'vertical';

        // 🟢 BIFURCACIÓN DE ARQUITECTURA: Radar Vertical vs Paginación Horizontal
        if (isMobile && isVertical) {
            
            // 1. RADAR MÓVIL (Regla de Oro: Física + Presencia)
            swiper.on('touchStart', () => {
                if (this.STATE.keyboardNavInProgress) return;
                this.STATE._isFingerDown = true;
                this.STATE._isMenuTouchGesturing = true;
            });

            swiper.on('setTranslate', () => {
                if (this.STATE.keyboardNavInProgress) return;
                
                if (this.STATE._isMenuTouchGesturing) {
                    _handleMobileMenuRadar(this);
                }

                // Reiniciamos el temporizador de Inercia Física a cada píxel de movimiento
                clearTimeout(_translateDebounceTimer);
                
                _translateDebounceTimer = setTimeout(() => {
                    // Han pasado 100ms sin movimiento físico.
                    // Si el usuario YA NO tiene el dedo puesto, oficializamos.
                    if (!this.STATE._isFingerDown && this.STATE._isMenuTouchGesturing) {
                        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                            "📡 Inactividad física detectada (Inercia finalizada). " +
                            "Oficializando foco.");
                            
                        this.STATE._isMenuTouchGesturing = false;
                        this._updateFocus(false);
                    }
                }, 100); 
            });

            swiper.on('touchEnd', () => {
                this.STATE._isFingerDown = false;
                
                // Si el usuario suelta el dedo "en seco" (sin inercia pendiente), oficializamos rápido
                setTimeout(() => {
                    if (!swiper.animating && this.STATE._isMenuTouchGesturing) {
                        debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.BASIC, 
                            "📡 Dedo levantado en seco. Oficializando foco del radar.");
                            
                        this.STATE._isMenuTouchGesturing = false;
                        this._updateFocus(false);
                    }
                }, 50);
            });

        }
    }

    // =========================================================
    // 🛡️ ESCUDO MATEMÁTICO ANTI-CLIC (Foolproof Drag Detector)
    // =========================================================
    
    // 🟢 FIX: Solo vinculamos los escuchadores al DOM global UNA VEZ en toda la vida útil
    if (!this.STATE._globalPointerBound) {
        
        const masterContainer = document.getElementById('app-container') || document.body;
        
        // Guardamos la coordenada de origen (ratón o dedo)
        const recordStartCoords = (e) => {
            if (!e.target.closest('#track-desktop, #track-tablet, #track-mobile')) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.STATE._clickStartX = clientX;
            this.STATE._clickStartY = clientY;
        };

        // Evaluamos la distancia al hacer clic nativo
        const handleClick = (e) => {
            const clickedCard = e.target.closest('.card');
            if (!clickedCard || !e.target.closest('#track-desktop, #track-tablet, #track-mobile')) return;

            const swiper = this.STATE.carouselInstance;
            
            if (swiper && !swiper.allowClick) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            let endX = e.clientX;
            let endY = e.clientY;
            
            if (endX > 0 && endY > 0 && this.STATE._clickStartX !== undefined) {
                const distX = Math.abs(endX - this.STATE._clickStartX);
                const distY = Math.abs(endY - this.STATE._clickStartY);

                if (distX > 10 || distY > 10) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.STATE._clickStartX = undefined;
                    this.STATE._clickStartY = undefined;
                    return;
                }
            }

            this.STATE._clickStartX = undefined;
            this.STATE._clickStartY = undefined;
            this._handleTrackClick(e);
        };

        // Asignamos usando 'capture: true' para que intercepte ANTES que Swiper
        masterContainer.addEventListener('mousedown', recordStartCoords, { passive: true, capture: true });
        masterContainer.addEventListener('touchstart', recordStartCoords, { passive: true, capture: true });
        masterContainer.addEventListener('click', handleClick, { capture: true });

        // Sellamos la puerta para que no se repita
        this.STATE._globalPointerBound = true;
    }
}; // <-- Fin de setupTouchListeners

export function detachSwiperEvents(swiper) {
    if (!swiper) return;

    swiper.off('slideChangeTransitionStart');
    swiper.off('slideChangeTransitionEnd');
    swiper.off('touchStart');
    swiper.off('setTranslate');
    swiper.off('transitionEnd');
    swiper.off('touchEnd');
}

// 🟢 NUEVO: El Escáner Radar para la vista de Menú Móvil
export function _handleMobileMenuRadar(appInstance) {
    const swiper = appInstance.STATE.carouselInstance;
    if (!swiper) return;

    const headerEl = document.getElementById('app-header');
    const headerHeight = headerEl ? headerEl.offsetHeight + 10 : 10;
    const footerEl = document.querySelector('footer');
    const footerHeight = footerEl ? footerEl.offsetHeight : 0;
    
    const viewHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const safeBottom = viewHeight - footerHeight;

    const swiperRect = swiper.el.getBoundingClientRect();
    const safeTop = Math.max(headerHeight, swiperRect.top);
    const finalSafeBottom = Math.min(safeBottom, swiperRect.bottom);

    // Vector de lectura (Dirección del arrastre)
    const currentTrans = swiper.translate;
    const lastTrans = appInstance.STATE._menuRadarLastTrans !== undefined ? appInstance.STATE._menuRadarLastTrans : currentTrans;
    
    if (currentTrans < lastTrans) appInstance.STATE._isMenuScrollingDown = true;
    else if (currentTrans > lastTrans) appInstance.STATE._isMenuScrollingDown = false;
    
    appInstance.STATE._menuRadarLastTrans = currentTrans;
    const isScrollingDown = appInstance.STATE._isMenuScrollingDown !== false;

    // Solo escaneamos tarjetas reales, ignoramos los rellenos
    const validCards = Array.from(appInstance.DOM.track.querySelectorAll('.card[data-pos]:not([data-tipo="relleno"])'));
    let validCandidates = [];

    for (let i = 0; i < validCards.length; i++) {
        const card = validCards[i];
        const rect = card.getBoundingClientRect();
        
        const visibleTop = Math.max(rect.top, safeTop);
        const visibleBottom = Math.min(rect.bottom, finalSafeBottom);
        const visibleHeight = visibleBottom - visibleTop;

        // Es candidata si se ve más de la mitad de la tarjeta, o si casi roza los bordes
        if (visibleHeight > rect.height * 0.5 || (visibleHeight > 0 && visibleHeight >= rect.height - 5)) {
            validCandidates.push(card);
        }
    }

    if (validCandidates.length > 0) {
        // Efecto espejo: Si el usuario baja, el radar apunta a la que entra por abajo
        const targetCard = isScrollingDown ? validCandidates[validCandidates.length - 1] : validCandidates[0];
        const logicalPos = parseInt(targetCard.dataset.pos, 10);

        if (!isNaN(logicalPos) && appInstance.STATE.currentFocusIndex !== logicalPos) {
            
            debug.log('nav_mouse_swipe', debug.DEBUG_LEVELS.EXTREME, 
                `📡 Radar Móvil: Foco a Índice ${logicalPos} ` +
                `(Vector: ${isScrollingDown ? 'Abajo' : 'Arriba'})`);

            appInstance.STATE.currentFocusIndex = logicalPos;
            
            // Aplicar Clases Visuales "Fantasma" sin forzar el scroll nativo ni interrumpir el TTS
            validCards.forEach(c => {
                c.classList.remove('focus-visible');
                c.removeAttribute('aria-current');
            });
            
            targetCard.classList.add('focus-visible');
            targetCard.setAttribute('aria-current', 'true');
        }
    }
}

/* --- code/features/navigation/nav-mouse-swipe.js --- */