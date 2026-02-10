/* --- code/render-details.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js';

function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    // Seguridad: Limpieza previa si existiera
    if (appInstance.STATE.detailCarouselInstance) {
        appInstance.STATE.detailCarouselInstance.destroy(true, true);
        appInstance.STATE.detailCarouselInstance = null;
    }

    const swiperConfig = {
        direction: 'vertical',
        slidesPerView: 'auto',
        loop: false,
        initialSlide: initialSlideIndex,
        touchRatio: 1,

        touchStartPreventDefault: false,
        
        simulateTouch: true,
        mousewheel: {
            sensitivity: 1,
            releaseOnEdges: true,
        },
        speed: 300,
        freeMode: true,
        freeModeMomentum: true,
        freeModeSticky: true,

        // 🟢 FIX 1: Desactivar la gestión A11y de Swiper para evitar conflictos
        a11y: { enabled: false }
    };

    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);

    if (appInstance.STATE.detailCarouselInstance) {
        // 🟢 FIX 2: Asegurar silencio absoluto en el wrapper generado
        if (appInstance.STATE.detailCarouselInstance.wrapperEl) {
            appInstance.STATE.detailCarouselInstance.wrapperEl.removeAttribute('aria-live');
            appInstance.STATE.detailCarouselInstance.wrapperEl.removeAttribute('aria-busy');
        }

        appInstance.STATE.detailCarouselInstance.on('slideChangeTransitionEnd', (swiper) => {
            nav_base_details._handleSlideChangeEnd(swiper, appInstance);
        });
    }
}

export function _mostrarDetalle(cursoId) {
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                `Mostrando detalle para: ${cursoId}`);
    
    // ⭐️ FIX: Usar la verdad única del layout (zoom-aware)
    const layoutMode = document.body.getAttribute('data-layout') || 'desktop';
    const isMobile = layoutMode === 'mobile';
    
    const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion); 

    if (!curso) return;

    // 🗑️ LIMPIEZA TOTAL DE NAVEGACIÓN
    if (typeof this._destroyCarousel === 'function') {
        this._destroyCarousel();
    }
    
    ['vista-navegacion-desktop', 'vista-navegacion-tablet', 'vista-navegacion-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });

    const desktopView = document.getElementById('vista-detalle-desktop');
    const mobileView = document.getElementById('vista-detalle-mobile');
    
    if (desktopView) { desktopView.classList.remove('active'); desktopView.style.display = 'none'; }
    if (mobileView) { mobileView.classList.remove('active'); mobileView.style.display = 'none'; }

    this.DOM.vistaDetalle = isMobile ? mobileView : desktopView;
    this.DOM.vistaDetalle.style.display = 'flex'; 
    this.DOM.vistaDetalle.classList.add('active');

    this.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 
    
    // 🟢 FIX 3: Silenciar el track ANTES de inyectar contenido para evitar lectura masiva
    if (this.DOM.detalleTrack) {
        this.DOM.detalleTrack.removeAttribute('aria-live');
        this.DOM.detalleTrack.removeAttribute('role'); // Dejarlo como div genérico o list
    }

    const swiperId = isMobile ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    // Gestión de paneles laterales (Volver e Info) para Desktop/Tablet
    const vistaVolver = document.getElementById('vista-volver');
    const infoAdicional = document.getElementById('info-adicional');
    const cardVolverFija = document.getElementById('card-volver-fija-elemento');
    const cardNivelActual = document.getElementById('card-nivel-actual');

    if (!isMobile) {
        // 1. Mostrar panel izquierdo (Volver)
        if (vistaVolver) vistaVolver.classList.add('visible');
        
        // 2. Configurar botón volver
        if (cardVolverFija) {
            cardVolverFija.classList.add('visible');
            cardVolverFija.innerHTML = `<h3>${data.LOGO.VOLVER}</h3>`; 
            cardVolverFija.tabIndex = 0;
            // Asegurar el clic usando la función del appInstance
            cardVolverFija.onclick = () => this._handleVolverClick(); 
        }

        // 3. Configurar título del nivel (Raíz por defecto en deep-link)
        if (cardNivelActual) {
            cardNivelActual.classList.add('visible');

            // LÓGICA DE BREADCRUMB (Recuperar nombre del nivel padre)
            const currentStack = this.stackGetCurrent();
            let parentTitle = 'Nivel Raíz'; // Fallback por defecto

            if (currentStack && currentStack.levelId) {
                // Buscamos el nodo padre en la estructura completa
                const parentNode = this._findNodoById(currentStack.levelId, this.STATE.fullData.navegacion);
                if (parentNode) {
                    parentTitle = parentNode.nombre || parentNode.titulo || parentTitle;
                }
            } else {
                // Estamos en raíz o deep link sin contexto -> Usar texto "Nivel Raíz" del i18n
                parentTitle = this.getString ? this.getString('nav.breadcrumbRoot') : 'Nivel Raíz';
            }

            cardNivelActual.innerHTML = `<h3>${parentTitle}</h3>`;
        }

        // 4. Panel Info (Derecha) - Ocultar en Tablet Portrait
        if (infoAdicional) {
            if (layoutMode === 'tablet-portrait') {
                infoAdicional.classList.remove('visible');
            } else {
                infoAdicional.classList.add('visible');
            }
        }
    } else {
        // En móvil ocultar paneles laterales
        if (vistaVolver) vistaVolver.classList.remove('visible');
        if (infoAdicional) infoAdicional.classList.remove('visible');
    }

    // --- Renderizado de Slides (Tu lógica original intacta) ---
    let slidesHtml = '';

    if (isMobile) {
        const parent = this.stackGetCurrent();

        // ⭐️ FIX I18N: Clave actualizada aquí también por si acaso
        let parentName = this.getString('nav.breadcrumbRoot');

        if (parent && parent.levelId) {
            const parentNodo = this._findNodoById(parent.levelId, this.STATE.fullData.navegacion);
            if (parentNodo) {
                parentName = parentNodo.nombre || parentNodo.titulo || parentName;
            }
        }

        const ariaLabel = this.getString('nav.aria.backBtn');

        let volverHtml = '';
        // En móvil siempre ponemos el volver
        volverHtml = `
            <article class="card card-volver-vertical" role="button" aria-label=${ariaLabel} tabindex="0" onclick="App._handleVolverClick()">
                <h3>${data.LOGO.VOLVER}</h3>
            </article>
        `;

        slidesHtml += `
            <div class="swiper-slide">
                <article class="card card-breadcrumb-vertical" tabindex="-1" style="margin-bottom: 10px;">
                    <h3>${parentName}</h3>
                </article>
                ${volverHtml}
            </div>
        `;
    }

    const descripcion = curso.descripcion || this.getString('details.noDescription');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = descripcion.trim();

    // ⭐️ LOGICA DE AGRUPACIÓN (FIX DEFINITIVO)
    // En lugar de filtrar, acumulamos contenido inline hasta encontrar un bloque
    const slidesContent = [];
    let inlineBuffer = '';

    const flushBuffer = () => {
        if (inlineBuffer.trim().length > 0) {
            // Si es texto suelto sin <p>, lo envolvemos para mantener estilo, 
            // a menos que ya empiece por una etiqueta de bloque (raro en este buffer)
            slidesContent.push(`<p>${inlineBuffer}</p>`);
        }
        inlineBuffer = '';
    };

    Array.from(tempDiv.childNodes).forEach(node => {
        // ¿Es un elemento de Bloque que merece su propio slide?
        // Añade aquí cualquier etiqueta que quieras que fuerce un salto de slide
        const isBlock = (node.nodeType === 1) && ['P', 'UL', 'OL', 'DIV', 'BLOCKQUOTE', 'H3', 'H4', 'TABLE'].includes(node.tagName);
        const isEmptyText = (node.nodeType === 3) && node.textContent.trim().length === 0;

        if (isEmptyText) return; // Ignoramos espacios vacíos entre etiquetas

        if (isBlock) {
            flushBuffer(); // Si teníamos texto acumulado (ej: título suelto), lo soltamos antes
            slidesContent.push(node.outerHTML); // Añadimos el bloque completo
        } else {
            // Es Inline (Text, STRONG, SPAN, A...) -> Lo guardamos en el buffer
            inlineBuffer += (node.nodeType === 1 ? node.outerHTML : node.textContent);
        }
    });
    flushBuffer(); // Soltar lo que quede al final

    // Renderizar los slides procesados
    if (slidesContent.length > 0) {
        // Slide 1: Título + Primer contenido
        // El H2 NO es focusable por sí mismo, se lee al llegar al fragmento o por contexto.
        // Hacemos que el fragmento sea el 'document' focusable.
        slidesHtml += `
            <div class="swiper-slide">
                <h2 class="detail-title-slide" aria-hidden="true">${curso.titulo}</h2>
                <div class="detail-text-fragment" data-index="0" role="article" tabindex="0" onclick="this.focus()">
                    <div class="content-wrapper">
                        ${slidesContent[0]}
                    </div>
                </div>
            </div>
        `;

        // Resto de Slides
        for (let i = 1; i < slidesContent.length; i++) {
            slidesHtml += `
                <div class="swiper-slide">
                    <div class="detail-text-fragment" data-index="${i}" role="article" tabindex="0" onclick="this.focus()">
                        <div class="content-wrapper">
                            ${slidesContent[i]}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    if (curso.enlaces) {
        curso.enlaces.forEach((enlace, index) => {
            const iconClass = (enlace.type === 'c') ? 
                'icon-buy' : 
                (enlace.type === 'd' ? 
                    'icon-download' : 
                    'icon-link');

            const textId = `action-text-${index}`; // ID para vincular texto y botón
            
            // 1. Calculamos el estado antes para limpiar el template
            const isDisabled = !enlace.url || enlace.url === '#';

            // 🟢 FIX 5: Evitar foco en elemento oculto deshabilitado.
            // Añadimos 'pointer-events: none' si está deshabilitado para que el click 
            // pase al padre (que sí es un elemento válido para el foco).
            const style = isDisabled ? 'style="pointer-events: none;"' : '';

            slidesHtml += `
                <div class="swiper-slide detail-action-slide">
                    <div class="detail-action-item" 
                        onclick="App._handleActionRowClick(event)" 
                        tabindex="0" 
                        role="button" 
                        aria-labelledby="${textId}">
                        
                        <span id="${textId}" 
                            class="detail-action-text">
                            ${enlace.texto}
                        </span>
                        
                        <a ${isDisabled ? 'role="link" aria-disabled="true"' : `href="${enlace.url}" target="_blank"`} 
                            tabindex="-1"
                            aria-hidden="true"
                            ${style}
                            class="detail-action-btn ${isDisabled ? 'disabled' : ''}">
                            <i class="action-icon ${isDisabled ? 'icon-vacio' : iconClass}"></i>
                        </a>
                    </div>
                </div>
            `;
        });
    }

    if (isMobile) {
        slidesHtml += `<div class="swiper-slide card-relleno-final" 
                            style="height: 100px !important; pointer-events: none;" 
                            aria-hidden="true"></div>`;
    }

    if (this.DOM.detalleTrack) {
        this.DOM.detalleTrack.innerHTML = slidesHtml;
    }

    _initDetailCarousel(this, swiperId, 0);

    // 🟢 FIX 4: Anuncio de Contexto
    // En lugar de dejar que el HTML hable solo, lo anunciamos explícitamente.
    const mensajeContexto = `${this.getString('nav.contextPrefix') || 'Curso: '} ${curso.titulo}`;
    this.announceA11y(mensajeContexto);
    
    setTimeout(() => {
        let targetElement = null;

        if (isMobile) {
            targetElement = this.DOM.detalleTrack.querySelector('.card-volver-vertical');
            if (!targetElement) {
                targetElement = this.DOM.detalleTrack.querySelector('.detail-text-fragment[data-index="0"]');
            }
        } else {
            targetElement = this.DOM.detalleTrack.querySelector('.detail-text-fragment[data-index="0"]');
        }

        if (targetElement) {
            targetElement.focus({ preventScroll: true });
            if (nav_base_details && typeof nav_base_details._updateDetailFocusState === 'function') {
                nav_base_details._updateDetailFocusState(this);
            }
        }
    }, 200);
}

/* --- code/render-details.js --- */