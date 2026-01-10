/**
 * SmartCredit Scraper - API Server Mode
 *
 * Servidor Express que expone endpoint REST para extraer datos de credit score.
 * Endpoint: GET /api/sync
 *
 * Modo: headless:true (sin GUI, ideal para producción/VPS)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
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

// Importar rutas de autenticación
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

// Configuración
const SMARTCREDIT_URL = 'https://www.smartcredit.com/?PID=56032';
const LOGIN_URL = 'https://www.smartcredit.com/login/';
const DASHBOARD_URL = 'https://www.smartcredit.com/member/';

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de autenticación (sin protección)
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'smartcredit-scraper', timestamp: new Date().toISOString() });
});

// Main scraping endpoint - Ahora requiere autenticación
app.post('/api/sync', authenticateToken, async (req, res) => {
  let browser = null;

  try {
    console.log('\n========================================');
    console.log('  Iniciando scraping de SmartCredit');
    console.log('========================================');

    // Obtener credenciales del cuerpo de la request
    const { smartcreditEmail, smartcreditPassword } = req.body;

    if (!smartcreditEmail || !smartcreditPassword) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren credenciales de SmartCredit',
        message: 'Por favor proporciona smartcreditEmail y smartcreditPassword en el cuerpo de la petición'
      });
    }

    console.log(`✓ Usuario autenticado: ${req.user.email}`);

    // Iniciar navegador en modo headless
    console.log('→ Iniciando navegador (headless mode)...');
    browser = await puppeteer.launch({
      headless: true, // Sin GUI para producción
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    console.log('✓ Navegador iniciado');

    // Navegar a página principal
    console.log('→ Navegando a SmartCredit.com...');
    await page.goto(SMARTCREDIT_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Página cargada');

    // Click en botón "Log In"
    console.log('→ Buscando botón de login...');
    try {
      await page.waitForSelector(selectors.LOGIN_BUTTON, { timeout: 10000 });
      await page.click(selectors.LOGIN_BUTTON);
      console.log('✓ Click en "Log In"');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (error) {
      console.log('! Asumiendo que ya estamos en /login/');
    }

    // Esperar formulario de login
    console.log('→ Esperando formulario de login...');
    await page.waitForSelector(selectors.EMAIL_INPUT, { timeout: 10000 });
    await page.waitForSelector(selectors.PASSWORD_INPUT, { timeout: 10000 });
    console.log('✓ Formulario detectado');

    // Ingresar credenciales
    console.log('→ Ingresando credenciales...');
    await page.type(selectors.EMAIL_INPUT, smartcreditEmail, { delay: 50 });
    await page.type(selectors.PASSWORD_INPUT, smartcreditPassword, { delay: 50 });
    console.log('✓ Credenciales ingresadas');

    // Submit login
    console.log('→ Enviando formulario de login...');
    await page.click(selectors.SUBMIT_BUTTON);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Formulario enviado');

    // Verificar login exitoso
    const currentUrl = page.url();
    console.log(`→ URL actual: ${currentUrl}`);

    if (!currentUrl.includes('/member/')) {
      throw new Error('Login falló - No se redirigió al dashboard');
    }
    console.log('✓ Login exitoso');

    // Navegar al 3B Report
    console.log('→ Navegando al 3B Report...');

    // Click en dropdown "Reports"
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
    await new Promise((r) => setTimeout(r, 2000));

    // Click en "3B Report & Scores"
    const report3BLinkFound = await page.evaluate(() => {
      let link = document.querySelector('a[href="/member/credit-report/smart-3b/"]');

      if (!link) {
        const allLinks = Array.from(document.querySelectorAll('a'));
        link = allLinks.find(a => a.href.includes('smart-3b'));
      }

      if (!link) {
        const allLinks = Array.from(document.querySelectorAll('a'));
        link = allLinks.find(a => a.textContent.includes('3B Report'));
      }

      if (link) {
        link.click();
        return true;
      }

      return false;
    });

    if (!report3BLinkFound) {
      throw new Error('No se encontró el link "3B Report & Scores"');
    }

    console.log('✓ Click en "3B Report & Scores"');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // Esperar y hacer click en "Switch to Classic View"
    await new Promise((r) => setTimeout(r, 3000));

    const classicViewButtonInfo = await page.evaluate((selector) => {
      let buttons = Array.from(document.querySelectorAll(selector));
      let classicButton = buttons.find((btn) => btn.textContent.includes('Switch to Classic View'));

      if (!classicButton) {
        buttons = Array.from(document.querySelectorAll('button'));
        classicButton = buttons.find((btn) => btn.textContent.includes('Classic'));
      }

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

    if (classicViewButtonInfo.found) {
      console.log(`✓ Click en "${classicViewButtonInfo.text}"`);
      await new Promise((r) => setTimeout(r, 5000));
    }

    console.log('✓ Navegación al 3B Report completada');

    // Esperar que cargue el reporte 3B
    console.log('→ Esperando datos del 3B Report...');
    await page.waitForSelector(selectors.CREDIT_SCORE_3B_SECTION, { timeout: 15000 });
    console.log('✓ Sección de credit scores 3B detectada');

    // Espera adicional para contenido dinámico
    await new Promise((r) => setTimeout(r, 3000));

    // Extraer datos del 3B Report
    console.log('→ Extrayendo datos del 3B Report...');
    const raw3BData = await page.evaluate((sel) => {
      const data = {};

      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      // Credit Scores 3B
      data.scores = {
        transunion: getText(sel.TRANSUNION_SCORE_3B),
        experian: getText(sel.EXPERIAN_SCORE_3B),
        equifax: getText(sel.EQUIFAX_SCORE_3B),
      };

      // Personal Information - Extracción programática
      const extractGridData = (sectionIndex, gridIndex, bureauIndex) => {
        const sections = document.querySelectorAll('section.mt-5');
        if (sections.length <= sectionIndex) return null;

        const grids = sections[sectionIndex].querySelectorAll('div.d-grid.grid-cols-4');
        if (grids.length <= gridIndex) return null;

        const grid = grids[gridIndex];
        const bureauColumns = grid.querySelectorAll('div.d-contents');

        if (bureauColumns.length <= bureauIndex) return null;

        const cells = bureauColumns[bureauIndex].querySelectorAll('p.grid-cell');
        return Array.from(cells)
          .slice(1)
          .map((cell) => cell.textContent.trim());
      };

      const tuPersonal = extractGridData(0, 0, 1);
      const expPersonal = extractGridData(0, 0, 2);
      const eqfPersonal = extractGridData(0, 0, 3);

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

      // Summary
      const tuSummary = extractGridData(1, 0, 1);
      const expSummary = extractGridData(1, 0, 2);
      const eqfSummary = extractGridData(1, 0, 3);

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

    console.log('✓ Datos extraídos del 3B Report');

    // Parsear datos del 3B Report
    console.log('→ Parseando datos del 3B Report...');

    const scores3B = parse3BScores(raw3BData.scores);
    const personalInfo3B = parse3BPersonalInfo(raw3BData.personalInfo);
    const summary3B = parse3BSummary(raw3BData.summary);

    const report3BData = {
      scores: scores3B,
      personalInfo: personalInfo3B,
      summary: summary3B,
    };

    const creditData = buildFullCreditReport({ credit_score_info: null }, report3BData);

    console.log('✓ Datos parseados');
    console.log('========================================');
    console.log('  Scraping completado exitosamente');
    console.log('========================================\n');

    // Cerrar navegador
    await browser.close();
    browser = null;

    // Enviar respuesta
    res.json({
      success: true,
      data: creditData,
    });
  } catch (error) {
    console.error('\n❌ ERROR durante el scraping:');
    console.error(error.message);
    console.error(error.stack);

    // Cerrar navegador si hay error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error al cerrar navegador:', closeError.message);
      }
    }

    // Enviar respuesta de error
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      '/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/update-credentials',
      '/api/sync (POST - requiere autenticación)'
    ],
  });
});

// Función para verificar si un puerto está disponible
async function isPortAvailable(port) {
  const net = require('net');

  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

// Función para encontrar puerto disponible
async function findAvailablePort(startPort, maxAttempts = 10) {
  const checkedPorts = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    checkedPorts.push(port);

    const available = await isPortAvailable(port);

    if (available) {
      if (attempt > 0) {
        console.log(`   Puertos ocupados probados: ${checkedPorts.slice(0, -1).join(', ')}`);
      }
      return port;
    }
  }

  console.error(`   Todos los puertos probados están ocupados: ${checkedPorts.join(', ')}`);
  return null;
}

// Iniciar servidor con manejo inteligente de puertos
async function startServer() {
  const requestedPort = PORT;

  // Intentar encontrar un puerto disponible
  const availablePort = await findAvailablePort(requestedPort);

  if (!availablePort) {
    console.error('\n❌ ERROR: No se pudo encontrar un puerto disponible');
    console.error(`   Intenté desde el puerto ${requestedPort} hasta ${requestedPort + 9}`);
    console.error('   Por favor libera algún puerto o especifica uno diferente en .env');
    process.exit(1);
  }

  // Mostrar advertencia si el puerto cambió
  if (availablePort !== requestedPort) {
    console.warn('\n⚠️  ADVERTENCIA: El puerto solicitado está ocupado');
    console.warn(`   Puerto solicitado: ${requestedPort}`);
    console.warn(`   Puerto asignado: ${availablePort}`);
    console.warn(`   Para usar un puerto específico, libéralo o cambia PORT en .env\n`);
  }

  // Crear servidor
  const server = app.listen(availablePort, () => {
    console.log('\n==============================================');
    console.log('  SmartCredit Scraper - API Server');
    console.log('==============================================');
    console.log(`  Servidor corriendo en: http://localhost:${availablePort}`);
    console.log(`  Health check: http://localhost:${availablePort}/health`);
    console.log(`  Scraping endpoint: http://localhost:${availablePort}/api/sync`);
    console.log('==============================================\n');
  });

  // Manejar errores del servidor
  server.on('error', (err) => {
    console.error('\n❌ ERROR del servidor:');
    console.error(err.message);

    if (err.code === 'EADDRINUSE') {
      console.error(`   El puerto ${availablePort} está ocupado`);
      console.error('   Esto no debería ocurrir. Reinicia el servidor.');
    }

    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nCerrando servidor...');
    server.close(() => {
      console.log('✓ Servidor cerrado correctamente');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n\nCerrando servidor...');
    server.close(() => {
      console.log('✓ Servidor cerrado correctamente');
      process.exit(0);
    });
  });
}

// Iniciar el servidor
startServer().catch((err) => {
  console.error('\n❌ ERROR al iniciar servidor:');
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
