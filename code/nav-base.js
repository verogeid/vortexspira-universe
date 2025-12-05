// --- code/nav-base.js ---

import * as data from './data.js';
import * as debug from './debug.js';
import * as nav_mouse_swipe from './nav-mouse-swipe.js';
import * as nav_mouse_details from './nav-mouse-details.js'; // ⭐️ Importación de detalle de ratón ⭐️
import * as nav_base_details from './nav-base-details.js'; // ⭐️ Importación de base de detalle ⭐️

/**
 * Inicializa todos los listeners de eventos necesarios para la navegación.
 * Se llama desde app.js.
 */
export function _setupListeners() {
    // 'this' es la instancia de App
    const appInstance = this;
    
    // 1. Eventos de Teclado Global
    document.addEventListener('keydown', appInstance._handleKeyDown.bind(appInstance));
    
    // 2. Eventos de Redimensionamiento (para cambiar entre móvil/desktop)
    window.addEventListener('resize', _handleResize.bind(appInstance));
    
    // 3. Eventos de Ratón (Swipe en Navegación y Volver)
    nav_mouse_swipe._setupSwipeMouseListeners(appInstance);
    
    // ⭐️ 4. Eventos de Ratón en Detalle (Aunque ahora vacío, mantiene la estructura) ⭐️
    nav_mouse_details._setupDetailMouseListeners(appInstance);
    
    // 5. Handlers de Foco (para Teclado, Lectores de Pantalla y Estado Visual)
    
    // a) Focusin global (para aplicar estado de foco/blur en Detalle)
    appInstance.DOM.appContainer.addEventListener('focusin', _setupDetailFocusHandler.bind(appInstance));
    
    // b) Click en tarjeta de navegación (para navegar)
    // Se usa la delegación en DOM.vistaNav y DOM.vistaNavMobile
    appInstance.DOM.vistaNav.addEventListener('click', _handleNavClick.bind(appInstance));
    appInstance.DOM.vistaNavMobile.addEventListener('click', _handleNavClick.bind(appInstance));

    // c) Click en botón 'Volver' fijo (Desktop/Tablet)
    if (appInstance.DOM.cardVolverFijaElemento) {
        appInstance.DOM.cardVolverFijaElemento.addEventListener('click', appInstance._handleVolverClick.bind(appInstance));
    }
    
    // d) Click en botón 'Inicio' del header móvil
    const mobileLogo = appInstance.DOM.header.querySelector('.logo-mobile');
    if (mobileLogo) {
        mobileLogo.addEventListener('click', () => {
            // Mueve el foco a la app (siempre es el primer elemento enfocable al volver a HOME)
            appInstance._mostrarNivel(data.ROOT_LEVEL_ID);
        });
    }

    // e) Click en el botón 'Volver' del header móvil
    if (appInstance.DOM.mobileBackHeader) {
        appInstance.DOM.mobileBackHeader.addEventListener('click', appInstance._handleVolverClick.bind(appInstance));
    }
}

/**
 * Función que maneja el click en la vista de navegación.
 */
function _handleNavClick(e) {
    // 'this' es la instancia de App
    const card = e.target.closest('.curso-card');
    if (card && !card.classList.contains('card-placeholder')) {
        const id = card.getAttribute('data-id');
        this._handleCardClick(id);
    }
}

/**
 * Manejador global del evento focusin para aplicar el estado visual 
 * de enfoque/desenfoque en la vista de detalle.
 */
function _setupDetailFocusHandler(e) {
    // 'this' es la instancia de App
    if (this.DOM.vistaDetalle.classList.contains('active') || this.DOM.vistaDetalleMobile.classList.contains('active')) {
        // ⭐️ DELEGACIÓN AL NUEVO HANDLER CENTRALIZADO ⭐️
        nav_base_details._updateDetailFocusState(e.target, this);
    }
}

/**
 * Maneja el click del botón "Volver" (funciona tanto para Desktop como para Mobile)
 */
export function _handleVolverClick() {
    // 'this' es la instancia de App
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Click en Volver, pila:', this.STATE.navigationStack.length);
    
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    if (this.STATE.navigationStack.length > 1) {
        // Pop the current level to get the previous one
        this.stackPop(); 
        const previousLevelState = this.stackGetCurrent();
        
        if (previousLevelState) {
            this._mostrarNivel(previousLevelState.levelId, previousLevelState.cardIndex);
        } else {
             // Debería ser imposible si la pila > 1, pero por seguridad, volver al inicio
             this._mostrarNivel(data.ROOT_LEVEL_ID);
        }
        
    } else {
        // Si estamos en el primer nivel (ROOT) y queremos volver, 
        // significa que estamos en la vista de detalle. 
        // Volvemos a la vista de navegación (ROOT).
        this._mostrarNivel(data.ROOT_LEVEL_ID);
    }
    
    // En móvil, mover el foco a la primera tarjeta del nuevo nivel si es posible
    if (isMobile) {
        setTimeout(() => {
            const firstCard = this.DOM.vistaNavMobile.querySelector('.card:not(.card-placeholder)');
            if (firstCard) {
                firstCard.focus();
            }
        }, 100); 
    }
}


/**
 * Maneja el evento de redimensionamiento de la ventana.
 * Necesario para cambiar dinámicamente entre layout móvil/desktop.
 */
function _handleResize() {
    // 'this' es la instancia de App
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    
    if (isMobile !== this.STATE.isMobile) {
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Cambio de layout:', isMobile ? 'Mobile' : 'Desktop');
        this.STATE.isMobile = isMobile;
        
        // Re-renderizar el nivel actual para aplicar el layout y DOM correctos
        const currentState = this.stackGetCurrent();
        if (currentState) {
             // Llama a _mostrarNivel, que internamente llamará a _initCarousel_Nav si es necesario.
             this._mostrarNivel(currentState.levelId, currentState.cardIndex);
        }
    }
    
    // Asegurar que el Swiper de navegación se actualiza en cualquier redimensionamiento
    if (this.STATE.navCarouselInstance) {
        this.STATE.navCarouselInstance.update();
        
        // ⭐️ Asegurar que el Swiper de Detalle se actualiza ⭐️
        if (this.STATE.detailCarouselInstance) {
             this.STATE.detailCarouselInstance.update();
        }
    }
}

// --- code/nav-base.js ---