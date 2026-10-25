import { describe, expect, it } from 'vitest';
import {
  KICKOFF_MESSAGE,
  buildConfirmMessage,
  buildFormatMessage,
  buildMoreTopicsMessage,
  buildTopicMessage,
  detectFormat,
  detectPhase,
  FORMAT_OPTIONS,
  isConfirmMessage,
} from '@/lib/agent-messages';
import { demoResponseFor } from '@/lib/demo-agent';
import { DEMO_BRAND } from '@/lib/brand';
import { parseAngle, parseVersions } from '@/lib/post-parser';

/**
 * El contrato entre la interfaz y el agente.
 *
 * Estas pruebas existen por un error concreto: el mensaje que la interfaz manda
 * al elegir un tema ("Desarrolla el tema 1: …") se reconocía en otro archivo, y
 * el guion de demostración lo tomaba por un ajuste y devolvía un post en vez del
 * ángulo. Se vio en el recorrido en navegador, no en las pruebas unitarias,
 * porque ninguna usaba la frase de verdad.
 *
 * Ahora las frases se construyen y se reconocen en el mismo módulo, y aquí se
 * recorre el viaje completo: construir el mensaje como lo hace la pantalla,
 * reconocer su fase, y comprobar que la respuesta corresponde.
 */

const fecha = new Date('2026-10-24T18:00:00Z');

describe('detectFormat', () => {
  it('reconoce todos los formatos que ofrece la interfaz', () => {
    for (const opcion of FORMAT_OPTIONS) {
      expect(detectFormat(opcion), opcion).not.toBeNull();
    }
  });

  it('quita el emoji del nombre', () => {
    expect(detectFormat('📝 Copy')).toBe('Copy');
    expect(detectFormat('🎠 Carrusel')).toBe('Carrusel');
    expect(detectFormat('🎬 Video (guión)')).toBe('Video');
  });

  it('prefiere el formato más específico', () => {
    // "Copy + imagen" contiene "Copy": no debe quedarse con el genérico.
    expect(detectFormat('📸 Copy + imagen')).toBe('Copy + imagen');
  });

  it('devuelve null cuando no hay formato', () => {
    expect(detectFormat('3')).toBeNull();
    expect(detectFormat('dame más opciones')).toBeNull();
  });
});

describe('isConfirmMessage', () => {
  it('reconoce el mensaje de confirmación que arma la interfaz', () => {
    expect(isConfirmMessage(buildConfirmMessage('A', 'contenido largo'))).toBe(true);
    expect(isConfirmMessage(buildConfirmMessage('B', ''))).toBe(true);
  });

  it('no confunde un mensaje cualquiera', () => {
    expect(isConfirmMessage('hazlo más corto')).toBe(false);
    expect(isConfirmMessage('')).toBe(false);
  });
});

describe('cobertura del contrato completo', () => {
  /**
   * Todos los mensajes que la interfaz puede enviar sin que el analista escriba
   * nada, con la fase que les corresponde.
   *
   * Esta tabla existe porque faltaba uno: el mensaje de arranque automático
   * (`KICKOFF_MESSAGE`) se reconocía como "ajuste", así que al abrir una
   * propuesta nueva el guion de demostración respondía con un post en vez de la
   * lista de temas. Lo encontró el recorrido en navegador. Si mañana se añade
   * otro mensaje automático, esta tabla obliga a decidir su fase.
   */
  const MENSAJES_DE_LA_INTERFAZ: { nombre: string; mensaje: string; fase: string }[] = [
    { nombre: 'arranque automático', mensaje: KICKOFF_MESSAGE, fase: 'temas' },
    { nombre: 'pedir más temas', mensaje: buildMoreTopicsMessage(), fase: 'temas' },
    { nombre: 'elegir tema', mensaje: buildTopicMessage(1, 'Un título cualquiera'), fase: 'angulo' },
    { nombre: 'elegir formato', mensaje: buildFormatMessage('📝 Copy'), fase: 'versiones' },
    { nombre: 'confirmar versión', mensaje: buildConfirmMessage('A', 'contenido'), fase: 'confirmacion' },
  ];

  it.each(MENSAJES_DE_LA_INTERFAZ)('el mensaje de $nombre es fase $fase', ({ mensaje, fase }) => {
    expect(detectPhase(mensaje)).toBe(fase);
  });

  it('el arranque automático recibe la lista de temas, no un post', () => {
    const respuesta = demoResponseFor([{ role: 'user', content: KICKOFF_MESSAGE }], DEMO_BRAND, fecha);

    expect(respuesta).toContain('¿Cuál desarrollamos?');
    expect(respuesta).not.toContain('---POST---');
  });
});

describe('detectPhase sobre los mensajes reales de la interfaz', () => {
  it('el mensaje de elegir tema lleva al ángulo', () => {
    const mensaje = buildTopicMessage(1, '🚨 Tres rutas concentran la mitad del robo de carga');
    expect(detectPhase(mensaje)).toBe('angulo');
  });

  it('un número escrito a mano también lleva al ángulo', () => {
    // El cierre de la lista dice "Escribe el número".
    expect(detectPhase('3')).toBe('angulo');
    expect(detectPhase(' 4 ')).toBe('angulo');
  });

  it('un título de tema que menciona un formato no se confunde con elegir formato', () => {
    // Este es el caso que rompía: "Video" dentro del título del tema.
    const mensaje = buildTopicMessage(2, '🎬 Video vertical: lo que nadie te cuenta del robo');
    expect(detectPhase(mensaje)).toBe('angulo');
  });

  it('el mensaje de elegir formato lleva a las versiones', () => {
    for (const opcion of FORMAT_OPTIONS) {
      expect(detectPhase(buildFormatMessage(opcion)), opcion).toBe('versiones');
    }
  });

  it('el mensaje de confirmación lleva a la confirmación', () => {
    expect(detectPhase(buildConfirmMessage('A', 'contenido'))).toBe('confirmacion');
    expect(detectPhase('elijo la version b')).toBe('confirmacion');
  });

  it('pedir más temas vuelve a la lista', () => {
    expect(detectPhase(buildMoreTopicsMessage())).toBe('temas');
    expect(detectPhase('')).toBe('temas');
    expect(detectPhase('hola')).toBe('temas');
    expect(detectPhase('quiero otros temas')).toBe('temas');
  });

  it('cualquier otra instrucción es un ajuste', () => {
    expect(detectPhase('hazlo más corto')).toBe('ajuste');
    expect(detectPhase('cambia el primer titular')).toBe('ajuste');
  });
});

describe('el guion responde a cada paso de la interfaz (HU-12)', () => {
  it('elegir tema devuelve un ángulo, no un post', () => {
    const mensaje = buildTopicMessage(1, '🚨 Tres rutas concentran la mitad del robo de carga');
    const respuesta = demoResponseFor([{ role: 'user', content: mensaje }], DEMO_BRAND, fecha);

    expect(parseAngle(respuesta)).not.toBeNull();
    expect(respuesta).not.toContain('---POST---');
  });

  it('elegir formato devuelve las dos versiones, con ese formato', () => {
    const mensaje = buildFormatMessage('📸 Copy + imagen');
    const respuesta = demoResponseFor([{ role: 'user', content: mensaje }], DEMO_BRAND, fecha);

    expect(parseVersions(respuesta)?.format).toBe('Copy + imagen');
  });

  it('recorre el viaje completo tal como lo haría la pantalla', () => {
    const conversacion: { role: 'user' | 'assistant'; content: string }[] = [];

    function pedir(mensaje: string): string {
      conversacion.push({ role: 'user', content: mensaje });
      const respuesta = demoResponseFor(conversacion, DEMO_BRAND, fecha);
      conversacion.push({ role: 'assistant', content: respuesta });
      return respuesta;
    }

    const temas = pedir('empecemos');
    expect(temas).toContain('¿Cuál desarrollamos?');

    const angulo = pedir(buildTopicMessage(1, '🚨 Tres rutas concentran la mitad del robo'));
    expect(parseAngle(angulo)).not.toBeNull();

    const versiones = pedir(buildFormatMessage('📝 Copy'));
    expect(parseVersions(versiones)?.versionA.titulares).toHaveLength(3);

    const confirmacion = pedir(buildConfirmMessage('A', 'el contenido elegido'));
    expect(confirmacion.length).toBeLessThan(200);
  });
});
