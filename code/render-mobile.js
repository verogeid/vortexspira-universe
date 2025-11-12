// --- code/render-mobile.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA MÓVIL ⭐️
    App._generateCardHTML_Mobile = function(items, itemsPorColumna) {
        let html = '';
        
        // En móvil, itemsPorColumna es 1 (una tarjeta por "fila" visual, o lineal).
        // No necesitamos relleno ni agrupación.

        for (const nodo of items) {
            
            if (nodo.tipoEspecial === 'volver-vertical') {
                // Tarjeta especial "Volver" (si existe en los datos)
                // Se renderiza como un <article> simple, sin swiper-slide.
                html += App._generarTarjetaHTML(nodo, true, false, 'volver-vertical');
                continue;
            }
            
            const esRelleno = nodo.tipo === 'relleno';
            const estaActivo = esRelleno ? false : App._tieneContenidoActivo(nodo.id);
            
            // Usa la función base para crear la tarjeta (<article> simple)
            // En móvil, no se pasa 'isSwiperSlide', que por defecto es false.
            html += App._generarTarjetaHTML(nodo, estaActivo, esRelleno);
        }

        // CRÍTICO: Aseguramos que el track móvil NO tenga reglas de Grid
        // Si usas Flexbox/Grid en el CSS para la vista móvil, el estilo en línea debe eliminarse.
        App.DOM.track.style.gridTemplateRows = '';

        return html;
    };


    // ⭐️ 2. DESTRUCCIÓN DE SWIPER (Para asegurar limpieza) ⭐️
    // Aunque ya está en render-base.js, la mantenemos aquí para claridad si solo cargas este.
    App._destroyCarousel = function() { 
        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.destroy(true, true);
            App.STATE.carouselInstance = null;
        }
        // En móvil, también es bueno limpiar el estilo del track si fuera necesario
        App.DOM.track.style.transform = '';
    };
    
    // ⭐️ 3. FUNCIÓN DE INICIALIZACIÓN MÓVIL (NO-OP para Swiper) ⭐️
    App._initCarousel = function() {
        // En móvil, el carrusel se destruye (en _destroyCarousel) y no se inicializa.
        // El comportamiento de "scroll" lo maneja App._updateFocus en render-base.js
        console.log("Modo móvil activo. Swiper no inicializado.");
        App._destroyCarousel();
    };


})();
