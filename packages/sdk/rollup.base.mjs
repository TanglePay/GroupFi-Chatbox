import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from '@rollup/plugin-terser'
import nodePolyfills from 'rollup-plugin-polyfill-node';
import filesize from 'rollup-plugin-filesize'
import image from '@rollup/plugin-image';


export function decoratePlugin(configs,plug,isFront = false){
    configs.forEach((c)=>{
        if (isFront) {
            c.plugins.unshift(plug);
        } else {
            c.plugins.push(plug);
        }
    })
}
export function decorateIifeExternal(config,obj,idx=0){
    config.output[idx] = Object.assign(config.output[idx],{globals: obj})
    config.external = Object.keys(obj)
}

export function createRollupConfig(pkg) {
    const moduleName = pkg.name;
    const moduleNameIife = pkg.moduleNameIife;
    const author = pkg.author;
    const banner = `/**
                       * @license
                       * author: ${author}
                       * ${moduleName}.js v${pkg.version}
                       * Released under the ${pkg.license} license.
                       */
                    `;
    return [{
        input: 'src/index.ts', // bundle entry point
        output:  [
            {
              file: 'dist/iife/index.js',
              format: 'iife',
              name: moduleNameIife,
              sourcemap: true,
              banner
            },
            {
              file: 'dist/cjs/index.js', // The CommonJS bundle
              format: 'cjs',
              sourcemap: true,
              banner
            },
            {
              file: 'dist/esm/index.js', // The ESM bundle
              format: 'esm',
              sourcemap: true,
              banner
            },
            
          ],
        plugins: [
            typescript({
                "declaration": true,
                "declarationMap": true,
                "outDir": "dist",
                "rootDir": "src",
            }), // Transpiles your TypeScript
            nodePolyfills(), // Polyfills required Node.js builtins
            babel({ 
                exclude: 'node_modules/**', 
                babelHelpers: 'bundled' 
            }), // Transpiles your JavaScript to ES5
            commonjs(), // Converts CommonJS modules to ES6
            resolve(), // Allows node_modules resolution
            terser(), // Minifies the output
            filesize(), // Show the size of the output
            image({
                extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
            })
        ],
        external: [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.devDependencies || {}),
        ],

    }];

}
