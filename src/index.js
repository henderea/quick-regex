#!/usr/bin/env node

const { argParser } = require('../lib/argParser');
const { processReplace } = require('../lib/matching');
const { readAll, readLines } = require('../lib/readInput');
const { helpText, styles } = require('../lib/helpText');
const { red, green } = styles;

const options = argParser()
    .string('match', '--match', '-m')
    .string('replace', '--replace', '-r')
    .string('input', '--input', '--query', '-q')
    .bool('help', '--help', '-h')
    .bool('noCase', '--no-case', '-i')
    .bool('oneLine', '--one-line', '-o')
    .bool('test', '--test', '-t')
    .bool('format', '--format', '-f')
    .bool('whitespaceEscapes', '--whitespace-escapes', '-w')
    .bool('grep', '--grep', '-g')
    .bool('reverseGrep', '--reverse-grep', '-G')
    .bool('stream', '--stream', '-S')
    .help(helpText, '--help', '-h')
    .argv;

(async () => {
    let matchRegex = new RegExp(options.match, `g${options.noCase ? 'i' : ''}${options.oneLine ? '' : 'm'}`);
    if(options.grep || options.reverseGrep) {
        let processLines = (lines) => {
            let outputLines = lines.filter(line => (matchRegex.test(line) || matchRegex.test(line.replace(/\n$/m, ''))) ? !options.reverseGrep : options.reverseGrep).join('');
            if(outputLines.length > 0) {
                process.stdout.write(outputLines);
            }
        }
        await readLines(process.stdin, processLines);
        process.exit(0);
    } else {
        let replaceString = options.replace;
        let input = options.input;
        let processLines = (lines) => {
            lines.forEach(input => {
                let rv = input.replace(matchRegex, (...args) => processReplace(args, replaceString));
                if(options.format) {
                    rv = rv.replace(/\\e/g, '\u001b');
                }
                if(options.whitespaceEscapes) {
                    rv = rv.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
                }
                process.stdout.write(rv);
            });
        }
        if(!input) {
            if(options.oneLine || options.test || !options.stream) {
                input = await readAll(process.stdin);
            } else {
                await readLines(process.stdin, processLines);
                process.exit(0);
            }
        }
        if(options.test) {
            let matches = matchRegex.test(input);
            if(matches) {
                console.log(green.bright('Match'));
                process.exit(0);
            } else {
                console.log(red.bright('No Match'));
                process.exit(1);
            }
        } else {
            processLines([input]);
        }
    }
})();