import useStore from '@/stores/global_store'

import { DocumentTypeLabels } from '../../../components/DocumentTypeLabels'

export default function Type() {
  const { selectedDocument = null } = useStore((state) => state.document)

  return selectedDocument && DocumentTypeLabels[selectedDocument.documentType]
}
