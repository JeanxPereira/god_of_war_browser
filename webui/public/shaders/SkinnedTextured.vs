// Three.js auto-injects these: position, normal, uv
// We only declare custom attributes
attribute vec4 color;
attribute float jointId1;
attribute float jointId2;
attribute float weight;

uniform mat4 umModelTransform;
uniform mat4 umProjection;
uniform mat4 umView;
uniform vec2 uLayerOffset;
uniform mat4 umJoints[12];

uniform bool uUseJoints;
uniform bool uUseVertexColor;
uniform bool uUseModelTransform;
uniform bool uUseEnvmapSampler;

varying vec4 vVertexColor;
varying vec2 vVertexUV;
varying vec2 vEnvmapUV;

// Helper to access joint by index (WebGL1 compat)
mat4 getJointMatrix(float index) {
	int idx = int(floor(index + 0.5));
	if (idx == 0) return umJoints[0];
	else if (idx == 1) return umJoints[1];
	else if (idx == 2) return umJoints[2];
	else if (idx == 3) return umJoints[3];
	else if (idx == 4) return umJoints[4];
	else if (idx == 5) return umJoints[5];
	else if (idx == 6) return umJoints[6];
	else if (idx == 7) return umJoints[7];
	else if (idx == 8) return umJoints[8];
	else if (idx == 9) return umJoints[9];
	else if (idx == 10) return umJoints[10];
	else return umJoints[11];
}

void main(void) {
	gl_PointSize = 4.0;
	vec4 pos = vec4(position, 1.0);
	
	if (uUseJoints) {
		mat4 joint1 = getJointMatrix(jointId1);
		mat4 joint2 = getJointMatrix(jointId2);
		mat4 boneTransform = joint1 * weight + joint2 * (1.0 - weight);
		pos = boneTransform * pos;
	} else {
		pos = vec4((umModelTransform * pos).xyz, 1.0);
	}

	if (uUseVertexColor) {
		vVertexColor = color * (256.0 / 128.0);
	} else {
		vVertexColor = vec4(1.0);
	}

	gl_Position = umProjection * umView * pos;
	vVertexUV = uv + uLayerOffset;
	
	if (uUseEnvmapSampler) {
		mat4 modelView = umView;
		if (uUseModelTransform) {
			modelView *= umModelTransform;
		}
		vec3 e = normalize(vec3(modelView * pos));
		vec3 r = reflect(e, vec3(0.5, 0.5, 0.5));
		float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z+1.0)*(r.z+1.0));
		vEnvmapUV = r.xy / m + 0.5;
	}
}
