/* --- code/nav-stack.js --- */

import * as debug from './debug.js';

/**
 * Inicializa la pila de navegación con el nivel raíz.
 * Cambiamos focusIndex por focusId para persistencia robusta.
 */
export function stackInitialize() {
    this.STATE.historyStack = [
        { levelId: null, focusId: null } 
    ];
    debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, 
                'Pila de navegación inicializada (Mode: ID).');
};

export function stackGetCurrent() {
    if (!this.STATE.historyStack || this.STATE.historyStack.length === 0) {
        debug.logError('nav_stack', 'La pila está vacía. Inicializando.');

        this.stackInitialize();
    }
    return this.STATE.historyStack[this.STATE.historyStack.length - 1];
};

export function stackPop() {
    if (this.STATE.historyStack.length <= 1) {
        debug.logWarn('nav_stack', 'Intento de pop en el nivel raíz.');

        return null;
    }
    this.STATE.historyStack.pop(); 

    debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, 
                `Nivel popeado. Profundidad actual: ${this.STATE.historyStack.length}`);

    return this.stackGetCurrent(); 
};

/**
 * Entra en un nuevo nivel.
 * Ya no necesita el índice actual, porque se asume guardado por stackUpdateCurrentFocus previamente.
 */
export function stackPush(newLevelId) {
    const currentLevel = this.stackGetCurrent();
    
    if (currentLevel && currentLevel.levelId === newLevelId) {
        debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, 
                    `PUSH RECHAZADO: Ya estás en el nivel "${newLevelId}".`);

        return; 
    }
    
    // El nuevo nivel comienza sin foco específico (se resolverá a 0 en el render)
    this.STATE.historyStack.push({
        levelId: newLevelId,
        focusId: null 
    });

    debug.log('nav_stack', debug.DEBUG_LEVELS.BASIC, 
                `Nivel pusheado: ${newLevelId}.`);
};

/**
 * Actualiza el ID del elemento enfocado en el nivel actual.
 * @param {string} focusId - El data-id de la tarjeta enfocada.
 */
export function stackUpdateCurrentFocus(focusId) {
    const currentLevel = this.stackGetCurrent();
    if (currentLevel) {
        currentLevel.focusId = focusId;
    }
};

/**
 * Reconstruye la pila para Deep Linking usando IDs.
 */
export function stackBuildFromId(targetId, fullData) {
    if (!targetId || !fullData || !fullData.navegacion) return false;

    let path = []; 
    function findPath(nodes, currentPath) {
        if (!nodes) return false;
        for (const node of nodes) {
            const newPath = [...currentPath, node];
            if (node.id === targetId || (node.cursos && node.cursos.find(c => c.id === targetId))) {
                path = newPath;
                return true;
            }
            if (node.subsecciones && findPath(node.subsecciones, newPath)) return true;
        }
        return false;
    }

    if (findPath(fullData.navegacion, [])) {
        // Reconstruimos la pila asignando a cada nivel el focusId que lleva al siguiente
        const newStack = [{ 
            levelId: null, 
            focusId: path.length > 0 ? path[0].id : null 
        }];

        for (let i = 0; i < path.length; i++) {
            const node = path[i];
            const nextNode = path[i+1]; // El nodo hijo que será el foco en este nivel
            
            newStack.push({ 
                levelId: node.id, 
                focusId: nextNode ? nextNode.id : null 
            });
        }
        this.STATE.historyStack = newStack;

        debug.log('nav_stack', debug.DEBUG_LEVELS.DEEP, 
                    `Pila reconstruida por ID: ${newStack.length}`);
                    
        return true;
    }
    return false;
};

// --- code/nav-stack.js ---