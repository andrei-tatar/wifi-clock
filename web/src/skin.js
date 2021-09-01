import { html, css, LitElement } from 'https://unpkg.com/lit@2.0.0-rc.3?module';
import { uploadDigit } from './service.js';
import { loadImage, WIDTH, HEIGHT, exportImages } from './util.js';


const SKIN_NAMES = [
    "Nixie Cross",
    "Nixie Real",
    "Dots",
    "Flip Clock",
    "Pink Neo",
    "White Muddy",
    "White Dream",
    "Lego",
    "Gray Moon",
    "Neon Color",
    "White Angles",
]

class Skins extends LitElement {
    static get styles() {
        return css`
        :host {
            display: flex;
            flex-direction: column;
        }

        canvas {
            max-width: ${WIDTH * 5}px;
            background-image: linear-gradient(45deg, #BBB 25%, transparent 25%), linear-gradient(-45deg, #BBB 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #BBB 75%), linear-gradient(-45deg, transparent 75%, #BBB 75%);
            background-size: 40px 40px;
            background-position: 0px 0px, 0px 20px, 20px -20px, -20px 0px;
        }
            `;
    }

    get ctx() {
        return this.shadowRoot.querySelector('canvas').getContext('2d');
    }

    constructor() {
        super();
    }

    async onSelectedSkinChanged(ev) {
        const skinIndex = parseInt(ev.target.value);
        if (isNaN(skinIndex)) {
            return;
        }

        const context = this.ctx;
        const promises = [];
        for (let digit = 0; digit < 10; digit++) {
            const path = `https://raw.githubusercontent.com/andrei-tatar/wifi-clock/master/skins/${skinIndex}/${digit}.png`;
            promises.push(loadImage(path, digit, context));
        }

        await Promise.all(promises);
    }

    getSkinOptions() {
        return new Array(23).fill(0).map((_, i) =>
            html`<option value=${i + 1}>${SKIN_NAMES[i] ?? `Skin ${i + 1}`}</option>`
        );
    }

    async uploadImages() {
        const context = this.ctx;
        const images = exportImages(context);
        for (const [index, image] of images.entries()) {
            await uploadDigit(index, image);
        }
    }

    render() {
        return html`
            <select @change=${this.onSelectedSkinChanged}>
                <option value="-">Load From Skin</option>
                ${this.getSkinOptions()}
            </select>
            <button>Load From Files</button>
            <button @click=${this.uploadImages}>Upload</button>
            <canvas width=${WIDTH * 5} height=${HEIGHT * 2}>
            </canvas>
        `;
    }
}
customElements.define('clock-skins', Skins);