/* --- code/render-details.js --- */

import * as debug from './debug.js';
import * as data from './data.js';
import * as nav_base_details from './nav-base-details.js';

// 🟢 HELPER: Detección de entorno táctil (Físico vs Virtual)
function _isTouchDevice() {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
}

// 🟢 CÁLCULO DE ALTURA DISPONIBLE (Ajustado a Zoom Extremo)
function _calculateMaxHeightAvailable() {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    
    // Solo medimos para log de diagnóstico, pero NO restamos según instrucción
    const headerEl = document.getElementById('app-header');
    const headerH = headerEl ? headerEl.offsetHeight : 0;
    const footerEl = document.querySelector('footer');
    const footerH = footerEl ? footerEl.offsetHeight : 0;

    const safetyMargin = 2; // Margen mínimo solicitado (2px)

    // Asumimos que el VH ya es el espacio útil visible
    const availableHeight = vh - headerH - footerH - safetyMargin;

    debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
        `📏 HEIGHT CALC: Viewport:${vh} - Header:${headerH} - Footer:${footerH} - Margin:${safetyMargin} = Available:${availableHeight}px`);

    return Math.max(50, availableHeight);
}

// 🟢 ESTRATEGIA A: MODO ESTRUCTURAL (Touch / Desktop Normal)
// 1 <HR> = 1 Slide. Sin cortes.
function _generateSlidesStructural(rawDescription) {
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
        `Strategy: STRUCTURAL (1 HR = 1 Slide)`);
    
    // Dividir por <HR> (case insensitive)
    const fragments = rawDescription.split(/<hr\s*\/?>/i);
    
    return fragments.map((text, index) => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        
        // Envolver siempre en <p> para CSS
        return {
            isFirst: index === 0,
            content: `<p>${trimmed}</p>`
        };
    }).filter(s => s !== null);
}

// 🟢 ESTRATEGIA B: MODO VISUAL / CONTINUOUS FLOW (Virtual / Zoom)
// Llenado hidráulico respetando identidad de párrafo <p>
function _generateSlidesContinuous(trackElement, rawDescription, maxContentHeight, titleText) {
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
        `Strategy: CONTINUOUS FLOW. MaxHeight: ${maxContentHeight}px`);

    const slides = [];
    
    // 1. Preparar la Cola de Bloques (Queue)
    const rawFragments = rawDescription.split(/<hr\s*\/?>/i);
    let blockQueue = []; 

    // Convertimos cada fragmento del JSON en un nodo <p> real para la cola
    rawFragments.forEach(text => {
        if (!text.trim()) return;
        const p = document.createElement('p');
        p.innerHTML = text.trim(); 
        blockQueue.push(p);
    });

    // 2. Preparar Phantom (Con ancho forzado real)
    const phantomSlide = document.createElement('div');
    phantomSlide.className = 'swiper-slide phantom-slide';
    phantomSlide.style.visibility = 'hidden';
    phantomSlide.style.position = 'absolute';
    phantomSlide.style.zIndex = '-1000';
    
    // Forzar ancho real del contenedor padre
    const realWidth = trackElement.clientWidth;
    phantomSlide.style.width = `${realWidth}px`;
    phantomSlide.style.height = 'auto'; // Crecer libremente
    phantomSlide.style.boxSizing = 'border-box';

    phantomSlide.innerHTML = `
        <div class="detail-text-fragment" 
            style="height: auto !important; max-height: none !important; padding-bottom: 0 !important;">
            
            <div class="content-wrapper" 
                id="phantom-content">
            </div>
        </div>
    `;
    trackElement.appendChild(phantomSlide);
    const phantomContent = phantomSlide.querySelector('#phantom-content');

    // Gestión del Título (Solo resta espacio en Slide 1 mediante cálculo)
    let titleHeight = 0;
    if (titleText) {
        const titleFake = document.createElement('h2');
        titleFake.className = 'detail-title-slide';
        titleFake.textContent = titleText;
        titleFake.style.display = 'block';
        phantomSlide.insertBefore(titleFake, phantomSlide.firstChild);
        
        // Medimos y quitamos
        titleHeight = titleFake.offsetHeight + parseFloat(getComputedStyle(titleFake).marginBottom || 0);
        titleFake.remove();
        
        debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
            `Title Height Offset: ${titleHeight}px`);
    }

    // 3. Bucle de Llenado
    let currentSlideHTML = ""; 
    let isFirstSlide = true;

    while (blockQueue.length > 0) {
        const currentBlock = blockQueue.shift(); // Sacamos el siguiente párrafo <p>
        
        // Probamos a meter el párrafo entero junto con lo que ya tengamos
        const prevHTML = phantomContent.innerHTML; // Guardar estado
        // OJO: currentBlock.outerHTML incluye <p>...</p>, preservando márgenes
        phantomContent.insertAdjacentHTML('beforeend', currentBlock.outerHTML);

        // Límite dinámico (Slide 1 tiene menos espacio por el título)
        const currentLimit = isFirstSlide ? (maxContentHeight - titleHeight) : maxContentHeight;
        const currentHeight = phantomSlide.scrollHeight;

        if (currentHeight <= currentLimit) {
            // ✅ CABE ENTERO
            currentSlideHTML += currentBlock.outerHTML;

            debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
                `✅ Paragraph fits. Accumulating...`);
        } else {
            // ❌ NO CABE: HAY QUE PARTIR EL PÁRRAFO
            debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
                `⚠️ Paragraph overflow. Splitting...`);

            // Restauramos el phantom a lo que había antes de intentar meter este bloque
            phantomContent.innerHTML = currentSlideHTML;
            
            // Creamos un <p> temporal dentro del phantom para ir llenando palabra a palabra
            // Esto asegura que mientras medimos, el margen del <p> se aplique (si hay elementos previos)
            const tempP = document.createElement('p');
            phantomContent.appendChild(tempP);

            const words = currentBlock.textContent.split(' '); 
            let acceptedWords = [];
            let rejectedWords = [];
            let splitOccurred = false;

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const testText = (acceptedWords.length > 0 ? acceptedWords.join(' ') + " " : "") + word;
                
                tempP.textContent = testText;
                
                // Medimos la altura total del phantom (acumulado + este párrafo creciendo)
                if (phantomSlide.scrollHeight > currentLimit) {
                    splitOccurred = true;
                    rejectedWords = words.slice(i);
                    break;
                } else {
                    acceptedWords.push(word);
                }
            }

            // Si cupo algo, lo guardamos envuelto en <p>
            if (acceptedWords.length > 0) {
                currentSlideHTML += `<p>${acceptedWords.join(' ')}</p>`;
            }

            // 🚀 CERRAMOS EL SLIDE ACTUAL
            slides.push({ isFirst: isFirstSlide, content: currentSlideHTML });

            debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
                `📦 FLUSH SLIDE. Content Len: ${currentSlideHTML.length}`);
            
            // RESET PARA EL SIGUIENTE SLIDE
            isFirstSlide = false;
            currentSlideHTML = "";
            phantomContent.innerHTML = "";

            // GESTIÓN DEL RESIDUO
            if (splitOccurred) {
                // Creamos un nuevo <p> con el resto y lo devolvemos al principio de la cola
                const residueBlock = document.createElement('p');
                residueBlock.textContent = rejectedWords.join(' ');
                blockQueue.unshift(residueBlock);

            } else if (acceptedWords.length === 0) {
                // Caso extremo: No cupo ni una palabra.
                // Si el slide actual estaba vacío, forzamos meter una palabra para evitar bucle infinito
                if (slides.length > 0 && slides[slides.length-1].content === "") {
                    // Forzar avance (truncar palabra si es necesario, o aceptar overflow mínimo)
                    // En este código simplificado, asumimos que al menos una palabra cabe en un slide vacío.
                    // Devolvemos a cola para slide vacío
                    blockQueue.unshift(currentBlock);
                } else {
                    // Devolvemos a cola para que se procese en el siguiente slide (que estará vacío)
                    blockQueue.unshift(currentBlock);
                }
            }
        }
    }

    // Flush final del último resto
    if (currentSlideHTML.trim().length > 0) {
        slides.push({ isFirst: isFirstSlide, content: currentSlideHTML });
    }

    trackElement.removeChild(phantomSlide);
    return slides;
}

export function _mostrarDetalle(cursoId, forceRepaint = false) {
    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, `Mostrando detalle para: ${cursoId}`);
    
    // Configuración de Entorno
    const isTouch = _isTouchDevice();
    const layoutMode = document.body.getAttribute('data-layout') || 'desktop';
    const isMobileLayout = layoutMode === 'mobile'; 
    
    // Lógica de decisión:
    // Continuous Flow SOLO si es Layout Móvil Y NO es táctil (Zoom/Virtual)
    const useContinuousFlow = isMobileLayout && !isTouch;

    this.STATE.activeCourseId = cursoId; 
    const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion); 
    if (!curso) return;

    if (typeof this._destroyCarousel === 'function') this._destroyCarousel();
    
    ['vista-navegacion-desktop', 'vista-navegacion-tablet', 'vista-navegacion-mobile'].forEach(id => {
        const el = document.getElementById(id); if (el) { el.classList.remove('active'); el.style.display = 'none'; }
    });

    const desktopView = document.getElementById('vista-detalle-desktop');
    const mobileView = document.getElementById('vista-detalle-mobile');
    
    if (desktopView) { desktopView.classList.remove('active'); desktopView.style.display = 'none'; }
    if (mobileView) { mobileView.classList.remove('active'); mobileView.style.display = 'none'; }

    this.DOM.vistaDetalle = isMobileLayout ? mobileView : desktopView;
    this.DOM.vistaDetalle.style.display = 'flex'; 
    this.DOM.vistaDetalle.classList.add('active');

    this.DOM.detalleTrack = isMobileLayout ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop'); 
    if (this.DOM.detalleTrack) {
        this.DOM.detalleTrack.removeAttribute('aria-live');
        this.DOM.detalleTrack.innerHTML = ''; 
    }
    const swiperId = isMobileLayout ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

    // UI Standard
    const vistaVolver = document.getElementById('vista-volver');
    const infoAdicional = document.getElementById('info-adicional');
    if (!isMobileLayout) {
        if (vistaVolver) vistaVolver.classList.add('visible');
        if (infoAdicional) infoAdicional.classList.add('visible');
    } else {
        if (vistaVolver) vistaVolver.classList.remove('visible');
        if (infoAdicional) infoAdicional.classList.remove('visible');
    }

    // GENERACIÓN DE CONTENIDO
    let slidesHtml = '';

    // Header Mobile
    if (isMobileLayout) {
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

    const descripcion = curso.descripcion || this.getString('details.noDescription');
    let slidesData = [];

    if (useContinuousFlow) {
        const maxH = _calculateMaxHeightAvailable();
        slidesData = _generateSlidesContinuous(this.DOM.detalleTrack, descripcion, maxH, curso.titulo);
    } else {
        slidesData = _generateSlidesStructural(descripcion);
    }

    slidesData.forEach((slide, index) => {
        let titleHtml = '';
        if (slide.isFirst) {
            titleHtml = `<h2 class="detail-title-slide" aria-hidden="true">${curso.titulo}</h2>`;
        }
        
        slidesHtml += `
            <div class="swiper-slide">
                ${titleHtml}
                <div class="detail-text-fragment" data-index="${index}" role="article" tabindex="0" onclick="this.focus()">
                    <div class="content-wrapper">${slide.content}</div>
                </div>
            </div>
        `;
    });

    if (curso.enlaces) {
        curso.enlaces.forEach((enlace, index) => {
            const iconClass = (enlace.type === 'c') ? 'icon-buy' : (enlace.type === 'd' ? 'icon-download' : 'icon-link');
            const isDisabled = !enlace.url || enlace.url === '#';
            const style = isDisabled ? 'style="pointer-events: none;"' : '';
            const ariaDisabledAttr = isDisabled ? 'aria-disabled="true"' : '';
            slidesHtml += `
                <div class="swiper-slide detail-action-slide">
                    <div class="detail-action-item" ${ariaDisabledAttr} onclick="App._handleActionRowClick(event)" tabindex="0" role="button">
                        <span class="detail-action-text">${enlace.texto}</span>
                        <a ${isDisabled ? 'role="link" aria-disabled="true"' : `href="${enlace.url}" target="_blank"`} tabindex="-1" aria-hidden="true" ${style} class="detail-action-btn ${isDisabled ? 'disabled' : ''}">
                            <i class="action-icon ${isDisabled ? 'icon-vacio' : iconClass}"></i>
                        </a>
                    </div>
                </div>
            `;
        });
    }

    if (isMobileLayout) {
        slidesHtml += `<div class="swiper-slide card-relleno-final" style="height: 100px !important; pointer-events: none;" aria-hidden="true"></div>`;
    }

    if (this.DOM.detalleTrack) {
        this.DOM.detalleTrack.innerHTML = slidesHtml;
    }

    _initDetailCarousel(this, swiperId, 0);

    if (!document.getElementById('a11y-modal-overlay')?.classList.contains('active')) {
        const mensajeContexto = `${this.getString('nav.coursePrefix') || 'Curso: '} ${curso.titulo}`;
        this.announceA11y(mensajeContexto);
    }
    
    setTimeout(() => {
        if (document.getElementById('a11y-modal-overlay')?.classList.contains('active')) return;
        let targetElement = null;
        if (isMobileLayout) {
            targetElement = this.DOM.detalleTrack.querySelector('.card-volver-vertical');
            if (!targetElement) targetElement = this.DOM.detalleTrack.querySelector('.detail-text-fragment[data-index="0"]');
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

        // 🟢 Desactivar la gestión A11y de Swiper para evitar conflictos
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

/* --- code/render-details.js --- */