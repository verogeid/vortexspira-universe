// --- code/render-swipe.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML (Nombre genérico) ⭐️
    App._generateCardHTML_Carousel = function(items, itemsPerSlide) {
        let html = '';

        // 1. Añadir la columna de Relleno al PRINCIPIO
        let rellenoInicial = '';
        for (let k = 0; k < itemsPerSlide; k++) {
            rellenoInicial += App._generarTarjetaHTML({ tipo: 'relleno' }, false, true);
        }
        html += `<div class="swiper-slide"><div class="cards-column-group">${rellenoInicial}</div></div>`;


        // 2. Preparar datos con relleno (para el final)
        const totalItems = items.length;
        let totalSlotsDeseados = Math.ceil(totalItems / itemsPerSlide) * itemsPerSlide; 

        // Asegurar un mínimo de 2 slides de datos/relleno
        const minDataSlides = 2;
        if (totalSlotsDeseados < (minDataSlides * itemsPerSlide)) {
            totalSlotsDeseados = (minDataSlides * itemsPerSlide);
        }

        const itemsConRelleno = [...items];
        for (let i = totalItems; i < totalSlotsDeseados; i++) {
            itemsConRelleno.push({ nombre: '', id: `relleno-${i}`, tipo: 'relleno' });
        }

        // 3. Iterar para crear los slides
        for (let i = 0; i < itemsConRelleno.length; i += itemsPerSlide) {
            let slideContent = '';

            // Generar el contenido de la columna (2 o 3 tarjetas)
            for (let j = 0; j < itemsPerSlide; j++) {
                const item = itemsConRelleno[i + j];
                // Comprobar si el item existe antes de procesarlo
                if (item) {
                     if (item.tipo === 'relleno') {
                        slideContent += App._generarTarjetaHTML(item, false, true); 
                    } else {
                        const estaActivo = App._tieneContenidoActivo(item.id);
                        slideContent += App._generarTarjetaHTML(item, estaActivo, false);
                    }
                } else {
                    // Añadir una tarjeta de relleno si el item no existe (para completar la columna)
                    slideContent += App._generarTarjetaHTML({ tipo: 'relleno' }, false, true);
                }
            }
            html += `<div class="swiper-slide"><div class="cards-column-group">${slideContent}</div></div>`;
        }

        App.DOM.track.style.gridTemplateRows = '';
        return html;
    };


    // ⭐️ 2. INICIALIZACIÓN DE SWIPER (genérico) ⭐️
    App._initCarousel_Swipe = function(initialSwiperSlide, itemsPorColumna, isMobile, swiperId) {
        
        // No hacer nada si es móvil (doble chequeo)
        if (isMobile) {
            App._destroyCarousel();
            return;
        }

        // Destruir si ya existe una instancia (manejado en render-base, pero bueno tenerlo)
        if (App.STATE.carouselInstance) {
            App._destroyCarousel();
        }

        const swiperConfig = {
            direction: 'horizontal', 
            slidesPerView: 3, 
            slidesPerGroup: 1, 
            loop: true, 
            initialSlide: initialSwiperSlide + 1, // +1 por el relleno
            touchRatio: 1, 
            simulateTouch: true, // Para el modo escritorio en móvil
            centeredSlides: true,
            mousewheel: { sensitivity: 1 }, 
            keyboard: { enabled: false }, // Lo manejamos nosotros
            speed: 400,
        };

        // ⭐️ Usa el ID dinámico que le pasa render-base.js
        App.STATE.carouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);

        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.update(); 
            console.log(`Swiper inicializado en ${swiperId}. Slide inicial: ${initialSwiperSlide + 1}`);
        }
    };


    // ⭐️ 3. DESTRUCCIÓN DE SWIPER (Real) ⭐️
    App._destroyCarousel = function() {
        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.destroy(true, true);
            App.STATE.carouselInstance = null;
        }
    };

})();