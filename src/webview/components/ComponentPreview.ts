export default class ComponentPreview extends HTMLElement {
	private previewHtml: string;
	private initialX: number;
	private initialWidth: number;

	constructor(previewHtml: string) {
		super();
		this.previewHtml = previewHtml;
		this.attachShadow({ mode: 'open' });
		this.render();
	}

	static get observedAttributes() {
		return ['src'];
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (name === 'src' && oldValue !== newValue) {
			this.previewHtml = newValue;
			this.render();
		}
	}

	connectedCallback() {
		this.render();
		this.addEventListeners();
	}

	disconnectedCallback() {
		this.removeEventListeners();
	}

	private render() {
		if (!this.shadowRoot) return;
		this.shadowRoot.innerHTML = `
		 <style>
			label {
				display: block;
				color: var(--foreground);
				cursor: pointer;
				font-size: var(--type-ramp-base-font-size);
				line-height: var(--type-ramp-base-line-height);
				margin-bottom: 2px;
			}
			iframe {
				position: relative;
				z-index: 1;
				margin: 0;
				width: 100%;
				min-height: 260px;
				overflow-x: auto;
				max-width: 100%;
				margin-right: 24px;
				border: 0;
				background: var(--input-background);
			}
			.width-option {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				height: 100%;
				display:flex;
				align-items: center;
				justify-content: center;
				width: 24px;
				background: #fff;
			}
			.width-option .drag {
				position: absolute;
				border-radius: 9999px;
  				background: rgba(0, 0, 0, .3);
    			width: 0.375rem;
				height: 2rem;
				pointer-event: none;
				cursor: ew-resize;
				z-index: 1;
			}
			#container {
				display: flex;
				position: relative;
			}
		 </style>
		 <div>
			<label>Preview</label>
			<div id="container" style="width: 100%;">
				<iframe id="preview" src="${this.previewHtml}" sandbox="allow-scripts"></iframe>
				<div class="width-option"><span class="drag"></span></div>
			</div>
		 </div>
	  `;
	}


	private addEventListeners() {
		const widthOption = this.shadowRoot?.querySelector('.width-option');
		widthOption?.addEventListener('mousedown', this.initDrag.bind(this));
	}

	private removeEventListeners() {
		const widthOption = this.shadowRoot?.querySelector('.width-option');
		widthOption?.removeEventListener('mousedown', this.initDrag.bind(this));
	}

	private initDrag(event: MouseEvent) {
		event.preventDefault();
		this.initialX = event.clientX;
		const container = this.shadowRoot?.querySelector('#container') as HTMLDivElement;
		this.initialWidth = container.offsetWidth;
		document.addEventListener('mousemove', this.doDrag);
		document.addEventListener('mouseup', this.stopDrag);
	}

	private doDrag = (event: MouseEvent) => {
		const container = this.shadowRoot?.querySelector('#container') as HTMLDivElement;
		const newWidth = this.initialWidth + (event.clientX - this.initialX);
		const minWidth = 360;
		const maxWidth = container.parentElement?.clientWidth || window.innerWidth;

		if (newWidth > minWidth && newWidth < maxWidth) {
			container.style.width = `${newWidth}px`;
		}
	};

	private stopDrag = () => {
		document.removeEventListener('mousemove', this.doDrag);
		document.removeEventListener('mouseup', this.stopDrag);
	};
}