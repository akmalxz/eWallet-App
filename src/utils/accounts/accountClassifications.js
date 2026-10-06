// src/utils/accounts/accountClassifications.js

// Static account-type vocabulary. Not user-editable — no UI in the app
// adds, edits, or removes classifications. Previously this lived in the
// `classifications` table and was seeded per user; a fixed constant is
// a better fit for a fixed enum.
//
// `key_name` values must match the `classification` column values on
// `accounts` rows. Adding a new key here won't break existing rows, but
// removing one will orphan any accounts still referencing it.
export const CLASSIFICATIONS = [
  {
    key_name: 'hub',
    label: 'Main Hub',
    icon_name: 'Landmark',
    color_class: 'text-blue-500',
    bg_class: 'bg-blue-50'
  },
  {
    key_name: 'ewallet',
    label: 'Daily eWallet',
    icon_name: 'Wallet',
    color_class: 'text-purple-500',
    bg_class: 'bg-purple-50'
  },
  {
    key_name: 'digital_bank',
    label: 'Digital Bank',
    icon_name: 'Activity',
    color_class: 'text-emerald-500',
    bg_class: 'bg-emerald-50'
  },
  {
    key_name: 'savings',
    label: 'Savings',
    icon_name: 'PiggyBank',
    color_class: 'text-amber-500',
    bg_class: 'bg-amber-50'
  }
]