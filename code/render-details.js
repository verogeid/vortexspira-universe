/* --- code/render-details.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js';

// 🟢 1. CÁLCULO DE ALTURA DISPONIBLE REAL (PÍXELES)
function _calculateMaxHeightAvailable() {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    
    // Medir Header Real
    const headerEl = document.getElementById('app-header');
    let headerHeight = headerEl ? headerEl.offsetHeight : 0;
    
    // Fallback si el header está oculto o cargando
    if (headerHeight === 0) {
        const rootStyle = getComputedStyle(document.documentElement);
        headerHeight = parseFloat(rootStyle.getPropertyValue('--header-height-real')) || 60;
    }

    // Medir Footer Real
    const footerEl = document.querySelector('footer');
    const footerHeight = footerEl ? footerEl.offsetHeight : 0;

    // Margen de seguridad (para que el texto no toque los bordes superior/inferior)
    const safetyMargin = 2;

    // Espacio Bruto Disponible
    const availableHeight = vh - safetyMargin; // - headerHeight - footerHeight - safetyMargin;

    debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
        `📏 HEIGHT CALC: Viewport:${vh}  - Margin:${safetyMargin} = Available:${availableHeight}px`);// - Header:${headerHeight} - Footer:${footerHeight} - Margin:${safetyMargin} = Available:${availableHeight}px`);

    return availableHeight;
}

// 🟢 2. GENERADOR DE SLIDES FANTASMA (CORREGIDO: MEDICIÓN DE TÍTULO)
function _generateSlidesWithPhantom(trackElement, htmlContent, maxContentHeight, titleText) {
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
        `👻 PHANTOM START. MaxHeight Limit: ${maxContentHeight}px`);

    const slides = [];
    
    // 1. Crear Phantom Slide
    const phantomSlide = document.createElement('div');
    phantomSlide.className = 'swiper-slide phantom-slide';
    phantomSlide.style.visibility = 'hidden';
    phantomSlide.style.position = 'absolute';
    phantomSlide.style.top = '0';
    phantomSlide.style.left = '0';
    phantomSlide.style.zIndex = '-1000';
    phantomSlide.style.width = '100%'; 
    phantomSlide.style.height = 'auto'; 

    phantomSlide.innerHTML = `
        <div class="detail-text-fragment" style="height: auto !important; max-height: none !important; padding-bottom: 0 !important;">
            <div class="content-wrapper" id="phantom-content"></div>
        </div>
    `;

    trackElement.appendChild(phantomSlide);
    const phantomContent = phantomSlide.querySelector('#phantom-content');

    // 🟢 2. CALCULAR ALTURA DEL TÍTULO (Solo para restar espacio al Slide 1)
    let titleHeight = 0;
    if (titleText) {
        const titleFake = document.createElement('h2');
        titleFake.className = 'detail-title-slide';
        titleFake.textContent = titleText;
        titleFake.style.display = 'block'; 
        
        // Lo insertamos temporalmente para medir
        phantomSlide.insertBefore(titleFake, phantomSlide.firstChild);
        titleHeight = titleFake.offsetHeight + parseFloat(getComputedStyle(titleFake).marginBottom || 0);
        
        debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
            `📏 TITLE HEIGHT: ${titleHeight}px. (Will be subtracted from Slide 1 limit)`);
        
        // Lo quitamos para que no interfiera en la medición del contenido (ya restaremos su valor manualmente)
        titleFake.remove(); 
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent.trim();
    const nodes = Array.from(tempDiv.childNodes);

    let currentSlideBuffer = [];
    let isFirstSlide = true;

    const flushSlide = (reason) => {
        if (currentSlideBuffer.length === 0 && !isFirstSlide) return;

        const contentStr = currentSlideBuffer.join('');
        slides.push({
            isFirst: isFirstSlide,
            content: contentStr
        });

        debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
            `📦 FLUSH SLIDE #${slides.length}. Reason: [${reason}]. Len: ${contentStr.length} chars.`);

        isFirstSlide = false;
        currentSlideBuffer = [];
        phantomContent.innerHTML = ''; 
    };

    for (const node of nodes) {
        if (node.nodeType === 3 && node.textContent.trim().length === 0) continue;
        if (node.tagName === 'HR') { flushSlide("Tag <HR>"); continue; }
        
        if (node.tagName === 'BR') {
            currentSlideBuffer.push('<br>');
            phantomContent.insertAdjacentHTML('beforeend', '<br>');
            
            // Límite Dinámico: Si es Slide 1, restamos el título
            const currentLimit = isFirstSlide ? (maxContentHeight - titleHeight) : maxContentHeight;
            
            if (phantomSlide.scrollHeight > currentLimit) {
                currentSlideBuffer.pop(); 
                flushSlide("Overflow by <BR>");
            }
            continue;
        }

        const nodeHTML = (node.nodeType === 1) ? node.outerHTML : node.textContent;

        // Intento 1: Nodo completo
        phantomContent.insertAdjacentHTML('beforeend', nodeHTML);
        const currentHeight = phantomSlide.scrollHeight;
        
        // Límite Dinámico
        const currentLimit = isFirstSlide ? (maxContentHeight - titleHeight) : maxContentHeight;

        debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
            `🔍 Testing Node. H: ${currentHeight}px / Limit: ${currentLimit}px (IsFirst: ${isFirstSlide})`);

        if (currentHeight <= currentLimit) {
            currentSlideBuffer.push(nodeHTML);
        } else {
            // FRAGMENTACIÓN
            debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, `⚠️ OVERFLOW. Splitting...`);

            // Revertir
            phantomContent.innerHTML = currentSlideBuffer.join(''); 
            
            const textContent = node.textContent; 
            const words = textContent.split(' ');
            let wordBuffer = "";
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const wordWithSpace = word + " ";
                
                const span = document.createElement('span');
                span.textContent = wordWithSpace;
                phantomContent.appendChild(span);
                
                const spanHeight = phantomSlide.scrollHeight;
                
                // Recalcular límite en cada vuelta por si cambiamos de slide dentro del bucle
                const loopLimit = isFirstSlide ? (maxContentHeight - titleHeight) : maxContentHeight;

                if (spanHeight > loopLimit) {
                    phantomContent.removeChild(span); 
                    
                    if (wordBuffer.length > 0) currentSlideBuffer.push(wordBuffer);
                    
                    flushSlide("Word Overflow: " + word); // AL HACER FLUSH, isFirstSlide SE VUELVE FALSE

                    // Iniciar nuevo slide
                    wordBuffer = wordWithSpace; 
                    phantomContent.textContent = wordBuffer; 
                } else {
                    wordBuffer += wordWithSpace;
                }
            }
            if (wordBuffer.length > 0) currentSlideBuffer.push(wordBuffer);
        }
    }

    flushSlide("End of Content");
    trackElement.removeChild(phantomSlide);
    return slides;
}

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
        speed: data.SWIPER.SLIDE_SPEED,
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

export function _mostrarDetalle(cursoId, forceRepaint = false) {
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
        `Mostrando detalle para: ${cursoId}`);
    
    const layoutMode = document.body.getAttribute('data-layout') || 'desktop';
    const isMobile = layoutMode === 'mobile';
    
    // Estado
    this.STATE.activeCourseId = cursoId; 
    const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion); 
    if (!curso) return;

    // Limpieza UI
    if (typeof this._destroyCarousel === 'function') this._destroyCarousel();
    
    [
        'vista-navegacion-desktop', 
        'vista-navegacion-tablet', 
        'vista-navegacion-mobile'
    ].forEach(id => {
        const el = document.getElementById(id); 
        if (el) { 
            el.classList.remove('active'); 
            el.style.display = 'none'; 
        }
    });

    const desktopView = document.getElementById('vista-detalle-desktop');
    const mobileView = document.getElementById('vista-detalle-mobile');
    
    if (desktopView) { 
        desktopView.classList.remove('active'); 
        desktopView.style.display = 'none'; 
    }
    if (mobileView) { 
        mobileView.classList.remove('active'); 
        mobileView.style.display = 'none'; 
    }

    this.DOM.vistaDetalle = isMobile ? mobileView : desktopView;
    this.DOM.vistaDetalle.style.display = 'flex'; 
    this.DOM.vistaDetalle.classList.add('active');

    this.DOM.detalleTrack = isMobile ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 
    if (this.DOM.detalleTrack) {
        this.DOM.detalleTrack.removeAttribute('aria-live');
        this.DOM.detalleTrack.removeAttribute('role'); 
        this.DOM.detalleTrack.innerHTML = ''; 
    }

    const swiperId = isMobile ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    // UI Paneles
    const vistaVolver = document.getElementById('vista-volver');
    const infoAdicional = document.getElementById('info-adicional');
    const cardVolverFija = document.getElementById('card-volver-fija-elemento');
    const cardNivelActual = document.getElementById('card-nivel-actual');

    if (!isMobile) {
        if (vistaVolver) vistaVolver.classList.add('visible');
        if (infoAdicional) {
            if (layoutMode === 'tablet-portrait') infoAdicional.classList.remove('visible');
            else infoAdicional.classList.add('visible');
        }
        if (cardVolverFija) {
            cardVolverFija.classList.add('visible');
            cardVolverFija.innerHTML = `<h3>${data.LOGO.VOLVER}</h3>`; 
            cardVolverFija.tabIndex = 0;
            cardVolverFija.onclick = () => this._handleVolverClick(); 
        }
        if (cardNivelActual) {
            cardNivelActual.classList.add('visible');
            const currentStack = this.stackGetCurrent();
            let parentTitle = 'Nivel Raíz'; 
            if (currentStack && currentStack.levelId) {
                const parentNode = this._findNodoById(currentStack.levelId, this.STATE.fullData.navegacion);
                if (parentNode) parentTitle = parentNode.nombre || parentNode.titulo || parentTitle;
            } else {
                parentTitle = this.getString ? this.getString('nav.breadcrumbRoot') : 'Nivel Raíz';
            }
            cardNivelActual.innerHTML = `<h3>${parentTitle}</h3>`;
        }
    } else {
        if (vistaVolver) vistaVolver.classList.remove('visible');
        if (infoAdicional) infoAdicional.classList.remove('visible');
    }

    let slidesHtml = '';

    // Header Mobile
    if (isMobile) {
        const parent = this.stackGetCurrent();
        let parentName = this.getString('nav.breadcrumbRoot');
        if (parent && parent.levelId) {
            const parentNodo = this._findNodoById(parent.levelId, this.STATE.fullData.navegacion);
            if (parentNodo) parentName = parentNodo.nombre || parentNodo.titulo || parentName;
        }
        const ariaLabel = this.getString('nav.aria.backBtn');
        slidesHtml += `
            <div class="swiper-slide">
                <article class="card card-breadcrumb-vertical" tabindex="0" role="heading" aria-level="3" style="margin-bottom: 10px;">
                    <h3>${parentName}</h3>
                </article>
                <article class="card card-volver-vertical" role="button" aria-label="${ariaLabel}" tabindex="0" onclick="App._handleVolverClick()">
                    <h3>${data.LOGO.VOLVER}</h3>
                </article>
            </div>
        `;
    }

    // 🟢 GENERACIÓN DE CONTENIDO (PHANTOM vs ESTÁNDAR)
    const descripcion = curso.descripcion || this.getString('details.noDescription');
    
    if (isMobile) {
        // En Móvil usamos el algoritmo Phantom para garantizar que nada se corte
        const maxH = _calculateMaxHeightAvailable();
        const slidesData = _generateSlidesWithPhantom(this.DOM.detalleTrack, descripcion, maxH, curso.titulo);

        slidesData.forEach((slide, index) => {
            let titleHtml = '';
            // El título va en el primer slide
            if (slide.isFirst) titleHtml = `<h2 class="detail-title-slide" aria-hidden="true">${curso.titulo}</h2>`;
            
            slidesHtml += `
                <div class="swiper-slide">
                    ${titleHtml}
                    <div class="detail-text-fragment" data-index="${index}" role="article" tabindex="0" onclick="this.focus()">
                        <div class="content-wrapper">${slide.content}</div>
                    </div>
                </div>
            `;
        });
    } else {
        // En Desktop, usamos una lógica más simple (agrupar bloques)
        // ya que el scroll vertical es más tolerante o el diseño es diferente.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = descripcion.trim();
        const nodes = Array.from(tempDiv.childNodes);
        
        let buffer = [];
        let slides = [];
        let currentLen = 0;
        const DESK_LIMIT = 700; // Límite generoso

        const flushDesk = () => {
            if (buffer.length > 0) {
                slides.push(buffer.join(''));
                buffer = [];
                currentLen = 0;
            }
        };

        nodes.forEach(node => {
            if (node.tagName === 'HR') { flushDesk(); return; }
            const html = node.nodeType === 1 ? node.outerHTML : node.textContent;
            
            if (currentLen + html.length > DESK_LIMIT) flushDesk();
            
            buffer.push(html);
            currentLen += html.length;
        });
        flushDesk();

        slides.forEach((content, index) => {
            const titleHtml = index === 0 ? `<h2 class="detail-title-slide" aria-hidden="true">${curso.titulo}</h2>` : '';
            slidesHtml += `
                <div class="swiper-slide">
                    ${titleHtml}
                    <div class="detail-text-fragment" 
                        data-index="${index}" 
                        role="article" 
                        tabindex="0" 
                        onclick="this.focus()">

                        <div class="content-wrapper">${content}</div>
                    </div>
                </div>
            `;
        });
    }

    // Enlaces
    if (curso.enlaces) {
        curso.enlaces.forEach((enlace, index) => {
            const iconClass = (enlace.type === 'c') ? 'icon-buy' : (enlace.type === 'd' ? 'icon-download' : 'icon-link');
            const textId = `action-text-${index}`; 
            const isDisabled = !enlace.url || enlace.url === '#';
            const style = isDisabled ? 'style="pointer-events: none;"' : '';
            const ariaDisabledAttr = isDisabled ? 'aria-disabled="true"' : '';
            slidesHtml += `
                <div class="swiper-slide detail-action-slide">
                    <div class="detail-action-item" 
                        ${ariaDisabledAttr} 
                        onclick="App._handleActionRowClick(event)" 
                        tabindex="0" 
                        role="button" 
                        aria-labelledby="${textId}">

                        <span id="${textId}" 
                            class="detail-action-text">
                            ${enlace.texto}
                        </span>
                        <a ${isDisabled ? 'role="link" aria-disabled="true"' : `href="${enlace.url}" target="_blank"`} tabindex="-1" aria-hidden="true" ${style} class="detail-action-btn ${isDisabled ? 'disabled' : ''}">
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
                            aria-hidden="true">
                        </div>`;
    }

    if (this.DOM.detalleTrack) {
        this.DOM.detalleTrack.innerHTML = slidesHtml;
    }

    _initDetailCarousel(this, swiperId, 0);

    if (!document.getElementById('a11y-modal-overlay')?.classList.contains('active')) {
        const mensajeContexto = `${this.getString('nav.contextPrefix') || 'Curso: '} ${curso.titulo}`;
        this.announceA11y(mensajeContexto);
    }
    
    // Foco
    setTimeout(() => {
        if (document.getElementById('a11y-modal-overlay')?.classList.contains('active')) return;
        let targetElement = null;
        if (isMobile) {
            targetElement = this.DOM.detalleTrack.querySelector('.card-volver-vertical');

            if (!targetElement) 
                targetElement = this.DOM.detalleTrack.querySelector('.detail-text-fragment[data-index="0"]');
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