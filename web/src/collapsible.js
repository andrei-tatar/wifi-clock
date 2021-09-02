import { html, css, LitElement } from 'https://unpkg.com/lit@2.0.0-rc.3?module';
import { classMap } from 'https://unpkg.com/lit@2.0.0-rc.3/directives/class-map.js?module';
import { styleMap } from 'https://unpkg.com/lit@2.0.0-rc.3/directives/style-map.js?module';

class Collapsible extends LitElement {
    static get styles() {
        return css`
            :host {
                display: flex;
                flex-direction: column;
                border: 1px solid gray;
                border-radius: 8px;
            }

            .title {
                cursor: pointer;
                font-size: 1.5rem;
                padding: 8px;
            }

            .content {
                display: flex;
                flex-direction: column;
                border-top: 1px solid gray;
                padding: 8px;
                overflow: hidden;
                transition-property: height, padding, opacity, border-color;
                transition-duration: .3s;
            }

            .collapsed {
                opacity: 0;
                padding-top: 0;
                padding-bottom: 0;
                border-color: transparent
            }`;
    }

    static get properties() {
        return {
            header: { type: String },
            collapsed: { type: Boolean },
        }
    }

    constructor() {
        super();
        this.collapsed = true;
        this.height = 0;
    }

    toggleCollapse() {
        const wrapper = this.shadowRoot.querySelector('#wrapper');
        if (!this.collapsed) {
            this.collapsed = true;
            this.height = `${wrapper.clientHeight}px`;

            setTimeout(() => {
                this.height = 0;
                this.requestUpdate();
            });
        } else {
            this.collapsed = false;
            this.height = `${wrapper.clientHeight}px`;
            setTimeout(() => {
                this.height = null;
                this.requestUpdate();
            }, 300);
        }

        if (!this.collapsed) {
            const event = new Event('expanded', { bubbles: true, composed: true });
            this.dispatchEvent(event);
        }
    }

    render() {
        return html`
        <div @click="${this.toggleCollapse}" class="title">
            ${this.header}
        </div>
        <div style=${styleMap({ height: this.height })} class=${classMap({ content: true, collapsed: this.collapsed })} >
            <div id="wrapper">
                <slot></slot>
            </div>
        </div>`;
    }
}
customElements.define('clock-collapsible', Collapsible);