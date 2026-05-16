export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }

  static badRequest(message: string): HttpError {
    return new HttpError(400, message);
  }

  static unauthorized(message: string): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message: string): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message: string): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, message);
  }
}
