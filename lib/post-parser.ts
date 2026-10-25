export function parsePost(text: string): {
  titular: string;
  cuerpo: string;
  hashtags: string;
  promptImagen: string;
} | null {
  const match = text.match(/---POST---([\s\S]*?)---FIN---/);
  if (!match) return null;

  const block = match[1];
  const titular = block.match(/TITULAR:\s*(.+)/)?.[1]?.trim() ?? '';
  const cuerpo = block.match(/CUERPO:\n([\s\S]*?)(?=HASHTAGS:)/)?.[1]?.trim() ?? '';
  const hashtags = block.match(/HASHTAGS:\s*(.+)/)?.[1]?.trim() ?? '';
  const promptImagen = block.match(/PROMPT_IMAGEN:\s*([\s\S]*?)$/)?.[1]?.trim() ?? '';

  return { titular, cuerpo, hashtags, promptImagen };
}

export type Topic = {
  number: number;
  title: string;
  kind: 'Actualidad' | 'Tema';
  reason: string;
  date?: string;
  source?: string;
  url?: string;
};

const TOPIC_REGEX =
  /(\d+)\.\s*(.+?)\s*—\s*(Actualidad|Tema)\s*\n([^\n]+)(?:\nFecha:\s*([^\n]+))?(?:\nFuente:\s*([^\n]+))?(?:\n\[ver noticia\]\((\S+)\))?/g;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const rand = seededRandom(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function parseTopics(text: string): { topics: Topic[]; closingText: string } | null {
  const matches = [...text.matchAll(TOPIC_REGEX)];
  if (matches.length < 3) return null;

  const topics: Topic[] = matches.map((m) => ({
    number: Number(m[1]),
    title: m[2].trim(),
    kind: m[3] as 'Actualidad' | 'Tema',
    reason: m[4].trim(),
    date: m[5]?.trim(),
    source: m[6]?.trim(),
    url: m[7]?.trim(),
  }));

  // Re-ordenamos con una semilla derivada del propio texto: el orden visual cambia
  // entre generaciones distintas, pero es estable mientras se renderiza el mismo mensaje.
  const shuffled = shuffleSeeded(topics, hashString(text)).map((t, i) => ({ ...t, number: i + 1 }));

  const lastMatch = matches[matches.length - 1];
  const lastIndex = (lastMatch.index ?? 0) + lastMatch[0].length;
  const closingText = text.slice(lastIndex).trim();

  return { topics: shuffled, closingText };
}

export type AngleResult = { angulo: string; porQueAhora: string; emocion: string };

export function parseAngle(text: string): AngleResult | null {
  const match = text.match(/---ANGULO---([\s\S]*?)---FIN_ANGULO---/);
  if (!match) return null;

  const block = match[1];
  const angulo = block.match(/🎯\s*Ángulo\s*\n([^\n]+)/)?.[1]?.trim() ?? '';
  const porQueAhora = block.match(/💡\s*Por qué ahora\s*\n([^\n]+)/)?.[1]?.trim() ?? '';
  const emocion = block.match(/🎭\s*Emoción objetivo\s*\n([^\n]+)/)?.[1]?.trim() ?? '';

  if (!angulo && !porQueAhora && !emocion) return null;
  return { angulo, porQueAhora, emocion };
}

export type VersionContent = { titulo: string; titulares: string[]; contenido: string };
export type VersionsResult = { format: string; versionA: VersionContent; versionB: VersionContent };

function parseVersionBlock(block: string): VersionContent {
  const titulo = block.match(/TITULO:\s*(.+)/)?.[1]?.trim() ?? '';
  const titularesBlock = block.match(/TITULARES:\s*\n([\s\S]*?)(?=\nCONTENIDO:)/)?.[1] ?? '';
  const titulares = [...titularesBlock.matchAll(/\d+\.\s*(.+)/g)].map((m) => m[1].trim());
  const contenido = block.match(/CONTENIDO:\n([\s\S]*?)$/)?.[1]?.trim() ?? '';
  return { titulo, titulares, contenido };
}

export type ParsedVersionContent = {
  cuerpo: string;
  hashtags: string[];
  copyImagen?: string;
  promptImagen?: string;
};

function extractHashtags(raw: string): string[] {
  return raw.match(/#[^\s\]#]+/g) ?? [];
}

export function parseVersionContent(contenido: string): ParsedVersionContent {
  if (contenido.includes('COPY DEL POST:')) {
    const copyPostBlock =
      contenido.match(/COPY DEL POST:\s*\n([\s\S]*?)(?=\nCOPY DE LA IMAGEN:|$)/)?.[1]?.trim() ?? '';
    const copyImagen = contenido
      .match(/COPY DE LA IMAGEN:\s*\n([\s\S]*?)(?=\nPROMPT PARA IMAGEN:|$)/)?.[1]
      ?.trim();
    const promptImagen = contenido.match(/PROMPT PARA IMAGEN:\s*\n([\s\S]*?)$/)?.[1]?.trim();

    const hashtagsMatch = copyPostBlock.match(/HASHTAGS:\s*(.+)/);
    const cuerpo = (hashtagsMatch ? copyPostBlock.slice(0, hashtagsMatch.index) : copyPostBlock).trim();
    const hashtags = hashtagsMatch ? extractHashtags(hashtagsMatch[1]) : [];

    return { cuerpo, hashtags, copyImagen, promptImagen };
  }

  const hashtagsMatch = contenido.match(/HASHTAGS:\s*(.+)/);
  const cuerpo = (hashtagsMatch ? contenido.slice(0, hashtagsMatch.index) : contenido)
    .replace(/^CUERPO:\s*\n?/, '')
    .trim();
  const hashtags = hashtagsMatch ? extractHashtags(hashtagsMatch[1]) : [];

  return { cuerpo, hashtags };
}

export function parseVersions(text: string): VersionsResult | null {
  const outer = text.match(/---VERSIONES---([\s\S]*?)---FIN VERSIONES---/);
  if (!outer) return null;

  const body = outer[1];
  const format = body.match(/FORMATO:\s*(.+)/)?.[1]?.trim() ?? '';

  const aMatch = body.match(/---VERSION A---([\s\S]*?)---FIN VERSION A---/);
  const bMatch = body.match(/---VERSION B---([\s\S]*?)---FIN VERSION B---/);
  if (!aMatch || !bMatch) return null;

  return {
    format,
    versionA: parseVersionBlock(aMatch[1]),
    versionB: parseVersionBlock(bMatch[1]),
  };
}
