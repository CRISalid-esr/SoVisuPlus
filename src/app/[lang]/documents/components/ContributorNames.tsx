import { Fragment, MouseEvent, useState } from 'react'
import Highlighter, { HighlighterProps } from 'react-highlight-words'
import HighlighterWithEllipsis from '@/app/[lang]/documents/components/HighlighterWithEllipsis'
import ContributorIdentityTooltip from '@/app/[lang]/documents/components/ContributorIdentityTooltip'
import { Contribution } from '@/types/Contribution'
import { Document } from '@/types/Document'
import styles from './ContributorNames.module.css'

// Names rendered while the list is collapsed: the rest is hidden by the
// line clamp anyway, so mounting them would only cost rendering time.
const COLLAPSED_NAMES_LIMIT = 30

const contributorName = (contribution: Contribution): string => {
  const { firstName, lastName } = contribution.person
  const name = [firstName, lastName].filter(Boolean).join(' ')
  return name.match(/^\s*$/) ? contribution.person.getDisplayName() : name
}

// Comma-separated list of the document contributors, showing the contributor
// identity card when hovering a name. A single tooltip is shared by all names
// to keep the publications table cheap to render.
const ContributorNames = ({
  document,
  searchWords,
  findChunks,
}: {
  document: Document
  searchWords: string[]
  findChunks?: HighlighterProps['findChunks']
}) => {
  const [hovered, setHovered] = useState<{
    contribution: Contribution
    anchorEl: HTMLElement
  } | null>(null)

  const namedContributions = document.contributions
    .map((contribution) => ({
      contribution,
      name: contributorName(contribution),
    }))
    .filter(({ name }) => Boolean(name))

  const handleMouseOver = (event: MouseEvent<HTMLSpanElement>) => {
    const nameElement = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-index]',
    )
    if (!nameElement || nameElement === hovered?.anchorEl) return
    const { contribution } =
      namedContributions[Number(nameElement.dataset.index)]
    setHovered({ contribution, anchorEl: nameElement })
  }

  return (
    <HighlighterWithEllipsis
      contentKey={`${document.uid}:${namedContributions.length}`}
      hasHiddenContent={namedContributions.length > COLLAPSED_NAMES_LIMIT}
    >
      {(expanded) => (
        <ContributorIdentityTooltip
          contribution={hovered?.contribution ?? null}
          document={document}
          anchorEl={hovered?.anchorEl}
          open={hovered !== null}
          onClose={() => setHovered(null)}
        >
          <span onMouseOver={handleMouseOver}>
            {(expanded
              ? namedContributions
              : namedContributions.slice(0, COLLAPSED_NAMES_LIMIT)
            ).map(({ contribution, name }, index) => (
              <Fragment key={contribution.person.uid}>
                {index > 0 && ', '}
                <span data-index={index} className={styles.contributorName}>
                  <Highlighter
                    highlightClassName='highlight'
                    searchWords={searchWords}
                    autoEscape
                    findChunks={findChunks}
                    textToHighlight={name}
                  />
                </span>
              </Fragment>
            ))}
          </span>
        </ContributorIdentityTooltip>
      )}
    </HighlighterWithEllipsis>
  )
}

export default ContributorNames
