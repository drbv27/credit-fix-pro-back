/**
 * SmartCredit Scraper - Standalone Mode
 *
 * Este script automatiza el login a SmartCredit.com y extrae datos del credit score.
 * Ejecutar: npm run scrape
 *
 * Modo: headless:false (muestra el navegador para debugging)
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const selectors = require('./config/selectors');
const {
  extractNumber,
  parseScoreDate,
  parseScoreProgress,
  parseBoostPotential,
  parseScoreBoost,
  buildCreditScoreData,
  cleanText,
  parse3BScores,
  parse3BPersonalInfo,
  parse3BSummary,
  buildFullCreditReport,
} = require('./utils/parser');

// Configuración
const SMARTCREDIT_URL = 'https://www.smartcredit.com/?PID=56032';
const LOGIN_URL = 'https://www.smartcredit.com/login/';
const DASHBOARD_URL = 'https://www.smartcredit.com/member/';

async function scrapeCreditScore() {
  let browser = null;

  try {
    console.log('==============================================');
    console.log('  SmartCredit Scraper - Standalone Mode');
    console.log('==============================================\n');

    // PASO 1: Inicializar navegador
    console.log('--- 1. Iniciando navegador Puppeteer ---');
    browser = await puppeteer.launch({
      headless: false, // Mostrar navegador para debugging
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    console.log('✓ Navegador iniciado\n');

    // PASO 2: Navegar a página de login
    console.log('--- 2. Navegando a SmartCredit.com ---');
    await page.goto(SMARTCREDIT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Página cargada\n');

    // PASO 3: Click en botón "Log In"
    console.log('--- 3. Buscando botón de Login ---');
    try {
      await page.waitForSelector(selectors.LOGIN_BUTTON, { timeout: 10000 });
      console.log('✓ Botón de login encontrado');

      await page.click(selectors.LOGIN_BUTTON);
      console.log('✓ Click en "Log In" realizado\n');

      // Esperar navegación a página de login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (error) {
      console.log('! Botón de login no encontrado, asumiendo que ya estamos en /login/');
    }

    // PASO 4: Esperar formulario de login
    console.log('--- 4. Esperando formulario de login ---');
    await page.waitForSelector(selectors.EMAIL_INPUT, { timeout: 10000 });
    await page.waitForSelector(selectors.PASSWORD_INPUT, { timeout: 10000 });
    console.log('✓ Formulario de login detectado\n');

    // PASO 5: Ingresar credenciales
    console.log('--- 5. Ingresando credenciales ---');
    const email = process.env.SMARTCREDIT_EMAIL;
    const password = process.env.SMARTCREDIT_PASSWORD;

    if (!email || !password) {
      throw new Error('SMARTCREDIT_EMAIL y SMARTCREDIT_PASSWORD deben estar definidos en .env');
    }

    await page.type(selectors.EMAIL_INPUT, email, { delay: 50 });
    console.log(`✓ Email ingresado: ${email.substring(0, 3)}***`);

    await page.type(selectors.PASSWORD_INPUT, password, { delay: 50 });
    console.log('✓ Password ingresado\n');

    // PASO 6: Click en botón submit
    console.log('--- 6. Enviando formulario ---');
    await page.click(selectors.SUBMIT_BUTTON);
    console.log('✓ Click en "Log In" enviado');

    // Esperar navegación al dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Navegación completada\n');

    // PASO 7: Verificar que estamos en el dashboard
    console.log('--- 7. Verificando dashboard ---');
    const currentUrl = page.url();
    console.log(`URL actual: ${currentUrl}`);

    if (!currentUrl.includes('/member/')) {
      throw new Error('Login falló - No se redirigió al dashboard de member');
    }
    console.log('✓ Login exitoso - Dashboard cargado\n');

    // PASO 8: Navegar al 3B Report
    console.log('--- 8. Navegando al 3B Report ---');

    // 8.1: Click en dropdown "Reports"
    console.log('Buscando dropdown "Reports"...');
    await page.waitForSelector(selectors.REPORTS_DROPDOWN, { timeout: 10000 });

    // Hacer click directamente usando page.evaluate
    const reportsDropdownFound = await page.evaluate((selector) => {
      const dropdowns = Array.from(document.querySelectorAll(selector));
      const reportsDropdown = dropdowns.find((el) => el.textContent.includes('Reports'));
      if (reportsDropdown) {
        reportsDropdown.click();
        return true;
      }
      return false;
    }, selectors.REPORTS_DROPDOWN);

    if (!reportsDropdownFound) {
      throw new Error('No se encontró el dropdown "Reports"');
    }

    console.log('✓ Click en dropdown "Reports"');
    await new Promise((r) => setTimeout(r, 2000)); // Más tiempo para que se despliegue el menú

    // 8.2: Click en "3B Report & Scores"
    console.log('Buscando link "3B Report & Scores"...');

    // Buscar el link con múltiples estrategias
    const report3BLinkFound = await page.evaluate(() => {
      // Estrategia 1: Buscar por href exacto
      let link = document.querySelector('a[href="/member/credit-report/smart-3b/"]');

      // Estrategia 2: Buscar por href que contenga "smart-3b"
      if (!link) {
        const allLinks = Array.from(document.querySelectorAll('a'));
        link = allLinks.find(a => a.href.includes('smart-3b'));
      }

      // Estrategia 3: Buscar por texto que contenga "3B Report"
      if (!link) {
        const allLinks = Array.from(document.querySelectorAll('a'));
        link = allLinks.find(a => a.textContent.includes('3B Report'));
      }

      if (link) {
        console.log('Link encontrado:', link.href, link.textContent);
        link.click();
        return true;
      }

      return false;
    });

    if (!report3BLinkFound) {
      throw new Error('No se encontró el link "3B Report & Scores"');
    }

    console.log('✓ Click en "3B Report & Scores"');

    // Esperar navegación
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Navegación a 3B Report completada');

    // 8.3: Esperar a que cargue completamente la página del 3B Report
    console.log('Esperando a que cargue la página del 3B Report...');
    await new Promise((r) => setTimeout(r, 3000));

    // 8.4: Click en "Switch to Classic View"
    console.log('Buscando botón "Switch to Classic View"...');

    // Primero hacer debug de los botones disponibles
    const buttonsDebug = await page.evaluate((selector) => {
      const buttons = Array.from(document.querySelectorAll(selector));
      return buttons.map((btn) => ({
        text: btn.textContent.trim(),
        classes: btn.className,
        visible: btn.offsetParent !== null,
      }));
    }, selectors.CLASSIC_VIEW_BUTTON);

    console.log('Botones btn-sm.btn-secondary encontrados:', JSON.stringify(buttonsDebug, null, 2));

    // Ahora buscar el botón con múltiples estrategias
    const classicViewButtonInfo = await page.evaluate((selector) => {
      // Estrategia 1: Buscar por clase específica y texto
      let buttons = Array.from(document.querySelectorAll(selector));
      let classicButton = buttons.find((btn) => btn.textContent.includes('Switch to Classic View'));

      // Estrategia 2: Buscar cualquier botón que contenga "Classic"
      if (!classicButton) {
        buttons = Array.from(document.querySelectorAll('button'));
        classicButton = buttons.find((btn) => btn.textContent.includes('Classic'));
      }

      // Estrategia 3: Buscar por cualquier botón que tenga "Switch"
      if (!classicButton) {
        buttons = Array.from(document.querySelectorAll('button'));
        classicButton = buttons.find((btn) => btn.textContent.includes('Switch'));
      }

      if (classicButton) {
        classicButton.click();
        return { found: true, text: classicButton.textContent.trim() };
      }

      return { found: false, text: null };
    }, selectors.CLASSIC_VIEW_BUTTON);

    if (!classicViewButtonInfo.found) {
      console.log('⚠ Botón "Switch to Classic View" no encontrado - asumiendo ya estamos en Classic View');
    } else {
      console.log(`✓ Click en botón: "${classicViewButtonInfo.text}"`);
      await new Promise((r) => setTimeout(r, 5000)); // Esperar más tiempo a que cargue la vista clásica
    }

    console.log('✓ Navegación al 3B Report completada\n');

    // PASO 9: Esperar que cargue el reporte 3B
    console.log('--- 9. Esperando datos del 3B Report ---');

    // Debug: Verificar URL actual
    const currentUrl3B = page.url();
    console.log(`URL actual después de navegar: ${currentUrl3B}`);

    // Debug: Buscar elementos en la página
    const pageDebugInfo = await page.evaluate(() => {
      return {
        title: document.title,
        bodyClasses: document.body?.className || 'No body element',
        hasCreditScore3: !!document.querySelector('section.credit-score-3'),
        hasClassicView: !!document.querySelector('button.btn-sm.btn-secondary'),
        allSections: Array.from(document.querySelectorAll('section')).map(s => s.className).join(', '),
        hasGrid: !!document.querySelector('.d-grid.grid-cols-4'),
      };
    });

    console.log('Debug info:', JSON.stringify(pageDebugInfo, null, 2));

    // Intentar esperar por la sección de credit scores
    try {
      await page.waitForSelector(selectors.CREDIT_SCORE_3B_SECTION, { timeout: 5000 });
      console.log('✓ Sección de credit scores 3B detectada\n');
    } catch (error) {
      console.log('⚠ No se encontró section.credit-score-3, buscando alternativas...');

      // Intentar encontrar cualquier sección que tenga los scores
      const hasScores = await page.evaluate(() => {
        // Buscar elementos con texto "TransUnion", "Experian", "Equifax"
        const text = document.body.textContent;
        return text.includes('TransUnion') && text.includes('Experian') && text.includes('Equifax');
      });

      if (!hasScores) {
        throw new Error('No se encontraron los credit scores en la página. Puede que necesite hacer click en "Switch to Classic View"');
      }

      console.log('✓ Se encontraron referencias a los 3 burós en la página');
    }

    // Pequeña espera para asegurar que todo el contenido dinámico cargue
    await new Promise((r) => setTimeout(r, 3000));

    // Debug: Guardar HTML de la página para análisis (solo en desarrollo)
    const pageHTML = await page.content();
    const htmlPath = path.join(__dirname, 'output', 'page_3b_debug.html');
    fs.writeFileSync(htmlPath, pageHTML, 'utf-8');
    console.log(`Debug: HTML guardado en ${htmlPath}`);

    // PASO 10: Extraer datos del 3B Report
    console.log('--- 10. Extrayendo datos del 3B Report ---');

    const raw3BData = await page.evaluate((sel) => {
      const data = {};

      // Función helper para obtener texto de un selector
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      // ========================================
      // CREDIT SCORES 3B
      // ========================================
      data.scores = {
        transunion: getText(sel.TRANSUNION_SCORE_3B),
        experian: getText(sel.EXPERIAN_SCORE_3B),
        equifax: getText(sel.EQUIFAX_SCORE_3B),
      };

      // ========================================
      // PERSONAL INFORMATION - Extracción programática
      // ========================================
      const extractGridData = (sectionIndex, gridIndex, bureauIndex) => {
        const sections = document.querySelectorAll('section.mt-5');
        if (sections.length <= sectionIndex) return null;

        const grids = sections[sectionIndex].querySelectorAll('div.d-grid.grid-cols-4');
        if (grids.length <= gridIndex) return null;

        const grid = grids[gridIndex];
        const bureauColumns = grid.querySelectorAll('div.d-contents');

        // bureauIndex: 1=TransUnion, 2=Experian, 3=Equifax (índice 0 son las labels)
        if (bureauColumns.length <= bureauIndex) return null;

        const cells = bureauColumns[bureauIndex].querySelectorAll('p.grid-cell');
        return Array.from(cells)
          .slice(1) // Skip header row
          .map((cell) => cell.textContent.trim());
      };

      // Personal Information está en la primera sección (index 0), primer grid (index 0)
      const tuPersonal = extractGridData(0, 0, 1); // TransUnion
      const expPersonal = extractGridData(0, 0, 2); // Experian
      const eqfPersonal = extractGridData(0, 0, 3); // Equifax

      data.personalInfo = {
        transunion: {
          reportDate: tuPersonal?.[0] || null,
          name: tuPersonal?.[1] || null,
          dob: tuPersonal?.[2] || null,
          currentAddress: tuPersonal?.[3] || null,
          previousAddress: tuPersonal?.[4] || null,
          employer: tuPersonal?.[5] || null,
        },
        experian: {
          reportDate: expPersonal?.[0] || null,
          name: expPersonal?.[1] || null,
          dob: expPersonal?.[2] || null,
          currentAddress: expPersonal?.[3] || null,
          previousAddress: expPersonal?.[4] || null,
          employer: expPersonal?.[5] || null,
        },
        equifax: {
          reportDate: eqfPersonal?.[0] || null,
          name: eqfPersonal?.[1] || null,
          dob: eqfPersonal?.[2] || null,
          currentAddress: eqfPersonal?.[3] || null,
          previousAddress: eqfPersonal?.[4] || null,
          employer: eqfPersonal?.[5] || null,
        },
      };

      // ========================================
      // SUMMARY - Extracción programática
      // ========================================
      // Summary está en la segunda sección (index 1), primer grid (index 0)
      const tuSummary = extractGridData(1, 0, 1); // TransUnion
      const expSummary = extractGridData(1, 0, 2); // Experian
      const eqfSummary = extractGridData(1, 0, 3); // Equifax

      data.summary = {
        transunion: {
          totalAccounts: tuSummary?.[0] || null,
          openAccounts: tuSummary?.[1] || null,
          closedAccounts: tuSummary?.[2] || null,
          delinquent: tuSummary?.[3] || null,
          derogatory: tuSummary?.[4] || null,
          balances: tuSummary?.[5] || null,
          payments: tuSummary?.[6] || null,
          publicRecords: tuSummary?.[7] || null,
          inquiries: tuSummary?.[8] || null,
        },
        experian: {
          totalAccounts: expSummary?.[0] || null,
          openAccounts: expSummary?.[1] || null,
          closedAccounts: expSummary?.[2] || null,
          delinquent: expSummary?.[3] || null,
          derogatory: expSummary?.[4] || null,
          balances: expSummary?.[5] || null,
          payments: expSummary?.[6] || null,
          publicRecords: expSummary?.[7] || null,
          inquiries: expSummary?.[8] || null,
        },
        equifax: {
          totalAccounts: eqfSummary?.[0] || null,
          openAccounts: eqfSummary?.[1] || null,
          closedAccounts: eqfSummary?.[2] || null,
          delinquent: eqfSummary?.[3] || null,
          derogatory: eqfSummary?.[4] || null,
          balances: eqfSummary?.[5] || null,
          payments: eqfSummary?.[6] || null,
          publicRecords: eqfSummary?.[7] || null,
          inquiries: eqfSummary?.[8] || null,
        },
      };

      return data;
    }, selectors);

    console.log('Raw 3B data extraído:', JSON.stringify(raw3BData, null, 2));
    console.log('✓ Datos extraídos del DOM\n');

    // PASO 11: Parsear datos del 3B Report
    console.log('--- 11. Parseando datos del 3B Report ---');

    // Parsear credit scores
    const scores3B = parse3BScores(raw3BData.scores);
    console.log('Credit Scores 3B:', scores3B);

    // Parsear personal information
    const personalInfo3B = parse3BPersonalInfo(raw3BData.personalInfo);
    console.log('Personal Information parsed');

    // Parsear summary
    const summary3B = parse3BSummary(raw3BData.summary);
    console.log('Summary parsed');

    // Construir objeto final del 3B Report
    const report3BData = {
      scores: scores3B,
      personalInfo: personalInfo3B,
      summary: summary3B,
    };

    // Construir reporte completo (sin datos del dashboard por ahora)
    const creditData = buildFullCreditReport({ credit_score_info: null }, report3BData);

    console.log('✓ Datos parseados correctamente\n');

    // PASO 12: Guardar resultado en JSON
    console.log('--- 12. Guardando resultado ---');
    const outputDir = path.join(__dirname, 'output');
    const outputFile = path.join(outputDir, 'credit_report_3b.json');

    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(creditData, null, 2), 'utf-8');
    console.log(`✓ Datos guardados en: ${outputFile}\n`);

    // Mostrar resultado
    console.log('==============================================');
    console.log('  RESULTADO 3B REPORT:');
    console.log('==============================================');
    console.log(JSON.stringify(creditData, null, 2));
    console.log('\n==============================================');
    console.log('  ✓ Scraping del 3B Report completado exitosamente');
    console.log('==============================================\n');

    // Pequeña pausa antes de cerrar (para ver resultado en navegador)
    await new Promise((r) => setTimeout(r, 5000));
  } catch (error) {
    console.error('\n❌ ERROR durante el scraping:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);

    // Tomar screenshot si hay error
    if (browser) {
      try {
        const page = (await browser.pages())[0];
        const screenshotPath = path.join(__dirname, 'output', 'error_screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`\n📸 Screenshot guardado en: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('No se pudo tomar screenshot:', screenshotError.message);
      }
    }
  } finally {
    // Cerrar navegador
    if (browser) {
      console.log('\n--- Cerrando navegador ---');
      await browser.close();
      console.log('✓ Navegador cerrado\n');
    }
  }
}

// Ejecutar scraper
scrapeCreditScore();
