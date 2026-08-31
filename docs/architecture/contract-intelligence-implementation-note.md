# Contract Intelligence implementation note

The contract intake wizard depends on three distinct layers: contract persistence, document storage, and Document Intelligence extraction. The manual contract POST creates only the database contract record; it does not extract a document. The intelligence route starts extraction through the Document Intelligence service.

The current IAM migration means the authenticated session contains a UUID identity while some legacy persistence models require integer actor IDs. This boundary must be resolved server-side before extraction jobs are created.
