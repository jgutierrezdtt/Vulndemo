const axios = require('axios');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const fs = require('fs-extra');
const path = require('path');
const xlsx = require('xlsx');
const { translate } = require('deepl-scraper'); // Usamos la librería de DeepL sin API Key

const CWE_URL = 'https://cwe.mitre.org/data/xml/cwec_latest.xml.zip';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const EXTRACTED_DIR = path.join(__dirname, 'xml_original');
const INDIVIDUAL_CWE_DIR = path.join(__dirname, 'xml_individual');
const TRANSLATED_DIR = path.join(__dirname, 'xml_traducido');

/**
 * Prueba la API de DeepL antes de traducir los CWE
 */
async function testTranslation() {
    console.log("🛠️ Probando la API de DeepL con un texto simple...");
    try {
        let res = await translate("Hello, world!", "EN-US", "ES"); // DeepL usa idioma de origen y destino
        console.log(`✅ Traducción de prueba: "Hello, world!" -> "${res}"`);
        return true;
    } catch (error) {
        console.error("❌ Error en la prueba de traducción.");
        console.error(`Código de error: ${error.code || "Desconocido"}`);
        console.error(`Mensaje: ${error.message || "Sin detalles"}`);
        console.error(`Stacktrace: ${error.stack || "No disponible"}`);
        return false;
    }
}

/**
 * Extrae solo el texto de un objeto JSON eliminando etiquetas XML
 */
function extractTextFromJson(obj) {
    let texts = [];

    function traverse(node) {
        if (typeof node === 'string') {
            texts.push(node);
        } else if (typeof node === 'object') {
            for (const key in node) {
                traverse(node[key]);
            }
        }
    }

    traverse(obj);
    return texts;
}

/**
 * Traduce un array de textos con mejor manejo de errores
 */
async function translateTexts(texts) {
    const translatedTexts = [];

    for (const text of texts) {
        try {
            console.log(`🔄 Traduciendo: "${text.slice(0, 100)}..."`);
            let res = await translate(text, "en", "es"); // Asegurar que "en" → "es"
            translatedTexts.push(res);
        } catch (error) {
            console.error(`❌ Error traduciendo texto: "${text.slice(0, 100)}..."`);
            console.error(`Código de error: ${error.code || "Desconocido"}`);
            console.error(`Mensaje: ${error.message || "Sin detalles"}`);
            translatedTexts.push(text);
        }
    }

    return translatedTexts;
}

/**
 * Rellena el JSON con los textos traducidos
 */
function insertTranslatedText(obj, translatedTexts) {
    let index = 0;

    function traverse(node) {
        if (typeof node === 'string') {
            node = translatedTexts[index];
            index++;
        } else if (typeof node === 'object') {
            for (const key in node) {
                node[key] = traverse(node[key]);
            }
        }
        return node;
    }

    return traverse(obj);
}

/**
 * Traduce archivos XML manteniendo la estructura
 */
async function translateXmlFiles() {
    console.log("🔍 Ejecutando prueba de traducción antes de empezar...");
    const testPassed = await testTranslation();

    if (!testPassed) {
        console.error("🚨 Prueba de traducción fallida. No se traducirán los CWE.");
        process.exit(1);
    }

    console.log("✅ Prueba de traducción exitosa. Procediendo con la traducción de CWE...");

    await fs.ensureDir(TRANSLATED_DIR);
    const files = fs.readdirSync(INDIVIDUAL_CWE_DIR);
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder();

    for (const file of files) {
        if (!file.endsWith('.xml')) continue;

        console.log(`📄 Traduciendo archivo: ${file}`);

        try {
            const xmlData = fs.readFileSync(path.join(INDIVIDUAL_CWE_DIR, file), 'utf8');
            const json = await parser.parseStringPromise(xmlData);

            const texts = extractTextFromJson(json);
            const translatedTexts = await translateTexts(texts);
            const translatedJson = insertTranslatedText(json, translatedTexts);

            const translatedXml = builder.buildObject(translatedJson);
            fs.writeFileSync(path.join(TRANSLATED_DIR, file), translatedXml);

            console.log(`✅ Traducción completada para ${file}`);
        } catch (error) {
            console.error(`❌ Error procesando archivo ${file}`);
            console.error(`Error: ${error.message || 'Sin detalles'}`);
        }
    }

    console.log('✅ Traducción de todos los archivos completada.');
}

/**
 * Manejador de opciones de la CLI
 */
async function main() {
    const action = process.argv[2];

    switch (action) {
        case 'translate':
            await translateXmlFiles();
            break;
        default:
            console.log('Uso:');
            console.log('  node cwe_manager.js translate      # Traduce los XML a español');
            process.exit(1);
    }
}

main();
