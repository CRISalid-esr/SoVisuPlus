import useStore from '@/stores/global_store'
import { Trans } from '@lingui/macro'

import { DocumentTypeLabels } from '../../../components/DocumentTypeLabels'
import RowLabel from './RowLabel'

export default function Type() {
  const { selectedDocument = null } = useStore((state) => state.document)

  return (
    <>
      <RowLabel>
        <Trans>document_details_page_type_row_label</Trans>
      </RowLabel>
      {selectedDocument && DocumentTypeLabels[selectedDocument.documentType]}
    </>
  )
}
