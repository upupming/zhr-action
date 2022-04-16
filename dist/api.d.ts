declare global {
    interface Window {
        vm: any;
    }
    namespace NodeJS {
        interface ProcessEnv {
            CI: boolean;
        }
    }
}
declare function runZjuHealthReport(username?: string, password?: string, dingtalkToken?: string): Promise<void>;
interface RequestResult {
    status?: number;
    data: string;
}

export { RequestResult, runZjuHealthReport };
