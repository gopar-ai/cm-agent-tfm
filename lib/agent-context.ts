const KEY = 'cm_agent_context';

export const DEFAULT_CONTEXT = `# ICP (Cliente Ideal)
- Cargo: Director de Logística, Gerente de Supply Chain, Responsable de Seguridad
- Industria: Manufactura, Retail, Farmacéutico, Alimentos y Bebidas, Tecnología
- Empresa: B2B, operaciones en México, flota propia o subcontratada
- Dolor principal: robo de mercancía, pérdida económica, inseguridad en rutas
- Motivación: proteger su operación, cumplir con clientes, evitar penalizaciones

# Tono y estilo
- Directo y profesional, sin ser frío
- Frases cortas y contundentes
- Habla al dolor del cliente, no al producto
- Sin humor, sin política, sin temas ajenos al sector
- Máximo 1 emoji por post

# Temas prioritarios
- Custodia de transporte de carga
- Riesgo logístico y robo de mercancía en México
- Cadena de frío (farmacéutico, alimentos)
- Coyuntura: Hot Sale, Buen Fin, temporadas de alto riesgo
- Diferenciadores de Detecta: tecnología, equipo, metodología

# Temas prohibidos
- Motivación genérica
- Mencionar competidores
- Estadísticas sin fuente verificable
- Contenido político

# Ejemplos de posts buenos
(Pega aquí ejemplos de posts que hayan funcionado bien)

# Contexto semanal
(Notas temporales: "esta semana es Hot Sale", "evitar X tema", etc.)`;

export function getAgentContext(): string {
  if (typeof window === 'undefined') return DEFAULT_CONTEXT;
  return localStorage.getItem(KEY) ?? DEFAULT_CONTEXT;
}

export function hasStoredAgentContext(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY) !== null;
}

export function saveAgentContext(content: string): void {
  localStorage.setItem(KEY, content);
}

export function resetAgentContext(): void {
  localStorage.removeItem(KEY);
}
