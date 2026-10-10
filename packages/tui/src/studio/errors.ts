export class StudioProtocolError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'StudioProtocolError';
    this.code = code;
  }
}
