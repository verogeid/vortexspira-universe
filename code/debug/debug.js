// --- code/debug/debug.js ---

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

    global_imageSec: DEBUG_LEVELS.DISABLED,

    global_focus: DEBUG_LEVELS.DISABLED,
    global_font: DEBUG_LEVELS.DISABLED,
    global_layout: DEBUG_LEVELS.DISABLED,
    
    global_key: DEBUG_LEVELS.DISABLED,
    global_mouse: DEBUG_LEVELS.DISABLED,

    seo_sim: DEBUG_LEVELS.DISABLED,
    
    app: DEBUG_LEVELS.DISABLED,

    app_utils: DEBUG_LEVELS.DISABLED,
    data: DEBUG_LEVELS.DISABLED,
    i18n: DEBUG_LEVELS.DISABLED,

    a11y: DEBUG_LEVELS.DISABLED,
    a11y_modal: DEBUG_LEVELS.DISABLED,

    nav_stack: DEBUG_LEVELS.DISABLED,

    main_menu: DEBUG_LEVELS.DISABLED,

    // Módulos de Detalle
    nav_base: DEBUG_LEVELS.DISABLED,
    nav_base_details: DEBUG_LEVELS.DISABLED,
    
    // Módulos de Teclado
    nav_keyboard_base: DEBUG_LEVELS.DISABLED,
    nav_keyboard_details: DEBUG_LEVELS.DISABLED,
    nav_keyboard_swipe: DEBUG_LEVELS.DISABLED,

    // Módulos de Mouse
    nav_mouse_details: DEBUG_LEVELS.DISABLED,
    nav_mouse_swipe: DEBUG_LEVELS.DISABLED, 
    
    render_base: DEBUG_LEVELS.DISABLED,
    render_details: DEBUG_LEVELS.DISABLED, 
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

/**
 * Función para mostrar los niveles de depuración configurados en consola.
 */
export function logDebugLevels() {
    logGroupCollapsed('global', DEBUG_LEVELS.BASIC, 'Configured DEBUG levels:');
    for (const idKey in DEBUG_CONFIG) {
        const numericValue = DEBUG_CONFIG[idKey];
        const stringLabel = Object.keys(DEBUG_LEVELS).find(
            key => DEBUG_LEVELS[key] === numericValue) || numericValue;

        log('global', DEBUG_LEVELS.BASIC, 
            `${idKey} : ${stringLabel}`);
    }
    logGroupEnd('global', DEBUG_LEVELS.BASIC);
}

/**
 * Función vaciar la consola al iniciar la aplicación, si está configurada para hacerlo.
 */
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
 * Inicia un grupo expandido.
 */
export function logGroupExpanded(moduleName, requiredLevel, ...args) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        _printWithPrefix(console.group, moduleName, args);
    }
}

/**
 * Cierra el grupo actual.
 */
export function logGroupEnd(moduleName, requiredLevel = DEBUG_LEVELS.BASIC) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        console.groupEnd();
    }
}

/**
 * Muestra el resultado en una tabla
 */
export function logTable(moduleName, requiredLevel, data) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel)
        console.table(data);
};

/**
 * Muestra un arbol de atributos
 */
export function logDir(moduleName, requiredLevel, data) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel)
        console.dir(data);
};

export function _setupConsoleInterceptor() {
    if (DEBUG_CONFIG.global < DEBUG_LEVELS.DEEP) 
        return;
    
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    const SWIPER_WARNING_PATTERN = /Swiper Loop Warning/;
    const UNUSSED_PRELOAD_FILE = /was preloaded using link preload but not used/;
    const CHROME_VIOLATION = /Violation/;
    const CLEAR_CONSOLE_AVOIDED_PATTERN = /console\.clear\(\)/;

    console.warn = function(...args) {
        const message = args.join(' ');
        if (SWIPER_WARNING_PATTERN.test(message)) return;
        originalConsoleWarn.apply(console, args);
    };

    console.warn = function(...args) {
        const message = args.join(' ');
        if (UNUSSED_PRELOAD_FILE.test(message)) return;
        originalConsoleWarn.apply(console, args);
    };

    console.warn = function(...args) {
        const message = args.join(' ');
        if (CHROME_VIOLATION.test(message)) return;
        originalConsoleWarn.apply(console, args);
    };

    console.log = function(...args) {
        const message = args.join(' ');
        if (CLEAR_CONSOLE_AVOIDED_PATTERN.test(message)) return;
        originalConsoleLog.apply(console, args);
    };
}

// --- code/debug/debug.js ---