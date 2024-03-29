#!/usr/bin/env node

import fs from 'fs';
import stream from 'stream';

import { doMultiReplace } from '@henderea/regex-util';

import { argParser } from '../lib/arg-helper.mjs';
import { readAll, readLines } from '../lib/readInput.mjs';
import { helpText, styles } from '../lib/helpText.mjs';
const { red, green, bold } = styles;

import version from '../assets/version.mjs';

let options = null;
try {
  options = argParser()
    .string('match', '--match', '-m')
    .string('replace', '--replace', '-r')
    .string('input', '--input', '--query', '-q')
    .string('inputFile', '--input-file', '--file', '-f')
    .string('outputFile', '--output-file', '--out', '--dest', '-d')
    .strings('subs', '--subs', '-s')
    .string('subsFile', '--subs-file', '-R')
    .bool('help', '--help', '-h')
    .bool('noCase', '--no-case', '-i')
    .bool('oneLine', '--one-line', '-o')
    .bool('test', '--test', '-t')
    .bool('silent', '--silent', '-!')
    .bool('format', '--format', '--ansi-format', '-a')
    .bool('whitespaceEscapes', '--whitespace-escapes', '-w')
    .bool('grep', '--grep', '-g')
    .bool('reverseGrep', '--reverse-grep', '-G')
    .bool('stream', '--stream', '-S')
    .help(helpText, '--help', '-h')
    .withVersion(version, '--version')
    .argv;
} catch (e) {
  console.error(red.bright(`${bold('Error in arguments:')} ${e.message}`));
  if(/^.*?Option requires argument: -f\b.*$/.test(e.message)) {
    console.error(`${bold('NOTE:')} As of version 2.7.0, '-f' is now an alias for '--file'. The new alias for '--format' is '-a'.`);
  }
  process.exit(1);
}

function processSub(sub, subs) {
  if(/[|]{3}/.test(sub)) {
    let parts = sub.split(/[|]{3}/, 2);
    let match = new RegExp(parts[0], `g${options.noCase ? 'i' : ''}${options.oneLine ? '' : 'm'}`);
    let replace = parts[1];
    subs.push({ matchRegex: match, replaceString: replace });
  } else {
    let not = /^!/.test(sub);
    if(not) {
      sub = sub.slice(1);
    } else {
      sub = sub.replace(/^\\(\\*)!/, '$1!');
    }
    let match = new RegExp(sub, `g${options.noCase ? 'i' : ''}${options.oneLine ? '' : 'm'}`);
    subs.push({ matchRegex: match, invertGrep: not });
  }
}

(async () => {
  let subs = [];
  let matchRegex = null;
  if(options.match) {
    matchRegex = new RegExp(options.match, `g${options.noCase ? 'i' : ''}${options.oneLine ? '' : 'm'}`);
    if(options.replace || options.replace === '') {
      subs.push({ matchRegex, replaceString: options.replace });
    }
  }
  if(options.subsFile && fs.existsSync(options.subsFile)) {
    try {
      const rawFileSubs = fs.readFileSync(options.subsFile, { encoding: 'utf8' });
      if(rawFileSubs && rawFileSubs.trim().length > 0) {
        const fileSubs = rawFileSubs.replace(/[\r\n]+$/, '').split(/\r?\n/g).filter((s) => s.length > 0);
        if(fileSubs.length > 0) {
          fileSubs.forEach((sub) => {
            processSub(sub, subs);
          });
        }
      }
    } catch (e) {
      console.error(red.bright(`${bold('Error reading substitution file:')} ${e.message}`));
      process.exit(1);
    }
  }
  if(options.subs && Array.isArray(options.subs)) {
    options.subs.forEach((sub) => {
      processSub(sub, subs);
    });
  }
  let inputStream = process.stdin;
  let usingInputFileStream = false;
  if(options.inputFile && fs.existsSync(options.inputFile)) {
    usingInputFileStream = true;
    inputStream = fs.createReadStream(options.inputFile);
  }
  let outputStream = process.stdout;
  let bufferStream = new stream.PassThrough();
  let output = '';
  let usingOutputFileStream = false;
  let usingOutputBuffer = false;
  if(options.outputFile) {
    usingOutputFileStream = true;
    if(options.outputFile == options.inputFile) {
      usingOutputBuffer = true;
      bufferStream.on('data', (chunk) => {
        output += chunk;
      });
    } else {
      outputStream = fs.createWriteStream(options.outputFile);
      bufferStream.pipe(outputStream);
    }
  } else {
    bufferStream.pipe(outputStream);
  }
  const cleanup = () => {
    if(usingInputFileStream) {
      inputStream.destroy();
    }
    bufferStream.destroy();
    if(usingOutputFileStream) {
      if(usingOutputBuffer) {
        if(output.length > 0) {
          fs.writeFileSync(options.outputFile, output);
        }
      } else {
        outputStream.destroy();
      }
    }
  };
  if(options.grep || options.reverseGrep) {
    if(!matchRegex) {
      cleanup();
      console.error(`You must provide -m or --match in ${options.reverseGrep ? 'reverse-' : ''}grep mode.`);
      process.exit(1);
    }
    let processLines = (lines) => {
      let outputLines = lines.filter((line) => (matchRegex.test(line) || matchRegex.test(line.replace(/\r?\n$/, ''))) ? !options.reverseGrep : options.reverseGrep).join('');
      if(outputLines.length > 0) {
        bufferStream.write(outputLines);
      }
    };
    await readLines(inputStream, processLines);
    cleanup();
    process.exit(0);
  } else {
    let input = options.input;
    let processLines = (lines) => {
      lines.forEach((input) => {
        let rv = doMultiReplace(input, subs);
        if(rv !== null) {
          if(options.format) {
            rv = rv.replace(/\\e/g, '\u001b');
          }
          if(options.whitespaceEscapes) {
            rv = rv.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
          }
          bufferStream.write(rv);
        }
      });
    };
    if(!input && input !== '') {
      if(options.oneLine || options.test || !options.stream) {
        input = await readAll(inputStream);
      } else {
        if(subs.length == 0) {
          console.error('You must provide -m/--match and -r/--replace, or -s/--subs, in the default replace mode.');
          process.exit(1);
        }
        await readLines(inputStream, processLines);
        cleanup();
        process.exit(0);
      }
    }
    if(options.test) {
      cleanup();
      if(!matchRegex) {
        console.error('You must provide -m or --match in test mode.');
        process.exit(1);
      }
      let matches = matchRegex.test(input);
      if(matches) {
        if(!options.silent) { console.log(green.bright('Match')); }
        process.exit(0);
      } else {
        if(!options.silent) { console.log(red.bright('No Match')); }
        process.exit(1);
      }
    } else {
      if(subs.length == 0) {
        cleanup();
        console.error('You must provide -m/--match and -r/--replace, or -s/--subs, in the default replace mode.');
        process.exit(1);
      }
      processLines([input]);
      cleanup();
      process.exit(0);
    }
  }
})();
