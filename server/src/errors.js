export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message, code = 'VALIDATION_ERROR') => new HttpError(400, code, message);
export const forbidden = (message = 'You are not allowed to do that.') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Request not found.') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message, code = 'CONFLICT') => new HttpError(409, code, message);
