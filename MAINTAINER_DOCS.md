# 📚 Documentación para el Mantenedor (VortexSpira UI)

Este documento detalla el propósito de todos los archivos del proyecto para facilitar su mantenimiento y desarrollo futuro, reflejando la arquitectura SPA modular y la accesibilidad AAA.

---

## 1. Archivos de Raíz y Configuración Web

| Archivo | Propósito |
| :--- | :--- |
| **`index.html`** | Punto de entrada. Define el Grid base (`#app-container`) e importa scripts y estilos. |
| **`MAINTAINER_DOCS.md`** | Esta documentación técnica. |
| **`README.md`** | Descripción general para repositorios. |
| **`LICENSE`** | Términos de licencia propietaria. |
| **`CNAME`** | Configuración de dominio para GitHub Pages. |
| **`robots.txt` / `sitemap.xml`** | Configuración para SEO y rastreadores. |
| **`favicon.ico`** | Icono del sitio. |
| **`server.bat` / `server.sh`** | Scripts para lanzar un servidor local (Windows/Unix). |

---

## 2. Lógica de Aplicación (`code/`)

### A. core/ (Arquitectura SPA)
* **`app.js`**: Orquestador principal. Inicializa el `STATE` y los observadores de layout.
* **`app-events.js`**: Bus de eventos global para comunicación desacoplada.
* **`app-layout.js`**: Lógica de gestión de dimensiones y visibilidad del viewport.
* **`app-router.js`**: Manejo de rutas SPA y sincronización con la *History API*.

### B. services/ (Utilidades y Datos)
* **`data.js`**: Constantes globales, URLs de Hotmart y parámetros por defecto de A11y.
* **`i18n.js`**: Motor de internacionalización. Carga y aplica los strings del DOM.
* **`app-utils.js`**: Funciones auxiliares para manipulación de DOM y tiempos.

### C. features/ (Funcionalidades)
* **a11y/**:
    * `a11y.js`: Controlador de guardado y aplicación de preferencias (temas, fuentes).
    * `a11y-modal.js`: Lógica del modal interactivo de configuración AAA.
    * `app-feedback.js`: Gestión del sistema de sugerencias y reporte de errores.
* **navigation/**:
    * `nav-base.js`: Lógica core de navegación y cálculo de colisiones de foco.
    * `nav-base-pc.js`: Ajustes de navegación para dispositivos con puntero.
    * `nav-base-details.js`: Comportamiento de la vista inmersiva de curso.
    * `nav-keyboard-base.js` / `-details.js` / `-swipe.js`: Manejadores de eventos de teclado.
    * `nav-mouse-swipe.js`: Soporte para scroll con rueda y gestos táctiles.
    * `nav-stack.js`: Gestión de la pila de historial para el botón "Volver".

### D. render/ (Generación de UI)
* **`render-base.js`**: Generador de HTML para tarjetas y restauración de snapshots de foco.
* **`render-details.js`**: Inyección de contenidos con `aria-description` y flujo continuo.
* **`render-mobile.js`**: Implementación de Swiper vertical (Mobile).
* **`render-swipe.js`**: Implementación de Swiper horizontal (Desktop/Tablet).

### E. components/ (UI Modular)
* **`main-menu.js`**: Lógica del componente de menú principal de navegación.

### F. debug/ (Herramientas de Diagnóstico)
* **`debug.js`**: Sistema central de logs. Nunca eliminar líneas, usar flags.
* **`debug.diagnostics.js`**: Rastreador de eventos de foco y cambios de layout.
* **`debug.screenReaderSim.js`**: Simulador de lector de pantalla (análisis de accesibilidad).
* **`debug.ldJsonSim.js`**: Verificador de datos estructurados para SEO.

---

## 3. Datos e Internacionalización (`data/`)

### courses/ (Contenido Educativo)
* `cursos_es.json`, `cursos_en.json`, `cursos_fr.json`, `cursos_pt.json`, `cursos_de.json`.

### strings/ (Diccionarios de Interfaz)
* `strings_es.json`, `strings_en.json`, `strings_fr.json`, `strings_pt.json`, `strings_de.json`.
* **Nota**: Aquí se define `feedback` y `feedbackTarget`.

---

## 4. Recursos (`resources/`)

* **fonts/**: Fuentes `AtkinsonHyperlegible` y `Lexend` (Regular/Bold).
* **images/**: Logotipos en formato PNG y SVG.
* **demoImages/**: Activos visuales para documentación y demostraciones de la PWA.

---

## 5. Estilos (`styles/`)

### base/ (Cimientos)
* `style-fonts.css`, `style-layout.css`, `style-no-opacity.css`, `style-reduce-motion.css`.

### layouts/ (Responsividad)
* `style-desktop.css`, `style-tablet.css`, `style-mobile.css`, `style-safe-mode.css`.

### components/ (Interfaz)
* `style-a11y.css`, `style-cards.css`, `style-components.css`, `style-details.css`, `style-footer.css`, `style-header.css`, `style-menu.css`.

### themes/ (Temas AAA)
* `style-theme.css` (Variables raíz).
* `style-theme-scheme-light.css` / `-dark.css`.
* `style-theme-contrast.css` (Alto contraste).
* `style-theme-yellow.css` (Baja visión).
* `style-theme-forced-colors.css` / `-mobile.css` (Contraste forzado del SO).

### media/ (Multimedia y Máscaras)
* `style-media-base.css`, `style-media-details.css`, `style-media-menu.css`.

---

## 6. Scripts de Automatización (`scripts/`)
* **`generate-sitemap.mjs`**: Script Node.js para actualizar el sitemap según los JSON de cursos.
