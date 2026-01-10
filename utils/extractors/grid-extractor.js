/**
 * Grid Extractor - Extrae datos de grids de 4 columnas (labels + 3 burós)
 *
 * Este módulo reutiliza la lógica de extracción de grids del código existente
 * y la hace más modular y reutilizable.
 *
 * Usado para: Personal Information y Summary
 */

/**
 * Extrae datos de un grid de 4 columnas (labels + TransUnion + Experian + Equifax)
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {object} config - Configuración del extractor
 * @param {number} config.sectionIndex - Índice de la sección en el DOM
 * @param {number} config.gridIndex - Índice del grid dentro de la sección
 * @param {Array<string>} config.fields - Nombres de los campos a extraer
 * @returns {Promise<object>} Objeto con datos de los 3 burós: { transunion: {...}, experian: {...}, equifax: {...} }
 */
async function extractGridData(page, config) {
  try {
    console.log(`→ Extrayendo grid data (section: ${config.sectionIndex}, grid: ${config.gridIndex})...`);

    const rawData = await page.evaluate(({ sectionIndex, gridIndex }) => {
      // Buscar todas las secciones
      const sections = document.querySelectorAll('section.mt-5');

      if (!sections || sections.length === 0) {
        return null;
      }

      // Validar que existe la sección solicitada
      if (sectionIndex >= sections.length) {
        return null;
      }

      const section = sections[sectionIndex];

      // Buscar grids dentro de la sección
      const grids = section.querySelectorAll('div.d-grid.grid-cols-4');

      if (!grids || grids.length === 0) {
        return null;
      }

      // Validar que existe el grid solicitado
      if (gridIndex >= grids.length) {
        return null;
      }

      const grid = grids[gridIndex];

      // Obtener todas las columnas (labels + 3 burós)
      const bureauColumns = grid.querySelectorAll('div.d-contents');

      if (!bureauColumns || bureauColumns.length < 4) {
        return null;
      }

      // Extraer datos de cada buró (índices 1, 2, 3 - el 0 son labels)
      const extractBureauData = (columnIndex) => {
        const column = bureauColumns[columnIndex];
        const cells = column.querySelectorAll('p.grid-cell');

        // Saltar la primera celda (header) y obtener el resto
        return Array.from(cells)
          .slice(1)
          .map(cell => cell.textContent.trim());
      };

      return {
        transunion: extractBureauData(1),
        experian: extractBureauData(2),
        equifax: extractBureauData(3)
      };
    }, { sectionIndex: config.sectionIndex, gridIndex: config.gridIndex });

    // Si no se obtuvo data, retornar null
    if (!rawData) {
      console.log('  ⚠ No se encontró data en el grid especificado');
      return null;
    }

    // Mapear arrays a objetos con los nombres de campos
    const mapFieldsToObject = (dataArray) => {
      const obj = {};
      config.fields.forEach((fieldName, index) => {
        obj[fieldName] = dataArray[index] || null;
      });
      return obj;
    };

    const result = {
      transunion: mapFieldsToObject(rawData.transunion),
      experian: mapFieldsToObject(rawData.experian),
      equifax: mapFieldsToObject(rawData.equifax)
    };

    console.log('  ✓ Grid data extraído exitosamente');
    return result;

  } catch (error) {
    console.error('❌ Error extrayendo grid data:', error.message);
    return null;
  }
}

/**
 * Extrae múltiples grids de una misma sección
 * Útil si una sección tiene varios grids que queremos extraer
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {number} sectionIndex - Índice de la sección
 * @param {Array<object>} gridConfigs - Array de configuraciones de grids
 * @returns {Promise<Array<object>>} Array de objetos con datos de cada grid
 */
async function extractMultipleGrids(page, sectionIndex, gridConfigs) {
  try {
    const results = [];

    for (const gridConfig of gridConfigs) {
      const config = {
        sectionIndex,
        gridIndex: gridConfig.gridIndex,
        fields: gridConfig.fields
      };

      const data = await extractGridData(page, config);
      results.push(data);
    }

    return results;

  } catch (error) {
    console.error('❌ Error extrayendo múltiples grids:', error.message);
    return [];
  }
}

module.exports = {
  extractGridData,
  extractMultipleGrids
};
