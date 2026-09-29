// src/components/shared/AccountSelector.jsx
import { Wallet } from 'lucide-react'

export const AccountSelector = ({
  accounts = [],
  value,
  onChange,
  label = 'Account',
  includeAll = true
}) => (
  <div className="relative">
    {/* Leading wallet icon */}
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      <Wallet className="w-4 h-4" />
    </div>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="appearance-none w-full bg-white/70 backdrop-blur-xl border border-white/60 rounded-xl py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all min-h-[48px]"
    >
      {includeAll && <option value="all">All accounts</option>}
      {accounts.map(a => (
        <option key={a.id} value={a.id}>
          {a.account_name}
        </option>
      ))}
    </select>

    {/* Trailing chevron */}
    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
      ▾
    </span>
  </div>
)