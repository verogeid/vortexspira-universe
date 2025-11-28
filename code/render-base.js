// --- code/render-base.js ---

import * as debug from './debug.js';
import * as data from './data.js';

let _lastMode = 'desktop'; 
let _lastWidth = window.innerWidth; // Añadido para detectar el cambio Landscape/Portrait

// ⭐️ 1. FUNCIÓN DE RENDERIZADO PRINCIPAL ⭐️
/**
 * Renderiza el nivel de navegación actual.
 * Se llama con .call(this) desde VortexSpiraApp.renderNavegacion().
 */
export function renderNavegacion() {
    if (typeof debug.log === 'function') {
        debug.log('render_base', debug.DEBUG_LEVELS.BASIC, "Iniciando renderNavegacion...");
    }
    
    if (!this.STATE.fullData) {
        if (typeof debug.logError === 'function') {
            debug.logError('render_base', "No se puede renderizar: Datos no cargados.");
        }
        return;
    }

    const currentLevelState = this.stackGetCurrent(); // Método delegado
    if (!currentLevelState) return;

    const currentLevelId = currentLevelState.levelId;
    const isSubLevel = !!currentLevelId;
    this.STATE.currentFocusIndex = currentLevelState.focusIndex;

    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    
    // ⭐️ Detección de rangos para Tablet Landscape y Portrait ⭐️
    const isTabletLandscape = screenWidth >= data.TABLET_LANDSCAPE_MIN_WIDTH && screenWidth <= data.TABLET_MAX_WIDTH;
    const isTabletPortrait = screenWidth >= data.TABLET_MIN_WIDTH && screenWidth < data.TABLET_LANDSCAPE_MIN_WIDTH;
    const isDesktop = screenWidth >= data.DESKTOP_MIN_WIDTH;
    
    const isTablet = isTabletPortrait || isTabletLandscape; // Booleano general para Tablet

    let renderHtmlFn;
    let initCarouselFn;
    let calculatedItemsPerColumn;
    let swiperId = null;
    
    const desktopView = document.getElementById('vista-navegacion-desktop');
    const tabletView = document.getElementById('vista-navegacion-tablet');
    const mobileView = document.getElementById('vista-navegacion-mobile');
    
    // -------------------------------------------------------------
    // ⭐️ Detección de Modo y Asignación de DOM para Navegación ⭐️
    // -------------------------------------------------------------
    
    if (isMobile) {
        renderHtmlFn = this._generateCardHTML_Mobile; // Método delegado
        initCarouselFn = this._initCarousel_Mobile;   // Método delegado
        calculatedItemsPerColumn = 1;

        this.DOM.vistaNav = mobileView;
        this.DOM.track = document.getElementById(isSubLevel ? 'track-mobile-submenu' : 'track-mobile-root'); 
        this.DOM.inactiveTrack = document.getElementById(isSubLevel ? 'track-mobile-root' : 'track-mobile-submenu'); 
        
        if (typeof debug.log === 'function') {
            debug.log('render_base', debug.DEBUG_LEVELS.DEEP, 'Modo Móvil. Track activo:', this.DOM.track.id);
        }
        
    } else {
        renderHtmlFn = this._generateCardHTML_Carousel; // Método delegado
        initCarouselFn = this._initCarousel_Swipe;     // Método delegado
        
        if (isTablet) {
            calculatedItemsPerColumn = 2; 
            swiperId = '#nav-swiper-tablet';
            this.DOM.vistaNav = tabletView;
            this.DOM.track = document.getElementById('track-tablet'); 
        } 
        
        if (isDesktop) {
            calculatedItemsPerColumn = 3; 
            swiperId = '#nav-swiper';
            this.DOM.vistaNav = desktopView;
            this.DOM.track = document.getElementById('track-desktop'); 
        }
    }
    this.STATE.itemsPorColumna = calculatedItemsPerColumn;
    
    // -------------------------------------------------------------
    // ⭐️ Obtención de Datos y Renderizado de Navegación ⭐️
    // -------------------------------------------------------------

    const nodoActual = this._findNodoById(currentLevelId, this.STATE.fullData.navegacion); // Método delegado
    let itemsDelNivel = [];

    // ... (lógica de obtención de datos y construcción de itemsDelNivel) ...
    if (!isSubLevel) {
        itemsDelNivel = this.STATE.fullData.navegacion;
    } else if (nodoActual) {
        itemsDelNivel = (nodoActual.subsecciones || []).concat(nodoActual.cursos || []);
    } else { 
        this.stackPop(); 
        this.renderNavegacion();
        return;
    }
    
    // Inyección de tarjetas para MÓVIL (Lógica de breadcrumb y volver)
    if (isMobile) {
        if (isSubLevel) {
            itemsDelNivel = [{ id: 'volver-nav', tipoEspecial: 'volver-vertical' }].concat(itemsDelNivel);
        }
        
        let breadcrumbText = this.getString('breadcrumbRoot'); // Método delegado
        if (isSubLevel && nodoActual) {
            breadcrumbText = nodoActual.nombre || nodoActual.titulo || this.getString('breadcrumbRoot');
        }
        
        if (isSubLevel) {
            itemsDelNivel = [{ 
                id: 'breadcrumb-nav', 
                tipoEspecial: 'breadcrumb-vertical', 
                texto: breadcrumbText 
            }].concat(itemsDelNivel);
        }
    }

    // ⭐️ Determinar el estado de detalle ANTES de limpiar las vistas de navegación ⭐️
    const isDetailActive = document.getElementById('vista-detalle-desktop').classList.contains('active') ||
                           document.getElementById('vista-detalle-mobile').classList.contains('active');

    debug.log('render_base', debug.DEBUG_LEVELS.DEEP, `renderNavigation: isDetailActive: ${isDetailActive}, activeCourseId: ${this.STATE.activeCourseId}`);
                           
    // ⭐️ Limpiar todas las vistas de Navegación + Detalle ⭐️
    desktopView.classList.remove('active');
    tabletView.classList.remove('active');
    mobileView.classList.remove('active');
    document.getElementById('vista-detalle-desktop').classList.remove('active');
    document.getElementById('vista-detalle-mobile').classList.remove('active');
                           
    // ⭐️ Reevaluar las referencias de DOM para el detalle (CORRECCIÓN CLAVE 1) ⭐️
    const detailModeIsMobile = screenWidth <= data.MOBILE_MAX_WIDTH;
    this.DOM.vistaDetalle = detailModeIsMobile ? document.getElementById('vista-detalle-mobile') : document.getElementById('vista-detalle-desktop');
    this.DOM.detalleContenido = detailModeIsMobile ? document.getElementById('detalle-contenido-mobile') : document.getElementById('detalle-contenido-desktop');

    if (isDetailActive) {
        // ⭐️ CORRECCIÓN CLAVE 2: Forzar la re-inyección del contenido del detalle ⭐️
        if (this.STATE.activeCourseId) {
            // Llamamos a _mostrarDetalle. Esto reinyecta el HTML en el contenedor correcto (this.DOM.detalleContenido) y lo activa.
            this._mostrarDetalle(this.STATE.activeCourseId); 
            debug.log('render_base', debug.DEBUG_LEVELS.DEEP, `Detalle re-renderizado para curso: ${this.STATE.activeCourseId}`);
        } else {
            // Si el ID se perdió, volvemos a la navegación
            isDetailActive = false;
            debug.logWarn('render_base', "activeCourseId perdido durante resize, volviendo a navegación.");
        }
    } 
    
    if (!isDetailActive) {
        // Solo renderizamos si NO estamos en detalle (o acabamos de salir)
        this._destroyCarousel(); // Método delegado
        let htmlContent = renderHtmlFn.call(this, itemsDelNivel, this.STATE.itemsPorColumna); // Invocación con 'call(this)'
        this.DOM.track.innerHTML = htmlContent;

        // Ocultar el track inactivo para eliminar el espaciado
        if (isMobile && this.DOM.inactiveTrack) {
            this.DOM.inactiveTrack.style.display = 'none';
            this.DOM.track.style.display = 'flex'; 
        }

        let initialSlideIndex = Math.floor(this.STATE.currentFocusIndex / this.STATE.itemsPorColumna);
        initCarouselFn.call(this, initialSlideIndex, this.STATE.itemsPorColumna, isMobile, swiperId); // Invocación con 'call(this)'
        
        if (typeof this.setupTrackPointerListeners === 'function') {
            this.setupTrackPointerListeners();
        }

        // Activamos la vista de navegación
        if (isMobile) {
            mobileView.classList.add('active'); 
            
            if (isSubLevel) {
                mobileView.classList.add('view-nav-submenu');
            } else {
                mobileView.classList.add('view-nav-root');
            }
        } else if (isTablet) {
            tabletView.classList.add('active');
        } else { 
            desktopView.classList.add('active');
        }
    }

    // ⭐️ Actualización de Visibilidad de Sidebars (Se llama siempre) ⭐️
    _updateNavViews.call(this, isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual); 
    
    // Sincronización de foco (solo si la navegación está visible)
    if (!isDetailActive) {
        this._updateFocus(false); 
    }
    
    if (typeof debug.log === 'function') {
        debug.log('render_base', debug.DEBUG_LEVELS.BASIC, 'Renderizado completado.');
    }
    
    if (!this.STATE.resizeObserver) {
        _setupResizeObserver.call(this); // Invocación con 'call(this)'
    }
};

/**
 * ⭐️ FUNCIÓN CENTRAL DE GENERACIÓN DE TARJETA HTML (ACCESIBILIDAD/ICONOS CORREGIDOS) ⭐️
 * Se llama con .call(this) desde los generadores de HTML (render-swipe/render-mobile).
 */
export function _generarTarjetaHTMLImpl(nodo, estaActivo, esRelleno = false, tipoEspecialArg = null) {
    const wrapperTag = 'article';
    const tipoEspecial = tipoEspecialArg || nodo.tipoEspecial;

    const onclickHandler = `onclick="App._handleTrackClick(event)"`; 

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
                tabindex="0"
                onclick="App._handleVolverClick()"
                aria-label="${this.getString('ariaBackLevel') || 'Volver'}">
                <h3>${data.LOGO_VOLVER}</h3>
            </${wrapperTag}>
        `;
    }

    const isCourse = !!nodo.titulo;
    const tipo = isCourse ? 'curso' : 'categoria';
    const tipoData = `data-tipo="${tipo}"`;
    const claseDisabled = estaActivo ? '' : 'disabled';
    const tagAriaDisabled = estaActivo ? '' : 'aria-disabled="true"';

    const tabindex = '0'; // Forzar tabindex="0" siempre para la navegación por teclado
    
    let displayTitle = nodo.nombre || nodo.titulo || 'Sin Título';
    
    // LÓGICA DE ICONOS RESTAURADA
    if (tipo === 'categoria') {
        if (!estaActivo) {
            displayTitle = data.LOGO_OBRAS + ' ' + displayTitle;
        } else {
            displayTitle = data.LOGO_CARPETA + ' ' + displayTitle;
        }
    } else {
        displayTitle = data.LOGO_CURSO + ' ' + displayTitle; 
    }
    
    const ariaLabel = `${tipo === 'curso' ? 'Curso' : 'Categoría'}: ${nodo.nombre || nodo.titulo || 'Sin Título'}. ${estaActivo ? 'Seleccionar para entrar.' : 'Contenido no disponible.'}`;

    return `
        <${wrapperTag} class="card ${claseDisabled}" 
            data-id="${nodo.id}" 
            ${tipoData}
            role="button" 
            tabindex="${tabindex}" 
            ${tagAriaDisabled}
            ${onclickHandler} 
            aria-label="${ariaLabel}">
            <h3>${displayTitle}</h3>
        </${wrapperTag}>
    `;
};


/**
 * ⭐️ CORRECCIÓN COMPLETA: Lógica de visibilidad de Sidebars (Incluye Landscape/Portrait) ⭐️
 * Se llama con .call(this) desde renderNavegacion.
 */
export function _updateNavViews(isSubLevel, isMobile, isTabletPortrait, isTabletLandscape, isDesktop, nodoActual) {
    
    if (isMobile) { 
        this.DOM.cardVolverFija.classList.remove('visible'); 
        this.DOM.infoAdicional.classList.remove('visible'); 
        this.DOM.btnVolverNav.classList.remove('visible');
        this.DOM.btnVolverNav.tabIndex = -1;
    } else { 
        // Tablet y Desktop
        
        // Lógica clave: Mostrar info-adicional solo en Desktop (>1025) y Tablet Landscape (801-1024)
        if (isDesktop || isTabletLandscape) {
            this.DOM.infoAdicional.classList.add('visible'); 
        } else { // Tablet Portrait (601-800)
            this.DOM.infoAdicional.classList.remove('visible');
        }

        this.DOM.btnVolverNav.classList.remove('visible'); 
        this.DOM.btnVolverNav.tabIndex = -1;
        
        this.DOM.cardVolverFija.classList.add('visible'); 
        this.DOM.cardNivelActual.classList.add('visible');
        
        if (isSubLevel) {
            const nombreNivel = nodoActual ? (nodoActual.nombre || nodoActual.titulo || 'Nivel') : 'Nivel';
            this.DOM.cardNivelActual.innerHTML = `<h3>${nombreNivel}</h3>`;
        } else {
            this.DOM.cardNivelActual.innerHTML = `<h3>${this.getString('breadcrumbRoot')}</h3>`;
        }
        
        if (isSubLevel) {
            this.DOM.cardVolverFijaElemento.classList.add('visible'); 
            this.DOM.cardVolverFijaElemento.innerHTML = `<h3>${data.LOGO_VOLVER}</h3>`; 
            this.DOM.cardVolverFijaElemento.tabIndex = 0;
        } else {
            this.DOM.cardVolverFijaElemento.classList.remove('visible'); 
            this.DOM.cardVolverFijaElemento.innerHTML = ''; 
            this.DOM.cardVolverFijaElemento.tabIndex = -1;
        }
    }
};

/**
 * Configura el ResizeObserver para detectar cambios de modo.
 * Se llama con .call(this) desde VortexSpiraApp.
 */
export function _setupResizeObserver() {
    const getMode = (width) => {
        if (width <= data.MOBILE_MAX_WIDTH) return 'mobile';
        if (width <= data.TABLET_MAX_WIDTH) return 'tablet';
        return 'desktop';
    };
    _lastMode = getMode(window.innerWidth);
    let _lastWidth = window.innerWidth;
    
    // Usamos 'app' como alias para 'this' dentro del closure del listener
    this.STATE.resizeObserver = new ResizeObserver(() => {
        const app = this;
        const newWidth = window.innerWidth;
        const newMode = getMode(newWidth);
        
        const isDetailActive = document.getElementById('vista-detalle-desktop').classList.contains('active') ||
                               document.getElementById('vista-detalle-mobile').classList.contains('active');

        debug.log('render_base', debug.DEBUG_LEVELS.DEEP, `ResizeObserver detectó cambio: Nuevo ancho = ${newWidth}px, Modo = ${newMode}, Detalle activo = ${isDetailActive}`);

        // Lógica de activación:
        const shouldRenderForLayout = 
            // 1. Cambio de Modo Completo (mobile -> tablet | tablet -> desktop)
            newMode !== _lastMode ||
            
            // 2. Transición Portrait <-> Landscape (Cruza la barrera de 801px)
            (newWidth > data.TABLET_LANDSCAPE_MIN_WIDTH && _lastWidth <= data.TABLET_LANDSCAPE_MIN_WIDTH) ||
            (newWidth <= data.TABLET_LANDSCAPE_MIN_WIDTH && _lastWidth > data.TABLET_LANDSCAPE_MIN_WIDTH) ||
            
            // 3. Si estamos en detalle, siempre re-renderizar para actualizar las vistas de detalle
            (isDetailActive && newMode !== _lastMode); 
        
        // Actualizar el último ancho antes de la comprobación final
        const oldLastWidth = _lastWidth;
        _lastWidth = newWidth; 
        
        if (shouldRenderForLayout && app.STATE.initialRenderComplete) {
            const isSubLevel = (app.stackGetCurrent() && app.stackGetCurrent().levelId);
            const lastWasMobile = (oldLastWidth <= data.MOBILE_MAX_WIDTH);
            const newIsMobile = (newWidth <= data.MOBILE_MAX_WIDTH);
            let focusDelta = 0;
            
            // Lógica de corrección del índice de foco al cambiar de modo
            if (isSubLevel) {
                if (lastWasMobile && !newIsMobile) focusDelta = -2; 
                else if (!lastWasMobile && newIsMobile) focusDelta = 2; 
            } else {
                if (lastWasMobile && !newIsMobile) focusDelta = -1; 
                else if (!lastWasMobile && newIsMobile) focusDelta = 1; 
            }
            
            if (focusDelta !== 0) {
                app.STATE.currentFocusIndex = Math.max(0, app.STATE.currentFocusIndex + focusDelta);
                app.stackUpdateCurrentFocus(app.STATE.currentFocusIndex);
            }
            
            _lastMode = newMode;
            app.renderNavegacion(); 
        }
    });
    this.STATE.resizeObserver.observe(document.body);
};