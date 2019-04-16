#!/usr/bin/env node

const arg = require('arg');

const options = arg(
    {
        '--match': String,
        '-m': '--match',
        '--pattern': '--match',
        '-p': '--match',
        '--replace': String,
        '-r': '--replace',
        '--sub': '--replace',
        '-s': '--replace',
        '--no-case': Boolean,
        '-i': '--no-case',
        '--one-line': Boolean,
        '-o': '--one-line'
    },
    {
        permissive: true
    }
);

const readAll = async (stream, encoding = 'utf8') => {
    return new Promise((resolve, reject) => {
        stream.setEncoding(encoding);
        let rv = '';
        stream.on('data', chunk => {
            rv += chunk;
        });
        stream.on('end', () => {
            resolve(rv);
        });
        stream.on('error', e => {
            reject(e);
        });
    });
};

(async () => {
    let matchRegex = new RegExp(options['--match'], `g${options['--no-case'] ? 'i' : ''}${options['--one-line'] ? '' : 'm'}`);
    let replaceRegex = /(\\?)\$\{(\d+)\}/g;
    let input = await readAll(process.stdin);
    let rv = input.replace(matchRegex, (...args) => {
        return options['--replace'].replace(replaceRegex, (m, s, i) => s == '\\' ? `\${${i}}` : (i >= args.length - 2 ? m : (args[i] || '')));
    });
    process.stdout.write(rv);
})();