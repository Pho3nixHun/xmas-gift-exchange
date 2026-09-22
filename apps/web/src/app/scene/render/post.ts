import * as T from 'three';

import { shader } from './geometry';

export const createPost = () => {
    const renderTarget = new T.WebGLRenderTarget(1, 1, {
        depthBuffer: true,
        type: T.HalfFloatType,
    });
    // Light bleed is soft by design: sample it at half resolution, then
    // composite it over the full-resolution scene so edges and snow stay sharp.
    const bloomTarget = new T.WebGLRenderTarget(1, 1, {
        depthBuffer: false,
        type: T.HalfFloatType,
    });
    const postCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const vertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
    const bloomMaterial = shader({
        uniforms: {
            frame: { value: renderTarget.texture },
            resolution: { value: new T.Vector2(1, 1) },
        },
        vertexShader,
        fragmentShader: `uniform sampler2D frame;uniform vec2 resolution;varying vec2 vUv;
        float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
        void main(){vec3 bloom=vec3(0.);vec2 px=1./resolution;
        for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a));
        vec3 s=texture2D(frame,vUv+d*px*5.).rgb;vec3 s2=texture2D(frame,vUv+d*px*13.).rgb;
        bloom+=s*max(lum(s)-.72,0.)*.1+s2*max(lum(s2)-.78,0.)*.06;}
        gl_FragColor=vec4(bloom,1.);}`,
        depthTest: false,
        depthWrite: false,
    });
    const postMaterial = shader({
        uniforms: {
            frame: { value: renderTarget.texture },
            bloom: { value: bloomTarget.texture },
            resolution: { value: new T.Vector2(1, 1) },
        },
        vertexShader,
        fragmentShader: `uniform sampler2D frame;uniform sampler2D bloom;uniform vec2 resolution;varying vec2 vUv;
        void main(){vec3 c=texture2D(frame,vUv).rgb+texture2D(bloom,vUv).rgb*.45;
        vec2 q=vUv-.5;c*=1.-dot(q,q)*.26;
        float noise=fract(sin(dot(vUv*resolution,vec2(12.9898,78.233)))*43758.5453);
        c+=(noise-.5)*.005;gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
        depthTest: false,
        depthWrite: false,
    });
    const geometry = new T.PlaneGeometry(2, 2);
    const bloomScene = new T.Scene(),
        postScene = new T.Scene();
    bloomScene.add(new T.Mesh(geometry, bloomMaterial));
    postScene.add(new T.Mesh(geometry, postMaterial));
    return {
        resize: (width: number, height: number) => {
            renderTarget.setSize(width, height);
            bloomTarget.setSize(
                Math.max(1, Math.ceil(width / 2)),
                Math.max(1, Math.ceil(height / 2))
            );
            bloomMaterial.uniforms.resolution.value.set(width, height);
            postMaterial.uniforms.resolution.value.set(width, height);
        },
        render: (
            renderer: T.WebGLRenderer,
            scene: T.Scene,
            camera: T.Camera
        ) => {
            renderer.setRenderTarget(renderTarget);
            renderer.render(scene, camera);
            renderer.setRenderTarget(bloomTarget);
            renderer.render(bloomScene, postCamera);
            renderer.setRenderTarget(null);
            renderer.render(postScene, postCamera);
        },
        dispose: () => {
            renderTarget.dispose();
            bloomTarget.dispose();
            bloomMaterial.dispose();
            postMaterial.dispose();
            geometry.dispose();
        },
    };
};
