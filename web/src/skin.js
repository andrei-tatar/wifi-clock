import { html, css, LitElement } from 'https://unpkg.com/lit@2.0.0-rc.3?module';
import './editor.js';
import { uploadDigit } from './service.js';
import { drawImage, WIDTH, HEIGHT, exportImages } from './util.js';


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

        .loaders {
            display: flex;
            flex-direction: row;
        }

        * {
            font-family: var(--font);
            font-size: 1.25rem;
        }
        
        canvas {
            background-image: linear-gradient(45deg, #BBB 25%, transparent 25%), linear-gradient(-45deg, #BBB 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #BBB 75%), linear-gradient(-45deg, transparent 75%, #BBB 75%);
            background-size: 40px 40px;
            background-position: 0px 0px, 0px 20px, 20px -20px, -20px 0px;
        }`;
    }

    get ctx() {
        return this.shadowRoot.querySelector('canvas').getContext('2d');
    }

    get editorCtx() {
        return this.shadowRoot.querySelector('skin-editor')?.ctx;
    }

    constructor() {
        super();
    }

    resetEditor() {
        return this.shadowRoot.querySelector('skin-editor').reset();
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
            promises.push(drawImage(path, digit, context));
        }

        await Promise.all(promises);
        this.resetEditor();
    }

    async loadFromFiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.click();
        input.onchange = async () => {
            const files = Array.from(input.files);
            const context = this.ctx;
            for (const [index, file] of files.entries()) {
                const digit = parseInt(file.name) ?? index;
                const image = await this.readFile(file);
                drawImage(image, digit, context)
            }
            this.resetEditor();
        };
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    getSkinOptions() {
        return new Array(23).fill(0).map((_, i) =>
            html`<option value=${i + 1}>${SKIN_NAMES[i] ?? `Skin ${i + 1}`}</option>`
        );
    }

    async uploadImages() {
        const context = this.editorCtx ?? this.ctx;
        const images = exportImages(context);
        for (const [index, image] of images.entries()) {
            await uploadDigit(index, image);
        }
    }

    render() {
        return html`
            <div class="loaders">
                <select @change=${this.onSelectedSkinChanged}>
                    <option value="-">Load From Skin</option>
                    ${this.getSkinOptions()}
                </select>
                <button @click=${this.loadFromFiles}>Load From Files</button>
                <button @click=${this.uploadImages}>Upload</button>
            </div>
            <skin-editor .contextResolver=${() => this.ctx}>
                <canvas width=${WIDTH * 5} height=${HEIGHT * 2}>
                </canvas>
            </skin-editor>
        `;
    }
}
customElements.define('clock-skins', Skins);