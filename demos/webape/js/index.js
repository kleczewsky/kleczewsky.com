var tilt = -0.5;

var cloudsScale = 1.005;

let okno = document.getElementById("okno");
var SCREEN_HEIGHT = okno.offsetHeight;
var SCREEN_WIDTH = okno.offsetWidth;

var camera, scene, renderer, wantedCamera;
var meshPlanet, meshClouds;
var dirLight,
    earthGlowMesh,
    meshsky,
    marsGlowMesh,
    jupiterGlowMesh,
    meshMars,
    meshJupiter;

var composer,
    selectedPlanet = 0;

let currentPlanet = 0;
let pos1 = new THREE.Vector3(0, 0, 0);
let pos2 = new THREE.Vector3(-1000, 0, 0);
let pos3 = new THREE.Vector3(-2000, 0, 0);

// glow shader
var fragmentShader = ` uniform vec3 glowColor;
                varying float intensity;
                void main()
                {
                  vec3 glow = glowColor * intensity;
                    gl_FragColor = vec4( glow, 1.0 );
                }
`;

var vertexShader = ` uniform vec3 viewVector;
                uniform float c;
                uniform float p;
                varying float intensity;
                void main()
                {
                    vec3 vNormal = normalize( normalMatrix * normal );
                  vec3 vNormel = normalize( normalMatrix * viewVector );
                  intensity = pow( c - dot(vNormal, vNormel), p );

                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }`;

import * as THREE from "../js/three.module.js";

import { EffectComposer } from "../postprocessing/EffectComposer.js";
import { RenderPass } from "../postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../postprocessing/UnrealBloomPass.js";

var textureLoader = new THREE.TextureLoader();

function init() {
    setupCamera();

    // planet earth

    setupEarth();

    // planet mars

    setupMars();

    // planet jupiter

    setupJupiter();

    // stars
    setupStars();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(1);

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    document.getElementById("webgl").appendChild(renderer.domElement);

    window.addEventListener("resize", onWindowResize, false);

    var renderScene = new RenderPass(scene, camera);

    var bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 0.2;
    bloomPass.radius = 0;

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // skybox

    var skybox = new THREE.MeshPhongMaterial({
        map: textureLoader.load("img/stars_milky_way.jpg"),
        side: THREE.DoubleSide,
        emissiveMap: textureLoader.load("img/stars_milky_way.jpg"),
        emissive: 0x103010,
        shininess: 1,
    });

    let skyboxgeo = new THREE.SphereBufferGeometry(9000, 200, 200);

    meshsky = new THREE.Mesh(skyboxgeo, skybox);
    meshsky.rotation.y = 1.65;
    scene.add(meshsky);

    // mouse event
    document.addEventListener("mousemove", updateCamera);
    document
        .getElementById("contact-button")
        .addEventListener("click", selectNextPlanet);
}

function onWindowResize() {
    SCREEN_HEIGHT = okno.offsetHeight;
    SCREEN_WIDTH = okno.offsetWidth;

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;

    camera.updateProjectionMatrix();
}

// Animate camera and planet rotation
function animate() {
    requestAnimationFrame(animate);
    meshPlanet.rotation.y += 0.00009;
    meshClouds.rotation.y += 0.0001;

    meshJupiter.rotation.y += 0.0005;
    meshMars.rotation.y += 0.0005;

    composer.render();

    // camera update
    camera.lookAt(0, 0, 0);
    if (wantedCamera) {
        camera.position.lerp(wantedCamera, 0.003);
    }

    changePlanet();

    glowUpdate();
}

function updateCamera(e) {
    wantedCamera = new THREE.Vector3(
        (-1 * e.clientX) / 8 + 160,
        (-1 * e.clientY) / 12 + 40,
        230
    );
}

// Setup planets
let setupEarth = () => {
    var materialNormalMap = new THREE.MeshPhongMaterial({
        specular: 0x333333,
        shininess: 11,
        map: textureLoader.load("textures/earth_atmos_2048.jpg"),
        specularMap: textureLoader.load("textures/earth_specular_2048.jpg"),
        normalMap: textureLoader.load("textures/earth_normal_2048.jpg"),
        emissiveMap: textureLoader.load("textures/earth_lights.jpg"),
        emissive: 0x666611,
        emissiveIntensity: 1.2,

        // y scale is negated to compensate for normal map handedness.
        normalScale: new THREE.Vector2(0.65, -0.65),
    });

    var geometryEarth = new THREE.SphereBufferGeometry(100, 100, 100);

    meshPlanet = new THREE.Mesh(geometryEarth, materialNormalMap);
    meshPlanet.rotation.y = 10.35999999999982;
    meshPlanet.rotation.z = tilt;
    meshPlanet.position.x = -100;
    scene.add(meshPlanet);

    let earthGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            c: { type: "f", value: 0.6 },
            p: { type: "f", value: 6.5 },
            glowColor: { type: "c", value: new THREE.Color(0x007fff) },
            viewVector: { type: "v3", value: camera.position },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
    });

    earthGlowMesh = new THREE.Mesh(
        geometryEarth.clone(),
        earthGlowMaterial.clone()
    );

    earthGlowMesh.scale.multiplyScalar(1.2);
    scene.add(earthGlowMesh);

    var materialClouds = new THREE.MeshLambertMaterial({
        map: textureLoader.load("textures/earth_clouds_2048.png"),
        transparent: true,
    });

    meshClouds = new THREE.Mesh(geometryEarth, materialClouds);
    meshClouds.scale.set(cloudsScale, cloudsScale, cloudsScale);

    meshPlanet.add(meshClouds);

    let setupPin = () => {
        var geometry = new THREE.BoxGeometry(1, 40, 1);
        var material = new THREE.MeshBasicMaterial({ color: 0x020202 });
        var cube = new THREE.Mesh(geometry, material);

        var latRad = 53.42894 * (Math.PI / 180);
        var lonRad = -14.55302 * (Math.PI / 180);
        var r = 100;

        cube.position.set(
            Math.cos(latRad) * Math.cos(lonRad) * r,
            Math.sin(latRad) * r,
            Math.cos(latRad) * Math.sin(lonRad) * r
        );
        cube.rotation.set(0.0, -lonRad, latRad - Math.PI * 0.5);

        var spriteMap = new THREE.TextureLoader().load("./img/jestesmy.png");

        var spriteMaterial = new THREE.SpriteMaterial({
            map: spriteMap,
            color: 0xffffff,
        });

        var sprite = new THREE.Sprite(spriteMaterial);

        r = 120;

        sprite.position.set(
            Math.cos(latRad) * Math.cos(lonRad) * r,
            Math.sin(latRad) * r,
            Math.cos(latRad) * Math.sin(lonRad) * r
        );
        sprite.rotation.set(0.0, -lonRad, latRad - Math.PI * 0.5);

        sprite.scale.set(50, 7, 1);
        sprite.renderOrder = 1;
        sprite.transparent = "true";
        let spriteCenter = new THREE.Vector2(0.5, 0.1);
        sprite.center = spriteCenter;

        meshPlanet.add(sprite);

        meshPlanet.add(cube);
    };

    // Add logo pin to earth
    setupPin();
};

let setupMars = () => {
    var marsNormalMap = new THREE.MeshPhongMaterial({
        shininess: 3,
        map: textureLoader.load("textures/marsmap2k.jpg"),
        normalMap: textureLoader.load("textures/mars_normal.jpg"),

        // y scale is negated to compensate for normal map handedness.
        normalScale: new THREE.Vector2(3, -3),
    });

    let geometryMars = new THREE.SphereBufferGeometry(80, 80, 80);

    meshMars = new THREE.Mesh(geometryMars, marsNormalMap);
    meshMars.position.x = -500;

    scene.add(meshMars);

    let marsGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            c: { type: "f", value: 0.5 },
            p: { type: "f", value: 6.5 },
            glowColor: { type: "c", value: new THREE.Color(0xff2200) },
            viewVector: { type: "v3", value: camera.position },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
    });

    marsGlowMesh = new THREE.Mesh(
        geometryMars.clone(),
        marsGlowMaterial.clone()
    );
    marsGlowMesh.scale.multiplyScalar(1.2);
    scene.add(marsGlowMesh);
};

let setupJupiter = () => {
    var jupiterNormalMap = new THREE.MeshStandardMaterial({
        roughness: 0.8,
        metalness: 0.5,
        map: textureLoader.load("textures/jupiter2_2k.jpg"),
    });

    let geometryJupiter = new THREE.SphereBufferGeometry(115, 115, 115);

    meshJupiter = new THREE.Mesh(geometryJupiter, jupiterNormalMap);
    meshJupiter.position.x = -1000;

    scene.add(meshJupiter);

    let jupiterGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            c: { type: "f", value: 0.6 },
            p: { type: "f", value: 3.5 },
            glowColor: { type: "c", value: new THREE.Color(0x222222) },
            viewVector: { type: "v3", value: camera.position },
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
    });

    jupiterGlowMesh = new THREE.Mesh(
        geometryJupiter.clone(),
        jupiterGlowMaterial.clone()
    );

    jupiterGlowMesh.scale.multiplyScalar(1.2);
    scene.add(jupiterGlowMesh);
};
//---SETUP PLANETS---

// Camera setup
let setupCamera = () => {
    camera = new THREE.PerspectiveCamera(
        70,
        SCREEN_WIDTH / SCREEN_HEIGHT,
        10,
        100000
    );
    camera.position.z = 300;
    camera.position.x = 50;

    wantedCamera = new THREE.Vector3(-100, 0, 250);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.00000025);

    dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(-1, 0.01, 0.7).normalize();

    let ambLight = new THREE.AmbientLight(0x101010);
    scene.add(ambLight);

    scene.add(dirLight);
};

// Update glow meshes and camera uniforms
let glowUpdate = () => {
    // glow update mesh pos
    marsGlowMesh.position.x = meshMars.position.x;
    marsGlowMesh.position.y = meshMars.position.y;
    marsGlowMesh.position.z = meshMars.position.z;
    earthGlowMesh.position.x = meshPlanet.position.x;
    earthGlowMesh.position.y = meshPlanet.position.y;
    earthGlowMesh.position.z = meshPlanet.position.z;
    jupiterGlowMesh.position.x = meshJupiter.position.x;
    jupiterGlowMesh.position.y = meshJupiter.position.y;
    jupiterGlowMesh.position.z = meshJupiter.position.z;

    // glow update camera
    jupiterGlowMesh.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        jupiterGlowMesh.position
    );
    earthGlowMesh.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        earthGlowMesh.position
    );

    marsGlowMesh.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        marsGlowMesh.position
    );
};

// Stars setup
let setupStars = () => {
    var i,
        r = 400,
        starsGeometry = [
            new THREE.BufferGeometry(),
            new THREE.BufferGeometry(),
        ];

    var vertices1 = [];
    var vertices2 = [];

    var vertex = new THREE.Vector3();

    for (i = 0; i < 250; i++) {
        vertex.x = Math.random() * 2 - 1;
        vertex.y = Math.random() * 2 - 1;
        vertex.z = Math.random() * 2 - 1;
        vertex.multiplyScalar(r);

        vertices1.push(vertex.x, vertex.y, vertex.z);
    }

    for (i = 0; i < 200; i++) {
        vertex.x = Math.random() * 2 - 1;
        vertex.y = Math.random() * 2 - 1;
        vertex.z = Math.random() * 2 - 1;
        vertex.multiplyScalar(r);

        vertices2.push(vertex.x, vertex.y, vertex.z);
    }

    starsGeometry[0].setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices1, 3)
    );
    starsGeometry[1].setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices2, 3)
    );

    var stars;
    var starsMaterials = [
        new THREE.PointsMaterial({
            color: 0x888888,
            size: 2,
            sizeAttenuation: false,
            fog: false,
        }),
        new THREE.PointsMaterial({
            color: 0x555555,
            size: 1,
            sizeAttenuation: false,
            fog: false,
        }),
        new THREE.PointsMaterial({
            color: 0x666666,
            size: 2,
            sizeAttenuation: false,
            fog: false,
        }),
        new THREE.PointsMaterial({
            color: 0x444444,
            size: 2,
            sizeAttenuation: false,
            fog: false,
        }),
        new THREE.PointsMaterial({
            color: 0x888888,
            size: 2,
            sizeAttenuation: false,
            fog: false,
        }),
        new THREE.PointsMaterial({
            color: 0x888888,
            size: 2,
            sizeAttenuation: false,
            fog: false,
        }),
    ];

    for (i = 10; i < 30; i++) {
        stars = new THREE.Points(starsGeometry[i % 2], starsMaterials[i % 6]);

        stars.rotation.x = Math.random() * 6;
        stars.rotation.y = Math.random() * 6;
        stars.rotation.z = Math.random() * 6;
        stars.scale.setScalar(i * 1);

        stars.matrixAutoUpdate = false;
        stars.updateMatrix();

        scene.add(stars);
    }
};

// Change shown planet
function changePlanet() {
    if (currentPlanet < selectedPlanet) {
        pos1.x += 1000;
        pos2.x += 1000;
        pos3.x += 1000;
        currentPlanet++;
    } else if (currentPlanet > selectedPlanet) {
        pos1.x -= 1000;
        pos2.x -= 1000;
        pos3.x -= 1000;
        currentPlanet--;
    }

    meshJupiter.position.lerp(pos3, 0.03);
    meshMars.position.lerp(pos2, 0.03);
    meshPlanet.position.lerp(pos1, 0.03);
}

//Change selected PLANET
export function selectNextPlanet(planetNumber) {
    selectedPlanet = planetNumber;
    if (selectedPlanet > 2 && selectedPlanet < 0) {
        selectedPlanet = 0;
        return null;
    }
}

init();
animate();
