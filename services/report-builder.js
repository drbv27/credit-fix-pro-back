/**
 * Report Builder - Construye el JSON final del 3B Report
 *
 * Este servicio toma los datos crudos extraídos y los transforma en el formato
 * JSON final esperado, aplicando parsing y validaciones.
 *
 * Características:
 * - Construcción modular del reporte final
 * - Integración con funciones de parsing existentes
 * - Manejo de secciones opcionales
 * - Compatible con estructura JSON existente
 */

const parser = require('../utils/parser');

/**
 * Clase principal del Report Builder
 */
class ReportBuilder {
  constructor() {
    this.parser = parser;
  }

  /**
   * Construye el reporte completo del 3B Report
   *
   * @param {object} rawData - Datos crudos extraídos por extraction-service
   * @param {object} options - Opciones adicionales
   * @param {boolean} options.includeDashboard - Incluir datos del dashboard (default: false)
   * @returns {object} Reporte final formateado
   */
  buildFullReport(rawData, options = {}) {
    const { includeDashboard = false } = options;

    console.log('\n→ Construyendo reporte final...');

    const report = {
      // Dashboard Summary (si está disponible)
      dashboard_summary: includeDashboard && rawData.dashboardScores
        ? this.buildDashboardSection(rawData.dashboardScores)
        : null,

      // Credit Scores del 3B Report
      credit_scores_3b: rawData.scores || null,

      // Personal Information
      personal_information: rawData.personalInfo
        ? this.parser.parse3BPersonalInfo(rawData.personalInfo)
        : null,

      // Summary
      summary: rawData.summary
        ? this.parser.parse3BSummary(rawData.summary)
        : null,

      // Account History (NUEVO)
      account_history: rawData.accountHistory
        ? this.parseAccountHistory(rawData.accountHistory)
        : null,

      // Public Records (NUEVO - Fase 3)
      public_records: rawData.publicRecords || null,

      // Inquiries (NUEVO - Fase 3)
      inquiries: rawData.inquiries || null,

      // Creditor Contacts (NUEVO - Fase 4)
      creditor_contacts: rawData.creditorContacts || null,

      // Metadata
      scraped_at: new Date().toISOString()
    };

    // Agregar metadata de paginación si existe
    if (rawData.accountHistoryPagination) {
      report.account_history_pagination = rawData.accountHistoryPagination;
    }

    console.log('  ✓ Reporte construido exitosamente');
    this.logReportSummary(report);

    return report;
  }

  /**
   * Construye la sección del dashboard
   * (Mantiene compatibilidad con código existente)
   *
   * @param {object} dashboardScores - Scores del dashboard
   * @returns {object} Sección formateada del dashboard
   */
  buildDashboardSection(dashboardScores) {
    // Esta función usa la lógica existente del parser
    return this.parser.buildCreditScoreData(dashboardScores);
  }

  /**
   * Parsea Account History aplicando transformaciones
   *
   * @param {Array<object>} rawAccounts - Cuentas crudas extraídas
   * @returns {Array<object>} Cuentas parseadas
   */
  parseAccountHistory(rawAccounts) {
    if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
      return [];
    }

    return rawAccounts.map(account => {
      try {
        return {
          account_name: this.cleanText(account.account_name),
          transunion: this.parseAccountFields(account.transunion),
          experian: this.parseAccountFields(account.experian),
          equifax: this.parseAccountFields(account.equifax),
          payment_history: account.payment_history || null,
          days_late: account.days_late || null
        };
      } catch (error) {
        console.error(`  ⚠ Error parseando cuenta: ${account.account_name}`, error.message);
        return account; // Retornar cuenta sin parsear si falla
      }
    });
  }

  /**
   * Parsea los campos de una cuenta de un buró específico
   *
   * @param {object} rawFields - Campos crudos del buró
   * @returns {object} Campos parseados
   */
  parseAccountFields(rawFields) {
    if (!rawFields) {
      return null;
    }

    return {
      account_number: this.cleanText(rawFields.account_number),
      high_balance: this.cleanText(rawFields.high_balance), // Mantener formato $ sin parsear
      last_verified: this.parseDate(rawFields.last_verified),
      date_last_activity: this.parseDate(rawFields.date_last_activity),
      date_reported: this.parseDate(rawFields.date_reported),
      date_opened: this.parseDate(rawFields.date_opened),
      balance_owed: this.cleanText(rawFields.balance_owed),
      closed_date: this.parseDate(rawFields.closed_date),
      account_rating: this.cleanText(rawFields.account_rating),
      account_description: this.cleanText(rawFields.account_description),
      dispute_status: this.cleanText(rawFields.dispute_status),
      creditor_type: this.cleanText(rawFields.creditor_type),
      account_status: this.cleanText(rawFields.account_status),
      payment_status: this.cleanText(rawFields.payment_status),
      creditor_remarks: this.cleanText(rawFields.creditor_remarks),
      payment_amount: this.cleanText(rawFields.payment_amount),
      last_payment: this.parseDate(rawFields.last_payment),
      term_length: this.cleanText(rawFields.term_length),
      past_due_amount: this.cleanText(rawFields.past_due_amount),
      account_type: this.cleanText(rawFields.account_type),
      payment_frequency: this.cleanText(rawFields.payment_frequency),
      credit_limit: this.cleanText(rawFields.credit_limit)
    };
  }

  /**
   * Limpia texto eliminando espacios extra y caracteres no deseados
   * (Reutiliza lógica del parser existente)
   *
   * @param {string} text - Texto a limpiar
   * @returns {string} Texto limpio
   */
  cleanText(text) {
    if (!text || text === '-' || text === 'N/A' || text === '') {
      return null;
    }

    return this.parser.cleanText(text);
  }

  /**
   * Parsea fechas en formato MM/DD/YYYY a ISO
   *
   * @param {string} dateStr - Fecha en formato MM/DD/YYYY
   * @returns {string|null} Fecha en formato ISO o null
   */
  parseDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'N/A') {
      return null;
    }

    // Usar función existente del parser
    return this.parser.parseScoreDate(dateStr);
  }

  /**
   * Log de resumen del reporte construido
   * Útil para debugging
   *
   * @param {object} report - Reporte completo
   */
  logReportSummary(report) {
    console.log('\n========================================');
    console.log('  RESUMEN DEL REPORTE');
    console.log('========================================');

    console.log('\nSecciones incluidas:');
    console.log(`  Dashboard Summary: ${report.dashboard_summary ? '✓' : '✗'}`);
    console.log(`  Credit Scores 3B: ${report.credit_scores_3b ? '✓' : '✗'}`);
    console.log(`  Personal Information: ${report.personal_information ? '✓' : '✗'}`);
    console.log(`  Summary: ${report.summary ? '✓' : '✗'}`);
    console.log(`  Account History: ${report.account_history ? `✓ (${report.account_history.length} cuentas)` : '✗'}`);
    console.log(`  Public Records: ${report.public_records ? '✓' : '✗'}`);
    console.log(`  Inquiries: ${report.inquiries ? '✓' : '✗'}`);
    console.log(`  Creditor Contacts: ${report.creditor_contacts ? `✓ (${report.creditor_contacts.length} contactos)` : '✗'}`);

    if (report.account_history_pagination) {
      console.log('\nPaginación de Account History:');
      console.log(`  Total: ${report.account_history_pagination.total}`);
      console.log(`  Limit: ${report.account_history_pagination.limit}`);
      console.log(`  Offset: ${report.account_history_pagination.offset}`);
      console.log(`  Has More: ${report.account_history_pagination.hasMore ? 'Sí' : 'No'}`);
    }

    console.log(`\nScraped at: ${report.scraped_at}`);
    console.log('========================================\n');
  }

  /**
   * Valida que el reporte tenga al menos las secciones mínimas requeridas
   *
   * @param {object} report - Reporte a validar
   * @returns {object} { valid: boolean, missing: Array<string> }
   */
  validateReport(report) {
    const requiredSections = ['credit_scores_3b', 'personal_information', 'summary'];
    const missing = [];

    requiredSections.forEach(section => {
      if (!report[section]) {
        missing.push(section);
      }
    });

    const valid = missing.length === 0;

    if (!valid) {
      console.log('\n⚠ Reporte incompleto. Secciones faltantes:');
      missing.forEach(section => console.log(`  - ${section}`));
    }

    return { valid, missing };
  }

  /**
   * Calcula el tamaño estimado del JSON final
   * Útil para verificar límites de memoria
   *
   * @param {object} report - Reporte completo
   * @returns {object} { bytes: number, kb: number, mb: number }
   */
  calculateReportSize(report) {
    try {
      const jsonString = JSON.stringify(report);
      const bytes = new Blob([jsonString]).size;
      const kb = (bytes / 1024).toFixed(2);
      const mb = (bytes / (1024 * 1024)).toFixed(2);

      console.log(`\n→ Tamaño del reporte: ${kb} KB (${mb} MB)`);

      if (mb > 2) {
        console.log('  ⚠ Advertencia: Reporte > 2 MB. Considerar paginación.');
      }

      return { bytes, kb: parseFloat(kb), mb: parseFloat(mb) };

    } catch (error) {
      console.error('Error calculando tamaño del reporte:', error.message);
      return { bytes: 0, kb: 0, mb: 0 };
    }
  }
}

// Exportar instancia singleton del builder
module.exports = new ReportBuilder();
