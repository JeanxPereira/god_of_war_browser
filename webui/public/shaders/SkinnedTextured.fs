// Extensions must be first in WebGL2/GLSL ES 3.0
// But in WebGL2, derivatives are standard, so we can omit this
// #extension GL_OES_standard_derivatives : enable

uniform sampler2D uLayerDiffuseSampler;
uniform sampler2D uLayerEnvmapSampler;

uniform bool uUseLayerDiffuseSampler;
uniform bool uUseEnvmapSampler;
uniform vec4 uMaterialColor;
uniform vec4 uLayerColor;

varying vec4 vVertexColor;
varying vec2 vVertexUV;
varying vec2 vEnvmapUV;

void main(void) {
	vec4 clr = vec4(1.0, 1.0, 1.0, 1.0);
	
	if (uUseLayerDiffuseSampler) {
		clr = texture2D(uLayerDiffuseSampler, vVertexUV);
	}
	
	if (uUseEnvmapSampler) {
		vec3 envColor = texture2D(uLayerEnvmapSampler, vEnvmapUV).xyz;
		clr = vec4(clr.rgb * (1.0 - clr.a) + envColor * clr.a, 1.0);
	}
	
	clr = clr * vVertexColor * uMaterialColor * uLayerColor;
	
	if (clr.a < 0.001) {
		discard;
	}
	
	gl_FragColor = clr;
}
