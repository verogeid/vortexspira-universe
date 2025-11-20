// --- code/nav-base.js ---
(function() {

    // ⭐️ 1. FUNCIÓN DE SETUP DE LISTENERS ⭐️
    App.setupListeners = function() {
        // Listener para el botón flotante (aunque esté oculto por CSS, lo mantenemos por seguridad)
        if (this.DOM.btnVolverNav) {
            this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
            this.DOM.btnVolverNav.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._handleVolverClick();
                }
            });
        }
        // Listener para la tarjeta "Volver" fija (Desktop/Tablet)
        if (this.DOM.cardVolverFijaElemento) { 
            this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
        }
    };

    // ⭐️ 2. LISTENERS DEL TRACK (Clic y Hover) ⭐️
    App.setupTrackPointerListeners = function() { 
        if (this.DOM.track) {
            if (this.DOM.track._clickListener) {
                this.DOM.track.removeEventListener('click', this.DOM.track._clickListener);
            }
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);

            if (this.DOM.track._mouseoverListener) {
                this.DOM.track.removeEventListener('mouseover', this.DOM.track._mouseoverListener);
            }
            this.DOM.track._mouseoverListener = this._handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
        }
    };

    // ⭐️ 3. MANEJADORES DE EVENTOS ⭐️

    /**
     * CLIC: Gestiona foco, animación y navegación (con corrección de race condition).
     */
    App._handleTrackClick = function(e) {
        const tarjeta = e.target.closest('[data-id]'); 
        if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;

        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newIndex = allCards.findIndex(c => c === tarjeta);
        
        if (newIndex === -1) return;

        // Capturar estado actual antes de actualizar
        const parentFocusIndex = this.STATE.currentFocusIndex;
        const indexChanged = newIndex !== parentFocusIndex;

        // Actualizar estado y UI (centrar)
        this.STATE.currentFocusIndex = newIndex;
        App.stackUpdateCurrentFocus(newIndex); 
        this._updateFocus(true); 

        // Comprobaciones de seguridad
        if (tarjeta.classList.contains('disabled')) return;
        if (tarjeta.dataset.tipo === 'volver-vertical') {
            this._handleVolverClick();
            return;
        }
        
        const id = tarjeta.dataset.id;
        const tipo = tarjeta.dataset.tipo;

        // ⭐️ CORRECCIÓN RACE CONDITION: Esperar animación si hubo cambio de índice
        const delay = indexChanged ? 300 : 0; 

        setTimeout(() => {
            this._handleCardClick(id, tipo, parentFocusIndex);
        }, delay);
    };

    /**
     * HOVER: Solo actualiza el foco visual.
     */
    App._handleTrackMouseOver = function(e) {
        const tarjeta = e.target.closest('[data-id]');
        if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;

        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        const newIndex = allCards.findIndex(c => c === tarjeta);

        if (newIndex > -1 && newIndex !== this.STATE.currentFocusIndex) {
            this._updateVisualFocus(newIndex);
        }
    };

    App._updateVisualFocus = function(newIndex) {
        const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));
        allCardsInTrack.forEach(card => {
            card.classList.remove('focus-visible');
            card.removeAttribute('aria-current');
        });
        if (App.DOM.cardVolverFijaElemento) { 
            App.DOM.cardVolverFijaElemento.classList.remove('focus-visible');
            App.DOM.cardVolverFijaElemento.removeAttribute('aria-current');
        }

        const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
        if (allCards.length === 0) return;

        let normalizedIndex = newIndex;
        if (normalizedIndex < 0) normalizedIndex = 0;
        if (normalizedIndex >= allCards.length) normalizedIndex = allCards.length - 1;
        
        const nextFocusedCard = allCards[normalizedIndex];
        this.STATE.currentFocusIndex = normalizedIndex;

        App.stackUpdateCurrentFocus(normalizedIndex);

        if (nextFocusedCard) {
            nextFocusedCard.classList.add('focus-visible');
            nextFocusedCard.setAttribute('aria-current', 'true');
        }
    };

    /**
     * Navegación real (push al stack o mostrar detalle).
     */
    App._handleCardClick = function(id, tipo, parentFocusIndex) {
        // Si viene del teclado (parentFocusIndex undefined), usa el actual
        const focusParaGuardar = (parentFocusIndex !== undefined) ? parentFocusIndex : this.STATE.currentFocusIndex;

        if (tipo === 'categoria') {
            App.stackPush(id, focusParaGuardar);
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    // ⭐️ 4. LÓGICA DE NAVEGACIÓN Y VISTAS ⭐️

    App._handleVolverClick = function() {
        // Caso 1: Salir de Detalle
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
            this.renderNavegacion(); 
        } 
        // Caso 2: Subir de Nivel
        else if (App.STATE.historyStack.length > 1) { 
            App.stackPop(); 
            this.renderNavegacion();

            // Gestión de foco al volver
            const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
            const isTablet = window.innerWidth >= TABLET_MIN_WIDTH && window.innerWidth <= TABLET_MAX_WIDTH;
            
            if (!isMobile && !isTablet && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
                this.DOM.cardVolverFijaElemento.focus();
            } else if (isMobile || isTablet) {
                const firstCard = this.DOM.track.querySelector('[data-id]:not([data-tipo="relleno"])');
                if (firstCard) firstCard.focus();
            }
        }
    };

    /**
     * ⭐️ MUESTRA EL DETALLE DEL CURSO ⭐️
     * Genera la lista compacta de acciones y gestiona iconos mixtos (Texto/CSS).
     */
    App._mostrarDetalle = function(cursoId) {
        const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
        if (!curso) return;

        // Helper para decidir el icono (HTML String)
        const getIconHtml = (text) => {
            const lower = text.toLowerCase();
            
            // 1. Carrito: Usamos carácter de texto
            if (!lower.includes('freemium')) {
                return '🛒&#xFE0E;'; 
            }
            
            // 2. Descarga/Enlace: Usamos <i> con clase CSS Mask
            let iconClass = 'icon-link'; // Default
            if (lower.includes('freemium')) {
                iconClass = 'icon-download';
            }
            return `<i class="action-icon ${iconClass}"></i>`; 
        };

        // Generar HTML de la lista
        let enlacesHtml = '';
        if (curso.enlaces && curso.enlaces.length > 0) {
            const itemsHtml = curso.enlaces.map(enlace => {
                const iconHtml = getIconHtml(enlace.texto);
                
                const isDisabled = !enlace.url || enlace.url === '#';
                const hrefAttr = isDisabled ? '' : `href="${enlace.url}"`;
                const classDisabled = isDisabled ? 'disabled' : '';
                const tabIndex = isDisabled ? '-1' : '0';
                const targetAttr = isDisabled ? '' : 'target="_blank"';

                return `
                    <div class="detail-action-item">
                        <span class="detail-action-text ${classDisabled}">${enlace.texto}</span>
                        <a ${hrefAttr} 
                        class="detail-action-btn ${classDisabled}" 
                        ${targetAttr} 
                        tabindex="${tabIndex}" 
                        aria-label="${enlace.texto}">
                        ${iconHtml}
                        </a>
                    </div>`;
            }).join('');
            
            enlacesHtml = `<div class="detail-actions-list">${itemsHtml}</div>`;
        }

        // Inyección de botón volver para MÓVIL
        const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
        let mobileBackHtml = '';
        if (isMobile) {
            mobileBackHtml = `
                <div class="mobile-back-header" style="margin-bottom: 20px;">
                    <button class="detail-action-btn" style="width: auto; padding: 0 15px; border-radius: 20px;" onclick="App._handleVolverClick()">
                        ${LOGO_VOLVER} Volver
                    </button>
                </div>
            `;
        }

        // Renderizar contenido
        this.DOM.detalleContenido.innerHTML = `
            ${mobileBackHtml}
            <h2>${curso.titulo}</h2>
            <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
            ${enlacesHtml || '<p>No hay acciones disponibles para este curso.</p>'}
        `;

        // Configuración de Vistas
        const screenWidth = window.innerWidth;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

        this.DOM.vistaNav.classList.remove('active');
        this.DOM.vistaDetalle.classList.add('active');

        let primerElementoFocuseable = null;

        if (!isMobile) { 
            // --- Desktop y Tablet ---
            
            // Columna Derecha (Info): Solo visible en Desktop
            if (isTablet) {
                this.DOM.infoAdicional.classList.remove('visible');
            } else {
                this.DOM.infoAdicional.classList.add('visible'); 
            }
            
            // Columna Izquierda (Volver): Visible en ambos
            this.DOM.cardVolverFija.classList.add('visible'); 
            this.DOM.cardNivelActual.classList.remove('visible'); 
            
            this.DOM.cardVolverFijaElemento.classList.add('visible');
            this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${LOGO_VOLVER}</h3>`; 
            this.DOM.cardVolverFijaElemento.tabIndex = 0;
            primerElementoFocuseable = this.DOM.cardVolverFijaElemento;

        } else { 
            // --- Móvil ---
            this.DOM.infoAdicional.classList.remove('visible');
            this.DOM.cardVolverFija.classList.remove('visible');
            
            // Foco al primer botón disponible (Volver o Acción)
            const firstBtn = this.DOM.detalleContenido.querySelector('button, .detail-action-btn:not(.disabled)');
            primerElementoFocuseable = firstBtn; 
        }

        if (primerElementoFocuseable) {
            primerElementoFocuseable.focus();
        }
    };

    // ⭐️ 5. HELPERS ⭐️
    
    App._getFocusableDetailElements = function() {
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('button, .detail-action-btn:not(.disabled)'));
        let elements = [];
        const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
        
        // En Tablet/Desktop incluimos el botón izquierdo
        if (!isMobile && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
            elements.push(this.DOM.cardVolverFijaElemento);
        } 
        
        elements.push(...detailLinks);
        return elements.filter(el => el && el.tabIndex !== -1);
    };
    
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        const isFocusable = (card) => { return card && card.dataset.id && card.dataset.tipo !== 'relleno'; };
        if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
        for (let i = targetRow - 1; i >= 0; i--) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        for (let i = targetRow + 1; i < columnCards.length; i++) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        return null;
    };

})();