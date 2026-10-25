// src/components/shared/Collapse.jsx
export const Collapse = ({ open, children }) => {
  return (
    <div
      className={`grid transition-all duration-300 ease-in-out ${
        open
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  )
}