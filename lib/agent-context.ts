import { getBrand, type Brand } from './brand';
import { readText, removeKey, writeText } from './local-store';

/**
 * Contexto editable del agente: el ICP, el tono, los temas y lo que no se toca.
 *
 * **Todo el contenido sale de la marca activa.** La primera versión tenía el
 * dolor del cliente y los temas escritos a mano: al cambiar de marca quedaba un
 * híbrido —audiencia de un sector y dolores de otro— que el analista veía en la
 * pantalla de configuración. Si algo describe al cliente, va en `lib/brand.ts`,
 * que es configuración, y nunca aquí.
 *
 * Lo que el analista edita vive en su navegador y manda sobre este valor.
 */

const KEY = 'cm_agent_context';

export function buildDefaultContext(brand: Brand = getBrand()): string {
  return `# ICP (Cliente Ideal)
- A quién le hablamos: ${brand.audience}
- Sector: ${brand.sector}
- Dolor principal: ${brand.pain}
- Motivación: ${brand.motivation}

# Tono y estilo
- Directo y profesional, sin ser frío
- Frases cortas y contundentes
- Habla al dolor del cliente, no al producto
- Sin humor, sin política, sin temas ajenos al sector
- Máximo 1 emoji por post

# Temas prioritarios
- ${brand.coreService}
${brand.topics.map((tema) => `- ${tema}`).join('\n')}
- Diferenciadores de ${brand.name}: producto, equipo, método

# Temas prohibidos
- Motivación genérica
- Mencionar competidores
- Estadísticas sin fuente verificable
- Contenido político

# Ejemplos de posts buenos
(Pega aquí ejemplos de posts que hayan funcionado bien)

# Contexto semanal
(Notas temporales: "esta semana lanzamos X", "evitar Y tema", etc.)`;
}

/** Contexto por defecto de la marca activa. */
export const DEFAULT_CONTEXT = buildDefaultContext();

export function getAgentContext(): string {
  return readText(KEY) ?? buildDefaultContext();
}

export function hasStoredAgentContext(): boolean {
  return readText(KEY) !== null;
}

export function saveAgentContext(content: string): void {
  writeText(KEY, content);
}

export function resetAgentContext(): void {
  removeKey(KEY);
}
