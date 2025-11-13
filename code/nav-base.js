// --- code/nav-base.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS (Estáticos) ⭐️
    App.setupListeners = function() {
        // 1. Listener para "Volver" (MÓVIL)
        if (this.DOM.btnVolverNav) {
            this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
            this.DOM.btnVolverNav.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._handleVolverClick();
                }
            });
        }

        // 2. Listener para la Tarjeta Volver Fija (DESKTOP)
        if (this.DOM.cardVolverFija) {
            this.DOM.cardVolverFija.addEventListener('click', this._handleVolverClick.bind(this));
            this.DOM.cardVolverFija.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && this.DOM.cardVolverFija.tabIndex === 0) {
                    e.preventDefault();
                    this._handleVolverClick();
                }
            });
        }
    };

    // ⭐️ 2. LISTENER DE CLIC DEL TRACK (Dinámico) ⭐️
    App.setupTrackClickListener = function() {
        if (this.DOM.track) {
            // Limpiar listener anterior para evitar duplicados
            if (this.DOM.track._clickListener) {
                this.DOM.track.removeEventListener('click', this.DOM.track._clickListener);
            }
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);
        }
    };


    // ⭐️ 3. MANEJADORES DE EVENTOS ⭐️
    App._handleTrackClick = function(e) {
        const tarjeta = e.target.closest('[data-id]'); 
        if (!tarjeta) return;

        if (tarjeta.dataset.tipo === 'relleno' || tarjeta.classList.contains('disabled')) {
            return;
        }

        if (tarjeta.dataset.tipo === 'volver-vertical') {
            this._handleVolverClick();
            return;
        }

        const id = tarjeta.dataset.id;
        const tipo = tarjeta.dataset.tipo;

        // Sincronizar el foco al hacer clic
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newIndex = allCards.findIndex(c => c === tarjeta);
        if (newIndex > -1) {
            this.STATE.currentFocusIndex = newIndex;
            this._updateFocus(false); // Actualizar foco sin deslizar
        }

        // Actuar sobre la tarjeta
        this._handleCardClick(id, tipo);
    };

    App._handleCardClick = function(id, tipo) {
        if (tipo === 'categoria') {
            this.STATE.navStack.push(id);
            this.STATE.currentFocusIndex = 0; // Resetear foco al entrar
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    // ⭐️ 4. LÓGICA DE NAVEGACIÓN Y VISTAS ⭐️

    App._handleVolverClick = function() {
        // 1. Caso Detalle -> Navegación
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            
            // Re-renderizar la vista de navegación (para el modo correcto)
            this.renderNavegacion(); 

            // Forzar el foco de vuelta a la tarjeta que nos llevó al detalle
            const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
            const activeCard = allCards[this.STATE.currentFocusIndex] || this.DOM.track.querySelector('[tabindex="0"]');

            if (activeCard) {
                activeCard.focus();
            }
        } 
        // 2. Caso Sub-sección -> Nivel anterior
        else if (this.STATE.navStack.length > 0) {
            this.STATE.navStack.pop();
            this.STATE.currentFocusIndex = 0; // Resetear foco
            this.renderNavegacion();

            // Forzar el foco de vuelta al slider o tarjeta "Volver"
            const isMobile = window.innerWidth <= 600;
            const isTablet = window.innerWidth > 600 && window.innerWidth <= 768;
            if (!isMobile && !isTablet && this.DOM.cardVolverFija.tabIndex === 0) {
                this.DOM.cardVolverFija.focus();
            } else {
                const activeCard = this.DOM.track.querySelector('[tabindex="0"]');
                if (activeCard) activeCard.focus();
            }
        }
    };

    App._mostrarDetalle = function(cursoId) {
        const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
        if (!curso) return;

        let enlacesHtml = (curso.enlaces || []).map(enlace => 
        `<a href="${enlace.url || '#'}" class="enlace-curso" target="_blank" tabindex="0">${enlace.texto}</a>`
        ).join('');

        this.DOM.detalleContenido.innerHTML = `
        <h2>${curso.titulo}</h2>
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
        <div class="enlaces-curso">
            ${enlacesHtml || 'No hay enlaces para este curso.'}
        </div>
        `;

        // Determinar modo
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;
        const isTablet = screenWidth > 600 && screenWidth <= 768;

        // Ocultar la vista de navegación activa
        this.DOM.vistaNav.classList.remove('active');
        this.DOM.vistaDetalle.classList.add('active');

        let primerElementoFocuseable = null;

        if (!isMobile && !isTablet) { // Solo Desktop
            this.DOM.cardVolverFija.style.display = 'flex';
            this.DOM.cardVolverFija.tabIndex = 0;
            primerElementoFocuseable = this.DOM.cardVolverFija;
            this.DOM.infoAdicional.style.display = 'block'; 
        } else { // Móvil O Tablet
            this.DOM.btnVolverNav.style.display = 'block';
            this.DOM.btnVolverNav.tabIndex = 0; 
            primerElementoFocuseable = this.DOM.btnVolverNav;
        }

        if (primerElementoFocuseable) {
            primerElementoFocuseable.focus();
        }
    };

    // ⭐️ 5. FUNCIONES DE AYUDA (Helpers) ⭐️
    App._getFocusableDetailElements = function() {
        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= 600;
        const isTablet = screenWidth > 600 && screenWidth <= 768;
        
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('a.enlace-curso[tabindex="0"]'));
        let elements = [];

        if (!isMobile && !isTablet && this.DOM.cardVolverFija.tabIndex === 0) {
            elements.push(this.DOM.cardVolverFija);
        } else if ((isMobile || isTablet) && this.DOM.btnVolverNav.style.display === 'block') {
            elements.push(this.DOM.btnVolverNav);
        }

        elements.push(...detailLinks);
        return elements.filter(el => el && el.tabIndex !== -1);
    };
    
    // (Helper para nav-keyboard.js)
    App._changeFocusVertical = function(direction) { // -1 Arriba, 1 Abajo
        const { currentFocusIndex, itemsPorColumna } = App.STATE;
        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        let newIndex = currentFocusIndex + direction;

        const isMobile = window.innerWidth <= 600;
        if (!isMobile) {
            const currentCol = Math.floor(currentFocusIndex / itemsPorColumna);
            const newCol = Math.floor(newIndex / itemsPorColumna);
            if (newCol !== currentCol && (newIndex >= 0 && newIndex < allCards.length)) {
                return; 
            }
        }

        if (newIndex < 0) newIndex = allCards.length - 1;
        if (newIndex >= allCards.length) newIndex = 0;

        App.STATE.currentFocusIndex = newIndex;
        App._updateFocus(true);
    };

    // (Helper para nav-tactil.js)
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        const isFocusable = (card) => {
            return card && card.dataset.id && card.dataset.tipo !== 'relleno' && !card.classList.contains('disabled');
        };

        if (isFocusable(columnCards[targetRow])) {
            return columnCards[targetRow];
        }
        for (let i = targetRow - 1; i >= 0; i--) {
            if (isFocusable(columnCards[i])) {
                return columnCards[i];
            }
        }
        for (let i = targetRow + 1; i < columnCards.length; i++) {
            if (isFocusable(columnCards[i])) {
                return columnCards[i];
            }
        }
        return null;
    };

})();