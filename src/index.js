#!/usr/bin/env node

const { argParser } = require('@henderea/arg-helper')(require('arg'));
const { doMultiReplace } = require('@henderea/regex-util');
const { readAll, readLines } = require('../lib/readInput');
const { helpText, styles } = require('../lib/helpText');
const { red, green } = styles;

const options = argParser()
    .string('match', '--match', '-m')
    .string('replace', '--replace', '-r')
    .string('input', '--input', '--query', '-q')
    .strings('subs', '--subs', '-s')
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
    let subs = [];
    let matchRegex = null;
    if(options.match) {
        matchRegex = new RegExp(options.match, `g${options.noCase ? 'i' : ''}${options.oneLine ? '' : 'm'}`);
        if(options.replace || options.replace === '') {
            subs.push({ matchRegex, replaceString: options.replace });
        }
    }
    if(options.subs && Array.isArray(options.subs)) {
        options.subs.forEach(sub => {
            let parts = sub.split(/[|]{3}/, 2);
            let match = new RegExp(parts[0], `g${options.noCase ? 'i' : ''}${options.oneLine ? '' : 'm'}`);
            let replace = parts[1];
            subs.push({ matchRegex: match, replaceString: replace });
        });
    }
    if(options.grep || options.reverseGrep) {
        if(!matchRegex) {
            console.error(`You must provide -m or --match in ${options.reverseGrep ? 'reverse-' : ''}grep mode.`)
            process.exit(1);
            return;
        }
        let processLines = (lines) => {
            let outputLines = lines.filter(line => (matchRegex.test(line) || matchRegex.test(line.replace(/\r?\n$/, ''))) ? !options.reverseGrep : options.reverseGrep).join('');
            if(outputLines.length > 0) {
                process.stdout.write(outputLines);
            }
        }
        await readLines(process.stdin, processLines);
        process.exit(0);
    } else {
        let input = options.input;
        let processLines = (lines) => {
            lines.forEach(input => {
                let rv = doMultiReplace(input, subs);
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
                if(subs.length == 0) {
                    console.error('You must provide -m/--match and -r/--replace, or -s/--subs, in the default replace mode.')
                    process.exit(1);
                    return;
                }
                await readLines(process.stdin, processLines);
                process.exit(0);
            }
        }
        if(options.test) {
            if(!matchRegex) {
                console.error('You must provide -m or --match in test mode.')
                process.exit(1);
                return;
            }
            let matches = matchRegex.test(input);
            if(matches) {
                console.log(green.bright('Match'));
                process.exit(0);
            } else {
                console.log(red.bright('No Match'));
                process.exit(1);
            }
        } else {
            if(subs.length == 0) {
                console.error('You must provide -m/--match and -r/--replace, or -s/--subs, in the default replace mode.')
                process.exit(1);
                return;
            }
            processLines([input]);
        }
    }
})();