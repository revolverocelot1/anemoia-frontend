import terser from '@rollup/plugin-terser';
import filesize from 'rollup-plugin-filesize';
import ts from 'rollup-plugin-ts';
import pkg from './package.json' assert { type: 'json' };
import fs from 'fs';

const inputPath = 'src/anime.js';
const outputName = 'anime';
const jsDocTypes = fs.readFileSync('./src/types.js', 'utf-8').split('/* Exports */')[1];

/**
 * @param {String} format
 * @param {Boolean} [addTypes]
 * @return {String}
 */
const banner = (format, addTypes) => {
  const date = new Date();
  return `/**
 * anime.js - ${ format }
 * @version v${ pkg.version }
 * @author Julian Garnier
 * @license MIT
 * @copyright (c) ${ date.getFullYear() } Julian Garnier
 * @see https://animejs.com
 */${addTypes ? jsDocTypes : ''}
`
}

const terserModuleOptions = {
  compress: {
    passes: 10,
    module: true,
  },
  mangle: true,
}

const terserScriptOptions = {
  compress: {
    passes: 10,
    module: false,
  },
  mangle: true,
}

const terserStripComments = {
  compress: false,
  mangle: false,
}

const tasks = [];

const cleanupOptions = {
  // Replace "import('./file.js')."
  "import\\('\\.\\/[^']+\\.js'\\)\\.": '',
  "/// <reference path='./types.js' />": '',
  __packageVersion__: pkg.version.toString()
};

const cleanup = {
  name: 'cleanup',
  generateBundle(_, bundle) {
    Object.keys(bundle).forEach((fileName) => {
      const file = bundle[fileName];
      let code = file.code;
      for (const [find, replacement] of Object.entries(cleanupOptions)) {
        const regExp = new RegExp(find, 'g');
        code = code.replace(regExp, replacement);
      }
      file.code = code;
    });
  },
};

const prependTypes = {
  name: 'prepend-file',
  transform(code, id) {
    if (id.includes('anime.js')) {
      return {
        code: `${jsDocTypes}\n${code}`,
        map: null // If you're not handling source maps
      };
    }
    return null;
  }
};

tasks.push( // ESM
  {
    input: inputPath,
    output: { file: pkg.module, format: 'esm', banner: banner('ESM', true) },
    plugins: [prependTypes, cleanup]
  },
);

if (process.env.types) {
  tasks.push( // TYPES
    {
      input: inputPath,
      output: { file: './types/index.js', format: 'esm', banner: banner('ESM') },
      plugins: [prependTypes, cleanup, ts()]
    }
  );
}

if (process.env.build || process.env.npm_config_minify) {
  tasks.push( // ESM minified
    {
      input: inputPath,
      output: { file: pkg.files[0] + '/anime.esm.min.js', format: 'esm', banner: banner('ESM') },
      plugins: [cleanup, terser(terserModuleOptions), filesize({ showMinifiedSize: false })]
    }
  );
}

if (process.env.build) {
  tasks.push( // UMD
    {
      input: inputPath,
      output: { file: pkg.main, format: 'umd', name: outputName, banner: banner('UMD') },
      plugins: [cleanup, terser(terserStripComments)]
    }
  );

  tasks.push( // IIFE
    {
      input: inputPath,
      output: { file: pkg.files[0] + '/anime.iife.js', format: 'iife', name: outputName, banner: banner('IIFE') },
      plugins: [cleanup, terser(terserStripComments)]
    }
  );

  tasks.push( // CJS
    {
      input: inputPath,
      output: { file: pkg.exports['.'].require, format: 'cjs', name: outputName, banner: banner('CJS') },
      plugins: [cleanup, terser(terserStripComments)]
    }
  );

  tasks.push( // UMD, CJS & IIFE minified
    {
      input: inputPath,
      output: [
        { file: pkg.files[0] + '/anime.umd.min.js', format: 'umd', name: outputName, banner: banner('UMD') },
        { file: pkg.files[0] + '/anime.min.cjs', format: 'cjs', name: outputName, banner: banner('CJS') },
        { file: pkg.files[0] + '/anime.iife.min.js', format: 'iife', name: outputName, banner: banner('IIFE') },
      ],
      plugins: [cleanup, terser(terserScriptOptions)]
    }
  );

  // tasks.push( // ES5
  //   {
  //     input: inputPath,
  //     output: { file: pkg.files[0] + '/anime.es5.iife.js', format: 'iife', name: outputName, banner: banner('ES5 IIFE') },
  //     plugins: [prependTypes, cleanup, babel({
  //       presets: ['@babel/preset-env'],
  //       babelHelpers: 'bundled',
  //       comments: false,
  //       parserOpts: {
  //         // @ts-ignore
  //         plugins: ['v8intrinsic', '@babel/plugin-transform-arrow-functions']
  //       }
  //     })]
  //   }
  // );

  // tasks.push( // ES5 Minified
  //   {
  //     input: inputPath,
  //     output: { file: pkg.files[0] + '/anime.es5.iife.min.js', format: 'iife', name: outputName, banner: banner('ES5 IIFE') },
  //     plugins: [cleanup, babel({
  //       presets: ['@babel/preset-env'],
  //       babelHelpers: 'bundled',
  //       comments: false,
  //       parserOpts: {
  //         // @ts-ignore
  //         plugins: ['v8intrinsic', '@babel/plugin-transform-arrow-functions']
  //       }
  //     })]
  //   }
  // );
}

export default tasks;
