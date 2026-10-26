import { dayKey } from './day-key';
import type { NewsItem } from './news-types';

/**
 * Feed de ejemplo para el modo de demostración.
 *
 * Medios y enlaces inventados, con el dominio reservado `.example` (RFC 2606):
 * una demostración no debe fabricar enlaces que parezcan de medios reales. Las
 * fechas se calculan al momento para que el feed se vea vigente cualquier día.
 *
 * Las portadas se generan con `npm run portadas` y viven en `public/demo-news`.
 */

function daysAgo(days: number): string {
  return dayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export const DEMO_NEWS: NewsItem[] = [
  {
    title: 'Siete de cada diez equipos de producto ya usan IA en su flujo diario',
    url: 'https://reportetech.example/ia-equipos-producto',
    source: 'Reporte Tech',
    date: daysAgo(0),
    image: '/demo-news/ia-producto.jpg',
  },
  {
    title: 'La nueva ley de datos personales entra en vigor para empresas de software',
    url: 'https://datoshoy.example/ley-datos-personales',
    source: 'Datos Hoy',
    date: daysAgo(1),
    image: '/demo-news/regulacion-datos.jpg',
  },
  {
    title: 'El costo de la nube sube y las empresas revisan sus contratos',
    url: 'https://nubeyredes.example/costo-nube-contratos',
    source: 'Nube y Redes',
    date: daysAgo(1),
    image: '/demo-news/costo-nube.jpg',
  },
  {
    title: 'Ciberseguridad: los ataques a cadenas de suministro de software se duplican',
    url: 'https://seguridaddigital.example/ataques-cadena-software',
    source: 'Seguridad Digital',
    date: daysAgo(2),
    image: '/demo-news/ciberseguridad.jpg',
  },
  {
    title: 'Latinoamérica concentra una quinta parte del nuevo talento técnico contratado',
    url: 'https://talentotech.example/talento-latam',
    source: 'Talento Tech',
    date: daysAgo(3),
    image: '/demo-news/talento.jpg',
  },
  {
    title: 'Las integraciones, el motivo número uno para cambiar de plataforma de datos',
    url: 'https://plataformasb2b.example/integraciones-cambio',
    source: 'Plataformas B2B',
    date: daysAgo(4),
    image: '/demo-news/integraciones.jpg',
  },
];
