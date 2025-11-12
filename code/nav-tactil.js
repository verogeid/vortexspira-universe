// --- code/nav-tactil.js ---
(function() {

    // ⭐️ 1. CONFIGURACIÓN DE LISTENERS TÁCTILES (SWIPER) ⭐️
    // DEBES llamar a esta función desde render-base.js DESPUÉS de inicializar Swiper
    App.setupTouchListeners = function() {
        const isMobile = window.innerWidth <= 768;

        if (!isMobile && this.STATE.carouselInstance) {
            // --- MODO ESCRITORIO: Engancharse a Swiper ---
            
            // Limpiar listener anterior para evitar duplicados
            if (this.STATE.carouselInstance._slideChangeHandler) {
                 this.STATE.carouselInstance.off('slideChangeTransitionEnd', this.STATE.carouselInstance._slideChangeHandler);
            }
            
            this.STATE.carouselInstance._slideChangeHandler = this.handleSlideChange.bind(this);
            
            // Escuchar CUANDO el slide HA TERMINADO de cambiar
            // Esto captura swipes táctiles Y las llamadas de teclado (slideNext/Prev)
            this.STATE.carouselInstance.on('slideChangeTransitionEnd', this.STATE.carouselInstance._slideChangeHandler);
            
            console.log("Listeners de Swiper (táctil) configurados.");
        }
    };

    // ⭐️ 2. MANEJADOR DEL CAMBIO DE SLIDE (TÁCTIL O TECLADO L/R) ⭐️
    // Esta es la función que ejecuta tu lógica de "preservar la fila"
    App.handleSlideChange = function(swiper) {
        
        // 1. Obtener la fila en la que estábamos
        // (this.STATE.currentFocusIndex todavía es el de ANTES del swipe)
        const { currentFocusIndex, itemsPorColumna } = this.STATE;
        
        // Calcular la fila (0, 1, 2) de la tarjeta que TENÍA el foco
        const targetRow = currentFocusIndex % itemsPorColumna;

        // 2. Obtener el nuevo slide activo (el elemento DOM)
        const activeSlideEl = swiper.slides[swiper.activeIndex];
        if (!activeSlideEl) return;

        // 3. Obtener las tarjetas DENTRO del nuevo slide
        // Incluimos rellenos (.card) para mantener la estructura de la columna
        const columnCards = Array.from(activeSlideEl.querySelectorAll('.card'));
        if (columnCards.length === 0) return;

        // 4. Encontrar la mejor tarjeta para enfocar usando el helper de nav-base.js
        const newFocusCard = App.findBestFocusInColumn(columnCards, targetRow);

        if (!newFocusCard) {
            // No se encontró nada focuseable en la columna
            return;
        }

        // 5. Encontrar el índice GLOBAL de esta nueva tarjeta
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newGlobalIndex = allCards.findIndex(card => card === newFocusCard);

        if (newGlobalIndex > -1) {
            // 6. Actualizar el estado y el foco
            this.STATE.currentFocusIndex = newGlobalIndex;
            // false = no deslizar (Swiper ya lo hizo)
            // true = forzar el .focus() del navegador
            this._updateFocus(true); 
        }
    };

})();
