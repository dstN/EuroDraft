import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const I18N_LOCALES_DIR = join(ROOT, 'i18n', 'locales')

const TARGET_LOCALES = [
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ru', name: 'Russian' }
]

async function translateWithGemini(sourceJson: Record<string, unknown>, targetLang: string, apiKey: string): Promise<Record<string, unknown>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const prompt = `You are a professional localization expert for sports video games.
Translate the following JSON UI strings from English to ${targetLang}.
Preserve all {placeholder} and {{variable}} tokens exactly as they are.
Return ONLY valid JSON matching the exact same schema.

Source JSON:
${JSON.stringify(sourceJson, null, 2)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('No candidate returned from Gemini')
  return JSON.parse(rawText)
}

async function main() {
  console.log('🌐 EuroDraft Localization Pipeline\n')

  if (!existsSync(I18N_LOCALES_DIR)) {
    await mkdir(I18N_LOCALES_DIR, { recursive: true })
  }

  const enPath = join(I18N_LOCALES_DIR, 'en.json')
  const enContent = JSON.parse(await readFile(enPath, 'utf8'))
  const apiKey = process.env.GEMINI_API_KEY

  for (const { code, name } of TARGET_LOCALES) {
    const targetPath = join(I18N_LOCALES_DIR, `${code}.json`)

    if (apiKey) {
      try {
        console.log(`Translating to ${name} (${code}) using Gemini Flash API...`)
        const translated = await translateWithGemini(enContent, name, apiKey)
        await writeFile(targetPath, JSON.stringify(translated, null, 2), 'utf8')
        console.log(`✓ ${code}.json updated\n`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`! Gemini translation failed for ${code}: ${msg}. Keeping current translation.\n`)
      }
    } else {
      if (!existsSync(targetPath)) {
        await writeFile(targetPath, JSON.stringify(enContent, null, 2), 'utf8')
        console.log(`✓ Created placeholder ${code}.json`)
      }
    }
  }

  console.log('✅ Localization sync complete.')
}

main().catch(console.error)
