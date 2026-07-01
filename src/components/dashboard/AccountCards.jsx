// src/components/dashboard/AccountCards.jsx
import { Wallet, Landmark, Activity, PiggyBank, Database } from 'lucide-react'
import { formatMYR, getAccountIcon } from '../../utils/formatters'

const ICON_MAP = { 
  Landmark, 
  Wallet, 
  Activity, 
  PiggyBank, 
  Database 
}

export const AccountCards = ({ accounts, classifications }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {accounts.map(acc => {
        const { Icon, color, bg } = getAccountIcon(acc.classification, classifications, ICON_MAP)
        const IconComponent = Icon || Wallet
        
        return (
          // ✅ Using consistent 'id' field
          <div key={acc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between mb-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <IconComponent className={`${color} w-5 h-5`} />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium truncate">{acc.account_name}</h3>
            <p className="text-xl font-bold mt-1 text-slate-900">{formatMYR(acc.balance)}</p>
          </div>
        )
      })}
    </div>
  )
}