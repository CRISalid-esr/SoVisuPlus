import { useRef, useState } from 'react'
import useStore from '@/stores/global_store'
import { Trans, t } from '@lingui/macro'
import {
  Box,
  Button,
  Card,
  CardContent,
  ClickAwayListener,
  Grow,
  Link,
  Popper,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

import RowLabel from './RowLabel'

export default function Journal() {
  const titleRef = useRef(null)
  const [isPopperOpen, setIsPopperOpen] = useState(false)
  const theme = useTheme()

  const { selectedDocument = null } = useStore((state) => state.document)
  const journal = selectedDocument?.journal
  const title = journal?.titles[0]

  const handleClick = () => {
    setIsPopperOpen(!isPopperOpen)
  }

  const handleClickAway = () => {
    setIsPopperOpen(false)
  }

  return (
    <>
      <RowLabel>
        <Trans>document_details_page_journal_row_label</Trans>
      </RowLabel>

      {title && (
        <ClickAwayListener onClickAway={handleClickAway}>
          <Box>
            <Button variant='text' ref={titleRef} onClick={handleClick}>
              {title}
            </Button>

            <Popper
              open={isPopperOpen}
              anchorEl={titleRef.current}
              placement='bottom-start'
              transition
              disablePortal
              sx={{
                zIndex: 1,
              }}
            >
              {({ TransitionProps }) => (
                <Grow {...TransitionProps} timeout={200}>
                  <Card>
                    <CardContent>
                      <Typography
                        gutterBottom
                        variant='h6'
                        sx={{ color: theme.palette.primary.main }}
                      >
                        {title}
                      </Typography>
                      <Typography
                        sx={{ fontWeight: theme.typography.fontWeightBold }}
                      >
                        <Trans id='document_details_page_journal_issn'>
                          <Link
                            href={`https://portal.issn.org/resource/ISSN/${journal.issnL}`}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            {journal.issnL}
                          </Link>
                        </Trans>
                      </Typography>
                      <Typography
                        sx={{ fontWeight: theme.typography.fontWeightBold }}
                      >
                        <Trans id='document_details_page_journal_source_type'>
                          {t`document_details_page_journal_journal`}
                        </Trans>
                      </Typography>
                      <Typography
                        sx={{ fontWeight: theme.typography.fontWeightBold }}
                      >
                        <Trans id='document_details_page_journal_publisher'>
                          {journal.publisher}
                        </Trans>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              )}
            </Popper>
          </Box>
        </ClickAwayListener>
      )}
    </>
  )
}
