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
declare function runZjuHealthReport(username?: string, password?: string): Promise<void>;

export { runZjuHealthReport };
