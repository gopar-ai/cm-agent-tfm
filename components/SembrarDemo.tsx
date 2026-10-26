'use client';

import { useEffect } from 'react';
import { sembrarContenidoDemo } from '@/lib/demo-seed';

/**
 * Siembra el contenido de ejemplo en la demo.
 *
 * No dibuja nada: existe solo para ejecutar la siembra en el navegador, que es
 * donde vive el calendario. El `activo` lo decide el servidor, así que una
 * instalación real nunca entra aquí.
 */
export default function SembrarDemo({ activo }: { activo: boolean }) {
  useEffect(() => {
    sembrarContenidoDemo(activo);
  }, [activo]);

  return null;
}
