// --- code/nav-tactil.js ---
(function() {

    // Almacena la dirección del swipe
    let _swipeDirection = 'next';

    // ⭐️ 1. CONFIGURACIÓN DE LISTENERS TÁCTILES (SWIPER) ⭐️
    App.setupTouchListeners = function() {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;

        if (!isMobile && this.STATE.carouselInstance) {
            const swiper = this.STATE.carouselInstance;

            // --- Limpiar listeners antiguos ---
            if (swiper._slideChangeStartHandler) {
                 swiper.off('slideChangeTransitionStart', swiper._slideChangeStartHandler);
            }
            if (swiper._slideChangeEndHandler) {
                 swiper.off('slideChangeTransitionEnd', swiper._slideChangeEndHandler);
            }
            
            // --- Guardar handlers para poder limpiarlos ---
            swiper._slideChangeStartHandler = this.handleSlideChangeStart.bind(this);
            swiper._slideChangeEndHandler = this.handleSlideChangeEnd.bind(this);
            
            // ⭐️ Escuchar DOS eventos ⭐️
            swiper.on('slideChangeTransitionStart', swiper._slideChangeStartHandler);
            swiper.on('slideChangeTransitionEnd', swiper._slideChangeEndHandler);
            
            console.log("Listeners de Swiper (táctil) configurados.");
        }
    };

    // ⭐️ 2. HANDLER: Detectar la dirección del swipe ⭐️
    App.handleSlideChangeStart = function(swiper) {
        // No hacer nada si el teclado inició esto
        if (App.STATE.keyboardNavInProgress) return;

        // Determinar dirección
        if (swiper.activeIndex === swiper.previousIndex) return;
        _swipeDirection = swiper.activeIndex > swiper.previousIndex ? 'next' : 'prev';

        // Manejar el salto del loop
        if (swiper.previousIndex === swiper.slides.length - 1 && swiper.activeIndex === 0) {
            _swipeDirection = 'next';
        }
        if (swiper.previousIndex === 0 && swiper.activeIndex === swiper.slides.length - 1) {
            _swipeDirection = 'prev';
        }
    };


    // ⭐️ 3. HANDLER: Comprobar contenido y saltar si está vacío ⭐️
    App.handleSlideChangeEnd = function(swiper) {
        
        // ❗️ 1. COMPROBAR LA BANDERA DEL TECLADO ❗️
        if (App.STATE.keyboardNavInProgress) {
            // Este slide fue iniciado por el teclado.
            // El foco ya está donde debe. Solo limpiamos la bandera.
            App.STATE.keyboardNavInProgress = false;
            return;
        }

        // --- El resto es la lógica de SWIPE TÁCTIL ---
        
        const { currentFocusIndex, itemsPorColumna } = this.STATE;
        const targetRow = currentFocusIndex % itemsPorColumna;

        const activeSlideEl = swiper.slides[swiper.activeIndex];
        if (!activeSlideEl) return;

        const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
        if (columnCards.length === 0) return;

        const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);


        // ⭐️ 2. LÓGICA DE SALTO (SI ESTÁ VACÍO) ⭐️
        if (!newFocusCard) {
            console.warn("Columna vacía, saltando a la siguiente...");
            if (_swipeDirection === 'next') {
                swiper.slideNext(200); // Salto rápido
            } else {
                swiper.slidePrev(200); // Salto rápido
            }
            return; 
        }

        // 3. Encontrar el índice GLOBAL de esta nueva tarjeta
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newGlobalIndex = allCards.findIndex(card => card === newFocusCard);

        if (newGlobalIndex > -1) {
            // 4. Actualizar el estado y el foco
            this.STATE.currentFocusIndex = newGlobalIndex;
            this._updateFocus(true); 
        }
    };

})();