// --- code/debug.js ---

export const IS_PRODUCTION = false;
export const CLEAR_CONSOLE_ON_START = true;

// Niveles de depuración estándar
export const DEBUG_LEVELS = {
    DISABLED: 0,  // No se muestra nada
    BASIC: 1,     // Muestra logs de eventos principales
    DEEP: 2,      // Muestra logs detallados (para depuración intensa)
    TELEMETHRY: 3 // Para mensajes que se enviarían a un servidor en producción
};

export const DEBUG_CONFIG = {
    global: DEBUG_LEVELS.BASIC,
    
    app: DEBUG_LEVELS.DISABLED,
    data: DEBUG_LEVELS.DISABLED,
    i18n: DEBUG_LEVELS.DISABLED,
    nav_stack: DEBUG_LEVELS.DISABLED,

    // Módulos de Detalle (Enfocados)
    nav_base: DEBUG_LEVELS.DISABLED,
    nav_base_details: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para el foco/blur después del slide ⭐️
    
    // Módulos de Teclado (Enfocados)
    nav_keyboard_base: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para ver el listener keydown global ⭐️
    nav_keyboard_details: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para la lógica de cursor en detalle ⭐️
    
    // Módulos Excluidos (Para evitar ruido)
    nav_keyboard_swipe: DEBUG_LEVELS.DISABLED, // Excluir menús
    nav_mouse_details: DEBUG_LEVELS.DISABLED, // Excluir rueda de ratón en detalle
    nav_mouse_swipe: DEBUG_LEVELS.DISABLED,   // Excluir arrastre en menús
    
    render_base: DEBUG_LEVELS.DISABLED,
    render_details: DEBUG_LEVELS.DISABLED, // ⭐️ DEEP: Para inicialización de Swiper de detalle ⭐️
    render_swipe: DEBUG_LEVELS.DISABLED
};

export function logClear() {
    if (CLEAR_CONSOLE_ON_START) {
        console.clear();
    }
};

/**
 * Función de intercepción de consola (Monkey-patching).
 * Debe llamarse antes de inicializar bibliotecas externas.
 */
export function setupConsoleInterceptor() {
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

// --- code/debug.js ---