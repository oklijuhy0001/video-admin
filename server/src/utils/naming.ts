import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

let names: string[] = []

export const loadNames = (): void => {
  const pattern = path.join(__dirname, '../../data/*.txt')
  const files = glob.sync(pattern)

  if (files.length === 0) {
    throw new Error(`No .txt files found in data/ directory (pattern: ${pattern})`)
  }

  names = files.flatMap((f) =>
    fs
      .readFileSync(f, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  )

  if (names.length === 0) {
    throw new Error('All .txt files are empty — no names loaded')
  }

  console.log(`✅ Loaded ${names.length} names from ${files.length} file(s)`)
}

export const getName = (totalVideos: number): string => {
  if (names.length === 0) throw new Error('Names not loaded — call loadNames() first')
  return names[totalVideos % names.length]
}

export const getNames = (): string[] => names
