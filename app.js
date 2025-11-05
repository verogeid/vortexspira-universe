// --- app.js ---

(function() {

  const App = {
    // --- 1. PROPIEDADES ---
    DOM: {}, 
    STATE: {
      fullData: null,
      navStack: [],
      itemsPorColumna: 3
    },

    // --- 2. INICIALIZACIÓN ---
    async init() {
      console.log("App: Iniciando...");
      
      // 2.1. Cachear el DOM (MÁS ELEMENTOS)
      this.DOM.track = document.getElementById('track-navegacion');
      this.DOM.btnVolverNav = document.getElementById('btn-volver-navegacion');
      
      // Vistas
      this.DOM.vistaNav = document.getElementById('vista-navegacion');
      this.DOM.vistaDetalle = document.getElementById('vista-detalle');
      
      // Detalle
      this.DOM.detalleContenido = document.getElementById('detalle-contenido');
      this.DOM.btnVolverDetalle = document.getElementById('btn-volver-a-navegacion');

      // 2.2. Cargar los datos
      try {
        await this.loadData();
      } catch (error) {
        console.error("Error fatal al cargar datos:", error);
        this.DOM.track.innerHTML = "<p>Error al cargar el contenido.</p>";
        return;
      }

      // 2.3. Renderizar el estado inicial
      this.renderNavegacion();

      // 2.4. Configurar listeners (NUEVO)
      this.setupListeners();
    },

    // --- 3. CARGA DE DATOS ---
    async loadData() {
      try {
        const response = await fetch('./cursos.json'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.STATE.fullData = await response.json();
      } catch (e) {
        console.error("No se pudo cargar 'cursos.json'", e);
        throw e;
      }
    },

    // --- 4. RENDERIZADO PRINCIPAL (MODIFICADO) ---
    renderNavegacion() {
      console.log("Renderizando nivel:", this.STATE.navStack);

      let itemsARenderizar = [];
      
      if (this.STATE.navStack.length === 0) {
        // --- Estamos en la RAÍZ ---
        itemsARenderizar = this.STATE.fullData.navegacion;
      } else {
        // --- Estamos en un SUBNIVEL ---
        // Obtenemos el ID del nivel actual (el último del stack)
        const idNodoActual = this.STATE.navStack[this.STATE.navStack.length - 1];
        // Buscamos ese nodo en TODO el árbol
        const nodoActual = this._findNodoById(idNodoActual, this.STATE.fullData.navegacion);
        
        if (nodoActual) {
          // Juntamos subsecciones y cursos en una sola lista.
          // Esto maneja automáticamente nodos puros e híbridos.
          itemsARenderizar = [
            ...(nodoActual.subsecciones || []),
            ...(nodoActual.cursos || [])
          ];
        }
      }

      // 4.2. Vaciar el track
      this.DOM.track.innerHTML = '';
      let html = '';

      // 4.3. Generar HTML para cada nodo
      for (const item of itemsARenderizar) {
        const estaActivo = this._tieneContenidoActivo(item.id);
        html += this._generarTarjetaHTML(item, estaActivo);
      }

      // 4.4. Insertar en el DOM
      this.DOM.track.innerHTML = html;

      // 4.5. Gestionar el botón "Volver"
      this.DOM.btnVolverNav.style.display = this.STATE.navStack.length > 0 ? 'block' : 'none';
      
      // 4.6. (PENDIENTE) Resetear scroll del carrusel
      // Cada vez que renderizamos, el carrusel debe volver al inicio
      this.DOM.track.style.transform = 'translateX(0px)';
    },

    // --- 5. SETUP LISTENERS (NUEVA SECCIÓN) ---
    setupListeners() {
      // 5.1. Listener para el track (usamos delegación de eventos)
      // Escuchamos en el 'track' y averiguamos qué 'card' se clicó.
      this.DOM.track.addEventListener('click', this._handleTrackClick.bind(this));
      
      // 5.2. Listener para "Volver" en Navegación
      this.DOM.btnVolverNav.addEventListener('click', this._handleVolverNav.bind(this));

      // 5.3. Listener para "Volver" en Detalle
      this.DOM.btnVolverDetalle.addEventListener('click', this._handleVolverDetalle.bind(this));

      // 5.4. Listener para tecla Escape (global)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          // Si estamos viendo un detalle, volvemos a la navegación
          if (this.DOM.vistaDetalle.classList.contains('active')) {
            this._handleVolverDetalle();
          } 
          // Si estamos en un subnivel, volvemos al nivel anterior
          else if (this.STATE.navStack.length > 0) {
            this._handleVolverNav();
          }
        }
      });
    },

    // --- 6. HANDLERS DE EVENTOS (NUEVA SECCIÓN) ---
    _handleTrackClick(e) {
      // e.target es el elemento exacto (podría ser el <h3>)
      // .closest() busca el ancestro '.card' más cercano
      const tarjeta = e.target.closest('.card');
      
      // Si no se clicó una tarjeta o está deshabilitada, no hacer nada
      if (!tarjeta || tarjeta.classList.contains('disabled')) {
        return;
      }

      const id = tarjeta.dataset.id;
      const tipo = tarjeta.dataset.tipo;

      if (tipo === 'categoria') {
        // --- NAVEGAR: Bajar un nivel ---
        this.STATE.navStack.push(id);
        this.renderNavegacion();
      } else if (tipo === 'curso') {
        // --- MOSTRAR DETALLE ---
        this._mostrarDetalle(id);
      }
    },

    _handleVolverNav() {
      // Sube un nivel en la navegación
      if (this.STATE.navStack.length > 0) {
        this.STATE.navStack.pop(); // Saca el último ID del stack
        this.renderNavegacion();
      }
    },

    _mostrarDetalle(cursoId) {
      // Busca el nodo del curso en todo el árbol
      const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion);
      
      if (!curso) {
        console.error("No se encontró el curso con ID:", cursoId);
        return;
      }

      // Generar HTML para los enlaces
      let enlacesHtml = (curso.enlaces || []).map(enlace => 
        `<a href="${enlace.url || '#'}" class="enlace-curso" target="_blank">${enlace.texto}</a>`
      ).join('');

      // Poblar el contenido del detalle
      this.DOM.detalleContenido.innerHTML = `
        <h2>${curso.titulo}</h2>
        <p>${curso.descripcion || 'No hay descripción disponible.'}</p>
        <div class="enlaces-curso">
          ${enlacesHtml || 'No hay enlaces para este curso.'}
        </div>
      `;

      // Cambiar de vista
      this.DOM.vistaNav.classList.remove('active');
      this.DOM.vistaDetalle.classList.add('active');
    },

    _handleVolverDetalle() {
      // Vuelve de la vista de detalle a la de navegación
      this.DOM.vistaDetalle.classList.remove('active');
      this.DOM.vistaNav.classList.add('active');
      // No modificamos el navStack, para que siga donde estaba
    },

    // --- 7. HELPERS (Funciones auxiliares) ---

    // (Helper _findNodoById - Extraído y mejorado)
    _findNodoById(id, nodos) {
      if (!nodos) return null;
      for (const n of nodos) {
        if (n.id === id) return n;
        
        // Buscar recursivamente en subsecciones
        if (n.subsecciones && n.subsecciones.length > 0) {
          const encontrado = this._findNodoById(id, n.subsecciones);
          if (encontrado) return encontrado;
        }
        // Buscar recursivamente en cursos (para IDs de cursos)
        if (n.cursos && n.cursos.length > 0) {
          const encontrado = this._findNodoById(id, n.cursos);
          if (encontrado) return encontrado;
        }
      }
      return null; // No encontrado
    },
    
    _tieneContenidoActivo(nodoId) {
      // Ahora usa el helper genérico
      const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
      if (!nodo) return false;

      // 1. Condición base: Si este nodo tiene cursos (y es un curso en sí)
      if (nodo.cursos && nodo.cursos.length > 0) {
        return true;
      }
      // Si es un curso (tiene 'titulo') ya es contenido activo
      if (nodo.titulo) {
        return true;
      }
      
      // 2. Condición base: No tiene cursos Y no tiene subsecciones
      if ((!nodo.subsecciones || nodo.subsecciones.length === 0) &&
          (!nodo.cursos || nodo.cursos.length === 0)) {
        return false;
      }
      
      // 3. Condición recursiva: Comprobar hijos
      return nodo.subsecciones.some(subseccion => 
        this._tieneContenidoActivo(subseccion.id)
      );
    },

    _generarTarjetaHTML(nodo, estaActivo) {
      const claseDisabled = estaActivo ? '' : 'disabled';
      const tagAria = estaActivo ? '' : 'aria-disabled="true"';
      const tabindex = estaActivo ? '0' : '-1';
      
      // Un nodo es "categoría" si tiene 'subsecciones' o 'nombre' (es una sección)
      // Si tiene 'titulo', es un "curso"
      const tipoData = (nodo.subsecciones || nodo.nombre) && !nodo.titulo
                       ? 'data-tipo="categoria"' 
                       : 'data-tipo="curso"';

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
          
          <h3>${nodo.nombre || nodo.titulo}</h3>
          ${hint}
        </div>
      `;
    }
  };

  // --- 8. PUNTO DE ENTRADA ---
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

})();
