'use client'

import React, { useState } from 'react'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { t } from '@lingui/core/macro'

interface IdentifierPillProps {
  /** The identifier value to display and copy */
  value: string
  /** Short label shown inside the colored circle (1–2 chars) */
  iconLabel: string
  /** Background color of the circle icon */
  iconColor: string
  /** Optional sub-label shown before the value (e.g. "idHal_s") */
  subLabel?: string
  /** If provided, the value becomes a link */
  href?: string
  /** If provided, renders a chevron toggle that shows/hides this content */
  expandable?: React.ReactNode
}

const IdentifierPill: React.FC<IdentifierPillProps> = ({
  value,
  iconLabel,
  iconColor,
  subLabel,
  href,
  expandable,
}) => {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      {/* Pill row */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '0.375rem',
          pl: expandable ? 0.25 : 0.75,
          pr: 0.5,
          py: 0.25,
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        {/* Expand toggle */}
        {expandable !== undefined && (
          <Tooltip
            title={
              expanded ? t`identifier_pill_collapse` : t`identifier_pill_expand`
            }
          >
            <IconButton
              size='small'
              onClick={() => setExpanded((v) => !v)}
              sx={{ p: 0.25 }}
            >
              {expanded ? (
                <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
              ) : (
                <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Tooltip>
        )}

        {/* Circle icon */}
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 9,
              lineHeight: 1,
              letterSpacing: '-0.5px',
            }}
          >
            {iconLabel}
          </Typography>
        </Box>

        {/* Optional sub-label */}
        {subLabel && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ lineHeight: 1, px: 0.5, flexShrink: 0 }}
          >
            {subLabel}
          </Typography>
        )}

        {/* Value — link or plain text */}
        {href ? (
          <Box
            component='a'
            href={href}
            target='_blank'
            rel='noopener'
            sx={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.875rem',
              color: 'primary.main',
              textDecoration: 'none',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              minWidth: 0,
              px: 0.5,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {value}
          </Box>
        ) : (
          <Typography
            variant='body2'
            sx={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              minWidth: 0,
              px: 0.5,
            }}
          >
            {value}
          </Typography>
        )}

        {/* Copy button */}
        <Tooltip
          title={copied ? t`identifier_pill_copied` : t`identifier_pill_copy`}
        >
          <IconButton
            size='small'
            onClick={handleCopy}
            sx={{ p: 0.25, flexShrink: 0 }}
          >
            {copied ? (
              <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Expandable content */}
      {expandable !== undefined && expanded && (
        <Box sx={{ mt: 0.5 }}>{expandable}</Box>
      )}
    </Box>
  )
}

export default IdentifierPill
