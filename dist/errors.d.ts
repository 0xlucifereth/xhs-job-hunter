export type XhsErrorCode = 'CDP_UNAVAILABLE' | 'LOGIN_REQUIRED' | 'HUMAN_VERIFICATION_REQUIRED' | 'RATE_LIMITED' | 'NO_SEARCH_PAGE' | 'DATA_TABLE_UNAVAILABLE' | 'EXPORT_FAILED' | 'ABORTED';
export declare class XhsError extends Error {
    readonly code: XhsErrorCode;
    constructor(code: XhsErrorCode, message: string, options?: ErrorOptions);
}
export declare function toErrorMessage(error: unknown): string;
export declare function throwIfAborted(signal: AbortSignal): void;
//# sourceMappingURL=errors.d.ts.map