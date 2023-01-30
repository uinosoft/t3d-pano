import { Mesh, SphereGeometry, ShaderMaterial, DRAW_SIDE } from 't3d';

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

export { Pano };