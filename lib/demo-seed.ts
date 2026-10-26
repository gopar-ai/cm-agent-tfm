import { CALENDAR_KEY, type CalendarPost, PUBLISHED_KEY } from './calendar-storage';
import { newId, readJson, writeJson } from './local-store';

/**
 * Contenido de ejemplo para el calendario de la demo.
 *
 * Quien entra a evaluar la aplicación abre el calendario y, si está vacío, no
 * ve nada: ni los tres estados, ni cómo se reparte un mes de publicaciones. Con
 * la aplicación en uso real eso no pasa, porque el calendario se llena solo.
 *
 * Por eso la demo siembra unas cuantas publicaciones la primera vez. Reglas:
 *
 *  - Solo en modo de demostración.
 *  - Solo si el calendario está vacío: nunca pisa lo que haya hecho el visitante.
 *  - Una sola vez por navegador, aunque recargue o navegue entre pantallas.
 *  - Las fechas se calculan sobre el día en curso, para que el calendario se vea
 *    poblado cualquier día del año.
 */

const MARCA = 'cm_demo_sembrado';

type Plantilla = {
  /** Días respecto a hoy: negativo es pasado. */
  desplazamiento: number;
  status: CalendarPost['status'];
  titular: string;
  cuerpo: string;
  hashtags: string;
};

const PLANTILLAS: Plantilla[] = [
  {
    desplazamiento: -12,
    status: 'publicado',
    titular: 'Siete de cada diez equipos ya usan IA. ¿Con qué datos?',
    cuerpo: [
      '🤖 Siete de cada diez equipos de producto ya usan IA todos los días.',
      'La pregunta interesante no es si la usan. Es con qué datos.',
      'Adoptar IA sin saber qué entra no es ir rápido. Es firmar un cheque en blanco. 🔐',
    ].join('\n\n'),
    hashtags: '#InteligenciaArtificial #DatosEmpresariales #ProductoDigital',
  },
  {
    desplazamiento: -7,
    status: 'publicado',
    titular: 'Doce métricas en verde y ninguna decisión',
    cuerpo: [
      '📊 Un equipo nos enseñó su panel. Doce métricas, todas en verde.',
      'Les preguntamos cuál les había hecho cambiar una decisión el último mes. Silencio.',
      'Un dato que no cambia una decisión no es información: es decoración cara. 🔌',
    ].join('\n\n'),
    hashtags: '#Datos #Analitica #EquiposDeProducto',
  },
  {
    desplazamiento: -2,
    status: 'publicado',
    titular: 'Por qué las integraciones deciden el cambio de plataforma',
    cuerpo: [
      '🔌 Nadie cambia de plataforma de datos por el precio.',
      'Se cambia cuando conectar una herramienta nueva cuesta tres semanas de ingeniería.',
      'Ese es el costo que no aparece en ninguna comparativa. ☁️',
    ].join('\n\n'),
    hashtags: '#Integraciones #PlataformaDeDatos #SaaS',
  },
  {
    desplazamiento: 1,
    status: 'programado',
    titular: 'El costo oculto de un dato que nadie consulta',
    cuerpo: [
      '☁️ Guardar es barato. Mantener, no.',
      'Cada tabla que nadie consulta se paga dos veces: en almacenamiento y en las horas de quien la mantiene viva por si acaso. 📊',
    ].join('\n\n'),
    hashtags: '#CostosCloud #Datos #Infraestructura',
  },
  {
    desplazamiento: 4,
    status: 'programado',
    titular: 'Qué mide un equipo de datos que sí influye en el negocio',
    cuerpo: [
      '📊 Hay métricas que se presentan y métricas que cambian decisiones.',
      'Las primeras llenan un panel. Las segundas se discuten en la reunión donde se decide el presupuesto. 🔐',
    ].join('\n\n'),
    hashtags: '#Datos #Producto #Negocio',
  },
  {
    desplazamiento: 0,
    status: 'borrador',
    titular: 'Entra en vigor la nueva ley de datos personales',
    cuerpo: [
      '⚖️ Cambia lo que las empresas de software pueden guardar y dónde.',
      'Borrador: falta cerrar el ángulo y comprobar qué aplica a datos tratados fuera del país.',
    ].join('\n\n'),
    hashtags: '#ProteccionDeDatos #Regulacion',
  },
];

function conDesplazamiento(hoy: Date, dias: number): string {
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().split('T')[0];
}

/** Construye las publicaciones de ejemplo. Pura: no toca el almacenamiento. */
export function construirContenidoDemo(hoy: Date = new Date()): CalendarPost[] {
  return PLANTILLAS.map((plantilla) => ({
    id: newId(),
    titular: plantilla.titular,
    cuerpo: plantilla.cuerpo,
    hashtags: plantilla.hashtags,
    promptImagen: '',
    fecha: conDesplazamiento(hoy, plantilla.desplazamiento),
    status: plantilla.status,
  }));
}

export type ResultadoSiembra = 'sembrado' | 'ya-sembrado' | 'calendario-con-datos' | 'no-aplica';

/**
 * Siembra el calendario si procede. Devuelve qué hizo, para poder probarlo y
 * para no dejar la decisión en un booleano mudo.
 */
export function sembrarContenidoDemo(activo: boolean, hoy: Date = new Date()): ResultadoSiembra {
  if (!activo) return 'no-aplica';
  if (readJson<string | null>(MARCA, null)) return 'ya-sembrado';

  const existentes = readJson<CalendarPost[]>(CALENDAR_KEY, []);
  if (Array.isArray(existentes) && existentes.length > 0) {
    // Alguien ya trabajó en este navegador: se respeta y no se vuelve a mirar.
    writeJson(MARCA, new Date().toISOString());
    return 'calendario-con-datos';
  }

  const publicaciones = construirContenidoDemo(hoy);
  writeJson(CALENDAR_KEY, publicaciones);
  writeJson(
    PUBLISHED_KEY,
    publicaciones.filter((post) => post.status === 'publicado')
  );
  writeJson(MARCA, new Date().toISOString());

  return 'sembrado';
}

export { MARCA as MARCA_SIEMBRA, PLANTILLAS };
