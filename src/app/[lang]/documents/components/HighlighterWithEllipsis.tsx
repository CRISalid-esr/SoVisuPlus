import { Trans } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import Highlighter from 'react-highlight-words'
import styles from './HighlighterWithEllipsis.module.css'
import { Chip, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Contribution } from '@/types/Contribution'
import { SourceContribution } from '@/types/SourceContribution'
import { Person } from '@/types/Person'
import ContributorIdentityCard from '@/app/[lang]/documents/components/ContributorIdentityCard'
import { SourcePerson } from '@/types/SourcePerson'
import SourceContributorIdentityCard from '@/app/[lang]/documents/components/SourceContributorIdentityCard'

const HighlighterWithEllipsis = ({
  text,
  contributions,
  searchWords,
}: {
  text: string
  contributions: Contribution[] | SourceContribution[]
  searchWords: string[]
}) => {
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(
        textRef.current.scrollHeight > textRef.current.clientHeight,
      )
    }
  }, [text])

  return (
    <div className={`${styles.ellipsisGlobalContainer}`}>
      <div
        ref={textRef}
        className={`${styles.ellipsisTextContainer} ${expanded ? styles.ellipsisExpanded : styles.ellipsisCollapsed}`}
      >
        {contributions.map((contribution, index) => {
          let name
          let person: Person | SourcePerson
          if (contribution instanceof Contribution) {
            person = contribution.person
            const { firstName, lastName } = person
            name = [firstName, lastName].filter(Boolean).join(' ')
            if (name.match(/^\s*$/)) {
              name = person.getDisplayName()
            }
            return (
              <Tooltip
                key={index}
                title={<ContributorIdentityCard contributor={contribution} />}
                onOpen={() => console.log(contribution)}
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: 'transparent',
                      padding: 0,
                      border: 'none',
                    },
                  },
                }}
              >
                <Chip
                  key={index}
                  clickable={true}
                  onClick={() => {}}
                  sx={{
                    borderRadius: theme.utils.pxToRem(4),
                    backgroundColor: person.external
                      ? theme.palette.lightSecondaryContainer
                      : theme.palette.primary.main,
                    letterSpacing: '0.1px',
                    lineHeight: theme.typography.lineHeight.lineHeight20px,
                    fontWeight: theme.typography.fontWeightRegular,
                    color: person.external
                      ? theme.palette.getContrastText(
                          theme.palette.secondary.dark,
                        )
                      : theme.palette.primary.contrastText,
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.85,
                    },
                    flexShrink: 0,
                    fontSize: theme.utils.pxToRem(14),
                    width: 'fit-content',
                  }}
                  label={
                    <Highlighter
                      highlightClassName='highlight'
                      searchWords={searchWords}
                      autoEscape
                      textToHighlight={name}
                    />
                  }
                />
              </Tooltip>
            )
          } else {
            person = contribution.person
            name = person.name
            return (
              <Tooltip
                key={index}
                title={
                  <SourceContributorIdentityCard contributor={contribution} />
                }
                onOpen={() => console.log(contribution)}
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: 'transparent',
                      padding: 0,
                      border: 'none',
                    },
                  },
                }}
              >
                <Chip
                  key={index}
                  clickable={true}
                  onClick={() => {}}
                  sx={{
                    borderRadius: theme.utils.pxToRem(4),
                    backgroundColor: theme.palette.lightSecondaryContainer,
                    letterSpacing: '0.1px',
                    lineHeight: theme.typography.lineHeight.lineHeight20px,
                    fontWeight: theme.typography.fontWeightRegular,
                    color: theme.palette.getContrastText(
                      theme.palette.secondary.dark,
                    ),
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.85,
                    },
                    flexShrink: 0,
                    fontSize: theme.utils.pxToRem(14),
                    width: 'fit-content',
                  }}
                  label={
                    <Highlighter
                      highlightClassName='highlight'
                      searchWords={searchWords}
                      autoEscape
                      textToHighlight={name}
                    />
                  }
                />
              </Tooltip>
            )
          }
        })}
      </div>
      {!expanded && (
        <span
          className={styles.ellipsisExpandButton}
          onClick={() => setExpanded(true)}
        >
          ...&nbsp;<Trans>see_more_contributors</Trans>
        </span>
      )}
      {expanded && (
        <span
          className={styles.ellipsisExpandButton}
          onClick={() => setExpanded(false)}
        >
          <Trans>see_less_contributors</Trans>
        </span>
      )}
    </div>
  )
}

export default HighlighterWithEllipsis
