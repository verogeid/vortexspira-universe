// --- code/debug.screenReaderSim.js ---

import * as debug from './debug.js';

/* ============================================================
   🎧 SIMULADOR DINÁMICO DE LECTOR DE PANTALLA (E2E)
   ============================================================ */
let _srObserver = null;
let _srFocusListener = null;

export function enableScreenReaderSimulator() {

    if (_srFocusListener) return; // Ya activo

    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                "%c👨‍🦯 SIMULADOR DE LECTOR DE PANTALLA ACTIVADO", 
                "background: #333; color: #bada55; font-size: 16px; padding: 10px; border-radius: 5px; font-weight: bold; margin-top: 10px;");

    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                "%c(Activado automáticamente por flag 'a11y' >= DEEP)", 
                "color: #777; font-style: italic;");

    // 1. MONITOR DE FOCO
    _srFocusListener = (e) => {
        const el = e.target;
        if (el === document.body) return;

        const role = _computeRole(el);
        const name = _computeAccessibleName(el);
        const description = _computeDescription(el);
        const state = _computeState(el);
        
        const isHidden = el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]');
        const warning = isHidden ? " ⚠️ ERROR: Elemento enfocado está oculto (aria-hidden=true)" : "";

        const logStyle = "color: #fff; background: #005cc5; padding: 4px 8px; border-radius: 4px; font-size: 12px;";
        const textStyle = "font-weight: bold; color: #fff; font-size: 13px;";
        
        debug.logGroupExpanded('a11y', debug.DEBUG_LEVELS.EXTREME, 
                                `%c👉 FOCO`, logStyle, ` ${name || 'SIN NOMBRE'} `);

        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                    `%cTexto: "${name}"`, textStyle);

        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                    `Rol:   [${role}]`);

        if (description) 
            debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                        `Desc:  "${description}"`);

        if (state.length) 
            debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                        `Estado: ${state.join(', ')}`);

        if (warning) 
            debug.logWarn('a11y', warning);

        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, "Elemento DOM:", el);

        debug.logGroupEnd('a11y', debug.DEBUG_LEVELS.EXTREME);
    };
    document.addEventListener('focusin', _srFocusListener);

    // 2. MONITOR DE REGIONES VIVAS
    if (!document.body) 
        return; // Seguridad extra
    
    _srObserver = new MutationObserver((mutations) => {
        const updates = new Set(); 

        mutations.forEach(mut => {
            let target = mut.target;
            if (target.nodeType === 3) target = target.parentElement; 
            
            // A. Cambios en Regiones Vivas (Toast, etc)
            const liveRegion = target.closest('[aria-live]');
            if (liveRegion && !updates.has(liveRegion)) {
                updates.add(liveRegion);
                
                // Ignoramos vaciados de texto
                if (!liveRegion.innerText.trim()) return;

                const mode = liveRegion.getAttribute('aria-live');
                const text = liveRegion.innerText.trim();
                const isAssertive = mode === 'assertive' || liveRegion.getAttribute('role') === 'alert';
                const prefix = isAssertive ? '🚨 URGENTE' : '📢 AVISO';
                const color = isAssertive ? '#ff0000' : '#ffa500';
                
                debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                            `%c${prefix}: "${text}"`, 
                            `color: #fff; background: ${color}; padding: 4px; border-radius: 3px; font-weight: bold;`);
            }

            // B. Cambios de estado en tiempo real (mientras estás encima)
            if (target === document.activeElement || target.contains(document.activeElement)) {
                if (mut.type === 'attributes' && (mut.attributeName === 'aria-disabled' || mut.attributeName === 'disabled')) {
                    // Si cambia el atributo dinámicamente, lo volvemos a anunciar
                    _announceElement(document.activeElement); 
                }
            }
        });
    });

    _srObserver.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-hidden', 'aria-disabled', 'class', 'hidden'] 
    });
}

function _announceElement(el) {
    const role = _computeRole(el);
    const name = _computeAccessibleName(el);
    const description = _computeDescription(el);
    const state = _computeState(el);
    
    // 🟢 IMITACIÓN REAL: Si está disabled, va al título principal
    const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
    const titleSuffix = isDisabled ? ' (⛔ DESHABILITADO)' : '';

    const isHidden = el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]');
    const warning = isHidden ? " ⚠️ ERROR: Elemento enfocado está oculto" : "";

    const logStyle = isDisabled 
        ? "color: #aaa; background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #555;" // Estilo gris para disabled
        : "color: #fff; background: #005cc5; padding: 4px 8px; border-radius: 4px; font-size: 12px;"; // Azul para activo

    const textStyle = "font-weight: bold; color: #fff; font-size: 13px;";
    
    // Aquí es donde el simulador te dice la verdad: Nombre + Estado
    debug.logGroupExpanded('a11y', debug.DEBUG_LEVELS.EXTREME, 
                            `%c👉 FOCO`, logStyle, ` ${name || 'SIN NOMBRE'}${titleSuffix} `);
    
    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `%cTexto: "${name}"`, textStyle);
    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `Rol:   [${role}]`);

    if (description) 
        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `Desc:  "${description}"`);

    if (state.length) 
        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `Estado Detallado: ${state.join(', ')}`);

    if (warning) 
        debug.logWarn('a11y', warning);
    
    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, el); 

    debug.logGroupEnd('a11y', debug.DEBUG_LEVELS.EXTREME);
}

// --- HELPERS (Heurística simplificada) ---
function _computeAccessibleName(el) {
    if (el.hasAttribute('aria-labelledby')) {
        const ids = el.getAttribute('aria-labelledby').split(/\s+/);

        return ids.map(id => document.getElementById(id)?.innerText || '').join(' ').trim();
    }

    if (el.hasAttribute('aria-label')) 
        return el.getAttribute('aria-label');

    if (el.tagName === 'IMG') 
        return el.getAttribute('alt') || '';

    if (el.tagName === 'INPUT' && el.type === 'text') 
        return el.value;

    return el.innerText ? el.innerText.split('\n')[0].trim() : ''; 
}

function _computeRole(el) {
    if (el.hasAttribute('role')) 
        return el.getAttribute('role');

    const tag = el.tagName.toLowerCase();

    if (tag === 'button') return 'button';

    if (tag === 'a' && el.hasAttribute('href')) return 'link';

    if (tag === 'input') return `input (${el.type})`;

    if (tag === 'article') return 'article';

    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return 'heading';

    return 'generic';
}

function _computeDescription(el) {
    if (el.hasAttribute('aria-describedby')) {
        const ids = el.getAttribute('aria-describedby').split(/\s+/);

        return ids.map(id => document.getElementById(id)?.innerText || '').join(' ').trim();
    }
    return '';
}

function _computeState(el) {
    const states = [];

    // 🟢 Comprobación robusta
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') 
        states.push('DESHABILITADO');

    if (el.getAttribute('aria-expanded') === 'true') 
        states.push('EXPANDIDO');

    if (el.getAttribute('aria-current')) 
        states.push(`ACTUAL (${el.getAttribute('aria-current')})`);

    if (el.getAttribute('aria-pressed') === 'true') 
        states.push('PRESIONADO');

    return states;
}

// --- code/debug.screenReaderSim.js ---