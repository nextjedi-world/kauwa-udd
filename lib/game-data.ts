export type Language = {
  code: string
  label: string
  flag: string
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

export type GameObject = {
  id: string
  emoji: string
  /** can it fly? true => releasing is correct */
  flies: boolean
  words: Record<string, string>
}

export const GAME_OBJECTS: GameObject[] = [
  {
    id: 'crow',
    emoji: '🐦',
    flies: true,
    words: { en: 'Crow', hi: 'कौआ', es: 'Cuervo', fr: 'Corbeau', pt: 'Corvo', ja: 'カラス' },
  },
  {
    id: 'sparrow',
    emoji: '🐤',
    flies: true,
    words: { en: 'Sparrow', hi: 'चिड़िया', es: 'Gorrión', fr: 'Moineau', pt: 'Pardal', ja: 'スズメ' },
  },
  {
    id: 'plane',
    emoji: '✈️',
    flies: true,
    words: { en: 'Aeroplane', hi: 'हवाई जहाज़', es: 'Avión', fr: 'Avion', pt: 'Avião', ja: '飛行機' },
  },
  {
    id: 'butterfly',
    emoji: '🦋',
    flies: true,
    words: { en: 'Butterfly', hi: 'तितली', es: 'Mariposa', fr: 'Papillon', pt: 'Borboleta', ja: '蝶' },
  },
  {
    id: 'cat',
    emoji: '🐈',
    flies: false,
    words: { en: 'Cat', hi: 'बिल्ली', es: 'Gato', fr: 'Chat', pt: 'Gato', ja: '猫' },
  },
  {
    id: 'mountain',
    emoji: '⛰️',
    flies: false,
    words: { en: 'Mountain', hi: 'पहाड़', es: 'Montaña', fr: 'Montagne', pt: 'Montanha', ja: '山' },
  },
  {
    id: 'table',
    emoji: '🪑',
    flies: false,
    words: { en: 'Chair', hi: 'कुर्सी', es: 'Silla', fr: 'Chaise', pt: 'Cadeira', ja: '椅子' },
  },
  {
    id: 'bee',
    emoji: '🐝',
    flies: true,
    words: { en: 'Bee', hi: 'मधुमक्खी', es: 'Abeja', fr: 'Abeille', pt: 'Abelha', ja: '蜂' },
  },
  {
    id: 'fish',
    emoji: '🐟',
    flies: false,
    words: { en: 'Fish', hi: 'मछली', es: 'Pez', fr: 'Poisson', pt: 'Peixe', ja: '魚' },
  },
  {
    id: 'rocket',
    emoji: '🚀',
    flies: true,
    words: { en: 'Rocket', hi: 'रॉकेट', es: 'Cohete', fr: 'Fusée', pt: 'Foguete', ja: 'ロケット' },
  },
  // ── Extended catalogue (appended by BACKEND agent) ──────────────────────────
  {
    id: 'eagle',
    emoji: '🦅',
    flies: true,
    words: { en: 'Eagle', hi: 'बाज़', es: 'Águila', fr: 'Aigle', pt: 'Águia', ja: 'ワシ' },
  },
  {
    id: 'owl',
    emoji: '🦉',
    flies: true,
    words: { en: 'Owl', hi: 'उल्लू', es: 'Búho', fr: 'Hibou', pt: 'Coruja', ja: 'フクロウ' },
  },
  {
    id: 'parrot',
    emoji: '🦜',
    flies: true,
    words: { en: 'Parrot', hi: 'तोता', es: 'Loro', fr: 'Perroquet', pt: 'Papagaio', ja: 'オウム' },
  },
  {
    id: 'duck',
    emoji: '🦆',
    flies: true,
    words: { en: 'Duck', hi: 'बत्तख़', es: 'Pato', fr: 'Canard', pt: 'Pato', ja: 'アヒル' },
  },
  {
    id: 'helicopter',
    emoji: '🚁',
    flies: true,
    words: { en: 'Helicopter', hi: 'हेलीकॉप्टर', es: 'Helicóptero', fr: 'Hélicoptère', pt: 'Helicóptero', ja: 'ヘリコプター' },
  },
  {
    id: 'balloon',
    emoji: '🎈',
    flies: true,
    words: { en: 'Balloon', hi: 'गुब्बारा', es: 'Globo', fr: 'Ballon', pt: 'Balão', ja: '風船' },
  },
  {
    id: 'kite',
    emoji: '🪁',
    flies: true,
    words: { en: 'Kite', hi: 'पतंग', es: 'Cometa', fr: 'Cerf-volant', pt: 'Pipa', ja: '凧' },
  },
  {
    id: 'fly',
    emoji: '🪰',
    flies: true,
    words: { en: 'Fly', hi: 'मक्खी', es: 'Mosca', fr: 'Mouche', pt: 'Mosca', ja: 'ハエ' },
  },
  {
    id: 'ladybug',
    emoji: '🐞',
    flies: true,
    words: { en: 'Ladybug', hi: 'गुबरैला', es: 'Mariquita', fr: 'Coccinelle', pt: 'Joaninha', ja: 'てんとう虫' },
  },
  {
    id: 'bat',
    emoji: '🦇',
    flies: true,
    words: { en: 'Bat', hi: 'चमगादड़', es: 'Murciélago', fr: 'Chauve-souris', pt: 'Morcego', ja: 'コウモリ' },
  },
  {
    id: 'dove',
    emoji: '🕊️',
    flies: true,
    words: { en: 'Dove', hi: 'कबूतर', es: 'Paloma', fr: 'Colombe', pt: 'Pomba', ja: 'ハト' },
  },
  {
    id: 'flamingo',
    emoji: '🦩',
    flies: true,
    words: { en: 'Flamingo', hi: 'राजहंस', es: 'Flamenco', fr: 'Flamant', pt: 'Flamingo', ja: 'フラミンゴ' },
  },
  {
    id: 'mosquito',
    emoji: '🦟',
    flies: true,
    words: { en: 'Mosquito', hi: 'मच्छर', es: 'Mosquito', fr: 'Moustique', pt: 'Mosquito', ja: '蚊' },
  },
  {
    id: 'feather',
    emoji: '🪶',
    flies: true,
    words: { en: 'Feather', hi: 'पंख', es: 'Pluma', fr: 'Plume', pt: 'Pena', ja: '羽' },
  },
  {
    id: 'ufo',
    emoji: '🛸',
    flies: true,
    words: { en: 'UFO', hi: 'यूएफओ', es: 'OVNI', fr: 'OVNI', pt: 'OVNI', ja: 'UFO' },
  },
  {
    id: 'dog',
    emoji: '🐶',
    flies: false,
    words: { en: 'Dog', hi: 'कुत्ता', es: 'Perro', fr: 'Chien', pt: 'Cachorro', ja: '犬' },
  },
  {
    id: 'elephant',
    emoji: '🐘',
    flies: false,
    words: { en: 'Elephant', hi: 'हाथी', es: 'Elefante', fr: 'Éléphant', pt: 'Elefante', ja: '象' },
  },
  {
    id: 'car',
    emoji: '🚗',
    flies: false,
    words: { en: 'Car', hi: 'कार', es: 'Coche', fr: 'Voiture', pt: 'Carro', ja: '車' },
  },
  {
    id: 'tree',
    emoji: '🌳',
    flies: false,
    words: { en: 'Tree', hi: 'पेड़', es: 'Árbol', fr: 'Arbre', pt: 'Árvore', ja: '木' },
  },
  {
    id: 'house',
    emoji: '🏠',
    flies: false,
    words: { en: 'House', hi: 'घर', es: 'Casa', fr: 'Maison', pt: 'Casa', ja: '家' },
  },
  {
    id: 'book',
    emoji: '📖',
    flies: false,
    words: { en: 'Book', hi: 'किताब', es: 'Libro', fr: 'Livre', pt: 'Livro', ja: '本' },
  },
  {
    id: 'apple',
    emoji: '🍎',
    flies: false,
    words: { en: 'Apple', hi: 'सेब', es: 'Manzana', fr: 'Pomme', pt: 'Maçã', ja: 'りんご' },
  },
  {
    id: 'rock',
    emoji: '🪨',
    flies: false,
    words: { en: 'Rock', hi: 'चट्टान', es: 'Roca', fr: 'Rocher', pt: 'Rocha', ja: '岩' },
  },
  {
    id: 'snake',
    emoji: '🐍',
    flies: false,
    words: { en: 'Snake', hi: 'साँप', es: 'Serpiente', fr: 'Serpent', pt: 'Cobra', ja: '蛇' },
  },
  {
    id: 'turtle',
    emoji: '🐢',
    flies: false,
    words: { en: 'Turtle', hi: 'कछुआ', es: 'Tortuga', fr: 'Tortue', pt: 'Tartaruga', ja: '亀' },
  },
  {
    id: 'whale',
    emoji: '🐋',
    flies: false,
    words: { en: 'Whale', hi: 'व्हेल', es: 'Ballena', fr: 'Baleine', pt: 'Baleia', ja: 'クジラ' },
  },
  {
    id: 'crab',
    emoji: '🦀',
    flies: false,
    words: { en: 'Crab', hi: 'केकड़ा', es: 'Cangrejo', fr: 'Crabe', pt: 'Caranguejo', ja: 'カニ' },
  },
  {
    id: 'train',
    emoji: '🚂',
    flies: false,
    words: { en: 'Train', hi: 'रेलगाड़ी', es: 'Tren', fr: 'Train', pt: 'Trem', ja: '電車' },
  },
  {
    id: 'bicycle',
    emoji: '🚲',
    flies: false,
    words: { en: 'Bicycle', hi: 'साइकिल', es: 'Bicicleta', fr: 'Vélo', pt: 'Bicicleta', ja: '自転車' },
  },
  {
    id: 'ball',
    emoji: '⚽',
    flies: false,
    words: { en: 'Ball', hi: 'गेंद', es: 'Pelota', fr: 'Balle', pt: 'Bola', ja: 'ボール' },
  },
  {
    id: 'anchor',
    emoji: '⚓',
    flies: false,
    words: { en: 'Anchor', hi: 'लंगर', es: 'Ancla', fr: 'Ancre', pt: 'Âncora', ja: '錨' },
  },
]

export type Player = {
  id: string
  name: string
  avatar: string
  isHost?: boolean
  isYou?: boolean
  score: number
  online: boolean
}

export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', name: 'You', avatar: '🦅', isYou: true, isHost: true, score: 0, online: true },
  { id: 'p2', name: 'Aisha', avatar: '🐤', score: 0, online: true },
  { id: 'p3', name: 'Diego', avatar: '🦜', score: 0, online: true },
  { id: 'p4', name: 'Mira', avatar: '🕊️', score: 0, online: true },
  { id: 'p5', name: 'Kenji', avatar: '🦉', score: 0, online: true },
  { id: 'p6', name: 'Lena', avatar: '🐧', score: 0, online: false },
]

export type RoundResult = {
  round: number
  object: string
  emoji: string
  flies: boolean
  correct: boolean
  reactionMs: number
}

export const MOCK_ROUND_BREAKDOWN: RoundResult[] = [
  { round: 1, object: 'Crow', emoji: '🐦', flies: true, correct: true, reactionMs: 410 },
  { round: 2, object: 'Cat', emoji: '🐈', flies: false, correct: true, reactionMs: 0 },
  { round: 3, object: 'Aeroplane', emoji: '✈️', flies: true, correct: true, reactionMs: 380 },
  { round: 4, object: 'Mountain', emoji: '⛰️', flies: false, correct: false, reactionMs: 290 },
  { round: 5, object: 'Butterfly', emoji: '🦋', flies: true, correct: true, reactionMs: 520 },
  { round: 6, object: 'Rocket', emoji: '🚀', flies: true, correct: true, reactionMs: 340 },
  { round: 7, object: 'Fish', emoji: '🐟', flies: false, correct: true, reactionMs: 0 },
  { round: 8, object: 'Bee', emoji: '🐝', flies: true, correct: false, reactionMs: 610 },
]

export type LeaderEntry = {
  rank: number
  name: string
  avatar: string
  score: number
  streak: number
  isYou?: boolean
}

export const DAILY_LEADERS: LeaderEntry[] = [
  { rank: 1, name: 'Priya', avatar: '🦚', score: 9820, streak: 28 },
  { rank: 2, name: 'Marco', avatar: '🦅', score: 9410, streak: 21 },
  { rank: 3, name: 'Sora', avatar: '🦉', score: 9180, streak: 19 },
  { rank: 4, name: 'Tariq', avatar: '🦜', score: 8740, streak: 15 },
  { rank: 5, name: 'Nina', avatar: '🕊️', score: 8520, streak: 12 },
  { rank: 6, name: 'You', avatar: '🦅', score: 8210, streak: 11, isYou: true },
  { rank: 7, name: 'Bao', avatar: '🐤', score: 7990, streak: 9 },
  { rank: 8, name: 'Eva', avatar: '🐧', score: 7610, streak: 7 },
]

export const WEEKLY_LEADERS: LeaderEntry[] = [
  { rank: 1, name: 'Marco', avatar: '🦅', score: 64210, streak: 132 },
  { rank: 2, name: 'You', avatar: '🦅', score: 61880, streak: 121, isYou: true },
  { rank: 3, name: 'Priya', avatar: '🦚', score: 60540, streak: 118 },
  { rank: 4, name: 'Sora', avatar: '🦉', score: 58330, streak: 104 },
  { rank: 5, name: 'Nina', avatar: '🕊️', score: 55120, streak: 96 },
  { rank: 6, name: 'Tariq', avatar: '🦜', score: 52870, streak: 88 },
  { rank: 7, name: 'Bao', avatar: '🐤', score: 49210, streak: 74 },
  { rank: 8, name: 'Eva', avatar: '🐧', score: 47600, streak: 69 },
]

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
