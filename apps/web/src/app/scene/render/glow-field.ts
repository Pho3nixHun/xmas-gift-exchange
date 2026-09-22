import * as T from 'three';

import { shader } from './geometry';

// Ambient particle groups were built from individual sprites: Three submits one
// draw call per sprite, and the frame callback walked the group repositioning
// each one. A field draws the whole group at once and derives its motion from a
// single clock uniform, so the browser does no per-particle work at all.
export interface GlowFieldOptions {
    readonly map: T.Texture;
    readonly color: number;
    readonly count: number;
    // Cycles per second of the shared clock.
    readonly speed: number;
    readonly additive?: boolean;
    // GLSL assigning `pos`, `size` and `alpha` from `f` (the 0..1 cycle),
    // `idx` (the particle's index) and `count`.
    readonly motion: string;
}

const QUAD = [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0];
const UV = [0, 0, 1, 0, 1, 1, 0, 1];

export const createGlowField = (
    parent: T.Object3D,
    options: GlowFieldOptions
) => {
    const geometry = new T.InstancedBufferGeometry();
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.setAttribute('position', new T.Float32BufferAttribute(QUAD, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(UV, 2));
    geometry.setAttribute(
        'aIndex',
        new T.InstancedBufferAttribute(
            Float32Array.from({ length: options.count }, (_, i) => i),
            1
        )
    );
    geometry.instanceCount = options.count;
    // Handed back so callers drive the whole field from one clock, without
    // reaching through the material's string-keyed uniform map.
    const clock: T.IUniform<number> = { value: 0 };
    const material = shader({
        uniforms: {
            time: clock,
            map: { value: options.map },
            tint: { value: new T.Color(options.color) },
            count: { value: options.count },
            speed: { value: options.speed },
        },
        vertexShader: `attribute float aIndex;
uniform float time;uniform float count;uniform float speed;
varying vec2 vUv;varying float vAlpha;
void main(){
vUv=uv;
float idx=aIndex;
float f=fract(time*speed+idx/count);
vec3 pos=vec3(0.);float size=1.;float alpha=1.;
${options.motion}
vec4 mv=modelViewMatrix*vec4(pos,1.);
mv.xy+=position.xy*size;
vAlpha=alpha;
gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `uniform sampler2D map;uniform vec3 tint;
varying vec2 vUv;varying float vAlpha;
void main(){vec4 texel=texture2D(map,vUv);
gl_FragColor=vec4(tint*texel.rgb,texel.a*vAlpha);}`,
        transparent: true,
        depthWrite: false,
        blending:
            options.additive === false ? T.NormalBlending : T.AdditiveBlending,
    });
    const field = new T.Mesh(geometry, material);
    // The quad sits at the origin, so the geometry's own bounds describe none of
    // the places its instances actually reach.
    field.frustumCulled = false;
    field.castShadow = false;
    field.receiveShadow = false;
    parent.add(field);
    return clock;
};

const PI = '3.14159265';

export const emberMotion = `pos=vec3(sin(idx*2.4)*.46+sin(f*9.+(idx/count)*6.)*.06,f*1.25,sin(f*5.)*.045);
size=.02+sin(f*${PI})*.025;alpha=sin(f*${PI})*.7;`;

export const steamMotion = `pos=vec3(sin(f*4.)*.06,f*.6,0.);
size=.1+f*.25;alpha=sin(f*${PI})*.085;`;

export const smokeMotion = `pos=vec3(sin(f*3.)*.5+f*.5,f*3.8,cos(f*2.)*.12);
size=.4+f*1.4;alpha=sin(f*${PI})*.12;`;
