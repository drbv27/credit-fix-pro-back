/**
 * Navigation Helpers - Utilidades para navegación y clicks interactivos en Puppeteer
 *
 * Este módulo proporciona funciones helper para facilitar:
 * - Esperas inteligentes por elementos dinámicos
 * - Clicks con retry automático
 * - Expansión de múltiples elementos
 * - Navegación robusta con manejo de errores
 */

/**
 * Espera a que un elemento esté presente en el DOM y sea visible
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} selector - Selector CSS del elemento
 * @param {number} timeout - Timeout en milisegundos (default: 10000)
 * @returns {Promise<boolean>} true si el elemento apareció, false si timeout
 */
async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, {
      visible: true,
      timeout
    });
    return true;
  } catch (error) {
    console.log(`  ⚠ Timeout esperando elemento: ${selector}`);
    return false;
  }
}

/**
 * Espera a que contenido dinámico se cargue (AJAX, etc.)
 * Usa múltiples estrategias: networkidle, timeout fijo, y verificación de elementos
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {object} options - Opciones de espera
 * @param {number} options.timeout - Timeout fijo en ms (default: 2000)
 * @param {string} options.selector - Selector opcional para verificar presencia
 * @param {boolean} options.networkIdle - Esperar a networkidle2 (default: false)
 * @returns {Promise<void>}
 */
async function waitForDynamicContent(page, options = {}) {
  const {
    timeout = 2000,
    selector = null,
    networkIdle = false
  } = options;

  try {
    // Estrategia 1: Esperar networkidle si se solicitó
    if (networkIdle) {
      console.log('  → Esperando network idle...');
      await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {
        console.log('  ⚠ Network idle timeout, continuando...');
      });
    }

    // Estrategia 2: Timeout fijo
    if (timeout > 0) {
      console.log(`  → Esperando ${timeout}ms para contenido dinámico...`);
      await new Promise(resolve => setTimeout(resolve, timeout));
    }

    // Estrategia 3: Verificar selector específico si se proporcionó
    if (selector) {
      console.log(`  → Verificando presencia de: ${selector}`);
      await waitForElement(page, selector, 5000);
    }

  } catch (error) {
    console.log('  ⚠ Error esperando contenido dinámico:', error.message);
  }
}

/**
 * Hace click en un elemento con retry automático
 * Útil para elementos que pueden no estar inmediatamente disponibles
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} selector - Selector CSS del elemento
 * @param {object} options - Opciones de click
 * @param {number} options.maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} options.retryDelay - Delay entre reintentos en ms (default: 1000)
 * @param {boolean} options.waitForNavigation - Esperar navegación después del click (default: false)
 * @returns {Promise<boolean>} true si el click fue exitoso
 */
async function clickWithRetry(page, selector, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    waitForNavigation = false
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  → Intento ${attempt}/${maxRetries}: Click en ${selector}`);

      // Esperar a que el elemento esté presente
      await page.waitForSelector(selector, { visible: true, timeout: 5000 });

      // Hacer click
      if (waitForNavigation) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
          page.click(selector)
        ]);
      } else {
        await page.click(selector);
      }

      console.log('  ✓ Click exitoso');
      return true;

    } catch (error) {
      console.log(`  ⚠ Intento ${attempt} fallido: ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`  → Esperando ${retryDelay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.log(`  ❌ Click falló después de ${maxRetries} intentos`);
  return false;
}

/**
 * Expande todos los elementos con botones "Show"/"Expand"
 * Útil para secciones colapsables como Creditor Contacts
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} buttonSelector - Selector de los botones a expandir
 * @param {object} options - Opciones de expansión
 * @param {number} options.delayBetweenClicks - Delay entre clicks en ms (default: 500)
 * @param {number} options.maxElements - Máximo número de elementos a expandir (default: 100)
 * @returns {Promise<number>} Número de elementos expandidos
 */
async function expandAllElements(page, buttonSelector, options = {}) {
  const {
    delayBetweenClicks = 500,
    maxElements = 100
  } = options;

  try {
    console.log(`→ Expandiendo todos los elementos: ${buttonSelector}`);

    const expandedCount = await page.evaluate((selector, maxCount) => {
      let count = 0;
      const buttons = document.querySelectorAll(selector);

      for (let i = 0; i < Math.min(buttons.length, maxCount); i++) {
        const btn = buttons[i];
        const btnText = btn.textContent.trim().toLowerCase();

        if (btnText.includes('show') || btnText.includes('expand')) {
          btn.click();
          count++;
        }
      }

      return count;
    }, buttonSelector, maxElements);

    console.log(`  ✓ Expandidos ${expandedCount} elementos`);

    // Esperar un poco para que se despliegue el contenido
    if (expandedCount > 0) {
      const totalDelay = Math.min(expandedCount * delayBetweenClicks, 5000);
      console.log(`  → Esperando ${totalDelay}ms para contenido desplegado...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }

    return expandedCount;

  } catch (error) {
    console.error('❌ Error expandiendo elementos:', error.message);
    return 0;
  }
}

/**
 * Verifica si un elemento existe en el DOM
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} selector - Selector CSS del elemento
 * @returns {Promise<boolean>} true si el elemento existe
 */
async function elementExists(page, selector) {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Cuenta cuántos elementos coinciden con un selector
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} selector - Selector CSS
 * @returns {Promise<number>} Número de elementos encontrados
 */
async function countElements(page, selector) {
  try {
    const count = await page.evaluate((sel) => {
      return document.querySelectorAll(sel).length;
    }, selector);
    return count;
  } catch (error) {
    console.error(`❌ Error contando elementos ${selector}:`, error.message);
    return 0;
  }
}

/**
 * Scroll hacia un elemento para asegurar que esté visible
 * Útil para elementos fuera del viewport
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} selector - Selector CSS del elemento
 * @returns {Promise<boolean>} true si el scroll fue exitoso
 */
async function scrollToElement(page, selector) {
  try {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);

    // Esperar un poco para que termine el scroll
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;

  } catch (error) {
    console.error(`❌ Error haciendo scroll a ${selector}:`, error.message);
    return false;
  }
}

/**
 * Navega a una URL con retry automático
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} url - URL de destino
 * @param {object} options - Opciones de navegación
 * @param {number} options.maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} options.timeout - Timeout en ms (default: 30000)
 * @returns {Promise<boolean>} true si la navegación fue exitosa
 */
async function navigateWithRetry(page, url, options = {}) {
  const {
    maxRetries = 3,
    timeout = 30000
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`→ Navegando a ${url} (intento ${attempt}/${maxRetries})...`);

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout
      });

      console.log('  ✓ Navegación exitosa');
      return true;

    } catch (error) {
      console.log(`  ⚠ Intento ${attempt} fallido: ${error.message}`);

      if (attempt < maxRetries) {
        console.log('  → Reintentando en 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  console.log(`  ❌ Navegación falló después de ${maxRetries} intentos`);
  return false;
}

module.exports = {
  waitForElement,
  waitForDynamicContent,
  clickWithRetry,
  expandAllElements,
  elementExists,
  countElements,
  scrollToElement,
  navigateWithRetry
};
