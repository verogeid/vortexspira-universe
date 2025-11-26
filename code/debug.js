// code/debug.js

// Niveles de depuración estándar
const DEBUG_LEVELS = {
    DISABLED: 0,  // No se muestra nada
    BASIC: 1,     // Muestra logs de eventos principales
    DEEP: 2,      // Muestra logs detallados (para depuración intensa)
    TELEMETHRY: 3 // Para mensajes que se enviarían a un servidor en producción
};

const DEBUG_CONFIG = {
    app: DEBUG_LEVELS.DISABLED,
    data: DEBUG_LEVELS.DISABLED,
    i18n: DEBUG_LEVELS.DISABLED,
    nav_base: DEBUG_LEVELS.DISABLED,
    nav_keyboard: DEBUG_LEVELS.DISABLED,
    nav_tactil: DEBUG_LEVELS.DISABLED,
    nav_stack: DEBUG_LEVELS.DISABLED,
    render_base: DEBUG_LEVELS.DISABLED,
    render_swipe: DEBUG_LEVELS.DISABLED,
    render_mobile: DEBUG_LEVELS.DISABLED,
    global: DEBUG_LEVELS.DEEP
};

/**
 * Función de logging centralizada.
 * @param {string} moduleName - El nombre del módulo que llama (ej. 'app', 'ui').
 * @param {number} requiredLevel - El nivel de importancia de este mensaje (ej. DEBUG_LEVELS.DEEP).
 * @param {...any} args - Los mensajes o objetos a mostrar, igual que en console.log.
 */
function log(moduleName, requiredLevel, ...args) {
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
function logWarn(moduleName, ...args) {
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
function logError(moduleName, ...args) {
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
function logGroupCollapsed(moduleName, requiredLevel, ...args) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        console.groupCollapsed(`[${moduleName}]`, ...args);
    }
}

/**
 * Cierra el grupo actual en la consola.
 * @param {string} moduleName - El nombre del módulo.
 * @param {number} requiredLevel - El nivel de importancia debe coincidir con el del grupo que abrió.
 */
function logGroupEnd(moduleName, requiredLevel) {
    if (DEBUG_CONFIG[moduleName] >= requiredLevel && !IS_PRODUCTION) {
        console.groupEnd();
    }
}