/* --- code/render/render-details.js --- */

import * as debug from '../debug/debug.js';
import * as data from '../services/data.js';
import * as nav_base_details from '../features/navigation/nav-base-details.js';

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
        `📏 HEIGHT CALC: Available:${availableHeight}px = ` +
        `Viewport:${vh} - Header:${headerH} - Footer:${footerH} - Margin:${safetyMargin}`);

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
function _generateSlidesContinuous(trackElement, 
                                   rawDescription, 
                                   maxContentHeight, 
                                   titleText) {

    try {
        debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
            `Strategy: CONTINUOUS FLOW. MaxHeight: ${maxContentHeight}px`);

        const slides = [];
        const rawFragments = rawDescription.split(/<hr\s*\/?>/i);
        let blockQueue = []; 

        rawFragments.forEach(text => {
            if (!text.trim()) return;
            const p = document.createElement('p');
            p.innerHTML = text.trim(); 
            blockQueue.push(p);
        });

        const phantomSlide = document.createElement('div');
        phantomSlide.className = 'swiper-slide phantom-slide';
        phantomSlide.style.visibility = 'hidden';
        phantomSlide.style.position = 'absolute';
        phantomSlide.style.zIndex = '-1000';

        const realWidth = trackElement.clientWidth;
        phantomSlide.style.width = `${realWidth}px`;
        phantomSlide.style.height = 'auto'; 
        phantomSlide.style.boxSizing = 'border-box';

        phantomSlide.innerHTML = `
            <div class="detail-text-fragment" 
                style="height: auto !important; max-height: none !important; padding-bottom: 0 !important;">
                <div class="content-wrapper" id="phantom-content"></div>
            </div>
        `;
        trackElement.appendChild(phantomSlide);
        const phantomContent = phantomSlide.querySelector('#phantom-content');

        let titleHeight = 0;
        if (titleText) {
            const titleFake = document.createElement('h2');
            titleFake.className = 'detail-title-slide';
            titleFake.textContent = titleText;
            titleFake.style.display = 'block';
            phantomSlide.insertBefore(titleFake, phantomSlide.firstChild);

            titleHeight = titleFake.offsetHeight + parseFloat(
                getComputedStyle(titleFake).marginBottom || 0);

            titleFake.remove();
        }

        let currentSlideHTML = ""; 
        let isFirstSlide = true;

        while (blockQueue.length > 0) {
            const currentBlock = blockQueue.shift(); 
            phantomContent.insertAdjacentHTML('beforeend', currentBlock.outerHTML);

            const currentLimit = isFirstSlide ? (maxContentHeight - titleHeight) : maxContentHeight;
            const currentHeight = phantomSlide.scrollHeight;

            if (currentHeight <= currentLimit) {
                currentSlideHTML += currentBlock.outerHTML;
            } else {
                phantomContent.innerHTML = currentSlideHTML;
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

                    if (phantomSlide.scrollHeight > currentLimit) {
                        splitOccurred = true;

                        // 🟢 RETROCESO SEMÁNTICO (A11Y)
                        let cutIndex = acceptedWords.length - 1;
                        let found = false;
                        
                        // 1. Buscar Puntuación Fuerte (Puntos, cierres de interrogación/exclamación)
                        // Contempla si hay comillas o paréntesis después del punto: [.?!]["')\]]*$
                        for (let j = acceptedWords.length - 1; j >= 0; j--) {
                            if (/[.?!]["')\]]*$/.test(acceptedWords[j])) { cutIndex = j; found = true; break; }
                        }
                        
                        // 2. Si no hay puntos, buscar Puntuación Débil (Comas, punto y coma, dos puntos, guiones)
                        if (!found) {
                            for (let j = acceptedWords.length - 1; j >= 0; j--) {
                                if (/[,;:-]["')\]]*$/.test(acceptedWords[j])) { cutIndex = j; found = true; break; }
                            }
                        }

                        // 3. Válvula de seguridad: Si respetar la pausa semántica obliga a vaciar más del 70% 
                        // de la pantalla (ej: zoom extremo 400% sin comas), hacemos fallback al corte de palabra duro.
                        if (found && cutIndex < Math.floor(acceptedWords.length * 0.3)) {
                            cutIndex = acceptedWords.length - 1; 
                        }

                        // Aplicamos el corte
                        const finalAccepted = acceptedWords.slice(0, cutIndex + 1);
                        const returnedWords = acceptedWords.slice(cutIndex + 1);
                        
                        // Lo rechazado es lo que devolvemos + todo lo que quedaba en el bucle original
                        rejectedWords = [...returnedWords, ...words.slice(i)];
                        acceptedWords = finalAccepted;
                        // ---------------------------------------------

                        break;
                    } else {
                        acceptedWords.push(word);
                    }
                }

                if (acceptedWords.length > 0) {
                    currentSlideHTML += `<p>${acceptedWords.join(' ')}</p>`;
                }

                slides.push({ isFirst: isFirstSlide, content: currentSlideHTML });

                isFirstSlide = false;
                currentSlideHTML = "";
                phantomContent.innerHTML = "";

                if (splitOccurred) {
                    const residueBlock = document.createElement('p');
                    residueBlock.textContent = rejectedWords.join(' ');
                    blockQueue.unshift(residueBlock);
                } else if (acceptedWords.length === 0) {
                    if (slides.length > 0 && slides[slides.length-1].content === "") {
                        blockQueue.unshift(currentBlock);
                    } else {
                        blockQueue.unshift(currentBlock);
                    }
                }
            }
        }

        if (currentSlideHTML.trim().length > 0) {
            slides.push({ isFirst: isFirstSlide, content: currentSlideHTML });
        }

        trackElement.removeChild(phantomSlide);
        return slides;

    } catch (error) {
        debug.logError('render_details', `Error en generación continua: ${error.message}`);

        return [];
    };
}

// 🟢 Llenado Hidráulico para Táctil (Corta párrafos gigantes en <p> más pequeños)
function _fragmentTextForSingleSlide(trackElement, 
                                     rawDescription, 
                                     maxContentHeight, 
                                     titleText, 
                                     readOnlyMsg) {

    try {
        debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
            `Strategy: FRAGMENTACIÓN TÁCTIL. MaxH: ${maxContentHeight}px`);

        const rawFragments = rawDescription.split(/<hr\s*\/?>/i);
        let finalHtml = "";

        // 1. Crear el fantasma de medición
        const phantomSlide = document.createElement('div');
        phantomSlide.className = 'swiper-slide phantom-slide';
        phantomSlide.style.visibility = 'hidden';
        phantomSlide.style.position = 'absolute';
        phantomSlide.style.zIndex = '-1000';
        
        // Ancho real del carrusel para que el texto haga saltos de línea idénticos a la realidad
        const realWidth = trackElement.clientWidth || window.innerWidth;
        phantomSlide.style.width = `${realWidth}px`;
        phantomSlide.style.height = 'auto';
        phantomSlide.style.boxSizing = 'border-box';

        // Usamos el mismo HTML interno que el real
        phantomSlide.innerHTML = `
            <div class="content-wrapper">
                <p class="detail-text-fragment" id="phantom-p"></p>
            </div>
        `;
        trackElement.appendChild(phantomSlide);
        const phantomP = phantomSlide.querySelector('#phantom-p');

        // 2. Medir y restar el título para el primer fragmento
        let titleHeight = 0;
        if (titleText) {
            const titleFake = document.createElement('h2');
            titleFake.className = 'detail-title-slide detail-text-fragment';
            titleFake.textContent = titleText;
            titleFake.style.display = 'block';
            phantomSlide.insertBefore(titleFake, phantomSlide.firstChild);
            
            titleHeight = titleFake.offsetHeight + parseFloat(
                getComputedStyle(titleFake).marginBottom || 0);
            titleFake.remove(); // Lo quitamos para no ensuciar el cálculo de los siguientes <p>
        }

        let isFirstParagraph = true;

        // 3. Proceso de corte palabra a palabra
        rawFragments.forEach(text => {
            const trimmed = text.trim();
            if (!trimmed) return;

            phantomP.textContent = trimmed;
            
            // El primer párrafo dispone de menos altura porque tiene el título encima
            let currentLimit = isFirstParagraph ? (maxContentHeight - titleHeight) : maxContentHeight;
            if (currentLimit < 50) currentLimit = 50; // Margen de seguridad anti-bucles

            if (phantomP.offsetHeight <= currentLimit) {
                // ✅ Cabe entero, lo añadimos tal cual
                finalHtml += `<p class="detail-text-fragment" 
                                 tabindex="0" 
                                 role="article" 
                                 aria-description="${readOnlyMsg}" 
                                 onclick="this.focus()">
                                ${trimmed}
                               </p>`;
                isFirstParagraph = false;
            } else {
                // ❌ Es gigante. A trocear palabra por palabra con Retroceso Semántico
                const words = trimmed.split(' ');
                let currentWords = [];
                
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    currentWords.push(word);
                    phantomP.textContent = currentWords.join(' ');
                    
                    // Si esta palabra hace que se pase del límite
                    if (phantomP.offsetHeight > currentLimit) {
                        if (currentWords.length > 1) {
                            currentWords.pop(); // Sacamos la palabra culpable
                            
                            // 🟢 RETROCESO SEMÁNTICO (A11Y)
                            let cutIndex = currentWords.length - 1;
                            let found = false;
                            
                            for (let j = currentWords.length - 1; j >= 0; j--) {
                                if (/[.?!]["')\]]*$/.test(currentWords[j])) { cutIndex = j; found = true; break; }
                            }
                            if (!found) {
                                for (let j = currentWords.length - 1; j >= 0; j--) {
                                    if (/[,;:-]["')\]]*$/.test(currentWords[j])) { cutIndex = j; found = true; break; }
                                }
                            }
                            if (found && cutIndex < Math.floor(currentWords.length * 0.3)) {
                                cutIndex = currentWords.length - 1;
                            }

                            const finalAccepted = currentWords.slice(0, cutIndex + 1);
                            const returnedWords = currentWords.slice(cutIndex + 1);
                            // ---------------------------------------------

                            // Imprimimos el párrafo con el corte limpio semánticamente
                            finalHtml += `<p class="detail-text-fragment" 
                                             tabindex="0" 
                                             role="article" 
                                             aria-description="${readOnlyMsg}" 
                                             onclick="this.focus()">
                                            ${finalAccepted.join(' ')}
                                          </p>`;
                            
                            // Retrocedemos el iterador para que vuelva a tragarse las palabras devueltas
                            i = i - returnedWords.length - 1;
                            
                            currentWords = [];
                            isFirstParagraph = false;
                            currentLimit = maxContentHeight; // A partir de aquí tenemos toda la pantalla libre
                        } else {
                            // Caso extremo (ej. un enlace o palabra larguísima a tamaño 200% o 400% zoom)
                            finalHtml += `<p class="detail-text-fragment" 
                                             tabindex="0" 
                                             role="article" 
                                             aria-description="${readOnlyMsg}" 
                                             onclick="this.focus()">
                                            ${currentWords.join(' ')}
                                          </p>`;
                            currentWords = [];
                            isFirstParagraph = false;
                            currentLimit = maxContentHeight;
                        }
                    }
                }
            }
        });

        trackElement.removeChild(phantomSlide);
        return finalHtml;

    } catch (error) {
        debug.logError('render_details', `Error en fragmentación táctil: ${error.message}`);
    }
}

export function _mostrarDetalle(cursoId, forceRepaint = false) {

    debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
        `Mostrando detalle para: ${cursoId} ` +
        `${this.STATE.isTouchDevice ? ' en Dispositivo Táctil' : ''}`);

    // 🟢 CARGA DINÁMICA DEL CSS ANTES DE RENDERIZAR
    // Usamos el helper centralizado en App para no duplicar lógica
    this._injectCSS('styles/components/style-details.css', 'vortex-css-details').then(() => {
        
        // El resto de la función se ejecuta solo cuando el CSS está listo
        const layoutMode = document.body.getAttribute('data-layout') || 'desktop';
        const isMobileLayout = layoutMode === 'mobile'; 

        this.STATE.activeCourseId = cursoId; 
        const curso = this._findNodoById(cursoId, this.STATE.fullData.navegacion); 
        if (!curso) return;

        // 🟢 Inyectar el SEO específico de este curso
        this.updateSEO(curso);
        
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

        this.DOM.vistaDetalle = isMobileLayout ? mobileView : desktopView;
        this.DOM.vistaDetalle.style.display = 'flex'; 
        this.DOM.vistaDetalle.classList.add('active');

        this.DOM.detalleTrack = isMobileLayout ? document.getElementById('detalle-track-mobile') : document.getElementById('detalle-track-desktop');
        
        if (this.DOM.detalleTrack) {
            this.DOM.detalleTrack.removeAttribute('aria-live');
            this.DOM.detalleTrack.innerHTML = ''; 
        }
        const swiperId = isMobileLayout ? '#detalle-swiper-mobile' : '#detalle-swiper-desktop';

        // 🟢 OBTENER EL NOMBRE DEL PADRE (Lo calculamos una sola vez para Mobile y Desktop)
        const parent = this.stackGetCurrent();
        let parentName = this.getString('nav.breadcrumbRoot');

        if (parent && parent.levelId) {
            const parentNodo = this._findNodoById(parent.levelId, this.STATE.fullData.navegacion);
            if (parentNodo) parentName = parentNodo.nombre || parentNodo.titulo || parentName;
        }

        // UI Standard
        const vistaVolver = document.getElementById('vista-volver');
        const infoAdicional = document.getElementById('info-adicional');
        
        if (!isMobileLayout) {
            if (vistaVolver) 
                vistaVolver.classList.add('visible');

            if (infoAdicional) 
                infoAdicional.classList.add('visible');

            // 🟢 FIX CRÍTICO BUG DE F5: Rellenar elementos internos si venimos de recarga directa
            const cardNivelActual = document.getElementById('card-nivel-actual');
            const cardVolverFijaElemento = document.getElementById('card-volver-fija-elemento');

            if (cardNivelActual) {
                cardNivelActual.classList.add('visible');
                cardNivelActual.innerHTML = `<h2>${parentName}</h2>`;
            }

            if (cardVolverFijaElemento) {
                const visibleText = this.getString('nav.backBtnText');

                // Al estar dentro de un curso, el botón de volver siempre debe estar habilitado
                cardVolverFijaElemento.classList.add('visible');
                cardVolverFijaElemento.innerHTML = `
                    <h2 aria-hidden="true" class="card-volver-content">
                        <span class="card-volver-icon"></span>
                        <span class="card-volver-text">${visibleText}</span>
                    </h2>`;
                cardVolverFijaElemento.setAttribute(
                    'aria-label', this.getString('nav.aria.backBtn'));
                cardVolverFijaElemento.setAttribute(
                    'title', this.getString('nav.aria.backBtn'));
                cardVolverFijaElemento.tabIndex = 0;
            }

        } else {
            if (vistaVolver) 
                vistaVolver.classList.remove('visible');

            if (infoAdicional) 
                infoAdicional.classList.remove('visible');
        }

        // GENERACIÓN DE CONTENIDO
        let slidesHtml = '';

        // Header Mobile
        if (isMobileLayout) {
            const ariaLabel = this.getString('nav.aria.backBtn');
            const visibleText = this.getString('nav.backBtnText');
            
            slidesHtml += `
                <div class="swiper-slide">
                    <article class="card 
                             card-breadcrumb-vertical" 
                             tabindex="-1" 
                             aria-hidden="true" 
                             role="presentation">
                        <h2>${parentName}</h2>
                    </article>
                    <article class="card card-volver-vertical" 
                             role="button" 
                            aria-label="${ariaLabel}" 
                            title="${ariaLabel}" 
                            tabindex="0" 
                            onclick="App._handleVolverClick()">
                        <h2 aria-hidden="true" class="card-volver-content">
                            <span class="card-volver-icon"></span>
                            <span class="card-volver-text">${visibleText}</span>
                        </h2>
                    </article>
                </div>
            `;
        }

        const descripcion = curso.descripcion || this.getString('details.noDescription');
        const readOnlyMsg = this.getString('details.aria.readOnly');
        let slidesData = [];

        // 🟢 Táctil (HTML Puro pero Enfocable) vs No-Táctil
        if (this.STATE.isTouchDevice) {
            
            // 🟢 FIX A11Y + ZOOM EXTREMO: Fragmentamos párrafos gigantes para que quepan en la pantalla
            const maxH = _calculateMaxHeightAvailable();
            const rawHtml = _fragmentTextForSingleSlide(
                this.DOM.detalleTrack, descripcion, maxH, curso.titulo, readOnlyMsg);
            
            slidesData = [{
                isFirst: true,
                content: rawHtml,
                isRaw: true 
            }];
        } else {
            if (isMobileLayout) {
                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                    'Dispositivo NO táctil en Layout Móvil detectado. ' +
                    'Forzando estrategia CONTINUOUS FLOW para mejor experiencia.');

                // 🟢 Llenado Hidráulico
                // Esta maravilla corta los párrafos dependiendo de la altura de la pantalla del usuario.
                // Si tiene un zoom del 400%, hará más cortes para que nada se salga del monitor.
                const maxH = _calculateMaxHeightAvailable();

                slidesData = _generateSlidesContinuous(this.DOM.detalleTrack, 
                                                       descripcion, 
                                                       maxH, 
                                                       curso.titulo);

            } else {
                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                    'Dispositivo NO táctil en Layout NO Móvil detectado. ' + 
                    'Usando estrategia ESTRUCTURAL para respetar la intención editorial.');
                    
                //Escritorio/Teclado: Slides estructurales divididos por <hr>
                slidesData = _generateSlidesStructural(descripcion);
            }
        }

        // 🟢 FIX A11Y: Guardamos el tamaño total de fragmentos
        const totalSlides = slidesData.length;

        slidesData.forEach((slide, index) => {
            let titleHtml = '';
            if (slide.isFirst) {
                // 🟢 FIX ARQUITECTURA: El título NUNCA debe recibir el foco espacial 
                // Es solo un elemento estructural/visual. 
                // El foco debe caer en el primer párrafo <p> real.
                // Le ponemos aria-hidden="true" si no es raw para que el SR no lo lea dos veces si la tarjeta entera ya tiene aria-label
                const titleTab = slide.isRaw ? '' : 'aria-hidden="true"';
                
                titleHtml = `<h2 class="detail-title-slide" ${titleTab}>${curso.titulo}</h2>`;
            }
            
            if (slide.isRaw) {
                // 🟢 TÁCTIL: Slide de altura libre que contiene todos los fragmentos enfocables dentro
                slidesHtml += `
                    <div class="swiper-slide" style="height: auto !important;">
                        ${titleHtml}
                        <div class="content-wrapper">${slide.content}</div>
                    </div>
                `;
            } else {
                // 🟢 ESCRITORIO: Bloques enfocables individualmente
                const posInSet = index + 1; // 🟢 FIX A11Y: Posición actual

                slidesHtml += `
                    <div class="swiper-slide">
                        ${titleHtml}
                        <div class="detail-text-fragment" 
                             data-index="${index}" 
                             role="article" 
                             tabindex="0" 
                             onclick="this.focus()" 
                             aria-description="${readOnlyMsg}" 
                             aria-posinset="${posInSet}" 
                             aria-setsize="${totalSlides}">
                            <div class="content-wrapper">
                                ${slide.content}
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        if (curso.enlaces) {
            curso.enlaces.forEach((enlace, index) => {
                const iconClass = (enlace.type === 'c') ? 'icon-buy' : 
                                    (enlace.type === 'd' ? 'icon-download' : 
                                    (enlace.type === 'l' ? 'icon-linkedin' : 
                                    (enlace.type === 'f' ? 'icon-offer' : 
                                    'icon-link')));

                const isDisabled = !enlace.url || enlace.url === '#';
                const style = isDisabled ? 'style="pointer-events: none;"' : '';
                const ariaDisabledAttr = isDisabled ? 'aria-disabled="true"' : '';
                slidesHtml += `
                    <div class="swiper-slide detail-action-slide">
                        <div class="detail-action-item" 
                            ${ariaDisabledAttr} 
                            onclick="App._handleActionRowClick(event)" 
                            tabindex="0" 
                            role="button">
                            <span class="detail-action-text">${enlace.texto}</span>
                            <a ${isDisabled ? 
                                'role="link" aria-disabled="true"' : 
                                `href="${enlace.url}" target="_blank"`} 
                                tabindex="-1" 
                                aria-hidden="true" 
                                ${style} 
                                class="detail-action-btn ${isDisabled ? 'disabled' : ''}">
                                <i class="action-icon ${isDisabled ? 'icon-empty' : iconClass}"></i>
                            </a>
                        </div>
                    </div>
                `;
            });
        }

        if (this.DOM.detalleTrack) {
            this.DOM.detalleTrack.innerHTML = slidesHtml;
        }

        _initDetailCarousel(this, swiperId, 0);

        if (!document.getElementById('a11y-modal-overlay')?.classList.contains('active')) {
            // 🟢 FIX: Acumular en lugar de anunciar
            const mensajeContexto = `${this.getString('nav.coursePrefix')} ${curso.titulo}`;

            if (this.STATE.pendingA11yContext) {
                if (!this.STATE.pendingA11yContext.includes(mensajeContexto)) {
                    this.STATE.pendingA11yContext += ". " + mensajeContexto;
                }

            } else {
                this.STATE.pendingA11yContext = mensajeContexto;

            }
        }
        
        setTimeout(() => {
            if (document.getElementById('a11y-modal-overlay')?.classList.contains('active')) 
                return;

            let targetElement = null;

            if (isMobileLayout) {
                targetElement = this.DOM.detalleTrack.querySelector('.card-volver-vertical');

                if (!targetElement) targetElement = this.DOM.detalleTrack.querySelector(
                                        '.detail-text-fragment[data-index="0"]');

            } else {
                targetElement = this.DOM.detalleTrack.querySelector(
                    '.detail-text-fragment[data-index="0"]');
            }

            if (targetElement) {
                this.applySmartFocus(targetElement);

                if (nav_base_details && 
                    typeof nav_base_details._updateDetailFocusState === 'function') 
                {
                    nav_base_details._updateDetailFocusState(this);
                }
            }
        }, 200);

    }).catch(err => {
        debug.logError('render_details', 'Error al cargar el CSS de detalles:', err);
    });
}

function _initDetailCarousel(appInstance, swiperId, initialSlideIndex) {
    // Seguridad: Limpieza previa si existiera
    if (appInstance.STATE.detailCarouselInstance) {
        appInstance.STATE.detailCarouselInstance.destroy(true, true);
        appInstance.STATE.detailCarouselInstance = null;
    }

    // Altura del dispositivo para el relleno
    const viewHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

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

        // 🟢 Relleno final en todos los dispositivos para details
        slidesOffsetAfter: window.visualViewport ? window.visualViewport.height : window.innerHeight,

        // 🟢 Desactivar la gestión A11y de Swiper para evitar conflictos
        a11y: { enabled: false }
    };

    if (typeof Swiper === 'undefined') {
        debug.logError('render_details', 
            'Swiper no está cargado. Comprueba la conexión a internet.');
        
        return;
    }

    appInstance.STATE.detailCarouselInstance = new Swiper(document.querySelector(swiperId), swiperConfig);

    if (appInstance.STATE.detailCarouselInstance) {
        // 🟢 FIX 2: Asegurar silencio absoluto en el wrapper generado
        if (appInstance.STATE.detailCarouselInstance.wrapperEl) {
            appInstance.STATE.detailCarouselInstance.wrapperEl.removeAttribute('aria-live');
            appInstance.STATE.detailCarouselInstance.wrapperEl.removeAttribute('aria-busy');
        }

        // 1. TÁCTIL: Solo inicia si el teclado no está moviendo la cámara
        appInstance.STATE.detailCarouselInstance.on('touchStart', () => {

            if (appInstance.STATE.keyboardNavInProgress) {
                
                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                    `[TRACE ${appInstance.STATE.currentTraceId}]` + 
                    `👆 TouchStart ignorado: Teclado en curso.`);

                return;
            }
            
            appInstance.STATE.currentTraceId = 
                'TCH-' + Math.random().toString(36).substr(2, 4).toUpperCase();

            appInstance.STATE._isTouchGesturing = true;

            debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                `\n[TRACE ${appInstance.STATE.currentTraceId}]` + 
                `👆 Arrastre táctil iniciado. Flag _isTouchGesturing = TRUE`);
        });

        // 2. RADAR: Solo actúa si es un arrastre táctil legítimo
        appInstance.STATE.detailCarouselInstance.on('setTranslate', () => {
            if (appInstance.STATE._isTouchGesturing && !appInstance.STATE.isAutoScrolling) {
                nav_base_details._handleTouchScrollRadar(appInstance);
            }
        });

        // 3. FIN DE INERCIA: El regulador maestro (El que baja las banderas)
        appInstance.STATE.detailCarouselInstance.on('transitionEnd', (swiper) => {
            const traceId = appInstance.STATE.currentTraceId || 'UNKNOWN';

            debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                `[TRACE ${traceId}] 🛑 TransitionEnd físico del carrusel alcanzado.`);

            // A) Si veníamos del TECLADO
            if (appInstance.STATE.keyboardNavInProgress) {

                appInstance.STATE.keyboardNavInProgress = false;

                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                    `[TRACE ${traceId}] ✔️ Bajando flag de Teclado. Movimiento completado.`);
            } 
            // B) Si veníamos de ARRASTRE TÁCTIL
            else if (appInstance.STATE._isTouchGesturing) {

                appInstance.STATE._isTouchGesturing = false;

                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                    `[TRACE ${traceId}] ✔️ Bajando flag Táctil. Evaluando auto-encuadre...`);
                
                if (!appInstance.STATE.isAutoScrolling) {
                    nav_base_details._handleSlideChangeEnd(swiper, appInstance);
                }
            }
            // C) Si veníamos de RUEDA DE RATÓN (si tienes el flag _isWheeling)
            else if (appInstance.STATE._isWheeling) {

                appInstance.STATE._isWheeling = false;

                debug.log('render_details', debug.DEBUG_LEVELS.BASIC, 
                    `[TRACE ${traceId}] ✔️ Bajando flag de Rueda. Evaluando auto-encuadre...`);
                
                if (!appInstance.STATE.isAutoScrolling) {
                    nav_base_details._handleSlideChangeEnd(swiper, appInstance);
                }
            }
        });

        // 3. El "Drop": El usuario levanta el dedo
        appInstance.STATE.detailCarouselInstance.on('touchEnd', (swiper) => {
            setTimeout(() => {
                // Si soltamos el dedo y no hay inercia (animating = false)
                if (!swiper.animating && appInstance.STATE._isTouchGesturing) {
                    appInstance.STATE._isTouchGesturing = false; // Liberamos el blindaje
                    
                    if (!appInstance.STATE.isAutoScrolling) {

                        debug.log('render_details', debug.DEBUG_LEVELS.EXTREME, 
                            '👆 TouchEnd: Evaluando encuadre táctil.');

                        nav_base_details._handleSlideChangeEnd(swiper, appInstance);
                    }
                }
            }, 50);
        });

        // 5. Teclado puro de Swiper (Fallback)
        appInstance.STATE.detailCarouselInstance.on('slideChangeTransitionEnd', (swiper) => {
            if (!appInstance.STATE._isTouchGesturing && !appInstance.STATE.isAutoScrolling) {
                nav_base_details._handleSlideChangeEnd(swiper, appInstance);
            }
        });
    }
}

/* --- code/render/render-details.js --- */