import { getServerEnv } from '@/lib/env';
import LoginForm from './login-form';

/**
 * Pantalla de acceso.
 *
 * El aviso con las credenciales de prueba se decide **en el servidor y en
 * ejecución**, no al construir. La primera versión lo leía de una variable
 * `NEXT_PUBLIC_`, que Next incrusta en el momento de la construcción: en la
 * demo publicada la variable existía, pero el aviso nunca apareció porque el
 * valor se fija cuando se compila, no cuando arranca. Leerlo aquí también
 * permite cambiarlo reiniciando, sin reconstruir la imagen.
 */
/**
 * Se renderiza en cada petición, no al construir: si Next la prerenderizara,
 * el aviso quedaría congelado con el valor que hubiera durante la compilación,
 * que es justo el problema que se quería evitar.
 */
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const { demoHint } = getServerEnv();

  return <LoginForm demoHint={demoHint} />;
}
