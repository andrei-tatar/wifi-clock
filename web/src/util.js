import { deflateRaw } from 'https://unpkg.com/pako@2.0.4/dist/pako.esm.mjs?module';

export const WIDTH = 135;
export const HEIGHT = 240;

export function drawImage(path, digit, ctx) {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = () => {
            const { x, y } = getOffset(digit);
            ctx.drawImage(img, x, y);
            resolve();
        };
        img.onerror = () => {
            reject(new Error(`Could not load image ${path}`));
        }
        img.setAttribute('crossOrigin', '');
        img.src = path;
    });
}

export function exportImages(ctx) {
    const imageData = ctx.getImageData(0, 0, WIDTH * 5, HEIGHT * 2);
    const images = [];
    for (let digit = 0; digit < 10; digit++) {
        const image = exportImage(imageData, digit);
        images.push(image);
    }
    return images;
}

function exportImage(imageData, index) {
    const image16bit = new Uint8Array(WIDTH * HEIGHT * 2);
    let offset = 0;
    const sum = { r: 0, g: 0, b: 0 };
    const { x: offsetX, y: offsetY } = getOffset(index);
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const pixelOffset = ((y + offsetY) * imageData.width + x + offsetX) * 4;
            const r = imageData.data[pixelOffset + 0];
            const g = imageData.data[pixelOffset + 1];
            const b = imageData.data[pixelOffset + 2];
            sum.r += r;
            sum.g += g;
            sum.b += b;
            const pixel16bit = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
            image16bit[offset++] = pixel16bit >> 8;
            image16bit[offset++] = pixel16bit & 0xFF;
        }
    }

    sum.r = sum.r / (WIDTH * HEIGHT) / 255.0;
    sum.g = sum.g / (WIDTH * HEIGHT) / 255.0;
    sum.b = sum.b / (WIDTH * HEIGHT) / 255.0;
    const color = getImageColor(sum);
    const compressed = deflateRaw(image16bit, { level: 9 });
    const file = new Uint8Array(compressed.length + 3);
    offset = 0;
    file[offset++] = color.r;
    file[offset++] = color.g;
    file[offset++] = color.b;
    file.set(compressed, offset);
    return file;
}

export function getDigit({ x, y }) {
    if (x < 0 || x > 5 * WIDTH || y < 0 || y > 2 * HEIGHT) return -1;
    const column = Math.floor(x / WIDTH);
    const row = Math.floor(y / HEIGHT);
    return row * 5 + column;
}

export function getOffset(digit) {
    return {
        x: (digit % 5) * WIDTH,
        y: Math.floor(digit / 5) * HEIGHT,
    };
}

export function rgb2hsv(r, g, b) {
    let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
    let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
    return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
}

export function hsv2rgb(h, s, v) {
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
