# 📚 Documentación para el Mantenedor (VortexSpira UI)

Este documento detalla el propósito y la función de todos los archivos del proyecto para facilitar su mantenimiento y desarrollo futuro.

---

## 1. Archivos de Estructura y Datos

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`index.html`** | **Estructura HTML Principal.** Define la estructura del documento, la importación de todos los archivos CSS/JS y la **estructura Grid** de la aplicación (`#app-container`). | Define los contenedores raíz de las vistas (`#vista-central`, `#card-volver-fija`). |
| **`cursos.json`** | **Fuente de Datos Principal.** Contiene la estructura jerárquica (`navegacion`) de todas las secciones, subsecciones, cursos y sus enlaces. | El contenido de la navegación y el detalle se gestiona aquí. |

---

## 2. Archivos de Lógica (Directorio `code/`)

### A. Núcleo, Flujo y Configuración

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`app.js`** | **Entry Point / Orquestador.** Inicializa la aplicación, el `STATE` global, el *cache* del DOM y delega la ejecución de todos los métodos de alto nivel. | Es la clase principal (`VortexSpiraApp`). |
| **`data.js`** | **Constantes / Configuración.** Define *breakpoints*, URLs, iconos Unicode y la función `loadData()`. |  |
| **`debug.js`** | **Sistema de Logging.** Define niveles de *debug* (`DEBUG_LEVELS`) y las funciones para mostrar mensajes en la consola. | |
| **`i18n.js`** | **Internacionalización.** Contiene las cadenas de texto (`STRINGS`) y las funciones para aplicarlas al DOM. | |
| **`nav-stack.js`** | **Gestión del Historial.** Maneja la pila de navegación, las acciones `stackPush`/`stackPop` y la reconstrucción de la pila por *deep linking*. | |

### B. Navegación y Foco

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`nav-base.js`** | **Manejadores Core de Navegación.** Contiene la lógica para los *clics* en tarjetas, la actualización de foco (`_updateFocusImpl`) y *helpers* de búsqueda. | |
| **`nav-details.js`** | **Lógica de Vista de Detalle.** Maneja la inyección de contenido, el *blur* por proximidad al foco y el *handler* de las filas de acción. | **CRÍTICO:** Define la inyección del emoji `🚫&#xFE0E;` para el botón deshabilitado. |
| **`nav-keyboard-base.js`** | **Controles de Teclado (Base).** Implementa el *listener* principal `keydown`, la navegación por barras laterales y las **trampas de foco (`_handleFocusTrap`)**. | |
| **`nav-keyboard-details.js`** | **Controles de Teclado (Detalle).** Define la navegación secuencial entre fragmentos de texto y botones de acción en la vista de detalle. | |
| **`nav-tactil.js`** | **Control Táctil.** Maneja la detección de dirección de *swipe* y la lógica de *salto* de diapositivas vacías en el carrusel Swiper. | |

### C. Renderizado y Generación de HTML

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`render-base.js`** | **Motor de Renderizado Maestro.** Determina el modo, el *track* activo, y contiene la plantilla base de las tarjetas (`_generarTarjetaHTMLImpl`). | |
| **`render-mobile.js`** | **Renderizado Móvil.** Genera el HTML para la lista vertical, incluyendo elementos *sticky* de la navegación móvil. | |
| **`render-swipe.js`** | **Renderizado Carousel.** Genera el HTML con *wrappers* de Swiper, inicializa la instancia de Swiper y maneja las *slides* de relleno. | |

---

## 3. Archivos de Estilo (Directorio `styles/`)

### A. Estructura y Vistas

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`style-base.css`** | **Capa de Importación.** Archivo principal que importa todos los demás archivos CSS en el orden correcto. | |
| **`style-theme.css`** | **Variables y Theming.** Define todos los colores, variables de *layout* y las reglas para el modo oscuro. | |
| **`style-layout.css`** | **Estructura de Vistas y Grid.** Define el *layout* principal, la asignación de áreas Grid y la visibilidad de las vistas. | |
| **`style-desktop.css`** | Estilos de *layout* para pantallas **> 1025px** (3 columnas). | |
| **`style-tablet.css`** | Estilos de *layout* para pantallas **601px a 1024px** (Maneja 2 y 3 columnas). | |
| **`style-mobile.css`** | Estilos específicos para pantallas **<= 600px**. | Maneja el *scroll* nativo y la vista de detalle *full-screen*. |
| **`style-footer.css`** | Estilos del *Footer* de la aplicación, incluyendo *links* y redes sociales. | |

### B. Componentes

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`style-cards.css`** | **Estilos de Tarjeta (Navegación).** Define el aspecto de las tarjetas (`.card`), el *hover* y los estados *disabled* de la navegación principal. | |
| **`style-components.css`**| Estilos para elementos auxiliares como el *sidebar* fijo (`#card-volver-fija`), la tarjeta de nivel actual y la notificación *Toast*. | |
| **`style-details.css`** | **Estilos de Vista de Detalle (CRÍTICO).** Define el *blur* por proximidad al foco y el estilo de los botones de acción. | **Implementa:** Forma **Cuadrada con bordes redondeados** para `.detail-action-btn.disabled`. |
