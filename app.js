// --- app.js ---

// Usamos un IIFE (Immediately Invoked Function Expression) 
// para no contaminar el scope global.
(function() {

  const App = {
    // --- 1. PROPIEDADES ---
    DOM: {}, // Para guardar referencias al DOM
    STATE: {
      fullData: null,   // Aquí guardaremos el JSON completo
      navStack: [],     // Pila de navegación (historial)
      itemsPorColumna: 3 // Valor por defecto (luego será responsive)
    },

    // --- 2. INICIALIZACIÓN ---
    async init() {
      console.log("App: Iniciando...");
      
      // 2.1. Cachear el DOM
      this.DOM.track = document.getElementById('track-navegacion');
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion');
      // (Cachearemos más elementos a medida que los necesitemos)

      // 2.2. Cargar los datos
      try {
        await this.loadData();
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        this.DOM.track.innerHTML = "<p>Error al cargar el contenido.</p>";
        return; // No podemos continuar si los datos fallan
      }

      // 2.3. Renderizar el estado inicial (nivel raíz)
      this.renderNavegacion();

      // 2.4. Configurar listeners (próximo paso)
      // this.setupListeners();
    },

    // --- 3. CARGA DE DATOS ---
    async loadData() {
      try {
        const response = await fetch('./cursos.json'); // Asume que está en la misma carpeta
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.STATE.fullData = await response.json();
        console.log("Datos cargados:", this.STATE.fullData);
      } catch (e) {
        console.error("No se pudo cargar 'cursos.json'", e);
        throw e; // Relanza el error para que init() lo capture
      }
    },

    // --- 4. RENDERIZADO PRINCIPAL ---
    renderNavegacion() {
      console.log("Renderizando nivel:", this.STATE.navStack);

      // 4.1. Determinar qué nodos mostrar
      let nodosARenderizar = [];
      
      if (this.STATE.navStack.length === 0) {
        // Estamos en la RAÍZ. Mostramos las secciones principales.
        nodosARenderizar = this.STATE.fullData.navegacion;
      } else {
        // Estamos en un SUBNIVEL. (Esto lo implementaremos al manejar el clic)
        // nodoActual = this.findNodo(this.STATE.navStack[this.STATE.navStack.length - 1]);
        // nodosARenderizar = nodoActual.subsecciones;
        // ...y aquí iría la lógica de nodos híbridos.
        console.log("Lógica de subnivel pendiente.");
      }

      // 4.2. Vaciar el track
      this.DOM.track.innerHTML = '';
      let html = '';

      // 4.3. Generar HTML para cada nodo
      for (const nodo of nodosARenderizar) {
        // Comprobar recursivamente si tiene contenido
        const estaActivo = this._tieneContenidoActivo(nodo.id);
        
        // Generar la tarjeta (HTML)
        html += this._generarTarjetaHTML(nodo, estaActivo);
      }

      // 4.4. Insertar en el DOM
      this.DOM.track.innerHTML = html;

      // 4.5. Gestionar el botón "Volver"
      this.DOM.btnVolverNav.style.display = this.STATE.navStack.length > 0 ? 'block' : 'none';

      // 4.6. (PENDIENTE) Aquí iría la inicialización del carrusel (Swiper, etc.)
      // y la lógica de foco.
    },

    // --- 5. HELPERS (Funciones auxiliares) ---

    /**
     * Comprueba recursivamente si un nodo (y sus descendientes) tiene cursos.
     * @param {string} nodoId - El ID del nodo a comprobar (ej: 's-03')
     * @returns {boolean} - true si tiene contenido, false si no.
     */
    _tieneContenidoActivo(nodoId) {
      // Función auxiliar interna para buscar en el árbol
      const findNodo = (id, nodos) => {
        if (!nodos) return null;
        for (const n of nodos) {
          if (n.id === id) return n;
          if (n.subsecciones && n.subsecciones.length > 0) {
            const encontrado = findNodo(id, n.subsecciones);
            if (encontrado) return encontrado;
          }
        }
        return null; // No encontrado
      };

      const nodo = findNodo(nodoId, this.STATE.fullData.navegacion);
      if (!nodo) return false;

      // 1. Condición base: Si este nodo tiene cursos, está ACTIVO.
      if (nodo.cursos && nodo.cursos.length > 0) {
        return true;
      }
      
      // 2. Condición base: No tiene cursos Y no tiene subsecciones, está INACTIVO.
      if (!nodo.subsecciones || nodo.subsecciones.length === 0) {
        return false;
      }
      
      // 3. Condición recursiva: No tiene cursos, pero tiene subsecciones.
      // Debe comprobar si *alguna* ('some') de sus subsecciones está activa.
      return nodo.subsecciones.some(subseccion => 
        this._tieneContenidoActivo(subseccion.id)
      );
    },

    /**
     * Genera el string HTML para una tarjeta.
     * @param {object} nodo - El objeto del nodo (sección, subsección o curso)
     * @param {boolean} estaActivo - Si la tarjeta debe estar habilitada
     * @returns {string} - El string HTML
     */
    _generarTarjetaHTML(nodo, estaActivo) {
      const claseDisabled = estaActivo ? '' : 'disabled';
      const tagAria = estaActivo ? '' : 'aria-disabled="true"';
      const tabindex = estaActivo ? '0' : '-1'; // Controla el foco de teclado
      
      // Determina si es una "categoría" (navega más) o un "curso" (muestra detalle)
      const esCategoria = (nodo.subsecciones && nodo.subsecciones.length > 0) || 
                          (nodo.cursos && nodo.cursos.length > 0 && !nodo.titulo);
      
      const tipoData = esCategoria ? 'data-tipo="categoria"' : 'data-tipo="curso"';

      let hint = '';
      if (!estaActivo) {
        hint = '<span>(Próximamente)</span>';
      }

      return `
        <div class="card ${claseDisabled}" 
             data-id="${nodo.id}" 
             ${tipoData}
             role="button" 
             tabindex="${tabindex}" 
             ${tagAria}>
          
          <h3>${nodo.nombre || nodo.titulo}</h3> ${hint}
        </div>
      `;
    }
  };

  // --- 6. PUNTO DE ENTRADA ---
  // Esperar a que el DOM esté completamente cargado para iniciar la app
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

})();
