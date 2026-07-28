export class IntelligenceError extends Error {
  status: number;
  code: string;
  details?: string[];

  constructor(message: string, status: number, code: string, details?: string[]) {
    super(message);
    this.name = "IntelligenceError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
