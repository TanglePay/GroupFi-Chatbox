import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from '@rollup/plugin-terser';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import filesize from 'rollup-plugin-filesize';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';

// Abstracted external decorator for handling IIFE, CJS, and ESM
export function decorateExternal(configs, obj, idx) {
    const globals = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== true) { // If value is not `true`, include it in `globals`
            globals[key] = value;
        }
    }

    configs[idx].external = [...(configs[idx].external || []), ...Object.keys(obj)]; // Add everything to external

    if (Object.keys(globals).length > 0) {
        configs[idx].output[0] = Object.assign(configs[idx].output[0], { globals });
    }
}

// Specific decorator for CJS
export function decorateCjsExternal(configs, obj) {
    decorateExternal(configs, obj, 1); // Call abstracted function with index 1 for CJS
}

// Specific decorator for ESM
export function decorateEsmExternal(configs, obj) {
    decorateExternal(configs, obj, 2); // Call abstracted function with index 2 for ESM
}

// Specific decorator for IIFE
export function decorateIifeExternal(configs, obj) {
    decorateExternal(configs, obj, 0); // Call abstracted function with index 0 for IIFE
}

// Plugin decorator
export function decoratePlugin(configs, plugin, isFront = false) {
    configs.forEach((config) => {
        if (isFront) {
            config.plugins.unshift(plugin); // Add plugin to the front of the array
        } else {
            config.plugins.push(plugin); // Add plugin to the end of the array
        }
    });
}

// Function to create the IIFE configuration
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
        output: [
            {
                file: 'dist/iife/index.js',
                format: 'iife',
                name: moduleNameIife,
                sourcemap: true,
                banner
            }
        ],
        plugins: getPlugins(options)
    };
}

// Function to create the CJS configuration
export function createCjsRollupConfig(pkg, options = {}) {
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
                file: 'dist/cjs/index.cjs',
                format: 'cjs',
                sourcemap: true,
                banner
            }
        ],
        plugins: getPlugins(options),
        external: getExternals(pkg) // Default external handling for CJS
    };
}

// Function to create the ESM configuration
export function createEsmRollupConfig(pkg, options = {}) {
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
                file: 'dist/esm/index.js',
                format: 'esm',
                sourcemap: true,
                banner
            }
        ],
        plugins: getPlugins(options),
        external: getExternals(pkg) // Default external handling for ESM
    };
}

// Create the Rollup configuration for IIFE, ESM, and CJS
export function createRollupConfig(pkg, options = {}) {
    return [
        createIifeRollupConfig(pkg, options),
        createCjsRollupConfig(pkg, options),
        createEsmRollupConfig(pkg, options)
    ];
}

// Shared plugins configuration
function getPlugins(options = {}) {
    return [
        json(), // Process JSON files early
        alias({
            entries: {
                crypto: 'crypto-browserify' // Aliasing crypto for browser builds
            }
        }),
        typescript({
            declaration: true,
            declarationMap: true,
            outDir: "dist",
            rootDir: "src",
        }),
        nodePolyfills({
            exclude: ['crypto'] // Exclude crypto from node polyfills
        }),
        babel({
            exclude: 'node_modules/**', // Ignore node_modules
            babelHelpers: 'bundled'
        }),
        commonjs(), // Convert CommonJS to ES modules
        resolve({
            preferBuiltins: true,
            browser: true // Ensures browser compatibility
        }),
        terser({
            keep_classnames: options.keepClassNames || false // Minify and keep class names based on options
        }),
        filesize() // Show file size after build
    ];
}

// External handling for dependencies based on the package.json
function getExternals(pkg) {
    return [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
    ];
}
