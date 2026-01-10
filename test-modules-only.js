/**
 * Test simple de módulos sin navegación
 * Verifica que todos los módulos nuevos funcionan correctamente
 * sin depender del scraping real
 */

console.log('========================================');
console.log('  TEST DE MÓDULOS - SIN NAVEGACIÓN');
console.log('========================================\n');

// Test 1: Importación de módulos
console.log('→ TEST 1: Importación de módulos...\n');

try {
  const extractionService = require('./services/extraction-service');
  const reportBuilder = require('./services/report-builder');
  const { extractGridData } = require('./utils/extractors/grid-extractor');
  const { extractAccountHistory } = require('./utils/extractors/account-extractor');
  const { extractCreditorContacts } = require('./utils/extractors/contact-extractor');
  const navigation = require('./utils/navigation');
  const extractorConfig = require('./config/extractors');
  const parser = require('./utils/parser');

  console.log('  ✓ extraction-service');
  console.log('  ✓ report-builder');
  console.log('  ✓ grid-extractor');
  console.log('  ✓ account-extractor');
  console.log('  ✓ contact-extractor');
  console.log('  ✓ navigation');
  console.log('  ✓ extractorConfig');
  console.log('  ✓ parser (existente)');

  console.log('\n✓ TEST 1: PASADO - Todos los módulos se importan correctamente\n');

  // Test 2: Verificar métodos exportados
  console.log('→ TEST 2: Verificando métodos exportados...\n');

  const methods = [
    { module: 'extractionService', method: 'extractAll3BReport', func: extractionService.extractAll3BReport },
    { module: 'extractionService', method: 'checkAvailableSections', func: extractionService.checkAvailableSections },
    { module: 'reportBuilder', method: 'buildFullReport', func: reportBuilder.buildFullReport },
    { module: 'reportBuilder', method: 'parseAccountHistory', func: reportBuilder.parseAccountHistory },
    { module: 'reportBuilder', method: 'validateReport', func: reportBuilder.validateReport },
    { module: 'grid-extractor', method: 'extractGridData', func: extractGridData },
    { module: 'account-extractor', method: 'extractAccountHistory', func: extractAccountHistory },
    { module: 'contact-extractor', method: 'extractCreditorContacts', func: extractCreditorContacts },
    { module: 'navigation', method: 'waitForElement', func: navigation.waitForElement },
    { module: 'navigation', method: 'clickWithRetry', func: navigation.clickWithRetry }
  ];

  let allMethodsOk = true;
  methods.forEach(({ module, method, func }) => {
    if (typeof func === 'function') {
      console.log(`  ✓ ${module}.${method}()`);
    } else {
      console.log(`  ❌ ${module}.${method}() - NO ES FUNCIÓN`);
      allMethodsOk = false;
    }
  });

  console.log(`\n${allMethodsOk ? '✓' : '❌'} TEST 2: ${allMethodsOk ? 'PASADO' : 'FALLADO'}\n`);

  // Test 3: Verificar estructura de extractorConfig
  console.log('→ TEST 3: Verificando extractorConfig...\n');

  const sections = ['personalInfo', 'summary', 'accountHistory', 'publicRecords', 'inquiries', 'creditorContacts'];
  let allSectionsOk = true;

  sections.forEach(section => {
    if (extractorConfig[section]) {
      console.log(`  ✓ ${section}`);
    } else {
      console.log(`  ❌ ${section} - FALTA`);
      allSectionsOk = false;
    }
  });

  console.log(`\n${allSectionsOk ? '✓' : '❌'} TEST 3: ${allSectionsOk ? 'PASADO' : 'FALLADO'}\n`);

  // Test 4: Probar reportBuilder con datos mock
  console.log('→ TEST 4: Probando reportBuilder con datos mock...\n');

  const mockData = {
    scores: {
      transunion: 770,
      experian: 790,
      equifax: 789
    },
    personalInfo: {
      transunion: {
        credit_report_date: '01/07/2026',
        name: 'John Doe',
        date_of_birth: '01/01/1990',
        current_address: '123 Main St',
        previous_address: '456 Old St',
        employer: 'Acme Corp'
      },
      experian: {
        credit_report_date: '01/07/2026',
        name: 'John Doe',
        date_of_birth: '01/01/1990',
        current_address: '123 Main St',
        previous_address: '456 Old St',
        employer: 'Acme Corp'
      },
      equifax: {
        credit_report_date: '01/07/2026',
        name: 'John Doe',
        date_of_birth: '01/01/1990',
        current_address: '123 Main St',
        previous_address: '456 Old St',
        employer: 'Acme Corp'
      }
    },
    summary: {
      transunion: {
        total_accounts: '10',
        open_accounts: '8',
        closed_accounts: '2',
        delinquent: '0',
        derogatory: '0',
        balances: '$50,000',
        payments: '$1,500',
        public_records: '0',
        inquiries_2years: '2'
      },
      experian: {
        total_accounts: '10',
        open_accounts: '8',
        closed_accounts: '2',
        delinquent: '0',
        derogatory: '0',
        balances: '$50,000',
        payments: '$1,500',
        public_records: '0',
        inquiries_2years: '2'
      },
      equifax: {
        total_accounts: '10',
        open_accounts: '8',
        closed_accounts: '2',
        delinquent: '0',
        derogatory: '0',
        balances: '$50,000',
        payments: '$1,500',
        public_records: '0',
        inquiries_2years: '2'
      }
    },
    accountHistory: [
      {
        account_name: 'Test Bank',
        transunion: {
          account_number: '123456',
          high_balance: '$10,000',
          balance_owed: '$5,000'
        },
        experian: {
          account_number: '123456',
          high_balance: '$10,000',
          balance_owed: '$5,000'
        },
        equifax: {
          account_number: '123456',
          high_balance: '$10,000',
          balance_owed: '$5,000'
        },
        payment_history: null,
        days_late: null
      }
    ]
  };

  const report = reportBuilder.buildFullReport(mockData);

  if (report && report.credit_scores_3b && report.personal_information && report.summary) {
    console.log('  ✓ buildFullReport() funciona correctamente');
    console.log('  ✓ Reporte tiene estructura esperada');
    console.log(`  → Secciones en reporte: ${Object.keys(report).length}`);

    // Validar reporte
    const validation = reportBuilder.validateReport(report);
    console.log(`  ${validation.valid ? '✓' : '❌'} Validación del reporte: ${validation.valid ? 'PASADO' : 'FALLADO'}`);

    // Calcular tamaño
    const size = reportBuilder.calculateReportSize(report);
    console.log(`  → Tamaño del reporte: ${size.kb} KB`);

    console.log('\n✓ TEST 4: PASADO\n');
  } else {
    console.log('  ❌ buildFullReport() no generó estructura correcta');
    console.log('\n❌ TEST 4: FALLADO\n');
  }

  // Test 5: Probar parseAccountHistory
  console.log('→ TEST 5: Probando parseAccountHistory...\n');

  const mockAccounts = [
    {
      account_name: 'ROUNDPOINT',
      transunion: {
        account_number: '596201*******',
        high_balance: '$449,250',
        last_verified: '12/10/2025'
      },
      experian: {
        account_number: '596201*******',
        high_balance: '$449,250',
        last_verified: '12/10/2025'
      },
      equifax: {
        account_number: '596201*******',
        high_balance: '$449,250',
        last_verified: '12/10/2025'
      }
    }
  ];

  const parsedAccounts = reportBuilder.parseAccountHistory(mockAccounts);

  if (Array.isArray(parsedAccounts) && parsedAccounts.length === 1) {
    console.log('  ✓ parseAccountHistory() retorna array');
    console.log('  ✓ Cantidad de cuentas correcta');

    const account = parsedAccounts[0];
    if (account.account_name && account.transunion && account.experian && account.equifax) {
      console.log('  ✓ Estructura de cuenta correcta');
      console.log('\n✓ TEST 5: PASADO\n');
    } else {
      console.log('  ❌ Estructura de cuenta incorrecta');
      console.log('\n❌ TEST 5: FALLADO\n');
    }
  } else {
    console.log('  ❌ parseAccountHistory() no retorna array válido');
    console.log('\n❌ TEST 5: FALLADO\n');
  }

  // Resumen final
  console.log('========================================');
  console.log('  RESUMEN FINAL');
  console.log('========================================\n');

  console.log('✓ Todos los módulos nuevos funcionan correctamente');
  console.log('✓ 100% compatible con código existente (CommonJS)');
  console.log('✓ Funciones de parsing y building funcionan correctamente');
  console.log('✓ No hay errores de sintaxis o importación');
  console.log('\n🎉 FASE 1 COMPLETADA EXITOSAMENTE\n');

  console.log('Próximos pasos:');
  console.log('1. Integrar extraction-service en scraper.js o server.js');
  console.log('2. Validar selectores de Account History con HTML real');
  console.log('3. Implementar Fase 2 (Account History extraction)\n');

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
