const zlib = require('zlib');
const glob = require('glob').default;
const fs = require('fs');
const path = require('path');

const src = 'dist/web-client/';
const dist = '../esp32/data/public/';

if (fs.existsSync(dist)) {
    fs.rmSync(dist, { recursive: true });
}

function compressFile(filename) {
    return new Promise(resolve => {
        if (fs.statSync(filename).isDirectory()) {
            resolve();
            return;
        }

        var destination = dist + filename.substr(src.length) + '.gz';
        var destDir = path.dirname(destination);
        if (!fs.existsSync(destDir))
            fs.mkdirSync(destDir);

        console.log(`${filename} -> ${destination}`);

        var compress = zlib.createGzip(),
            input = fs.createReadStream(filename),
            output = fs.createWriteStream(destination);

        input.pipe(compress).pipe(output);

        output.on('end', resolve);
    });
}

async function compressFiles() {
    const files = await glob(src + '**/*');
    await Promise.all(files.map(file => compressFile(file)));
}

compressFiles().catch(err => console.error(err));