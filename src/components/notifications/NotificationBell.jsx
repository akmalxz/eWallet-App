// src/components/notifications/NotificationBell.jsx
import { Bell } from 'lucide-react'

/**
 * Bell icon with optional red badge. Pure presentational — no data fetching,
 * no navigation. The parent owns both.
 *
 * @param {number} count - unread count. 0 hides the badge.
 * @param {boolean} active - true when the bell's target view is current.
 * @param {() => void} onOpen - click handler.
 */
export const NotificationBell = ({ count = 0, active = false, onOpen }) => {
  const hasBadge = count > 0
  const displayCount = count > 9 ? '9+' : count

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative p-2.5 rounded-full transition-colors ${
        active
          ? 'bg-brand-soft text-brand'
          : 'text-fg-subtle hover:bg-surface-2'
      }`}
      title={
        hasBadge
          ? `${count} pending request${count === 1 ? '' : 's'}`
          : 'Friend requests'
      }
      aria-label={
        hasBadge
          ? `Notifications, ${count} pending request${count === 1 ? '' : 's'}`
          : 'Notifications'
      }
    >
      <Bell className="w-4 h-4" />

      {hasBadge && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-solid text-white text-[10px] font-bold leading-none flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          {displayCount}
        </span>
      )}
    </button>
  )
}