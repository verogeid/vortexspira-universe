/* --- code/core/app-events.js --- */

import * as debug from '../debug/debug.js';

export function setupGlobalListeners(app) {
    // ============================================================================
    // ⌨️ 1. DETECTOR DE TECLADO Y RUEDA DEL RATÓN
    // ============================================================================
    const bootKeyboardModule = async (e) => {
        // Ignoramos si solo pulsa teclas modificadoras, salvo shift
        if (e.type === 'keydown' && ['Control', 'Alt', 'Meta'].includes(e.key)) return;
        
        document.removeEventListener('keydown', bootKeyboardModule, true);
        document.removeEventListener('wheel', bootKeyboardModule, true);
        
        // Freno nativo del primer scroll de rueda para evitar saltos bruscos
        if (e.type === 'wheel') {
            const targetIsCentral = e.target.closest('#vista-central, .carousel-viewport, .detalle-viewport');
            if (targetIsCentral) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        
        try {
            const nav_keyboard_base = await import('../features/navigation/nav-keyboard-base.js');
            app.initKeyboardControls = nav_keyboard_base.initKeyboardControls;
            app.initKeyboardControls();

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                '⌨️/⚙️ Teclado o Rueda detectado. Módulo inyectado en caliente.');
        } catch (err) {
            debug.logError('app', 'Fallo al cargar módulo de teclado', err);
        }
    };
    
    document.addEventListener('keydown', bootKeyboardModule, true);
    document.addEventListener('wheel', bootKeyboardModule, { capture: true, passive: false });

    // ============================================================================
    // 🖱️ 2. DETECTOR DE PUNTERO (Ratón / Touch)
    // ============================================================================
    const bootPointerModule = async () => {
        document.removeEventListener('mousemove', bootPointerModule, true);
        document.removeEventListener('touchstart', bootPointerModule, true);
        
        try {
            const nav_mouse_swipe = await import('../features/navigation/nav-mouse-swipe.js');
            app.setupTouchListeners = nav_mouse_swipe.setupTouchListeners;
            app.setupTouchListeners();

            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                '🖱️/👆 Puntero/Touch detectado. Módulo de swipe inyectado.');
        } catch (err) {
            debug.logError('app', 'Fallo al cargar módulo de puntero', err);
        }
    };
    
    document.addEventListener('mousemove', bootPointerModule, true);
    document.addEventListener('touchstart', bootPointerModule, true);

    // ============================================================================
    // 🛡️ 3. ESCUDO DE CRISTAL: INTERCEPTOR UNIVERSAL
    // ============================================================================
    const preventInteraction = (e) => {
        if (app.STATE.isUIBlocked) {
            if (e.type !== 'keyup') {
                e.preventDefault();
                e.stopPropagation();
                debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
                    `🛡️ Escudo activo. Bloqueado: ${e.type} ${e.key || ''}`);
            }
        }
    };

    document.addEventListener('keydown', preventInteraction, true);
    document.addEventListener('mousedown', preventInteraction, true);
    document.addEventListener('click', preventInteraction, true);
    document.addEventListener('touchstart', preventInteraction, { passive: false, capture: true });
    document.addEventListener('touchmove', preventInteraction, { passive: false, capture: true });

    // ============================================================================
    // 🔄 4. LISTENER DE REFREZCO DE LAYOUT (A11Y Font Size / Zoom)
    // ============================================================================
    window.addEventListener('vortex-layout-refresh', () => {
        if (app.STATE.isUIBlocked) return;

        const prevMode = document.body.getAttribute('data-layout');
        app._updateLayoutMode();
        const newMode = document.body.getAttribute('data-layout');
        app._syncHeaderDimensions();

        const forceRender = (prevMode !== newMode);

        if (forceRender) {
            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                `Layout Change (${prevMode} -> ${newMode}). Forzando render...`);
            app._cacheDOM();
        } else {
            debug.log('app', debug.DEBUG_LEVELS.DEEP, 
                `Layout Refresh (Mismo modo). Delegando a buckets.`);
        }

        if (app.STATE.activeCourseId) {
            app._mostrarDetalle(app.STATE.activeCourseId, forceRender);
        } else if (forceRender) {
            app.renderNavegacion();
        }

        requestAnimationFrame(() => {
            app._runFontDiagnostics?.();
            app._runLayoutDiagnostics?.();
        });
    });
}

/* --- code/core/app-events.js --- */