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

    // 1. MONITOR DE FOCO (Entrada inicial)
    _srFocusListener = (e) => {
        const el = e.target;
        if (el === document.body) return;

        // Reutilizamos la lógica unificada de anuncio
        _announceElement(el, 'focus');
    };
    document.addEventListener('focusin', _srFocusListener);

    // 2. MONITOR DE REGIONES VIVAS Y CAMBIOS DE ESTADO
    if (!document.body) return; 
    
    _srObserver = new MutationObserver((mutations) => {
        const updates = new Set(); 
        const valueUpdates = new Set(); // 🟢 Set para deduplicar cambios de valor

        mutations.forEach(mut => {
            let target = mut.target;
            if (target.nodeType === 3) target = target.parentElement; 
            
            // A. Cambios en Regiones Vivas (Toast, etc)
            const liveRegion = target.closest('[aria-live]');
            if (liveRegion && !updates.has(liveRegion)) {
                updates.add(liveRegion);
                
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
                
                // 1. Cambio de Estado (Disabled / Pressed / Expanded)
                if (mut.type === 'attributes' && ['aria-disabled', 'disabled', 'aria-pressed', 'aria-expanded'].includes(mut.attributeName)) {
                    _announceElement(document.activeElement, 'update'); 
                }

                // 2. Cambio de Valor (Sliders) - ACUMULAR PARA DEDUPLICAR
                if (mut.type === 'attributes' && ['aria-valuenow', 'aria-valuetext'].includes(mut.attributeName)) {
                    valueUpdates.add(target);
                }
            }
        });

        // 🟢 Procesar actualizaciones de valor una sola vez por elemento
        valueUpdates.forEach(target => {
            const val = target.getAttribute('aria-valuetext') || target.getAttribute('aria-valuenow');
            debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, 
                `%c🔢 CAMBIO VALOR: "${val}"`, 
                "color: #000; background: #00ffaa; padding: 2px 6px; border-radius: 3px; font-weight: bold;");
        });
    });

    _srObserver.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
            'aria-hidden', 'aria-disabled', 'disabled', 'class', 'hidden',
            'aria-valuenow', 'aria-valuetext', 'aria-pressed', 'aria-expanded'
        ] 
    });
}

/**
 * Función unificada para pintar el log del elemento.
 * type: 'focus' (azul/gris) | 'update' (refresco)
 */
function _announceElement(el, type = 'focus') {
    const role = _computeRole(el);
    const name = _computeAccessibleName(el);
    const description = _computeDescription(el);
    const state = _computeState(el);
    
    // 🟢 Detección robusta de deshabilitado
    const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
    const titleSuffix = isDisabled ? ' (⛔ DESHABILITADO)' : '';

    const isHidden = el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]');
    const warning = isHidden ? " ⚠️ ERROR: Elemento enfocado está oculto" : "";

    // 🟢 Estilos Visuales Diferenciados
    let logStyle = "color: #fff; background: #005cc5; padding: 4px 8px; border-radius: 4px; font-size: 12px;"; // Default Focus (Azul)
    
    if (isDisabled) {
        logStyle = "color: #aaa; background: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #777;"; // Disabled (Gris)
    } else if (type === 'update') {
        logStyle = "color: #fff; background: #008800; padding: 4px 8px; border-radius: 4px; font-size: 12px;"; // Update (Verde oscuro)
    }

    const prefix = type === 'update' ? '🔄 CAMBIO ESTADO' : '👉 FOCO';
    const textStyle = "font-weight: bold; color: #fff; font-size: 13px;";
    
    debug.logGroupExpanded('a11y', debug.DEBUG_LEVELS.EXTREME, 
                            `%c${prefix}`, logStyle, ` ${name || 'SIN NOMBRE'}${titleSuffix} `);
    
    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `%cTexto: "${name}"`, textStyle);
    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `Rol:   [${role}]`);

    if (description) 
        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `Desc:  "${description}"`);

    if (state.length) 
        debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, `Estado: ${state.join(', ')}`);

    if (warning) 
        debug.logWarn('a11y', warning);
    
    debug.log('a11y', debug.DEBUG_LEVELS.EXTREME, "DOM:", el); 

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

    // Fallback para ranges que no tienen label pero tienen value
    if (el.tagName === 'INPUT' && el.type === 'range') {
        return el.getAttribute('aria-label') || 'Slider';
    }

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
    // Para sliders, el valor actual suele ser parte de la descripción si no es el nombre
    if (el.getAttribute('aria-valuenow')) {
        return `Valor actual: ${el.getAttribute('aria-valuetext') || el.getAttribute('aria-valuenow')}`;
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
    else if (el.hasAttribute('aria-expanded'))
        states.push('CONTRAÍDO');

    if (el.getAttribute('aria-current')) 
        states.push(`ACTUAL (${el.getAttribute('aria-current')})`);

    if (el.getAttribute('aria-pressed') === 'true') 
        states.push('PRESIONADO');

    return states;
}

// --- code/debug.screenReaderSim.js ---