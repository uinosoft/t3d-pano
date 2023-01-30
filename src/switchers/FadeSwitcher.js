import { PanoSwitcher } from '../PanoSwitcher.js';

class FadeSwitcher extends PanoSwitcher {

	constructor() {
		super();
	}

	_resetProperties() {
		const link = this._link;

		link.from.renderOrder = -999;
		link.to.renderOrder = -999.1;

		link.from.material.opacity = 1;
		link.to.material.opacity = 1;

		// clear stretch factors
		link.from.material.uniforms.stretchFactor = 0;
		link.to.material.uniforms.stretchFactor = 0;
	}

	_updateProperties(elapsed) {
		const link = this._link;

		link.from.material.opacity = 1 - elapsed;
	}

}

export { FadeSwitcher };