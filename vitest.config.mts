
import { defineConfig } from 'vitest/config';

/**
 * Configuración de las pruebas.
 *
 * Entorno `node` con un doble de navegador propio (tests/helpers/browser.ts) en
 * vez de jsdom: lo único que se necesita del navegador es `localStorage` y los
 * eventos, y un jsdom completo tardaría mucho más en arrancar para no usarse.
 *
 * Los umbrales de cobertura son los del máster y hacen fallar la suite si bajan
 * (RNF-08): así la red de seguridad no se degrada sin que nadie se entere.
 */

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['lib/news-types.ts', 'lib/anthropic-types.ts', 'lib/news-demo.ts'],
      thresholds: {
        functions: 90,
        lines: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
});
