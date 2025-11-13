// --- code/nav-tactil.js ---
(function() {

    // ⭐️ 1. CONFIGURACIÓN DE LISTENERS TÁCTILES (SWIPER) ⭐️
    App.setupTouchListeners = function() {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;

        if (!isMobile && this.STATE.carouselInstance) {
            // --- MODO TABLET O DESKTOP ---
            
            // Limpiar listener anterior
            if (this.STATE.carouselInstance._slideChangeHandler) {
                this.STATE.carouselInstance.off('slideChangeTransitionEnd', this.STATE.carouselInstance._slideChangeHandler);
            }
            
            this.STATE.carouselInstance._slideChangeHandler = this.handleSlideChange.bind(this);
            
            // Escuchar CUANDO el slide HA TERMINADO de cambiar
            this.STATE.carouselInstance.on('slideChangeTransitionEnd', this.STATE.carouselInstance._slideChangeHandler);
            
            console.log("Listeners de Swiper (táctil) configurados.");

        } else {
            // --- MODO MÓVIL ---
            // No se necesita lógica de swipe.
        }
    };

    // ⭐️ 2. MANEJADOR DEL CAMBIO DE SLIDE (TÁCTIL O TECLADO L/R) ⭐️
    App.handleSlideChange = function(swiper) {
        
        // 1. Obtener la fila en la que estábamos
        const { currentFocusIndex, itemsPorColumna } = this.STATE;
        const targetRow = currentFocusIndex % itemsPorColumna;

        // 2. Obtener el nuevo slide activo
        const activeSlideEl = swiper.slides[swiper.activeIndex];
        if (!activeSlideEl) return;

        // 3. Obtener las tarjetas DENTRO del nuevo slide
        const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
        if (columnCards.length === 0) return;

        // 4. Encontrar la mejor tarjeta para enfocar (usando helper de nav-base)
        const newFocusCard = this.findBestFocusInColumn(columnCards, targetRow);

        if (!newFocusCard) {
            return;
        }

        // 5. Encontrar el índice GLOBAL de esta nueva tarjeta
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newGlobalIndex = allCards.findIndex(card => card === newFocusCard);

        if (newGlobalIndex > -1) {
            // 6. Actualizar el estado y el foco
            this.STATE.currentFocusIndex = newGlobalIndex;
            // true = forzar el .focus() del navegador
            this._updateFocus(true); 
        }
    };

})();