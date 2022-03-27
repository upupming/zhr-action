import { Options } from 'tsup'

const options: Options = {
  format: [
    'cjs'
  ],
  clean: true,
  dts: true,
  sourcemap: true,
  entryPoints: [
    'cli.ts',
    'action.ts',
  ]
}

export default options
