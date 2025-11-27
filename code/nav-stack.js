// --- code/nav-stack.js (MODULARIZADO) ---

import * as debug from './debug.js';

/**
 * Inicializa la pila de navegación con el nivel raíz.
 * Se llama con .call(this) desde la instancia de VortexSpiraApp.
 */
export function stackInitialize() {
    this.STATE.historyStack = [
        { levelId: null, focusIndex: 0 } // Nivel raíz
    ];
    debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, 'Pila de navegación inicializada.');
};

/**
 * Obtiene el estado del nivel actual (el último de la pila).
 */
export function stackGetCurrent() {
    if (this.STATE.historyStack.length === 0) {
        debug.logError('nav_stack', 'La pila está vacía. Inicializando.');
        this.stackInitialize();
    }
    return this.STATE.historyStack[this.STATE.historyStack.length - 1];
};

/**
 * Sube un nivel (maneja la acción de "Volver").
 */
export function stackPop() {
    if (this.STATE.historyStack.length <= 1) {
        debug.logWarn('nav_stack', 'Intento de pop en el nivel raíz.');
        return null; // No se puede sacar el raíz
    }
    this.STATE.historyStack.pop(); 
    debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, `Nivel popeado. Profundidad actual: ${this.STATE.historyStack.length}`);
    return this.stackGetCurrent(); 
};

/**
 * Entra en un nuevo nivel (al hacer clic en una categoría).
 */
export function stackPush(newLevelId, currentFocusIndex) {
    const currentLevel = this.stackGetCurrent();
    if (currentLevel) {
        currentLevel.focusIndex = currentFocusIndex;
        debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, `Guardando foco ${currentFocusIndex} para nivel ${currentLevel.levelId}`);
    }
    
    this.STATE.historyStack.push({
        levelId: newLevelId,
        focusIndex: 0 // El nuevo nivel siempre empieza con foco en 0
    });
    debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, `Nivel pusheado: ${newLevelId}. Profundidad actual: ${this.STATE.historyStack.length}`);
};

/**
 * Actualiza el índice de foco del nivel ACTIVO actual.
 */
export function stackUpdateCurrentFocus(newFocusIndex) {
    const currentLevel = this.stackGetCurrent();
    if (currentLevel) {
        currentLevel.focusIndex = newFocusIndex;
    }
};

/**
 * (Para Query Params) Busca un nodo y construye la pila de historial hasta él.
 */
export function stackBuildFromId(targetId, fullData) {
    if (!targetId || !fullData || !fullData.navegacion) {
        return false;
    }

    let path = []; 
    
    // Helper recursivo para encontrar el path
    function findPath(nodes, currentPath) {
        if (!nodes) return false;

        for (const node of nodes) {
            const newPath = [...currentPath, node];
            
            if (node.id === targetId) {
                path = newPath;
                return true;
            }
            
            if (node.cursos && node.cursos.find(c => c.id === targetId)) {
                path = newPath; 
                return true;
            }

            if (node.subsecciones && findPath(node.subsecciones, newPath)) {
                return true;
            }
        }
        return false;
    }

    if (findPath(fullData.navegacion, [])) {
        const newStack = [];
        
        // Nivel raíz (siempre presente)
        newStack.push({ levelId: null, focusIndex: 0 }); 
        
        for (const node of path) {
            newStack.push({ levelId: node.id, focusIndex: 0 });
        }
        
        this.STATE.historyStack = newStack;
        debug.log('nav_stack', debug.DEBUG_LEVELS.IMPORTANT, `Pila reconstruida desde ID "${targetId}". Profundidad: ${newStack.length}`);
        return true;
    }

    debug.logWarn('nav_stack', `No se pudo construir la pila para el ID "${targetId}".`);
    return false;
};