export const MAX_FILES = 10
export const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25MB
export const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
export const ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi']

export interface FileInfo {
  filename: string
  size: number
  type: string
  buffer: Buffer
}

export interface ValidationResult {
  valid: FileInfo[]
  errors: { filename: string; error: string }[]
  fatalError?: string
}

export const validateFiles = (files: FileInfo[]): ValidationResult => {
  if (files.length === 0) {
    return { valid: [], errors: [], fatalError: 'No files provided' }
  }

  if (files.length > MAX_FILES) {
    return {
      valid: [],
      errors: [],
      fatalError: `Too many files: ${files.length}. Maximum is ${MAX_FILES}.`,
    }
  }

  const valid: FileInfo[] = []
  const errors: { filename: string; error: string }[] = []

  for (const file of files) {
    if (file.size > MAX_SIZE_BYTES) {
      errors.push({ filename: file.filename, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max is 25MB.` })
      continue
    }

    const ext = '.' + file.filename.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push({ filename: file.filename, error: `Invalid file type. Allowed: mp4, webm, mov, avi` })
      continue
    }

    valid.push(file)
  }

  return { valid, errors }
}
