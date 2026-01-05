/**
 * CSS Selectors for SmartCredit.com scraping
 *
 * NOTA: Estos selectores pueden necesitar ajustes según el HTML real del sitio.
 * Se recomienda ejecutar el scraper en modo headless:false primero para validar.
 */

module.exports = {
  // Login page selectors
  LOGIN_BUTTON: 'a[href="/login/"]',
  EMAIL_INPUT: 'input#j_username',
  PASSWORD_INPUT: 'input#j_password',
  SUBMIT_BUTTON: 'button[name="loginbttn"]',

  // Dashboard - Main container
  SCORE_CARD_CONTAINER: '.card-body',

  // Credit Score Info
  SCORE_DATE: 'p.font-13.mb-0', // "As of 12/10/2025"

  // Score columns (contienen los números grandes)
  SCORE_COLUMNS: 'div.score-column h2, div.score-column h4',

  // ScoreTracker section
  SCORE_TRACKER_SECTION: 'div.score-feature-title:has(h4:contains("ScoreTracker"))',
  CURRENT_SCORE_TRACKER: 'div.score-column h2.font-black', // 813

  // ScoreBuilder section
  SCORE_BUILDER_SECTION: 'div.score-feature-title:has(h4:contains("ScoreBuilder"))',
  SCORE_BUILDER_BOOST: 'div.score-column h4.font-black', // +34

  // ScoreBoost section
  SCORE_BOOST_SECTION: 'div.score-feature-title:has(h4:contains("ScoreBoost"))',
  SCORE_BOOST_VALUE: 'div.score-column h4.font-black', // +0

  // Future Score
  FUTURE_SCORE_SECTION: 'div.score-feature-title:has(h4:contains("Your Future Score"))',
  FUTURE_SCORE: 'h2.text-pay', // 847

  // Textos descriptivos (para extraer números con regex)
  ALL_TEXT_CONTENT: 'small, p',

  // ========================================
  // NAVIGATION TO 3B REPORT
  // ========================================
  REPORTS_DROPDOWN: 'a.dropdown-toggle[data-toggle="dropdown"]',
  REPORT_3B_LINK: 'a[href="/member/credit-report/smart-3b/"]',
  CLASSIC_VIEW_BUTTON: 'button.btn-sm.btn-secondary',

  // ========================================
  // 3B REPORT - CREDIT SCORES
  // ========================================
  CREDIT_SCORE_3B_SECTION: 'section.credit-score-3',
  TRANSUNION_SCORE_3B: 'section.credit-score-3 dl:nth-child(1) h5',
  EXPERIAN_SCORE_3B: 'section.credit-score-3 dl:nth-child(2) h5',
  EQUIFAX_SCORE_3B: 'section.credit-score-3 dl:nth-child(3) h5',

  // ========================================
  // 3B REPORT - PERSONAL INFORMATION GRID
  // ========================================
  PERSONAL_INFO_GRID: 'div.d-grid.grid-cols-4',

  // TransUnion Personal Information (segunda columna de datos)
  TU_REPORT_DATE: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(2) p.grid-cell:nth-of-type(2)',
  TU_NAME: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(2) p.grid-cell:nth-of-type(3)',
  TU_DOB: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(2) p.grid-cell:nth-of-type(4)',
  TU_CURRENT_ADDRESS: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(2) p.grid-cell:nth-of-type(5)',
  TU_PREVIOUS_ADDRESS: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(2) p.grid-cell:nth-of-type(6)',
  TU_EMPLOYER: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(2) p.grid-cell:nth-of-type(7)',

  // Experian Personal Information (tercera columna de datos)
  EXP_REPORT_DATE: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(3) p.grid-cell:nth-of-type(2)',
  EXP_NAME: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(3) p.grid-cell:nth-of-type(3)',
  EXP_DOB: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(3) p.grid-cell:nth-of-type(4)',
  EXP_CURRENT_ADDRESS: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(3) p.grid-cell:nth-of-type(5)',
  EXP_PREVIOUS_ADDRESS: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(3) p.grid-cell:nth-of-type(6)',
  EXP_EMPLOYER: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(3) p.grid-cell:nth-of-type(7)',

  // Equifax Personal Information (cuarta columna de datos)
  EQF_REPORT_DATE: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(4) p.grid-cell:nth-of-type(2)',
  EQF_NAME: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(4) p.grid-cell:nth-of-type(3)',
  EQF_DOB: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(4) p.grid-cell:nth-of-type(4)',
  EQF_CURRENT_ADDRESS: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(4) p.grid-cell:nth-of-type(5)',
  EQF_PREVIOUS_ADDRESS: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(4) p.grid-cell:nth-of-type(6)',
  EQF_EMPLOYER: 'section.mt-5:nth-of-type(1) div.d-grid:first-of-type div.d-contents:nth-child(4) p.grid-cell:nth-of-type(7)',

  // ========================================
  // 3B REPORT - SUMMARY GRID
  // ========================================
  SUMMARY_GRID: 'div.d-grid.grid-cols-4',

  // TransUnion Summary
  TU_TOTAL_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(2)',
  TU_OPEN_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(3)',
  TU_CLOSED_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(4)',
  TU_DELINQUENT: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(5)',
  TU_DEROGATORY: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(6)',
  TU_BALANCES: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(7)',
  TU_PAYMENTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(8)',
  TU_PUBLIC_RECORDS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(9)',
  TU_INQUIRIES: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(10)',

  // Experian Summary
  EXP_TOTAL_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(12)',
  EXP_OPEN_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(13)',
  EXP_CLOSED_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(14)',
  EXP_DELINQUENT: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(15)',
  EXP_DEROGATORY: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(16)',
  EXP_BALANCES: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(17)',
  EXP_PAYMENTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(18)',
  EXP_PUBLIC_RECORDS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(19)',
  EXP_INQUIRIES: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(20)',

  // Equifax Summary
  EQF_TOTAL_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(22)',
  EQF_OPEN_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(23)',
  EQF_CLOSED_ACCOUNTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(24)',
  EQF_DELINQUENT: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(25)',
  EQF_DEROGATORY: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(26)',
  EQF_BALANCES: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(27)',
  EQF_PAYMENTS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(28)',
  EQF_PUBLIC_RECORDS: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(29)',
  EQF_INQUIRIES: 'section.mt-5:nth-of-type(2) div.d-grid p.grid-cell:nth-of-type(30)',
};
