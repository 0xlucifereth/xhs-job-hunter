export class XhsError extends Error {
    code;
    constructor(code, message, options) {
        super(`[${code}] ${message}`, options);
        this.name = code;
        this.code = code;
    }
}
export function toErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
export function throwIfAborted(signal) {
    if (signal.aborted) {
        throw new XhsError('ABORTED', '任务已取消');
    }
}
//# sourceMappingURL=errors.js.map