import { ReactElement } from 'react'
import { Tooltip, TooltipProps } from '@mui/material'
import ContributorIdentityCard from '@/app/[lang]/documents/components/ContributorIdentityCard'
import { Contribution } from '@/types/Contribution'
import { Document } from '@/types/Document'

// Shows the contributor identity card when hovering the wrapped element.
// `anchorEl` positions the card on another element than the wrapped one.
const ContributorIdentityTooltip = ({
  contribution,
  document,
  children,
  anchorEl,
  ...tooltipProps
}: {
  contribution: Contribution | null
  document: Document
  children: ReactElement
  anchorEl?: HTMLElement | null
} & Omit<TooltipProps, 'title' | 'children'>) => (
  <Tooltip
    {...tooltipProps}
    title={
      contribution ? (
        <ContributorIdentityCard
          contributor={contribution}
          document={document}
        />
      ) : (
        ''
      )
    }
    slotProps={{
      tooltip: {
        sx: {
          backgroundColor: 'transparent',
          padding: 0,
          border: 'none',
        },
      },
      ...(anchorEl ? { popper: { anchorEl } } : {}),
    }}
  >
    {children}
  </Tooltip>
)

export default ContributorIdentityTooltip
