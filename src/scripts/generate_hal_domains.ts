import fs from 'node:fs'
import path from 'node:path'
import { XMLParser } from 'fast-xml-parser'

type HalDoc = {
  docid?: number
  parent_i?: number
  level_i?: number
  code_s?: string
  fr_domain_s?: string
  en_domain_s?: string
}

export type HalDomainNode = {
  code: string
  parent: string | null
  level: number
  labels: { fr?: string; en?: string }
  children: string[]
}

const SOURCE_URL =
  'https://api-preprod.archives-ouvertes.fr/ref/domain/?fl=*&wt=xml&rows=1000'

const OUT_FILE = path.join(process.cwd(), 'src/app/types/HalDomains.ts')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
})

const toText = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (
    typeof v === 'object' &&
    v !== null &&
    '#text' in (v as Record<string, unknown>)
  ) {
    return String((v as Record<string, unknown>)['#text']).trim()
  }
  return String(v).trim()
}

const toNumber = (v: unknown): number | undefined => {
  const t = toText(v)
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

const normalizeDoc = (doc: Record<string, unknown>): HalDoc => {
  const out: HalDoc = {}

  const buckets = ['str', 'int', 'bool', 'date', 'long'] as const
  for (const bucket of buckets) {
    const items = doc[bucket]
    if (!items) continue

    const arr: unknown[] = Array.isArray(items) ? items : [items]
    for (const it of arr) {
      if (typeof it !== 'object' || it === null) continue
      const obj = it as Record<string, unknown>
      const name = toText(obj.name)
      if (!name) continue

      if (name === 'code_s') out.code_s = toText(obj['#text'] ?? obj)
      if (name === 'fr_domain_s') out.fr_domain_s = toText(obj['#text'] ?? obj)
      if (name === 'en_domain_s') out.en_domain_s = toText(obj['#text'] ?? obj)
      if (name === 'docid') out.docid = toNumber(obj['#text'] ?? obj)
      if (name === 'parent_i') out.parent_i = toNumber(obj['#text'] ?? obj)
      if (name === 'level_i') out.level_i = toNumber(obj['#text'] ?? obj)
    }
  }

  return out
}

const buildTree = (byCode: Record<string, HalDomainNode>): HalDomainNode[] => {
  // Ensure children arrays exist on all nodes
  for (const code of Object.keys(byCode)) {
    if (!Array.isArray(byCode[code].children)) byCode[code].children = []
  }

  const roots: string[] = []

  for (const code of Object.keys(byCode)) {
    const parent = byCode[code].parent
    if (parent && byCode[parent]) {
      byCode[parent].children.push(code)
    } else {
      roots.push(code)
    }
  }

  const sortChildren = (code: string) => {
    const node = byCode[code]
    node.children.sort((a, b) => a.localeCompare(b))
    for (const c of node.children) sortChildren(c)
  }

  roots.sort((a, b) => a.localeCompare(b))
  for (const r of roots) sortChildren(r)

  return roots.map((code) => byCode[code])
}

const asTS = (value: unknown): string => JSON.stringify(value, null, 2)

async function main(): Promise<void> {
  const res = await fetch(SOURCE_URL)
  if (!res.ok) {
    throw new Error(`HAL domains fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()

  const parsed = parser.parse(xml) as Record<string, unknown>

  const response = parsed.response as Record<string, unknown> | undefined
  const result = response?.result as Record<string, unknown> | undefined
  const docRaw = result?.doc

  const docs: HalDoc[] = (Array.isArray(docRaw) ? docRaw : [docRaw])
    .filter(
      (x): x is Record<string, unknown> => typeof x === 'object' && x !== null,
    )
    .map(normalizeDoc)
    .filter((d) => !!d.code_s)

  // docid -> code (HAL parent_i is docid)
  const codeByDocId = new Map<number, string>()
  for (const d of docs) {
    if (typeof d.docid === 'number' && d.code_s) {
      codeByDocId.set(d.docid, d.code_s)
    }
  }

  // Build byCode with ALWAYS-present parent/children
  const halDomainsByCode: Record<string, HalDomainNode> = {}

  for (const d of docs) {
    const code = d.code_s
    if (!code) continue

    const parentCode =
      typeof d.parent_i === 'number' ? codeByDocId.get(d.parent_i) : undefined

    halDomainsByCode[code] = {
      code,
      parent: parentCode ?? null,
      level: typeof d.level_i === 'number' ? d.level_i : 0,
      labels: {
        fr: d.fr_domain_s?.trim() || undefined,
        en: d.en_domain_s?.trim() || undefined,
      },
      children: [],
    }
  }

  const halDomainTree = buildTree(halDomainsByCode)

  const out = `/* eslint-disable */
// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
// Source: ${SOURCE_URL}

export type HalDomainNode = {
  code: string;
  parent: string | null;
  level: number;
  labels: { fr?: string; en?: string };
  children: string[];
};

export const halDomainsByCode = ${asTS(halDomainsByCode)} as const;

export const halDomainTree: HalDomainNode[] = ${asTS(halDomainTree)};
`

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, out, 'utf-8')

  // eslint-disable-next-line no-console
  console.log(
    `Generated HAL domains: ${Object.keys(halDomainsByCode).length} -> ${path.relative(
      process.cwd(),
      OUT_FILE,
    )}`,
  )
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})
