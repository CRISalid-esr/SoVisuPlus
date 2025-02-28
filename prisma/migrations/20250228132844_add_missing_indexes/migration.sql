-- CreateIndex
CREATE INDEX "Concept_documentId_idx" ON "Concept"("documentId");

-- CreateIndex
CREATE INDEX "ConceptLabel_conceptId_idx" ON "ConceptLabel"("conceptId");

-- CreateIndex
CREATE INDEX "Contribution_documentId_idx" ON "Contribution"("documentId");

-- CreateIndex
CREATE INDEX "PersonIdentifier_personId_idx" ON "PersonIdentifier"("personId");
