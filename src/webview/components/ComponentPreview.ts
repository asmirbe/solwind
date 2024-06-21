export default class ComponentPreview extends HTMLElement {
	private previewHtml: string;
	private initialX: number;
	private initialWidth: number;
	private isDragging: boolean = false;

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
				margin-right: var(--size);
				border: 0;
				background: white;
			}
			#width-option {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				width: var(--size);
				cursor: ew-resize;
				background: var(--input-background);
				border-radius: calc(var(--corner-radius-round)* 1px);
			}
			#width-option svg {
				height: var(--size);
				width: var(--size);
			}
			#container {
				display: flex;
				position: relative;
				border: calc(var(--border-width)* 1px) solid var(--dropdown-border);
			}
		 </style>
		 <div>
			<label>Preview</label>
			<div id="container" style="width: 100%; --size: 18px;">
				<iframe id="preview" src="${this.previewHtml}" sandbox="allow-scripts allow-same-origin"></iframe>
				<div id="width-option">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<path fill="#777" d="M9 19.23q-.508 0-.87-.36q-.36-.362-.36-.87t.36-.87q.362-.36.87-.36t.87.36q.36.362.36.87t-.36.87q-.362.36-.87.36Zm6 0q-.508 0-.87-.36q-.36-.362-.36-.87t.36-.87q.362-.36.87-.36t.87.36q.36.362.36.87t-.36.87q-.362.36-.87.36Zm-6-6q-.508 0-.87-.36q-.36-.362-.36-.87t.36-.87q.362-.36.87-.36t.87.36q.36.362.36.87t-.36.87q-.362.36-.87.36Zm6 0q-.508 0-.87-.36q-.36-.362-.36-.87t.36-.87q.362-.36.87-.36t.87.36q.36.362.36.87t-.36.87q-.362.36-.87.36Zm-6-6q-.508 0-.87-.36q-.36-.362-.36-.87t.36-.87q.362-.36.87-.36t.87.36q.36.362.36.87t-.36.87q-.362.36-.87.36Zm6 0q-.508 0-.87-.36q-.36-.362-.36-.87t.36-.87q.362-.36.87-.36t.87.36q.36.362.36.87t-.36.87q-.362.36-.87.36Z"/>
					</svg>
				</div>
			</div>
		 </div>
	  `;
	}


	private addEventListeners() {
		const widthOption = this.shadowRoot?.getElementById('width-option');
		widthOption?.addEventListener('dblclick', () => {
			const container = this.shadowRoot?.getElementById('container') as HTMLDivElement;
			if (container.style.width !== '100%') container.style.width = '100%';
		});
		widthOption?.addEventListener('mousedown', this.initDrag.bind(this));
		document.addEventListener('mousemove', this.doDrag.bind(this));
		document.addEventListener('mouseup', this.stopDrag.bind(this));
		document.addEventListener('mouseleave', this.stopDrag.bind(this));
	}

	private removeEventListeners() {
		const widthOption = this.shadowRoot?.getElementById('width-option');
		widthOption?.removeEventListener('mousedown', this.initDrag.bind(this));
		document.removeEventListener('mousemove', this.doDrag.bind(this));
		document.removeEventListener('mouseup', this.stopDrag.bind(this));
		document.removeEventListener('mouseleave', this.stopDrag.bind(this));
	}

	private initDrag(event: MouseEvent) {
		event.preventDefault();
		this.isDragging = true;
		this.initialX = event.clientX;
		const container = this.shadowRoot?.getElementById('container') as HTMLDivElement;
		this.initialWidth = container.offsetWidth;

		// Disable pointer events for the iframe during dragging
		const iframe = this.shadowRoot?.getElementById('preview') as HTMLIFrameElement;
		iframe.style.pointerEvents = 'none';
	}

	private doDrag(event: MouseEvent) {
		if (!this.isDragging) return;

		const container = this.shadowRoot?.getElementById('container') as HTMLDivElement;
		const newWidth = this.initialWidth + (event.clientX - this.initialX);
		const minWidth = 360;
		const maxWidth = container.parentElement?.clientWidth || window.innerWidth;

		if (newWidth > minWidth && newWidth < maxWidth) {
			container.style.width = `${newWidth}px`;
		}
	}

	private stopDrag = () => {
		this.isDragging = false;

		// Re-enable pointer events for the iframe after dragging
		const iframe = this.shadowRoot?.getElementById('preview') as HTMLIFrameElement;
		iframe.style.pointerEvents = 'auto';
	};
}