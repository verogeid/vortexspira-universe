// --- code/debug.js ---

export const IS_PRODUCTION = false;
export const CLEAR_CONSOLE_ON_START = true;

// Niveles de depuración estándar
export const DEBUG_LEVELS = {
    DISABLED: 0,  // No se muestra nada
    BASIC: 1,     // Muestra logs de eventos principales
    DEEP: 2,      // Muestra logs detallados (para depuración intensa)
    EXTREME: 3,   // Muestra losgs detallados (para depuración granular)
    TELEMETRY: 4  // Para mensajes que se enviarían a un servidor en producción
};

export const DEBUG_CONFIG = {
    global: DEBUG_LEVELS.DISABLED,
    global_focus: DEBUG_LEVELS.DISABLED,
    global_font: DEBUG_LEVELS.DISABLED,
    global_layout: DEBUG_LEVELS.DISABLED,
    global_key: DEBUG_LEVELS.DISABLED,
    global_mouse: DEBUG_LEVELS.DISABLED,
    
    app: DEBUG_LEVELS.DISABLED,
    data: DEBUG_LEVELS.DISABLED,
    i18n: DEBUG_LEVELS.DISABLED,
    a11y: DEBUG_LEVELS.EXTREME,
    nav_stack: DEBUG_LEVELS.DISABLED,

    // Módulos de Detalle
    nav_base: DEBUG_LEVELS.DISABLED,
    nav_base_details: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para el foco/blur después del slide ⭐️
    
    // Módulos de Teclado
    nav_keyboard_base: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para ver el listener keydown global ⭐️
    nav_keyboard_details: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para la lógica de cursor en detalle ⭐️
    nav_keyboard_swipe: DEBUG_LEVELS.DISABLED,

    // Módulos de Mouse
    nav_mouse_details: DEBUG_LEVELS.DISABLED, // Excluir rueda de ratón en detalle
    nav_mouse_swipe: DEBUG_LEVELS.DISABLED,   // Excluir arrastre en menús
    
    render_base: DEBUG_LEVELS.DISABLED,
    render_details: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para inicialización de Swiper de detalle ⭐️
    render_swipe: DEBUG_LEVELS.DISABLED
};

/* ============================================================
   🛠️ UTILIDAD INTERNA DE FORMATO
   Fusiona el prefijo [Modulo] con el mensaje para soportar %c
   ============================================================ */
function _printWithPrefix(method, moduleName, args) {
    if (args.length > 0 && typeof args[0] === 'string') {
        // Si el primer argumento es texto (ej: "%cHola"), le pegamos el prefijo delante.
        // Así: "[App] %cHola" -> El navegador detecta el %c y aplica los estilos de args[1].
        const newArgs = [...args];
        newArgs[0] = `[${moduleName}] ${newArgs[0]}`;
        method(...newArgs);
    } else {
        // Si es un objeto u otra cosa, imprimimos el prefijo por separado
        method(`[${moduleName}]`, ...args);
    }
}

export function logDebugLevels() {
    logGroupCollapsed('global', DEBUG_LEVELS.BASIC, 'Configured DEBUG levels:');
    for (const idKey in DEBUG_CONFIG) {
        const numericValue = DEBUG_CONFIG[idKey];
        const stringLabel = Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key] === numericValue) || numericValue;
        log('global', DEBUG_LEVELS.BASIC, `${idKey} : ${stringLabel}`);
    }
    logGroupEnd('global', DEBUG_LEVELS.BASIC);
}

export function logClear() {
    if (CLEAR_CONSOLE_ON_START) {
        console.clear();
    }
};

/**
 * Función de logging centralizada.
 */
export function log(moduleName, requiredLevel, ...args) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel) {
        if (IS_PRODUCTION && requiredLevel === DEBUG_LEVELS.TELEMETRY) {
            console.info(`[TELEMETRÍA - ${moduleName}]`, ...args);
        } else if (!IS_PRODUCTION) {
            _printWithPrefix(console.log, moduleName, args);
        }
    }
}

/**
 * Muestra una advertencia.
 */
export function logWarn(moduleName, ...args) {
    if (DEBUG_CONFIG[moduleName] >= DEBUG_LEVELS.BASIC) {
        if (!IS_PRODUCTION) {
            _printWithPrefix(console.warn, moduleName, args);
        }
    }
}

/**
 * Muestra una stack trace.
 */
export function logTrace(moduleName, ...args) {
    if (DEBUG_CONFIG[moduleName] >= DEBUG_LEVELS.BASIC) {
        if (!IS_PRODUCTION) {
            _printWithPrefix(console.trace, moduleName, args);
        }
    }
}

/**
 * Muestra un error.
 */
export function logError(moduleName, ...args) {
    if (!IS_PRODUCTION) {
        _printWithPrefix(console.error, moduleName, args);
    }
}

/**
 * Inicia un grupo colapsado.
 */
export function logGroupCollapsed(moduleName, requiredLevel, ...args) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        _printWithPrefix(console.groupCollapsed, moduleName, args);
    }
}

/**
 * Cierra el grupo actual.
 */
export function logGroupEnd(moduleName, requiredLevel) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        console.groupEnd();
    }
}

/* ... (Los Watchdogs _setupFocusTracker, _watchFlag, etc. se mantienen igual) ... */
export function _setupFocusTracker() {
    if (DEBUG_CONFIG.global_focus < DEBUG_LEVELS.DEEP) return;
    document.addEventListener('focusin', () => {
        log('global_focus', DEBUG_LEVELS.DEEP, 'Foco movido a:', {
            tag: document.activeElement.tagName,
            id: document.activeElement.id,
            class: document.activeElement.className,
            focusable: document.activeElement.tabIndex
        });
    });
}

export function _watchFlag(stateObj, propName) {
    if (DEBUG_CONFIG.global < DEBUG_LEVELS.DEEP) return;
    let value = stateObj[propName];
    Object.defineProperty(stateObj, propName, {
        get: () => value,
        set: (newValue) => {
            if (value !== newValue) {
                logTrace('global', `Flag [${propName}] cambiado: ${value} -> ${newValue}`);
                value = newValue;
            }
        },
        configurable: true
    });
}

export function _setupFocusMethodInterceptor() {
    if (DEBUG_CONFIG.global_focus < DEBUG_LEVELS.DEEP) return;
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(...args) {
        log('global_focus', DEBUG_LEVELS.DEEP, `Solicitado .focus() sobre:`, this);
        logTrace('global_focus', 'Origen de la solicitud de foco:');
        return originalFocus.apply(this, args);
    };
}

export function _setupGlobalClickListener() {
    if (DEBUG_CONFIG.global_mouse < DEBUG_LEVELS.DEEP) return;
    document.addEventListener('click', function(e) {
        if (typeof log === 'function') {
            const targetElement = e.target;
            const closestCard = targetElement.closest('.card');
            logGroupCollapsed('global_mouse', DEBUG_LEVELS.DEEP, '❌ CLIC GLOBAL CAPTURADO ❌');
            log('global_mouse', DEBUG_LEVELS.DEEP, 'Origen (e.target):', targetElement.tagName, targetElement.id, targetElement.className);
            if (closestCard) {
                log('global_mouse', DEBUG_LEVELS.DEEP, 'Elemento Clicado es una Tarjeta.', 'Card ID:', closestCard.dataset.id);
            }
            logGroupEnd('global_mouse', DEBUG_LEVELS.DEEP);
        }
    }, true);
}

export function _setupKeyTracker() {
    if (DEBUG_CONFIG.global_key < DEBUG_LEVELS.DEEP) return;
    document.addEventListener('keydown', (e) => {
        log('global_key', DEBUG_LEVELS.DEEP, `⌨️ TECLA PULSADA: [${e.key}]`, {
            focusEn: document.activeElement.tagName,
            id: document.activeElement.id,
            class: document.activeElement.className,
            tabIndex: document.activeElement.tabIndex
        });
    }, true);
}

export function _setupConsoleInterceptor() {
    if (DEBUG_CONFIG.global < DEBUG_LEVELS.DEEP) return;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    const SWIPER_WARNING_PATTERN = /Swiper Loop Warning/;
    const CLEAR_CONSOLE_AVOIDED_PATTERN = /console\.clear\(\) se ha evitado/;

    console.warn = function(...args) {
        const message = args.join(' ');
        if (SWIPER_WARNING_PATTERN.test(message)) return;
        originalConsoleWarn.apply(console, args);
    };

    console.log = function(...args) {
        const message = args.join(' ');
        if (CLEAR_CONSOLE_AVOIDED_PATTERN.test(message)) return;
        originalConsoleLog.apply(console, args);
    };
}

/**
 * DIAGNÓSTICO: Analiza los tamaños de fuente y dimensiones reales.
 * Detecta vista detalle vs menú mediante clases activas.
 */
export function runFontDiagnostics() {
    if (DEBUG_CONFIG.global_font < DEBUG_LEVELS.BASIC) return;

    logGroupCollapsed('global_font', DEBUG_LEVELS.BASIC, "%c📊 DIAGNÓSTICO DE TAMAÑOS REALES", "background: #222; color: #bada55; font-size: 16px; padding: 4px; border-radius: 4px;");

    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const scale = parseFloat(rootStyle.getPropertyValue('--font-scale')) || 1;
    
    // 1. Datos del Entorno
    logGroupCollapsed('global_font', DEBUG_LEVELS.BASIC, "🌍 Entorno");
    log('global_font', DEBUG_LEVELS.BASIC, `Viewport: %c${window.innerWidth}px x ${window.innerHeight}px`, "color: cyan; font-weight: bold;");
    log('global_font', DEBUG_LEVELS.BASIC, `Layout Mode (body): %c${document.body.getAttribute('data-layout')}`, "color: magenta; font-weight: bold;");
    log('global_font', DEBUG_LEVELS.BASIC, `Safe Mode (body): %c${document.body.getAttribute('data-safe-mode')}`, "color: orange; font-weight: bold;");
    log('global_font', DEBUG_LEVELS.BASIC, `Escala Usuario (A11y): %c${scale}x (${scale * 100}%)`, "color: yellow; font-weight: bold;");
    log('global_font', DEBUG_LEVELS.BASIC, `Tamaño base '1rem': %c${parseFloat(rootStyle.fontSize)}px`, "color: white; background: red; font-weight: bold; padding: 2px;");
    logGroupEnd('global_font', DEBUG_LEVELS.BASIC);

    // Función auxiliar: Busca el PRIMER elemento VISIBLE que coincida
    function medir(selector, nombre) {
        const elements = document.querySelectorAll(selector);
        let el = null;
        
        // Buscamos el primero que sea visible (tenga offsetParent)
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].offsetParent !== null) {
                el = elements[i];
                break;
            }
        }

        if (!el) {
            // logWarn('global_font', `❌ ${nombre}: No encontrado visible.`);
            return false;
        }

        const st = getComputedStyle(el);
        const fontSize = parseFloat(st.fontSize);
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        logGroupCollapsed('global_font', DEBUG_LEVELS.BASIC, `📏 ${nombre}`);
        log('global_font', DEBUG_LEVELS.BASIC, `Selector: ${selector}`);
        log('global_font', DEBUG_LEVELS.BASIC, `Font-Size: %c${fontSize.toFixed(1)}px`, "color: #ff5555; font-weight: bold; font-size: 1.1em");
        log('global_font', DEBUG_LEVELS.BASIC, `Dimensiones: ${width}px (ancho) x ${height}px (alto)`);
        log('global_font', DEBUG_LEVELS.BASIC, `Line-Height: ${st.lineHeight}`);
        logGroupEnd('global_font', DEBUG_LEVELS.BASIC);
        return true;
    }

    // 2. Elementos Comunes
    log('global_font', DEBUG_LEVELS.BASIC, "%c⬇️ ELEMENTOS VISIBLES ⬇️", "color: #ccc; margin-top: 10px;");
    medir("header h1", "Título Header");
    
    // 3. DETECCIÓN DE CONTEXTO
    // Verificamos si los contenedores de detalle tienen la clase .active
    const mobileDetail = document.getElementById('vista-detalle-mobile');
    const desktopDetail = document.getElementById('vista-detalle-desktop');
    
    const isDetailActive = (mobileDetail && mobileDetail.classList.contains('active')) || 
                           (desktopDetail && desktopDetail.classList.contains('active'));

    if (isDetailActive) {
        log('global_font', DEBUG_LEVELS.BASIC, "%c📄 VISTA DE DETALLE DETECTADA", "background: #004400; color: #fff; padding: 2px;");
        
        const titleFound = medir(".detail-title-slide", "Título del Detalle");
        const textFound = medir(".detail-text-fragment p", "Párrafo del Detalle");
        const btnFound = medir(".detail-action-btn", "Botón de Acción");
        
        if (!titleFound && !textFound) {
             logWarn('global_font', "Vista detalle activa, pero no encuentro contenido visible (¿Scroll/Swiper?)");
        }

    } else {
        log('global_font', DEBUG_LEVELS.BASIC, "%c🃏 VISTA DE MENÚ (CARDS) DETECTADA", "background: #440044; color: #fff; padding: 2px;");
        
        // Excluimos las tarjetas de relleno para no medir fantasmas
        const cardFound = medir(".card:not([data-tipo='relleno'])", "Tarjeta de Contenido");
        
        if (cardFound) {
            medir(".card h3", "Título Tarjeta");
            medir(".card p", "Descripción Tarjeta");
        } else {
            logWarn('global_font', "No encuentro tarjetas de contenido visibles.");
        }
    }

    // 4. FOOTER
    logGroupCollapsed('global_font', DEBUG_LEVELS.BASIC, "%c⬇️ FOOTER ⬇️", "color: #ccc; margin-top: 10px;");
    medir("footer", "Footer Container");
    medir(".footer-copyright", "Texto Copyright");
    medir(".footer-social-link", "Icono Social");

    logGroupEnd('global_font', DEBUG_LEVELS.BASIC);
}

/**
 * DIAGNÓSTICO FORENSE (CSI): Detecta qué elemento está tapando la pantalla
 * y verifica el estado crítico de layout (Footer, Safe Mode, Overflow).
 */
export function runLayoutDiagnostics() {
    if (DEBUG_CONFIG.global_layout < DEBUG_LEVELS.BASIC) return;
    
    logGroupCollapsed('global_layout', DEBUG_LEVELS.BASIC, "%c🕵️‍♂️ CSI: INSPECCIÓN DE OBSTRUCCIÓN", "background: #000; color: #0f0; font-size: 16px; padding: 5px;");

    // 1. ¿QUÉ HAY EN EL PUNTO DE CORTE?
    const x = window.innerWidth / 2;
    const y = window.innerHeight - 50; 
    const elementoCulpable = document.elementFromPoint(x, y);

    logGroupCollapsed('global_layout', DEBUG_LEVELS.BASIC, "📍 Punto de Inspección (Fondo Pantalla)");
    log('global_layout', DEBUG_LEVELS.BASIC, `Coordenadas: ${x}px, ${y}px`);
    if (elementoCulpable) {
        log('global_layout', DEBUG_LEVELS.BASIC, "Elemento detectado:", elementoCulpable);
        log('global_layout', DEBUG_LEVELS.BASIC, "ID:", elementoCulpable.id);
        log('global_layout', DEBUG_LEVELS.BASIC, "Clases:", elementoCulpable.className);
        log('global_layout', DEBUG_LEVELS.BASIC, "Tag:", elementoCulpable.tagName);
        const st = getComputedStyle(elementoCulpable);
        log('global_layout', DEBUG_LEVELS.BASIC, "Color de Fondo:", st.backgroundColor);
        log('global_layout', DEBUG_LEVELS.BASIC, "Z-Index:", st.zIndex);
        log('global_layout', DEBUG_LEVELS.BASIC, "Position:", st.position);
    } else {
        logWarn('global_layout', "⚠️ Nada detectado (¿Canvas vacío?)");
    }
    logGroupEnd('global_layout', DEBUG_LEVELS.BASIC);

    /* ⭐️ DIAGNÓSTICO DE HEADER ⭐️ */
    const header = document.getElementById('app-header');
    if (header) {
        const rect = header.getBoundingClientRect();
        const st = getComputedStyle(header);
        const varHeight = document.documentElement.style.getPropertyValue('--header-height-real');
        
        logGroupCollapsed('global_layout', DEBUG_LEVELS.BASIC, "🎩 Estado del Header");
        
        log('global_layout', DEBUG_LEVELS.BASIC, `OffsetHeight (Entero): ${header.offsetHeight}px`);
        log('global_layout', DEBUG_LEVELS.BASIC, `BoundingRect (Exacto): %c${rect.height.toFixed(2)}px`, "color: cyan; font-weight: bold;");
        log('global_layout', DEBUG_LEVELS.BASIC, `Bottom Position: ${rect.bottom.toFixed(2)}px (Límite visual)`);
        log('global_layout', DEBUG_LEVELS.BASIC, `Var CSS (--header-height-real): ${varHeight || 'No definida'}`);
        
        log('global_layout', DEBUG_LEVELS.BASIC, `Position: ${st.position}`);
        log('global_layout', DEBUG_LEVELS.BASIC, `Z-Index: ${st.zIndex}`);
        
        if (st.position === 'fixed' || st.position === 'sticky') {
             log('global_layout', DEBUG_LEVELS.BASIC, "⚠️ Header está FIJO/STICKY. ¿Está tapando contenido?");
        }
        
        logGroupEnd('global_layout', DEBUG_LEVELS.BASIC);
    } else {
        logError('global_layout', "❌ Header no encontrado (#app-header)");
    }

    // 2. ESTADO DEL FOOTER
    const footer = document.querySelector('footer');
    if (footer) {
        const st = getComputedStyle(footer);
        logGroupCollapsed('global_layout', DEBUG_LEVELS.BASIC, "🦶 Estado del Footer");
        
        // Check de posición peligroso
        const posMsg = `Position: ${st.position}`;
        const posColor = st.position === 'fixed' ? "color: red; font-weight: bold" : "color: green";
        log('global_layout', DEBUG_LEVELS.BASIC, `%c${posMsg}`, posColor);
        
        log('global_layout', DEBUG_LEVELS.BASIC, `Display: ${st.display}`);
        log('global_layout', DEBUG_LEVELS.BASIC, `Z-Index: ${st.zIndex}`);
        log('global_layout', DEBUG_LEVELS.BASIC, `Height: ${st.height}`);
        logGroupEnd('global_layout', DEBUG_LEVELS.BASIC);
    }

    // 3. ESTADO DEL CONTENEDOR DE DETALLE
    // Detectamos cuál está activo
    const detalleMobile = document.getElementById('vista-detalle-mobile');
    const detalleDesktop = document.getElementById('vista-detalle-desktop');
    const detalleActivo = (detalleMobile && getComputedStyle(detalleMobile).display !== 'none') ? detalleMobile : detalleDesktop;

    if (detalleActivo) {
        const st = getComputedStyle(detalleActivo);
        logGroupCollapsed('global_layout', DEBUG_LEVELS.BASIC, `📄 Contenedor Detalle (${detalleActivo.id})`);
        
        log('global_layout', DEBUG_LEVELS.BASIC, `Height: ${st.height}`);
        
        const overflowMsg = `Overflow-Y: ${st.overflowY}`;
        const overflowColor = st.overflowY === 'hidden' ? "color: red; font-weight: bold" : "color: green";
        log('global_layout', DEBUG_LEVELS.BASIC, `%c${overflowMsg}`, overflowColor);
        
        log('global_layout', DEBUG_LEVELS.BASIC, `Padding-Bottom: ${st.paddingBottom}`);
        logGroupEnd('global_layout', DEBUG_LEVELS.BASIC);
    } else {
        logWarn('global_layout', "No se encontró contenedor de detalle activo.");
    }
    
    // 4. VERIFICACIÓN DE info-adicional
    const info = document.getElementById('info-adicional');
    if (info) {
        const style = window.getComputedStyle(info);
        const isVisible = style.display !== 'none';
        const layout = document.body.getAttribute('data-layout');

        logGroupCollapsed('global_layout', DEBUG_LEVELS.BASIC, `ℹ️ Panel Info Adicional:`);
        log('global_layout', DEBUG_LEVELS.BASIC, `Display Computado: ${style.display}`);
        log('global_layout', DEBUG_LEVELS.BASIC, `Visibilidad Real: ${isVisible ? '✅ VISIBLE' : '❌ OCULTO'}`);
        
        if (!isVisible) {
            if (DEBUG_CONFIG.global_layout >= DEBUG_LEVELS.BASIC) {
                logWarn('global_layout', `⚠️ El panel está oculto por reglas CSS de [${layout}].`);

                if (layout === 'tablet-portrait') {
                    logWarn('global_layout', `(En Portrait el grid es de 2 columnas y no hay sitio para el panel)`);
                }
            }
        }
        logGroupEnd('global_layout', DEBUG_LEVELS.BASIC);
    } else {
        if (DEBUG_CONFIG.global_layout >= DEBUG_LEVELS.BASIC) {
            logError('global_layout', "❌ No se encuentra el elemento #info-adicional");
        }
    }

    // 4. VERIFICACIÓN DE SAFE MODE
    const safeMode = document.body.getAttribute('data-safe-mode');
    const safeMsg = `🛡️ Safe Mode Activo: ${safeMode}`;
    const safeColor = safeMode === 'true' ? "color: green; font-weight: bold" : "color: red; font-weight: bold";
    
    log('global_layout', DEBUG_LEVELS.BASIC, `%c${safeMsg}`, safeColor);
    
    logGroupEnd('global_layout', DEBUG_LEVELS.BASIC);
}

/* ============================================================
   🎧 SIMULADOR DINÁMICO DE LECTOR DE PANTALLA (E2E)
   ============================================================ */
let _srObserver = null;
let _srFocusListener = null;

export function enableScreenReaderSimulator() {
    if (_srFocusListener) 
        return; // Ya activo

    log('a11y', DEBUG_LEVELS.EXTREME, "%c👨‍🦯 SIMULADOR DE LECTOR DE PANTALLA ACTIVADO", "background: #333; color: #bada55; font-size: 16px; padding: 10px; border-radius: 5px; font-weight: bold; margin-top: 10px;");
    log('a11y', DEBUG_LEVELS.EXTREME, "%c(Activado automáticamente por flag 'a11y' >= DEEP)", "color: #777; font-style: italic;");

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
        
        logGroupCollapsed('a11y', DEBUG_LEVELS.EXTREME, `%c👉 FOCO`, logStyle, ` ${name || 'SIN NOMBRE'} `);
        log('a11y', DEBUG_LEVELS.EXTREME, `%cTexto: "${name}"`, textStyle);
        log('a11y', DEBUG_LEVELS.EXTREME, `Rol:   [${role}]`);
        if (description) 
            log('a11y', DEBUG_LEVELS.EXTREME, `Desc:  "${description}"`);

        if (state.length) 
            log('a11y', DEBUG_LEVELS.EXTREME, `Estado: ${state.join(', ')}`);

        if (warning) 
            logWarn('a11y', warning);

        log('a11y', DEBUG_LEVELS.EXTREME, "Elemento DOM:", el);
        logGroupEnd();
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
            
            const liveRegion = target.closest('[aria-live]');
            if (liveRegion && !updates.has(liveRegion)) {
                updates.add(liveRegion);
                
                if (!liveRegion.innerText.trim()) return;

                const mode = liveRegion.getAttribute('aria-live');
                const text = liveRegion.innerText.trim();
                const role = liveRegion.getAttribute('role');

                const isAssertive = mode === 'assertive' || role === 'alert';
                const prefix = isAssertive ? '🚨 URGENTE (Interrumpe)' : '📢 AVISO (Espera)';
                const bg = isAssertive ? '#ff0000' : '#ffa500';
                
                log('a11y', DEBUG_LEVELS.EXTREME, `%c${prefix}: "${text}"`, `color: #fff; background: ${bg}; padding: 4px; border-radius: 3px; font-weight: bold;`);
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

// --- HELPERS (Heurística simplificada) ---
function _computeAccessibleName(el) {
    if (el.hasAttribute('aria-labelledby')) {
        const ids = el.getAttribute('aria-labelledby').split(/\s+/);
        const texts = ids.map(id => {
            const ref = document.getElementById(id);
            return ref ? (ref.getAttribute('aria-label') || ref.innerText || '') : '';
        });
        return texts.join(' ').trim();
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

    if (tag === 'button') 
        return 'button';

    if (tag === 'a' && el.hasAttribute('href')) 
        return 'link';

    if (tag === 'input') 
        return `input (${el.type})`;

    if (tag === 'article') 
        return 'article';

    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) 
        return 'heading';

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

// --- code/debug.js ---