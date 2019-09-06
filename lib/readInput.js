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

module.exports = {
    readAll,
    readLines
};