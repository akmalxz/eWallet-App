// src/components/shared/AnimatedNumber.jsx
import { useEffect, useRef, useState } from 'react'

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function AnimatedNumber({ 
  value, 
  format = (val) => val, 
  duration = 800,
  className = '' 
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const startValue = useRef(value)
  const startTime = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    // If the value hasn't changed, do nothing
    if (startValue.current === value) return

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = timestamp - startTime.current
      const percentage = Math.min(progress / duration, 1)

      const easedProgress = easeOutExpo(percentage)
      const currentVal = startValue.current + (value - startValue.current) * easedProgress

      setDisplayValue(currentVal)

      if (percentage < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        startValue.current = value
        startTime.current = null
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return (
    <span className={`tabular-figures ${className}`}>
      {format(displayValue)}
    </span>
  )
}