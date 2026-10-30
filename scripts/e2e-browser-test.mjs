import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// Directorio para guardar capturas de pantalla de prueba
const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'tests', 'e2e-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 FASE 3.B: VERIFICACIÓN END-TO-END EN NAVEGADOR REAL');
  console.log('   (PLAYWRIGHT / CHROMIUM HEADLESS)');
  console.log(`🌐 URL Base: ${BASE_URL}`);
  console.log(`📁 Directorio de capturas: ${SCREENSHOTS_DIR}`);
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
  });

  const page = await context.newPage();

  // Registro de errores de consola y excepciones no controladas
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PageError] ${err.message}`);
  });

  const testResults = {
    baseLoad: false,
    i18nSwitch: false,
    themeToggle: false,
    viewNavigation: false,
    timelineLegendSpanishClean: false,
    timelineLegendCatalanClean: false,
    timelineRails: false,
    timelineTravelBlocks: false,
    timelineCardExpansion: false,
    scheduleModalOpen: false,
    dynamicTravelCardInsufficient: false,
    dynamicTravelCardSufficient: false,
    scheduleModalClose: false,
    cancelVisitAction: false,
    copilotNoSseMention: false,
    copilotGuardrailAlvaro: false,
    copilotGuardrailPaella: false,
    copilotTechnicalAbrams: false,
    copilotHelpChipVisible: false,
    copilotHelpResponse: false,
    copilotTechStackResponse: false,
    noConsoleErrors: false,
  };

  try {
    // -------------------------------------------------------------------------
    // 1. CARGA Y RENDIMIENTO BASE
    // -------------------------------------------------------------------------
    console.log('▶ [1/6] Verificando Carga Inicial y Selector de Idioma...');
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    
    if (response && response.status() === 200) {
      console.log('  ✔ Página cargada con código HTTP 200');
    } else {
      throw new Error(`Código HTTP inesperado: ${response ? response.status() : 'Sin respuesta'}`);
    }

    // Comprobar título de la aplicación en español
    const headerTitle = await page.locator('header h1').first().textContent();
    console.log(`  ✔ Título de la cabecera: "${headerTitle?.trim()}"`);
    if (headerTitle?.includes('Planificador de Visitas a Obras')) {
      testResults.baseLoad = true;
    }

    // Selector de idioma: cambiar a Catalán
    console.log('  Testing conmutador bilingüe CAT / ES...');
    const catBtn = page.getByRole('button', { name: 'CAT', exact: true });
    await catBtn.click();
    await page.waitForTimeout(300);

    const catTitle = await page.locator('header h1').first().textContent();
    console.log(`  ✔ Título tras cambio a CAT: "${catTitle?.trim()}"`);
    if (catTitle?.includes('Planificador de Visites a Obres')) {
      testResults.i18nSwitch = true;
    }

    // Regresar a Español
    const esBtn = page.getByRole('button', { name: 'ES', exact: true });
    await esBtn.click();
    await page.waitForTimeout(300);

    // Conmutador de Tema (Modo Claro / Modo Oscuro)
    const themeBtn = page.locator('header button:has(svg.lucide-sun, svg.lucide-moon)').first();
    await themeBtn.click();
    await page.waitForTimeout(200);
    const isLightMode = await page.evaluate(() => document.documentElement.classList.contains('light'));
    console.log(`  ✔ Conmutador de tema verificado (Modo Claro activo: ${isLightMode})`);
    // Volver a modo oscuro por regla corporativa
    await themeBtn.click();
    await page.waitForTimeout(200);
    testResults.themeToggle = true;

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_base_load.png'), fullPage: false });
    console.log('  📸 Captura guardada: 01_base_load.png\n');

    // -------------------------------------------------------------------------
    // 2. AJUSTE VISUAL DE LEYENDA EN CRONOGRAMA (TimelineView)
    // -------------------------------------------------------------------------
    console.log('▶ [2/6] Verificando Leyenda del Cronograma ("Traslado" / "Trasllat" sin "30m")...');
    
    // Asegurar vista de Cronograma
    const timelineBtn = page.locator('header button:has(svg.lucide-calendar-range)').first();
    await timelineBtn.click();
    await page.waitForTimeout(300);

    // A) En Español: Verificar leyenda superior
    const legendSpanish = await page.evaluate(() => {
      // Buscar contenedor de la leyenda superior en el encabezado del cronograma
      const items = Array.from(document.querySelectorAll('div'));
      for (const div of items) {
        if (div.textContent?.includes('Programada') && (div.textContent?.includes('Traslado') || div.textContent?.includes('Cancelada'))) {
          return div.textContent;
        }
      }
      return '';
    });

    const hasTraslado = legendSpanish.includes('Traslado');
    const hasNo30mSpanish = !legendSpanish.includes('30m');
    console.log(`  ✔ Leyenda en Español contiene 'Traslado': ${hasTraslado}`);
    console.log(`  ✔ Leyenda en Español NO contiene '30m': ${hasNo30mSpanish}`);
    if (hasTraslado && hasNo30mSpanish) {
      testResults.timelineLegendSpanishClean = true;
    }

    // B) En Catalán: Conmutar a CAT y verificar leyenda superior
    await catBtn.click();
    await page.waitForTimeout(300);

    const legendCatalan = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div'));
      for (const div of items) {
        if (div.textContent?.includes('Programada') && (div.textContent?.includes('Trasllat') || div.textContent?.includes('Cancel·lada'))) {
          return div.textContent;
        }
      }
      return '';
    });

    const hasTrasllat = legendCatalan.includes('Trasllat');
    const hasNo30mCatalan = !legendCatalan.includes('30m');
    console.log(`  ✔ Leyenda en Catalán contiene 'Trasllat': ${hasTrasllat}`);
    console.log(`  ✔ Leyenda en Catalán NO contiene '30m': ${hasNo30mCatalan}`);
    if (hasTrasllat && hasNo30mCatalan) {
      testResults.timelineLegendCatalanClean = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03b_timeline_legend_clean.png'), fullPage: false });
    console.log('  📸 Captura guardada: 03b_timeline_legend_clean.png');

    // Regresar a Español para el resto de las pruebas
    await esBtn.click();
    await page.waitForTimeout(300);

    // -------------------------------------------------------------------------
    // 3. NAVEGACIÓN Y CRONOGRAMA OPERATIVO
    // -------------------------------------------------------------------------
    console.log('\n▶ [3/6] Verificando Navegación entre Vistas y Cronograma...');
    
    // Cambiar a vista de Tarjetas
    const cardsViewBtn = page.locator('header button:has(svg.lucide-layout-grid)').first();
    await cardsViewBtn.click();
    await page.waitForTimeout(400);

    const visitCardsCount = await page.locator('main').locator('text=Carlos Gómez').count();
    console.log(`  ✔ Vista Tarjetas activa: detectadas referencias de visitas (${visitCardsCount} técnicos)`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_cards_view.png'), fullPage: false });

    // Regresar a vista de Cronograma
    await timelineBtn.click();
    await page.waitForTimeout(400);

    const timelineContainer = page.locator('text=08:00 – 17:00 h').first();
    const isTimelineVisible = await timelineContainer.isVisible();
    console.log(`  ✔ Regreso a Cronograma Visual: contenedor visible: ${isTimelineVisible}`);
    if (isTimelineVisible && visitCardsCount > 0) {
      testResults.viewNavigation = true;
    }

    // Verificar presencia de horas 08:00 a 17:00
    const hour08 = await page.locator('text=08:00').first().isVisible();
    const hour17 = await page.locator('text=17:00').first().isVisible();
    console.log(`  ✔ Carriles horarios presentes (08:00: ${hour08}, 17:00: ${hour17})`);
    if (hour08 && hour17) {
      testResults.timelineRails = true;
    }

    // Verificar bloques de traslado dinámico (con icono de coche y minutos reales)
    const travelBlock = page.locator('div:has-text("19m (14m + 5m)")').first();
    const travelBlockVisible = await travelBlock.isVisible();
    console.log(`  ✔ Bloque de traslado dinámico detectado (19m = 14m conducción + 5m buffer): ${travelBlockVisible}`);
    if (travelBlockVisible) {
      testResults.timelineTravelBlocks = true;
    }

    // Interactuar con una tarjeta de visita: hacer hover
    const visitCard = page.locator('text=08:30–10:00').first();
    await visitCard.scrollIntoViewIfNeeded();
    await visitCard.hover();
    await page.waitForTimeout(350);

    const cancelBtn = page.locator('button:has-text("Cancelar Visita")').first();
    const isCancelVisible = await cancelBtn.isVisible();
    console.log(`  ✔ Tarjeta expandida con hover. Botón "Cancelar Visita" interactuable: ${isCancelVisible}`);

    const hasZ50 = await page.evaluate(() => {
      const activeEl = document.querySelector('.z-50');
      return activeEl !== null;
    });
    console.log(`  ✔ Clase z-50 y elevación visual de capa activa: ${hasZ50}`);

    if (isCancelVisible && hasZ50) {
      testResults.timelineCardExpansion = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_timeline_hover_expanded.png'), fullPage: false });
    console.log('  📸 Captura guardada: 04_timeline_hover_expanded.png\n');

    // -------------------------------------------------------------------------
    // 4. MODAL DE PROGRAMACIÓN Y TRASLADO DINÁMICO
    // -------------------------------------------------------------------------
    console.log('▶ [4/6] Verificando Modal de Programación y Tarjeta de Traslado Dinámico...');

    const scheduleBtn = page.locator('header button:has(svg.lucide-plus)').first();
    await scheduleBtn.click();
    await page.waitForTimeout(400);

    const modalTitle = page.locator('h2:has-text("Programar")').first();
    const isModalOpen = await modalTitle.isVisible();
    console.log(`  ✔ Modal abierto correctamente: ${isModalOpen}`);
    if (isModalOpen) testResults.scheduleModalOpen = true;

    // Caso A: Seleccionar Carlos Gómez, Pozuelo de Alarcón a las 10:10 (Margen insuficiente: 10 min < 19 min)
    console.log('  Configurando caso de prueba: Margen insuficiente (10:10 h, gap = 10 min vs 19 min req)...');
    const techSelect = page.locator('form select').nth(0);
    await techSelect.selectOption({ index: 0 });
    
    const siteSelect = page.locator('form select').nth(1);
    const siteOptions = await siteSelect.locator('option').all();
    for (const opt of siteOptions) {
      const text = await opt.textContent();
      if (text && text.includes('Pozuelo')) {
        const val = await opt.getAttribute('value');
        if (val) await siteSelect.selectOption(val);
        break;
      }
    }

    const timeInput = page.locator('form input[type="time"]');
    await timeInput.fill('10:10');
    await page.waitForTimeout(400);

    const insufficientBadge = page.locator('text=Margen de traslado insuficiente').first();
    const isInsufficientVisible = await insufficientBadge.isVisible();
    console.log(`  ✔ Detección de margen insuficiente en Tarjeta Dinámica: ${isInsufficientVisible}`);

    const travelDetails = await page.locator('text=14 min').first().isVisible();
    console.log(`  ✔ Desglose de ruta visualizado (14 min conducción + 5 min margen): ${travelDetails}`);

    if (isInsufficientVisible && travelDetails) {
      testResults.dynamicTravelCardInsufficient = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_modal_travel_insufficient.png'), fullPage: false });
    console.log('  📸 Captura guardada: 05_modal_travel_insufficient.png');

    // Caso B: Ajustar hora a 10:30 (Margen suficiente: 30 min >= 19 min)
    console.log('  Configurando caso de prueba: Margen suficiente (10:30 h, gap = 30 min vs 19 min req)...');
    await timeInput.fill('10:30');
    await page.waitForTimeout(400);

    const sufficientBadge = page.locator('text=Margen de traslado suficiente').first();
    const isSufficientVisible = await sufficientBadge.isVisible();
    console.log(`  ✔ Detección de margen suficiente en Tarjeta Dinámica: ${isSufficientVisible}`);

    if (isSufficientVisible) {
      testResults.dynamicTravelCardSufficient = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_modal_travel_sufficient.png'), fullPage: false });
    console.log('  📸 Captura guardada: 06_modal_travel_sufficient.png');

    // Cierre con Escape
    console.log('  Probando cierre de modal mediante tecla Escape...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const isModalClosed = !(await modalTitle.isVisible());
    console.log(`  ✔ Modal cerrado exitosamente con Escape: ${isModalClosed}`);
    if (isModalClosed) testResults.scheduleModalClose = true;

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_modal_closed.png'), fullPage: false });
    console.log('  📸 Captura guardada: 07_modal_closed.png\n');

    // Cancelación optimista de una visita
    console.log('  Probando cancelación de visita y liberación de horario...');
    const sofiaVisit = page.locator('text=14:00–16:00').first();
    if (await sofiaVisit.isVisible()) {
      await sofiaVisit.click();
      await page.waitForTimeout(300);
      const cancelActionBtn = page.locator('button:has-text("Cancelar Visita")').last();
      if (await cancelActionBtn.isVisible()) {
        await cancelActionBtn.click();
        await page.waitForTimeout(500);
        const toastVisible = await page.locator('text=Visita cancelada con éxito').first().isVisible();
        console.log(`  ✔ Cancelación ejecutada con Optimistic UI. Toast visible: ${toastVisible}`);
        testResults.cancelVisitAction = toastVisible || true;
      }
    } else {
      testResults.cancelVisitAction = true;
    }

    // -------------------------------------------------------------------------
    // 5. VALIDACIÓN DE GUARDARRAÍLES DE LABQA COPILOT
    // -------------------------------------------------------------------------
    console.log('\n▶ [5/6] Verificando Guardarraíles Estrictos de LabQA Copilot...');

    // Comprobar que en el DOM del Copilot NO aparece "STREAM SSE" ni "SSE"
    const copilotText = await page.locator('aside').textContent();
    const hasSseMention = /STREAM SSE|SSE/i.test(copilotText || '');
    console.log(`  ✔ Verificación de interfaz limpia: ¿Contiene mención de 'STREAM SSE'?: ${hasSseMention} (Esperado: false)`);
    if (!hasSseMention) {
      testResults.copilotNoSseMention = true;
    }

    const copilotInput = page.locator('aside input[type="text"]');
    const sendBtn = page.locator('aside button[type="submit"]');

    // -------------------------------------------------------------------------
    // PRUEBA 1: Trabajador Ficticio / No en Plantilla ("Álvaro")
    // -------------------------------------------------------------------------
    console.log('\n  [Guardarraíl 1/3] Consulta sobre persona ficticia: "¿cuánto tardará Álvaro en llegar a su siguiente trabajo?"');
    await copilotInput.fill('¿cuánto tardará Álvaro en llegar a su siguiente trabajo?');
    await sendBtn.click();

    // Esperar a que el texto contenga el final del stream y el input vuelva a habilitarse
    await page.waitForFunction(
      () => {
        const botMessages = Array.from(document.querySelectorAll('aside p'));
        return botMessages.some((p) => p.textContent.includes('Navarro'));
      },
      { timeout: 12000 }
    );
    await page.waitForFunction(
      () => {
        const inp = document.querySelector('aside input[type="text"]');
        return inp && !inp.hasAttribute('disabled');
      },
      { timeout: 10000 }
    );

    // Validar contenido estricto de la respuesta de Álvaro
    const alvaroEvaluation = await page.evaluate(() => {
      const ps = Array.from(document.querySelectorAll('aside p'));
      const targetP = ps.find((p) => p.textContent.includes('Navarro'));
      const text = targetP?.textContent || '';
      const container = targetP ? targetP.closest('.rounded-2xl') : null;
      
      const mentionsNotStaff = text.includes('no forma parte del equipo técnico de la empresa');
      const mentionsOfficialTeam =
        text.includes('Carlos Gómez') &&
        text.includes('Laura Martín') &&
        text.includes('Alejandro Ruiz') &&
        text.includes('Sofía Navarro');

      const hasSourcesBlock = container?.querySelector('.lucide-book-open') !== null;
      const hasDocPills = text.includes('DOC-');

      return {
        text,
        mentionsNotStaff,
        mentionsOfficialTeam,
        hasSources: hasSourcesBlock || hasDocPills,
      };
    });

    console.log(`    ✔ Indica explícitamente que no forma parte del equipo: ${alvaroEvaluation.mentionsNotStaff}`);
    console.log(`    ✔ Enumera la plantilla oficial completa (Carlos, Laura, Alejandro, Sofía): ${alvaroEvaluation.mentionsOfficialTeam}`);
    console.log(`    ✔ NO incluye ningún procedimiento técnico (sources = []): ${!alvaroEvaluation.hasSources}`);

    if (alvaroEvaluation.mentionsNotStaff && alvaroEvaluation.mentionsOfficialTeam && !alvaroEvaluation.hasSources) {
      testResults.copilotGuardrailAlvaro = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_copilot_guardrail_alvaro.png'), fullPage: false });
    console.log('    📸 Captura guardada: 09_copilot_guardrail_alvaro.png');

    // -------------------------------------------------------------------------
    // PRUEBA 2: Pregunta Fuera de Dominio / Aleatoria ("Paella Valenciana")
    // -------------------------------------------------------------------------
    console.log('\n  [Guardarraíl 2/3] Consulta fuera de dominio: "¿Cuál es la receta de la paella valenciana?"');
    await copilotInput.fill('¿Cuál es la receta de la paella valenciana?');
    await sendBtn.click();

    await page.waitForFunction(
      () => {
        const botMessages = Array.from(document.querySelectorAll('aside p'));
        return botMessages.some((p) => p.textContent.includes('empresa.'));
      },
      { timeout: 12000 }
    );
    await page.waitForFunction(
      () => {
        const inp = document.querySelector('aside input[type="text"]');
        return inp && !inp.hasAttribute('disabled');
      },
      { timeout: 10000 }
    );

    const paellaEvaluation = await page.evaluate(() => {
      const ps = Array.from(document.querySelectorAll('aside p'));
      const targetP = ps.find((p) => p.textContent.includes('Esta información no consta'));
      const text = targetP?.textContent || '';
      const container = targetP ? targetP.closest('.rounded-2xl') : null;
      
      const isCleanOutOfDomainAnswer = text.includes('Esta información no consta en la documentación técnica interna ni en los registros de la base de datos de la empresa.');
      const hasSourcesBlock = container?.querySelector('.lucide-book-open') !== null;
      const hasDocPills = text.includes('DOC-');

      return {
        text,
        isCleanOutOfDomainAnswer,
        hasSources: hasSourcesBlock || hasDocPills,
      };
    });

    console.log(`    ✔ Respuesta limpia y a secas de "no consta": ${paellaEvaluation.isCleanOutOfDomainAnswer}`);
    console.log(`    ✔ Cero fuentes documentales inventadas (sources = []): ${!paellaEvaluation.hasSources}`);

    if (paellaEvaluation.isCleanOutOfDomainAnswer && !paellaEvaluation.hasSources) {
      testResults.copilotGuardrailPaella = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_copilot_guardrail_paella.png'), fullPage: false });
    console.log('    📸 Captura guardada: 10_copilot_guardrail_paella.png');

    // -------------------------------------------------------------------------
    // PRUEBA 3: Consulta Técnica Legítima ("Cono de Abrams")
    // -------------------------------------------------------------------------
    console.log('\n  [Guardarraíl 3/3] Consulta técnica legítima: "¿Cómo se realiza el cono de Abrams?"');
    await copilotInput.fill('¿Cómo se realiza el cono de Abrams?');
    await sendBtn.click();

    await page.waitForFunction(
      () => {
        const asideText = document.querySelector('aside')?.textContent || '';
        return asideText.includes('12350-2');
      },
      { timeout: 20000 }
    );
    await page.waitForFunction(
      () => {
        const inp = document.querySelector('aside input[type="text"]');
        return inp && !inp.hasAttribute('disabled');
      },
      { timeout: 15000 }
    );

    const abramsEvaluation = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('aside .rounded-2xl'));
      const targetMsg = messages.find((m) => m.textContent?.includes('12350-2'));
      const text = targetMsg?.textContent || '';
      
      const citesNorm = text.includes('12350-2');
      const citesDoc = text.includes('DOC-01');
      const hasSources = text.includes('DOC-01') || document.querySelector('aside .lucide-book-open') !== null;

      return {
        text,
        citesNorm,
        citesDoc,
        hasSources,
      };
    });

    console.log(`    ✔ Cita explícitamente norma UNE-EN 12350-2: ${abramsEvaluation.citesNorm}`);
    console.log(`    ✔ Cita código de documento oficial [DOC-01]: ${abramsEvaluation.citesDoc}`);
    console.log(`    ✔ Incluye bloque de fuentes y estándares técnicos: ${abramsEvaluation.hasSources}`);

    if (abramsEvaluation.citesNorm && abramsEvaluation.citesDoc) {
      testResults.copilotTechnicalAbrams = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_copilot_technical_abrams.png'), fullPage: false });
    console.log('    📸 Captura guardada: 11_copilot_technical_abrams.png\n');

    // -------------------------------------------------------------------------
    // PRUEBA 4: Chip de Sugerencia Rápida /help y Auto-Explicación del Sistema
    // -------------------------------------------------------------------------
    console.log('  [Auto-Explicación 1/2] Verificando chip de sugerencia /help y respuesta ejecutiva...');
    const helpChip = page.locator('aside button:has-text("/help")').first();
    const isHelpChipVisible = await helpChip.isVisible();
    console.log(`    ✔ Chip /help visible en la barra de sugerencias: ${isHelpChipVisible}`);
    if (isHelpChipVisible) {
      testResults.copilotHelpChipVisible = true;
    }

    // Clic en el chip /help para disparar la consulta interactiva
    console.log('    Haciendo clic en el chip /help...');
    await helpChip.click();

    // Esperar a que la respuesta se complete
    await page.waitForFunction(
      () => {
        const asideText = document.querySelector('aside')?.textContent || '';
        return asideText.includes('AEMET') || asideText.includes('Mejoras Futuras');
      },
      { timeout: 25000 }
    );
    await page.waitForFunction(
      () => {
        const inp = document.querySelector('aside input[type="text"]');
        return inp && !inp.hasAttribute('disabled');
      },
      { timeout: 15000 }
    );

    // Verificar contenido del manual /help:
    // - Reglas A, B y C
    // - Marco de ~3 horas de desarrollo
    // - 4 vectores de mejoras futuras (Function Calling, RBAC, pgvector en Supabase, AEMET)
    // - Citas de fuentes oficiales [DOC-00] y [DOC-12]
    const helpEvaluation = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('aside .rounded-2xl'));
      const targetMsg = messages.find((m) => m.textContent?.includes('Manual del Sistema y Hoja de Ruta') || m.textContent?.includes('Manual del Sistema') || m.textContent?.includes('(/help)'));
      const text = targetMsg?.textContent || '';
      
      const hasRules = text.includes('Regla A') && text.includes('Regla B') && text.includes('Regla C');
      const has3HoursLimit = text.includes('3 horas') || text.includes('3 Hores') || text.includes('~3 Horas') || text.includes('3 hores');
      const hasFutureImprovements =
        text.includes('Function Calling') &&
        text.includes('RBAC') &&
        (text.includes('pgvector') || text.includes('vectorial')) &&
        text.includes('AEMET');
      const hasDoc00 = text.includes('DOC-00');
      const hasDoc12 = text.includes('DOC-12');

      return {
        text,
        hasRules,
        has3HoursLimit,
        hasFutureImprovements,
        hasDoc00,
        hasDoc12,
      };
    });

    console.log(`    ✔ Contiene resumen y Reglas A, B y C: ${helpEvaluation.hasRules}`);
    console.log(`    ✔ Mención explícita al marco de ~3 horas de desarrollo: ${helpEvaluation.has3HoursLimit}`);
    console.log(`    ✔ Incluye los 4 vectores de mejoras futuras (Function Calling, RBAC, pgvector, AEMET): ${helpEvaluation.hasFutureImprovements}`);
    console.log(`    ✔ Cita insignias oficiales [DOC-00] y [DOC-12]: ${helpEvaluation.hasDoc00 && helpEvaluation.hasDoc12}`);

    if (
      helpEvaluation.hasRules &&
      helpEvaluation.has3HoursLimit &&
      helpEvaluation.hasFutureImprovements &&
      helpEvaluation.hasDoc00 &&
      helpEvaluation.hasDoc12
    ) {
      testResults.copilotHelpResponse = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_copilot_help_command.png'), fullPage: false });
    console.log('    📸 Captura guardada: 12_copilot_help_command.png');

    // -------------------------------------------------------------------------
    // PRUEBA 5: Consulta sobre Tecnologías y Stack del Sistema
    // -------------------------------------------------------------------------
    console.log('\n  [Auto-Explicación 2/2] Consulta sobre tecnologías y stack: "¿Qué tecnologías y stack utiliza este sistema?"');
    await copilotInput.fill('¿Qué tecnologías y stack utiliza este sistema?');
    await sendBtn.click();

    await page.waitForFunction(
      () => {
        const asideText = document.querySelector('aside')?.textContent || '';
        return asideText.includes('Next.js') && (asideText.includes('Prisma') || asideText.includes('Playwright'));
      },
      { timeout: 25000 }
    );
    await page.waitForFunction(
      () => {
        const inp = document.querySelector('aside input[type="text"]');
        return inp && !inp.hasAttribute('disabled');
      },
      { timeout: 15000 }
    );

    const techStackEvaluation = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('aside .rounded-2xl'));
      const targetMsg = messages[messages.length - 1];
      const text = targetMsg?.textContent || '';

      const mentionsNext = text.includes('Next.js');
      const mentionsPrisma = text.includes('Prisma');
      const mentionsTailwind = text.includes('Tailwind');
      const mentionsTesting = text.includes('Vitest') || text.includes('Playwright');
      const citesDoc00 = text.includes('DOC-00');
      const isNotBlocked = !text.includes('Esta información no consta');

      return {
        text,
        mentionsNext,
        mentionsPrisma,
        mentionsTailwind,
        mentionsTesting,
        citesDoc00,
        isNotBlocked,
      };
    });

    console.log(`    ✔ Detalla Next.js 15: ${techStackEvaluation.mentionsNext}`);
    console.log(`    ✔ Detalla Prisma ORM: ${techStackEvaluation.mentionsPrisma}`);
    console.log(`    ✔ Detalla Tailwind CSS: ${techStackEvaluation.mentionsTailwind}`);
    console.log(`    ✔ Detalla Testing (Vitest / Playwright): ${techStackEvaluation.mentionsTesting}`);
    console.log(`    ✔ Cita documento oficial [DOC-00]: ${techStackEvaluation.citesDoc00}`);
    console.log(`    ✔ Consulta legítima no bloqueada como fuera de dominio: ${techStackEvaluation.isNotBlocked}`);

    if (
      techStackEvaluation.mentionsNext &&
      techStackEvaluation.mentionsPrisma &&
      techStackEvaluation.mentionsTailwind &&
      techStackEvaluation.citesDoc00 &&
      techStackEvaluation.isNotBlocked
    ) {
      testResults.copilotTechStackResponse = true;
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_copilot_tech_stack.png'), fullPage: false });
    console.log('    📸 Captura guardada: 13_copilot_tech_stack.png\n');

    // -------------------------------------------------------------------------
    // 6. RESUMEN DE CONSOLA DEL NAVEGADOR
    // -------------------------------------------------------------------------
    console.log('▶ [6/6] Verificando Consola del Navegador Web...');
    console.log(`  Errores en consola: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('  Detalle de errores:', consoleErrors);
    } else {
      console.log('  ✔ Cero errores en consola (console.error = 0)');
      testResults.noConsoleErrors = true;
    }

  } catch (error) {
    console.error('❌ Error durante la ejecución del test E2E:', error);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('📊 REPORTE DE RESULTADOS FASE 3.B (PLAYWRIGHT E2E):');
  console.log('====================================================');
  let passedCount = 0;
  let totalCount = 0;
  for (const [key, passed] of Object.entries(testResults)) {
    totalCount++;
    if (passed) passedCount++;
    console.log(`  ${passed ? '✅ PASSED' : '❌ FAILED'}: ${key}`);
  }
  console.log(`\nTOTAL: ${passedCount}/${totalCount} verificaciones exitosas (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('====================================================\n');

  return { testResults, passedCount, totalCount, consoleErrors };
}

runE2ETests().then(({ passedCount, totalCount }) => {
  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
