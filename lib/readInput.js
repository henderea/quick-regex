const concat = require('concat-stream');
const detectCharacterEncoding = require('detect-character-encoding');
const iconv = require('iconv-lite');

const readAll = async (stream) => {
    return new Promise((resolve, reject) => {
        var concatStream = concat((buffer) => {
            let encodingResult = detectCharacterEncoding(buffer);
            let encoding = encodingResult ? encodingResult.encoding : 'utf8';
            resolve(iconv.decode(buffer, encoding));
        });
        stream.on('error', reject);
        stream.pipe(concatStream);
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

module.exports = {
    readAll,
    readLines
};