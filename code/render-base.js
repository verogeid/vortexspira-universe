// --- code/render-base.js ---

import * as data from './data.js';
import * as debug from './debug.js';
import * as render_swipe from './render-swipe.js';
import * as render_mobile from './render-mobile.js';

/**
 * Carga los datos de la aplicación.
 * @returns {Promise<void>}
 */
export async function _loadData() {
    // 'this' es la instancia de App
    try {
        const response = await fetch('data/cursos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.STATE.fullData = await response.json();
        debug.log('render_base', debug.DEBUG_LEVELS.BASIC, 'Datos cargados correctamente.');
    } catch (e) {
        debug.log('render_base', debug.DEBUG_LEVELS.ERROR, 'Error al cargar los datos:', e);
        // Manejar error fatal aquí (ej. mostrar mensaje al usuario)
    }
}

/**
 * Inicializa el estado visual base y prepara el DOM.
 */
export function _init() {
    // 'this' es la instancia de App
    
    // ⭐️ CORRECCIÓN: Referencias DOM para el layout dinámico ⭐️
    // Se asegura que las referencias DOM apunten a los contenedores principales y específicos.
    this.DOM.vistaDetalle = document.getElementById('vista-detalle-desktop');
    this.DOM.detalleContenido = document.getElementById('detalle-contenido-desktop');
    // Referencia al nuevo contenedor de detalle móvil
    this.DOM.vistaDetalleMobile = document.getElementById('vista-detalle-mobile'); 
    
    // Inicializar vistas con la clase base (invisible)
    this.DOM.vistaNav.classList.add('view-base');
    this.DOM.vistaDetalle.classList.add('view-base');
    this.DOM.vistaDetalleMobile.classList.add('view-base');
    
    // Determinar la vista activa inicial
    const activeView = this.STATE.isMobile ? this.DOM.vistaNavMobile : this.DOM.vistaNav;
    activeView.classList.add('active');
    
    // El ResizeObserver está ahora en nav-base.js
}

/**
 * Busca un nodo (categoría o curso) por su ID.
 * @param {string} id - ID del nodo.
 * @param {object} [currentLevel=this.STATE.fullData] - Nodo desde donde empezar la búsqueda.
 * @returns {object|null} El nodo encontrado o null.
 */
export function _findNodoById(id, currentLevel = this.STATE.fullData) {
    if (!currentLevel) return null;
    if (currentLevel.id === id) return currentLevel;

    if (currentLevel.children) {
        for (const child of currentLevel.children) {
            const found = this._findNodoById(id, child);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Renderiza y muestra el nivel de navegación especificado, o la vista de detalle.
 * @param {string} levelId - ID del nodo a mostrar (categoría o curso).
 * @param {number} [cardIndexToFocus=0] - Índice de la tarjeta a la que hacer scroll/foco.
 */
export function _mostrarNivel(levelId, cardIndexToFocus = 0) {
    // 'this' es la instancia de App
    if (this.STATE.isInitializing) return;
    
    // 1. Encontrar el nodo
    const node = this._findNodoById(levelId);
    if (!node) {
        debug.log('render_base', debug.DEBUG_LEVELS.WARNING, `Nodo no encontrado para ID: ${levelId}`);
        return;
    }
    
    debug.log('render_base', debug.DEBUG_LEVELS.BASIC, `Mostrando nivel: ${node.id} (${node.title})`);

    // 2. Limpiar vistas y estados previos
    this.DOM.vistaNav.classList.remove('active');
    this.DOM.vistaNavMobile.classList.remove('active');
    this._resetVistaDetalle(); 
    
    // 3. Determinar si es una vista de detalle
    if (node.isDetail) {
        // Es un curso. Mostrar detalle.
        // ⭐️ ACTUALIZACIÓN: Guardar el ID del curso activo ⭐️
        this.STATE.activeCourseId = node.id; 
        this._mostrarDetalle(node);
        return;
    }
    
    // 4. Es una vista de navegación (menú)
    
    // ⭐️ ACTUALIZACIÓN: Limpiar el ID del curso activo ⭐️
    this.STATE.activeCourseId = null; 
    
    this.STATE.currentLevel = levelId;
    
    // 5. Renderizar y activar la vista correcta (Desktop vs Mobile)
    if (this.STATE.isMobile) {
        render_mobile._renderNavegacionMobile.call(this, node, cardIndexToFocus);
        this.DOM.vistaNavMobile.classList.add('active');
        // Actualizar el header móvil (no lo mostramos aquí pero la lógica debe estar delegada)
        render_mobile._updateMobileHeader(this, node);
        
    } else {
        render_swipe._renderNavegacionDesktop.call(this, node);
        this.DOM.vistaNav.classList.add('active');
    }
    
    // 6. Actualizar la pila de navegación
    this.stackPush(levelId, cardIndexToFocus); 
}

/**
 * Maneja el clic en una tarjeta de navegación.
 * @param {string} id - ID del nodo clicado.
 */
export function _handleCardClick(id) {
    // 'this' es la instancia de App
    const node = this._findNodoById(id);
    if (!node) return;

    if (node.isDetail) {
        // ⭐️ ACTUALIZACIÓN: Guardar el ID del curso activo ⭐️
        this.STATE.activeCourseId = node.id; 
        this._mostrarDetalle(node);
    } else {
        this._mostrarNivel(id);
    }
}

/**
 * Limpia la vista de detalle y oculta el botón "Volver" fijo.
 */
export function _resetVistaDetalle() {
    // 'this' es la instancia de App
    
    // Limpiar clases de actividad
    this.DOM.vistaDetalle.classList.remove('active');
    this.DOM.vistaDetalleMobile.classList.remove('active');
    
    // ⭐️ Limpiar contenido de los contenedores de detalle ⭐️
    this.DOM.detalleContenido.innerHTML = '';
    
    // Destruir instancia del Swiper si existe
    if (this.STATE.detailCarouselInstance) {
        this.STATE.detailCarouselInstance.destroy(true, true);
        this.STATE.detailCarouselInstance = null;
    }
    
    // Ocultar card de volver fija
    this.DOM.cardVolverFija.classList.remove('visible');
    
    // Limpiar estado de foco
    this.STATE.lastDetailFocusIndex = 0;
}

// --- code/render-base.js ---