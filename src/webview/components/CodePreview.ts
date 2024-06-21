import { getHighlighter, Highlighter } from 'shiki';

class CodePreview extends HTMLElement {
	private code: string | null = null;
	private highlighter: Highlighter | null = null;

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	static get observedAttributes() {
		return ['code'];
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (name === 'code' && oldValue !== newValue) {
			this.code = newValue;
			this.render();
		}
	}

	connectedCallback() {
		this.render();
	}

	private async getSingletonHighlighter(): Promise<Highlighter> {
		if (!this.highlighter) {
			this.highlighter = await getHighlighter({
				themes: ['aurora-x'],
				langs: ['javascript', 'html'],
			});
		}
		return this.highlighter;
	}

	private async renderCodeToHtml(code: string) {
		const highlighter = await this.getSingletonHighlighter();
		return highlighter.codeToHtml(code, {
			theme: 'aurora-x',
			lang: 'html',
		});
	}

	private async render() {
		if (!this.shadowRoot || !this.code) return;

		const highlightedCodeHtml = await this.renderCodeToHtml(this.code);

		this.shadowRoot.innerHTML = `
      <style>
        pre.shiki {
          position: relative;
          z-index: 1;
          margin: 0;
          background: transparent;
          overflow-x: auto;
          overflow-y: hidden;
          height: min-content;
          max-height: 15vh;
          max-width: 100%;
          border: calc(var(--border-width) * 1px) solid var(--dropdown-border);
          background: var(--input-background) !important;
        }
        pre.shiki code {
          display: block;
          padding: 14px;
          counter-reset: step;
          counter-increment: step 0;
          line-height: 1.7;
          width: fit-content;
          background: var(--input-background);
          min-width: 100%;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace, monospace;
        }
        pre.shiki code span {
          font-style: normal !important;
        }
        pre.shiki code span::selection {
          background: #666666;
        }
        pre.shiki code .line:not(:last-child)::before {
          content: counter(step);
          counter-increment: step;
          width: 1rem;
          margin-right: 1.5rem;
          display: inline-block;
          text-align: right;
          color: var(--dropdown-border);
        }
        pre.shiki code::selection {
          background: #666666;
        }
		  label {
			 display: block;
			 color: var(--foreground);
			 cursor: pointer;
			 font-size: var(--type-ramp-base-font-size);
			 line-height: var(--type-ramp-base-line-height);
			 margin-bottom: 2px;
		 }
      </style>
      <div id="code">
        <label>Code</label>
        ${highlightedCodeHtml}
      </div>
    `;

		// Add event listener to the <pre> element for double-click
		this.addToggleHeightEventListener();
	}

	private addToggleHeightEventListener() {
		const codeContainer = this.shadowRoot?.getElementById('code');
		if (!codeContainer) return;

		codeContainer.addEventListener('dblclick', (event) => {
			const target = event.target as HTMLElement;
			const pre = target.closest('pre');

			if (pre) {
				pre.style.maxHeight = pre.style.maxHeight === 'min-content' ? '20vh' : 'min-content';
				pre.style.height = 'min-content';
			}
		});
	}
}

export default CodePreview;
