import {createRollupConfig, decorateIifeExternal} from "../../rollup.base.mjs";
import pkg from './package.json' assert { type: "json" }
const config =  createRollupConfig(pkg,{keepClassNames:true})
decorateIifeExternal(config[0],{
    '@iota/iota.js': 'Iota',
    '@iota/crypto.js':'IotaCrypto',
    '@iota/util.js': 'IotaUtil',
    'big-integer':'bigInt',
})
export default config
