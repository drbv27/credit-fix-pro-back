/**
 * Account Extractor - Extrae listas dinámicas de cuentas (Account History)
 *
 * Este módulo maneja la extracción de Account History que contiene:
 * - Múltiples cuentas (cantidad dinámica)
 * - 23 campos por cuenta × 3 burós
 * - Payment History (24 meses × 3 burós)
 * - Days Late (30/60/90 días × 3 burós)
 */

/**
 * Extrae todos los datos de Account History
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {object} config - Configuración del extractor (desde config/extractors.js)
 * @returns {Promise<Array<object>>} Array de cuentas con todos sus datos
 */
async function extractAccountHistory(page, config) {
  try {
    console.log('→ Extrayendo Account History...');

    const accounts = await page.evaluate((cfg) => {
      const accountsArray = [];

      // PASO 1: Buscar la sección de Account History específicamente
      // Buscar todas las secciones section.mt-5
      const sections = document.querySelectorAll('section.mt-5');
      console.log(`  → Encontradas ${sections.length} secciones en la página`);

      // Account History suele ser la 3ra o 4ta sección (después de Personal Info y Summary)
      // Buscar la sección que contenga un h5 con texto "Account History"
      let accountHistorySection = null;
      for (const section of sections) {
        const heading = section.querySelector('h5');
        if (heading && heading.textContent.includes('Account History')) {
          accountHistorySection = section;
          console.log(`  → Encontrada sección "Account History"`);
          break;
        }
      }

      // Si no se encontró por título, usar un fallback (típicamente la 3ra sección)
      if (!accountHistorySection && sections.length >= 3) {
        accountHistorySection = sections[2]; // índice 2 = 3ra sección
        console.log(`  → Usando sección por defecto (índice 2)`);
      }

      if (!accountHistorySection) {
        console.error('  ❌ No se encontró la sección de Account History');
        return [];
      }

      // PASO 2: Buscar contenedores de cuentas SOLO dentro de la sección de Account History
      const accountContainers = accountHistorySection.querySelectorAll(cfg.accountContainerSelector);

      if (!accountContainers || accountContainers.length === 0) {
        console.error('  ❌ No se encontraron contenedores de cuentas dentro de Account History');
        return [];
      }

      console.log(`  → Encontradas ${accountContainers.length} cuentas dentro de Account History`);

      accountContainers.forEach((container, idx) => {
        try {
          // Extraer nombre de la cuenta
          const nameEl = container.querySelector(cfg.accountNameSelector);
          const accountName = nameEl?.textContent.trim() || `Unknown Account ${idx + 1}`;

          // Extraer grid de 23 campos × 4 columnas
          const grid = container.querySelector(cfg.gridSelector);

          if (!grid) {
            console.log(`  ⚠ No se encontró grid para cuenta: ${accountName}`);
            return;
          }

          const bureauColumns = grid.querySelectorAll(cfg.bureauColumnSelector);

          if (bureauColumns.length < 4) {
            console.log(`  ⚠ Grid incompleto para cuenta: ${accountName}`);
            return;
          }

          // Función auxiliar para extraer datos de una columna de buró
          const extractBureauData = (columnIndex) => {
            const column = bureauColumns[columnIndex];
            const cells = column.querySelectorAll(cfg.gridCellSelector);

            // Saltar la primera celda (header) y mapear con nombres de campos
            const cellsArray = Array.from(cells).slice(1);
            const data = {};

            cfg.fields.forEach((fieldName, fieldIdx) => {
              data[fieldName] = cellsArray[fieldIdx]?.textContent.trim() || null;
            });

            return data;
          };

          // Extraer datos de los 3 burós (índices 1, 2, 3)
          const accountData = {
            account_name: accountName,
            transunion: extractBureauData(1),
            experian: extractBureauData(2),
            equifax: extractBureauData(3)
          };

          // Extraer Payment History
          try {
            accountData.payment_history = extractPaymentHistory(container, cfg.paymentHistory);
          } catch (err) {
            console.log(`  ⚠ Error extrayendo payment history para ${accountName}:`, err.message);
            accountData.payment_history = null;
          }

          // Extraer Days Late
          try {
            accountData.days_late = extractDaysLate(container, cfg.daysLate);
          } catch (err) {
            console.log(`  ⚠ Error extrayendo days late para ${accountName}:`, err.message);
            accountData.days_late = null;
          }

          accountsArray.push(accountData);

        } catch (err) {
          console.log(`  ⚠ Error procesando cuenta ${idx + 1}:`, err.message);
        }
      });

      // Funciones auxiliares para Payment History y Days Late
      function extractPaymentHistory(container, phConfig) {
        const historyContainer = container.querySelector(phConfig.containerSelector);

        if (!historyContainer) {
          return null;
        }

        const bureauHistories = historyContainer.querySelectorAll(phConfig.bureauHistorySelector);

        if (!bureauHistories || bureauHistories.length < 3) {
          return null;
        }

        const extractMonthBadges = (bureauHistory) => {
          const monthsContainer = bureauHistory.querySelector(phConfig.monthContainerSelector);

          if (!monthsContainer) {
            return [];
          }

          const months = monthsContainer.querySelectorAll(phConfig.monthSelector);

          return Array.from(months).map(monthDiv => {
            const badge = monthDiv.querySelector(phConfig.badgeSelector);
            const label = monthDiv.querySelector(phConfig.labelSelector);

            // Extraer clase de status (status-C, status-U, status-1, etc.)
            const statusClass = Array.from(monthDiv.classList)
              .find(cls => cls.startsWith('status-'))
              ?.replace('status-', '') || 'unknown';

            return {
              month: label?.textContent.trim() || '',
              status: badge?.textContent.trim() || '',
              status_class: statusClass
            };
          });
        };

        return {
          transunion: extractMonthBadges(bureauHistories[0]),
          experian: extractMonthBadges(bureauHistories[1]),
          equifax: extractMonthBadges(bureauHistories[2])
        };
      }

      function extractDaysLate(container, dlConfig) {
        // Buscar el contenedor de days late dentro de esta cuenta
        const daysLateSection = Array.from(container.querySelectorAll('div')).find(div => {
          const heading = div.querySelector('p');
          return heading && heading.textContent.includes('Days Late - 7 Year History');
        });

        if (!daysLateSection) {
          return null;
        }

        const grid = daysLateSection.querySelector(dlConfig.gridSelector);

        if (!grid) {
          return null;
        }

        const bureauColumns = grid.querySelectorAll(dlConfig.bureauSelector);

        if (!bureauColumns || bureauColumns.length < 3) {
          return null;
        }

        const extractBureauDaysLate = (bureauColumn) => {
          const valuesGrid = bureauColumn.querySelector(dlConfig.valuesGridSelector);

          if (!valuesGrid) {
            return { '30': null, '60': null, '90': null };
          }

          const values = valuesGrid.querySelectorAll(dlConfig.valueSelector);

          return {
            '30': values[0]?.textContent.trim() || '0',
            '60': values[1]?.textContent.trim() || '0',
            '90': values[2]?.textContent.trim() || '0'
          };
        };

        return {
          transunion: extractBureauDaysLate(bureauColumns[0]),
          experian: extractBureauDaysLate(bureauColumns[1]),
          equifax: extractBureauDaysLate(bureauColumns[2])
        };
      }

      return accountsArray;
    }, config);

    console.log(`  ✓ Extraídas ${accounts.length} cuentas exitosamente`);
    return accounts;

  } catch (error) {
    console.error('❌ Error extrayendo Account History:', error.message);
    console.error(error.stack);
    return [];
  }
}

/**
 * Extrae Account History con paginación
 * Útil para limitar la cantidad de cuentas extraídas y evitar JSONs muy grandes
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {object} config - Configuración del extractor
 * @param {object} options - Opciones de paginación { limit, offset }
 * @returns {Promise<object>} { accounts: Array, total: number, hasMore: boolean }
 */
async function extractAccountHistoryPaginated(page, config, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    console.log(`→ Extrayendo Account History (limit: ${limit}, offset: ${offset})...`);

    // Extraer todas las cuentas
    const allAccounts = await extractAccountHistory(page, config);

    // Aplicar paginación
    const total = allAccounts.length;
    const paginatedAccounts = allAccounts.slice(offset, offset + limit);
    const hasMore = (offset + limit) < total;

    console.log(`  ✓ Retornando ${paginatedAccounts.length} de ${total} cuentas`);

    return {
      accounts: paginatedAccounts,
      total,
      hasMore,
      limit,
      offset
    };

  } catch (error) {
    console.error('❌ Error extrayendo Account History paginado:', error.message);
    return {
      accounts: [],
      total: 0,
      hasMore: false,
      limit: options.limit || 20,
      offset: options.offset || 0
    };
  }
}

module.exports = {
  extractAccountHistory,
  extractAccountHistoryPaginated
};
