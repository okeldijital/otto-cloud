# Contract Core

## Purpose

OTTO Contracts is a document repository and relationship layer. It stores the signed source PDF and connects that document to existing OTTO records.

## Supported relationships

A contract may be connected to:

- Artist
- Label
- Publisher
- Release
- Work
- Track

Connections are created explicitly by the user. OTTO does not infer or automatically create catalogue relationships.

## Contract document

The signed PDF is the authoritative source document.

Supported document operations:

- upload
- open / preview
- download
- replace
- delete where the contract deletion rules permit it

Replacement is a document-repository operation; OTTO does not maintain a legal amendment workflow.

## Contract metadata

Only lightweight administrative metadata is retained in the active UI:

- title
- optional contract number
- optional notes
- system timestamps

The contract module does not ask users to manually reproduce legal terms from the PDF.

## Explicitly out of scope

The active contract product does not expose:

- OCR or contract-text extraction
- AI contract interpretation
- verification workflow
- relationship suggestions or discovery
- lifecycle management
- amendments
- timeline
- financial terms
- royalty/advance capture
- split management
- completeness/readiness scoring

Legacy backend structures may remain temporarily for data compatibility. They are not part of the active product contract and should be removed only after dependency and data audits.

## Architectural rule

Do not add contract-specific legal intelligence merely because the underlying PDF could support it. New contract functionality must first be justified against the repository + relationship responsibility of the module.
