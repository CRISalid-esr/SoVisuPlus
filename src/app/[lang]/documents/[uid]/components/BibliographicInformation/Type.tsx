import useStore from '@/stores/global_store'

import { DocumentTypeLabels } from '../../../components/DocumentTypeLabels'
import { useLingui } from '@lingui/react'

export default function Type() {
  const { selectedDocument = null } = useStore((state) => state.document)
  const { _ } = useLingui()

  return (
    selectedDocument && _(DocumentTypeLabels[selectedDocument.documentType])
  )
}
