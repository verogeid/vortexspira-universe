# 📚 Documentación para el Mantenedor (VortexSpira UI)

Este documento detalla el propósito y la función de todos los archivos del proyecto para facilitar su mantenimiento y desarrollo futuro, reflejando la arquitectura orientada a componentes, el enrutamiento tipo SPA y la accesibilidad nivel AAA.

---

## 1. Archivos de Estructura y Datos

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`index.html`** | **Estructura HTML Principal.** Define la estructura base, la importación de scripts modulares, el Grid de la app (`#app-container`) y el HTML del Modal de Accesibilidad (`#a11y-modal-overlay`). | Contiene la precarga (`preload`) de las tipografías de alta legibilidad (Atkinson/Lexend). |
| **`data/cursos_es.json` / `_en.json`** | **Fuente de Datos Principal.** Contiene la jerarquía (`navegacion`) de secciones, subsecciones, cursos y sus enlaces. | Separados por idioma para escalabilidad internacional. |
| **`data/strings_es.json` / `_en.json`** | **Diccionario de Internacionalización.** Textos de la interfaz, etiquetas `aria-label`, mensajes de estado (toast) y locuciones para el *Screen Reader*. | El motor `i18n.js` los inyecta dinámicamente. |

---

## 2. Archivos de Lógica (Directorio `code/`)

### A. Núcleo, Flujo y Configuración

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`app.js`** | **Entry Point / Orquestador.** Inicializa la app (`VortexSpiraApp`), el `STATE` global, el `ResizeObserver`, escucha a la *History API* (`popstate`) e inyecta el locutor ARIA. | Gestiona el renderizado preventivo para evitar spam de foco en el arranque (`isBooting`). |
| **`data.js`** | **Constantes y Configuración.** Define *breakpoints* (`VIEWPORT`), comportamiento de Swiper, los valores por defecto de Accesibilidad (`A11Y`) y URLs. | |
| **`i18n.js`** | **Motor de Internacionalización.** Carga los JSON de idioma, aplica textos al DOM y gestiona el idioma del `<html>`. | |
| **`a11y.js`** | **Controlador de Accesibilidad.** Gestiona el Modal A11y, guardado en `localStorage`, y la inyección de atributos dinámicos (`data-theme`, `data-reduced-motion`) al `<body>`. | |
| **`nav-stack.js`** | **Gestión del Historial Lógico.** Maneja la pila profunda de navegación y la reconstrucción matemática por *deep linking* (IDs de URL). | |

### B. Depuración y Diagnóstico (Herramientas de Mantenedor)

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`debug.js`** | **Sistema de Logging Maestro.** Define niveles (`DEBUG_LEVELS`) e intercepta la consola. | |
| **`debug.screenReaderSim.js`** | **Simulador de Lector de Pantalla.** Analiza el DOM (nombres accesibles, roles, estados ARIA nativos e inyectados) y los imprime en consola. | Soporta lectura de descripciones y posiciones (`aria-posinset`). |
| **`debug.diagnostics.js`** | **Trazabilidad Visual.** Rastrea el foco activo, eventos globales y cambios de layout para asegurar la estabilidad visual. | |

### C. Navegación, Interacción y Foco

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`nav-base.js`** | **Manejadores Core.** Controla clics (`_handleCardClick`), botón volver, escritura en URL (`history.pushState`) y el **Cálculo de Foco y Colisiones (`_updateFocusImpl`)**. | **CRÍTICO:** Aquí reside el sistema de `clamping` y el `delta` para mover el contenido si el Header lo tapa. |
| **`nav-base-details.js`** | **Lógica de Vista de Detalle.** Unifica la interacción de la vista de lectura y los botones de acción/compra. | |
| **`nav-mouse-swipe.js`** | **Control de Ratón/Táctil.** Sustituto evolucionado de `nav-tactil.js`. Maneja la rueda del ratón y la función *Skipper* (salto automático de columnas vacías). | |
| **`nav-keyboard-base.js`** | **Controles de Teclado (Menú).** Atrapa eventos de teclado, maneja flechas de dirección y bloquea robos de foco indebidos. | |
| **`nav-keyboard-details.js` / `-swipe.js`** | **Controles de Teclado Específicos.** Delegan el comportamiento de las flechas dentro de las vistas de detalle o carruseles interactivos. | |

### D. Renderizado y Generación de HTML

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`render-base.js`** | **Motor de Renderizado Maestro.** Coordina las vistas, restaura el foco tras redimensionar (Snapshots) y genera el HTML base de la tarjeta. | Inyecta las variables `aria-label` compuestas. |
| **`render-swipe.js`** | **Renderizado Desktop/Tablet.** Configura el Swiper horizontal y calcula índices lógicos de ARIA. | |
| **`render-mobile.js`** | **Renderizado Móvil.** Configura el Swiper vertical en modo *FreeMode* para scroll fluido. | |
| **`render-details.js`** | **Renderizado de Detalles.** Inyecta los fragmentos de texto con `aria-description`. Alterna entre modo *Structural* (HTML nativo) y *Continuous Flow* (cálculo de altura dinámica). | |

---

## 3. Archivos de Estilo (Directorio `styles/`)

### A. Core y Layout

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`style-base.css`** | **Capa de Importación.** Orquesta la importación de todo el CSS en el orden específico de cascada. | |
| **`style-layout.css`** | **Estructura Grid.** Define las áreas principales y el manejo de visibilidad de las vistas centrales. | |
| **`style-desktop.css` / `style-tablet.css` / `style-mobile.css`** | **Responsividad.** Media queries específicos por dispositivo. `style-mobile.css` maneja el *Safe Mode* (ocultación de footer). | |
| **`style-header.css` / `-footer.css`** | Estilos específicos para la cabecera (logo, animaciones) y el pie de página. | |
| **`style-a11y.css`** | **Panel de Accesibilidad.** Estilos del modal flotante, checkboxes interactivos (`accent-color`) y declaración `@font-face` (Atkinson Hyperlegible, Lexend). | |

### B. Theming y Accesibilidad (Nivel AAA)

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`style-theme.css`** | **Theming Base.** Definición primaria de variables CSS (colores, sombras, tamaños). | |
| **`style-reduce-motion.css`** | **Modo "Sin Animaciones".** Apaga transiciones y *smooth scroll* vía Media Query del S.O. y atributo `[data-reduced-motion="true"]`. | |
| **`style-theme-scheme-light.css` / `-dark.css`** | **Esquemas Claro y Oscuro.** Responde al sistema operativo y a la sobreescritura manual del usuario (`data-theme="light/dark"`). | |
| **`style-theme-contrast.css`** | **Alto Contraste.** Maximiza bordes y elimina sombras suaves para usuarios con dificultades visuales. | |
| **`style-theme-forced-colors.css`** | **Colores Forzados.** Extrae los colores semánticos nativos de Windows (`Canvas`, `ButtonText`, `Highlight`) para máximo rigor. | |
| **`style-theme-yellow.css`** | **Baja Visión (Amarillo sobre Negro).** Tema extremo de accesibilidad para fotofobia severa y cataratas. | |

### C. Componentes

| Archivo | Propósito Principal | Nota Crítica |
| :--- | :--- | :--- |
| **`style-cards.css`** | Diseño base de las tarjetas, hover, focos (`focus-visible` / `focus-current`) y tarjetas deshabilitadas. | |
| **`style-details.css`** | Diseño de la vista inmersiva de lectura, difuminado contextual (*blur*) de elementos no enfocados y botones de acción. | |
| **`style-components.css`** | Toast notifications, Breadcrumbs y el botón flotante fijo de `volver`. | |
| **`style-media.css`** | **Recursos y Multimedia.** Gestiona la carga de tipografías base, iconos SVG mediante `background-image` (como las máscaras de los botones) y ajustes responsivos de imágenes/medios. | Separa el "peso gráfico" de la estructura lógica del CSS. |

