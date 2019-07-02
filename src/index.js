#!/usr/bin/env node

const arg = require('arg');
const XRegExp = require('xregexp');

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
        '-h': '--help'
    },
    {
        permissive: true
    }
);

if(options['--help']) {
    console.log(`
quick-regex: A regex replace utility that takes stdin, applies the regex replacement, and prints the result

Flags:
    --match    | -m | --pattern | -p        The regex pattern to match
    --replace  | -r | --sub     | -s        The substitution string
    --no-case  | -i                         Make the regex pattern case-insensitive
    --one-line | -o                         Make the ^ and $ match the beginning and end of the entire input
    --help     | -h                         Print this help

Patterns:
    Uses NodeJS regular expression support. Only indexed capture groups are supported.

Replacement String:
    The replacement string supports some special match group syntax:
        Basic syntax:
            \${1}           insert capture group 1
            \${1|2}         insert capture group 1, or if that didn't match, insert capture group 2;
                            the | syntax can be used in all other syntax setups
        Ternary syntax:
            \${1?a:b}       insert either 'a' or 'b', depending on if capture group 1 matched anything;
                            a and b can be empty, and can contain characters other than : and }
            \${1?a}         insert 'a' if capture group 1 matched anything, or insert nothing if it did not match
        Fallback syntax:
            \${1:-a}        insert capture group 1, or if tht didn't match, insert 'a'
        Substring syntax:
            \${1:1}         insert capture group 1, starting at index 1
            \${1:1:2}       insert capture group 1, starting at index 1, with a length of 2

    Syntax notes:
        You can nest a replacement string match group syntax in any constant.
        Examples:
            \${1?\${2}:\${3}}               insert capture group 2 if group 1 was matched, or group 3 if it didn't
            \${1:-\${2}}                    same as \${1|2}
            \${1:\${2?1:2}:\${2?3:2}}       insert a substring of capture group 1; if capture group 2 matched, the
                                            substring will be 3 characters starting at index 1; if capture group 2
                                            did not match, the substring will be 2 characters starting at index 2


`);
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

// let rs = '\\${1\\}${1}${1?h:n} ${2:1} ${2:1:2} ${3:-${2}\\}} ${3:-a} ${5}';

let isNil = (arg) => arg === null || typeof arg === 'undefined';

let processReplace = (args, replaceString, left = null, right = null) => {
    if(!replaceString || replaceString.length == 0) {
        return '';
    }
    let matches = XRegExp.matchRecursive(replaceString, '\\$\\{', '}', 'g', {
        valueNames: ['between', 'left', 'match', 'right'],
        escapeChar: '\\'
    });

    if(matches.length <= 1) {
        if(left && right) {
            return XRegExp.replace(`${left}${replaceString}${right}`, replaceRegex, (match) => {
                let { index, otherIndexes, question, whenVal, elseVal, colon, hyphen, fallback, subStart, subLen } = match;//?
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
            rv.push(processReplace(args, m, l, r));
        }
    }

    return rv.join('');
}

(async () => {
    let matchRegex = new RegExp(options['--match'], `g${options['--no-case'] ? 'i' : ''}${options['--one-line'] ? '' : 'm'}`);
    let replaceString = options['--replace'];
    let input = await readAll(process.stdin);
    let rv = input.replace(matchRegex, (...args) => processReplace(args, replaceString));
    process.stdout.write(rv);
})();