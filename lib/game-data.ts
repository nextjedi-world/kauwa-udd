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
