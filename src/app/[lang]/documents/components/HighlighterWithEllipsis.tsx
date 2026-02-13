import { Trans } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import Highlighter from 'react-highlight-words'
import styles from './HighlighterWithEllipsis.module.css'

const HighlighterWithEllipsis = ({
  text,
  searchWords,
}: {
  text: string
  searchWords: string[]
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
  }, [text])

  return (
    <div>
      <div
        ref={textRef}
        className={`${styles.ellipsisTextContainer} ${expanded ? styles.ellipsisExpanded : styles.ellipsisCollapsed}`}
      >
        <Highlighter
          highlightClassName='highlight'
          searchWords={searchWords}
          autoEscape
          textToHighlight={text}
        />
      </div>
      {!expanded && isTruncated && (
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
