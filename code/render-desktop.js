// --- code/render-desktop.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE GENERACIÓN DE HTML ESPECÍFICA PARA DESKTOP ⭐️
    App._generateCardHTML_Desktop = function(items, itemsPerSlide) {
        let html = '';
        
        // ⭐️ CORRECCIÓN CRÍTICA: Añadir una columna de Relleno al PRINCIPIO ⭐️
        let rellenoInicial = '';
        for (let k = 0; k < itemsPerSlide; k++) {
            rellenoInicial += App._generarTarjetaHTML({ tipo: 'relleno' }, false, true);
        }
        html += `<div class="swiper-slide"><div class="cards-column-group">${rellenoInicial}</div></div>`;


        // 1. Preparar datos con relleno (para el final)
        const totalItems = items.length;
        let totalSlotsDeseados = Math.ceil(totalItems / itemsPerSlide) * itemsPerSlide; 
        
        // Asegurar un mínimo de 2 slides de datos/relleno (además del slide inicial)
        const minDataSlides = 2;
        if (totalSlotsDeseados < (minDataSlides * itemsPerSlide)) {
            totalSlotsDeseados = (minDataSlides * itemsPerSlide);
        }

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
                    slideContent += App._generarTarjetaHTML(item, false, true); 
                } else {
                    const estaActivo = App._tieneContenidoActivo(item.id);
                    slideContent += App._generarTarjetaHTML(item, estaActivo, false);
                }
            }

            // 3. Envolver el contenido de la columna: Swiper-Slide > Grupo Columna > 3 Tarjetas
            html += `<div class="swiper-slide"><div class="cards-column-group">${slideContent}</div></div>`;
        }

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
        
        if (App.STATE.carouselInstance) {
            App.STATE.carouselInstance.update(); 
            
            // ⭐️ CORRECCIÓN CRÍTICA: Forzar el centrado en el primer slide de DATOS (índice 1) ⭐️
            App.STATE.carouselInstance.slideToLoop(1, 0); 
            
            console.log("Swiper inicializado, actualizado y centrado en el slide 1.");
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
