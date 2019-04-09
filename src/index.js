#!/usr/bin/env node

const yargs = require('yargs');

const options = yargs
    .string('match')
    .alias('match', 'm')
    .alias('match', 'pattern')
    .alias('match', 'p')
    .nargs('match', 1)
    .string('replace')
    .alias('replace', 'r')
    .alias('replace', 'sub')
    .alias('replace', 's')
    .nargs('replace', 1)
    .boolean('no-case')
    .alias('no-case', 'i')
    .argv;

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
    let matchRegex = new RegExp(options.match, options.noCase ? 'gi' : 'g');
    let replaceRegex = /(\\?)\$\{(\d+)\}/g;
    let input = await readAll(process.stdin);
    let rv = input.replace(matchRegex, (...args) => {
        return options.replace.replace(replaceRegex, (m, s, i) => s == '\\' ? `\${${i}}` : (i >= args.length - 2 ? m : (args[i] || '')));
    });
    process.stdout.write(rv);
})();