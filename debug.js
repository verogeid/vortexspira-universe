// --- debug.js ---

// Define una función global para loggear mensajes en un elemento del DOM.
window.logDebug = function(message) {
    const consoleElement = document.getElementById('debug-console');
    if (consoleElement) {
        // Muestra solo el último mensaje
        consoleElement.textContent = `DEBUG: ${new Date().toLocaleTimeString()} - ${message}`;
        
        // También puedes usar la consola real del navegador si está abierta:
        console.log(`[DEBUG] ${message}`);
    }
}
