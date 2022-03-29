import { Options } from 'tsup'

const options: Options = {
  format: [
    'cjs'
  ],
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: true,
  entryPoints: [
    'api.ts',
    'cli.ts',
    'action.ts',
  ],
  esbuildOptions: (options) => {
    options.charset = 'utf8'
  }
}

export default options
