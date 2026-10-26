import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido completo en un navegador real, con la app en modo de demostración.
 *
 * Son los tres caminos que no pueden romperse (docs/05-pruebas.md):
 *  E1 — nadie entra sin credenciales.
 *  E2 — el analista conversa con el agente y recorre las cuatro fases.
 *  E3 — una propuesta llega al calendario.
 */

const USUARIO = 'demo';
const CONTRASENA = 'demo1234';

async function entrar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(USUARIO);
  await page.getByLabel('Contraseña').fill(CONTRASENA);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('E1 · acceso', () => {
  test('sin sesión, cualquier ruta lleva al login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/login/);
  });

  test('la raíz lleva al login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('la demo publicada muestra las credenciales de prueba', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('demo-hint')).toContainText('demo');
  });

  test('con credenciales equivocadas no se entra', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Usuario').fill(USUARIO);
    await page.getByLabel('Contraseña').fill('contraseña-equivocada');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByText('Usuario o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('con las credenciales correctas se entra al panel', async ({ page }) => {
    await entrar(page);
    await expect(page.getByPlaceholder('Escribe aquí tu instrucción al agente')).toBeVisible();
  });

  test('el healthcheck responde sin sesión', async ({ request }) => {
    // Lo consulta la plataforma de despliegue, que no tiene cookie. Antes
    // redirigía al login y el servicio se daba por sano sin comprobar nada.
    const respuesta = await request.get('/api/health');

    expect(respuesta.status()).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true });
  });

  test('la respuesta lleva las cabeceras de seguridad (OWASP A05)', async ({ page }) => {
    const respuesta = await page.goto('/login');

    expect(respuesta?.headers()['x-content-type-options']).toBe('nosniff');
    expect(respuesta?.headers()['x-frame-options']).toBe('DENY');
    expect(respuesta?.headers()['content-security-policy']).toContain("default-src 'self'");
    // La cabecera que delata el framework queda apagada.
    expect(respuesta?.headers()['x-powered-by']).toBeUndefined();
  });
});

test.describe('E2 · conversación con el agente', () => {
  test('al abrir una propuesta, el agente ya propone temas sin que nadie escriba', async ({
    page,
  }) => {
    // La interfaz manda sola el mensaje de arranque. Esta prueba existe porque
    // ese mensaje se reconocía mal y el agente respondía con un post.
    await entrar(page);

    await expect(page.getByRole('button', { name: /Elegir este tema/ }).first()).toBeVisible();
    expect(await page.getByRole('button', { name: /Elegir este tema/ }).count()).toBe(5);
  });

  test('recorre las cuatro fases: temas, ángulo, versiones y confirmación', async ({ page }) => {
    await entrar(page);

    // Fase 1: la lista de temas llega con el arranque automático.
    const temas = page.getByRole('button', { name: /Elegir este tema/ });
    await expect(temas.first()).toBeVisible();
    expect(await temas.count()).toBe(5);

    // Fase 2: al elegir un tema aparece el ángulo, con sus tres líneas.
    await temas.first().click();
    await expect(page.getByText('Ángulo', { exact: true })).toBeVisible();
    await expect(page.getByText('Por qué ahora')).toBeVisible();
    await expect(page.getByText('Emoción objetivo')).toBeVisible();

    // Fase 3: al elegir formato llegan las dos versiones, con sus titulares.
    await page.getByRole('button', { name: 'Copy', exact: true }).first().click();
    await expect(page.getByText('Versión A')).toBeVisible();
    await expect(page.getByText('Versión B')).toBeVisible();
    await expect(page.getByText(/Formato: Copy/)).toBeVisible();
  });

  test('la conversación queda guardada al recargar', async ({ page }) => {
    await entrar(page);
    await expect(page.getByRole('button', { name: /Elegir este tema/ }).first()).toBeVisible();

    await page.reload();

    // El historial vive en el navegador del analista: la lista de temas sigue
    // ahí tras recargar, sin volver a pedirla al agente.
    await expect(page.getByRole('button', { name: /Elegir este tema/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Propuesta 1/ })).toBeVisible();
  });
});

test.describe('E3 · calendario', () => {
  test('el logo devuelve al panel desde cualquier pantalla', async ({ page }) => {
    await entrar(page);
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);

    await page.getByRole('link', { name: 'Ir al panel principal' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByPlaceholder('Escribe aquí tu instrucción al agente')).toBeVisible();
  });

  test('el calendario se abre con sesión', async ({ page }) => {
    await entrar(page);
    await page.goto('/calendar');

    await expect(page).toHaveURL(/\/calendar/);
    // Los controles de mes están en las dos pantallas; el rótulo "Calendario"
    // se oculta en celular, así que no sirve como ancla.
    await expect(page.getByRole('button', { name: '›' })).toBeVisible();
  });
});
