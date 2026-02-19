/**
 * Utilitário para gerenciar códigos únicos diários de usuários.
 * Códigos são aleatórios, armazenados no banco e renovados diariamente.
 */

/**
 * Gera um código aleatório de 6 dígitos usando crypto seguro.
 */
export function generateRandomDailyCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 1000000).toString().padStart(6, '0');
  return code;
}

/**
 * Verifica se o código armazenado ainda é válido (gerado hoje).
 */
export function isDailyCodeExpired(generatedAt: Date | string | undefined): boolean {
  if (!generatedAt) return true;
  const generated = typeof generatedAt === 'string' ? new Date(generatedAt) : generatedAt;
  const today = new Date().toISOString().split('T')[0];
  const generatedDate = generated.toISOString().split('T')[0];
  return today !== generatedDate;
}

/**
 * Formata o código para exibição (XXX-XXX)
 */
export function formatDailyCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Remove formatação do código (XXX-XXX -> XXXXXX)
 */
export function unformatDailyCode(code: string): string {
  return code.replace(/[^0-9]/g, '');
}
