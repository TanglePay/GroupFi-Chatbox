import image from '@rollup/plugin-image';
import postcss from 'rollup-plugin-postcss'
import url from 'postcss-url'
import {createRollupConfig, decorateIifeExternal,decoratePlugin} from "../../rollup.base.mjs";
import pkg from './package.json' assert { type: "json" }
const config =  createRollupConfig(pkg)
/*
image({
                extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg']
            }),
            postcss({
               extract: 'assets/style.css',
               minimize: true,
               plugins: [
                url({
                    url: 'inline'
                })
               ]
            })*/
decoratePlugin(config,image({
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg']
}))
decoratePlugin(config,postcss({
    extract: 'assets/style.css',
    minimize: true,
    plugins: [
     url({
         url: 'inline'
     })
    ]
 }))
 decorateIifeExternal(config[0],{
    '@iota/iota.js': 'Iota',
    '@iota/crypto.js':'IotaCrypto',
    '@iota/util.js': 'IotaUtil',
    'big-integer':'bigInt',
})
export default config
