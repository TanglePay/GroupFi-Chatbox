import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from '@rollup/plugin-terser';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import filesize from 'rollup-plugin-filesize';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';

export function decoratePlugin(configs, plug, isFront = false) {
    configs.forEach((c) => {
        if (isFront) {
            c.plugins.unshift(plug);
        } else {
            c.plugins.push(plug);
        }
    });
}

export function decorateIifeExternal(config, obj, idx = 0) {
    config.output[idx] = Object.assign(config.output[idx], { globals: obj });
    config.external = Object.keys(obj);
}

export function createRollupConfig(pkg, options = {}) {
    return [
        createIifeRollupConfig(pkg, options),
        createCommonEsmRollupConfig(pkg, options)
    ];
}

export function createIifeRollupConfig(pkg, options = {}) {
    const moduleNameIife = pkg.moduleNameIife;
    const author = pkg.author;
    const banner = `/**
                       * @license
                       * author: ${author}
                       * ${moduleNameIife}.js v${pkg.version}
                       * Released under the ${pkg.license} license.
                       */
                    `;

    return {
        input: 'src/index.ts',
        output: [{
            file: 'dist/iife/index.js',
            format: 'iife',
            name: moduleNameIife,
            sourcemap: true,
            banner
        }],
        plugins: getPlugins(options),
        external: getExternals(pkg)
    };
}

export function createCommonEsmRollupConfig(pkg, options = {}) {
    const moduleName = pkg.name;
    const author = pkg.author;
    const banner = `/**
                       * @license
                       * author: ${author}
                       * ${moduleName}.js v${pkg.version}
                       * Released under the ${pkg.license} license.
                       */
                    `;

    return {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/cjs/index.js',
                format: 'cjs',
                sourcemap: true,
                banner
            },
            {
                file: 'dist/esm/index.js',
                format: 'esm',
                sourcemap: true,
                banner
            }
        ],
        plugins: getPlugins(options),
        external: getExternals(pkg)
    };
}

function getPlugins(options = {}) {
    return [
        json(), // Process JSON files early
        alias({
            entries: {
                crypto: 'crypto-browserify'
            }
        }),
        typescript({
            declaration: true,
            declarationMap: true,
            outDir: "dist",
            rootDir: "src",
        }),
        nodePolyfills({
            exclude: ['crypto']
        }),
        babel({
            exclude: 'node_modules/**',
            babelHelpers: 'bundled'
        }),
        commonjs(),
        resolve({
            preferBuiltins: true,
            browser: true
        }),
        terser({
            keep_classnames: options.keepClassNames || false
        }),
        filesize()
    ];
}

function getExternals(pkg) {
    return [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
    ];
}
