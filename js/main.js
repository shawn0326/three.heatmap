var scene = new THREE.Scene();
scene.background = new THREE.Color(0, 0, 0);
var camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, .1, 1000 );
camera.position.set( 8 , 3, 20 );

var renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( window.devicePixelRatio );
container.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.target.set(0, 5, 0);
// controls.autoRotate = true;

/////////////// floor

var floorMat1 = new THREE.MeshLambertMaterial({
    color: 0x666666
});

var floorMat2 = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.6
});

var floorMat3 = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(PointMosaicShader.uniforms),
    vertexShader: PointMosaicShader.vertexShader,
    fragmentShader: PointMosaicShader.fragmentShader,
    transparent: true
});

var floorMats = [floorMat1, floorMat2, floorMat3];

var floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMats[0]);
floor.rotation.x = - Math.PI * 0.5;
floor.position.y = -0.1;
scene.add(floor);

/////////////// screen

var screenMat1 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 0.8,
    depthTest: false,
    depthWrite: false
});

var screenMat2 = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(PointMosaicShader.uniforms),
    vertexShader: PointMosaicShader.vertexShader,
    fragmentShader: PointMosaicShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 0.8,
    depthTest: false,
    depthWrite: false
});

var screenMats = [screenMat1, screenMat2];

var screen = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), screenMats[1]);
screen.renderOrder = 100;
screen.position.y = 5;
scene.add(screen);

/////////////// box

var box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 15), new THREE.MeshBasicMaterial({ color: 0x557777 }));
box.position.y = 5;
box.material.transparent = true;
box.material.opacity = 0.7;
box.material.side = THREE.DoubleSide;
scene.add(box);

/////////////// lights

var ambientLight = new THREE.AmbientLight(0xcccccc);
scene.add( ambientLight );

var directionalLight = new THREE.DirectionalLight(0xcccccc);
directionalLight.position.set( 3, 1, 2 );
directionalLight.position.normalize();
scene.add( directionalLight );

//

function randomData() {
    var data = [];
    for(var i = 0; i < 200; i++) {
        data.push([Math.random() * 8 - 4, Math.random() * 8 - 4, Math.pow(Math.random(), 3) * 6 + 20]);
    }
    return data;
}

var data = [
    [-0.9100000000000001, -1.0700000000000003, 25.3],
    [-2.1099999999999994, -1.0700000000000003, 25.2],
    [-2.0599999999999987, 1.129999999999999, 25.6],
    [-2.710000000000001, -1.0700000000000003, 24.9],
    [-0.8599999999999994, 1.129999999999999, 24.8],
    [-0.3099999999999987, -1.0700000000000003, 25.2],
    [-0.26000000000000156, 1.129999999999999, 27.3],
    [3, -3, 27]
]; // test
data = randomData();

function dataNoise(data) {
    for(var i = 0; i < data.length; i++) {
        var item = data[i];
        item[0] += (Math.random() - 0.5) * 0.01;
        item[1] += (Math.random() - 0.5) * 0.01;
        item[2] += Math.random() * 0.5 - 0.25;
    }
    return data;
}

var themes = {
    default: {
        // 0: 'black',
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },
    red: {
        0.4: 'blue',
        0.9: 'red',
        0.95: 'white'
    }
};

var heatmap = new SimpleHeatmap();
heatmap.setCanvasSize(
    256, 256
).setAreaSize(
    10, 10
).min(20).max(27).alpha(true).gradient(
    themes.default
).radius(
    20, 20
).data(data).draw(true);

var texture = new THREE.Texture(heatmap.canvas());
texture.needsUpdate = true;

screenMats.forEach(mat => {
    if (mat.isShaderMaterial) {
        mat.uniforms['tDiffuse'].value = texture;
        mat.uniforms['texSize'].value.set(256, 256);
        mat.uniforms['mosaicSize'].value.set(256 / 64, 256 / 64);
    } else {
        mat.map = texture;
    }
});

// show floor heatmap
var heatmap2 = new SimpleHeatmap();
heatmap2.setCanvasSize(
    512, 512
).setAreaSize(
    10, 10
).min(20).max(27).alpha(true).gradient(
    themes.default
).radius(
    40, 40
).data(randomData()).draw();
var texture2 = new THREE.Texture(heatmap2.canvas());
texture2.needsUpdate = true;

floorMats.forEach(mat => {
    if (mat.isShaderMaterial) {
        mat.uniforms['tDiffuse'].value = texture2;
        mat.uniforms['texSize'].value.set(512, 512);
        mat.uniforms['mosaicSize'].value.set(512 / 64, 512 / 64);
    } else if (!mat.isMeshLambertMaterial) {
        mat.map = texture2;
    }
});

// GUI
var params = {theme: 'default', showBox: true, background: false, front: true, opacity: 0.8, progress: 0.5, noise: true, showFloorHeatmap: false};
var gui = new dat.GUI();
gui.add( params, 'theme', ['default', 'red']).onChange(function(val) {
    heatmap.gradient(themes[params.theme]).draw();
    texture.needsUpdate = true;
});
gui.add( params, 'showBox').onChange(function(val) {
    box.visible = val;
});
gui.add( params, 'background').onChange(function(val) {
    heatmap.alpha(!val).draw();
    heatmap2.alpha(!val).draw();
    texture.needsUpdate = true;
    texture2.needsUpdate = true;
});
gui.add( params, 'opacity').min(0).max(1).onChange(function(val) {
    screenMat1.opacity = val;
});
gui.add( params, 'progress').min(0).max(1).step(0.01).onChange(function(val) {
    var radius = 20 - Math.abs(val - 0.5) * 10;
    var blur = 20 - Math.abs(val - 0.5) * 10;

    heatmap.radius(radius, blur).draw();
    texture.needsUpdate = true;

    screen.position.z = val * 15 - 7.5;
});
gui.add( params, 'noise');
gui.add({screenMatType: 'heat1'}, 'screenMatType', ['heat1', 'heat2']).onChange(val => {
    screen.material = screenMats[['heat1', 'heat2'].indexOf(val)];
});
gui.add({floorMatType: 'none'}, 'floorMatType', ['none', 'heat1', 'heat2']).onChange(val => {
    floor.material = floorMats[['none', 'heat1', 'heat2'].indexOf(val)];
});

var count = 0;
function render(time) {

    requestAnimationFrame( render );
    controls.update();

    count++;
    if(params.noise && count > 5) {
        count = 0;

        data = dataNoise(data);
        heatmap.data(data).draw();
        texture.needsUpdate = true;
    }

    renderer.render( scene, camera );

}

render();

