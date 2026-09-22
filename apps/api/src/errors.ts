export class ExchangeError extends Error {
    constructor(
        readonly code: string,
        readonly statusCode = 409
    ) {
        super(code);
    }
}
export const fail = (code: string, status = 409): Promise<never> =>
    Promise.reject(new ExchangeError(code, status));
