/* --- code/app-layout.js --- */

import * as debug from './debug/debug.js';
import * as data from './data.js';

// ============================================================================
// 📏 DETECCIÓN Y UTILIDADES
// ============================================================================
export function isTouchDevice() {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0) ||
            window.matchMedia("(pointer: coarse)").matches);
}

// Inyector de CSS asíncrono (ahora es una función privada de layout)
export function injectCSS(href, id) {
    return new Promise((resolve) => {
        let link = document.getElementById(id);
        const absoluteHref = new URL(href, document.baseURI).href;
        
        if (!link) {
            link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            
            link.onload = () => resolve();
            link.onerror = () => resolve(); 
            
            link.href = href;
            document.head.appendChild(link);
        } else {
            if (link.href !== absoluteHref) {
                link.onload = () => resolve();
                link.onerror = () => resolve();
                link.href = href;
            } else {
                resolve(); 
            }
        }
    });
}

// ============================================================================
// 📐 CÁLCULO FÍSICO Y SINCRONIZACIÓN
// ============================================================================
export function syncHeaderDimensions(app) {
    const header = document.getElementById('app-header');
    if (header) {
        const realHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height-real', `${realHeight}px`);

        debug.log('app', debug.DEBUG_LEVELS.DEEP, `A11y Sync: Header mide ${realHeight}px`);
    }

    const footer = document.querySelector('footer');
    if (footer) {
        const realFooterHeight = footer.offsetHeight;
        document.documentElement.style.setProperty('--footer-height-real', `${realFooterHeight}px`);
    }
}

export function setupSmartResize(app) {
    let resizeTimer;
    const handleResize = () => {
        if (app.STATE.isUIBlocked || app.STATE.isBooting) return;
        
        updateLayoutMode(app);
        syncHeaderDimensions(app);
        cacheDOM(app); 
        
        if (app.STATE.fullData) {
            if (app.STATE.activeCourseId) {
                debug.log('app', debug.DEBUG_LEVELS.BASIC, `SmartResize: Manteniendo vista detalle.`);
                requestAnimationFrame(() => {
                    app._mostrarDetalle(app.STATE.activeCourseId, false);
                });
            } else {
                debug.log('app', debug.DEBUG_LEVELS.BASIC, `SmartResize: Refrescando menú.`);
                requestAnimationFrame(() => {
                    app.renderNavegacion();
                });
            }
        }
    };
    
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 100); 
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(handleResize, 100); 
        });
    }
}

// ============================================================================
// 🧠 MOTOR DE LAYOUTS EN CASCADA
// ============================================================================
export function updateLayoutMode(app) {
    const rootStyle = getComputedStyle(document.documentElement);
    const scale = parseFloat(rootStyle.getPropertyValue('--font-scale')) || 1;
    
    let realWidth = window.innerWidth;
    const realHeight = window.visualViewport ? 
                    window.visualViewport.height : 
                    window.innerHeight;
    
    if (window.visualViewport && window.visualViewport.scale > 1) {
        realWidth = window.visualViewport.width;
    }
    
    const effectiveWidth = realWidth / scale;
    const effectiveHeight = realHeight / scale;
    
    let candidateMode;
    
    if (effectiveWidth <= data.VIEWPORT.MAX_WIDTH.MOBILE) {
        candidateMode = 'mobile';
    } else if (effectiveWidth <= data.VIEWPORT.MAX_WIDTH.TABLET_PORTRAIT) {
        candidateMode = 'tablet-portrait';
    } else if (effectiveWidth <= data.VIEWPORT.MAX_WIDTH.TABLET_LANDSCAPE) {
        candidateMode = 'tablet-landscape';
    } else {
        candidateMode = 'desktop';
    }

    // 🚨 Fallbacks de Altura
    if (candidateMode === 'desktop') {
        if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.DESKTOP) {
            debug.log('app', debug.DEBUG_LEVELS.EXTREME, `Fallback Altura: Desktop -> Tablet Landscape`);
            candidateMode = 'tablet-landscape';
        }
    }
    if (candidateMode === 'tablet-landscape') {
        if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.TABLET) {
            debug.log('app', debug.DEBUG_LEVELS.EXTREME, `Fallback Altura: Tablet Landscape -> Tablet Portrait`);
            candidateMode = 'tablet-portrait';
        }
    } 
    if (candidateMode === 'tablet-portrait') {
        if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.TABLET) {
            debug.log('app', debug.DEBUG_LEVELS.EXTREME, `Fallback Altura: Tablet Portrait -> Mobile`);
            candidateMode = 'mobile';
        }
    } 

    let enableSafeMode = false;
    if (candidateMode === 'mobile') {
        if (effectiveHeight < data.VIEWPORT.MIN_CONTENT_HEIGHT.MOBILE) {
            enableSafeMode = true;
        }
    } 

    const currentMode = document.body.getAttribute('data-layout');
    if (currentMode !== candidateMode) {
        document.body.setAttribute('data-layout', candidateMode);

        let cssFile = candidateMode;
        if (candidateMode.includes('tablet')) {
            cssFile = 'tablet'; 
        }
        
        injectCSS(`styles/style-${cssFile}.css`, 'vortex-css-layout');
        debug.log('app', debug.DEBUG_LEVELS.BASIC, `Layout Final: ${candidateMode} (W:${effectiveWidth.toFixed(0)} / H:${effectiveHeight.toFixed(0)})`);
    }

    const currentSafe = document.body.getAttribute('data-safe-mode') === 'true';
    if (enableSafeMode !== currentSafe) {
        document.body.setAttribute('data-safe-mode', enableSafeMode ? 'true' : 'false');
        
        if (enableSafeMode) {
            injectCSS('styles/style-safe-mode.css', 'vortex-css-safe');
        } else {
            const safeLink = document.getElementById('vortex-css-safe');
            if (safeLink) safeLink.remove();
        }

        debug.log('app', debug.DEBUG_LEVELS.BASIC, `🛡️ Safe Mode: ${enableSafeMode ? 'ON' : 'OFF'} (Solo Mobile) | Eff.Height: ${effectiveHeight.toFixed(0)}px`);
        
        if (!enableSafeMode) {
            window.scrollTo(0, 0);
            if (app.STATE.carouselInstance) 
                requestAnimationFrame(() => app.STATE.carouselInstance.update());
        }
    }
}

// ============================================================================
// 💾 CACHÉ DEL DOM
// ============================================================================
export function cacheDOM(app) {
    const layout = document.body.getAttribute('data-layout') || 'desktop';
    const isMobile = layout === 'mobile';
    const isDesktopView = layout === 'desktop'; 
    
    debug.log('app', debug.DEBUG_LEVELS.DEEP, `Refrescando caché DOM. Modo: ${layout}`);

    app.DOM.vistaDetalleDesktop = document.getElementById('vista-detalle-desktop');
    app.DOM.vistaDetalleMobile = document.getElementById('vista-detalle-mobile');
    
    app.DOM.vistaDetalle = isMobile ? app.DOM.vistaDetalleMobile : app.DOM.vistaDetalleDesktop;
    app.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop');
    
    app.DOM.header = document.getElementById('app-header');
    
    app.DOM.cardVolverFija = document.getElementById('vista-volver');
    app.DOM.cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento');
    app.DOM.infoAdicional = document.getElementById('info-adicional');
    app.DOM.cardNivelActual = document.getElementById('card-nivel-actual');
    app.DOM.appContainer = document.getElementById('app-container');
    app.DOM.toast = document.getElementById('toast-notification'); 

    if (app.DOM.toast) {
        if (!app.DOM.toast.getAttribute('role')) 
            app.DOM.toast.setAttribute('role', 'status'); 
        if (!app.DOM.toast.getAttribute('aria-hidden')) 
            app.DOM.toast.setAttribute('aria-hidden', true);
    }

    if (app.DOM.cardNivelActual) 
        app.DOM.cardNivelActual.removeAttribute('aria-live');

    if (isMobile) {
        app.DOM.vistaNav = document.getElementById('vista-navegacion-mobile');
        app.DOM.track = document.getElementById('track-mobile');
    } else if (isDesktopView) {
        app.DOM.vistaNav = document.getElementById('vista-navegacion-desktop');
        app.DOM.track = document.getElementById('track-desktop');
    } else { 
        app.DOM.vistaNav = document.getElementById('vista-navegacion-tablet');
        app.DOM.track = document.getElementById('track-tablet');
    }

    if (app.DOM.track) app.DOM.track.removeAttribute('aria-live');
    ['track-desktop', 'track-tablet', 'track-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.removeAttribute('aria-live');
    });
}

/* --- code/app-layout.js --- */