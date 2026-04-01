/* --- scripts/generate-sitemap.mjs --- */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. CONFIGURACIÓN BASE
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const BASE_URL = 'https://www.vortexspira.com/';
const langs = ['es', 'en'];
const today = new Date().toISOString().split('T')[0];

let urls = [];

console.log('🚀 Iniciando escaneo y generación del Sitemap...\n');

// 2. PRIMERA PASADA: RECOLECTAR IDs VÁLIDOS
const validIds = { es: new Set(), en: new Set() };
const parsedData = { es: null, en: null };

langs.forEach(lang => {
    const filePath = path.join(PROJECT_ROOT, 'data', `cursos_${lang}.json`);
    
    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            parsedData[lang] = data; 
            
            if (data.prod && Array.isArray(data.prod)) {
                const collectIds = (node) => {
                    if (node.id) validIds[lang].add(node.id);
                    if (node.cursos) node.cursos.forEach(c => validIds[lang].add(c.id));
                    if (node.subsecciones) node.subsecciones.forEach(sub => collectIds(sub));
                };
                data.prod.forEach(collectIds);
            }
        } catch (error) {
            console.error(`❌ Error procesando ${filePath}:`, error);
        }
    } else {
        console.warn(`⚠️ Archivo no encontrado: ${filePath}`);
    }
});

// 3. FUNCIÓN DE ENLACES CRUZADOS ESTRICTA (es, en, default)
function getAlternateLinks(id) {
    let links = [];
    
    if (!id) {
        const urlEs = `${BASE_URL}?lang=es`;
        const urlEn = `${BASE_URL}?lang=en`;
        const urlDef = BASE_URL;

        links.push(`    <xhtml:link rel="alternate" hreflang="es" href="${urlEs}" />`);
        links.push(`    <xhtml:link rel="alternate" hreflang="en" href="${urlEn}" />`);
        links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${urlDef}" />`);
        return links.join('\n');
    }

    const hasEs = validIds.es.has(id);
    const hasEn = validIds.en.has(id);
    
    const urlEs = `${BASE_URL}?id=${id}&amp;lang=es`;
    const urlEn = `${BASE_URL}?id=${id}&amp;lang=en`;
    const urlDef = `${BASE_URL}?id=${id}`;

    if (hasEs) links.push(`    <xhtml:link rel="alternate" hreflang="es" href="${urlEs}" />`);
    if (hasEn) links.push(`    <xhtml:link rel="alternate" hreflang="en" href="${urlEn}" />`);
    
    if (hasEs || hasEn) {
        links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${urlDef}" />`);
    }

    return links.join('\n');
}

// 🟢 FUNCIÓN AUXILIAR PARA AÑADIR BLOQUES <url> Y LOGUEARLOS
function addUrlBlock(locUrl, id, priority, changefreq = 'monthly', images = []) {
    let imageTags = '';
    
    // Log de la URL que estamos incluyendo
    console.log(`🔗 Incluyendo URL: ${locUrl}`);
    
    if (images.length > 0) {
        images.forEach(img => {
            imageTags += `\n    <image:image>
      <image:loc>${img.loc}</image:loc>
      <image:title>${img.title}</image:title>
    </image:image>`;
        });
    }

    urls.push(`  <url>
    <loc>${locUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${getAlternateLinks(id)}${imageTags}
  </url>`);
}

// 4. SEGUNDA PASADA: GENERACIÓN DEL XML

console.log('--- Buscando Imágenes ---');
const imagesDir = path.join(PROJECT_ROOT, 'resources/demoImages');
const demoImages = [];

if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir);
    
    files.forEach(file => {
        if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) {
            const cleanName = file.replace(/\.[^/.]+$/, "").replace(/-/g, ' ');
            const seoTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            const imgLoc = `${BASE_URL}demoImages/${file}`;
            
            // 🟢 Log de la imagen encontrada y validada
            console.log(`🖼️  Imagen encontrada: ${imgLoc}`);
            
            demoImages.push({
                loc: imgLoc,
                title: `VortexSpira PWA - ${seoTitle}`
            });
        }
    });
} else {
    console.warn(`⚠️ Directorio de imágenes no encontrado en: ${imagesDir}`);
}

console.log('\n--- Generando URLs ---');

// Inyectar las 3 versiones de la Raíz
addUrlBlock(BASE_URL, '', '1.0', 'weekly', demoImages);     
addUrlBlock(`${BASE_URL}?lang=es`, '', '1.0', 'weekly');    
addUrlBlock(`${BASE_URL}?lang=en`, '', '1.0', 'weekly');    

// Motor de renderizado de nodos
function processNode(node, depth, lang) {
    let secPriority = '0.9'; 
    if (depth === 1) secPriority = '0.8'; 
    if (depth >= 2) secPriority = '0.7'; 

    const urlLang = `${BASE_URL}?id=${node.id}&amp;lang=${lang}`;
    addUrlBlock(urlLang, node.id, secPriority);

    if (lang === 'es' && validIds.es.has(node.id)) {
        const urlDef = `${BASE_URL}?id=${node.id}`;
        addUrlBlock(urlDef, node.id, secPriority);
    }

    if (node.cursos && node.cursos.length > 0) {
        node.cursos.forEach(curso => {
            const cursoLang = `${BASE_URL}?id=${curso.id}&amp;lang=${lang}`;
            addUrlBlock(cursoLang, curso.id, '0.9');

            if (lang === 'es' && validIds.es.has(curso.id)) {
                const cursoDef = `${BASE_URL}?id=${curso.id}`;
                addUrlBlock(cursoDef, curso.id, '0.9');
            }
        });
    }

    if (node.subsecciones && node.subsecciones.length > 0) {
        node.subsecciones.forEach(sub => processNode(sub, depth + 1, lang));
    }
}

langs.forEach(lang => {
    const data = parsedData[lang];
    if (data && data.prod && Array.isArray(data.prod)) {
        urls.push(''); 
        data.prod.forEach(rootNode => processNode(rootNode, 0, lang));
    }
});

// 5. GUARDAR ARCHIVO
console.log('\n--- Guardando sitemap.xml ---');
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

fs.writeFileSync(path.join(PROJECT_ROOT, 'sitemap.xml'), xml);
console.log('✅ sitemap.xml regenerado en la raíz del proyecto con éxito.\n');

/* --- scripts/generate-sitemap.mjs --- */