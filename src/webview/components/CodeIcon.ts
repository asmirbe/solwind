export default class CodeIcon extends HTMLElement {
	// Define properties for the icon name, space, and size
	icon: string;
	space: string | null;
	size: string;

	constructor() {
		super();
		this.icon = '';
		this.space = null;
		this.size = '16px';
	}

	connectedCallback() {
		this.updateIcon();
	}

	// Observe the 'icon' and 'space' attributes and update the properties accordingly
	static get observedAttributes() {
		return ['icon', 'space'];
	}

	attributeChangedCallback(name: string, oldValue: string, newValue: string) {
		if (oldValue !== newValue) {
			if (name === 'icon') {
				this.icon = newValue;
			} else if (name === 'space') {
				this.space = newValue;
			}
			this.updateIcon();
		}
	}

	// Update the icon and styles dynamically
	updateIcon() {
		this.className = `codicon codicon-${this.icon}`;
		if (this.space !== null) {
			this.style.marginRight = this.space;
		} else {
			this.style.marginRight = '';
		}
		this.style.fontSize = this.size;
	}
}