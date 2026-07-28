/**
 * Platform document errors — no business-module coupling.
 */
export class DocumentServiceError extends Error {
  status: number;
  code: string;
  details?: string[];

  constructor(message: string, status: number, code: string, details?: string[]) {
    super(message);
    this.name = "DocumentServiceError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
