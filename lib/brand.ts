/**
 * Identidad de la marca para la que trabaja el agente.
 *
 * El agente no sabe de ninguna marca en concreto: toda la identidad entra por
 * aquí, desde variables de entorno, con una marca ficticia de ejemplo por
 * defecto. Cambiar de marca es cambiar configuración, nunca código (RNF-10).
 *
 * Aquí va **todo lo que describe al cliente y su mundo**: a quién se le habla,
 * qué le duele, qué le mueve y de qué temas se escribe. La primera versión
 * dejaba el dolor y los temas escritos en `agent-context.ts`, y al cambiar de
 * sector quedaba un contexto híbrido, con la audiencia de un negocio y los
 * dolores de otro.
 */

export type Brand = {
  /** Nombre comercial, tal como debe aparecer en los textos. */
  name: string;
  /** Una línea: qué hace la empresa y en qué mercado. */
  description: string;
  /** Servicio o producto principal sobre el que gira el contenido. */
  coreService: string;
  /** Sitio web público. */
  website: string;
  /** A quién le habla el contenido. */
  audience: string;
  /** Sector, usado para orientar la búsqueda de noticias. */
  sector: string;
  /** Qué le quita el sueño a esa audiencia. Es la materia prima de los ganchos. */
  pain: string;
  /** Qué busca conseguir. Es lo que da el tono de los cierres. */
  motivation: string;
  /** Temas recurrentes del sector, además del producto. */
  topics: string[];
};

/**
 * Marca ficticia de ejemplo. No corresponde a ninguna empresa real: el dominio
 * usa el TLD reservado `.example` (RFC 2606) justamente para que no apunte a
 * ningún sitio existente.
 */
export const DEMO_BRAND: Brand = {
  name: 'Vertia',
  description: 'empresa B2B de software que vende una plataforma de datos a equipos de producto',
  coreService: 'plataforma de datos en la nube, con analítica e integraciones',
  website: 'vertia.example',
  audience:
    'CTOs, líderes de producto y responsables de datos en empresas de tecnología de Latinoamérica',
  sector: 'tecnología, software y datos',
  pain: 'datos repartidos entre herramientas, decisiones tomadas a ciegas y proyectos de IA que no llegan a producción',
  motivation: 'decidir con datos de verdad, sin montar un equipo entero para mantenerlos',
  topics: [
    'IA aplicada al trabajo diario de los equipos de producto',
    'Costo y gobierno del dato: qué se guarda, quién lo consulta y qué se paga por ello',
    'Integraciones y migraciones entre herramientas',
    'Seguridad y cumplimiento en el tratamiento de datos',
    'Coyuntura: cierres de trimestre, presupuestos y temporadas de lanzamiento',
  ],
};

function fromEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

/**
 * Lee la marca activa. Las variables son `NEXT_PUBLIC_` porque la interfaz
 * también muestra el nombre, y Next solo expone al navegador las que llevan
 * ese prefijo.
 */
export function getBrand(): Brand {
  const topics = process.env.NEXT_PUBLIC_BRAND_TOPICS?.split('|')
    .map((tema) => tema.trim())
    .filter(Boolean);

  return {
    name: fromEnv('NEXT_PUBLIC_BRAND_NAME', DEMO_BRAND.name),
    description: fromEnv('NEXT_PUBLIC_BRAND_DESCRIPTION', DEMO_BRAND.description),
    coreService: fromEnv('NEXT_PUBLIC_BRAND_CORE_SERVICE', DEMO_BRAND.coreService),
    website: fromEnv('NEXT_PUBLIC_BRAND_WEBSITE', DEMO_BRAND.website),
    audience: fromEnv('NEXT_PUBLIC_BRAND_AUDIENCE', DEMO_BRAND.audience),
    sector: fromEnv('NEXT_PUBLIC_BRAND_SECTOR', DEMO_BRAND.sector),
    pain: fromEnv('NEXT_PUBLIC_BRAND_PAIN', DEMO_BRAND.pain),
    motivation: fromEnv('NEXT_PUBLIC_BRAND_MOTIVATION', DEMO_BRAND.motivation),
    topics: topics && topics.length > 0 ? topics : DEMO_BRAND.topics,
  };
}

/** Presentación de la marca que se inyecta en el prompt del sistema. */
export function buildBrandBriefing(brand: Brand): string {
  return [
    `${brand.name}: ${brand.description}.`,
    `Servicio core: ${brand.coreService}.`,
    `Sitio: ${brand.website}.`,
    `Cliente objetivo: ${brand.audience}.`,
    `Lo que le duele: ${brand.pain}.`,
    `Lo que busca: ${brand.motivation}.`,
  ].join(' ');
}
