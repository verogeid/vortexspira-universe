// --- code/render-base.js ---

import * as debug from './debug.js'; 
import * as data from './data.js';

let _lastMode = 'desktop'; 
let _lastWidth = window.innerWidth; 

export function renderNavegacion() {
    if (!this.STATE.fullData) return;

    const currentLevelState = this.stackGetCurrent(); 
    if (!currentLevelState) return;

    const currentLevelId = currentLevelState.levelId;
    const isSubLevel = !!currentLevelId;
    this.STATE.currentFocusIndex = currentLevelState.focusIndex;

    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    const isDesktop = screenWidth >= data.TABLET_LANDSCAPE_MAX_WIDTH; 
    const isTabletLandscape = screenWidth > data.TABLET_PORTRAIT_MAX_WIDTH && screenWidth < data.TABLET_LANDSCAPE_MAX_WIDTH;
    const isTabletPortrait = screenWidth > data.MOBILE_MAX_WIDTH && screenWidth <= data.TABLET_PORTRAIT_MAX_WIDTH;
    const isTablet = isTabletPortrait || isTabletLandscape;

    let renderHtmlFn;
    let initCarouselFn;
    let calculatedItemsPerColumn;
    let swiperId = null;

    if (isMobile) {
        renderHtmlFn = this._generateCardHTML_Mobile; 
        initCarouselFn = this._initCarousel_Mobile;   
        calculatedItemsPerColumn = 1;
        swiperId = '#nav-swiper-mobile';
        this.DOM.track = document.getElementById('track-mobile'); 
    } else {
        renderHtmlFn = this._generateCardHTML_Carousel; 
        initCarouselFn = this._initCarousel_Swipe;     
        if (isDesktop) {
            calculatedItemsPerColumn = 3; 
            swiperId = '#nav-swiper';
            this.DOM.track = document.getElementById('track-desktop'); 
        } else {
            calculatedItemsPerColumn = 2; 
            swiperId = '#nav-swiper-tablet';
            this.DOM.track = document.getElementById('track-tablet'); 
        }
    }
    this.STATE.itemsPorColumna = calculatedItemsPerColumn;

    const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion); 
    let itemsDelNivel = !isSubLevel ? this.STATE.fullData.navegacion : (nodoActual?.subsecciones || []).concat(nodoActual?.cursos || []);

    if (isMobile && isSubLevel) {
        itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
        let breadcrumbText = nodoActual?.nombre || nodoActual?.titulo || this.getString('breadcrumbRoot');
        itemsDelNivel = [{ id: 'breadcrumb-nav', tipoEspecial: 'breadcrumb-vertical', texto: breadcrumbText }].concat(itemsDelNivel);
    }

    const isDetailActive = this.DOM.vistaDetalleDesktop.classList.contains('active') || this.DOM.vistaDetalleMobile.classList.contains('active');

    document.getElementById('vista-navegacion-desktop').classList.remove('active');
    document.getElementById('vista-navegacion-tablet').classList.remove('active');
    document.getElementById('vista-navegacion-mobile').classList.remove('active');

    if (isDetailActive && this.STATE.activeCourseId) {
        this._mostrarDetalle(this.STATE.activeCourseId); 
    } else {
        this._destroyCarousel(); 
        this.DOM.track.innerHTML = renderHtmlFn.call(this, itemsDelNivel, this.STATE.itemsPorColumna);
        let initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        initCarouselFn.call(this, initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId); 

        if (isMobile) document.getElementById('vista-navegacion-mobile').classList.add('active');
        else if (isTablet) document.getElementById('vista-navegacion-tablet').classList.add('active');
        else document.getElementById('vista-navegacion-desktop').classList.add('active');
    }

    _updateNavViews.call(this, isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual); 

    if (!isDetailActive) {
        setTimeout(() => this._updateFocus(false), data.SWIPE_SLIDE_SPEED / 2);
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

    // ⭐️ FIX: Restauración de logos y detección de icono-vacio ⭐️
    if (tipo === 'categoria') {
        if (!estaActivo) {
            // Se usa la clase específica vinculada a --icon-vacio
            displayTitle = '<span class="icon-vacio-card"></span> ' + displayTitle;
        } else {
            displayTitle = data.LOGO_CARPETA + ' ' + displayTitle;
        }
    } else {
        if (displayTitle.includes(data.LOGO_OBRAS)) {
             displayTitle = '<span class="icon-obras-card"></span> ' + displayTitle.replace(data.LOGO_OBRAS, "").trim(); 
        } else {
             displayTitle = data.LOGO_CURSO + ' ' + displayTitle; 
        }
    }

    return `
        <article class="card ${estaActivo ? '' : 'disabled'}" data-id="${nodo.id}" data-tipo="${tipo}" role="button" tabindex="0" onclick="App._handleTrackClick(event)">
            <h3>${displayTitle}</h3>
        </article>`;
};

export function _updateNavViews(isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual) {
    const vistaVolver = this.DOM.cardVolverFija; 
    if (!vistaVolver) return;

    if (isMobile) { 
        vistaVolver.classList.remove('visible'); 
        this.DOM.infoAdicional.classList.remove('visible'); 
    } else { 
        if (isDesktop || isTabletLandscape) this.DOM.infoAdicional.classList.add('visible'); 
        else this.DOM.infoAdicional.classList.remove('visible');

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

        if ((newMode !== _lastMode || (newWidth > data.TABLET_PORTRAIT_MAX_WIDTH && _lastWidth <= data.TABLET_PORTRAIT_MAX_WIDTH)) && this.STATE.initialRenderComplete) {
            _lastMode = newMode;
            _lastWidth = newWidth;
            if (this.STATE.activeCourseId) this._mostrarDetalle(this.STATE.activeCourseId); 
            else this.renderNavegacion(); 
        }
    });
    this.STATE.resizeObserver.observe(document.body);
};

// --- code/render-base.js ---
