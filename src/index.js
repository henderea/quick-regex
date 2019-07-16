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
        '-t': '--test'
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
    .key.tab.flag('--test', '-t').value.text('Instead of replacing text, exit with code 0 for a match, or code 1 for no match').end.nl
    .key.tab.flag('--no-case', '-i').value.text('Make the regex pattern case-insensitive').end.nl
    .key.tab.flag('--one-line', '-o').value.text('Make the ^ and $ match the beginning and end of the entire input').end.nl
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
    let input = await readAll(process.stdin);
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
        let replaceString = options['--replace'];
        let rv = input.replace(matchRegex, (...args) => processReplace(args, replaceString));
        process.stdout.write(rv);
    }
})();