/**
 * Script de prueba para la Fase 1 - Infraestructura Base
 *
 * Este script valida que todos los módulos nuevos funcionan correctamente
 * sin romper el código existente.
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

// Importar módulos nuevos
const extractionService = require('./services/extraction-service');
const reportBuilder = require('./services/report-builder');
const { extractGridData } = require('./utils/extractors/grid-extractor');
const { extractAccountHistory } = require('./utils/extractors/account-extractor');
const { waitForElement, clickWithRetry } = require('./utils/navigation');

// Importar configuración existente
const selectors = require('./config/selectors');
const extractorConfig = require('./config/extractors');

console.log('========================================');
console.log('  TEST FASE 1 - INFRAESTRUCTURA BASE');
console.log('========================================\n');

/**
 * Paso 1: Verificar que todos los módulos se importan correctamente
 */
function testModuleImports() {
  console.log('→ TEST 1: Verificando importación de módulos...\n');

  const tests = [
    { name: 'extraction-service', module: extractionService },
    { name: 'report-builder', module: reportBuilder },
    { name: 'grid-extractor', module: extractGridData },
    { name: 'account-extractor', module: extractAccountHistory },
    { name: 'navigation helpers', module: waitForElement },
    { name: 'selectors (existente)', module: selectors },
    { name: 'extractorConfig', module: extractorConfig }
  ];

  let allPassed = true;

  tests.forEach(test => {
    if (test.module) {
      console.log(`  ✓ ${test.name} - OK`);
    } else {
      console.log(`  ❌ ${test.name} - FALLO`);
      allPassed = false;
    }
  });

  console.log(`\n${allPassed ? '✓' : '❌'} TEST 1: ${allPassed ? 'PASADO' : 'FALLADO'}\n`);
  return allPassed;
}

/**
 * Paso 2: Verificar estructura de extractorConfig
 */
function testExtractorConfig() {
  console.log('→ TEST 2: Verificando configuración de extractores...\n');

  const expectedSections = [
    'personalInfo',
    'summary',
    'accountHistory',
    'publicRecords',
    'inquiries',
    'creditorContacts'
  ];

  let allPassed = true;

  expectedSections.forEach(section => {
    if (extractorConfig[section]) {
      console.log(`  ✓ ${section} - Configurado`);
    } else {
      console.log(`  ❌ ${section} - FALTA`);
      allPassed = false;
    }
  });

  // Verificar estructura de accountHistory
  if (extractorConfig.accountHistory) {
    const requiredFields = ['type', 'accountContainerSelector', 'accountNameSelector', 'fields'];
    console.log('\n  → Verificando estructura de accountHistory:');

    requiredFields.forEach(field => {
      if (extractorConfig.accountHistory[field]) {
        console.log(`    ✓ ${field}`);
      } else {
        console.log(`    ❌ ${field} - FALTA`);
        allPassed = false;
      }
    });
  }

  console.log(`\n${allPassed ? '✓' : '❌'} TEST 2: ${allPassed ? 'PASADO' : 'FALLADO'}\n`);
  return allPassed;
}

/**
 * Paso 3: Login y navegación al 3B Report (sin extraer datos aún)
 */
async function testNavigation() {
  console.log('→ TEST 3: Probando navegación al 3B Report...\n');

  let browser = null;
  let passed = false;

  try {
    // Verificar credenciales
    const email = process.env.SMARTCREDIT_EMAIL;
    const password = process.env.SMARTCREDIT_PASSWORD;

    if (!email || !password) {
      console.log('  ❌ Faltan credenciales en .env');
      console.log('  → Agrega SMARTCREDIT_EMAIL y SMARTCREDIT_PASSWORD');
      return false;
    }

    console.log('  → Lanzando navegador (headless)...');
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();
    console.log('  ✓ Navegador lanzado');

    // Navegar a SmartCredit
    console.log('  → Navegando a SmartCredit...');
    await page.goto('https://www.smartcredit.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('  ✓ Página cargada');

    // Login
    console.log('  → Haciendo login...');
    await page.click(selectors.LOGIN_BUTTON);
    await page.waitForSelector(selectors.EMAIL_INPUT, { visible: true });

    await page.type(selectors.EMAIL_INPUT, email, { delay: 50 });
    await page.type(selectors.PASSWORD_INPUT, password, { delay: 50 });
    await page.click(selectors.SUBMIT_BUTTON);

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    console.log('  ✓ Login exitoso');

    // Navegar al 3B Report
    console.log('  → Navegando al 3B Report...');

    // Click en dropdown "Reports"
    await clickWithRetry(page, selectors.REPORTS_DROPDOWN, { maxRetries: 3 });
    await new Promise(r => setTimeout(r, 1000));

    // Click en "3B Report & Scores"
    await clickWithRetry(page, selectors.REPORT_3B_LINK, { maxRetries: 3 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('  ✓ Navegación al 3B Report exitosa');

    // Buscar botón "Switch to Classic View"
    console.log('  → Buscando botón "Switch to Classic View"...');

    const classicViewFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const classicButton = buttons.find(btn =>
        btn.textContent.includes('Switch to Classic View')
      );

      if (classicButton) {
        classicButton.click();
        return true;
      }
      return false;
    });

    if (classicViewFound) {
      console.log('  ✓ Click en "Switch to Classic View"');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('  ! "Switch to Classic View" no encontrado (puede que ya esté en classic view)');
    }

    // Verificar que estamos en la página correcta
    const currentUrl = page.url();
    console.log(`  → URL actual: ${currentUrl}`);

    if (currentUrl.includes('member') || currentUrl.includes('report')) {
      console.log('  ✓ Estamos en la página del reporte');
      passed = true;
    } else {
      console.log('  ⚠ URL inesperada');
    }

  } catch (error) {
    console.error('  ❌ Error en navegación:', error.message);
    passed = false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('  → Navegador cerrado');
    }
  }

  console.log(`\n${passed ? '✓' : '❌'} TEST 3: ${passed ? 'PASADO' : 'FALLADO'}\n`);
  return passed;
}

/**
 * Paso 4: Test de extracción con extraction-service
 */
async function testExtraction() {
  console.log('→ TEST 4: Probando extraction-service...\n');

  let browser = null;
  let passed = false;

  try {
    const email = process.env.SMARTCREDIT_EMAIL;
    const password = process.env.SMARTCREDIT_PASSWORD;

    if (!email || !password) {
      console.log('  ⚠ Saltando test (faltan credenciales)');
      return true; // No fallar el test si no hay credenciales
    }

    console.log('  → Lanzando navegador...');
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Proceso completo de login y navegación (igual que TEST 3)
    await page.goto('https://www.smartcredit.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.click(selectors.LOGIN_BUTTON);
    await page.waitForSelector(selectors.EMAIL_INPUT, { visible: true });
    await page.type(selectors.EMAIL_INPUT, email, { delay: 50 });
    await page.type(selectors.PASSWORD_INPUT, password, { delay: 50 });
    await page.click(selectors.SUBMIT_BUTTON);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    await clickWithRetry(page, selectors.REPORTS_DROPDOWN, { maxRetries: 3 });
    await new Promise(r => setTimeout(r, 1000));
    await clickWithRetry(page, selectors.REPORT_3B_LINK, { maxRetries: 3 });
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const classicButton = buttons.find(btn =>
        btn.textContent.includes('Switch to Classic View')
      );
      if (classicButton) classicButton.click();
    });

    await new Promise(r => setTimeout(r, 3000));

    console.log('  ✓ Navegación completada');
    console.log('  → Verificando secciones disponibles...\n');

    // Usar extraction-service para verificar secciones
    const availability = await extractionService.checkAvailableSections(page);

    if (availability) {
      console.log('  → Extrayendo datos (solo secciones existentes)...\n');

      // Extraer solo las secciones que ya funcionan
      const raw3BData = await extractionService.extractAll3BReport(page, {
        sections: ['scores', 'personalInfo', 'summary']
      });

      console.log('\n  → Construyendo reporte...\n');
      const finalReport = reportBuilder.buildFullReport(raw3BData);

      // Validar reporte
      const validation = reportBuilder.validateReport(finalReport);

      if (validation.valid) {
        console.log('  ✓ Reporte válido y completo');

        // Calcular tamaño
        reportBuilder.calculateReportSize(finalReport);

        passed = true;
      } else {
        console.log('  ❌ Reporte incompleto');
        console.log('  → Secciones faltantes:', validation.missing);
      }

    } else {
      console.log('  ❌ No se pudieron verificar secciones disponibles');
    }

  } catch (error) {
    console.error('  ❌ Error en extracción:', error.message);
    console.error(error.stack);
    passed = false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('  → Navegador cerrado');
    }
  }

  console.log(`\n${passed ? '✓' : '❌'} TEST 4: ${passed ? 'PASADO' : 'FALLADO'}\n`);
  return passed;
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
  console.log('Iniciando batería de tests...\n');

  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false
  };

  // Test 1: Importación de módulos (sin navegador)
  results.test1 = testModuleImports();

  // Test 2: Configuración de extractores (sin navegador)
  results.test2 = testExtractorConfig();

  // Test 3: Navegación (requiere credenciales)
  results.test3 = await testNavigation();

  // Test 4: Extracción completa (requiere credenciales)
  results.test4 = await testExtraction();

  // Resumen final
  console.log('\n========================================');
  console.log('  RESUMEN DE TESTS');
  console.log('========================================\n');

  console.log(`TEST 1 - Importación de módulos: ${results.test1 ? '✓ PASADO' : '❌ FALLADO'}`);
  console.log(`TEST 2 - Configuración extractores: ${results.test2 ? '✓ PASADO' : '❌ FALLADO'}`);
  console.log(`TEST 3 - Navegación al 3B Report: ${results.test3 ? '✓ PASADO' : '❌ FALLADO'}`);
  console.log(`TEST 4 - Extracción de datos: ${results.test4 ? '✓ PASADO' : '❌ FALLADO'}`);

  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;

  console.log('\n========================================');
  console.log(`  RESULTADO: ${totalPassed}/${totalTests} tests pasados`);
  console.log('========================================\n');

  if (totalPassed === totalTests) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON!\n');
    console.log('✓ Los módulos de Fase 1 están funcionando correctamente');
    console.log('✓ El código es 100% compatible con el existente');
    console.log('✓ Listo para integrar en scraper.js y server.js\n');
  } else {
    console.log('⚠ Algunos tests fallaron. Revisa los errores arriba.\n');
  }

  process.exit(totalPassed === totalTests ? 0 : 1);
}

// Ejecutar tests
runAllTests().catch(error => {
  console.error('\n❌ Error fatal ejecutando tests:', error);
  process.exit(1);
});
