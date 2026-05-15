import { describe, it, expect } from 'vitest'
import fs from 'fs'

// ── T019: Disclaimer presence test ───────────────────────────────────────────
describe('index.html disclaimer', () => {
  it('contains the exact disclaimer text', () => {
    const html = fs.readFileSync('index.html', 'utf8')
    expect(html).toContain(
      'ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง',
    )
  })

  it('contains a class="disclaimer" attribute', () => {
    const html = fs.readFileSync('index.html', 'utf8')
    expect(html).toContain('class="disclaimer"')
  })
})
