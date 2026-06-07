import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../..')

function findFiles(dirs: string[], ext: string): string[] {
  const results: string[] = []
  for (const dir of dirs) {
    const fullDir = path.join(ROOT, dir)
    if (!fs.existsSync(fullDir)) continue
    const entries = fs.readdirSync(fullDir, { recursive: true, withFileTypes: false }) as string[]
    for (const entry of entries) {
      if (entry.endsWith(ext)) {
        results.push(path.join(fullDir, entry))
      }
    }
  }
  return results
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

function relativePath(filePath: string): string {
  return path.relative(ROOT, filePath)
}

describe('UI smoke tests (static analysis)', () => {
  it('should not contain bare "Loading..." strings in app/ or components/', () => {
    const files = [
      ...findFiles(['app/play'], '.tsx'),
      ...findFiles(['components'], '.tsx'),
    ]
    const offending: string[] = []

    for (const file of files) {
      const content = readFile(file)
      // Match patterns like >Loading...</, {'Loading...'}, or standalone "Loading..." as visible text
      if (
        />\s*Loading\.\.\.\s*</.test(content) ||
        /[{'"]\s*Loading\.\.\.\s*['"}]/.test(content)
      ) {
        offending.push(relativePath(file))
      }
    }

    expect(offending, `Files with bare "Loading..." text:\n${offending.join('\n')}`).toEqual([])
  })

  it('should not contain third-party product names in any .ts or .tsx file', () => {
    const files = [
      ...findFiles(['app', 'components', 'lib'], '.tsx'),
      ...findFiles(['app', 'components', 'lib'], '.ts'),
    ]
    const offending: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (rel.includes('__tests__')) continue
      const content = readFile(file)
      if (content.includes('Climat' + 'eOS')) {
        offending.push(rel)
      }
    }

    expect(offending, `Files containing third-party product name:\n${offending.join('\n')}`).toEqual([])
  })

  it('should not reference deprecated field names (predictions_locked, round_locked, current_round)', () => {
    const files = [
      ...findFiles(['app', 'components'], '.tsx'),
      ...findFiles(['app', 'components'], '.ts'),
    ]
    const deprecatedFields = ['predictions_locked', 'round_locked', 'current_round']
    const offending: { file: string; fields: string[] }[] = []

    for (const file of files) {
      const rel = relativePath(file)
      // Exclude HANDOVER.md and test files
      if (rel.includes('HANDOVER.md') || rel.includes('.test.') || rel.includes('__tests__')) {
        continue
      }

      const content = readFile(file)
      const found = deprecatedFields.filter((field) => content.includes(field))
      if (found.length > 0) {
        offending.push({ file: rel, fields: found })
      }
    }

    const message = offending
      .map((o) => `${o.file}: [${o.fields.join(', ')}]`)
      .join('\n')

    expect(
      offending,
      `Files referencing deprecated field names:\n${message}`,
    ).toEqual([])
  })

  it('should not use leftover old design system classes (glass-card, glow-*)', () => {
    const files = [
      ...findFiles(['app', 'components'], '.tsx'),
    ]
    const offending: { file: string; matches: string[] }[] = []

    for (const file of files) {
      const content = readFile(file)
      const matches: string[] = []

      if (/glass-card/.test(content)) {
        matches.push('glass-card')
      }
      if (/glow-\w+/.test(content)) {
        const glowMatches = content.match(/glow-\w+/g) ?? []
        matches.push(...new Set(glowMatches))
      }

      if (matches.length > 0) {
        offending.push({ file: relativePath(file), matches })
      }
    }

    const message = offending
      .map((o) => `${o.file}: [${o.matches.join(', ')}]`)
      .join('\n')

    expect(
      offending,
      `Files using deprecated design system classes:\n${message}`,
    ).toEqual([])
  })

  it('should not use hardcoded hex colors outside globals.css and design-refs/', () => {
    const files = [
      ...findFiles(['app', 'components'], '.tsx'),
    ]
    const offending: { file: string; colors: string[] }[] = []

    // Allowlist: OG image generator must use inline styles (no CSS vars in satori)
    const allowlist = ['app/opengraph-image.tsx']

    for (const file of files) {
      const rel = relativePath(file)
      if (allowlist.some((a) => rel.endsWith(a))) continue
      if (rel.includes('__tests__')) continue

      const content = readFile(file)
      // Match hex colors in className strings or style objects
      // Captures #xxx, #xxxx, #xxxxxx, #xxxxxxxx patterns in brackets [#...]
      const hexInBrackets = content.match(/\[#[0-9a-fA-F]{3,8}\]/g) ?? []
      // Also match inline style hex: '#xxxxxx'
      const hexInStyle = content.match(/['"]#[0-9a-fA-F]{3,8}['"]/g) ?? []
      const allHex = [...new Set([...hexInBrackets, ...hexInStyle])]

      if (allHex.length > 0) {
        offending.push({ file: rel, colors: allHex })
      }
    }

    const message = offending
      .map((o) => `${o.file}: ${o.colors.join(', ')}`)
      .join('\n')

    expect(
      offending,
      `Files with hardcoded hex colors (use design tokens instead):\n${message}`,
    ).toEqual([])
  })
})
