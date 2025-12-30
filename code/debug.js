// --- code/debug.js ---

export const IS_PRODUCTION = false;
export const CLEAR_CONSOLE_ON_START = true;

// Niveles de depuración estándar
export const DEBUG_LEVELS = {
    DISABLED: 0,  // No se muestra nada
    BASIC: 1,     // Muestra logs de eventos principales
    DEEP: 2,      // Muestra logs detallados (para depuración intensa)
    TELEMETRY: 3 // Para mensajes que se enviarían a un servidor en producción
};

export const DEBUG_CONFIG = {
    global: DEBUG_LEVELS.BASIC,
    global_focus: DEBUG_LEVELS.DISABLED,
    global_key: DEBUG_LEVELS.DISABLED,
    global_mouse: DEBUG_LEVELS.DISABLED,
    
    app: DEBUG_LEVELS.BASIC,
    data: DEBUG_LEVELS.DISABLED,
    i18n: DEBUG_LEVELS.DISABLED,
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
    
    render_base: DEBUG_LEVELS.BASIC,
    render_details: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para inicialización de Swiper de detalle ⭐️
    render_swipe: DEBUG_LEVELS.DISABLED
};

export function logClear() {
    if (CLEAR_CONSOLE_ON_START) {
        console.clear();
    }
};

/**
 * Función de logging centralizada.
 * @param {string} moduleName - El nombre del módulo que llama (ej. 'app', 'ui').
 * @param {number} requiredLevel - El nivel de importancia de este mensaje (ej. DEBUG_LEVELS.DEEP).
 * @param {...any} args - Los mensajes o objetos a mostrar, igual que en console.log.
 */
export function log(moduleName, requiredLevel, ...args) {
    // Comprueba si el nivel de depuración configurado para el módulo es suficiente para mostrar este mensaje.
    if (DEBUG_CONFIG[moduleName] >= requiredLevel) {
        
        // Si estamos en producción y el mensaje es de telemetría...
        if (IS_PRODUCTION && requiredLevel === DEBUG_LEVELS.TELEMETRY) {
            // TODO: Implementar el envío al Service Worker.
            // navigator.serviceWorker.controller?.postMessage({ type: 'LOG', data: args });
            console.info(`[TELEMETRÍA - ${moduleName} - log]`, ...args); // Simulación por ahora
        } 
        // Si no estamos en producción...
        else if (!IS_PRODUCTION) {
            console.log(`[${moduleName}]`, ...args);
        }
    }
}

/**
 * Muestra una advertencia. Las advertencias se muestran si el nivel es BASIC o superior.
 * @param {string} moduleName - El nombre del módulo.
 * @param {...any} args - Los mensajes a mostrar.
 */
export function logWarn(moduleName, ...args) {
    if (DEBUG_CONFIG[moduleName] >= DEBUG_LEVELS.BASIC) {
        if (!IS_PRODUCTION) {
            console.warn(`[${moduleName}]`, ...args);
        }
    }
}

/**
 * Muestra una stack trace. Las trazas se muestran si el nivel es BASIC o superior.
 * @param {string} moduleName - El nombre del módulo.
 * @param {...any} args - Los mensajes a mostrar.
 */
export function logTrace(moduleName, ...args) {
    if (DEBUG_CONFIG[moduleName] >= DEBUG_LEVELS.BASIC) {
        if (!IS_PRODUCTION) {
            console.trace(`[${moduleName}]`, ...args);
        }
    }
}

/**
 * Muestra un error. Los errores se muestran SIEMPRE, independientemente del nivel de depuración del módulo.
 * @param {string} moduleName - El nombre del módulo.
 * @param {...any} args - Los mensajes a mostrar.
 */
export function logError(moduleName, ...args) {
    // Los errores siempre usan el nivel ALLWAYS, ignorando la configuración del módulo.
    if (!IS_PRODUCTION) {
        console.error(`[${moduleName}]`, ...args);
    }
}

/**
 * Inicia un grupo colapsado en la consola.
 * @param {string} moduleName - El nombre del módulo.
 * @param {number} requiredLevel - El nivel de importancia de este mensaje.
 * @param {...any} args - El título del grupo.
 */
export function logGroupCollapsed(moduleName, requiredLevel, ...args) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        console.groupCollapsed(`[${moduleName}]`, ...args);
    }
}

/**
 * Cierra el grupo actual en la consola.
 * @param {string} moduleName - El nombre del módulo.
 * @param {number} requiredLevel - El nivel de importancia debe coincidir con el del grupo que abrió.
 */
export function logGroupEnd(moduleName, requiredLevel) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        console.groupEnd();
    }
}

/**
 * WATCHDOG: Intercepta llamadas imperativas a .focus().
 */
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

/**
 * WATCHDOG: Intercepta mutaciones de flags de estado críticos.
 */
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

/**
 * WATCHDOG: Monitoriza cambios de foco globalmente.
 */
export function _setupFocusMethodInterceptor() {
    if (DEBUG_CONFIG.global_focus < DEBUG_LEVELS.DEEP) return;

    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(...args) {
        log('global_focus', DEBUG_LEVELS.DEEP, `Solicitado .focus() sobre:`, this);
        logTrace('global_focus', 'Origen de la solicitud de foco:');
        return originalFocus.apply(this, args);
    };
}

/**
 * WATCHDOG: Monitoriza clics globalmente.
 */
export function _setupGlobalClickListener() {
    if (DEBUG_CONFIG.global_mouse < DEBUG_LEVELS.DEEP) return;

    document.addEventListener('click', function(e) {
        if (typeof log === 'function') {
            const targetElement = e.target;
            const closestCard = targetElement.closest('.card');
            
            log('global_mouse', DEBUG_LEVELS.DEEP, '❌ CLIC GLOBAL CAPTURADO ❌');
            log('global_mouse', DEBUG_LEVELS.DEEP, 'Origen (e.target):', targetElement.tagName, targetElement.id, targetElement.className);
            
            if (closestCard) {
                log('global_mouse', DEBUG_LEVELS.DEEP, 'Elemento Clicado es una Tarjeta.', 'Card ID:', closestCard.dataset.id);
            }
        }
    }, true); // El 'true' activa la fase de CAPTURA.
}

/**
 * WATCHDOG: Captura pulsaciones de teclas para depurar el flujo del foco.
 * Muestra la tecla pulsada y el elemento que tenía el foco en ese instante.
 */
export function _setupKeyTracker() {
    if (DEBUG_CONFIG.global_key < DEBUG_LEVELS.DEEP) return;

    document.addEventListener('keydown', (e) => {
        log('global_key', DEBUG_LEVELS.DEEP, `⌨️ TECLA PULSADA: [${e.key}]`, {
            focusEn: document.activeElement.tagName,
            id: document.activeElement.id,
            class: document.activeElement.className,
            tabIndex: document.activeElement.tabIndex
        });
    }, true); // Usamos fase de captura para verlo antes que los handlers de la app
}

/**
 * Función de intercepción de consola (Monkey-patching).
 * Debe llamarse antes de inicializar bibliotecas externas.
 */
export function _setupConsoleInterceptor() {
    if (DEBUG_CONFIG.global < DEBUG_LEVELS.DEEP) return;

    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    // Patrón de la advertencia de Swiper
    const SWIPER_WARNING_PATTERN = /Swiper Loop Warning/;
    // Patrón del mensaje de aviso de limpieza de consola
    const CLEAR_CONSOLE_AVOIDED_PATTERN = /console\.clear\(\) se ha evitado/;

    console.warn = function(...args) {
        const message = args.join(' ');
        if (SWIPER_WARNING_PATTERN.test(message)) {
            // Suprimir la advertencia específica de Swiper
            return;
        }
        // Llamar a la función original para otras advertencias
        originalConsoleWarn.apply(console, args);
    };

    // Sobreescribir console.log para suprimir el mensaje de limpieza de consola si es necesario
    console.log = function(...args) {
        const message = args.join(' ');
        if (CLEAR_CONSOLE_AVOIDED_PATTERN.test(message)) {
            // Suprimir el mensaje de "console.clear() se ha evitado"
            return;
        }
        // Llamar a la función original para otros logs
        originalConsoleLog.apply(console, args);
    };
    
    // Nota: La intercepción de los logs de la propia aplicación está manejada por la lógica de IS_PRODUCTION.
}

// --- code/debug.js ---