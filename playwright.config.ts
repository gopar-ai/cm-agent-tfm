import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de punta a punta.
 *
 * Levantan la aplicación en modo de demostración (`DEMO_MODE=true`), así que no
 * llaman a ninguna API externa, no gastan tokens y dan siempre el mismo
 * resultado. Recorren lo que de verdad no puede romperse: entrar, conversar con
 * el agente y pasar una propuesta al calendario.
 */

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
  },

  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // La app se usa también desde el celular: el recorrido tiene que funcionar
    // en una pantalla angosta.
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'npm run start:e2e',
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: 'production',
      DEMO_MODE: 'true',
      APP_USERNAME: 'demo',
      APP_PASSWORD: 'demo1234',
      JWT_SECRET: 'secreto-solo-para-pruebas-de-punta-a-punta-0001',
      NEXT_PUBLIC_DEMO_HINT: 'Acceso de prueba: demo / demo1234',
      // La suite entera conversa con el mismo usuario, así que en pocos
      // segundos hace más peticiones que una persona en un minuto. El límite
      // real (10 por minuto) tiene sus propias pruebas en tests/api; aquí se
      // levanta para no estar midiendo el límite en vez del recorrido.
      CHAT_MAX_PER_MINUTE: '500',
    },
  },
});
