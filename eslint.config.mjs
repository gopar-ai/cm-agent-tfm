import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Informes generados: no son código del proyecto.
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),

  {
    rules: {
      /**
       * `react-hooks/set-state-in-effect` marca los componentes que leen el
       * estado del analista (conversaciones, calendario, noticias guardadas) en
       * un efecto al montarse.
       *
       * Ese estado vive en `localStorage`, que no existe en el servidor: leerlo
       * al inicializar el estado rompería la hidratación, así que el efecto es
       * deliberado. La forma que React recomienda para este caso es
       * `useSyncExternalStore`, y migrar a ella está anotado como deuda técnica,
       * con su plan, en docs/03-diseno.md.
       *
       * Queda como aviso —visible en cada ejecución— en vez de error, para no
       * dar por resuelto lo que no lo está ni bloquear la integración por ello.
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  {
    // En las pruebas, un argumento sin usar suele ser parte de la firma que se
    // está imitando: basta con nombrarlo con guion bajo.
    files: ['tests/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]);

export default eslintConfig;
