export interface Config {
    schema: string;
    output: string;
    options?: {
        includeHelpers?: boolean;
        versionCheck?: boolean;
        dateFormat?: 'string' | 'Date';
    };
}
export declare function loadConfig(): Promise<Config>;
export declare function initConfig(): Promise<void>;
//# sourceMappingURL=config.d.ts.map