// t3d-pano
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('t3d')) :
	typeof define === 'function' && define.amd ? define(['exports', 't3d'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.t3d = global.t3d || {}, global.t3d));
})(this, (function (exports, t3d) { 'use strict';

	function _inheritsLoose(subClass, superClass) {
		subClass.prototype = Object.create(superClass.prototype);
		subClass.prototype.constructor = subClass;
		_setPrototypeOf(subClass, superClass);
	}
	function _setPrototypeOf(o, p) {
		_setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
			o.__proto__ = p;
			return o;
		};
		return _setPrototypeOf(o, p);
	}

	var Pano = /*#__PURE__*/function (_Mesh) {
		_inheritsLoose(Pano, _Mesh);
		function Pano(options) {
			var _this;
			if (options === void 0) {
				options = {};
			}
			var geometry = new t3d.SphereGeometry(options.radius || 10, 60, 40);
			var material = new t3d.ShaderMaterial(PanoShader);
			material.transparent = true;
			material.depthTest = false;
			material.depthWrite = false;
			material.side = t3d.DRAW_SIDE.BACK;
			_this = _Mesh.call(this, geometry, material) || this;
			_this.renderOrder = -999;
			return _this;
		}
		return Pano;
	}(t3d.Mesh);
	Pano.prototype.isPano = true;
	var PanoShader = {
		defines: {},
		uniforms: {
			'stretchFactor': 0,
			'stretchDirection': [0, 0, 1]
		},
		vertexShader: "\n				#include <common_vert>\n\n				attribute vec2 a_Uv;\n				varying vec2 v_Uv;\n				\n				void main() {\n						v_Uv = a_Uv;\n\t\t\tvec4 worldPosition = u_Model * vec4(a_Position, 1.0);\n\t\t\tworldPosition.xyz += u_CameraPosition;\n						gl_Position = u_ProjectionView * worldPosition;\n\t\t\tgl_Position.z = gl_Position.w;\n				}\n		",
		fragmentShader: "\n				uniform float stretchFactor;\n\t\tuniform vec3 stretchDirection;\n\n				uniform sampler2D diffuseMap;\n				uniform float u_Opacity;\n\t\tuniform vec3 u_Color;\n\t\tuniform mat4 u_Model;\n\n\t\tvarying vec2 v_Uv;\n\n\t\t// spherical coordinates:\n\t\t// phi: lateral angle, start from -x axis, [0-2PI]\n\t\t// theta: lateral angle, start from +y axis, [0-PI]\n\n\t\t// uv -> spherical -> vector3\n\t\tvoid uvToVector3(in vec2 uv, out vec3 vector) {\n\t\t\tfloat phi = uv.x * 2. * PI;\n\t\t\tfloat theta = -uv.y * PI;\n\n\t\t\tvector.x = -cos(phi) * sin(theta);\n\t\t\tvector.y = cos(theta);\n\t\t\tvector.z = -sin(phi) * sin(theta);\n\n\t\t\tvector = normalize(vector);\n\t\t}\n\n\t\t// vector3 -> spherical -> uv\n\t\tvoid vector3ToUV(in vec3 vector, out vec2 uv) {\n\t\t\tfloat theta = acos(vector.y);\n\t\t\tfloat phi = atan(vector.z, vector.x);\n\t\t\tuv.x = phi / 2.0 / PI;\n\t\t\tuv.y = theta / PI;\n\t\t}\n\n\t\tvec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {\n\t\t\treturn normalize((vec4(dir, 0.0) * matrix).xyz);\n\t\t}\n\n\t\tvoid applyStretch(inout vec2 uv) {\n\t\t\tvec3 direction = vec3(0.0, 0.0, 0.0);\n\n\t\t\tuvToVector3(uv, direction);\n\n\t\t\tvec3 targetDirection = inverseTransformDirection(stretchDirection, u_Model);\n\t\t\tvec3 delta = direction - targetDirection;\n\t\t\tdirection += delta * stretchFactor;\n\t\t\tdirection = normalize(direction);\n\n\t\t\tvector3ToUV(direction, uv);\n\t\t}\n\n				void main() {\n\t\t\tvec4 col = vec4(u_Color, u_Opacity);\n\n						vec2 uv = v_Uv;\n						uv.x = 1. - uv.x;\n\n\t\t\tapplyStretch(uv);\n\n						col.xyz *= texture2D(diffuseMap, fract(uv)).xyz;\n\n						gl_FragColor = col;\n				}\n		"
	};

	var PanoGraph = /*#__PURE__*/function () {
		function PanoGraph() {
			this.links = [];
		}
		var _proto = PanoGraph.prototype;
		_proto.link = function link(from, to, direction) {
			for (var i = 0; i < this.links.length; i++) {
				var link = this.links[i];
				if (link.from === from && link.to === to) {
					console.warn('PanoGraph: Duplicate pano Links.');
					return this;
				}
			}
			this.links.push({
				from: from,
				to: to,
				direction: direction
			});
			return this;
		};
		_proto.delink = function delink(from, to) {
			for (var i = 0; i < this.links.length; i++) {
				if (this.links[i].from === from && this.links[i].to === to) {
					this.links.splice(i, 1);
					return this;
				}
			}
			return this;
		};
		_proto.getLinks = function getLinks(pano, result) {
			if (result === void 0) {
				result = [];
			}
			result.length = 0; // in case the array is not reset

			this.links.forEach(function (link) {
				if (link.from === pano) {
					result.push(link);
				}
			});
			return result;
		};
		return PanoGraph;
	}();

	var PanoSwitcher = /*#__PURE__*/function () {
		function PanoSwitcher() {
			this._link = null;
			this._duration = 0;
			this._timer = 0;
			this._running = false;
			this._onUpdateCallback = null;
			this._onCompleteCallback = null;
		}
		var _proto = PanoSwitcher.prototype;
		_proto.run = function run(link, options) {
			if (options === void 0) {
				options = {};
			}
			this._link = link;
			this._duration = (options.time !== undefined ? options.time : 1000) / 1000;
			this._timer = 0;
			this._running = true;
			this._resetProperties();
			return this;
		};
		_proto.update = function update(deltaTime) {
			if (!this._running) return;
			this._timer += deltaTime;
			var elapsed = this._timer / this._duration;
			elapsed = this._duration === 0 || elapsed > 1 ? 1 : elapsed;
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
		};
		_proto.stop = function stop() {
			this._link = null;
			this._running = false;
			this._timer = 0;
			return this;
		};
		_proto.onUpdate = function onUpdate(callback) {
			this._onUpdateCallback = callback;
			return this;
		};
		_proto.onComplete = function onComplete(callback) {
			this._onCompleteCallback = callback;
			return this;
		};
		_proto._resetProperties = function _resetProperties() {};
		_proto._updateProperties = function _updateProperties(elapsed) {};
		return PanoSwitcher;
	}();

	var FadeSwitcher = /*#__PURE__*/function (_PanoSwitcher) {
		_inheritsLoose(FadeSwitcher, _PanoSwitcher);
		function FadeSwitcher() {
			return _PanoSwitcher.call(this) || this;
		}
		var _proto = FadeSwitcher.prototype;
		_proto._resetProperties = function _resetProperties() {
			var link = this._link;
			link.from.renderOrder = -999;
			link.to.renderOrder = -999.1;
			link.from.material.opacity = 1;
			link.to.material.opacity = 1;

			// clear stretch factors
			link.from.material.uniforms.stretchFactor = 0;
			link.to.material.uniforms.stretchFactor = 0;
		};
		_proto._updateProperties = function _updateProperties(elapsed) {
			var link = this._link;
			link.from.material.opacity = 1 - elapsed;
		};
		return FadeSwitcher;
	}(PanoSwitcher);

	var StretchSwitcher = /*#__PURE__*/function (_PanoSwitcher) {
		_inheritsLoose(StretchSwitcher, _PanoSwitcher);
		function StretchSwitcher() {
			return _PanoSwitcher.call(this) || this;
		}
		var _proto = StretchSwitcher.prototype;
		_proto._resetProperties = function _resetProperties() {
			var link = this._link;
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
		};
		_proto._updateProperties = function _updateProperties(elapsed) {
			var link = this._link;
			link.from.material.opacity = -(1 - elapsed) * (1 - elapsed) + 2 * (1 - elapsed); // ease-out: f(x)=-xx+2x
			link.from.material.uniforms.stretchFactor = elapsed * 0.7;
			link.to.material.uniforms.stretchFactor = (1 - elapsed) * 0.5;
		};
		return StretchSwitcher;
	}(PanoSwitcher);

	var PanoCameraControls = function PanoCameraControls(object, domElement) {
		this.object = object;
		this.object.euler.order = 'YXZ';
		this.domElement = domElement !== undefined ? domElement : document;
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
			var element = this.domElement === document ? this.domElement.body : this.domElement;
			var cameraAspect = this.cameraAspect !== null ? this.cameraAspect : element.clientWidth / element.clientHeight;
			this.cameraFov *= scale;
			if (this.cameraFov > this.maxFov) {
				this.cameraFov = this.maxFov;
			} else if (this.cameraFov < this.minFov) {
				this.cameraFov = this.minFov;
			}
			this.object.projectionMatrix.elements[0] = 1 / (cameraAspect * Math.tan(this.cameraFov / 2));
			this.object.projectionMatrix.elements[5] = 1 / Math.tan(this.cameraFov / 2);
			this.object.projectionMatrixInverse.getInverse(this.object.projectionMatrix);
			scale = 1;
			if (8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS || Math.abs(lastFov - this.cameraFov) > EPS) {
				lastQuaternion.copy(this.object.quaternion);
				lastFov = this.cameraFov;
				return true;
			}
			return false;
		};
		var lastQuaternion = new t3d.Quaternion();
		var EPS = 0.000001;
		var lastFov = 0;
		var scale = 1;
		var rotateStart = new t3d.Vector2();
		var rotateEnd = new t3d.Vector2();
		var rotateAccum = new t3d.Vector2();
		var rotateDelta = new t3d.Vector2();
		var rotateVector = new t3d.Vector2();
		var dollyStart = new t3d.Vector2();
		var dollyEnd = new t3d.Vector2();
		var dollyDelta = new t3d.Vector2();
		var STATE = {
			NONE: 0,
			MOUSE: 1,
			TOUCH_ROTATE: 2,
			TOUCH_DOLLY: 3
		};
		var state = STATE.NONE;
		var scope = this;
		var pointers = [];
		var pointerPositions = {};
		function updateRotateVector() {
			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
			var x = rotateDelta.x,
				y = rotateDelta.y;
			rotateDelta.x = 2 * Math.PI * y / element.clientHeight;
			rotateDelta.y = 2 * Math.PI * x / element.clientWidth;
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
			var position = pointerPositions[event.pointerId];
			if (position === undefined) {
				position = new t3d.Vector2();
				pointerPositions[event.pointerId] = position;
			}
			position.set(event.pageX, event.pageY);
		}
		function removePointer(event) {
			delete pointerPositions[event.pointerId];
			for (var i = 0; i < pointers.length; i++) {
				if (pointers[i].pointerId == event.pointerId) {
					pointers.splice(i, 1);
					return;
				}
			}
		}
		function getSecondPointerPosition(event) {
			var pointer = event.pointerId === pointers[0].pointerId ? pointers[1] : pointers[0];
			return pointerPositions[pointer.pointerId];
		}
		function touchMove(event) {
			trackPointer(event);
			switch (state) {
				case STATE.TOUCH_ROTATE:
					if (pointers.length == 1) {
						rotateEnd.set(event.pageX, event.pageY);
					} else {
						var _position = getSecondPointerPosition(event);
						var x = 0.5 * (event.pageX + _position.x);
						var y = 0.5 * (event.pageY + _position.y);
						rotateEnd.set(x, y);
					}
					rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(-scope.rotateSpeed);
					updateRotateVector();
					rotateAccum.add(rotateDelta);
					rotateStart.copy(rotateEnd);
					break;
				case STATE.TOUCH_DOLLY:
					var position = getSecondPointerPosition(event);
					var dx = event.pageX - position.x;
					var dy = event.pageY - position.y;
					var distance = Math.sqrt(dx * dx + dy * dy);
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
						var x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
						var y = 0.5 * (pointers[0].pageY + pointers[1].pageY);
						rotateStart.set(x, y);
					}
					state = STATE.TOUCH_ROTATE;
					break;
				case 2:
					var dx = pointers[0].pageX - pointers[1].pageX;
					var dy = pointers[0].pageY - pointers[1].pageY;
					var distance = Math.sqrt(dx * dx + dy * dy);
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
		this.domElement.addEventListener('wheel', onMouseWheel, {
			passive: false
		});
		updateRotateVector();
	};

	exports.FadeSwitcher = FadeSwitcher;
	exports.Pano = Pano;
	exports.PanoCameraControls = PanoCameraControls;
	exports.PanoGraph = PanoGraph;
	exports.PanoSwitcher = PanoSwitcher;
	exports.StretchSwitcher = StretchSwitcher;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
