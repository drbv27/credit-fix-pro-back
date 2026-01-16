/**
 * Configuración declarativa de extractores para el 3B Report
 *
 * Basado en el HTML real del sitio SmartCredit.com
 * Estructura validada con cuenta de ejemplo: NATNS DIRET, ROUNDPOINT, FLAGSTARBANK
 */

module.exports = {
  // ========================================
  // PERSONAL INFORMATION (YA IMPLEMENTADO)
  // ========================================
  personalInfo: {
    type: 'grid',
    sectionIndex: 0,
    gridIndex: 0,
    fields: [
      'credit_report_date',
      'name',
      'date_of_birth',
      'current_address',
      'previous_address',
      'employer'
    ],
    transform: 'cleanText'
  },

  // ========================================
  // SUMMARY (YA IMPLEMENTADO)
  // ========================================
  summary: {
    type: 'grid',
    sectionIndex: 1,
    gridIndex: 0,
    fields: [
      'total_accounts',
      'open_accounts',
      'closed_accounts',
      'delinquent',
      'derogatory',
      'balances',
      'payments',
      'public_records',
      'inquiries_2years'
    ],
    transform: {
      default: 'extractNumber',
      balances: 'cleanText',
      payments: 'cleanText'
    }
  },

  // ========================================
  // ACCOUNT HISTORY (NUEVO)
  // ========================================
  accountHistory: {
    type: 'account-list',

    // Selectores principales
    sectionSelector: 'section.mt-5',  // puede haber múltiples, Account History es el 3ro o 4to
    accountContainerSelector: 'div.my-3.border-b.border-5.border-color-gray-300',  // cada div es una cuenta individual

    // Selector del nombre de la cuenta
    accountNameSelector: 'p.h6 strong',  // ej: "ROUNDPOINT"

    // Selector del tipo de cuenta (opcional - está en un <p> antes del grid)
    accountTypeSelector: 'p.border-color-gray-100.border-b.pb-1.pt-2 strong',  // ej: "Real Estate Accounts"

    // Grid de 23 campos × 4 columnas (labels + 3 burós)
    gridSelector: 'div.d-grid.grid-cols-4',
    bureauColumnSelector: 'div.d-contents.grid-rows-23',
    gridCellSelector: 'p.grid-cell',

    // 23 campos de Account History (índices 2-23, el 1 es el header)
    fields: [
      'account_number',       // row 2
      'high_balance',         // row 3
      'last_verified',        // row 4
      'date_last_activity',   // row 5
      'date_reported',        // row 6
      'date_opened',          // row 7
      'balance_owed',         // row 8
      'closed_date',          // row 9
      'account_rating',       // row 10
      'account_description',  // row 11
      'dispute_status',       // row 12
      'creditor_type',        // row 13
      'account_status',       // row 14
      'payment_status',       // row 15
      'creditor_remarks',     // row 16
      'payment_amount',       // row 17
      'last_payment',         // row 18
      'term_length',          // row 19
      'past_due_amount',      // row 20
      'account_type',         // row 21
      'payment_frequency',    // row 22
      'credit_limit'          // row 23
    ],

    // Payment History (2 años = 24 meses)
    paymentHistory: {
      containerSelector: 'div.mt-3.p-1.fs-12',  // contenedor del payment history
      bureauHistorySelector: 'div.d-flex.flex-wrap.payment-history',  // cada buró tiene uno
      bureauLabelSelector: 'p.payment-history-heading',  // "transunion", "experian", "equifax"
      monthContainerSelector: 'div.d-flex.gap-1.flex-wrap.flex-1',  // contiene los 24 meses
      monthSelector: 'div[class^="status-"]',  // cada mes: status-C, status-U, status-1, etc.
      badgeSelector: 'p.month-badge',  // texto: "OK", "", "30", "60", "90"
      labelSelector: 'p.month-label'   // texto: "Aug", "Sep", "Oct", "'25"
    },

    // Days Late - 7 Year History (30/60/90 días)
    daysLate: {
      containerSelector: 'div:has(> p:contains("Days Late - 7 Year History"))',  // contenedor
      gridSelector: 'div.d-grid.grid-cols-3',  // grid de 3 columnas (3 burós)
      bureauSelector: 'div.border-right.border-color-gray-600',  // cada columna es un buró
      bureauLabelSelector: 'p.fw-bold.px-1.mb-1',  // "transunion", "experian", "equifax"
      valuesGridSelector: 'div.d-grid.grid-cols-3.bg-gray-100.text-center.py-1',  // contiene 30/60/90
      valueSelector: 'p span'  // los valores numéricos
    }
  },

  // ========================================
  // PUBLIC RECORDS (NUEVO)
  // ========================================
  publicRecords: {
    type: 'record-list',
    sectionSelector: 'section:has(h5:contains("Public Records"))',
    recordContainerSelector: 'div.record-item',  // ajustar según HTML real

    fields: [
      { name: 'record_type', selector: '.record-type', transform: 'cleanText' },
      { name: 'filing_date', selector: '.filing-date', transform: 'parseDate' },
      { name: 'status', selector: '.status', transform: 'cleanText' },
      { name: 'court', selector: '.court', transform: 'cleanText' },
      { name: 'case_number', selector: '.case-number', transform: 'cleanText' },
      { name: 'amount', selector: '.amount', transform: 'cleanText' },
      // NOTA: Ajustar selectores cuando se tenga acceso al HTML real de Public Records
    ]
  },

  // ========================================
  // INQUIRIES (ACTUALIZADO - Selectores reales)
  // ========================================
  inquiries: {
    type: 'inquiry-list',
    sectionSelector: 'section.mt-5',
    sectionHeading: 'Inquiries',
    // Header row (para ignorar): div.d-grid.grid-cols-3.fs-12.bg-gray-100
    inquiryRowSelector: 'div.d-grid.grid-cols-3.border-color-gray-100.border-b',
    cellSelector: 'p.grid-cell',
    fields: ['creditor_name', 'inquiry_date', 'credit_bureau']
  },

  // ========================================
  // CREDITOR CONTACTS (NUEVO - Con Clicks)
  // ========================================
  creditorContacts: {
    type: 'interactive-list',
    sectionSelector: 'section:has(h5:contains("Creditor Contacts"))',
    contactContainerSelector: 'div.creditor-contact',  // ajustar según HTML real

    // Botón que expande los detalles
    showButtonSelector: 'button:contains("Show")',
    hideButtonSelector: 'button:contains("Hide")',

    // Contenedor que aparece al hacer click
    detailsContainerSelector: '.contact-details',

    fields: [
      { name: 'company_name', selector: '.company-name', transform: 'cleanText' },
      { name: 'phone', selector: '.phone', transform: 'cleanText' },
      { name: 'address', selector: '.address', transform: 'cleanText' },
      { name: 'email', selector: '.email', transform: 'cleanText' },
      // NOTA: Ajustar selectores cuando se tenga acceso al HTML real de Creditor Contacts
    ]
  }
};
