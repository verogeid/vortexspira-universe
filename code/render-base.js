/* --- code/render-base.js --- */

import * as debug from './debug.js'; 
import * as data from './data.js';

let _lastMode = 'desktop'; 
let _lastWidth = window.innerWidth; 
let _resizeTimer; 

export function renderNavegacion() {
    if (!this.STATE.fullData) return;
    if (this.STATE.isHydrating) return;

    // 🗑️ LIMPIEZA TOTAL DE DETALLES
    if (this.STATE.detailCarouselInstance) {
        this.STATE.detailCarouselInstance.destroy(true, true);
        this.STATE.detailCarouselInstance = null;
    }
    ['vista-detalle-desktop', 'vista-detalle-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });

    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MAX_WIDTH.MOBILE;
    const isDesktop = screenWidth >= data.MAX_WIDTH.TABLET_LANDSCAPE; 
    const isTabletLandscape = screenWidth > data.MAX_WIDTH.TABLET_PORTRAIT && screenWidth < data.MAX_WIDTH.TABLET_LANDSCAPE;
    const isTabletPortrait = screenWidth > data.MAX_WIDTH.MOBILE && screenWidth <= data.MAX_WIDTH.TABLET_PORTRAIT;

    const targetViewId = isMobile ? 'vista-navegacion-mobile' : 
                         (isDesktop ? 'vista-navegacion-desktop' : 'vista-navegacion-tablet');
    const targetTrackId = isMobile ? 'track-mobile' : 
                          (isDesktop ? 'track-desktop' : 'track-tablet');
    const swiperId = isMobile ? '#nav-swiper-mobile' : 
                     (isDesktop ? '#nav-swiper' : '#nav-swiper-tablet');

    ['vista-navegacion-desktop', 'vista-navegacion-tablet', 'vista-navegacion-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === targetViewId) {
                el.style.display = 'flex';
                el.classList.add('active');
            } else {
                el.style.display = 'none';
                el.classList.remove('active');
            }
        }
    });

    this._cacheDOM();
    this.DOM.track = document.getElementById(targetTrackId);
    this.STATE.itemsPorColumna = isMobile ? 1 : (isDesktop ? data.SWIPER.ELEMENTS_PER_COLUMN_DESKTOP : data.SWIPER.ELEMENTS_PER_COLUMN_TABLET);

    if (!this.DOM.track) {
        this.STATE.isNavigatingBack = false;
        return;
    }

    this._destroyCarousel(); 
    ['track-desktop', 'track-tablet', 'track-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    const currentLevelState = this.stackGetCurrent();
    const nodoActual = this._findNodoById(currentLevelState.levelId, this.STATE.fullData.navegacion);
    
    let itemsDelNivel = !currentLevelState.levelId ? this.STATE.fullData.navegacion : (nodoActual?.subsecciones || []).concat(nodoActual?.cursos || []);
    const isSubLevel = !!currentLevelState.levelId;

    if (isMobile && isSubLevel) {
        itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
        let breadcrumbText = nodoActual?.nombre || nodoActual?.titulo || this.getString('breadcrumbRoot');
        itemsDelNivel = [{ id: 'breadcrumb-nav', tipoEspecial: 'breadcrumb-vertical', texto: breadcrumbText }].concat(itemsDelNivel);
    }

    const renderHtmlFn = isMobile ? this._generateCardHTML_Mobile : this._generateCardHTML_Carousel;
    this.DOM.track.innerHTML = renderHtmlFn.call(this, itemsDelNivel, this.STATE.itemsPorColumna);

    const isReturning = this.STATE.isNavigatingBack;
    
    // ⭐️ LOGICA MAESTRA DE RESTAURACIÓN DE FOCO (RESIZE) ⭐️
    let shouldFocusTrack = true;
    let explicitExternalFocus = null;

    if (this.STATE.resizeContext) {
        const ctx = this.STATE.resizeContext;
        debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `RESIZE: Contexto de foco detectado: ${ctx.type} (ID: ${ctx.id})`);

        if (ctx.type === 'EXTERNAL_KEEP') {
            // El foco estaba fuera y sigue visible -> No robamos el foco
            shouldFocusTrack = false;
        } 
        else if (ctx.type === 'RESET_TO_TRACK') {
            // El foco estaba en un elemento que se ha ocultado -> Volver al inicio del track
            this.STATE.currentFocusIndex = 0;
            shouldFocusTrack = true;
        }
        else if (ctx.type === 'TRACK_ID') {
            const targetId = ctx.id;
            
            // 1. Buscamos el ID en el nuevo track generado
            const rawIndex = itemsDelNivel.findIndex(item => item.id === targetId);

            if (rawIndex !== -1) {
                // Caso: Existe en el track (ej. curso normal, o 'volver-nav' en Mobile)
                // Calculamos índice lógico ignorando breadcrumbs/rellenos
                let logicalIndex = 0;
                for (let i = 0; i < rawIndex; i++) {
                    const it = itemsDelNivel[i];
                    if (it.tipo !== 'relleno' && it.tipoEspecial !== 'breadcrumb-vertical') {
                        logicalIndex++;
                    }
                }
                this.STATE.currentFocusIndex = logicalIndex;
                shouldFocusTrack = true;
            } 
            else {
                // Caso: No existe en el track (ej. 'volver-nav' al pasar a Desktop)
                if (targetId === 'volver-nav' && this.DOM.cardVolverFijaElemento) {
                    explicitExternalFocus = this.DOM.cardVolverFijaElemento;
                    shouldFocusTrack = false;
                } else {
                    // Fallback por seguridad
                    this.STATE.currentFocusIndex = 0;
                    shouldFocusTrack = true;
                }
            }
        }
        
        this.STATE.resizeContext = null; // Limpiamos el contexto

    } else if (!isReturning) {
        this.STATE.currentFocusIndex = 0; 
    } else {
        const savedId = currentLevelState.focusId;
        if (savedId) {
            const foundIndex = itemsDelNivel.findIndex(item => item.id === savedId);
            if (foundIndex !== -1) {
                let logicalIndex = 0;
                for (let i = 0; i < foundIndex; i++) {
                     const it = itemsDelNivel[i];
                     if (it.tipo !== 'relleno' && it.tipoEspecial !== 'breadcrumb-vertical') {
                        logicalIndex++;
                     }
                }
                this.STATE.currentFocusIndex = logicalIndex;
            } else {
                this.STATE.currentFocusIndex = 0;
            }
        } else {
            this.STATE.currentFocusIndex = 0;
        }
    }

    // ⭐️ CÁLCULO DE INITIAL SLIDE PARA VISIBILIDAD ⭐️
    let initialSlideIndex = 0;

    if (isMobile) {
        // En Mobile, buscamos físicamente en qué slide está la tarjeta enfocada.
        // data-pos es tu índice lógico, pero el slide puede ser distinto (por breadcrumbs, etc.)
        const track = this.DOM.track;
        if (track) {
            // Buscamos la tarjeta que tiene el foco asignado
            const targetCard = track.querySelector(`.card[data-pos="${this.STATE.currentFocusIndex}"]`);
            
            if (targetCard) {
                // Buscamos su contenedor swiper-slide directo
                const targetSlide = targetCard.closest('.swiper-slide');
                
                if (targetSlide) {
                    // Calculamos su índice visual real entre todos los slides
                    // Convertimos a Array para usar indexOf
                    const allSlides = Array.from(track.children);
                    initialSlideIndex = allSlides.indexOf(targetSlide);
                }
            }
        }
    } else {
        // En Desktop/Tablet es cálculo matemático de rejilla
        initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
    }
    
    try {
        requestAnimationFrame(() => {
            try {
                const initCarouselFn = isMobile ? this._initCarousel_Mobile : this._initCarousel_Swipe;
                initCarouselFn.call(this, initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId);
            } catch (err) {
                debug.logError('render_base', 'CRITICAL: Fallo en initCarousel', err);
            } finally {
                this.STATE.isNavigatingBack = false;
                this.STATE.isHydrating = false;

                // ⭐️ APLICACIÓN FINAL DEL FOCO ⭐️
                if (explicitExternalFocus) {
                     // Caso especial: De track móvil a botón fijo desktop
                     explicitExternalFocus.focus();
                } else if (shouldFocusTrack) {
                     // Caso normal: Foco dentro del carrusel
                     this._updateFocus(isReturning);
                }
                // Si es EXTERNAL_KEEP, no hacemos nada y el navegador mantiene el foco.
                
                debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `RENDER: Ciclo de Navegación completado.`);
            }
        });
    } catch (e) {
        this.STATE.isNavigatingBack = false;
        this.STATE.isHydrating = false;
    }

    _updateNavViews.call(this, !!currentLevelState.levelId, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual); 
}

export function _generarTarjetaHTMLImpl(nodo, estaActivo, esRelleno = false, tipoEspecialArg = null) {
    const tipoEspecial = tipoEspecialArg || nodo.tipoEspecial;
    if (esRelleno) return `<article class="card card--relleno" data-tipo="relleno" tabindex="-1" aria-hidden="true"></article>`;

    if (tipoEspecial === 'breadcrumb-vertical') {
         return `<article class="card card-breadcrumb-vertical" data-id="breadcrumb-nav" data-tipo="relleno" tabindex="-1" aria-hidden="true"><h3>${nodo.texto}</h3></article>`;
    }

    if (tipoEspecial === 'volver-vertical') {
        return `<article class="card card-volver-vertical" data-id="volver-nav" data-tipo="volver-vertical" role="button" tabindex="0" onclick="App._handleVolverClick()"><h3>${data.LOGO.VOLVER}</h3></article>`;
    }

    const isCourse = !!nodo.titulo;
    const tipo = isCourse ? 'curso' : 'categoria';
    let displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';
    let iconHTML = ''; 

    if (tipo === 'categoria') {
        if (estaActivo) { iconHTML = `<span class="card-icon-lead">${data.LOGO.CARPETA}</span>`; }
        else { iconHTML = `<span class="icon-vacio-card"></span>`; }
    } else {
        if (displayTitle.includes(data.LOGO.OBRAS)) {
             iconHTML = `<span class="icon-obras-card"></span>`;
             displayTitle = displayTitle.replace(data.LOGO.OBRAS, "").trim(); 
        } else {
             iconHTML = `<span class="card-icon-lead">${data.LOGO.CURSO}</span>`; 
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
        if (isDesktop || isTabletLandscape) infoAdicional.classList.add('visible'); 
        else infoAdicional.classList.remove('visible');

        vistaVolver.classList.add('visible'); 
        this.DOM.cardNivelActual.classList.add('visible');
        this.DOM.cardNivelActual.innerHTML = `<h3>${isSubLevel ? (nodoActual?.nombre || nodoActual?.titulo || 'Nivel') : this.getString('breadcrumbRoot')}</h3>`;

        if (isSubLevel) {
            this.DOM.cardVolverFijaElemento.classList.add('visible'); 
            this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO.VOLVER}</h3>`; 
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
        const getMode = (w) => w <= data.MAX_WIDTH.MOBILE ? 'mobile' : (w <= data.MAX_WIDTH.TABLET_LANDSCAPE ? 'tablet' : 'desktop');
        const newMode = getMode(newWidth);

        const modeChanged = newMode !== _lastMode;
        const tabletThresholdCrossed = (newWidth > data.MAX_WIDTH.TABLET_PORTRAIT && _lastWidth <= data.MAX_WIDTH.TABLET_PORTRAIT) ||
                                       (newWidth <= data.MAX_WIDTH.TABLET_PORTRAIT && _lastWidth > data.MAX_WIDTH.TABLET_PORTRAIT);

        document.body.classList.add('resize-animation-stopper');
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => {
            document.body.classList.remove('resize-animation-stopper');
        }, 400);

        if ((modeChanged || tabletThresholdCrossed) && this.STATE.initialRenderComplete) {
            debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `DEBUG_RESIZE: Cambio de modo/umbral detectado. Modo: ${newMode}`);
            _lastMode = newMode;
            _lastWidth = newWidth;
            
            const isInDetails = !!this.STATE.activeCourseId;

            if (isInDetails) {
                 debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `DEBUG_RESIZE: En detalles. Reajustando vista...`);
                 this._mostrarDetalle(this.STATE.activeCourseId);
            } else {
                 // ⭐️ CAPTURA DE CONTEXTO DE FOCO ⭐️
                 let resizeContext = { type: 'RESET_TO_TRACK' }; 
                 const active = document.activeElement;

                 // Detectar dónde estamos
                 const isInfo = active.closest('#info-adicional');
                 const isTrack = active.closest('.card[data-id]'); // Tarjeta del track
                 const isVolverFijo = active.closest('#card-volver-fija-elemento');
                 
                 // Predecir visibilidad futura
                 const infoWillBeHidden = newWidth <= data.MAX_WIDTH.TABLET_PORTRAIT;

                 if (isInfo) {
                     // Si estamos en Info y se va a ocultar -> Forzar vuelta al Track
                     if (infoWillBeHidden) resizeContext = { type: 'RESET_TO_TRACK' };
                     // Si estamos en Info y seguirá visible -> Dejar quieto
                     else resizeContext = { type: 'EXTERNAL_KEEP' };
                 } 
                 else if (isTrack && active.dataset.id) {
                     // Estamos en una tarjeta -> Intentar mantener la misma ID
                     resizeContext = { type: 'TRACK_ID', id: active.dataset.id };
                 } 
                 else if (isVolverFijo) {
                     // Estamos en botón fijo -> Mantener ID 'volver-nav' (se mapeará a track o botón según corresponda)
                     resizeContext = { type: 'TRACK_ID', id: 'volver-nav' };
                 } 
                 else if (active === document.body) {
                     // Foco perdido -> Reset
                     resizeContext = { type: 'RESET_TO_TRACK' };
                 } 
                 else {
                     // Otros elementos externos (Header, Footer, etc.)
                     // Asumimos que persisten y no se ocultan por CSS en estos breakpoints críticos
                     resizeContext = { type: 'EXTERNAL_KEEP' };
                 }

                 this.STATE.resizeContext = resizeContext;
                 this.renderNavegacion(); 
            }
        }
    });
    this.STATE.resizeObserver.observe(document.body);
};

/* --- code/render-base.js --- */