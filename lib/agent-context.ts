import { getBrand, type Brand } from './brand';
import { readText, removeKey, writeText } from './local-store';

/**
 * Contexto editable del agente: el ICP, el tono, los temas y lo que no se toca.
 *
 * El contenido por defecto se construye desde la marca activa, así que al
 * cambiar la configuración de marca el contexto inicial cambia con ella. Lo que
 * el analista edita desde la pantalla de configuración vive en su navegador y
 * manda sobre el valor por defecto.
 */

const KEY = 'cm_agent_context';

export function buildDefaultContext(brand: Brand = getBrand()): string {
  return `# ICP (Cliente Ideal)
- A quién le hablamos: ${brand.audience}
- Sector: ${brand.sector}
- Dolor principal: pérdida de mercancía, incertidumbre en ruta, incumplimiento con su cliente final
- Motivación: proteger la operación, cumplir con clientes, evitar penalizaciones

# Tono y estilo
- Directo y profesional, sin ser frío
- Frases cortas y contundentes
- Habla al dolor del cliente, no al producto
- Sin humor, sin política, sin temas ajenos al sector
- Máximo 1 emoji por post

# Temas prioritarios
- ${brand.coreService}
- Riesgo y pérdida de mercancía
- Cadena de frío y mercancía sensible
- Coyuntura: temporadas de alto volumen y alto riesgo
- Diferenciadores de ${brand.name}: tecnología, equipo, metodología

# Temas prohibidos
- Motivación genérica
- Mencionar competidores
- Estadísticas sin fuente verificable
- Contenido político

# Ejemplos de posts buenos
(Pega aquí ejemplos de posts que hayan funcionado bien)

# Contexto semanal
(Notas temporales: "esta semana hay temporada alta", "evitar X tema", etc.)`;
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
