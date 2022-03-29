declare global {
    interface Window {
        vm: any;
    }
}
declare function runZjuHealthReport(username?: string, password?: string): Promise<void>;

export { runZjuHealthReport };
