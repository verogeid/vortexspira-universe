// --- code/nav-base.js ---

import * as debug from './debug.js';
import * as data from './data.js';

/**
 * Maneja el clic en una tarjeta de nivel/curso.
 * @param {Event} event - Evento de clic.
 */
export function _handleCardClick(event) {
    // 'this' es la instancia de App
    let target = event.target.closest('[data-id]');
    
    if (!target) return;

    // Si el elemento es una acción, no es un cambio de nivel/curso
    if (target.classList.contains('detail-action-item')) {
        return;
    }

    const cardId = target.getAttribute('data-id');
    const cardType = target.getAttribute('data-tipo');
    
    if (!cardId || cardType === 'relleno' || cardType === 'header') return;

    // Guardar el foco antes de cambiar de vista
    this.STATE.lastFocusCard = target;

    if (cardType === 'curso') {
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, `Navegando a detalle de curso: ${cardId}`);
        // Guarda el estado actual de la navegación antes de ir al detalle
        this.stackPush(this.STATE.activeLevelId, target.tabIndex);
        this.STATE.activeCourseId = cardId;
        this._mostrarDetalle(cardId); // Método delegado
    } else {
        // Es una categoría/subsección
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, `Navegando a nivel: ${cardId}`);
        this.stackPush(this.STATE.activeLevelId, target.tabIndex);
        this._mostrarNivel(cardId); // Método delegado
    }
}


/**
 * Maneja el evento de 'Volver' desde cualquier vista.
 */
export function _handleVolverClick() {
    // 'this' es la instancia de App
    const isMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const isTablet = window.innerWidth >= data.TABLET_MIN_WIDTH && window.innerWidth <= data.TABLET_MAX_WIDTH;
    
    if (this.DOM.vistaDetalle.classList.contains('active')) {
        // Salir de detalle y volver al nivel de navegación
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Saliendo de la vista de detalle.');
        this._resetVistaDetalle(); // Limpia la vista de detalle
        
        // El estado de navegación actual es el estado ANTERIOR a la apertura del detalle
        const previousLevelState = this.stackGetCurrent(); 
        
        if (previousLevelState) {
            // ⭐️ CORRECCIÓN: Usar _mostrarNivel ⭐️
            this._mostrarNivel(previousLevelState.levelId, previousLevelState.cardIndex);
        } else {
             this._mostrarNivel(data.ROOT_LEVEL_ID);
        }
        
        this.STATE.activeCourseId = null; 
        
    } 
    else if (this.STATE.historyStack.length > 1) { 
        // Volver un nivel en la navegación
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Volviendo un nivel.');
        this.stackPop(); // Método delegado
        
        const previousLevelState = this.stackGetCurrent();
        
        if (previousLevelState) {
            // ⭐️ CORRECCIÓN: Usar _mostrarNivel ⭐️
            this._mostrarNivel(previousLevelState.levelId, previousLevelState.cardIndex);
        }
        
         // Manejar el foco después de volver
         if (!isMobile && !isTablet && this.DOM.cardVolverFijaElemento && this.DOM.cardVolverFijaElemento.classList.contains('visible')) { 
             this.DOM.cardVolverFijaElemento.focus();
         } else if (isMobile || isTablet) {
             // En móvil/tablet, intentar enfocar la primera tarjeta
             const firstCard = this.DOM.track.querySelector('[data-id]:not([data-tipo="relleno"])');
             if (firstCard) firstCard.focus();
         }
    } else {
         debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 'Volver bloqueado: Ya estamos en el nivel raíz.');
    }
}

/**
 * Maneja el evento de redimensionamiento de ventana.
 */
export function _handleResize() {
    // 'this' es la instancia de App
    const newIsMobile = window.innerWidth <= data.MOBILE_MAX_WIDTH;
    const newIsTablet = window.innerWidth >= data.TABLET_MIN_WIDTH && window.innerWidth <= data.TABLET_MAX_WIDTH;
    
    if (this.STATE.isMobile !== newIsMobile || this.STATE.isTablet !== newIsTablet) {
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, `Cambio de modo de vista: Mobile=${newIsMobile}, Tablet=${newIsTablet}`);
        
        this.STATE.isMobile = newIsMobile;
        this.STATE.isTablet = newIsTablet;

        // Limpiar el carrusel de navegación si existe
        this._destroyCarousel(); 
        
        // Re-renderizar el nivel actual (el segundo argumento fuerza el reset de la vista)
        const currentLevelState = this.stackGetCurrent() || { levelId: data.ROOT_LEVEL_ID };
        this._mostrarNivel(currentLevelState.levelId, currentLevelState.cardIndex);
        
        // Si estábamos en detalle, re-renderizar detalle para aplicar estilos correctos
        if (this.STATE.activeCourseId) {
            this._mostrarDetalle(this.STATE.activeCourseId);
        }
    }
}


// ⭐️ FUNCIÓN MOVIDA DE RENDER-BASE.JS ⭐️
/**
 * Busca un nodo (categoría o curso) por su ID dentro de la estructura de navegación.
 * @param {string} id - ID del nodo.
 * @param {object} nodos - Array de nodos (subsecciones o cursos) desde donde empezar la búsqueda.
 * @returns {object|null} El nodo encontrado o null.
 */
export function _findNodoById(id, nodos = this.STATE.fullData.navegacion.subsecciones) {
    // 'this' es la instancia de App
    if (!nodos || !id) return null;
    
    for (const n of nodos) {
        if (n.id === id) return n;
        
        // Búsqueda recursiva en subsecciones (si existen)
        if (n.subsecciones && n.subsecciones.length > 0) {
            // ⭐️ CORRECCIÓN RECURSIVA: Debe usar this._findNodoById (la versión delegada) ⭐️
            const encontrado = this._findNodoById(id, n.subsecciones); 
            if (encontrado) return encontrado;
        }
        
        // Búsqueda en cursos (si existen)
        if (n.cursos && n.cursos.length > 0) {
            const cursoEncontrado = n.cursos.find(c => c.id === id);
            if (cursoEncontrado) return cursoEncontrado;
        }
    }
    return null;
}

// --- code/nav-base.js ---