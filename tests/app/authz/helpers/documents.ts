import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { Document } from '@/types/Document'

export const fetchDomainDocumentOO = async (uid: string): Promise<Document> => {
  const dao = new DocumentDAO()
  const doc = await dao.fetchDocumentById(uid)
  if (!doc) throw new Error(`Document ${uid} not found`)
  return doc
}
