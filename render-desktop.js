// --- render-desktop.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA DESKTOP ⭐️
    App._generateCardHTML_Desktop = function(items, itemsPerSlide) {
        let html = '';

        // 1. Preparar datos con relleno
        const totalItems = items.length;
        
        // Calcula el múltiplo de 3 más cercano (ej: 7 items -> 9 slots)
        let totalSlotsDeseados = Math.ceil(totalItems / itemsPerSlide) * itemsPerSlide; 
        
        // ⭐️ CORRECCIÓN CRÍTICA: Asegurar un MÍNIMO de slides para Swiper ⭐️
        // Si usamos slidesPerView: 3 y loop: true, necesitamos MÍNIMO 3 slides (9 slots) 
        // para que funcione 'centeredSlides' y el loop.
        const minSlides = 3; 
        const minSlots = minSlides * itemsPerSlide; // 3 * 3 = 9

        if (totalSlotsDeseados < minSlots) {
            totalSlotsDeseados = minSlots; 
        }

        const itemsConRelleno = [...items];

        for (let i = totalItems; i < totalSlotsDeseados; i++) {
            itemsConRelleno.push({ nombre: '', id: `relleno-${i}`, tipo: 'relleno' });
        }

        // 2. Iterar de 3 en 3 para crear los slides (grupos de columnas)
        // Ahora, si hay 5 items, generará 9 slots (3 slides)
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
        
        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.update();
            return;
        }

        const swiperConfig = {
            direction: 'horizontal', 
            slidesPerView: 3, 
            slidesPerGroup: 1, 
            loop: true, 
            
            // ⭐️ CORRECCIÓN: initialSlide debe ser 0 para centrar la primera columna de datos ⭐️
            initialSlide: 0, 
            
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
