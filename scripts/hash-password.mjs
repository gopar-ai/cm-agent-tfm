#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { randomBytes, scryptSync } from 'node:crypto';

/**
 * Genera el valor de APP_PASSWORD_HASH a partir de una contraseña.
 *
 * Uso:
 *   npm run hash-password -- "mi contraseña"
 *   npm run hash-password            (la pide por teclado)
 *
 * Implementa el mismo formato que `lib/security.ts` sin importarlo, para que el
 * script funcione sin compilar TypeScript.
 */

const KEYLEN = 64;

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEYLEN).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

const desdeArgumentos = process.argv.slice(2).join(' ').trim();

let password = desdeArgumentos;

if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = (await rl.question('Contraseña a convertir en hash: ')).trim();
  rl.close();
}

if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

console.log('\nCopia esta línea en tus variables de entorno:\n');
console.log(`APP_PASSWORD_HASH=${hashPassword(password)}`);
console.log('\nY borra APP_PASSWORD si la tenías configurada.\n');
