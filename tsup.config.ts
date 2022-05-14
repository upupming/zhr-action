import { Options } from 'tsup'
import { spawnSync } from 'child_process'
import fs from 'fs'

const options: Options = {
  format: [
    'cjs'
  ],
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: true,
  entryPoints: [
    'src/api.ts',
    'src/cli.ts',
    'src/action.ts',
  ],
  esbuildOptions: (options) => {
    options.charset = 'utf8'
  },
  // esbuild `define` only supports obj or identifier, we have to write a plugin for string replace
  esbuildPlugins: [
    {
      name: 'fill-in-commit-id',
      setup(build) {
        build.onLoad({ filter: /.*banner.ts$/ }, (args) => {
          return {
            contents: fs.readFileSync(args.path).toString().replace('__commit_id__', spawnSync('git', ['rev-parse', 'HEAD']).stdout.toString().slice(0, 6))
          }
        })
      }
    }
  ]
}

export default options
