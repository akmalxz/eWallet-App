// src/utils/nlpParser.js
export class TransactionParser {
  constructor(accountDict, categories) { 
    this.accountDict = accountDict 
    this.categories = categories || []
  }
  
  findAccountId(name) {
    if (!name || Object.keys(this.accountDict).length === 0) return null
    const normalized = name.toLowerCase().trim()
    if (this.accountDict[normalized]) return this.accountDict[normalized]
    for (const [key, uuid] of Object.entries(this.accountDict)) {
      if (normalized.includes(key) || key.includes(normalized)) return uuid
    }
    return null
  }
  
  extractAmount(text) {
    // Handle amounts with commas (e.g., "RM 1,200.50")
    const commaPattern = /(?:rm|myr|ringgit)?\s*([\d,]+\.\d{2})/i
    const commaMatch = text.match(commaPattern)
    if (commaMatch) return parseFloat(commaMatch[1].replace(/,/g, ''))

    // Handle amounts with no comma
    const patterns = [
      /(?:rm|myr|ringgit)?\s*([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)?/i,
      /([\d,]+\.?\d*)\s*(?:rm|myr|ringgit)/i,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return parseFloat(match[1].replace(/,/g, ''))
    }
    return null
  }
  
  extractCategory(text) {
    if (this.categories.length === 0) return 'uncategorized'
    const lowerText = text.toLowerCase()
    
    // Look for subcategories first (categories with parent_id)
    const subCategories = this.categories.filter(c => c.parent_id)
    for (const sub of subCategories) {
      // Check if text contains the subcategory name
      if (lowerText.includes(sub.name.toLowerCase())) {
        const parent = this.categories.find(c => c.id === sub.parent_id)
        return parent ? `${parent.name} > ${sub.name}` : sub.name
      }
      // Also check keywords if available
      if (sub.keywords && Array.isArray(sub.keywords)) {
        for (const keyword of sub.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            const parent = this.categories.find(c => c.id === sub.parent_id)
            return parent ? `${parent.name} > ${sub.name}` : sub.name
          }
        }
      }
    }
    
    // Fallback to main categories (parent_id is null)
    const mainCategories = this.categories.filter(c => !c.parent_id)
    for (const main of mainCategories) {
      // Check name
      if (lowerText.includes(main.name.toLowerCase())) {
        return main.name
      }
      // Check keywords if available
      if (main.keywords && Array.isArray(main.keywords)) {
        for (const keyword of main.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            return main.name
          }
        }
      }
    }
    return 'uncategorized'
  }

  validateCategory(category) {
    if (!category || category === 'uncategorized') {
      return { valid: true, normalizedCategory: 'uncategorized' }
    }

    // Check exact match
    const exactMatch = this.categories.find(c => c.name === category)
    if (exactMatch) {
      return { valid: true, normalizedCategory: category }
    }

    // Check hierarchical match (e.g., "Food & Beverages > Lunch")
    const parts = category.split(' > ')
    if (parts.length === 2) {
      const [parentName, childName] = parts
      const parent = this.categories.find(c => c.name === parentName && !c.parent_id)
      if (parent) {
        const child = this.categories.find(c => c.name === childName && c.parent_id === parent.id)
        if (child) {
          return { valid: true, normalizedCategory: `${parentName} > ${childName}` }
        }
      }
    }

    return { valid: false, normalizedCategory: 'uncategorized' }
  }
  
  parse(text) {
    const normalizedText = text.trim()
    const result = { 
      amount: null, 
      sourceAccountId: null, 
      destinationAccountId: null, 
      category: 'uncategorized', 
      description: '', 
      type: 'expense',
      needsReview: false
    }
    
    result.amount = this.extractAmount(normalizedText)
    if (!result.amount) throw new Error('Could not find amount.')

    const lowerText = normalizedText.toLowerCase()
    const isTransfer = /(?:move|transfer|send|pindah|from).*?(?:to|into|ke|->)/i.test(lowerText)
    const isIncome = /(?:received|got|income|salary|deposit)/i.test(lowerText)
    const isExpense = /(?:spent|paid|bought|purchase|expense)/i.test(lowerText)

    const fromToMatch = normalizedText.match(/(?:from|dari)\s+([a-zA-Z\s]+?)(?:\s+to\s+|\s+into\s+|\s+->\s+|\s+ke\s+)([a-zA-Z\s]+)/i)
    const atMatch = normalizedText.match(/(?:at|di|pada)\s+([a-zA-Z\s]+?)(?:\s+for\s+|\s+-\s+|\s*$)/i)
    
    if (isTransfer && fromToMatch) {
      result.sourceAccountId = this.findAccountId(fromToMatch[1])
      result.destinationAccountId = this.findAccountId(fromToMatch[2])
      result.type = 'transfer'
    } else if (isExpense && atMatch) {
      result.sourceAccountId = this.findAccountId(atMatch[1])
      result.type = 'expense'
    } else {
      for (const acc of Object.keys(this.accountDict)) {
        if (lowerText.includes(acc)) {
          if (isExpense || isTransfer) result.sourceAccountId = this.accountDict[acc]
          else if (isIncome) result.destinationAccountId = this.accountDict[acc]
          break
        }
      }
    }
    if (!result.sourceAccountId && !result.destinationAccountId) {
      throw new Error('Could not identify any account.')
    }
    
    const extractedCategory = this.extractCategory(normalizedText)
    const validation = this.validateCategory(extractedCategory)
    result.category = validation.valid ? validation.normalizedCategory : 'uncategorized'
    result.needsReview = !validation.valid || result.category === 'uncategorized'
    
    result.description = normalizedText
      .replace(/RM\s*[\d,]+\.?\d*/g, '')
      .replace(/[\d,]+\.?\d*/g, '')
      .replace(/(?:from|to|at|into|for|dari|ke|di|pada)\s+[a-zA-Z\s]+/gi, '')
      .trim() || `${result.type} ${result.amount}`
    
    return result
  }
}