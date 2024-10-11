import {createRollupConfig, decorateCjsExternal, decorateIifeExternal} from "../../rollup.base.mjs";
import pkg from './package.json' assert { type: "json" }
const config =  createRollupConfig(pkg,{keepClassNames:true})
decorateIifeExternal(config,{
    '@iota/iota.js': 'Iota',
    '@iota/crypto.js':'IotaCrypto',
    '@iota/util.js': 'IotaUtil',
    'big-integer':'bigInt',
})
export default config
