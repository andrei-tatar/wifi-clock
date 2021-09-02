import { html, css, LitElement } from 'https://unpkg.com/lit@2.0.0-rc.3?module';
import { styleMap } from 'https://unpkg.com/lit@2.0.0-rc.3/directives/style-map.js?module';
import { WIDTH, HEIGHT, getDigit, getOffset, rgb2hsv, hsv2rgb } from './util.js';

class Editor extends LitElement {
    static get styles() {
        return css`
            :host {
                display: flex;
                flex-direction: column;
            }

            .edit-container {
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .adorner {
                box-sizing: border-box;
                position: absolute;
                width: ${WIDTH}px;
                height: ${HEIGHT}px;
                border: 3px dashed lightgray;
                transition-property: transform, opacity;
                transition-duration: .3s;
            }

            .adorner.selected {
                border-color: blue;
                border-style: solid;
                transition-property: opacity;
            }

            canvas {
                max-width: 100%;
            }

            `;
    }

    constructor() {
        super();
        this.digit = -1;
        this.selectedDigit = -1;
        this.lastDigit = 0;

        addEventListener('resize', () => this.requestUpdate('scale'));
        this.addEventListener('mousemove', (e) => {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const scale = this.scale;
            this.digit = getDigit({ x: x / scale, y: y / scale });
            if (this.digit !== -1) { this.lastDigit = this.digit; }
            this.requestUpdate();
        });

        this.addEventListener('mouseleave', () => {
            this.digit = -1;
            this.requestUpdate();
        });

        this.addEventListener('click', () => {
            if (this.digit >= 0) {
                this.selectedDigit = this.digit === this.selectedDigit ? -1 : this.digit;
                this.requestUpdate();
            }
        });
    }

    get scale() {
        return this.clientWidth / (WIDTH * 5);
    }

    adornerStyle(digit) {
        const show = digit !== -1;
        let { x, y } = getOffset(show ? digit : this.lastDigit);
        const scale = this.scale;
        x = x * scale - (1 - scale) * WIDTH / 2;
        y = y * scale - (1 - scale) * HEIGHT / 2;
        return {
            transform: `translate(${x}px, ${y}px) scale(${show ? scale : 0})`,
            opacity: show ? 1 : 0,
        };
    }

    settings = new Array(10).fill(0).map(_ => ({
        hue: 0,
        saturation: 1,
        value: 1,
    }));

    get editableDigit() {
        return Math.max(this.selectedDigit, 0);
    }

    get editorHue() { return this.settings[this.editableDigit].hue; }
    set editorHue(value) {
        this.settings[this.editableDigit].hue = value;
        this.updateTransform();
    }

    get editorSaturation() { return this.settings[this.editableDigit].saturation; }
    set editorSaturation(value) {
        this.settings[this.editableDigit].saturation = value;
        this.updateTransform();
    }

    get editorValue() { return this.settings[this.editableDigit].value; }
    set editorValue(value) {
        this.settings[this.editableDigit].value = value;
        this.updateTransform();
    }

    get ctx() {
        return this.shadowRoot.querySelector('canvas').getContext('2d');
    }

    timer;

    updateTransform() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.doUpdate(this.selectedDigit), 500);
    }

    doUpdate(digit) {
        const ctx = this.contextResolver();
        const all = digit === -1;
        const { x, y } = all ? { x: 0, y: 0 } : getOffset(digit);
        const imageData = all
            ? ctx.getImageData(x, y, WIDTH * 5, HEIGHT * 2)
            : ctx.getImageData(x, y, WIDTH, HEIGHT);

        const settings = this.settings[this.editableDigit];
        for (let py = 0; py < imageData.height; py++)
            for (let px = 0; px < imageData.width; px++) {
                const offset = (py * imageData.width + px) * 4;
                const r = imageData.data[offset + 0];
                const g = imageData.data[offset + 1];
                const b = imageData.data[offset + 2];
                let [h, s, v] = rgb2hsv(r / 255, g / 255, b / 255);
                h = (h + settings.hue) % 360;
                s = Math.min(1, s * settings.saturation * settings.saturation);
                v = Math.min(1, v * settings.value * settings.value);
                const [rr, gg, bb] = hsv2rgb(h, s, v);
                imageData.data[offset + 0] = rr * 255;
                imageData.data[offset + 1] = gg * 255;
                imageData.data[offset + 2] = bb * 255;
            }

        const dst = this.ctx;
        dst.putImageData(imageData, x, y);
    }

    reset() {
        this.selectedDigit = -1;
        this.settings.forEach(s => {
            s.hue = 0;
            s.saturation = 1;
            s.value = 1;
        });
        this.ctx.clearRect(0, 0, WIDTH * 5, HEIGHT * 2);
        this.updateTransform();
    }

    render() {
        const selectAdorner = this.selectedDigit >= 0
            ? html`<div class="adorner selected" style=${styleMap(this.adornerStyle(this.selectedDigit))}></div>`
            : null;

        const editor = html`
        <div class="edit-controls">
            <input type="range" min="0" max="360" step="10" 
                .value="${'' + this.editorHue}" 
                @input=${e => this.editorHue = +e.target.value}/>
            <input type="range" min="0" max="5" step=".05" 
                .value="${'' + this.editorSaturation}" 
                @input=${e => this.editorSaturation = +e.target.value}/>
            <input type="range" min="0" max="5" step=".05" 
                .value="${'' + this.editorValue}" 
                @input=${e => this.editorValue = +e.target.value}/>
        </div>`

        return html`
            <div class="edit-container">
                <canvas width=${WIDTH * 5} height=${HEIGHT * 2} style="position: absolute"></canvas>
                <div class="adorner" style=${styleMap(this.adornerStyle(this.digit))}></div>
                ${selectAdorner}
                <slot></slot>
            </div>
            ${editor}`;
    }
}
customElements.define('skin-editor', Editor);