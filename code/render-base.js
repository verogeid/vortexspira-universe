/* --- code/render-base.js --- */

import * as debug from './debug.js'; 
import * as data from './data.js';

let _lastMode = 'desktop'; 
let _lastWidth = window.innerWidth; 

export function renderNavegacion() {
    if (!this.STATE.fullData) return;

    // 1. Refrescar referencias del DOM para el modo actual (Mobile/Tablet/Desktop)
    this._cacheDOM();

    const currentLevelState = this.stackGetCurrent(); 
    if (!currentLevelState) return;

    const currentLevelId = currentLevelState.levelId;
    const isSubLevel = !!currentLevelId;
    const isReturning = currentLevelState.focusIndex > 0;
    this.STATE.currentFocusIndex = currentLevelState.focusIndex;

    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    const isDesktop = screenWidth >= data.TABLET_LANDSCAPE_MAX_WIDTH; 
    const isTabletLandscape = screenWidth > data.TABLET_PORTRAIT_MAX_WIDTH && screenWidth < data.TABLET_LANDSCAPE_MAX_WIDTH;
    const isTabletPortrait = screenWidth > data.MOBILE_MAX_WIDTH && screenWidth <= data.TABLET_PORTRAIT_MAX_WIDTH;
    const isTablet = isTabletPortrait || isTabletLandscape;

    // 2. Comprobar estado de detalle antes de limpiar
    const isDetailActive = this.DOM.vistaDetalleDesktop?.classList.contains('active') || 
                           this.DOM.vistaDetalleMobile?.classList.contains('active');

    // ⭐️ LIMPIEZA ATÓMICA: Evita duplicidad de vistas ocultando TODO ⭐️
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('active'));

    let renderHtmlFn;
    let initCarouselFn;
    let calculatedItemsPerColumn;
    let swiperId = null;

    if (isMobile) {
        renderHtmlFn = this._generateCardHTML_Mobile; 
        initCarouselFn = this._initCarousel_Mobile;   
        calculatedItemsPerColumn = 1;
        swiperId = '#nav-swiper-mobile';
    } else {
        renderHtmlFn = this._generateCardHTML_Carousel; 
        initCarouselFn = this._initCarousel_Swipe;     
        if (isDesktop) {
            calculatedItemsPerColumn = 3; 
            swiperId = '#nav-swiper';
        } else {
            calculatedItemsPerColumn = 2; 
            swiperId = '#nav-swiper-tablet';
        }
    }
    this.STATE.itemsPorColumna = calculatedItemsPerColumn;

    const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion); 
    let itemsDelNivel = !isSubLevel ? this.STATE.fullData.navegacion : (nodoActual?.subsecciones || []).concat(nodoActual?.cursos || []);

    // Preparar elementos especiales para mobile
    if (isMobile && isSubLevel) {
        itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
        let breadcrumbText = nodoActual?.nombre || nodoActual?.titulo || this.getString('breadcrumbRoot');
        itemsDelNivel = [{ id: 'breadcrumb-nav', tipoEspecial: 'breadcrumb-vertical', texto: breadcrumbText }].concat(itemsDelNivel);
    }

    if (isDetailActive && this.STATE.activeCourseId) {
        // Restaurar vista de detalle
        debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `RENDER: Restaurando Detalle ID: ${this.STATE.activeCourseId}`);
        this._mostrarDetalle(this.STATE.activeCourseId); 
    } else {
        // Renderizar carrusel de navegación
        this._destroyCarousel(); 
        if (this.DOM.track) {
            this.DOM.track.innerHTML = ''; 
            this.DOM.track.innerHTML = renderHtmlFn.call(this, itemsDelNivel, this.STATE.itemsPorColumna);
            
            let initialSlideIndex;
            if (isMobile) {
                initialSlideIndex = !isReturning ? 0 : this.STATE.currentFocusIndex;
                if (!isReturning) this.STATE.currentFocusIndex = 0;
            } else {
                initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
            }

            debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `RENDER: Creando Swiper en slide ${initialSlideIndex}`);
            initCarouselFn.call(this, initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId); 
        }

        // Activar la vista de navegación correspondiente
        if (this.DOM.vistaNav) this.DOM.vistaNav.classList.add('active');
    }

    // ⭐️ SIEMPRE actualizamos vistas laterales (Independiente de si es detalle o menú) ⭐️
    _updateNavViews.call(this, isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual); 

    if (!isDetailActive) {
        requestAnimationFrame(() => {
            this._updateFocus(isReturning);
            requestAnimationFrame(() => {
                this.STATE.isNavigatingBack = false; 
                debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `RENDER: Ciclo completado.`);
            });
        });
    }
};

export function _generarTarjetaHTMLImpl(nodo, estaActivo, esRelleno = false, tipoEspecialArg = null) {
    const tipoEspecial = tipoEspecialArg || nodo.tipoEspecial;
    if (esRelleno) return `<article class="card card--relleno" data-tipo="relleno" tabindex="-1" aria-hidden="true"></article>`;

    if (tipoEspecial === 'breadcrumb-vertical') {
         return `<article class="card card-breadcrumb-vertical" data-id="breadcrumb-nav" data-tipo="relleno" tabindex="-1" aria-hidden="true"><h3>${nodo.texto}</h3></article>`;
    }

    if (tipoEspecial === 'volver-vertical') {
        return `<article class="card card-volver-vertical" data-id="volver-nav" data-tipo="volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()"><h3>${data.LOGO_VOLVER}</h3></article>`;
    }

    const isCourse = !!nodo.titulo;
    const tipo = isCourse ? 'curso' : 'categoria';
    let displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';
    let iconHTML = ''; 

    if (tipo === 'categoria') {
        if (!estaActivo) {
            iconHTML = `<span class="icon-vacio-card"></span>`;
        } else {
            iconHTML = `<span class="card-icon-lead">${data.LOGO_CARPETA}</span>`;
        }
    } else {
        if (displayTitle.includes(data.LOGO_OBRAS)) {
             iconHTML = `<span class="icon-obras-card"></span>`;
             displayTitle = displayTitle.replace(data.LOGO_OBRAS, "").trim(); 
        } else {
             iconHTML = `<span class="card-icon-lead">${data.LOGO_CURSO}</span>`; 
        }
    }

    return `
        <article class="card ${estaActivo ? '' : 'disabled'}" data-id="${nodo.id}" data-tipo="${tipo}" role="button" tabindex="0">
            <h3>${iconHTML}<span class="card-text-content">${displayTitle}</span></h3>
        </article>`;
};

export function _updateNavViews(isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual) {
    const vistaVolver = this.DOM.cardVolverFija; 
    const infoAdicional = this.DOM.infoAdicional;
    if (!vistaVolver || !infoAdicional) return;

    if (isMobile) { 
        vistaVolver.classList.remove('visible'); 
        infoAdicional.classList.remove('visible'); 
    } else { 
        if (isDesktop || isTabletLandscape) {
            infoAdicional.classList.add('visible'); 
        } else {
            infoAdicional.classList.remove('visible');
        }

        vistaVolver.classList.add('visible'); 
        this.DOM.cardNivelActual.classList.add('visible');
        this.DOM.cardNivelActual.innerHTML = `<h3>${isSubLevel ? (nodoActual?.nombre || nodoActual?.titulo || 'Nivel') : this.getString('breadcrumbRoot')}</h3>`;

        if (isSubLevel) {
            this.DOM.cardVolverFijaElemento.classList.add('visible'); 
            this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`; 
            this.DOM.cardVolverFijaElemento.tabIndex = 0;
        } else {
            this.DOM.cardVolverFijaElemento.classList.remove('visible'); 
            this.DOM.cardVolverFijaElemento.tabIndex = -1;
        }
    }
};

export function _setupResizeObserver() {
    this.STATE.resizeObserver = new ResizeObserver(() => {
        const newWidth = window.innerWidth;
        const getMode = (w) => w <= data.MOBILE_MAX_WIDTH ? 'mobile' : (w <= data.TABLET_LANDSCAPE_MAX_WIDTH ? 'tablet' : 'desktop');
        const newMode = getMode(newWidth);

        // Detectamos cambio de modo o cruce de umbral crítico de tablet
        const modeChanged = newMode !== _lastMode;
        const tabletThresholdCrossed = (newWidth > data.TABLET_PORTRAIT_MAX_WIDTH && _lastWidth <= data.TABLET_PORTRAIT_MAX_WIDTH) ||
                                       (newWidth <= data.TABLET_PORTRAIT_MAX_WIDTH && _lastWidth > data.TABLET_PORTRAIT_MAX_WIDTH);

        if ((modeChanged || tabletThresholdCrossed) && this.STATE.initialRenderComplete) {
            debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `DEBUG_RESIZE: Cambio de modo/umbral detectado. Modo: ${newMode}`);
            _lastMode = newMode;
            _lastWidth = newWidth;
            
            // Centralizamos todo en renderNavegacion, que ahora es capaz de limpiar y decidir qué vista mostrar
            this.renderNavegacion(); 
        }
    });
    this.STATE.resizeObserver.observe(document.body);
};

/* --- code/render-base.js --- */