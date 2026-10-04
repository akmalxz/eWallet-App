// src/utils/theme/themeRegistry.js
import {
  Landmark, Building2, Wallet, CreditCard, Smartphone,
  PiggyBank, Lock, Coins, Banknote,
  Plane, Home, Car, Briefcase, Gift, ShoppingBag, GraduationCap,
  Star, Heart, Globe, TrendingUp, Shield, Sparkles, Activity, Store
} from 'lucide-react'

// ===========================================================================
// COLOR THEMES
// Keys are stable — never rename, never remove. To retire one, keep the entry
// and add `retired: true`; the picker will hide it but existing accounts
// continue to render with their saved color.
// ===========================================================================
export const COLOR_THEMES = [
  { key: 'blue',     name: 'Blue',     gradient: ['#2563eb', '#1e3a8a'], tone: 'light', accent: '#93c5fd' },
  { key: 'indigo',   name: 'Indigo',   gradient: ['#4f46e5', '#312e81'], tone: 'light', accent: '#a5b4fc' },
  { key: 'sky',      name: 'Sky',      gradient: ['#0ea5e9', '#0369a1'], tone: 'light', accent: '#7dd3fc' },
  { key: 'cyan',     name: 'Cyan',     gradient: ['#0891b2', '#155e75'], tone: 'light', accent: '#67e8f9' },
  { key: 'teal',     name: 'Teal',     gradient: ['#14b8a6', '#0f766e'], tone: 'light', accent: '#5eead4' },
  { key: 'emerald',  name: 'Emerald',  gradient: ['#10b981', '#065f46'], tone: 'light', accent: '#6ee7b7' },
  { key: 'lime',     name: 'Lime',     gradient: ['#84cc16', '#4d7c0f'], tone: 'light', accent: '#bef264' },
  { key: 'amber',    name: 'Amber',    gradient: ['#f59e0b', '#92400e'], tone: 'light', accent: '#fcd34d' },
  { key: 'orange',   name: 'Orange',   gradient: ['#f97316', '#9a3412'], tone: 'light', accent: '#fdba74' },
  { key: 'rose',     name: 'Rose',     gradient: ['#f43f5e', '#9f1239'], tone: 'light', accent: '#fda4af' },
  { key: 'fuchsia',  name: 'Fuchsia',  gradient: ['#d946ef', '#86198f'], tone: 'light', accent: '#f0abfc' },
  { key: 'purple',   name: 'Purple',   gradient: ['#a855f7', '#6b21a8'], tone: 'light', accent: '#d8b4fe' },
  { key: 'slate',    name: 'Slate',    gradient: ['#475569', '#1e293b'], tone: 'light', accent: '#cbd5e1' },
  { key: 'midnight', name: 'Midnight', gradient: ['#1e293b', '#020617'], tone: 'light', accent: '#94a3b8' },
  { key: 'cream',    name: 'Cream',    gradient: ['#fef3c7', '#fcd34d'], tone: 'dark',  accent: '#92400e' },
  { key: 'mist',     name: 'Mist',     gradient: ['#f1f5f9', '#cbd5e1'], tone: 'dark',  accent: '#334155' }
]

// ===========================================================================
// PATTERNS
// `svg(tone)` returns a data URI for the given tone ('light' → white,
// 'dark' → black). The {FILL} placeholder is substituted with the right
// color. Callers should cache results per (key, tone) pair.
// ===========================================================================
const svgTile = (inner, size = 20, tone = 'light') => {
  const fill = tone === 'dark' ? 'black' : 'white'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${inner.replace(/\{FILL\}/g, fill)}</svg>`
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
}

export const PATTERNS = [
  { key: 'none',     name: 'None' },
  { key: 'dots',     name: 'Dots',       svg: (tone) => svgTile(`<circle cx='2' cy='2' r='1.2' fill='{FILL}'/><circle cx='12' cy='12' r='1.2' fill='{FILL}'/>`, 20, tone) },
  { key: 'grid',     name: 'Grid',       svg: (tone) => svgTile(`<path d='M0 10h20M10 0v20' stroke='{FILL}' stroke-width='0.6' fill='none' opacity='0.9'/>`, 20, tone) },
  { key: 'diagonal', name: 'Stripes',    svg: (tone) => svgTile(`<path d='M-5 20 L20 -5 M0 25 L25 0' stroke='{FILL}' stroke-width='1.2' fill='none'/>`, 20, tone) },
  { key: 'waves',    name: 'Waves',      svg: (tone) => svgTile(`<path d='M0 12 Q5 6 10 12 T20 12' stroke='{FILL}' stroke-width='0.8' fill='none'/>`, 20, tone) },
  { key: 'rings',    name: 'Rings',      svg: (tone) => svgTile(`<circle cx='10' cy='10' r='6' stroke='{FILL}' stroke-width='0.6' fill='none'/>`, 20, tone) },
  { key: 'chevrons', name: 'Chevrons',   svg: (tone) => svgTile(`<path d='M0 4 L4 0 L8 4 M8 12 L12 8 L16 12' stroke='{FILL}' stroke-width='0.8' fill='none'/>`, 16, tone) },
  { key: 'hexagons', name: 'Hexagons',   svg: (tone) => svgTile(`<path d='M6 1 L14 1 L18 8 L14 15 L6 15 L2 8 Z' stroke='{FILL}' stroke-width='0.5' fill='none'/>`, 20, tone) }
]

// ===========================================================================
// ICONS
// Grouped for the picker. Every entry maps a key to a lucide component.
// `letter` is a special key handled by the card — it shows the first
// letter of the account name.
// ===========================================================================
export const ICONS = [
  // Banking
  { key: 'bank',      name: 'Bank',       category: 'Banking',  component: Landmark },
  { key: 'building',  name: 'Building',   category: 'Banking',  component: Building2 },
  { key: 'vault',     name: 'Vault',      category: 'Banking',  component: Lock },

  // Wallets & cards
  { key: 'wallet',    name: 'Wallet',     category: 'Wallets',  component: Wallet },
  { key: 'card',      name: 'Card',       category: 'Wallets',  component: CreditCard },
  { key: 'phone',     name: 'Phone',      category: 'Wallets',  component: Smartphone },

  // Savings
  { key: 'piggy',     name: 'Piggy Bank', category: 'Savings',  component: PiggyBank },
  { key: 'coins',     name: 'Coins',      category: 'Savings',  component: Coins },
  { key: 'banknote',  name: 'Banknote',   category: 'Savings',  component: Banknote },
  { key: 'shield',    name: 'Insurance',  category: 'Savings',  component: Shield },

  // Goals
  { key: 'plane',     name: 'Travel',     category: 'Goals',    component: Plane },
  { key: 'home',      name: 'Home',       category: 'Goals',    component: Home },
  { key: 'car',       name: 'Car',        category: 'Goals',    component: Car },
  { key: 'briefcase', name: 'Work',       category: 'Goals',    component: Briefcase },
  { key: 'gift',      name: 'Gift',       category: 'Goals',    component: Gift },
  { key: 'bag',       name: 'Shopping',   category: 'Goals',    component: ShoppingBag },
  { key: 'school',    name: 'Education',  category: 'Goals',    component: GraduationCap },

  // Other
  { key: 'store',     name: 'Store',      category: 'Other',    component: Store },
  { key: 'star',      name: 'Star',       category: 'Other',    component: Star },
  { key: 'heart',     name: 'Heart',      category: 'Other',    component: Heart },
  { key: 'globe',     name: 'Global',     category: 'Other',    component: Globe },
  { key: 'invest',    name: 'Invest',     category: 'Other',    component: TrendingUp },
  { key: 'sparkle',   name: 'Sparkle',    category: 'Other',    component: Sparkles },
  { key: 'activity',  name: 'Activity',   category: 'Other',    component: Activity },

  // Letter avatar (special — resolved by the card, not an icon component)
  { key: 'letter',    name: 'First Letter', category: 'Other',  component: null }
]

// ===========================================================================
// LOOKUPS — always go through these. Never read a raw key directly.
// Each returns the fallback when the key is missing or unknown.
// ===========================================================================
const DEFAULT_THEME   = COLOR_THEMES.find(t => t.key === 'slate')
const DEFAULT_PATTERN = PATTERNS.find(p => p.key === 'none')
const DEFAULT_ICON    = ICONS.find(i => i.key === 'bank')

export const getColorTheme = (key) =>
  COLOR_THEMES.find(t => t.key === key && !t.retired) || DEFAULT_THEME

export const getPattern = (key) =>
  PATTERNS.find(p => p.key === key) || DEFAULT_PATTERN

export const getIcon = (key) =>
  ICONS.find(i => i.key === key) || DEFAULT_ICON

export const getIconsByCategory = () => {
  const groups = {}
  ICONS.forEach(icon => {
    if (!groups[icon.category]) groups[icon.category] = []
    groups[icon.category].push(icon)
  })
  return groups
}