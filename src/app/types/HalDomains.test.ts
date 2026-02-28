import {
  HalDomainNode,
  halDomainsByCode,
  halDomainTree,
} from '@/types/HalDomains'

describe('HalDomains', () => {
  describe('anchors (hard-coded stable content)', () => {
    it('contains expected root "chim" with stable labels and children', () => {
      expect(halDomainsByCode.chim).toEqual({
        code: 'chim',
        parent: null,
        level: 0,
        labels: {
          fr: 'Chimie',
          en: 'Chemical Sciences',
        },
        children: [
          'chim.anal',
          'chim.cata',
          'chim.chem',
          'chim.coor',
          'chim.cris',
          'chim.geni',
          'chim.inor',
          'chim.mate',
          'chim.orga',
          'chim.othe',
          'chim.poly',
          'chim.radio',
          'chim.theo',
          'chim.ther',
        ],
      })
    })

    it('contains expected leaf "chim.anal"', () => {
      expect(halDomainsByCode['chim.anal']).toEqual({
        children: [],
        code: 'chim.anal',
        parent: 'chim',
        level: 1,
        labels: {
          fr: 'Chimie/Chimie analytique',
          en: 'Chemical Sciences/Analytical chemistry',
        },
      })
    })

    it('contains expected leaf "chim.orga"', () => {
      expect(halDomainsByCode['chim.orga']).toEqual({
        code: 'chim.orga',
        children: [],
        parent: 'chim',
        level: 1,
        labels: {
          fr: 'Chimie/Chimie organique',
          en: 'Chemical Sciences/Organic chemistry',
        },
      })
    })
  })

  describe('global invariants (catch generator regressions)', () => {
    it('has non-empty indices and tree', () => {
      expect(Object.keys(halDomainsByCode).length).toBeGreaterThan(100)
      expect(halDomainTree.length).toBeGreaterThan(1)
    })

    it('every node is self-consistent (key equals node.code)', () => {
      for (const [code, node] of Object.entries(halDomainsByCode)) {
        expect(node.code).toBe(code)
      }
    })

    it('every parent reference exists', () => {
      for (const node of Object.values(halDomainsByCode)) {
        if (node.parent) {
          expect(
            halDomainsByCode[node.parent as keyof typeof halDomainsByCode],
          ).toBeDefined()
        }
      }
    })

    it('every child reference exists and points back to parent', () => {
      for (const node of Object.values(halDomainsByCode)) {
        if (!node.children) continue
        for (const childCode of node.children) {
          const child =
            halDomainsByCode[childCode as keyof typeof halDomainsByCode]
          expect(child).toBeDefined()
          expect(child.parent).toBe(node.code)
          expect(child.level).toBeGreaterThan(node.level)
        }
      }
    })

    it('tree roots are level 0 nodes without parent, and are present in the map', () => {
      const rootsFromMap = Object.values(halDomainsByCode)
        .filter((n) => !n.parent && n.level === 0)
        .map((n) => n.code)
        .sort()

      const rootsFromTree = halDomainTree
        .map((n: HalDomainNode) => n.code)
        .sort()

      // We expect exact match because halDomainTree should list *only* roots.
      expect(rootsFromTree).toEqual(rootsFromMap)
    })

    it('tree edges match the map (children lists are identical for roots)', () => {
      for (const root of halDomainTree) {
        const fromMap =
          halDomainsByCode[root.code as keyof typeof halDomainsByCode]
        expect(fromMap).toBeDefined()
        expect(root.level).toBe(fromMap.level)
        expect(root.parent).toBeNull()
        expect(root.children ?? []).toEqual(fromMap.children ?? [])
      }
    })

    it('labels have at least one language (fr or en)', () => {
      for (const node of Object.values(halDomainsByCode)) {
        const hasFr = !!node.labels?.fr && node.labels.fr.trim().length > 0
        const hasEn = !!node.labels?.en && node.labels.en.trim().length > 0
        expect(hasFr || hasEn).toBe(true)
      }
    })
  })
})
