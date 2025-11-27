// --- code/render-mobile.js (REFRACTORIZADO A ES MODULE) ---

import * as debug from './debug.js';

// ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA MÓVIL ⭐️
/**
 * Genera el HTML para la vista móvil (lista vertical).
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _generateCardHTML_Mobile(items, itemsPerColumna) {
    // 'this' es la instancia de App
    let html = '';

    // En móvil, es una lista vertical simple.
    for (const nodo of items) {

        if (nodo.tipoEspecial === 'volver-vertical' || nodo.tipoEspecial === 'breadcrumb-vertical') {
            html += this._generarTarjetaHTML(nodo, true, false, nodo.tipoEspecial); // Método delegado
            continue;
        }

        const esRelleno = nodo.tipo === 'relleno';
        const estaActivo = esRelleno ? false : this._tieneContenidoActivo(nodo.id); // Método delegado

        html += this._generarTarjetaHTML(nodo, estaActivo, esRelleno); // Método delegado
    }

    if (this.DOM.track) {
         this.DOM.track.style.gridTemplateRows = '';
    }
    return html;
};

// ⭐️ 2. FUNCIÓN DE INICIALIZACIÓN MÓVIL (NO-OP para Swiper) ⭐️
/**
 * Destruye el carrusel si existe (no-op para inicialización).
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _initCarousel_Mobile() {
    // 'this' es la instancia de App
    debug.log('render_mobile', debug.DEBUG_LEVELS.BASIC, "Modo móvil activo. Swiper no inicializado.");
    // Llama al destructor real (método delegado)
    this._destroyCarousel(); 
};