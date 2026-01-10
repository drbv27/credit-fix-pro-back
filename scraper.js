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

// FASE 2: Importar nuevos servicios de extracción
const extractionService = require('./services/extraction-service');
const reportBuilder = require('./services/report-builder');

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

    // Estrategia multi-capa para encontrar el dropdown "Reports"
    const reportsDropdownFound = await page.evaluate(() => {
      // Estrategia 1: Buscar por texto exacto "Reports" en links con dropdown
      let reportsLink = Array.from(document.querySelectorAll('a')).find(
        el => el.textContent.trim() === 'Reports' &&
        (el.classList.contains('dropdown-toggle') || el.hasAttribute('data-toggle'))
      );

      // Estrategia 2: Buscar cualquier link que contenga "Reports"
      if (!reportsLink) {
        reportsLink = Array.from(document.querySelectorAll('a')).find(
          el => el.textContent.includes('Reports')
        );
      }

      // Estrategia 3: Buscar en elementos nav o menu
      if (!reportsLink) {
        const navElements = document.querySelectorAll('nav a, .nav a, .navbar a, [role="navigation"] a');
        reportsLink = Array.from(navElements).find(
          el => el.textContent.includes('Reports')
        );
      }

      if (reportsLink) {
        console.log('Dropdown "Reports" encontrado:', reportsLink.outerHTML.substring(0, 100));
        reportsLink.click();
        return true;
      }

      return false;
    });

    if (!reportsDropdownFound) {
      throw new Error('No se encontró el dropdown "Reports". Verifique que la página del dashboard haya cargado correctamente.');
    }

    console.log('✓ Click en dropdown "Reports"');
    await new Promise((r) => setTimeout(r, 2000)); // Más tiempo para que se despliegue el menú

    // 8.2: Click en "3B Report & Scores"
    console.log('Buscando link "3B Report & Scores"...');

    // Buscar el link con múltiples estrategias
    const report3BLinkFound = await page.evaluate(() => {
      // Estrategia 1: Buscar por href que contenga "smart-3b"
      let link = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('smart-3b'));

      // Estrategia 2: Buscar por href que contenga "3b" y "credit-report"
      if (!link) {
        link = Array.from(document.querySelectorAll('a')).find(
          a => a.href.includes('3b') && a.href.includes('credit-report')
        );
      }

      // Estrategia 3: Buscar por texto que contenga "3B Report" o "3-Bureau"
      if (!link) {
        link = Array.from(document.querySelectorAll('a')).find(
          a => a.textContent.includes('3B Report') ||
               a.textContent.includes('3-Bureau') ||
               a.textContent.includes('3B Credit')
        );
      }

      // Estrategia 4: Buscar en dropdowns desplegados (elementos visibles)
      if (!link) {
        const visibleLinks = Array.from(document.querySelectorAll('a')).filter(
          a => a.offsetParent !== null
        );
        link = visibleLinks.find(
          a => a.textContent.toLowerCase().includes('3b') ||
               a.textContent.toLowerCase().includes('bureau')
        );
      }

      if (link) {
        console.log('Link 3B Report encontrado:', link.href, '|', link.textContent.trim());
        link.click();
        return true;
      }

      // Debug: Mostrar todos los links visibles del dropdown
      const dropdownLinks = Array.from(document.querySelectorAll('a')).filter(
        a => a.offsetParent !== null && a.getBoundingClientRect().height > 0
      );
      console.log('Links visibles en dropdown:', dropdownLinks.map(a => ({
        text: a.textContent.trim(),
        href: a.href
      })));

      return false;
    });

    if (!report3BLinkFound) {
      throw new Error('No se encontró el link "3B Report & Scores". Verifique que el dropdown "Reports" se haya desplegado correctamente.');
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

    // Buscar el botón con múltiples estrategias
    const classicViewButtonInfo = await page.evaluate(() => {
      // Estrategia 1: Buscar cualquier botón que contenga "Classic"
      let classicButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('Classic')
      );

      // Estrategia 2: Buscar por texto que contenga "Switch"
      if (!classicButton) {
        classicButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('Switch')
        );
      }

      // Estrategia 3: Buscar en links (a veces los "botones" son links estilizados)
      if (!classicButton) {
        classicButton = Array.from(document.querySelectorAll('a')).find(
          link => link.textContent.includes('Classic') || link.textContent.includes('Switch')
        );
      }

      // Estrategia 4: Buscar por atributos que sugieran cambio de vista
      if (!classicButton) {
        classicButton = Array.from(document.querySelectorAll('button, a')).find(
          el => el.textContent.toLowerCase().includes('view') &&
                (el.textContent.toLowerCase().includes('classic') ||
                 el.textContent.toLowerCase().includes('switch'))
        );
      }

      if (classicButton) {
        console.log('Botón Classic View encontrado:', classicButton.textContent.trim());
        classicButton.click();
        return { found: true, text: classicButton.textContent.trim() };
      }

      // Debug: Mostrar botones disponibles
      const allButtons = Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent.trim().substring(0, 50),
        visible: btn.offsetParent !== null
      })).filter(btn => btn.visible);
      console.log('Botones visibles en la página:', allButtons);

      return { found: false, text: null };
    });

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

    // CRÍTICO: Esperar a que se rendericen TODAS las cuentas del Account History
    // Las cuentas se cargan dinámicamente via JavaScript
    console.log('Esperando a que se rendericen todas las cuentas del Account History...');

    try {
      await page.waitForFunction(
        () => {
          const accountContainers = document.querySelectorAll('div.mb-5');
          console.log(`  → Cuentas renderizadas actualmente: ${accountContainers.length}`);
          // Esperar hasta que haya al menos 20 cuentas (el summary indica 32-34 total)
          // o hasta 30 segundos como máximo
          return accountContainers.length >= 20;
        },
        { timeout: 30000, polling: 1000 }
      );

      const accountCount = await page.evaluate(() => document.querySelectorAll('div.mb-5').length);
      console.log(`✓ Detectadas ${accountCount} cuentas renderizadas en el DOM`);
    } catch (err) {
      // Si timeout, continuar con las cuentas que hayamos logrado renderizar
      const accountCount = await page.evaluate(() => document.querySelectorAll('div.mb-5').length);
      console.log(`⚠ Timeout esperando cuentas. Continuando con ${accountCount} cuentas renderizadas`);
    }

    // Debug: Guardar HTML de la página para análisis (solo en desarrollo)
    const pageHTML = await page.content();
    const outputDir = path.join(__dirname, 'output');

    // Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const htmlPath = path.join(outputDir, 'page_3b_debug.html');
    fs.writeFileSync(htmlPath, pageHTML, 'utf-8');
    console.log(`Debug: HTML guardado en ${htmlPath}`);

    // PASO 10: Extraer datos del 3B Report usando extraction-service (FASE 2 + FASE 3 + FASE 4)
    console.log('--- 10. Extrayendo datos del 3B Report (FASE 2 + FASE 3 + FASE 4) ---');

    // Usar el nuevo extraction service para extraer todas las secciones
    // FASE 3: Agregando Account History
    // FASE 4: Agregando Public Records e Inquiries
    const raw3BData = await extractionService.extractAll3BReport(page, {
      sections: ['scores', 'personalInfo', 'summary', 'accountHistory', 'publicRecords', 'inquiries'],
    });

    console.log('✓ Datos extraídos con extraction-service\n');

    // PASO 11: Construir reporte final usando report-builder (FASE 2 + FASE 3)
    console.log('--- 11. Construyendo reporte final (FASE 2 + FASE 3) ---');

    // Usar el report builder para construir el JSON final
    const creditData = reportBuilder.buildFullReport(raw3BData, {
      includeDashboard: false, // No incluir dashboard por ahora
    });

    console.log('✓ Reporte construido con report-builder\n');

    // PASO 12: Guardar resultado en JSON
    console.log('--- 12. Guardando resultado ---');
    const outputFile = path.join(outputDir, 'credit_report_3b.json');

    // El directorio ya fue creado anteriormente

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
