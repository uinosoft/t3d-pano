// t3d-pano
import { Mesh, SphereGeometry, ShaderMaterial, DRAW_SIDE, Quaternion, Vector2 } from 't3d';

class Pano extends Mesh {

	constructor(options = {}) {
		const geometry = new SphereGeometry(options.radius || 10, 60, 40);
		const material = new ShaderMaterial(PanoShader);
		material.transparent = true;
		material.depthTest = false;
		material.depthWrite = false;
		material.side = DRAW_SIDE.BACK;

		super(geometry, material);

		this.renderOrder = -999;
	}

}

Pano.prototype.isPano = true;

const PanoShader = {
	defines: {},

	uniforms: {
		'stretchFactor': 0,
		'stretchDirection': [0, 0, 1]
	},

	vertexShader: `
        #include <common_vert>

        attribute vec2 a_Uv;
        varying vec2 v_Uv;
        
        void main() {
            v_Uv = a_Uv;
			vec4 worldPosition = u_Model * vec4(a_Position, 1.0);
			worldPosition.xyz += u_CameraPosition;
            gl_Position = u_ProjectionView * worldPosition;
			gl_Position.z = gl_Position.w;
        }
    `,

	fragmentShader: `
        uniform float stretchFactor;
		uniform vec3 stretchDirection;

        uniform sampler2D diffuseMap;
        uniform float u_Opacity;
		uniform vec3 u_Color;
		uniform mat4 u_Model;

		varying vec2 v_Uv;

		// spherical coordinates:
		// phi: lateral angle, start from -x axis, [0-2PI]
		// theta: lateral angle, start from +y axis, [0-PI]

		// uv -> spherical -> vector3
		void uvToVector3(in vec2 uv, out vec3 vector) {
			float phi = uv.x * 2. * PI;
			float theta = -uv.y * PI;

			vector.x = -cos(phi) * sin(theta);
			vector.y = cos(theta);
			vector.z = -sin(phi) * sin(theta);

			vector = normalize(vector);
		}

		// vector3 -> spherical -> uv
		void vector3ToUV(in vec3 vector, out vec2 uv) {
			float theta = acos(vector.y);
			float phi = atan(vector.z, vector.x);
			uv.x = phi / 2.0 / PI;
			uv.y = theta / PI;
		}

		vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
			return normalize((vec4(dir, 0.0) * matrix).xyz);
		}

		void applyStretch(inout vec2 uv) {
			vec3 direction = vec3(0.0, 0.0, 0.0);

			uvToVector3(uv, direction);

			vec3 targetDirection = inverseTransformDirection(stretchDirection, u_Model);
			vec3 delta = direction - targetDirection;
			direction += delta * stretchFactor;
			direction = normalize(direction);

			vector3ToUV(direction, uv);
		}

        void main() {
			vec4 col = vec4(u_Color, u_Opacity);

            vec2 uv = v_Uv;
            uv.x = 1. - uv.x;

			applyStretch(uv);

            col.xyz *= texture2D(diffuseMap, fract(uv)).xyz;

            gl_FragColor = col;
        }
    `
};

class PanoGraph {

	constructor() {
		this.links = [];
	}

	link(from, to, direction) {
		for (let i = 0; i < this.links.length; i++) {
			const link = this.links[i];
			if (link.from === from && link.to === to) {
				console.warn('PanoGraph: Duplicate pano Links.');
				return this;
			}
		}

		this.links.push({ from, to, direction });

		return this;
	}

	delink(from, to) {
		for (let i = 0; i < this.links.length; i++) {
			if (this.links[i].from === from && this.links[i].to === to) {
				this.links.splice(i, 1);
				return this;
			}
		}

		return this;
	}

	getLinks(pano, result = []) {
		result.length = 0; // in case the array is not reset

		this.links.forEach(link => {
			if (link.from === pano) {
				result.push(link);
			}
		});

		return result;
	}

}

class PanoSwitcher {

	constructor() {
		this._link = null;

		this._duration = 0;
		this._timer = 0;

		this._running = false;

		this._onUpdateCallback = null;
		this._onCompleteCallback = null;
	}

	run(link, options = {}) {
		this._link = link;

		this._duration = (options.time !== undefined ? options.time : 1000) / 1000;
		this._timer = 0;

		this._running = true;

		this._resetProperties();

		return this;
	}

	update(deltaTime) {
		if (!this._running) return;

		this._timer += deltaTime;

		let elapsed = this._timer / this._duration;
		elapsed = (this._duration === 0 || elapsed > 1) ? 1 : elapsed;

		this._updateProperties(elapsed);

		if (this._onUpdateCallback) {
			this._onUpdateCallback(this._link, elapsed);
		}

		if (elapsed === 1) {
			if (this._onCompleteCallback) {
				this._onCompleteCallback(this._link);
			}

			this._running = false;
		}
	}

	stop() {
		this._link = null;
		this._running = false;
		this._timer = 0;
		return this;
	}

	onUpdate(callback) {
		this._onUpdateCallback = callback;
		return this;
	}

	onComplete(callback) {
		this._onCompleteCallback = callback;
		return this;
	}

	_resetProperties() {

	}

	_updateProperties(elapsed) {

	}

}

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

class PanoCameraControls {

	constructor(object, domElement) {
		this.object = object;
		this.object.euler.order = 'YXZ';

		this.domElement = (domElement !== undefined) ? domElement : document;
		if (domElement) this.domElement.setAttribute('tabindex', -1);

		this.cameraFov = 65 / 180 * Math.PI;
		this.cameraAspect = null;

		this.dollyingSpeed = 1.0;

		this.minFov = 45 / 180 * Math.PI;
		this.maxFov = 100 / 180 * Math.PI;

		this.rotateSpeed = 0.25;
		this.enableRotateDamping = true;
		this.rotateDampingFactor = 0.5;

		this.update = function () {
			rotateVector.add(rotateAccum);

			this.object.euler.x -= rotateVector.x;
			this.object.euler.y -= rotateVector.y;
			this.object.euler.x = Math.min(Math.PI * 0.5, Math.max(-Math.PI * 0.5, this.object.euler.x));

			if (this.enableRotateDamping) {
				rotateVector.multiplyScalar(1 - this.rotateDampingFactor);
			} else {
				rotateVector.set(0, 0);
			}

			rotateAccum.set(0, 0);

			const element = (this.domElement === document) ? this.domElement.body : this.domElement;
			const cameraAspect = (this.cameraAspect !== null) ? this.cameraAspect : (element.clientWidth / element.clientHeight);

			this.cameraFov *= scale;
			if (this.cameraFov > this.maxFov) {
				this.cameraFov = this.maxFov;
			} else if (this.cameraFov < this.minFov) {
				this.cameraFov = this.minFov;
			}

			this.object.projectionMatrix.elements[0] = 1 / (cameraAspect * Math.tan(this.cameraFov / 2));
			this.object.projectionMatrix.elements[5] = 1 / (Math.tan(this.cameraFov / 2));
			this.object.projectionMatrixInverse.getInverse(this.object.projectionMatrix);

			scale = 1;

			if (8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ||
				Math.abs(lastFov - this.cameraFov) > EPS) {
				lastQuaternion.copy(this.object.quaternion);
				lastFov = this.cameraFov;

				return true;
			}

			return false;
		};

		const lastQuaternion = new Quaternion();
		const EPS = 0.000001;

		let lastFov = 0;

		let scale = 1;

		const rotateStart = new Vector2();
		const rotateEnd = new Vector2();
		const rotateAccum = new Vector2();
		const rotateDelta = new Vector2();
		const rotateVector = new Vector2();

		const dollyStart = new Vector2();
		const dollyEnd = new Vector2();
		const dollyDelta = new Vector2();

		const STATE = { NONE: 0, MOUSE: 1, TOUCH_ROTATE: 2, TOUCH_DOLLY: 3 };

		let state = STATE.NONE;

		const scope = this;
		const pointers = [];
		const pointerPositions = {};

		function updateRotateVector() {
			const element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			const x = rotateDelta.x, y = rotateDelta.y;
			rotateDelta.x = (2 * Math.PI * y / element.clientHeight);
			rotateDelta.y = (2 * Math.PI * x / element.clientWidth);
		}

		function mousedown(event) {
			if (event.button === 0) {
				scope.domElement.style.cursor = 'move';

				rotateStart.set(event.clientX, event.clientY);

				state = STATE.MOUSE;
			}
		}

		function mousemove(event) {
			if (state === 0) return;

			rotateEnd.set(event.clientX, event.clientY);

			rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(-scope.rotateSpeed);

			updateRotateVector();

			rotateAccum.add(rotateDelta);

			rotateStart.copy(rotateEnd);
		}

		function mouseleave(event) {
			if (state) {
				removePointer(event);

				scope.domElement.style.cursor = '';

				state = STATE.NONE;

				rotateDelta.set(0, 0);
			}
		}

		function getDollyingScale() {
			return Math.pow(0.95, scope.dollyingSpeed);
		}

		function dollyOut(dollyScale) {
			scale /= dollyScale;
		}

		function dollyIn(dollyScale) {
			scale *= dollyScale;
		}

		function onMouseWheel(event) {
			event.preventDefault();

			if (event.deltaY < 0) {
				dollyIn(getDollyingScale());
			} else if (event.deltaY > 0) {
				dollyOut(getDollyingScale());
			}
		}

		function trackPointer(event) {
			let position = pointerPositions[event.pointerId];

			if (position === undefined) {
				position = new Vector2();
				pointerPositions[event.pointerId] = position;
			}

			position.set(event.pageX, event.pageY);
		}

		function removePointer(event) {
			delete pointerPositions[event.pointerId];

			for (let i = 0; i < pointers.length; i++) {
				if (pointers[i].pointerId == event.pointerId) {
					pointers.splice(i, 1);
					return;
				}
			}
		}

		function getSecondPointerPosition(event) {
			const pointer = (event.pointerId === pointers[0].pointerId) ? pointers[1] : pointers[0];

			return pointerPositions[pointer.pointerId];
		}

		function touchMove(event) {
			trackPointer(event);

			switch (state) {
				case STATE.TOUCH_ROTATE:
					if (pointers.length == 1) {
						rotateEnd.set(event.pageX, event.pageY);
					} else {
						const position = getSecondPointerPosition(event);

						const x = 0.5 * (event.pageX + position.x);
						const y = 0.5 * (event.pageY + position.y);

						rotateEnd.set(x, y);
					}

					rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(-scope.rotateSpeed);

					updateRotateVector();

					rotateAccum.add(rotateDelta);

					rotateStart.copy(rotateEnd);
					break;
				case STATE.TOUCH_DOLLY:
					const position = getSecondPointerPosition(event);

					const dx = event.pageX - position.x;
					const dy = event.pageY - position.y;

					const distance = Math.sqrt(dx * dx + dy * dy);

					dollyEnd.set(0, distance);

					dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.dollyingSpeed));

					dollyOut(dollyDelta.y);

					dollyStart.copy(dollyEnd);
					break;
				default:
					state = STATE.NONE;
			}
		}

		function touchStart(event) {
			trackPointer(event);

			switch (pointers.length) {
				case 1:
					if (pointers.length === 1) {
						rotateStart.set(pointers[0].pageX, pointers[0].pageY);
					} else {
						const x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
						const y = 0.5 * (pointers[0].pageY + pointers[1].pageY);

						rotateStart.set(x, y);
					}

					state = STATE.TOUCH_ROTATE;
					break;
				case 2:
					const dx = pointers[0].pageX - pointers[1].pageX;
					const dy = pointers[0].pageY - pointers[1].pageY;

					const distance = Math.sqrt(dx * dx + dy * dy);

					dollyStart.set(0, distance);

					state = STATE.TOUCH_DOLLY;
					break;
				default:
					state = STATE.NONE;
			}
		}

		function pointermove(event) {
			if (event.pointerType === 'touch') {
				touchMove(event);
			} else {
				mousemove(event);
			}
		}

		function pointerdown(event) {
			pointers.push(event);

			if (event.pointerType === 'touch') {
				touchStart(event);
			} else {
				mousedown(event);
			}
		}

		function pointerup(event) {
			removePointer(event);

			state = STATE.NONE;

			if (event.pointerType === 'mouse') {
				scope.domElement.style.cursor = '';
			}
			rotateDelta.set(0, 0);
		}

		this.domElement.addEventListener('pointermove', pointermove);
		this.domElement.addEventListener('pointerdown', pointerdown);
		this.domElement.addEventListener('pointerup', pointerup);

		this.domElement.addEventListener('mouseleave', mouseleave);
		this.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

		updateRotateVector();
	}

}

export { FadeSwitcher, Pano, PanoCameraControls, PanoGraph, PanoSwitcher, StretchSwitcher };
