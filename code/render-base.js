/* --- code/render-base.js --- */

import * as debug from './debug.js'; 
import * as data from './data.js';

let _lastMode = 'desktop'; 
let _resizeTimer; 

export function renderNavegacion() {
    // 🔍 Nivel EXTREME para el flujo detallado paso a paso
    debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 01. START renderNavegacion. FullData:${!!this.STATE.fullData} Hydrating:${this.STATE.isHydrating}`);
    
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

    const layoutMode = document.body.getAttribute('data-layout') || 'desktop';

    const isMobile = layoutMode === 'mobile';
    const isTabletPortrait = layoutMode === 'tablet-portrait';
    const isTabletLandscape = layoutMode === 'tablet-landscape';
    const isDesktop = layoutMode === 'desktop';

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
        debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 🛑 ABORT. Track element not found.`);
        this.STATE.isNavigatingBack = false;
        return;
    }

    this._destroyCarousel(); 

    // Limpiamos TODOS los tracks para evitar duplicados fantasma
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

    // Usamos el nombre correcto de la función
    const renderHtmlFn = isMobile ? this._generateCardHTML_Mobile : this._generateCardHTML_Carousel;
    this.DOM.track.innerHTML = renderHtmlFn.call(this, itemsDelNivel, this.STATE.itemsPorColumna);

    const isReturning = this.STATE.isNavigatingBack;
    
    // ⭐️ LOGICA MAESTRA DE RESTAURACIÓN DE FOCO (SNAPSHOT BASED) ⭐️
    let shouldFocusTrack = true;
    let explicitExternalFocus = null;

    if (this.STATE.resizeSnapshot) {
        const snap = this.STATE.resizeSnapshot;
        // 🔍 TRAZA EXTREMA DE DECISIÓN
        debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 02. Processing Snapshot. Type:${snap.type} Value:${snap.value}`);

        // 1. Intentar encontrar elemento exacto (ID o Selector)
        let foundEl = null;
        if (snap.type === 'ID') foundEl = document.getElementById(snap.value);
        else if (snap.type === 'SELECTOR') foundEl = document.querySelector(snap.value);

        if (foundEl) {
            debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 03A. Exact Match Found: ${snap.value}. Setting explicitExternalFocus.`);
            explicitExternalFocus = foundEl;
            shouldFocusTrack = false;
            this.STATE.currentFocusIndex = -1;
        } 
        else if (snap.type === 'DATA_ID') {
            // 2. Si era una tarjeta (data-id), buscarla en el track
            const targetId = snap.value;
            const rawIndex = itemsDelNivel.findIndex(item => item.id === targetId);

            if (rawIndex !== -1) {
                // Está en el track -> Calcular nuevo índice
                let logicalIndex = 0;
                for (let i = 0; i < rawIndex; i++) {
                    const it = itemsDelNivel[i];
                    if (it.tipo !== 'relleno' && it.tipoEspecial !== 'breadcrumb-vertical') logicalIndex++;
                }
                this.STATE.currentFocusIndex = logicalIndex;
                shouldFocusTrack = true; // Dejamos que _updateFocus haga su trabajo
                debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 03B. Card found in track (Index: ${logicalIndex}).`);
            } else {
                // No está en el track -> ¿Era volver-nav?
                if (targetId === 'volver-nav') {
                    const volverFijoRef = this.DOM.cardVolverFijaElemento || document.getElementById('card-volver-fija-elemento');
                    if (volverFijoRef) {
                        debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 03C. 'volver-nav' remapped to fixed button.`);
                        explicitExternalFocus = volverFijoRef;
                        shouldFocusTrack = false;
                        this.STATE.currentFocusIndex = -1;
                    }
                } else {
                    debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 03D. ID lost. Resetting to 0.`);
                    this.STATE.currentFocusIndex = 0;
                    shouldFocusTrack = true;
                }
            }
        } 
        else if (snap.type === 'ID' && snap.value === 'card-volver-fija-elemento') {
             // Caso especial: Era botón fijo y ahora quizás es tarjeta volver-nav
             const rawIndex = itemsDelNivel.findIndex(item => item.id === 'volver-nav');
             if (rawIndex !== -1) {
                 debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 03E. Fixed button remapped to track 'volver-nav'.`);
                 let logicalIndex = 0;
                 for (let i = 0; i < rawIndex; i++) {
                     const it = itemsDelNivel[i];
                     if (it.tipo !== 'relleno' && it.tipoEspecial !== 'breadcrumb-vertical') logicalIndex++;
                 }
                 this.STATE.currentFocusIndex = logicalIndex;
                 shouldFocusTrack = true;
             }
        }

        this.STATE.resizeSnapshot = null;

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

    let initialSlideIndex = 0;
    const safeFocusIndex = Math.max(0, this.STATE.currentFocusIndex);

    if (isMobile) {
        const track = this.DOM.track;
        if (track) {
            const targetCard = track.querySelector(`.card[data-pos="${safeFocusIndex}"]`);
            if (targetCard) {
                const targetSlide = targetCard.closest('.swiper-slide');
                if (targetSlide) {
                    const allSlides = Array.from(track.children);
                    initialSlideIndex = allSlides.indexOf(targetSlide);
                }
            }
        }
    } else {
        initialSlideIndex = Math.floor(safeFocusIndex / this.STATE.itemsPorColumna) + 1;
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

                // Limpieza preventiva
                const volverFijoRef = this.DOM.cardVolverFijaElemento || document.getElementById('card-volver-fija-elemento');
                if (volverFijoRef) volverFijoRef.classList.remove('focus-visible');

                // 🔍 TRAZA FINAL
                debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 04. Finally Block. Explicit: ${!!explicitExternalFocus}, Track: ${shouldFocusTrack}`);

                if (explicitExternalFocus) {
                     debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RESTORE-DEBUG] 05. Scheduling external focus for ${explicitExternalFocus.id}`);
                     
                     // ⭐️ FUNCIÓN DE RESTAURACIÓN ROBUSTA ⭐️
                     const performRestoration = () => {
                        debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RESTORE-DEBUG] 07. performRestoration EXECUTING.`);
                        explicitExternalFocus.focus();
                        explicitExternalFocus.classList.add('focus-visible');
                        
                        explicitExternalFocus.addEventListener('blur', function cleanup() {
                            explicitExternalFocus.classList.remove('focus-visible');
                            explicitExternalFocus.removeEventListener('blur', cleanup);
                        }, { once: true });
                     };

                     // Primer intento
                     setTimeout(() => {
                        debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RESTORE-DEBUG] 06. Timeout 50ms triggered.`);
                        performRestoration();

                        // 🛡️ RE-CHECK (50ms después) 🛡️
                        setTimeout(() => {
                            const isFocused = document.activeElement === explicitExternalFocus;
                            const hasClass = explicitExternalFocus.classList.contains('focus-visible');
                            
                            debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RESTORE-DEBUG] 08. Re-Check: IsFocused=${isFocused}, HasClass=${hasClass}`);

                            if (!isFocused || !hasClass) {
                                debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RESTORE-DEBUG] 09. Restoration Failed. Retrying...`);
                                performRestoration();
                            }
                        }, 50);
                     }, 50);

                } else if (shouldFocusTrack) {
                     debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RESTORE-DEBUG] 05-Track. Scheduling track restoration.`);
                     setTimeout(() => {
                        this._updateFocus(isReturning);
                     }, 50);
                }
                
                debug.log('render_base', debug.DEBUG_LEVELS.EXTREME, `[RENDER-FLOW] 10. renderNavegacion END.`);
            }
        });
    } catch (e) {
        this.STATE.isNavigatingBack = false;
        this.STATE.isHydrating = false;
        debug.logError('render_base', '[RENDER-FLOW] Exception in rAF', e);
    }

    _updateNavViews.call(this, !!currentLevelState.levelId, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual); 
}

function _getUniqueSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return null;
    
    if (el.id) return { type: 'ID', value: el.id };
    if (el.dataset.id) return { type: 'DATA_ID', value: el.dataset.id };
    
    let selector = el.tagName.toLowerCase();
    if (el.getAttribute('role')) selector += `[role="${el.getAttribute('role')}"]`;
    if (el.getAttribute('aria-label')) selector += `[aria-label="${el.getAttribute('aria-label')}"]`;
    
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c !== 'focus-visible' && c !== 'active');
        if (classes.length > 0) selector += `.${classes[0]}`;
    }
    
    return { type: 'SELECTOR', value: selector };
}

export function _setupResizeObserver() {
    document.addEventListener('focusin', (e) => {
        if (e.target && e.target !== document.body) {
            this.STATE.lastFocusedElement = e.target;
        }
    }, { passive: true });

    this.STATE.resizeObserver = new ResizeObserver(() => {
        // En lugar de calcular modos aquí, llamamos a la lógica centralizada de App
        // para asegurar consistencia
        if (typeof this._updateLayoutMode === 'function') {
             this._updateLayoutMode();
        }
        
        // Pero para detectar cambios usamos el atributo que acabamos de actualizar (o no)
        const newMode = document.body.getAttribute('data-layout') || 'desktop';
        
        const modeChanged = newMode !== _lastMode;
        
        document.body.classList.add('resize-animation-stopper');
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => {
            document.body.classList.remove('resize-animation-stopper');
        }, 400);

        if (modeChanged && this.STATE.initialRenderComplete) {
            _lastMode = newMode;
            
            const isInDetails = !!this.STATE.activeCourseId;

            if (isInDetails) {
                 this._mostrarDetalle(this.STATE.activeCourseId);
            } else {
                 let activeElement = document.activeElement;
                 if (!activeElement || activeElement === document.body || activeElement === document.documentElement) {
                     if (this.STATE.lastFocusedElement) {
                         activeElement = this.STATE.lastFocusedElement;
                     } else {
                         if (this.DOM.track) {
                             activeElement = this.DOM.track.querySelector(`.card[data-pos="${this.STATE.currentFocusIndex}"]`);
                         }
                     }
                 }

                 this.STATE.resizeSnapshot = _getUniqueSelector(activeElement);
                 this.renderNavegacion(); 
            }
        }
    });
    this.STATE.resizeObserver.observe(document.body);
};

// ⭐️ MANTENEMOS EL NOMBRE CORRECTO QUE USA APP.JS
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
/* --- code/render-base.js --- */