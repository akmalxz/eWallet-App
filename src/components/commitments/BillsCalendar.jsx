// src/components/commitments/BillsCalendar.jsx
import { useMemo, useState } from 'react'
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp
} from 'lucide-react'
import { toMYDate, dayKey, dueDateForMonth, daysInMonth, WEEKDAY_LABELS } from '../../utils/dateHelpers'

const keyFromMY = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
const weekdayShort = (label) => label.slice(0, 1)

function StripView({ days, selectedDate, onSelectDate }) {
  return (
    <div className="flex items-stretch gap-1.5 py-3 overflow-x-auto scrollbar-hide">
      {days.map((d) => {
        const isSelected = selectedDate === d.key
        const isToday = d.isToday

        const containerClasses = [
          'relative flex-1 min-w-[44px] flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all shrink-0',
          isToday
            ? 'bg-fg text-fg-inverse shadow-md'
            : isSelected
              ? 'bg-surface-2 text-fg'
              : 'hover:bg-surface-2 text-fg-muted'
        ].join(' ')

        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onSelectDate(d.key)}
            aria-label={`${WEEKDAY_LABELS[d.weekday]} ${d.day}`}
            aria-pressed={isSelected}
            className={containerClasses}
          >
            <span className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? 'text-fg-inverse/70' : 'text-fg-subtle'}`}>
              {weekdayShort(WEEKDAY_LABELS[d.weekday])}
            </span>
            <span className={`text-sm font-black leading-none ${isToday ? 'text-fg-inverse' : 'text-fg'}`}>
              {d.day}
            </span>
            <span className="h-1.5 flex items-center justify-center">
              {d.hasUnpaid && <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-danger-solid ring-1 ring-fg-inverse/50' : 'bg-danger-solid'}`} />}
              {!d.hasUnpaid && d.hasPaidOnly && <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-success ring-1 ring-fg-inverse/50' : 'bg-success'}`} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MonthView({ cells, monthLabel, selectedDate, onSelectDate, onPrev, onNext }) {
  return (
    <div className="py-3 space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrev} className="w-10 h-10 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-fg tracking-tight">{monthLabel}</span>
        <button type="button" onClick={onNext} className="w-10 h-10 flex items-center justify-center rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-2 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="text-[10px] font-bold text-fg-subtle text-center uppercase tracking-wider">
              {weekdayShort(label)}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`blank-${i}`} className="aspect-square" />
            const isSelected = selectedDate === cell.key
            const isToday = cell.isToday
            const hasData = cell.total > 0

            return (
              <div key={cell.key} className="aspect-square p-0.5">
                <button
                  type="button"
                  onClick={() => onSelectDate(cell.key)}
                  className={`relative w-full h-full rounded-xl flex items-center justify-center transition-all ${
                    isToday ? 'bg-brand-soft text-brand' 
                    : isSelected ? 'bg-surface-2 text-fg' 
                    : 'text-fg-muted hover:bg-surface-2'
                  }`}
                >
                  <span className="text-[13px] font-bold leading-none">{cell.day}</span>
                  {hasData && (
                    <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${cell.hasUnpaid ? 'bg-danger-solid' : 'bg-success'}`} />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export const BillsCalendar = ({ schedule, payments = [], commitments = [], selectedDate, onSelectDate, todayKey }) => {
  const [expanded, setExpanded] = useState(false)
  const [expandedMonth, setExpandedMonth] = useState(() => {
    const now = toMYDate(new Date())
    return { year: now.getUTCFullYear(), monthIdx: now.getUTCMonth() }
  })

  const today = todayKey || dayKey(new Date())

  const daysWithBills = useMemo(() => {
    const map = new Map()
    const get = (key) => {
      if (!map.has(key)) map.set(key, { unpaid: 0, paid: 0, unpaidTotal: 0, paidTotal: 0 })
      return map.get(key)
    }
    for (const p of schedule?.unpaidPeriods || []) {
      const k = dayKey(p.dueDate)
      const entry = get(k)
      entry.unpaid += 1
      entry.unpaidTotal += p.amount
    }
    for (const pmt of payments) {
      if (pmt.status !== 'paid') continue
      const comm = commitments.find(c => c.id === pmt.commitment_id)
      if (!comm || comm.due_day_of_month == null) continue
      const due = dueDateForMonth(comm.due_day_of_month, pmt.period_year, pmt.period_month - 1)
      const k = dayKey(due)
      const entry = get(k)
      entry.paid += 1
      entry.paidTotal += Number(comm.amount) || 0
    }
    return map
  }, [schedule, payments, commitments])

  const stripDays = useMemo(() => {
    const parts = String(selectedDate || '').split('-').map(Number)
    const [sy, sm, sd] = parts
    if (!sy || !sm || !sd) return []
    const out = []
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(Date.UTC(sy, sm - 1, sd + offset))
      const k = keyFromMY(d)
      const info = daysWithBills.get(k) || { unpaid: 0, paid: 0 }
      const jsDow = d.getUTCDay()
      out.push({
        key: k,
        day: d.getUTCDate(),
        weekday: jsDow === 0 ? 6 : jsDow - 1,
        isToday: k === today,
        hasUnpaid: info.unpaid > 0,
        hasPaidOnly: info.unpaid === 0 && info.paid > 0
      })
    }
    return out
  }, [daysWithBills, today, selectedDate])

  const monthGrid = useMemo(() => {
    const { year, monthIdx } = expandedMonth
    const dim = daysInMonth(year, monthIdx)
    const firstDow = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay()
    const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1
    const cells = []
    for (let i = 0; i < leadingBlanks; i++) cells.push(null)
    for (let d = 1; d <= dim; d++) {
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const info = daysWithBills.get(key) || { unpaid: 0, paid: 0, unpaidTotal: 0, paidTotal: 0 }
      cells.push({
        day: d, key,
        isToday: key === today,
        hasUnpaid: info.unpaid > 0,
        hasPaidOnly: info.unpaid === 0 && info.paid > 0,
        total: info.unpaidTotal + info.paidTotal
      })
    }
    const monthLabel = new Date(Date.UTC(year, monthIdx, 1)).toLocaleString('en-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return { cells, monthLabel }
  }, [expandedMonth, daysWithBills, today])

  const goPrevMonth = () => setExpandedMonth(prev => prev.monthIdx === 0 ? { year: prev.year - 1, monthIdx: 11 } : { year: prev.year, monthIdx: prev.monthIdx - 1 })
  const goNextMonth = () => setExpandedMonth(prev => prev.monthIdx === 11 ? { year: prev.year + 1, monthIdx: 0 } : { year: prev.year, monthIdx: prev.monthIdx + 1 })

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-fg-subtle uppercase tracking-wider hover:opacity-80 transition-opacity"
      >
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          {expanded ? 'Month view' : 'This week'}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded ? (
        <MonthView cells={monthGrid.cells} monthLabel={monthGrid.monthLabel} selectedDate={selectedDate} onSelectDate={onSelectDate} onPrev={goPrevMonth} onNext={goNextMonth} />
      ) : (
        <StripView days={stripDays} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      )}
    </div>
  )
}