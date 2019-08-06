/**
 * Point Mosaic Shader
 * @author shawn0326
 */

const PointMosaicShader = {

    uniforms: { 
        tDiffuse: { value: null },
        texSize: { value: new THREE.Vector2(640, 640) },
        mosaicSize: { value: new THREE.Vector2(16, 16) }
    },

    vertexShader: `
        varying vec2 vUV;
        void main() {
            vUV = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,

    fragmentShader: `
        uniform sampler2D tDiffuse;

        uniform vec2 texSize;
        uniform vec2 mosaicSize;

        varying vec2 vUV;

        void main(void) {
            vec2 xy = vec2(vUV.x * texSize.x, vUV.y * texSize.y);
            
            vec2 xyMosaic = vec2(floor(xy.x / mosaicSize.x) * mosaicSize.x, 
                    floor(xy.y / mosaicSize.y) * mosaicSize.y )
                    + .5*mosaicSize;
            
            vec2 delXY = xyMosaic - xy;
            float delL = length(delXY);
            
            vec2 uvMosaic = vec2(xyMosaic.x / texSize.x, xyMosaic.y / texSize.y);

            float percent = smoothstep(0., 1., 1. - delL * 2. / mosaicSize.x) * 0.8 + 0.2;

            vec4 centerColor = texture2D(tDiffuse, uvMosaic);
            vec4 originColor = texture2D(tDiffuse, vUV);

            vec4 resultColor = vec4(mix(originColor.rgb, centerColor.rgb, percent), centerColor.a * percent);

            if (resultColor.a < 0.0001) discard;
            
            gl_FragColor = resultColor;
        }
    `,

};