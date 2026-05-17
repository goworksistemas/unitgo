// Critérios: mín. 16 chars, maiúscula, minúscula, número, especial.
// Usa crypto.getRandomValues para entropia criptográfica.

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // sem I e O (confusos visualmente)
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz'  // sem i, l, o
const DIGITS    = '23456789'                  // sem 0 e 1
const SPECIAL   = '!@#$%&*-_=+'

const ALL = UPPERCASE + LOWERCASE + DIGITS + SPECIAL

function randomIndex(max: number): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}

function randomChar(charset: string): string {
  return charset[randomIndex(charset.length)]
}

function shuffle(arr: string[]): string[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generatePassword(length = 16): string {
  // Garante pelo menos 1 de cada categoria
  const required = [
    randomChar(UPPERCASE),
    randomChar(LOWERCASE),
    randomChar(DIGITS),
    randomChar(SPECIAL),
  ]

  const rest = Array.from({ length: length - 4 }, () => randomChar(ALL))

  return shuffle([...required, ...rest]).join('')
}
