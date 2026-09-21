import '@testing-library/jest-dom/vitest'
import { STORAGE_KEY, resetLangForTests } from '../lib/i18n/locale'

// Test khẳng định chuỗi tiếng Việt, nên ép locale vi thay vì để jsdom đoán
// theo navigator.language. Màn tiếng Anh tự gọi setLang('en') trong test đó.
localStorage.setItem(STORAGE_KEY, 'vi')
resetLangForTests()
