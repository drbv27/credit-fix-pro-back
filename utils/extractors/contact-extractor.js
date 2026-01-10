/**
 * Contact Extractor - Extrae creditor contacts con interacción (clicks en botones "Show")
 *
 * Este módulo maneja la extracción de Creditor Contacts que requiere:
 * - Hacer click en botones "Show" para expandir detalles
 * - Esperar a que se despliegue contenido dinámico
 * - Extraer información de contacto completa
 */

/**
 * Extrae Creditor Contacts (requiere clicks interactivos)
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {object} config - Configuración del extractor (desde config/extractors.js)
 * @returns {Promise<Array<object>>} Array de contactos de acreedores
 */
async function extractCreditorContacts(page, config) {
  try {
    console.log('→ Extrayendo Creditor Contacts...');

    // Paso 1: Expandir todos los botones "Show"
    console.log('  → Expandiendo botones "Show"...');

    const expandedCount = await page.evaluate((cfg) => {
      let count = 0;
      const buttons = document.querySelectorAll(cfg.showButtonSelector);

      buttons.forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        if (btnText.includes('show')) {
          btn.click();
          count++;
        }
      });

      return count;
    }, config);

    console.log(`  ✓ Expandidos ${expandedCount} botones`);

    // Paso 2: Esperar a que se despliegue contenido
    if (expandedCount > 0) {
      console.log('  → Esperando contenido dinámico (2 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Paso 3: Extraer datos de contactos
    const contacts = await page.evaluate((cfg) => {
      const contactsArray = [];

      const contactContainers = document.querySelectorAll(cfg.contactContainerSelector);

      if (!contactContainers || contactContainers.length === 0) {
        return [];
      }

      contactContainers.forEach((container, idx) => {
        try {
          const contact = {};

          // Extraer cada campo según la configuración
          cfg.fields.forEach(field => {
            const element = container.querySelector(field.selector);
            contact[field.name] = element?.textContent.trim() || null;
          });

          // Solo agregar si tiene al menos un campo válido
          const hasData = Object.values(contact).some(value => value !== null && value !== '');

          if (hasData) {
            contactsArray.push(contact);
          }

        } catch (err) {
          console.log(`  ⚠ Error procesando contacto ${idx + 1}:`, err.message);
        }
      });

      return contactsArray;
    }, config);

    console.log(`  ✓ Extraídos ${contacts.length} contactos exitosamente`);
    return contacts;

  } catch (error) {
    console.error('❌ Error extrayendo Creditor Contacts:', error.message);
    console.error(error.stack);
    return [];
  }
}

/**
 * Extrae Creditor Contacts de forma segura (sin hacer clicks)
 * Útil para testing o cuando los botones "Show" ya están expandidos
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {object} config - Configuración del extractor
 * @returns {Promise<Array<object>>} Array de contactos de acreedores
 */
async function extractCreditorContactsSafe(page, config) {
  try {
    console.log('→ Extrayendo Creditor Contacts (modo seguro - sin clicks)...');

    const contacts = await page.evaluate((cfg) => {
      const contactsArray = [];

      const contactContainers = document.querySelectorAll(cfg.contactContainerSelector);

      if (!contactContainers || contactContainers.length === 0) {
        return [];
      }

      contactContainers.forEach((container, idx) => {
        try {
          const contact = {};

          cfg.fields.forEach(field => {
            const element = container.querySelector(field.selector);
            contact[field.name] = element?.textContent.trim() || null;
          });

          const hasData = Object.values(contact).some(value => value !== null && value !== '');

          if (hasData) {
            contactsArray.push(contact);
          }

        } catch (err) {
          console.log(`  ⚠ Error procesando contacto ${idx + 1}:`, err.message);
        }
      });

      return contactsArray;
    }, config);

    console.log(`  ✓ Extraídos ${contacts.length} contactos exitosamente`);
    return contacts;

  } catch (error) {
    console.error('❌ Error extrayendo Creditor Contacts (safe mode):', error.message);
    return [];
  }
}

/**
 * Verifica si los botones "Show" están presentes en la página
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} buttonSelector - Selector del botón "Show"
 * @returns {Promise<boolean>} true si hay botones "Show" presentes
 */
async function hasShowButtons(page, buttonSelector) {
  try {
    const count = await page.evaluate((selector) => {
      const buttons = document.querySelectorAll(selector);
      return buttons.length;
    }, buttonSelector);

    return count > 0;

  } catch (error) {
    console.error('❌ Error verificando botones "Show":', error.message);
    return false;
  }
}

/**
 * Expande un contacto específico por índice
 * Útil para expandir contactos de forma controlada
 *
 * @param {object} page - Instancia de Puppeteer page
 * @param {string} buttonSelector - Selector del botón "Show"
 * @param {number} index - Índice del contacto a expandir (0-based)
 * @returns {Promise<boolean>} true si se expandió exitosamente
 */
async function expandContactByIndex(page, buttonSelector, index) {
  try {
    const expanded = await page.evaluate((selector, idx) => {
      const buttons = document.querySelectorAll(selector);

      if (!buttons || idx >= buttons.length) {
        return false;
      }

      const button = buttons[idx];
      const btnText = button.textContent.trim().toLowerCase();

      if (btnText.includes('show')) {
        button.click();
        return true;
      }

      return false;
    }, buttonSelector, index);

    if (expanded) {
      // Esperar un poco para que se despliegue el contenido
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return expanded;

  } catch (error) {
    console.error(`❌ Error expandiendo contacto ${index}:`, error.message);
    return false;
  }
}

module.exports = {
  extractCreditorContacts,
  extractCreditorContactsSafe,
  hasShowButtons,
  expandContactByIndex
};
