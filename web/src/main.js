import { html, css, LitElement } from 'https://unpkg.com/lit@2.0.0-rc.3?module';
import './collapsible.js';
import './skin.js';

class App extends LitElement {
    static get styles() {
        return css`
            clock-collapsible:not(:last-of-type) {
                border-bottom: 0;
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
            }

            clock-collapsible:not(:first-of-type) {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }
        `;
    }

    constructor() {
        super();
        this.addEventListener('expanded', (ev) => {
            const collapsibles = this.shadowRoot.querySelectorAll('clock-collapsible');
            const srcElement = ev.path[0];
            for (const c of collapsibles) {
                if (c !== srcElement && !c.collapsed) {
                    c.toggleCollapse();
                }
            }
        });
    }

    render() {
        return html`
        <h1>WiFi Clock</h1>
        <clock-collapsible header="Wi-Fi">
            TODO: Wifi-Status and settings
        </clock-collapsible>
        <clock-collapsible header="Skins">
            <clock-skins></clock-skins>
        </clock-collapsible>
        <clock-collapsible header="LED">
        </clock-collapsible>
        <clock-collapsible header="Network Sync">
        </clock-collapsible>
        <clock-collapsible header="Timezone">
        </clock-collapsible>`;
    }
}

customElements.define('clock-app', App);