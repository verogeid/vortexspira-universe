/* --- code/core/app-router.js --- */

import * as debug from '../debug/debug.js';
import * as i18n from '../services/i18n.js';
import * as app_utils from '../services/app-utils.js';

// ============================================================================
// 🔄 CAMBIO DE IDIOMA EN CALIENTE (HOT SWAP)
// ============================================================================
export async function toggleLanguage(app) {
    app.STATE.currentTraceId = `SWAP_${Date.now()}`;
    const traceTimeStr = new Date().toISOString().split('T')[1];

    debug.log('app', debug.DEBUG_LEVELS.EXTREME, 
        `[TRACE: ${app.STATE.currentTraceId} | ${traceTimeStr}] ⏳ INICIO DE CAMBIO DE IDIOMA`);

    const wasLangBtnFocused = document.activeElement && document.activeElement.id === 'btn-lang-toggle';

    app.blockUI();
    
    const msg = app.getString('menu.aria.langSwitch');
    app.announceA11y(msg, 'assertive');

    const current = localStorage.getItem('vortex_lang') || 'es';
    const newLang = current === 'es' ? 'en' : 'es';
    
    try {
        const [stringsLoaded, coursesData] = await Promise.all([
            i18n.loadStrings(newLang),
            app_utils.loadData(newLang)
        ]);

        if (!stringsLoaded || !coursesData) 
            throw new Error("Fallo al cargar nuevos diccionarios");

        const url = new URL(window.location);
        url.searchParams.set('lang', newLang);
        const targetId = url.searchParams.get('id');

        app.STATE.fullData = coursesData;
        localStorage.setItem('vortex_lang', newLang);
        document.documentElement.lang = newLang;

        app.stackInitialize();
        app.STATE.activeCourseId = null;

        if (app.DOM.vistaDetalle) 
            app.DOM.vistaDetalle.classList.remove('active');

        ['app-header', 'vista-volver', 'info-adicional', 'vista-central'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.removeAttribute('data-last-focus-id');
        });

        app.STATE._lastActiveZoneId = null;
        app.STATE._lastMousedownTarget = null;

        app.applyStrings();

        if (app_utils.injectHeaderContent) {
            const enableI18n = newLang === 'en' ? true : await app._checkEnAvailability();
            app_utils.injectHeaderContent(app, enableI18n);
        }

        if (app_utils.injectFooterContent) 
            app_utils.injectFooterContent(app);

        if (wasLangBtnFocused) {
            app.STATE.resizeSnapshot = { type: 'ID', value: 'btn-lang-toggle' };
        } 

        if (targetId) {
            if (targetId === 'c-about') {
                const originId = app.STATE._previousCourseId; 
                
                if (originId && app.stackBuildFromId(originId, app.STATE.fullData)) {
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                        `Pila base reconstruida para ${originId} tras cambio de idioma.`);
                } else {
                    app.stackInitialize(); 
                }

                window.history.replaceState({}, '', url);
                app._mostrarAbout(false); 
            }
            else if (targetId === 'c-audit') {
                const originId = app.STATE._previousCourseId; 
                
                if (originId && app.stackBuildFromId(originId, app.STATE.fullData)) {
                    debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                        `Pila base reconstruida para ${originId} tras cambio de idioma.`);
                } else {
                    app.stackInitialize(); 
                }

                window.history.replaceState({}, '', url);
                app._mostrarAudit(false); 
            }
            else if (app.stackBuildFromId(targetId, app.STATE.fullData)) {
                window.history.pushState({}, '', url);
                
                const nodo = app._findNodoById(targetId, app.STATE.fullData.navegacion);
                if (nodo && (nodo.titulo || nodo.descripcion)) {
                    app._mostrarDetalle(targetId, true);
                } else {
                    app.renderNavegacion();
                }
            } else {
                app.stackInitialize(); 
                url.searchParams.delete('id');
                window.history.replaceState({}, '', url);

                const errorMsg = app.getString('toast.errorId');
                app.STATE.pendingA11yContext = app.STATE.pendingA11yContext ? 
                    app.STATE.pendingA11yContext + ". " + errorMsg : errorMsg;

                app.renderNavegacion(); 
                app.showToast(app.getString('toast.errorId'));
            }
        } else {
            window.history.replaceState({}, '', url);
            app.renderNavegacion();
        }

        app.unblockUI();

        setTimeout(() => {
            app.STATE.resizeSnapshot = null;
        }, 500);

    } catch (error) {
        debug.logError('app', 'Fallo crítico durante el Hot Swap de idioma', error);
        window.location.reload();
    }
}

// ============================================================================
// 🧭 LISTENER NATIVO DEL HISTORIAL (BOTONES ATRÁS/ADELANTE)
// ============================================================================
export function setupNavigationListener(app) {
    window.addEventListener('popstate', (event) => {
        const urlParams = new URL(window.location);
        const targetId = urlParams.searchParams.get('id');
        const targetLang = urlParams.searchParams.get('lang');
        
        const currentLang = localStorage.getItem('vortex_lang') || 'es';
        if (targetLang && targetLang !== currentLang) {
            debug.log('app', debug.DEBUG_LEVELS.BASIC, 
                `Cambio de idioma detectado vía Back/Next: ${targetLang}`);
                
            window.location.reload(); 
            return;
        }

        debug.log('app', debug.DEBUG_LEVELS.BASIC, 
            `Navegación nativa detectada. Destino ID: ${targetId} | Lang: ${targetLang}`);

        if (targetId) {
            if (targetId === 'c-about') {
                app._mostrarAbout(false); 
                return; 
            }

            if (targetId === 'c-audit') {
                app._mostrarAudit(false);
                return; 
            }

            const stackIndex = app.STATE.historyStack.findIndex(s => s.levelId === targetId);
            
            if (stackIndex !== -1 && stackIndex < app.STATE.historyStack.length - 1) {
                while (app.STATE.historyStack.length - 1 > stackIndex) {
                    app.stackPop();
                }
                
                if (app.DOM.vistaDetalle) {
                    app.DOM.vistaDetalle.classList.remove('active');
                    app.DOM.vistaDetalle.style.display = 'none';
                }
                app.STATE.activeCourseId = null;
                
                app.STATE.isNavigatingBack = true; 
                app.renderNavegacion();
                return;
            }
            
            if (app.stackBuildFromId(targetId, app.STATE.fullData)) { 
                const nodo = app._findNodoById(targetId, app.STATE.fullData.navegacion);
                
                if (nodo && (nodo.titulo || nodo.descripcion)) { 
                    app._mostrarDetalle(targetId);
                } else {
                    if (app.DOM.vistaDetalle) {
                        app.DOM.vistaDetalle.classList.remove('active');
                        app.DOM.vistaDetalle.style.display = 'none';
                    }
                    app.STATE.activeCourseId = null;
                    app.renderNavegacion();
                }
            } else {
                if (app.DOM.vistaDetalle) {
                    app.DOM.vistaDetalle.classList.remove('active');
                    app.DOM.vistaDetalle.style.display = 'none';
                }
                app.stackInitialize(); 
                app.renderNavegacion();
            }
        } else {
            if (app.DOM.vistaDetalle) {
                app.DOM.vistaDetalle.classList.remove('active');
                app.DOM.vistaDetalle.style.display = 'none';
            }
            app.STATE.activeCourseId = null;
            app.stackInitialize(); 
            app.renderNavegacion();
        }
    });
}

// ==========================================
// 👻 GESTIÓN DE VISTAS ESPECIALES
// ==========================================
export async function mostrarAbout(app, pushHistory = true) {
    debug.log('app', debug.DEBUG_LEVELS.BASIC, 
        'Abriendo página especial: Quiénes Somos');

    if (!app.STATE.isSpecialViewActive) {
        app.STATE._previousCourseId = app.STATE.activeCourseId;
    }

    app.STATE.activeCourseId = 'c-about';
    app.STATE.isSpecialViewActive = true; 

    if (pushHistory) {
        const url = new URL(window.location);
        if (url.searchParams.get('id') !== 'c-about') {
            url.searchParams.set('id', 'c-about');
            window.history.pushState({}, '', url);
        }
    }

    await app._mostrarDetalle('c-about');
}

export async function mostrarAudit(app, pushHistory = true) {
    await app_utils.preloadAuditData();

    if (!app.STATE.isSpecialViewActive) app.STATE._previousCourseId = app.STATE.activeCourseId;
    app.STATE.activeCourseId = 'c-audit';
    app.STATE.isSpecialViewActive = true; 

    if (pushHistory) {
        const url = new URL(window.location);
        url.searchParams.set('id', 'c-audit');
        window.history.pushState({}, '', url);
    }
    await app._mostrarDetalle('c-audit');
}

/* --- code/core/app-router.js --- */