/**
 * Extraction Service - Orquestador principal de extracción de datos del 3B Report
 *
 * Este servicio coordina todos los extractores y proporciona una interfaz
 * unificada para extraer cualquier sección del reporte.
 *
 * Características:
 * - Extracción selectiva de secciones
 * - Manejo de errores por sección (si una falla, las demás continúan)
 * - Soporte para paginación en Account History
 * - Compatible con código existente
 */

const extractorConfig = require('../config/extractors');
const { extractGridData } = require('../utils/extractors/grid-extractor');
const { extractAccountHistory, extractAccountHistoryPaginated } = require('../utils/extractors/account-extractor');
const { extractCreditorContacts } = require('../utils/extractors/contact-extractor');
const { extractInquiriesDetails } = require('../utils/extractors/inquiry-extractor');

/**
 * Clase principal del servicio de extracción
 */
class ExtractionService {
  constructor() {
    this.extractorConfig = extractorConfig;
  }

  /**
   * Extrae todas las secciones del 3B Report
   *
   * @param {object} page - Instancia de Puppeteer page
   * @param {object} options - Opciones de extracción
   * @param {Array<string>} options.sections - Secciones a extraer ['all'] o ['scores', 'personalInfo', 'summary', 'accountHistory']
   * @param {object} options.accountHistory - Opciones de paginación para Account History { limit, offset }
   * @returns {Promise<object>} Objeto con todas las secciones extraídas
   */
  async extractAll3BReport(page, options = {}) {
    const {
      sections = ['all'],
      accountHistory: accountHistoryOptions = {}
    } = options;

    console.log('\n========================================');
    console.log('  EXTRACCIÓN 3B REPORT - SERVICIO');
    console.log('========================================\n');
    console.log(`Secciones solicitadas: ${sections.join(', ')}`);

    const raw3BData = {};
    const shouldExtractAll = sections.includes('all');

    // Extraer Credit Scores (3 burós)
    if (shouldExtractAll || sections.includes('scores')) {
      try {
        console.log('\n→ Extrayendo Credit Scores...');
        raw3BData.scores = await this.extractScores(page);
        console.log('  ✓ Credit Scores extraídos');
      } catch (error) {
        console.error('  ❌ Error extrayendo Credit Scores:', error.message);
        raw3BData.scores = null;
      }
    }

    // Extraer Personal Information
    if (shouldExtractAll || sections.includes('personalInfo')) {
      try {
        console.log('\n→ Extrayendo Personal Information...');
        raw3BData.personalInfo = await extractGridData(page, this.extractorConfig.personalInfo);
        console.log('  ✓ Personal Information extraída');
      } catch (error) {
        console.error('  ❌ Error extrayendo Personal Information:', error.message);
        raw3BData.personalInfo = null;
      }
    }

    // Extraer Summary
    if (shouldExtractAll || sections.includes('summary')) {
      try {
        console.log('\n→ Extrayendo Summary...');
        raw3BData.summary = await extractGridData(page, this.extractorConfig.summary);
        console.log('  ✓ Summary extraído');

        // Extraer campos adicionales de Summary (FASE 5)
        console.log('\n→ Extrayendo campos adicionales de Summary (total_accounts, open_accounts, closed_accounts)...');
        const summaryDetails = await this.extractSummaryDetails(page);

        if (summaryDetails && raw3BData.summary) {
          // Merge los campos adicionales con el summary existente
          raw3BData.summary.transunion = {
            ...raw3BData.summary.transunion,
            ...summaryDetails.transunion
          };
          raw3BData.summary.experian = {
            ...raw3BData.summary.experian,
            ...summaryDetails.experian
          };
          raw3BData.summary.equifax = {
            ...raw3BData.summary.equifax,
            ...summaryDetails.equifax
          };
          console.log('  ✓ Campos adicionales de Summary extraídos');
        }
      } catch (error) {
        console.error('  ❌ Error extrayendo Summary:', error.message);
        raw3BData.summary = null;
      }
    }

    // Extraer Account History (NUEVO)
    if (shouldExtractAll || sections.includes('accountHistory')) {
      try {
        console.log('\n→ Extrayendo Account History...');

        // Verificar si se solicitó paginación
        const usePagination = accountHistoryOptions.limit !== undefined;

        if (usePagination) {
          const paginatedResult = await extractAccountHistoryPaginated(
            page,
            this.extractorConfig.accountHistory,
            accountHistoryOptions
          );

          raw3BData.accountHistory = paginatedResult.accounts;
          raw3BData.accountHistoryPagination = {
            total: paginatedResult.total,
            limit: paginatedResult.limit,
            offset: paginatedResult.offset,
            hasMore: paginatedResult.hasMore
          };

          console.log(`  ✓ Account History extraído (${paginatedResult.accounts.length}/${paginatedResult.total} cuentas)`);
        } else {
          raw3BData.accountHistory = await extractAccountHistory(
            page,
            this.extractorConfig.accountHistory
          );

          console.log(`  ✓ Account History extraído (${raw3BData.accountHistory.length} cuentas)`);
        }

      } catch (error) {
        console.error('  ❌ Error extrayendo Account History:', error.message);
        raw3BData.accountHistory = [];
      }
    }

    // Extraer Public Records (NUEVO - Placeholder)
    if (shouldExtractAll || sections.includes('publicRecords')) {
      try {
        console.log('\n→ Extrayendo Public Records...');
        raw3BData.publicRecords = await this.extractPublicRecords(page);
        console.log('  ✓ Public Records extraídos');
      } catch (error) {
        console.error('  ❌ Error extrayendo Public Records:', error.message);
        raw3BData.publicRecords = null;
      }
    }

    // Extraer Inquiries (NUEVO - Placeholder)
    if (shouldExtractAll || sections.includes('inquiries')) {
      try {
        console.log('\n→ Extrayendo Inquiries...');
        raw3BData.inquiries = await this.extractInquiries(page);
        console.log('  ✓ Inquiries extraídas');
      } catch (error) {
        console.error('  ❌ Error extrayendo Inquiries:', error.message);
        raw3BData.inquiries = null;
      }
    }

    // Extraer Creditor Contacts (NUEVO)
    if (shouldExtractAll || sections.includes('creditorContacts')) {
      try {
        console.log('\n→ Extrayendo Creditor Contacts...');
        raw3BData.creditorContacts = await extractCreditorContacts(
          page,
          this.extractorConfig.creditorContacts
        );
        console.log('  ✓ Creditor Contacts extraídos');
      } catch (error) {
        console.error('  ❌ Error extrayendo Creditor Contacts:', error.message);
        raw3BData.creditorContacts = [];
      }
    }

    console.log('\n========================================');
    console.log('  EXTRACCIÓN COMPLETADA');
    console.log('========================================\n');

    return raw3BData;
  }

  /**
   * Extrae los Credit Scores (scores de los 3 burós)
   * Esta función replica la lógica existente en scraper.js/server.js
   * con estrategias múltiples para vista moderna y vista clásica
   *
   * @param {object} page - Instancia de Puppeteer page
   * @returns {Promise<object>} { transunion: number, experian: number, equifax: number }
   */
  async extractScores(page) {
    try {
      const scores = await page.evaluate(() => {
        // Estrategia 1: Vista moderna (dashboard)
        let scoreElements = document.querySelectorAll('div.d-flex.flex-column.align-items-center.gap-1 p.fs-40.fw-bold');

        // Estrategia 2: Vista clásica 3B Report (section.credit-score-3)
        if (!scoreElements || scoreElements.length < 3) {
          const section = document.querySelector('section.credit-score-3');
          if (section) {
            scoreElements = section.querySelectorAll('h5');
          }
        }

        // Estrategia 3: Buscar cualquier h5 en la sección de credit scores
        if (!scoreElements || scoreElements.length < 3) {
          const allH5 = document.querySelectorAll('h5');
          // Filtrar solo los que contienen números de 3 dígitos (scores)
          scoreElements = Array.from(allH5).filter(el => {
            const text = el.textContent.trim();
            return /^\d{3}$/.test(text); // Scores son típicamente 300-850
          });
        }

        if (!scoreElements || scoreElements.length < 3) {
          console.error('No se encontraron suficientes elementos de score. Encontrados:', scoreElements?.length || 0);
          return null;
        }

        return {
          transunion: parseInt(scoreElements[0]?.textContent.trim()) || null,
          experian: parseInt(scoreElements[1]?.textContent.trim()) || null,
          equifax: parseInt(scoreElements[2]?.textContent.trim()) || null
        };
      });

      return scores;

    } catch (error) {
      console.error('Error extrayendo scores:', error.message);
      return null;
    }
  }

  /**
   * Extrae Public Records (FASE 4)
   * Retorna el conteo de Public Records por buró desde la sección Summary
   *
   * @param {object} page - Instancia de Puppeteer page
   * @returns {Promise<object>} Datos de public records por buró
   */
  async extractPublicRecords(page) {
    try {
      const publicRecordsCount = await page.evaluate(() => {
        // Buscar en la sección Summary, fila "Public Records:"
        const sections = document.querySelectorAll('section.mt-5');
        if (!sections || sections.length < 2) {
          return null;
        }

        // La segunda sección es Summary
        const summarySection = sections[1];
        const grid = summarySection.querySelector('.d-grid.grid-cols-4');

        if (!grid) {
          return null;
        }

        // Buscar las columnas de cada buró (columnas 2, 3, 4)
        const bureauColumns = grid.querySelectorAll('.d-contents');

        if (!bureauColumns || bureauColumns.length < 4) {
          return null;
        }

        // Extraer el valor de "Public Records" (row 9) de cada buró
        const extractPublicRecordsValue = (bureauColumn) => {
          const cells = bureauColumn.querySelectorAll('.grid-cell');
          // row-start-9 es Public Records (índice 8 en el array de cells)
          return parseInt(cells[8]?.textContent.trim()) || 0;
        };

        return {
          transunion: extractPublicRecordsValue(bureauColumns[1]),
          experian: extractPublicRecordsValue(bureauColumns[2]),
          equifax: extractPublicRecordsValue(bureauColumns[3])
        };
      });

      return publicRecordsCount;

    } catch (error) {
      console.error('Error extrayendo Public Records:', error.message);
      return null;
    }
  }

  /**
   * Extrae Inquiries (ACTUALIZADO)
   * Retorna tanto el conteo por buró como los detalles de cada inquiry individual
   *
   * @param {object} page - Instancia de Puppeteer page
   * @returns {Promise<object>} { count: { transunion, experian, equifax }, details: [...] }
   */
  async extractInquiries(page) {
    try {
      // Extraer el conteo de inquiries desde Summary
      const inquiriesCount = await page.evaluate(() => {
        // Buscar en la sección Summary, fila "Inquiries (2 years):"
        const sections = document.querySelectorAll('section.mt-5');
        if (!sections || sections.length < 2) {
          return null;
        }

        // La segunda sección es Summary
        const summarySection = sections[1];
        const grid = summarySection.querySelector('.d-grid.grid-cols-4');

        if (!grid) {
          return null;
        }

        // Buscar las columnas de cada buró (columnas 2, 3, 4)
        const bureauColumns = grid.querySelectorAll('.d-contents');

        if (!bureauColumns || bureauColumns.length < 4) {
          return null;
        }

        // Extraer el valor de "Inquiries (2 years)" (row 10) de cada buró
        const extractInquiriesValue = (bureauColumn) => {
          const cells = bureauColumn.querySelectorAll('.grid-cell');
          // row-start-10 es Inquiries (índice 9 en el array de cells)
          return parseInt(cells[9]?.textContent.trim()) || 0;
        };

        return {
          transunion: extractInquiriesValue(bureauColumns[1]),
          experian: extractInquiriesValue(bureauColumns[2]),
          equifax: extractInquiriesValue(bureauColumns[3])
        };
      });

      // Extraer los detalles de cada inquiry individual
      const inquiriesDetails = await extractInquiriesDetails(
        page,
        this.extractorConfig.inquiries
      );

      // Retornar estructura combinada
      return {
        count: inquiriesCount,
        details: inquiriesDetails || []
      };

    } catch (error) {
      console.error('Error extrayendo Inquiries:', error.message);
      return {
        count: null,
        details: []
      };
    }
  }

  /**
   * Extrae campos adicionales de Summary (FASE 5)
   * Retorna Total Accounts, Open Accounts y Closed Accounts por buró
   *
   * @param {object} page - Instancia de Puppeteer page
   * @returns {Promise<object>} Datos de cuentas por buró
   */
  async extractSummaryDetails(page) {
    try {
      const summaryDetails = await page.evaluate(() => {
        // Buscar en la sección Summary
        const sections = document.querySelectorAll('section.mt-5');
        if (!sections || sections.length < 2) {
          return null;
        }

        // La segunda sección es Summary
        const summarySection = sections[1];
        const grid = summarySection.querySelector('.d-grid.grid-cols-4');

        if (!grid) {
          return null;
        }

        // Buscar las columnas de cada buró (columnas 2, 3, 4)
        const bureauColumns = grid.querySelectorAll('.d-contents');

        if (!bureauColumns || bureauColumns.length < 4) {
          return null;
        }

        // Función para extraer valores de una columna de buró
        const extractAccountValues = (bureauColumn) => {
          const cells = bureauColumn.querySelectorAll('.grid-cell');
          return {
            total_accounts: parseInt(cells[1]?.textContent.trim()) || 0,    // row-start-2 (índice 1)
            open_accounts: parseInt(cells[2]?.textContent.trim()) || 0,     // row-start-3 (índice 2)
            closed_accounts: parseInt(cells[3]?.textContent.trim()) || 0    // row-start-4 (índice 3)
          };
        };

        return {
          transunion: extractAccountValues(bureauColumns[1]),
          experian: extractAccountValues(bureauColumns[2]),
          equifax: extractAccountValues(bureauColumns[3])
        };
      });

      return summaryDetails;

    } catch (error) {
      console.error('Error extrayendo Summary Details:', error.message);
      return null;
    }
  }

  /**
   * Verifica qué secciones están disponibles en la página actual
   * Útil para debugging y validación
   *
   * @param {object} page - Instancia de Puppeteer page
   * @returns {Promise<object>} Objeto con disponibilidad de cada sección
   */
  async checkAvailableSections(page) {
    try {
      const availability = await page.evaluate(() => {
        return {
          scores: document.querySelectorAll('div.d-flex.flex-column.align-items-center.gap-1 p.fs-40.fw-bold').length >= 3,
          personalInfo: document.querySelectorAll('section.mt-5')[0]?.querySelectorAll('div.d-grid.grid-cols-4').length > 0,
          summary: document.querySelectorAll('section.mt-5')[1]?.querySelectorAll('div.d-grid.grid-cols-4').length > 0,
          accountHistory: document.querySelectorAll('div.mb-5').length > 0,
          sections: document.querySelectorAll('section.mt-5').length
        };
      });

      console.log('\n→ Secciones disponibles:');
      console.log(`  Scores: ${availability.scores ? '✓' : '✗'}`);
      console.log(`  Personal Info: ${availability.personalInfo ? '✓' : '✗'}`);
      console.log(`  Summary: ${availability.summary ? '✓' : '✗'}`);
      console.log(`  Account History: ${availability.accountHistory ? '✓' : '✗'}`);
      console.log(`  Total sections: ${availability.sections}`);

      return availability;

    } catch (error) {
      console.error('Error verificando secciones disponibles:', error.message);
      return null;
    }
  }
}

// Exportar instancia singleton del servicio
module.exports = new ExtractionService();
