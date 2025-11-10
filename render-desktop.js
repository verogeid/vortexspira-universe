// --- render-desktop.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA DESKTOP ⭐️
    App._generateCardHTML_Desktop = function(items, itemsPerSlide) {
        let html = '';

        // 1. Preparar datos con relleno para asegurar múltiplos de 3 (para el loop de Swiper)
        const totalItems = items.length;
        // Calcula el múltiplo de 3 más cercano (ej: 7 items -> 9 slots)
        const totalSlotsDeseados = Math.ceil(totalItems / itemsPerSlide) * itemsPerSlide; 
        const itemsConRelleno = [...items];

        for (let i = totalItems; i < totalSlotsDeseados; i++) {
            itemsConRelleno.push({ nombre: '', id: `relleno-${i}`, tipo: 'relleno' });
        }

        // 2. Iterar de 3 en 3 para crear los slides (grupos de columnas)
        for (let i = 0; i < itemsConRelleno.length; i += itemsPerSlide) {

            let slideContent = '';

            // Generar el contenido de la columna (3 tarjetas)
            for (let j = 0; j < itemsPerSlide; j++) {
                const item = itemsConRelleno[i + j];

                if (item.tipo === 'relleno') {
                    // Usa la función base para crear la tarjeta de relleno
                    slideContent += App._generarTarjetaHTML(item, false, true); 
                } else {
                    const estaActivo = App._tieneContenidoActivo(item.id);
                    // Usa la función base para crear la tarjeta normal
                    slideContent += App._generarTarjetaHTML(item, estaActivo, false);
                }
            }

            // 3. Envolver el contenido de la columna: Swiper-Slide > Grupo Columna > 3 Tarjetas
            html += `<div class="swiper-slide"><div class="cards-column-group">${slideContent}</div></div>`;
        }

        // Aseguramos que el track de desktop NO use grid.
        App.DOM.track.style.gridTemplateRows = '';

        return html;
    };


    // ⭐️ 2. INICIALIZACIÓN DE SWIPER (Lógica de Carrusel) ⭐️
    App._initCarousel = function(initialSwiperSlide, itemsPorColumna, isMobile) {
        if (isMobile) {
            App._destroyCarousel();
            return;
        }
        
        // Si ya existe, solo necesitamos actualizarlo (el update() lo hará después de la inicialización)
        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.update();
            return;
        }

        const swiperConfig = {
            direction: 'horizontal', 
            slidesPerView: 3, 
            slidesPerGroup: 1, 
            loop: true, 
            initialSlide: initialSwiperSlide,
            touchRatio: 1, 
            simulateTouch: true,
            centeredSlides: true,
            mousewheel: { 
                sensitivity: 1 
            }, 
            keyboard: { enabled: false }, 
            speed: 400,
            freeMode: false,
            autoHeight: false,
            scrollbar: false,
            watchSlidesProgress: true,

            navigation: {
                 nextEl: '.swiper-button-next',
                 prevEl: '.swiper-button-prev',
            },
        };

        App.STATE.carouselInstance = new Swiper(document.getElementById('nav-swiper'), swiperConfig);
        
        // ⭐️ FIX CRÍTICO: Forzar la actualización del layout inmediatamente después de la inicialización ⭐️
        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.update(); 
            console.log("Swiper inicializado y forzado a actualizar dimensiones.");
        }
    };


    // ⭐️ 3. DESTRUCCIÓN DE SWIPER ⭐️
    App._destroyCarousel = function() {
        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.destroy(true, true);
            App.STATE.carouselInstance = null;
        }
    };

})();
