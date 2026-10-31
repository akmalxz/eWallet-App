// src/utils/accounts/accountClassifications.js

// Static account-type vocabulary. Not user-editable — no UI adds, edits,
// or removes classifications.
//
// `key_name` values must match the `classification` column values on
// `accounts` rows. The column is a PostgreSQL enum (account_classification),
// so adding a key here requires a matching `ALTER TYPE ... ADD VALUE`
// migration on the database first.
//
// `kind` splits the list for net-worth presentation:
//   - 'asset'     → contributes positively to net worth
//   - 'liability' → subtracted from net worth (credit cards, lines of credit)
export const CLASSIFICATIONS = [
  {
    key_name: 'hub',
    label: 'Main Hub',
    icon_name: 'Landmark',
    color_class: 'text-blue-500',
    bg_class: 'bg-blue-50',
    kind: 'asset'
  },
  {
    key_name: 'ewallet',
    label: 'Daily eWallet',
    icon_name: 'Wallet',
    color_class: 'text-purple-500',
    bg_class: 'bg-purple-50',
    kind: 'asset'
  },
  {
    key_name: 'digital_bank',
    label: 'Digital Bank',
    icon_name: 'Activity',
    color_class: 'text-emerald-500',
    bg_class: 'bg-emerald-50',
    kind: 'asset'
  },
  {
    key_name: 'savings',
    label: 'Savings',
    icon_name: 'PiggyBank',
    color_class: 'text-amber-500',
    bg_class: 'bg-amber-50',
    kind: 'asset'
  },
  {
    key_name: 'fixed_price_ut',
    label: 'ASB / ASM',
    icon_name: 'TrendingUp',
    color_class: 'text-sky-500',
    bg_class: 'bg-sky-50',
    kind: 'asset'
  },
  {
    key_name: 'pilgrimage',
    label: 'Tabung Haji',
    icon_name: 'Compass',
    color_class: 'text-teal-500',
    bg_class: 'bg-teal-50',
    kind: 'asset'
  },
  {
    key_name: 'investment',
    label: 'Investment',
    icon_name: 'BarChart3',
    color_class: 'text-violet-500',
    bg_class: 'bg-violet-50',
    kind: 'asset'
  },
  {
    key_name: 'credit',
    label: 'Credit Card',
    icon_name: 'CreditCard',
    color_class: 'text-rose-500',
    bg_class: 'bg-rose-50',
    kind: 'liability'
  }
]