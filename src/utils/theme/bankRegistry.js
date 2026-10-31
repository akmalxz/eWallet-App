// src/utils/theme/bankRegistry.js

export const BANK_REGISTRY = [
    { key: 'maybank', label: 'Maybank', pattern: /maybank|mbb|malayan banking/i, logo: '/banks/maybank.jpeg' },
    { key: 'tng', label: 'Touch n Go', pattern: /tng|touch\s*n\s*go|touchn\s*go/i, logo: '/banks/tng.jpeg' },
    { key: 'cimb', label: 'CIMB', pattern: /cimb/i, logo: '/banks/cimb.png' },
    { key: 'rhb', label: 'RHB', pattern: /rhb/i, logo: '/banks/rhb.jpeg' },
    { key: 'gxbank', label: 'GXBank', pattern: /gx\s*bank|gxbank/i, logo: '/banks/gxbank.jpeg' },
    { key: 'hong_leong', label: 'Hong Leong', pattern: /hong\s*leong|hlb/i, logo: '/banks/hongleong.jpeg' },
    { key: 'bank_islam', label: 'Bank Islam', pattern: /bank\s*islam|bis/i, logo: '/banks/bank-islam.jpeg' },
    { key: 'bank_rakyat', label: 'Bank Rakyat', pattern: /bank\s*rakyat/i, logo: '/banks/bankrakyat.png' },
    { key: 'bsn', label: 'BSN', pattern: /bsn|bank\s*simpanan/i, logo: '/banks/bsn.png' },
    { key: 'ambank', label: 'AmBank', pattern: /ambank|am\s*bank/i, logo: '/banks/ambank.jpeg' },
    { key: 'asnb', label: 'ASNB', pattern: /asnb|asb|asm/i, logo: '/banks/asnb.png' },
    { key: 'aeon', label: 'AEON Bank', pattern: /aeon/i, logo: '/banks/aeon-bank.png' },
    { key: 'tabung_haji', label: 'Tabung Haji', pattern: /tabung\s*haji|th/i, logo: '/banks/tabung-haji.jpeg' },
    { key: 'setel', label: 'Setel', pattern: /setel/i, logo: '/banks/setel.png' },
    { key: 'ryt_bank', label: 'Ryt Bank', pattern: /ryt\s*bank|ryt/i, logo: '/banks/ryt-bank.png' },
]

/**
 * Detects a bank logo based on the account name.
 * @param {string} accountName 
 * @returns {string|null} The path to the SVG logo, or null if no match.
 */
export const detectBankLogo = (accountName) => {
  if (!accountName) return null
  const match = BANK_REGISTRY.find(bank => bank.pattern.test(accountName))
  return match ? match.logo : null
}