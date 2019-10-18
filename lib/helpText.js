const { HelpTextMaker, styles, style } = require('@henderea/simple-colors/helpText');
const { magenta } = styles;

const ex = magenta.bright;

const helpText = new HelpTextMaker('quick-regex')
    .wrap()
    .title.nl
    .pushWrap(4)
    .tab.text('A regex replace utility that takes stdin, applies the regex replacement, and prints the result. Using the ').flag('--test', '-t').text(' flag will switch the mode to a boolean match test. Using the ').flag('--grep', '-g').text(' or ').flag('--reverse-grep', '-G').text(' flags will switch to grep or reverse grep mode.').nl
    .popWrap()
    .nl
    .flags.nl
    .pushWrap(8)
    .dict
    .key.tab.flag('--match', '-m').value.text('The regex pattern to match').end.nl
    .key.tab.flag('--replace', '-r').value.text('The substitution string').end.nl
    .key.tab.flag('--subs', '-s').value.text('A string containing the regex pattern and the substitution string, separated by 3 vertical bars (|||). Can be used multiple times. Not used in grep, reverse-grep, or test mode.').end.nl
    .key.tab.flag('--input', '--query', '-q').value.text('Instead of using stdin, use this parameter value').end.nl
    .key.tab.flag('--input-file', '--file', '-f').value.text('Instead of using stdin, read the specified file').end.nl
    .key.tab.flag('--output-file', '--out', '--dest', '-d').value.text('Instead of using stdout, write to the specified file').end.nl
    .key.tab.flag('--test', '-t').value.text('Instead of replacing text, exit with code ').text(ex('0')).text(' for a match, or code ').text(ex('1')).text(' for no match').end.nl
    .key.tab.flag('--no-case', '-i').value.text('Make the regex pattern case-insensitive').end.nl
    .key.tab.flag('--one-line', '-o').value.text('Make the ').text(ex('^')).text(' and ').text(ex('$')).text(' match the beginning and end of the entire input. The grep and reverse-grep modes process one line at a time, so this will not be respected there.').end.nl
    .key.tab.flag('--format', '--ansi-format', '-a').value.text('Convert ').text(ex('\\e')).text(' to the ANSI escape character before printing the output').end.nl
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

module.exports = {
    helpText,
    styles,
    style
};