/**
 * Inquiry Extractor - Extrae la lista detallada de Inquiries
 *
 * Este módulo maneja la extracción de la sección Inquiries que contiene:
 * - Lista de inquiries individuales
 * - Nombre del acreedor (Creditor Name)
 * - Fecha del inquiry (Date of Inquiry)
 * - Buró de crédito (Credit Bureau: TransUnion, Experian, Equifax)
 */

/**
 * Extrae todos los datos detallados de Inquiries
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {object} config - Configuración del extractor (desde config/extractors.js)
 * @returns {Promise<Array<object>>} Array de inquiries con sus datos
 */
async function extractInquiriesDetails(page, config) {
  try {
    console.log('→ Extrayendo detalles de Inquiries...');

    const inquiries = await page.evaluate((cfg) => {
      const inquiriesArray = [];

      // PASO 1: Buscar la sección de Inquiries específicamente
      const sections = document.querySelectorAll(cfg.sectionSelector);
      console.log(`  → Encontradas ${sections.length} secciones en la página`);

      // Buscar la sección que contenga un h5 con texto "Inquiries"
      let inquiriesSection = null;
      for (const section of sections) {
        const heading = section.querySelector('h5');
        if (heading && heading.textContent.trim() === cfg.sectionHeading) {
          inquiriesSection = section;
          console.log(`  → Encontrada sección "${cfg.sectionHeading}"`);
          break;
        }
      }

      if (!inquiriesSection) {
        console.error('  ❌ No se encontró la sección de Inquiries');
        return [];
      }

      // PASO 2: Buscar todas las filas de inquiries (excluyendo el header)
      const allRows = inquiriesSection.querySelectorAll(cfg.inquiryRowSelector);

      if (!allRows || allRows.length === 0) {
        console.error('  ❌ No se encontraron filas de inquiries');
        return [];
      }

      console.log(`  → Encontradas ${allRows.length} inquiries`);

      // PASO 3: Extraer datos de cada fila
      allRows.forEach((row, idx) => {
        try {
          const cells = row.querySelectorAll(cfg.cellSelector);

          if (cells.length >= 3) {
            const inquiry = {
              creditor_name: cells[0]?.textContent.trim() || null,
              inquiry_date: cells[1]?.textContent.trim() || null,
              credit_bureau: cells[2]?.textContent.trim() || null
            };

            // Solo agregar si tiene al menos el nombre del acreedor
            if (inquiry.creditor_name) {
              inquiriesArray.push(inquiry);
            }
          }
        } catch (err) {
          console.log(`  ⚠ Error procesando inquiry ${idx + 1}:`, err.message);
        }
      });

      return inquiriesArray;
    }, config);

    console.log(`  ✓ Extraídos ${inquiries.length} inquiries exitosamente`);
    return inquiries;

  } catch (error) {
    console.error('❌ Error extrayendo detalles de Inquiries:', error.message);
    console.error(error.stack);
    return [];
  }
}

module.exports = {
  extractInquiriesDetails
};
