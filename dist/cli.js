#!/usr/bin/env node
"use strict";

var _chunkTTKDMCECjs = require('./chunk-TTKDMCEC.js');
require('./chunk-FQFBMVJM.js');





var _chunkOKMUBGTUjs = require('./chunk-OKMUBGTU.js');

// node_modules/.pnpm/dotenv@16.0.0/node_modules/dotenv/lib/main.js
var require_main = _chunkOKMUBGTUjs.__commonJS.call(void 0, {
  "node_modules/.pnpm/dotenv@16.0.0/node_modules/dotenv/lib/main.js"(exports, module) {
    _chunkOKMUBGTUjs.init_cjs_shims.call(void 0, );
    var fs = _chunkOKMUBGTUjs.__require.call(void 0, "fs");
    var path = _chunkOKMUBGTUjs.__require.call(void 0, "path");
    var os = _chunkOKMUBGTUjs.__require.call(void 0, "os");
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _log(message) {
      console.log(`[dotenv][DEBUG] ${message}`);
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function config(options) {
      let dotenvPath = path.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      if (options) {
        if (options.path != null) {
          dotenvPath = _resolveHome(options.path);
        }
        if (options.encoding != null) {
          encoding = options.encoding;
        }
      }
      try {
        const parsed = DotenvModule.parse(fs.readFileSync(dotenvPath, { encoding }));
        Object.keys(parsed).forEach(function(key) {
          if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
            process.env[key] = parsed[key];
          } else {
            if (override === true) {
              process.env[key] = parsed[key];
            }
            if (debug) {
              if (override === true) {
                _log(`"${key}" is already defined in \`process.env\` and WAS overwritten`);
              } else {
                _log(`"${key}" is already defined in \`process.env\` and was NOT overwritten`);
              }
            }
          }
        });
        return { parsed };
      } catch (e) {
        if (debug) {
          _log(`Failed to load ${dotenvPath} ${e.message}`);
        }
        return { error: e };
      }
    }
    var DotenvModule = {
      config,
      parse
    };
    module.exports.config = DotenvModule.config;
    module.exports.parse = DotenvModule.parse;
    module.exports = DotenvModule;
  }
});

// src/cli.ts
_chunkOKMUBGTUjs.init_cjs_shims.call(void 0, );
var import_dotenv = _chunkOKMUBGTUjs.__toESM.call(void 0, require_main());
import_dotenv.default.config();
async function run() {
  var _a;
  const username = process.env.username;
  const password = process.env.password;
  const cookieEaiSess = process.env.cookie_eai_sess;
  const dingtalkToken = process.env.dingtalk_token;
  try {
    await new (0, _chunkTTKDMCECjs.ZjuHealthReporter)({ username, password, dingtalkToken, cookieEaiSess }).runReport();
  } catch (error) {
    console.log((_a = error == null ? void 0 : error.message) != null ? _a : "未知错误");
  }
}
run();
//# sourceMappingURL=cli.js.map