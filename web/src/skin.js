import { html, css, LitElement } from 'https://unpkg.com/lit@2.0.0-rc.3?module';
import { classMap } from 'https://unpkg.com/lit@2.0.0-rc.3/directives/class-map.js?module';
import { styleMap } from 'https://unpkg.com/lit@2.0.0-rc.3/directives/style-map.js?module';

class Skins extends LitElement {
    static get styles() {
        return css`
            `;
    }

    constructor() {
        super();
    }

    render() {
        return html`
        <button>Load</button>
        <img src="https://github.com/andrei-tatar/wifi-clock/raw/master/esp32/styles/1/0.bmp">
        `;
    }
}
customElements.define('clock-skins', Skins);