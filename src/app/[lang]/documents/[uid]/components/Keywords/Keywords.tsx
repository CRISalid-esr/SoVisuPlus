import { CustomCard } from '@/components/Card'
import { Trans } from '@lingui/react'
import {
  Box,
  Button,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import { useEffect } from 'react'

function Keywords() {
  const theme = useTheme()
  const { selectedDocument = null } = useStore((state) => state.document)
  useEffect(() => {
    console.log(selectedDocument?.subjects)
  }, [selectedDocument])

  return (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='document_details_page_keywords_tab_card_title' />
          </Typography>
          <Button variant='contained' color='primary'>
            <Trans id='document_details_page_keywords_tab_card_validate_button' />
          </Button>
        </Box>
      }
    >
      <CardContent>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Preferred Labels</strong>
                </TableCell>
                <TableCell>
                  <strong>Alternative Labels</strong>
                </TableCell>
                <TableCell>
                  <strong>UID</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedDocument?.subjects.map((subject, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {subject.altLabels
                      ?.map((label) => `${label.value} (${label.language})`)
                      .join(', ')}
                  </TableCell>
                  <TableCell>
                    {subject.prefLabels
                      ?.map((label) => `${label.value} (${label.language})`)
                      .join(', ')}
                  </TableCell>
                  <TableCell>{subject.uid}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </CustomCard>
  )
}

export default Keywords
