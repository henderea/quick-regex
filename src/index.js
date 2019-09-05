#!/usr/bin/env node

const arg = require('arg');
const XRegExp = require('xregexp/lib/xregexp');
require('xregexp/lib/addons/matchrecursive')(XRegExp);
const { HelpTextMaker, styles } = require('@henderea/simple-colors/helpText');
const { green, red, magenta } = styles;

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
        '-o': '--one-line',
        '--help': Boolean,
        '-h': '--help',
        '--test': Boolean,
        '-t': '--test',
        '--format': Boolean,
        '-f': '--format',
        '--input': String,
        '--query': '--input',
        '-q': '--input',
        '--whitespace-escapes': Boolean,
        '-w': '--whitespace-escapes',
        '--grep': Boolean,
        '-g': '--grep',
        '--reverse-grep': Boolean,
        '-G': '--reverse-grep',
        '--stream': Boolean,
        '-S': '--stream'
    },
    {
        permissive: true
    }
);

const ex = magenta.bright;

const helpText = new HelpTextMaker('quick-regex')
    .wrap()
    .title.nl
    .pushWrap(4)
    .tab.text('A regex replace utility that takes stdin, applies the regex replacement, and prints the result. Using the ').flag('--test', '-t').text(' flag will switch the mode to a boolean match test.').nl
    .popWrap()
    .nl
    .flags.nl
    .pushWrap(8)
    .dict
    .key.tab.flag('--match', '-m', '--pattern', '-p').value.text('The regex pattern to match').end.nl
    .key.tab.flag('--replace', '-r', '--sub', '-s').value.text('The substitution string').end.nl
    .key.tab.flag('--input', '--query', '-q').value.text('Instead of using stdin, use this parameter value').end.nl
    .key.tab.flag('--test', '-t').value.text('Instead of replacing text, exit with code ').text(ex('0')).text(' for a match, or code ').text(ex('1')).text(' for no match').end.nl
    .key.tab.flag('--no-case', '-i').value.text('Make the regex pattern case-insensitive').end.nl
    .key.tab.flag('--one-line', '-o').value.text('Make the ').text(ex('^')).text(' and ').text(ex('$')).text(' match the beginning and end of the entire input. The grep and reverse-grep modes process one line at a time, so this will not be respected there.').end.nl
    .key.tab.flag('--format', '-f').value.text('Convert ').text(ex('\\e')).text(' to the ANSI escape character before printing the output').end.nl
    .key.tab.flag('--whitespace-escapes', '-w').value.text('Convert ').text(ex('\\n')).text(', ').text(ex('\\t')).text(', and ').text(ex('\\r')).text(' to the corresponding whitespace characters before printing the output').end.nl
    .key.tab.flag('--grep', '-g').value.text('Print lines matching the pattern').end.nl
    .key.tab.flag('--reverse-grep', '-G').value.text('Print lines ').bold('not').text(' matching the pattern').end.nl
    .key.tab.flag('--stream', '-S').value.text('Process input lines as they come in. Ignored if ').flag('--test').text(', ').flag('--one-line').text(', or ').flag('--input').text(' is used. Note that grep and reverse-grep modes automatically use stream mode.').end.nl
    .key.tab.flag('--help', '-h').value.text('Print this help').end.nl
    .endDict
    .popWrap()
    .nl
    .bold('Patterns:').nl
    .pushWrap(4)
    .text('Uses NodeJS regular expression support. Only indexed capture groups are supported.').nl
    .popWrap()
    .nl
    .bold('Replacement String:').nl
    .pushWrap(4)
    .tab.text('The replacement string supports some special match group syntax:').nl
    .nl
    .pushWrap(8)
    .dict
    .tab.tab.bold('Basic Syntax:').nl
    .key.tab.tab.tab.text(ex('${1}')).value.text('insert capture group 1').end.nl
    .key.tab.tab.tab.text(ex('${1|2}')).value.text("insert capture group 1, or if that didn't match, insert capture group 2; the | syntax can be used in all other syntax setups").end.nl
    .nl
    .tab.tab.bold('Ternary syntax:').nl
    .key.tab.tab.tab.text(ex('${1?a:b}')).value.text("insert either 'a' or 'b', depending on if capture group 1 matched anything; a and b can be empty, and can contain any characters other than : and }").end.nl
    .key.tab.tab.tab.text(ex('${1?a}')).value.text("insert 'a' if capture group 1 matched anything, or insert nothing if it did nto match").end.nl
    .nl
    .tab.tab.bold('Fallback syntax:').nl
    .key.tab.tab.tab.text(ex('${1:-a}')).value.text("insert capture group 1, or if that didn't match, insert 'a'").end.nl
    .nl
    .tab.tab.bold('Substring syntax:').nl
    .key.tab.tab.tab.text(ex('${1:1}')).value.text('insert capture group 1, starting at index 1').end.nl
    .key.tab.tab.tab.text(ex('${1:1:2}')).value.text('insert capture group 1, starting at index 1, with a length of 2').end.nl
    .endDict
    .popWrap()
    .nl
    .tab.bold('Syntax notes:').nl
    .pushWrap(8)
    .tab.tab.text('You can nest a replacement string match group syntax in any constant.').nl
    .nl
    .dict
    .tab.tab.bold('Examples:').nl
    .key.tab.tab.tab.text(ex('${1?${2}${3}}')).value.text("insert capture group 2 if group 1 was matched, or group 3 if it didn't").end.nl
    .key.tab.tab.tab.text(ex('${1:-${2}}')).value.text("same as ").text(ex('${1|2}')).end.nl
    .key.tab.tab.tab.text(ex('${1:${2?1:2}:${2?3:2}}')).value.text("insert a substring of capture group 1; if capture group 2 matched, the substring will be 3 characters starting at index 1; if capture group 2 did not match, the substring will be 2 characters starting at index 2").end.nl
    .endDict
    .popWrap()
    .popWrap()
    .nl
    .toString(120);

if(options['--help']) {
    console.log(helpText);
    process.exit(0);
}

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

const readLines = async (stream, processLines, encoding = 'utf8') => {
    return new Promise((resolve, reject) => {
        stream.setEncoding(encoding);
        let buffer = ''
        let processBuffer = (end = false) => {
            let lines = buffer.split(/(?<=\r?\n)/);
            if(end || lines.length <= 0 || /\n$/m.test(lines[lines.length - 1])) {
                buffer = '';
            } else {
                buffer = lines.pop();
            }
            processLines(lines, end);
        }
        stream.on('data', chunk => {
            buffer += chunk;
            processBuffer();
        });
        stream.on('end', () => {
            processBuffer(true);
            resolve();
        });
        stream.on('error', e => {
            reject(e);
        });
    });
}

let replaceRegex = XRegExp(`\\$\\{(?<index>\\d+)(?<otherIndexes>(?:\\|\\d+)+)?(?:(?<question>\\?)(?<whenVal>[^:}]*)(?::(?<elseVal>[^:}]*))?|(?:(?<colon>:)(?:(?<hyphen>-)(?<fallback>[^{}]+)|(?<subStart>\\d+)(?::(?<subLen>\\d+))?)))?}`, 'g')

let isNil = (arg) => arg === null || typeof arg === 'undefined';

let getMatches = (replaceString) => XRegExp.matchRecursive(replaceString, '\\$\\{', '}', 'g', {
    valueNames: ['between', 'left', 'match', 'right'],
    escapeChar: '\\'
});

let processReplace = (args, replaceString, left = null, right = null) => {
    if(!replaceString || replaceString.length == 0) {
        return '';
    }
    let matches = getMatches(replaceString);

    if(matches.length <= 1) {
        if(left && right) {
            return XRegExp.replace(`${left}${replaceString}${right}`, replaceRegex, (match) => {
                let { index, otherIndexes, question, whenVal, elseVal, colon, hyphen, fallback, subStart, subLen } = match;
                if(index >= args.length - 2) {
                    return match;
                }
                let val = args[index];
                if(!isNil(otherIndexes) && isNil(val)) {
                    let indexes = otherIndexes.split(/|/);
                    for(let i = 0; i < indexes.length && isNil(val); i++) {
                        let ind = indexes[i];
                        if(!isNil(ind) && ind.length > 0 && ind < args.length - 2) {
                            val = args[ind];
                        }
                    }
                }
                if(question == '?') {
                    return !isNil(val) ? whenVal : (elseVal || '');
                }
                if(colon == ':') {
                    if(hyphen == '-') {
                        return fallback || '';
                    } else {
                        if(isNil(subLen)) {
                            return val.slice(parseInt(subStart));
                        } else {
                            return val.slice(parseInt(subStart), parseInt(subStart) + parseInt(subLen));
                        }
                    }
                }
                return val || '';
            });
        } else {
            return replaceString;
        }
    }

    let ind = 0;
    let rv = [];
    let match, l, m, r;

    while(ind < matches.length) {
        match = matches[ind];
        if(match.name == 'between') {
            rv.push(match.value);
            ind++;
        } else if(match.name == 'left' && ind < matches.length - 2) {
            l = match.value;
            ind++;
            m = matches[ind].value;
            ind++;
            r = matches[ind].value;
            ind++
            while(getMatches(m).length > 1) {
                m = processReplace(args, m, l, r);
            }
            rv.push(processReplace(args, m, l, r));
        }
    }

    return rv.join('');
}

(async () => {
    let matchRegex = new RegExp(options['--match'], `g${options['--no-case'] ? 'i' : ''}${options['--one-line'] ? '' : 'm'}`);
    if(options['--grep'] || options['--reverse-grep']) {
        let processLines = (lines) => {
            let outputLines = lines.filter(line => (matchRegex.test(line) || matchRegex.test(line.replace(/\n$/m, ''))) ? !options['--reverse-grep'] : options['--reverse-grep']).join('');
            if(outputLines.length > 0) {
                process.stdout.write(outputLines);
            }
        }
        await readLines(process.stdin, processLines);
        process.exit(0);
    } else {
        let replaceString = options['--replace'];
        let input = options['--input'];
        let processLines = (lines) => {
            lines.forEach(input => {
                let rv = input.replace(matchRegex, (...args) => processReplace(args, replaceString));
                if(options['--format']) {
                    rv = rv.replace(/\\e/g, '\u001b');
                }
                if(options['--whitespace-escapes']) {
                    rv = rv.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
                }
                process.stdout.write(rv);
            });
        }
        if(!input) {
            if(options['--one-line'] || options['--test'] || !options['--stream']) {
                input = await readAll(process.stdin);
            } else {
                await readLines(process.stdin, processLines);
                process.exit(0);
            }
        }
        if(options['--test']) {
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