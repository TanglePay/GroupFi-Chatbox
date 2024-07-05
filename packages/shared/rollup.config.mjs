import {createRollupConfig, decorateIifeExternal} from "../../rollup.base.mjs";
import pkg from './package.json' assert { type: "json" }
const config =  createRollupConfig(pkg)

export default config
