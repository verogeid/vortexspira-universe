/* --- code/app-feedback.js --- */

import * as debug from './debug/debug.js';

// ============================================================================
// 🛡️ MÉTODOS DE CONTROL DEL ESCUDO (UI Lock)
// ============================================================================
export function blockUI(app) {
    app.STATE.isUIBlocked = true;
    document.body.classList.add('ui-blocked');

    // 🟢 CAPA DE INVISIBILIDAD ABSOLUTA: Usamos 'inert'
    if (app.DOM.appContainer) 
        app.DOM.appContainer.setAttribute('inert', '');

    if (app.DOM.header) 
        app.DOM.header.setAttribute('inert', '');

    const footer = document.querySelector('footer');
    if (footer) 
        footer.setAttribute('inert', '');

    debug.log('app', debug.DEBUG_LEVELS.EXTREME, '🛡️ ESCUDO ACTIVADO: UI Bloqueada');
}

export function unblockUI(app) {
    app.STATE.isUIBlocked = false;
    document.body.classList.remove('ui-blocked');

    // 🟢 RETIRAR CAPA DE INVISIBILIDAD
    if (app.DOM.appContainer) 
        app.DOM.appContainer.removeAttribute('inert');

    if (app.DOM.header) 
        app.DOM.header.removeAttribute('inert');

    const footer = document.querySelector('footer');
    if (footer) 
        footer.removeAttribute('inert');

    debug.log('app', debug.DEBUG_LEVELS.EXTREME, '🛡️ ESCUDO DESACTIVADO: UI Liberada');
}

// ============================================================================
// 🍞 NOTIFICACIONES TOAST
// ============================================================================
export function showToast(app, message, duration = 3000) {
    if (!app.DOM.toast) return;

    // 🟢 ANTI-SPAM DE TOAST
    if (app.DOM.toast.classList.contains('active') && app.DOM.toast.textContent === message) {
        debug.log('app', debug.DEBUG_LEVELS.DEEP, `🚫 Toast duplicado ignorado: "${message}"`);
        return;
    }

    // 1. Bloquear UI
    app.STATE.isUIBlocked = true;
    document.body.classList.add('ui-blocked'); 
    
    // 2. Preparar mensaje A11y (Vaciar primero)
    app.DOM.toast.textContent = '';
    app.DOM.toast.classList.remove('active');
    
    if (app._toastTimer) clearTimeout(app._toastTimer);

    requestAnimationFrame(() => {
        app.DOM.toast.textContent = message;
        app.DOM.toast.classList.add('active');
        
        // 3. Gestionar duración
        if (duration !== null) {
            app._toastTimer = setTimeout(() => {
                hideToast(app);
            }, duration);
        } else {
            debug.log('app', debug.DEBUG_LEVELS.BASIC, 'Toast persistente activado (UI Bloqueada). Esperando hideToast().');
        }
    });
}

export function hideToast(app) {
    if (!app.DOM.toast) return;

    app.DOM.toast.classList.remove('active');
    if (app._toastTimer) clearTimeout(app._toastTimer);

    // Desbloquear UI
    app.STATE.isUIBlocked = false;
    document.body.classList.remove('ui-blocked');

    debug.log('app', debug.DEBUG_LEVELS.BASIC, 'Toast oculto. UI Desbloqueada.');
}

// ============================================================================
// 🗣️ LOCUTOR DE ACCESIBILIDAD (A11Y ANNOUNCER)
// ============================================================================
export function injectA11yAnnouncer(app) {
    if (document.getElementById('a11y-announcer-polite')) return;
    
    const createAnnouncer = (id, type) => {
        const el = document.createElement('div');
        el.id = id;
        el.setAttribute('role', type === 'assertive' ? 'alert' : 'status');
        el.setAttribute('aria-live', type);
        el.setAttribute('aria-atomic', 'true');
        
        Object.assign(el.style, {
            position: 'absolute', width: '1px', height: '1px', padding: '0',
            overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap',
            border: '0', pointerEvents: 'none'
        });
        
        document.body.appendChild(el);
        return el;
    };

    app.DOM.announcerPolite = createAnnouncer('a11y-announcer-polite', 'polite');
    app.DOM.announcerAssertive = createAnnouncer('a11y-announcer-assertive', 'assertive');
    app.DOM.announcer = app.DOM.announcerPolite;
}

export function announceA11y(app, message, mode = 'polite') {
    // 🟢 Si el modal de A11y está abierto, SILENCIO TOTAL en el resto de la app.
    const modal = document.getElementById('a11y-modal-overlay');

    if (modal && modal.classList.contains('active')) {
        debug.log('app', debug.DEBUG_LEVELS.DEEP, 
            `🤫 Silenciado por Modal A11y: "${message}"`);
        return;
    }

    injectA11yAnnouncer(app);

    const el = mode === 'assertive' ? app.DOM.announcerAssertive : app.DOM.announcerPolite;

    // TRUE ANTI-SPAM
    if (app.STATE._lastAnnounced === message) {
        debug.log('app', debug.DEBUG_LEVELS.DEEP, 
            `🚫 Anti-Spam: Ignorando mensaje repetido "${message}"`);
        return; 
    }

    app.STATE._lastAnnounced = message;
    el.textContent = ''; 
    
    setTimeout(() => {
        el.textContent = message;
        debug.log('app', debug.DEBUG_LEVELS.DEEP, 
            `🗣️ Locutor (${mode}): "${message}"`);
    }, 10);
}

export function announceA11yStop(app) {
    if (app.DOM.announcerPolite) app.DOM.announcerPolite.textContent = '';
    if (app.DOM.announcerAssertive) app.DOM.announcerAssertive.textContent = '';
    app.STATE._lastAnnounced = null; 

    debug.log('a11y', debug.DEBUG_LEVELS.DEEP, `🗣️ Locutor detenido.`);
}

/* --- code/app-feedback.js --- */