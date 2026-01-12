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

// MongoDB Connection
const connectDB = require('./config/database');

// Models
const User = require('./models/User');
const CreditReport = require('./models/CreditReport');

// Importar servicios de extracción (FASE 6)
const extractionService = require('./services/extraction-service'); // Ya es una instancia
const reportBuilder = require('./services/report-builder');

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

// Error classification function for scraping errors
function classifyScrapingError(error) {
  const errorMsg = error.message.toLowerCase();

  // Login/Auth errors
  if (errorMsg.includes('login falló') || errorMsg.includes('no se redirigió al dashboard')) {
    return {
      code: 'AUTH_FAILED',
      userMessage: 'Invalid SmartCredit credentials. Please update them in Settings.',
      technicalMessage: error.message
    };
  }

  // SmartCredit site errors
  if (errorMsg.includes('no se encontró') || errorMsg.includes('not found')) {
    return {
      code: 'SITE_UNAVAILABLE',
      userMessage: 'SmartCredit is temporarily unavailable. Please try again later.',
      technicalMessage: error.message
    };
  }

  // Network errors
  if (errorMsg.includes('timeout') || errorMsg.includes('econnrefused') || errorMsg.includes('network')) {
    return {
      code: 'NETWORK_ERROR',
      userMessage: 'Network error. Please check your internet connection and try again.',
      technicalMessage: error.message
    };
  }

  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    userMessage: 'An unexpected error occurred while syncing your credit report. Please try again.',
    technicalMessage: error.message
  };
}

// Main scraping endpoint - Ahora requiere autenticación
app.post('/api/sync', authenticateToken, async (req, res) => {
  let browser = null;

  try {
    console.log('\n========================================');
    console.log('  Iniciando scraping de SmartCredit');
    console.log('========================================');

    // Get user from MongoDB with SmartCredit credentials
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found in database'
      });
    }

    // Get SmartCredit credentials from user account
    const smartcreditEmail = user.smartcreditCredentials?.email;
    const smartcreditPassword = user.smartcreditCredentials?.password;

    if (!smartcreditEmail || !smartcreditPassword) {
      return res.status(400).json({
        success: false,
        error: 'SmartCredit credentials not configured',
        message: 'Please configure your SmartCredit credentials first'
      });
    }

    console.log(`✓ User authenticated: ${user.email}`);

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
    await page.goto(SMARTCREDIT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✓ Página cargada');

    // Click en botón "Log In"
    console.log('→ Buscando botón de login...');
    try {
      await page.waitForSelector(selectors.LOGIN_BUTTON, { timeout: 10000 });
      await page.click(selectors.LOGIN_BUTTON);
      console.log('✓ Click en "Log In"');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
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
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
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

    // Extraer datos del 3B Report usando extraction service (FASE 6)
    console.log('→ Extrayendo datos del 3B Report...');

    // Usar ExtractionService para extraer TODAS las secciones disponibles
    // Incluye: scores, personalInfo, summary, accountHistory (34 cuentas), publicRecords, inquiries
    const raw3BData = await extractionService.extractAll3BReport(page, {
      sections: ['scores', 'personalInfo', 'summary', 'accountHistory', 'publicRecords', 'inquiries'],
      accountHistory: {
        // Sin límite = extraer todas las cuentas disponibles
      }
    });

    console.log('✓ Datos extraídos con extraction-service');

    // Construir reporte final usando report builder (FASE 6)
    console.log('→ Construyendo reporte final...');
    const creditData = reportBuilder.buildFullReport(raw3BData, {
      includeDashboard: false
    });

    console.log('✓ Reporte construido exitosamente');

    console.log('✓ Datos parseados');

    // Save report to MongoDB
    console.log('→ Saving report to MongoDB...');
    try {
      const creditReport = new CreditReport({
        userId: req.user.id,
        reportData: creditData,
        scrapingStatus: 'completed',
        scrapingDuration: null, // Could calculate from start time
        metadata: {
          scrapedSections: ['scores', 'personalInfo', 'summary', 'accountHistory', 'publicRecords', 'inquiries'],
        },
      });

      await creditReport.save();

      // Update user's lastReportId
      await User.findByIdAndUpdate(req.user.id, {
        lastReportId: creditReport._id,
      });

      console.log(`✓ Report saved to MongoDB (ID: ${creditReport._id})`);
    } catch (dbError) {
      console.error('⚠️  Warning: Failed to save report to MongoDB:', dbError.message);
      // Continue even if DB save fails
    }

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

    // Classify error and send user-friendly response
    const errorInfo = classifyScrapingError(error);

    // Enviar respuesta de error
    res.status(500).json({
      success: false,
      error: errorInfo.code,
      message: errorInfo.userMessage,
      technicalDetails: errorInfo.technicalMessage  // For debugging
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
  // Connect to MongoDB first
  try {
    await connectDB();
  } catch (error) {
    console.error('\n❌ ERROR: Failed to connect to MongoDB');
    console.error(error.message);
    process.exit(1);
  }

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
