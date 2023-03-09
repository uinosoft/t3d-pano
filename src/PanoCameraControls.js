import {
	Quaternion,
	Vector2,
} from 't3d';

class PanoCameraControls {

	constructor(object, domElement) {
		this.object = object;
		this.object.euler.order = 'YXZ';

		this.domElement = (domElement !== undefined) ? domElement : document;
		this.domElement.style.touchAction = 'none';
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

		function pointerCancel(event) {
			removePointer(event);
		}

		function pointermove(event) {
			if (event.pointerType === 'touch') {
				touchMove(event);
			} else {
				mousemove(event);
			}
		}

		function pointerdown(event) {
			if (pointers.length === 0) {
				scope.domElement.setPointerCapture(event.pointerId);

				scope.domElement.addEventListener('pointermove', pointermove);
				scope.domElement.addEventListener('pointerup', pointerup);
			}

			pointers.push(event);

			if (event.pointerType === 'touch') {
				touchStart(event);
			} else {
				mousedown(event);
			}
		}

		function pointerup(event) {
			removePointer(event);

			if (pointers.length === 0) {
				scope.domElement.releasePointerCapture(event.pointerId);

				scope.domElement.removeEventListener('pointermove', pointermove);
				scope.domElement.removeEventListener('pointerup', pointerup);
			}

			state = STATE.NONE;

			if (event.pointerType === 'mouse') {
				scope.domElement.style.cursor = '';
			}
			rotateDelta.set(0, 0);
		}

		this.domElement.addEventListener('pointerdown', pointerdown);

		this.domElement.addEventListener('mouseleave', mouseleave);
		this.domElement.addEventListener('pointercancel', pointerCancel);
		this.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

		updateRotateVector();
	}

}

export { PanoCameraControls };