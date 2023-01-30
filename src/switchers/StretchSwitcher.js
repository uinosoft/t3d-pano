import { PanoSwitcher } from '../PanoSwitcher.js';

class StretchSwitcher extends PanoSwitcher {

	constructor() {
		super();
	}

	_resetProperties() {
		const link = this._link;

		link.from.renderOrder = -999;
		link.to.renderOrder = -999.1;

		link.from.material.opacity = 1;
		link.to.material.opacity = 1;

		link.from.material.uniforms.stretchFactor = 0;
		link.to.material.uniforms.stretchFactor = 0;

		link.from.material.uniforms.stretchDirection[0] = link.direction[0];
		link.from.material.uniforms.stretchDirection[1] = link.direction[1];
		link.from.material.uniforms.stretchDirection[2] = link.direction[2];

		link.to.material.uniforms.stretchDirection[0] = -link.direction[0];
		link.to.material.uniforms.stretchDirection[1] = -link.direction[1];
		link.to.material.uniforms.stretchDirection[2] = -link.direction[2];
	}

	_updateProperties(elapsed) {
		const link = this._link;

		link.from.material.opacity = -(1 - elapsed) * (1 - elapsed) + 2 * (1 - elapsed); // ease-out: f(x)=-xx+2x
		link.from.material.uniforms.stretchFactor = elapsed * 0.7;

		link.to.material.uniforms.stretchFactor = (1 - elapsed) * 0.5;
	}

}

export { StretchSwitcher };