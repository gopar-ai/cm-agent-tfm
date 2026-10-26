/**
 * Identidad de la marca para la que trabaja el agente.
 *
 * El agente no sabe de ninguna marca en concreto: toda la identidad entra por
 * aquí, desde variables de entorno, con una marca ficticia de ejemplo por
 * defecto. Cambiar de marca es cambiar configuración, nunca código (RNF-10).
 */

export type Brand = {
  /** Nombre comercial, tal como debe aparecer en los textos. */
  name: string;
  /** Una línea: qué hace la empresa y en qué mercado. */
  description: string;
  /** Servicio principal sobre el que gira el contenido. */
  coreService: string;
  /** Sitio web público. */
  website: string;
  /** A quién le habla el contenido. */
  audience: string;
  /** Sector, usado para orientar la búsqueda de noticias. */
  sector: string;
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
  return {
    name: fromEnv('NEXT_PUBLIC_BRAND_NAME', DEMO_BRAND.name),
    description: fromEnv('NEXT_PUBLIC_BRAND_DESCRIPTION', DEMO_BRAND.description),
    coreService: fromEnv('NEXT_PUBLIC_BRAND_CORE_SERVICE', DEMO_BRAND.coreService),
    website: fromEnv('NEXT_PUBLIC_BRAND_WEBSITE', DEMO_BRAND.website),
    audience: fromEnv('NEXT_PUBLIC_BRAND_AUDIENCE', DEMO_BRAND.audience),
    sector: fromEnv('NEXT_PUBLIC_BRAND_SECTOR', DEMO_BRAND.sector),
  };
}

/** Presentación de la marca que se inyecta en el prompt del sistema. */
export function buildBrandBriefing(brand: Brand): string {
  return `${brand.name}: ${brand.description}. Servicio core: ${brand.coreService}. Sitio: ${brand.website}. Cliente objetivo: ${brand.audience}.`;
}
