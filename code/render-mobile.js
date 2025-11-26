// --- code/render-mobile.js ---
/* (Sin cambios, tal como lo proporcionaste) */
(function() {

    // ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA MÓVIL ⭐️
    App._generateCardHTML_Mobile = function(items, itemsPerColumna) {
        let html = '';

        // En móvil, es una lista vertical simple.
        for (const nodo of items) {

            if (nodo.tipoEspecial === 'volver-vertical') {
                html += App._generarTarjetaHTML(nodo, true, false, 'volver-vertical');
                continue;
            }

            const esRelleno = nodo.tipo === 'relleno'; // No debería haber, pero por si acaso
            const estaActivo = esRelleno ? false : App._tieneContenidoActivo(nodo.id);

            html += App._generarTarjetaHTML(nodo, estaActivo, esRelleno);
        }

        App.DOM.track.style.gridTemplateRows = '';
        return html;
    };

    // ⭐️ 2. FUNCIÓN DE INICIALIZACIÓN MÓVIL (NO-OP para Swiper) ⭐️
    App._initCarousel_Mobile = function() {
        // En móvil, el carrusel se destruye (en _destroyCarousel) y no se inicializa.
        log('render_mobile', DEBUG_LEVELS.BASIC, "Modo móvil activo. Swiper no inicializado.");
        // Llama al destructor real (definido en render-swipe.js)
        App._destroyCarousel(); 
    };

})();