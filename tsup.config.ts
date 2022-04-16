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
    'src/api.ts',
    'src/cli.ts',
    'src/action.ts',
  ],
  esbuildOptions: (options) => {
    options.charset = 'utf8'
  }
}

export default options
