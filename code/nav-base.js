// --- code/nav-base.js ---

(function() {

    // Almacena el modo actual
    let _lastMode = 'desktop'; 

    // ⭐️ 1. SETUP LISTENERS ⭐️
    App.setupListeners = function() {
      if (this.DOM.btnVolverNav) {
          this.DOM.btnVolverNav.addEventListener('click', this._handleVolverClick.bind(this));
          this.DOM.btnVolverNav.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._handleVolverClick(); }
          });
      }
      if (this.DOM.cardVolverFijaElemento) { 
          this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
      }
    };

    // ⭐️ HELPER: Clic en fila (Solo foco, no acción) ⭐️
    App._handleActionRowClick = function(e) {
        if (!e.target.closest('.detail-action-btn')) {
            const btn = e.currentTarget.querySelector('.detail-action-btn');
            if (btn && !btn.classList.contains('disabled')) {
                btn.focus(); 
            }
        }
    };

    // ⭐️ 2. POINTER LISTENERS ⭐️
    App.setupTrackPointerListeners = function() { 
        if (this.DOM.track) {
            if (this.DOM.track._clickListener) { this.DOM.track.removeEventListener('click', this.DOM.track._clickListener); }
            this.DOM.track._clickListener = this._handleTrackClick.bind(this);
            this.DOM.track.addEventListener('click', this.DOM.track._clickListener);

            if (this.DOM.track._mouseoverListener) { this.DOM.track.removeEventListener('mouseover', this.DOM.track._mouseoverListener); }
            this.DOM.track._mouseoverListener = this._handleTrackMouseOver.bind(this);
            this.DOM.track.addEventListener('mouseover', this.DOM.track._mouseoverListener);
        }
    };

    // ⭐️ 3. RENDERIZADO PRINCIPAL ⭐️
    App.renderNavegacion = function() {
        if (!this.STATE.fullData) {
            logError('navBase', "No se puede renderizar: Datos no cargados.");
            return;
        }

        const currentLevelState = App.stackGetCurrent();
        if (!currentLevelState) return;

        const currentLevelId = currentLevelState.levelId;
        const isSubLevel = !!currentLevelId;
        this.STATE.currentFocusIndex = currentLevelState.focusIndex;

        const screenWidth = window.innerWidth;
        const isMobile = screenWidth <= MOBILE_MAX_WIDTH;
        const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

        let renderHtmlFn;
        let initCarouselFn;
        let calculatedItemsPerColumn;
        let swiperId = null;
        
        if (isMobile) {
            renderHtmlFn = App._generateCardHTML_Mobile;
            initCarouselFn = App._initCarousel_Mobile; 
            calculatedItemsPerColumn = 1;
        } else {
            renderHtmlFn = App._generateCardHTML_Carousel;
            initCarouselFn = App._initCarousel_Swipe; 
            if (isTablet) {
                calculatedItemsPerColumn = 2; 
                swiperId = '#nav-swiper-tablet';
            } else {
                calculatedItemsPerColumn = 3; 
                swiperId = '#nav-swiper';
            }
        }
        this.STATE.itemsPorColumna = calculatedItemsPerColumn;

        const desktopView = document.getElementById('vista-navegacion-desktop');
        const tabletView = document.getElementById('vista-navegacion-tablet');
        const mobileView = document.getElementById('vista-navegacion-mobile');
        
        if (isMobile) {
            this.DOM.vistaNav = mobileView;
            this.DOM.track = document.getElementById('track-mobile');
        } else if (isTablet) {
            this.DOM.vistaNav = tabletView;
            this.DOM.track = document.getElementById('track-tablet');
        } else {
            this.DOM.vistaNav = desktopView;
            this.DOM.track = document.getElementById('track-desktop');
        }

        const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion);
        let itemsDelNivel = [];

        if (!isSubLevel) {
            itemsDelNivel = this.STATE.fullData.navegacion;
        } else if (nodoActual) {
            itemsDelNivel = (nodoActual.subsecciones || []).concat(nodoActual.cursos || []);
        } else { 
            App.stackPop(); 
            this.renderNavegacion();
            return;
        }
        
        if (isMobile) {
            if (isSubLevel) {
                itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
            }
            
            let breadcrumbText = 'Nivel Raíz';
            if (isSubLevel && nodoActual) {
                breadcrumbText = nodoActual.nombre || nodoActual.titulo || 'Nivel';
            } else if (typeof App.getString === 'function') {
                breadcrumbText = App.getString('breadcrumbRoot') || 'Nivel Raíz';
            }
            
            itemsDelNivel = [{ 
                id: 'breadcrumb-nav', 
                tipoEspecial: 'breadcrumb-vertical', 
                texto: breadcrumbText 
            }].concat(itemsDelNivel);
        }

        App._destroyCarousel(); 
        let htmlContent = renderHtmlFn(itemsDelNivel, this.STATE.itemsPorColumna);
        this.DOM.track.innerHTML = htmlContent;

        let initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        initCarouselFn(initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId);

        if (typeof this.setupTrackPointerListeners === 'function') {
            this.setupTrackPointerListeners();
        }
        
        // ⭐️ CORRECCIÓN: Pasar argumentos en orden correcto ⭐️
        this._updateNavViews(isSubLevel, isMobile, isTablet, nodoActual); 
        
        if (typeof this._updateVisualFocus === 'function') {
             this._updateVisualFocus(this.STATE.currentFocusIndex);
        } else {
            this._updateFocus(false); 
        }

        desktopView.classList.remove('active');
        tabletView.classList.remove('active');
        mobileView.classList.remove('active');
        
        // ⭐️ CORRECCIÓN DEEP LINK: Solo activar vistaNav si NO estamos en detalle ⭐️
        if (!this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaNav.classList.add('active'); 
        }

        if (!this.STATE.resizeObserver) {
            this._setupResizeObserver();
        }
    };

    // ⭐️ 4. HANDLERS EVENTOS ⭐️
    App._handleTrackClick = function(e) {
      const tarjeta = e.target.closest('[data-id]'); 
      if (!tarjeta || tarjeta.dataset.tipo === 'relleno') return;

      const allCards = Array.from(this.DOM.track.querySelectorAll('[data-id]:not([data-tipo="relleno"])'));
      const newIndex = allCards.findIndex(c => c === tarjeta);
      
      if (newIndex === -1) return;

      const parentFocusIndex = this.STATE.currentFocusIndex;
      const indexChanged = newIndex !== parentFocusIndex;

      this.STATE.currentFocusIndex = newIndex;
      App.stackUpdateCurrentFocus(newIndex); 
      this._updateFocus(true); 

      if (tarjeta.classList.contains('disabled')) return;
      if (tarjeta.dataset.tipo === 'volver-vertical') {
          this._handleVolverClick();
          return;
      }
      
      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;
      const delay = indexChanged ? 300 : 0; 

      setTimeout(() => {
          this._handleCardClick(id, tipo, parentFocusIndex);
      }, delay);
    };

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

    App._handleCardClick = function(id, tipo, parentFocusIndex) {
        const focusParaGuardar = (parentFocusIndex !== undefined) ? parentFocusIndex : this.STATE.currentFocusIndex;
        if (tipo === 'categoria') {
            App.stackPush(id, focusParaGuardar);
            this.renderNavegacion();
        } else if (tipo === 'curso') {
            this._mostrarDetalle(id);
        }
    };

    App._handleVolverClick = function() {
        if (this.DOM.vistaDetalle.classList.contains('active')) {
            this.DOM.vistaDetalle.classList.remove('active');
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
            this.renderNavegacion(); 
        } 
        else if (App.STATE.historyStack.length > 1) { 
            App.stackPop(); 
            this.renderNavegacion();
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

    // ⭐️ 5. GENERADOR TARJETAS ⭐️
    App._generarTarjetaHTML = function(nodo, estaActivo, esRelleno = false, tipoEspecialArg = null) {
        const wrapperTag = 'article';
        const tipoEspecial = tipoEspecialArg || nodo.tipoEspecial;

        if (esRelleno) {
            return `<article class="card card--relleno" data-tipo="relleno" tabindex="-1" aria-hidden="true"></article>`;
        }

        if (tipoEspecial === 'breadcrumb-vertical') {
             return `
                <${wrapperTag} class="card card-breadcrumb-vertical" 
                    data-id="breadcrumb-nav" 
                    data-tipo="relleno" 
                    tabindex="-1"
                    aria-hidden="true">
                    <h3>${nodo.texto}</h3>
                </${wrapperTag}>
            `;
        }

        if (tipoEspecial === 'volver-vertical') {
            return `
                <${wrapperTag} class="card card-volver-vertical" 
                    data-id="volver-nav" 
                    data-tipo="volver-vertical" 
                    role="button" 
                    tabindex="-1"
                    aria-label="${App.getString('ariaBackLevel')}">
                    <h3>${LOGO_VOLVER}</h3>
                </${wrapperTag}>
            `;
        }

        const isCourse = !!nodo.titulo;
        const tipo = isCourse ? 'curso' : 'categoria';
        const tipoData = `data-tipo="${tipo}"`;
        const claseDisabled = estaActivo ? '' : 'disabled';
        const tagAriaDisabled = estaActivo ? '' : 'aria-disabled="true"';
        const tabindex = '-1'; 
        
        let displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';
        if (tipo === 'categoria') {
            if (!estaActivo) {
                displayTitle = LOGO_OBRAS + ' ' + displayTitle;
            } else {
                displayTitle = LOGO_CARPETA + ' ' + displayTitle;
            }
        } else {
            displayTitle = LOGO_CURSO + ' ' + displayTitle; 
        }
        
        const ariaLabel = `${tipo === 'curso' ? 'Curso' : 'Categoría'}: ${nodo.nombre || nodo.titulo || 'Sin Título'}. ${estaActivo ? 'Seleccionar para entrar.' : 'Contenido no disponible.'}`;

        return `
            <${wrapperTag} class="card ${claseDisabled}" 
                data-id="${nodo.id}" 
                ${tipoData}
                role="button" 
                tabindex="${tabindex}" 
                ${tagAriaDisabled}
                aria-label="${ariaLabel}">
                <h3>${displayTitle}</h3>
            </${wrapperTag}>
        `;
    };

    /**
     * ⭐️ MUESTRA DETALLE DEL CURSO ⭐️
     */
    App._mostrarDetalle = function(cursoId) {
      const curso = App._findNodoById(cursoId, App.STATE.fullData.navegacion);
      if (!curso) return;

      // Scroll Reset
      window.scrollTo(0, 0);
      if (this.DOM.vistaDetalle) this.DOM.vistaDetalle.scrollTop = 0;
      if (this.DOM.detalleContenido) this.DOM.detalleContenido.scrollTop = 0;

      const getIconHtml = (text) => {
          const lower = text.toLowerCase();
          if (lower.includes('adquirir') || lower.includes('comprar')) { return '🛒&#xFE0E;'; }
          let iconClass = 'icon-link'; 
          if (lower.includes('instalar') || lower.includes('descargar') || lower.includes('pwa')) { iconClass = 'icon-download'; }
          return `<i class="action-icon ${iconClass}"></i>`; 
      };

      let enlacesHtml = '';
      if (curso.enlaces && curso.enlaces.length > 0) {
          const itemsHtml = curso.enlaces.map(enlace => {
              const iconHtml = getIconHtml(enlace.texto);
              const isDisabled = !enlace.url || enlace.url === '#';
              const hrefAttr = isDisabled ? '' : `href="${enlace.url}"`;
              
              // ⭐️ CORRECCIÓN: Clase disabled solo al botón ⭐️
              const classDisabledBtn = isDisabled ? 'disabled' : '';
              const classDisabledText = ''; // Texto siempre normal
              
              // ⭐️ Foco habilitado en disabled ⭐️
              const tabIndex = '0'; 
              const targetAttr = isDisabled ? '' : 'target="_blank"';
              const onclickAttr = isDisabled ? 'onclick="return false;"' : '';

              // ⭐️ Clic en div solo hace focus ⭐️
              return `
                <div class="detail-action-item" onclick="App._handleActionRowClick(event)" style="cursor: pointer;">
                    <span class="detail-action-text ${classDisabledText}">${enlace.texto}</span>
                    <a ${hrefAttr} 
                       class="detail-action-btn ${classDisabledBtn}" 
                       ${targetAttr} 
                       tabindex="${tabIndex}" 
                       ${onclickAttr}
                       aria-label="${enlace.texto} ${isDisabled ? '(No disponible)' : ''}">
                       ${iconHtml}
                    </a>
                </div>`;
          }).join('');
          enlacesHtml = `<div class="detail-actions-list">${itemsHtml}</div>`;
      }

      const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
      let mobileBackHtml = '';
      
      if (isMobile) {
          mobileBackHtml = `
            <div class="mobile-back-header" style="margin-bottom: 20px;">
                <article class="card card-volver-vertical" 
                         role="button" 
                         tabindex="0" 
                         onclick="App._handleVolverClick()"
                         aria-label="Volver">
                    <h3>${LOGO_VOLVER} Volver</h3>
                </article>
            </div>
          `;
      }

      const titleHtml = `<h2 tabindex="0" style="outline:none;">${curso.titulo}</h2>`;

      this.DOM.detalleContenido.innerHTML = `
        ${mobileBackHtml}
        ${titleHtml}
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
        ${enlacesHtml || '<p>No hay acciones disponibles para este curso.</p>'}
      `;

      const screenWidth = window.innerWidth;
      const isTablet = screenWidth >= TABLET_MIN_WIDTH && screenWidth <= TABLET_MAX_WIDTH;

      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');

      let primerElementoFocuseable = null;

      if (!isMobile) { 
          if (isTablet) {
              this.DOM.infoAdicional.classList.remove('visible');
          } else {
              this.DOM.infoAdicional.classList.add('visible'); 
          }
          
          this.DOM.cardVolverFija.classList.add('visible'); 
          this.DOM.cardNivelActual.classList.remove('visible'); 
          
          this.DOM.cardVolverFijaElemento.classList.add('visible');
          this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${LOGO_VOLVER}</h3>`; 
          this.DOM.cardVolverFijaElemento.tabIndex = 0;
          primerElementoFocuseable = this.DOM.cardVolverFijaElemento;

      } else { 
          this.DOM.infoAdicional.classList.remove('visible');
          this.DOM.cardVolverFija.classList.remove('visible');
          
          const firstInteractive = this.DOM.detalleContenido.querySelector('.card, button, .detail-action-btn');
          primerElementoFocuseable = firstInteractive; 
      }

      if (primerElementoFocuseable) {
          primerElementoFocuseable.focus();
      }
    };

    // ⭐️ 6. HELPERS ⭐️
    App._getFocusableDetailElements = function() {
        const detailLinks = Array.from(this.DOM.detalleContenido.querySelectorAll('.card, button, h2, .detail-action-btn'));
        let elements = [];
        const isMobile = window.innerWidth <= MOBILE_MAX_WIDTH;
        
        if (!isMobile && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
            elements.push(this.DOM.cardVolverFijaElemento);
        } 
        elements.push(...detailLinks);
        return elements;
    };
    
    App.findBestFocusInColumn = function(columnCards, targetRow) {
        const isFocusable = (card) => { return card && card.dataset.id && card.dataset.tipo !== 'relleno'; };
        if (isFocusable(columnCards[targetRow])) return columnCards[targetRow];
        for (let i = targetRow - 1; i >= 0; i--) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        for (let i = targetRow + 1; i < columnCards.length; i++) { if (isFocusable(columnCards[i])) return columnCards[i]; }
        return null;
    };

    App._generateCardHTML_Carousel = App._generateCardHTML_Carousel || function() { return ""; };
    App._generateCardHTML_Mobile = App._generateCardHTML_Mobile || function() { return ""; };
    App._initCarousel_Swipe = App._initCarousel_Swipe || function() { };
    App._initCarousel_Mobile = App._initCarousel_Mobile || function() { };
    App._destroyCarousel = App._destroyCarousel || function() { };

    // ⭐️ 7. GESTIÓN DE VISTAS ⭐️
    App._updateNavViews = function(isSubLevel, isMobile, isTablet, nodoActual) {
        if (isMobile) { 
            this.DOM.cardVolverFija.classList.remove('visible'); 
            this.DOM.infoAdicional.classList.remove('visible'); 
            this.DOM.btnVolverNav.classList.remove('visible');
            this.DOM.btnVolverNav.tabIndex = -1;
        } else { 
            if (isTablet) {
                this.DOM.infoAdicional.classList.remove('visible');
            } else {
                this.DOM.infoAdicional.classList.add('visible'); 
            }

            this.DOM.btnVolverNav.classList.remove('visible'); 
            this.DOM.btnVolverNav.tabIndex = -1;
            
            this.DOM.cardVolverFija.classList.add('visible'); 
            this.DOM.cardNivelActual.classList.add('visible');
            
            if (isSubLevel) {
                // ⭐️ CORRECCIÓN: Prevención de error si nodoActual es null
                const nombreNivel = nodoActual ? (nodoActual.nombre || nodoActual.titulo || 'Nivel') : 'Nivel';
                this.DOM.cardNivelActual.innerHTML = `<h3>${nombreNivel}</h3>`;
            } else {
                this.DOM.cardNivelActual.innerHTML = `<h3>${App.getString('breadcrumbRoot')}</h3>`;
            }
            
            if (isSubLevel) {
                this.DOM.cardVolverFijaElemento.classList.add('visible'); 
                this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${LOGO_VOLVER}</h3>`; 
                this.DOM.cardVolverFijaElemento.tabIndex = 0;
            } else {
                this.DOM.cardVolverFijaElemento.classList.remove('visible'); 
                this.DOM.cardVolverFijaElemento.innerHTML = ''; 
                this.DOM.cardVolverFijaElemento.tabIndex = -1;
            }
        }
    };

    App._setupResizeObserver = function() {
        const getMode = (width) => {
            if (width <= MOBILE_MAX_WIDTH) return 'mobile';
            if (width <= TABLET_MAX_WIDTH) return 'tablet';
            return 'desktop';
        };
        _lastMode = getMode(window.innerWidth);
        this.STATE.resizeObserver = new ResizeObserver(() => {
            const newMode = getMode(window.innerWidth);
            if (newMode !== _lastMode && this.STATE.initialRenderComplete) {
                const isSubLevel = (App.stackGetCurrent() && App.stackGetCurrent().levelId);
                const lastWasMobile = (_lastMode === 'mobile');
                const newIsMobile = (newMode === 'mobile');
                let focusDelta = 0;
                if (isSubLevel) {
                    if (lastWasMobile && !newIsMobile) focusDelta = -2; 
                    else if (!lastWasMobile && newIsMobile) focusDelta = 2; 
                } else {
                    if (lastWasMobile && !newIsMobile) focusDelta = -1; 
                    else if (!lastWasMobile && newIsMobile) focusDelta = 1; 
                }
                if (focusDelta !== 0) {
                    this.STATE.currentFocusIndex = Math.max(0, this.STATE.currentFocusIndex + focusDelta);
                    App.stackUpdateCurrentFocus(this.STATE.currentFocusIndex);
                }
                _lastMode = newMode;
                this.renderNavegacion(); 
            }
        });
        this.STATE.resizeObserver.observe(document.body);
    };

    App._findNodoById = function(id, nodos) {
        if (!nodos || !id) return null;
        for (const n of nodos) {
            if (n.id === id) return n;
            if (n.subsecciones && n.subsecciones.length > 0) {
                const encontrado = this._findNodoById(id, n.subsecciones);
                if (encontrado) return encontrado;
            }
            if (n.cursos && n.cursos.length > 0) {
                const cursoEncontrado = n.cursos.find(c => c.id === id);
                if (cursoEncontrado) return cursoEncontrado;
            }
        }
        return null;
    };

    App._tieneContenidoActivo = function(nodoId) {
        const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
        if (!nodo) return false;
        if (nodo.titulo) return true; 
        if (nodo.cursos && nodo.cursos.length > 0) return true;
        if (nodo.subsecciones && nodo.subsecciones.length > 0) {
            for (const sub of nodo.subsecciones) {
                if (this._tieneContenidoActivo(sub.id)) return true;
            }
        }
        return false;
    };

})();