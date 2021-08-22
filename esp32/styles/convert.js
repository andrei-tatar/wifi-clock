const { loadImage, createCanvas } = require('canvas');
const { argv } = require('process');
const { join } = require('path');
const { writeFile } = require('fs/promises');

const INVERT = '--invert';

let args = [...argv.slice(2)];
const invert = args.includes(INVERT);
args = args.filter(f => f != INVERT);

if (args?.length !== 1) {
    console.warn('must provide the style folder');
    return;
}

const styleFolder = join(__dirname, args[0]);

const WIDTH = 135;
const HEIGHT = 240;
const COUNT = 10;

const canvas = createCanvas(WIDTH * COUNT, HEIGHT);
const ctx = canvas.getContext('2d');

async function loadImages() {
    const all = [];
    for (let i = 0; i < COUNT; i++) {
        all.push(drawImage(i));
    }
    await Promise.all(all);
}

async function drawImage(index) {
    const file = join(styleFolder, `${index}.bmp`);
    const image = await loadImage(file);
    ctx.drawImage(image, WIDTH * index, 0, WIDTH, HEIGHT);
}

function get16bitImage(imageData, index) {
    const image16bit = Buffer.alloc(WIDTH * HEIGHT * 2 + 3);
    let offset = 0;
    let sum = { r: 0, g: 0, b: 0 };
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const pixelOffset = (y * imageData.width + x + index * WIDTH) * 4;
            const r = applyInvert(imageData.data[pixelOffset + 0], invert);
            const g = applyInvert(imageData.data[pixelOffset + 1], invert);
            const b = applyInvert(imageData.data[pixelOffset + 2], invert);
            sum.r += r;
            sum.g += g;
            sum.b += b;
            const pixel16bit = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
            offset = image16bit.writeUInt16BE(pixel16bit, offset);
        }
    }
    sum.r = sum.r / (WIDTH * HEIGHT) / 255.0;
    sum.g = sum.g / (WIDTH * HEIGHT) / 255.0;
    sum.b = sum.b / (WIDTH * HEIGHT) / 255.0;
    const color = getImageColor(sum);
    offset = image16bit.writeUInt8(color.r, offset);
    offset = image16bit.writeUInt8(color.g, offset);
    offset = image16bit.writeUInt8(color.b, offset);
    return image16bit;
}

function applyInvert(v, invert) {
    return invert ? 255 - v : v;
}

function rgb2hsv(r, g, b) {
    let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
    let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
    return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
}

function hsv2rgb(h, s, v) {
    let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [f(5), f(3), f(1)];
}

function getImageColor({ r, g, b }) {
    const [h, s, _v] = rgb2hsv(r, g, b);
    const [cr, cg, cb] = hsv2rgb(h, s, 1); //increase value to 1
    return {
        r: cr * 255,
        g: cg * 255,
        b: cb * 255,
    };
}

async function exportImages() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const writePromises = [];
    for (let i = 0; i < COUNT; i++) {
        const image16bit = get16bitImage(imageData, i);
        const outputImage = join(__dirname, '..', 'data', 'nix', `${i}.clk`);
        writePromises.push(writeFile(outputImage, image16bit));
    }

    await Promise.all(writePromises);
}

loadImages().then(_ => exportImages());
