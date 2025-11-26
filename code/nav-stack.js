// --- code/nav-stack.js ---
(function() {
    if (!App.STATE) { App.STATE = {}; }

    /**
     * La pila de historial de navegación.
     * Cada elemento es un objeto: { levelId: 'id-o-null', focusIndex: 0 }
     * El 'levelId' es el ID de la categoría (o null para la raíz).
     * El 'focusIndex' es el índice de la tarjeta que tenía foco en ESE nivel.
     */
    App.STATE.historyStack = [];

    /**
     * Inicializa la pila de navegación con el nivel raíz.
     * Debe llamarse al cargar la aplicación.
     */
    App.stackInitialize = function() {
        App.STATE.historyStack = [
            { levelId: null, focusIndex: 0 } // Nivel raíz
        ];
        log('nav_stack', DEBUG_LEVELS.BASIC, 'Pila de navegación inicializada.');
    };

    /**
     * Obtiene el estado del nivel actual (el último de la pila).
     * @returns { {levelId: string|null, focusIndex: number} }
     */
    App.stackGetCurrent = function() {
        if (App.STATE.historyStack.length === 0) {
            logError('nav_stack', 'La pila está vacía. Inicializando.');
            App.stackInitialize();
        }
        return App.STATE.historyStack[App.STATE.historyStack.length - 1];
    };

    /**
     * Sube un nivel (maneja la acción de "Volver").
     * @returns { {levelId: string|null, focusIndex: number} | null } El nivel al que se está VOLVIENDO.
     */
    App.stackPop = function() {
        if (App.STATE.historyStack.length <= 1) {
            logWarn('nav_stack', 'Intento de pop en el nivel raíz.');
            return null; // No se puede sacar el raíz
        }
        App.STATE.historyStack.pop(); // Elimina el nivel actual
        log('nav_stack', DEBUG_LEVELS.BASIC, `Nivel popeado. Profundidad actual: ${App.STATE.historyStack.length}`);
        return App.stackGetCurrent(); // Devuelve el nuevo nivel superior (al que volvemos)
    };

    /**
     * Entra en un nuevo nivel (al hacer clic en una categoría).
     * @param {string} newLevelId - El ID de la categoría a la que se entra.
     * @param {number} currentFocusIndex - El índice de foco que debemos GUARDAR para el nivel actual (el que dejamos).
     */
    App.stackPush = function(newLevelId, currentFocusIndex) {
        // 1. Guardar el foco del nivel actual ANTES de entrar al siguiente
        const currentLevel = App.stackGetCurrent();
        if (currentLevel) {
            currentLevel.focusIndex = currentFocusIndex;
            log('nav_stack', DEBUG_LEVELS.BASIC, `Guardando foco ${currentFocusIndex} para nivel ${currentLevel.levelId}`);
        }
        
        // 2. Añadir el nuevo nivel
        App.STATE.historyStack.push({
            levelId: newLevelId,
            focusIndex: 0 // El nuevo nivel siempre empieza con foco en 0
        });
        log('nav_stack', DEBUG_LEVELS.BASIC, `Nivel pusheado: ${newLevelId}. Profundidad actual: ${App.STATE.historyStack.length}`);
    };

    /**
     * Actualiza el índice de foco del nivel ACTIVO actual.
     * Se usa para (hover, teclado) para que la pila siempre sepa dónde estamos.
     * @param {number} newFocusIndex - El nuevo índice de foco.
     */
    App.stackUpdateCurrentFocus = function(newFocusIndex) {
        const currentLevel = App.stackGetCurrent();
        if (currentLevel) {
            currentLevel.focusIndex = newFocusIndex;
        }
    };

    /**
     * (Para Query Params) Busca un nodo y construye la pila de historial hasta él.
     * @param {string} targetId - El ID del nodo (curso o categoría) a buscar.
     * @param {object} fullData - El árbol de datos completo (App.STATE.fullData).
     * @returns {boolean} - true si se encontró y construyó la pila, false si no.
     */
    App.stackBuildFromId = function(targetId, fullData) {
        if (!targetId || !fullData || !fullData.navegacion) {
            return false;
        }

        let path = []; // Almacenará los nodos del path
        
        // Helper recursivo para encontrar el path
        function findPath(nodes, currentPath) {
            if (!nodes) return false;

            for (const node of nodes) {
                const newPath = [...currentPath, node];
                
                // Caso 1: El nodo actual es el objetivo
                if (node.id === targetId) {
                    path = newPath;
                    return true;
                }
                
                // Caso 2: El objetivo es un curso DENTRO del nodo actual
                if (node.cursos && node.cursos.find(c => c.id === targetId)) {
                    path = newPath; // Nos interesa la categoría padre, no el curso
                    return true;
                }

                // Caso 3: Buscar en subsecciones
                if (node.subsecciones && findPath(node.subsecciones, newPath)) {
                    return true;
                }
            }
            return false;
        }

        // Iniciar búsqueda desde la raíz
        if (findPath(fullData.navegacion, [])) {
            // Construir la pila de historial (`historyStack`) desde el `path` de nodos
            const newStack = [];
            
            // Nivel raíz (siempre presente)
            newStack.push({ levelId: null, focusIndex: 0 }); 
            
            for (const node of path) {
                // El focusIndex se pone a 0 por defecto.
                newStack.push({ levelId: node.id, focusIndex: 0 });
            }
            
            App.STATE.historyStack = newStack;
            log('nav_stack', DEBUG_LEVELS.IMPORTANT, `Pila reconstruida desde ID "${targetId}". Profundidad: ${newStack.length}`);
            return true;
        }

        logWarn('nav_stack', `No se pudo construir la pila para el ID "${targetId}".`);
        return false;
    };

})();
