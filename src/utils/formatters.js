// src/utils/formatters.js
export const formatMYR = (amount) => {
  return new Intl.NumberFormat('en-MY', { 
    style: 'currency', 
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const getAccountIcon = (classification, classifications, ICON_MAP) => {
  const classData = classifications.find(c => c.key_name === classification)
  const Icon = classData && ICON_MAP[classData.icon_name] ? ICON_MAP[classData.icon_name] : null
  const color = classData?.color_class || 'text-slate-500'
  const bg = classData?.bg_class || 'bg-slate-50'
  return { Icon, color, bg }
}