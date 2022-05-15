import puppeteer from 'puppeteer-core';
import { PassThrough } from 'stream';
import { ChalkInstance } from 'chalk';

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
declare class ZjuHealthReporter {
    config: Required<ZjuHealthReportConfig>;
    logString: string;
    console: Console;
    browser: puppeteer.Browser;
    chalk: ChalkInstance;
    page: puppeteer.Page;
    ocrRecognizeVerifyCodeRetryTimes: number;
    MAX_ocrRecognizeVerifyCodeRetryTimes: number;
    verifyCodeImgFile: string;
    verifyCode: string;
    EXPECTED_VERIFY_CODE_LENGTH: number;
    dev: boolean;
    NETWORK_ERROR_KEYWORDS: string[];
    networkErrorRetryTimes: number;
    /** 出现意外的网络错误时（例如 puppeteer 出现网络问题 net::ERR_INTERNET_DISCONNECTED）会重试，最大重试次数 */
    MAX_networkErrorRetryTimes: number;
    responseErrMsg: string;
    constructor(config: ZjuHealthReportConfig);
    createPassThrough(stream: NodeJS.WriteStream): PassThrough;
    private login;
    private ocrRecognizeVerifyCode;
    private submit;
    private notifyDingtalk;
    runReport(): Promise<void>;
}
interface ZjuHealthReportConfig {
    /** ZJU 学号 */
    username?: string;
    /** ZJU 密码 */
    password?: string;
    /** 钉钉消息通知 access token，如果不传不会进行消息推送 */
    dingtalkToken?: string;
}
interface RequestResult {
    status?: number;
    data: string;
}

export { RequestResult, ZjuHealthReportConfig, ZjuHealthReporter };
