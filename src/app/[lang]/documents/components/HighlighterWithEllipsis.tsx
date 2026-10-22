import { Trans } from '@lingui/react/macro'
import { ReactNode, useEffect, useRef, useState } from 'react'
import Highlighter, { HighlighterProps } from 'react-highlight-words'
import styles from './HighlighterWithEllipsis.module.css'

const HighlighterWithEllipsis = ({
  text,
  searchWords,
  findChunks,
  children,
  contentKey,
  hasHiddenContent = false,
}: {
  text?: string
  searchWords?: string[]
  findChunks?: HighlighterProps['findChunks']
  // Custom content rendered instead of the highlighted text
  children?: (expanded: boolean) => ReactNode
  // Changes whenever the children content changes, to re-check truncation
  contentKey?: string
  // The collapsed children omit part of the content
  hasHiddenContent?: boolean
}) => {
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(
        textRef.current.scrollHeight > textRef.current.clientHeight,
      )
    }
  }, [text, contentKey])

  return (
    <div>
      <div
        ref={textRef}
        className={`${styles.ellipsisTextContainer} ${expanded ? styles.ellipsisExpanded : styles.ellipsisCollapsed}`}
      >
        {children ? (
          children(expanded)
        ) : (
          <Highlighter
            highlightClassName='highlight'
            searchWords={searchWords ?? []}
            // Ignored when findChunks is supplied, but the Sources tab renders
            // this component without one and relies on the default literal
            // matching, where it keeps regex metacharacters harmless.
            autoEscape
            findChunks={findChunks}
            textToHighlight={text ?? ''}
          />
        )}
      </div>
      {!expanded && (isTruncated || hasHiddenContent) && (
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
