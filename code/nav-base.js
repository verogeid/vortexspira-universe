/* --- code/nav-base.js --- */

import * as debug from './debug/debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js'; 

/* --- code/nav-base.js --- */
function _setupMacroFocusTracker() {
    const zones = {
        'header': '#app-header',
        'volver': '#vista-volver',
        'central': '#vista-central',
        'info': '#info-adicional',
        'footer': 'footer',
        'modal': '#a11y-modal-overlay'
    };

    document.addEventListener('focusin', (e) => {
        // Buscamos a qué zona pertenece el elemento que acaba de recibir foco
        for (const [key, selector] of Object.entries(zones)) {
            if (e.target.closest(selector)) {
                document.body.setAttribute('data-active-zone', key);
                break;
            }
        }
    });
}

export function setupListeners() {
    if (this.DOM.cardVolverFijaElemento) { 
        this.DOM.cardVolverFijaElemento.addEventListener('click', this._handleVolverClick.bind(this));
    }

    _setupDetailFocusHandler.call(this); 
    _setupGlobalClickRecovery.call(this); 
    _setupMacroFocusTracker.call(this);
};

function _setupDetailFocusHandler() {
    document.addEventListener('focusin', (e) => {
        if (this.DOM.vistaDetalle?.classList.contains('active')) {
            const focusedIsContent = e.target.closest('.detail-text-fragment, .detail-action-item, .card-volver-vertical, #card-volver-fija-elemento');
            if (focusedIsContent) nav_base_details._updateDetailFocusState(this);
        }
    });
};

function _setupGlobalClickRecovery() {
    document.addEventListener('click', (e) => {
        const target = e.target;
        const interactive = target.closest('a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])');

        // 1. Si el usuario clicó en algo interactivo, dejamos que el navegador haga su trabajo.
        if (interactive) {
            interactive.focus({ preventScroll: true });

            return;
        }

        // 2. RECUPERACIÓN DE FOCO EN ZONAS SEGURAS
        // Si clicamos en el fondo vacío de una zona segura (Header, Footer, ModalOverlay),
        // buscamos el primer elemento interactivo y le damos el foco para que no se pierda.
        const zone = target.closest('#app-header, footer, #info-adicional, #vista-volver, #a11y-modal-overlay');

        if (zone) {
            // Verificar si el modal está abierto para no romper la trampa de foco
            const isModalOpen = document.getElementById('a11y-modal-overlay')?.classList.contains('active');
            const isClickInModal = zone.id === 'a11y-modal-overlay';

            // 🛑 CONDICIÓN DEL USUARIO: "Solo si no estamos en el modal" (o si el clic ES en el modal)
            // Si el modal está abierto, y el clic NO fue en el modal (header de fondo?), ABORTAMOS.
            if (isModalOpen && !isClickInModal) {
                return;
            }

            const focusable = zone.querySelector('a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])');
            if (focusable) {
                // 🟢 RESTAURAR FOCO: "Obviamente quiero que vuelva..."
                focusable.focus({ preventScroll: true });

                return; 
            }
        }
        
        // 3. RECUPERACIÓN GLOBAL (Fallback al Swiper)
        // Solo si NO hay modal abierto.
        const isNavActive = this.DOM.vistaNav && this.DOM.vistaNav.classList.contains('active');

        if (document.getElementById('a11y-modal-overlay')?.classList.contains('active')) return;

        if (isNavActive && 
            (document.activeElement === document.body || 
                !document.activeElement)) {
            this._updateFocus(false);
        }
    });
}

export function _handleVolverClick() {
    if (this.STATE.isNavigatingBack) return; 
    
    debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 
                'ESC: Iniciando proceso Volver.');

    this.STATE.isNavigatingBack = true; 

    if (this.DOM.vistaDetalle?.classList.contains('active')) {
        nav_base_details._clearDetailVisualStates(this); 
        this.DOM.vistaDetalle.classList.remove('active'); 
        this.STATE.activeCourseId = null; 
        this.renderNavegacion(); 
    } 
    else if (this.STATE.historyStack.length > 1) { 
        this.stackPop(); 
        this.renderNavegacion(); 
    } 
    else {
        debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 
                    'ESC: Raíz alcanzada. Bloqueo liberado.');

        this.STATE.isNavigatingBack = false; 
        
        return; // Salimos temprano para no ensuciar la URL en la raíz
    }

    // 🟢 HISTORIAL: Push al navegador al retroceder mediante nuestro botón
    const currentLevel = this.stackGetCurrent();
    const targetId = this.STATE.activeCourseId || currentLevel?.levelId;
    const url = new URL(window.location);
    
    if (targetId) {
        url.searchParams.set('id', targetId);
    } else {
        url.searchParams.delete('id');
    }
    history.pushState({ id: targetId }, '', url);
};

export function _updateFocusImpl(shouldSlide = true) {
    // Si el modal de accesibilidad está abierto, la navegación principal tiene prohibido
    // robar el foco, aunque se haya redibujado el fondo por un cambio de fuente.
    if (document.getElementById('a11y-modal-overlay')?.classList.contains('active')) {
        debug.log('global_focus', debug.DEBUG_LEVELS.DEEP, 
            '🛡️ _updateFocus bloqueado: Modal A11y está activo.');

        return;
    }

    const targetPos = this.STATE.currentFocusIndex;
    let target = null;
    let targetSlideIndex = -1;

    // 🛡️ SAFETY CHECK: Verificar si existen elementos interactivos antes de hacer nada
    // Evita bucles infinitos o errores si una carpeta está vacía.
    const hasFocusables = this.DOM.track.querySelector('.card:not([data-tipo="relleno"])');

    if (!hasFocusables) {
        // 🟢 FIX 1: Silenciar errores durante el redimensionado visual (Clase CSS)
        const isResizing = document.body.classList.contains('resize-animation-stopper');

        // 🟢 FIX 2: Silenciar errores (y foco) durante el arranque (isBooting) o hidratación
        if (this.STATE.isHydrating || isResizing || this.STATE.isBooting) {
            
            debug.log('nav_base', debug.DEBUG_LEVELS.BASIC, 
                'Track vacío o inestable ignorado durante transición (Boot/Resize).');

            return;
        }

        debug.logWarn('nav_base', 
                        '⚠️ CRITICAL: Track vacío o solo rellenos. Abortando foco.');

        return;
    }

    // 🟢 FIX 3: Bloqueo de foco en arranque
    // Aunque el track tenga elementos, si estamos 'booteando', NO ponemos el foco aún.
    // Esto evita que el screen reader lea 3 veces lo mismo. Esperamos a que app.js libere el flag.
    if (this.STATE.isBooting) {
        debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 
            'Ignorando _updateFocus durante el arranque (Silencio A11y).');

        return;
    }

    // ⭐️ FIX INTELIGENTE DE LOOP: Buscar el elemento más cercano visualmente ⭐️
    // En lugar de buscar ciegamente en el DOM, preguntamos a Swiper dónde estamos
    // y buscamos la tarjeta que esté en el slide activo (o en sus vecinos).
    if (this.STATE.carouselInstance) {
        const swiper = this.STATE.carouselInstance;
        const activeIndex = swiper.activeIndex;
        const slides = swiper.slides;

        let bestDistance = Infinity;

        // Recorremos los slides para encontrar aquel que contenga nuestra tarjeta target
        // y que esté a menor distancia del slide actual.
        for (let i = 0; i < slides.length; i++) {
            // Buscamos SOLO dentro de este slide
            const cardInSlide = slides[i].querySelector(`.card[data-pos="${targetPos}"]`);
            
            if (cardInSlide) {
                const distance = Math.abs(i - activeIndex);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    target = cardInSlide;
                    targetSlideIndex = i;
                }
            }
        }
    }

    // Fallback: Si no hay Swiper o algo falló, usamos el método clásico
    if (!target) {
        target = this.DOM.track.querySelector(`.card[data-pos="${targetPos}"]`);
    }

    // 🟢 1. LIMPIEZA SELECTIVA
    // Solo quitamos clases a los que NO son el target para evitar parpadeos
    const allCardsInTrack = Array.from(this.DOM.track.querySelectorAll('.card'));

    allCardsInTrack.forEach(c => { 
        if (c !== target) {
            c.classList.remove('focus-visible'); 
            c.removeAttribute('aria-current'); 
            c.tabIndex = -1; 
        }
    });

    debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 
                `_updateFocusImpl: Idx=${targetPos} | Slide=${shouldSlide} | TargetFound=${!!target}`);

    if (target) {
        target.classList.add('focus-visible');
        target.setAttribute('aria-current', 'true');
        target.tabIndex = 0;

        // 🛠️ DETECCIÓN DE LAYOUT (Zoom Aware) 🛠️
        const layout = document.body.getAttribute('data-layout') || 'desktop';
        const isMobile = layout === 'mobile';
        const isDetailView = this.DOM.vistaDetalle?.classList.contains('active');
        
        // 🟢 FIX CRÍTICO: Aplicar el cálculo de colisión del 'parentSlide' a cualquier lista vertical,
        // no solo en móvil, sino también en las vistas de detalle de PC/Tablet.
        if (isMobile || isDetailView) {
            if (document.activeElement === target) {
                debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 
                            `_updateFocusImpl: Foco ya establecido. Ignorando llamada redundante.`);
            } else {
                debug.log('nav_base', debug.DEBUG_LEVELS.DEEP, 
                            `_updateFocusImpl: Estableciendo foco físico en móvil.`);

                // 🟢 Bloquear el scroll nativo del navegador
                // Esto evita el "primer salto" donde el navegador pone el elemento bajo el header.
                this.applySmartFocus(target);
            }
            

            if (this.STATE.carouselInstance) {
                const swiper = this.STATE.carouselInstance;
                swiper.update(); 

                // 🕵️‍♀️ ZONA DE DEPURACIÓN Y CÁLCULO 🕵️‍♀️
                const header = document.getElementById('app-header');
                const headerHeight = header?.offsetHeight || 0;
                const footerHeight = document.querySelector('footer')?.offsetHeight || 0;
                
                const viewHeight = window.visualViewport ? 
                    window.visualViewport.height : 
                    window.innerHeight;

                const bottomLimit = viewHeight - footerHeight;

                // 🟢 FIX 2: Medición Inteligente
                // Si es un bloque de texto, medimos el párrafo exacto. 
                // Si es interactivo (botón/menú), medimos el slide completo.
                const isTextFragment = target.classList.contains('detail-text-fragment');
                const parentSlide = target.closest('.swiper-slide');
                const elementToMeasure = isTextFragment ? target : (parentSlide || target);
                
                const rect = elementToMeasure.getBoundingClientRect(); 
                const topRef = rect.top;
                const bottomRef = rect.bottom;
                
                debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                    `📏 MEDICIONES: 
                    Header H: ${headerHeight}px
                    Bottom Limit: ${bottomLimit}px
                    Elemento a medir: ${elementToMeasure.tagName} ${elementToMeasure.className}
                    Top: ${topRef.toFixed(1)}px
                    Bottom: ${bottomRef.toFixed(1)}px`);

                const isObstructedTop = topRef < (headerHeight + 5); 
                const isObstructedBottom = bottomRef > (bottomLimit - 5);

                if (isObstructedTop || isObstructedBottom) {
                    const margin = 20; 
                    let delta = 0;

                    if (isObstructedTop) {
                        delta = (headerHeight + margin) - topRef; // Cuánto hay que bajarlo

                        debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                            `⚠️ OBSTRUCCIÓN SUPERIOR. Delta: ${delta.toFixed(1)}px`);

                    } else if (isObstructedBottom) {
                        delta = bottomRef - (bottomLimit - margin); // Cuánto hay que subirlo

                        debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                            `⚠️ OBSTRUCCIÓN INFERIOR. Delta: ${delta.toFixed(1)}px`);
                    }

                    // 🟢 FIX 3: Aplicar movimiento único según el tipo de contenedor
                    if (swiper.params.direction === 'vertical') {
                        // SWIPER VERTICAL (Detalles): Movemos el contenido usando transformaciones
                        // Al haber usado preventScroll, el navegador no ha movido nada, así que partimos de la posición actual real.
                        let currentTrans = swiper.translate;
                        let newTrans = currentTrans;

                        if (isObstructedTop) {
                            // Para bajar el contenido visualmente, sumamos al translate (hacerlo menos negativo)
                            newTrans = currentTrans + delta;
                        } else {
                            // Para subir el contenido, restamos al translate (hacerlo más negativo)
                            newTrans = currentTrans - delta;
                        }
                        
                        // 🟢 FIX CRÍTICO: Clamping. Evitar el "vacío" si el usuario hace scroll muy rápido
                        // minTranslate = Tope superior (normalmente 0)
                        // maxTranslate = Tope inferior (el final real del contenido, en negativo)
                        const limitTop = swiper.minTranslate();
                        const limitBottom = swiper.maxTranslate();

                        if (newTrans > limitTop) newTrans = limitTop;
                        if (newTrans < limitBottom) newTrans = limitBottom;

                        debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                            `🔧 CORRIGIENDO VERTICAL (Swiper): ${currentTrans} -> ${newTrans}`);

                        swiper.setTransition(data.SWIPER.SLIDE_SPEED); // Movimiento suave único
                        swiper.setTranslate(newTrans);
                        swiper.updateProgress();

                    } else {
                        // SWIPER HORIZONTAL (Menú Principal): Movemos la ventana entera
                        // Usamos 'smooth' porque ahora es el único movimiento, no una corrección brusca
                        if (isObstructedTop) {
                            window.scrollBy({ 
                                top: -delta, 
                                behavior: data.SWIPER.scrollBehavior 
                            });
                        } else {
                            window.scrollBy({ 
                                top: delta, 
                                behavior: data.SWIPER.scrollBehavior 
                            });
                        }
                        debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                            `↔️ CORRECCIÓN HORIZONTAL (Window Scroll)`);
                    }

                    // Verificación Post-Corrección (Solo diagnóstico)
                    setTimeout(() => {
                        const newRect = elementToMeasure.getBoundingClientRect();
                        const newTop = newRect.top;
                        const visibleAhora = newTop >= headerHeight - 1; // Tolerancia 1px
                        const icono = visibleAhora ? '✅' : '❌';
                        debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                            `${icono} POST-CORRECCIÓN: Nuevo Top=${newTop.toFixed(1)}px. ¿Visible? ${visibleAhora}`);
                    }, data.SWIPER.SLIDE_SPEED + 50); // Esperar a que termine la transición (300ms + margen)

                } else {
                    debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                        `✅ VISIBLE: El elemento está libre (Top ${topRef.toFixed(1)} >= Header ${headerHeight})`);
                }
            }
        } else {
            // Desktop behavior
            if (document.activeElement === target) {
                debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                            `_updateFocusImpl: Foco ya establecido. Ignorando llamada redundante.`);
            } else {
                debug.log('nav_base', debug.DEBUG_LEVELS.EXTREME, 
                            `_updateFocusImpl: Estableciendo foco físico en desktop.`);

                // Foco físico
                this.applySmartFocus(target);
            }

            // Movimiento del Slide
            if (this.STATE.carouselInstance && shouldSlide) {
                const swiper = this.STATE.carouselInstance;

                if (targetSlideIndex > -1) {
                    // ⭐️ FIX FLUIDEZ: Usamos slideTo directo al índice calculado ⭐️
                    // Esto evita que slideToLoop nos devuelva al slide original causando un salto visual.
                    // Al ir al targetSlideIndex (que puede ser un clon), el movimiento es siempre corto y suave.
                    swiper.slideTo(targetSlideIndex, data.SWIPER.SLIDE_SPEED);
                } 
                else {
                    // En grid desktop sin loop complejo, slideToLoop suele estar bien

                    // Recalcular índice lógico si no lo tenemos
                    const fallbackTarget = Math.floor(targetPos / this.STATE.itemsPorColumna);
                    if (typeof swiper.slideToLoop === 'function') {
                        swiper.slideToLoop(fallbackTarget, data.SWIPER.SLIDE_SPEED);
                    } else {
                        swiper.slideTo(fallbackTarget, data.SWIPER.SLIDE_SPEED);
                    }
                }
            }

            if (this.STATE.carouselInstance) {
                this.STATE.carouselInstance.update(); 
            }
        }
    }
}

export function _handleTrackClick(e) {
    if (this.STATE.isNavigatingBack) return;

    const tarjeta = e.target.closest('.card[data-id]:not([data-tipo="relleno"])');
    if (!tarjeta) return;

    // Recalcular índice basado en data-pos, que es más seguro en entornos con clones
    const pos = tarjeta.dataset.pos;
    if (pos !== undefined) {
        this.STATE.currentFocusIndex = parseInt(pos, 10);
        this._updateFocus(true); 

        if (tarjeta.classList.contains('disabled')) return;
        this._handleCardClick(tarjeta.dataset.id, tarjeta.dataset.tipo);
    }
}

export function _handleCardClick(id, tipo) {
    this.stackUpdateCurrentFocus(id);

    // 🟢 HISTORIAL: Push al navegador para avanzar
    if (tipo !== 'volver-vertical') {
        const url = new URL(window.location);
        url.searchParams.set('id', id);
        history.pushState({ id: id }, '', url);
    }

    if (tipo === 'categoria') { 
        this.stackPush(id); 
        this.renderNavegacion(); 
    }
    else if (tipo === 'curso') {
        this.STATE.activeCourseId = id;
        this._mostrarDetalle(id);
    }
    else if (tipo === 'volver-vertical') {
        this._handleVolverClick();
    }
}

export function _findNodoById(id, nodos) {
    if (!nodos || !id) return null;
    for (const n of nodos) {
        if (n.id === id) return n;
        if (n.subsecciones) {
            const res = this._findNodoById(id, n.subsecciones);
            if (res) return res;
        }
        if (n.cursos) {
            const res = n.cursos.find(c => c.id === id);
            if (res) return res;
        }
    }
    return null;
}

export function _tieneContenidoActivoImpl(nodoId) {
    const nodo = this._findNodoById(nodoId, this.STATE.fullData.navegacion);
    if (!nodo) return false;
    if (nodo.titulo || (nodo.cursos && nodo.cursos.length > 0)) return true;
    return (nodo.subsecciones || []).some(sub => this._tieneContenidoActivo(sub.id));
}

export function findBestFocusInColumn(columnCards, targetRow) {
    const isValid = (card) => card && card.dataset.id && card.dataset.tipo !== 'relleno';
    if (isValid(columnCards[targetRow])) return columnCards[targetRow];
    for (let i = 1; i < columnCards.length; i++) {
        if (isValid(columnCards[targetRow - i])) return columnCards[targetRow - i];
        if (isValid(columnCards[targetRow + i])) return columnCards[targetRow + i];
    }
    return null;
}

/* --- code/nav-base.js --- */