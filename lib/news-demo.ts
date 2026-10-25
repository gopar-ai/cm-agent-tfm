import { dayKey } from './day-key';
import type { NewsItem } from './news-types';

/**
 * Feed de ejemplo para el modo de demostración.
 *
 * Medios y enlaces inventados, con el dominio reservado `.example` (RFC 2606):
 * una demostración no debe fabricar enlaces que parezcan de medios reales. Las
 * fechas se calculan al momento para que el feed se vea vigente cualquier día.
 */

function daysAgo(days: number): string {
  return dayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export const DEMO_NEWS: NewsItem[] = [
  {
    title: 'Tres corredores concentran la mitad del robo de carga del trimestre',
    url: 'https://reportecarga.example/robo-carga-corredores',
    source: 'Reporte Carga',
    date: daysAgo(0),
  },
  {
    title: 'Nuevas reglas de operación para el autotransporte entran en vigor',
    url: 'https://logisticahoy.example/reglas-autotransporte',
    source: 'Logística Hoy',
    date: daysAgo(1),
  },
  {
    title: 'El nearshoring presiona la capacidad de los centros de distribución',
    url: 'https://cadenanorte.example/nearshoring-capacidad',
    source: 'Cadena Norte',
    date: daysAgo(1),
  },
  {
    title: 'Cadena de frío: el costo de una hora fuera de rango',
    url: 'https://frioyruta.example/cadena-de-frio-costo',
    source: 'Frío y Ruta',
    date: daysAgo(2),
  },
  {
    title: 'Aduanas estrena ventanilla digital para despacho de carga',
    url: 'https://comercioexterior.example/ventanilla-digital',
    source: 'Comercio Exterior Hoy',
    date: daysAgo(3),
  },
  {
    title: 'Seguros de mercancía: por qué suben las primas en rutas del centro',
    url: 'https://riesgologistico.example/primas-seguros',
    source: 'Riesgo Logístico',
    date: daysAgo(4),
  },
];
