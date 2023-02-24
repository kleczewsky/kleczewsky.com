import * as THREE from 'three'
import { WEBGL } from './webgl_check'

import PostProcessing from './post_processing'
import AnimationController from './animation_controller'
import LoaderController from './loader_controller'

// import * as bootstrap from 'bootstrap' bootstrap javascript bundles

import { GUI } from 'dat.gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { debounce } from 'lodash-es'

import Stats from 'three/examples/jsm/libs/stats.module'
import InputController from "./input_controller";
import {random} from "lodash-es/number";
import {degToRad} from "three/src/math/MathUtils";
import shuffle from "lodash-es/shuffle";
import i18next from "i18next";
import EventEmitter from "events";
import {mean} from "lodash-es/math";
import {gsap} from "gsap";

class kleczewskyWorld {
  scene = null
  camera = null

  BLOOM_LAYER = 1
  DARK_MATERIAL = new THREE.MeshBasicMaterial({ color: 'black' })

  letterData = [] // SKY letter meshes and materials
  postersObject = {}
  lightsData = [] // lights meshes and materials
  terrainData = [] // Terrain material
  wallObject = {}
  arcadeDecorations = [] // floating decorations for arcade machine
  cameraCheckpoints = []
  effectComposers = []

  constructor() {
    this._Initialize()
  }

  _Initialize() {
    if (!WEBGL.isWebGLAvailable()) {
      gsap.to('#error-section',{
        opacity:1,
        duration: .25,

        onStart: function() {
          this.targets()[0].classList.remove('d-none')
        }
      })
      return false
    }
    this.events = new EventEmitter()

    this.events.once('modelsLoaded', () => this._OnModelsLoaded())

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      precision: 'highp', // possible fix for https://github.com/kleczewsky/kleczewsky-threejs/issues/1
      antialias: false,
      stencil: false,
      depth: false,
      // logarithmicDepthBuffer: true,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ReinhardToneMapping
    this.renderer.physicallyCorrectLights = true

    document.body.appendChild(this.renderer.domElement)

    this.LoaderController = new LoaderController(this)
    this.AnimationController = new AnimationController(this)
    this.InputController = new InputController(this)

    this._InitScene()
    this._InitCamera()
    this._LoadModels()

    this.PostProcessing = new PostProcessing(this)

    this.shouldRender = true
    this.filteredFrameTime = 0
    this.lastRender = performance.now()
    this.currentRender = null
    this.fpsRecords = []

    window.addEventListener(
      'resize',
      debounce(() => this._OnWindowResize(), 100),
      false
    )

    if (new URLSearchParams(window.location.search).has('debug')) {
      this._InitDebugHelpers()
      this.debugMode = true
    }
  }

  _InitScene() {
    this.scene = new THREE.Scene()
    // this.scene.fog = new THREE.Fog(0x000000, 1, 200)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    const directionalLight = new THREE.DirectionalLight(0xffffff)

    ambientLight.name = 'global_ambient_light'
    directionalLight.position.set(0, 50, -50)
    directionalLight.intensity = 1
    directionalLight.name = 'global_directional_light'

    this.scene.add(ambientLight)

    this.scene.add(directionalLight)
  }

  _InitCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      10000
    )

    this.camera.targetPosition = new THREE.Vector3(0, 0, 0)
    this.camera.position.set(0, 2, 90)
    this.camera.rotateX(degToRad(-90))

    this.dolly = new THREE.Object3D().add(this.camera)
    this.scene.add(this.dolly)
  }

  // callback rate dependent on monitor refresh rate
  _RenderLoop() {
    if(this.shouldRender === false) return

    requestAnimationFrame(() => {
      this._RenderLoop()
      this.AnimationController.animate()
      this.PostProcessing.render()

      // todo: split to animation and other(raycast) or raycast on mouse event
      this.InputController.update()

      this._CalculateAvgFramerate()

      if (this.debugMode) {
        this.stats.update()
      }
    })
  }

  _LogicLoop() {
    // performance regression loop
    this.peformanceLoop = setInterval(() => {
      const fps = +(1000 / this.filteredFrameTime)

      if (this.fpsRecords.unshift(fps) > 5) {
        this.fpsRecords.pop()
      }

      if(this.fpsRecords.length < 4) return

      const avgFps = mean(this.fpsRecords)
      if (avgFps < 30) {
        console.warn('Low average framereate detected: ', avgFps)

        if (this.effectComposers.finalComposer.passes[1].enabled) {
          this.effectComposers.finalComposer.passes[1].enabled = false
          this.fpsRecords = []
          console.log('Disabled SSRPass')
        } else {
          this.AnimationController.showPosterSection('error-section')
          this.shouldRender = false
          clearInterval(this.peformanceLoop)
        }

      }
      
      

    }, 1000)
  }

  _CalculateAvgFramerate() {
    this.currentRender = performance.now()
    const lastFrameTime = this.currentRender - this.lastRender;
    this.filteredFrameTime += (lastFrameTime - this.filteredFrameTime) / 2;
    this.lastRender = this.currentRender;
  }

  _LoadModels() {
    // Setup ground lights
    this._SetupLights()

    // Load writing
    const setupKleczewsky = (gltf) => {
      this.home = gltf.scene

      this.letterData.letterMaterials = []
      this.letterData.letterMeshes = []

      const root = gltf.scene
      root.scale.set(5, 5, 5)
      root.position.set(2, 0, 0)

      this.letterData.triggers = []
      root.getObjectByName('Triggers').children.forEach(trigger => {
        this.letterData.triggers.push(trigger)
        trigger.visible = false
      })

      // Enable bloom layer for letters meshes
      root.children.forEach((group) => {
        if (!group.name.endsWith('Group')) {
          return
        }

        this.letterData.letterMaterials[group.name] = group.children[0].material
        this.letterData.letterMeshes[group.name] = []
        group.traverse((obj) => {
          if (obj.isMesh) {
            this.letterData.letterMeshes[group.name].push(obj)
          }
            obj.layers.enable(this.BLOOM_LAYER)
        })
      })

      root.name = 'Kleczewsky'

      this.scene.add(root) // 150ms on first render

      this.AnimationController.initLetterAnimations(
        this.letterData.letterMeshes
      )
    }
    this.LoaderController.LoadGltf(
      './static/models/kleczewsky.glb',
      setupKleczewsky
    )

    // Load project models
    const setupWorld = (gltf) => {
      this.projects = gltf.scene

      const root = gltf.scene
      root.scale.set(1, 1, 1)
      root.position.set(0, 0, 0)

      const terrain = root.getObjectByName('Terrain')

      this.effectComposers.finalComposer.passes[1].selects = [terrain.getObjectByName('Plane')]

      const wall = root.getObjectByName('Wall')
      this.wallObject = wall

      this.postersObject = wall.getObjectByName('posters')

      wall.getObjectByName('text').children.forEach(text => {
        if(text.name !== i18next.resolvedLanguage)
          text.visible = false
      })

      wall.getObjectByName('floating-decorations').children.forEach(object => {
        object.material.emissiveIntensity = 0
        this.arcadeDecorations[object.name] = object

        if (object.userData?.animateColor) {
          this.AnimationController.initEmissiveColorAnimation(object)
        }
      })

      const mixer = new THREE.AnimationMixer(root)
      this.AnimationController.animationMixers.push(mixer)
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play()
      })

      // preload textures and setup bloom
      wall.traverse((obj) => {
        obj.frustumCulled = false

        if(obj?.material?.map) {
          this.renderer.initTexture(obj.material.map)
        }

        if(obj.userData?.bloom){
          obj.layers.enable(this.BLOOM_LAYER)
        }
      })
      wall.scale.set(0,0,0)

      root.name = 'Main'

      this.cameraCheckpoints =  root.getObjectByName('Camera-checkpoints')

      this.scene.add(root) // 250 ms on first render
    }
    this.LoaderController.LoadGltf(
        './static/models/kleczewsky_wall.glb',
        setupWorld
    )

  }

  _SetupLights() {
    this.lightsData.lights = []
    this.lightsData.lightsMeshes = []
    this.lightsData.lightsMaterials = []

    const scatter =  20
    const clearRange = 10

    // Generate materials to be animated later
    Object.values(this.AnimationController.letterColors).forEach((color) => {
      const material = new THREE.MeshLambertMaterial({
        color: '#000000',
        emissive:'#000000',
      })
      material.color.targetColor = new THREE.Color(color)

      this.lightsData.lightsMaterials.push(material)
    })

    const lightCoordinates = shuffle([
      {x: -15, y: 5},
      {x: 11, y: 7},
      {x: 18, y: -4},
      {x: -19, y: 15},
      {x: -24, y: -5},
      {x: 26, y: 2},
      {x: 11, y: 26},
      {x: -29, y: 5},
    ]).map((coordinate) => {
      return {
        x: coordinate.x + (Math.random() - 0.5) * scatter/3,
        y: coordinate.y + (Math.random() - 0.5) * scatter/3
      }
    })

    // Generate meshes and corresponding point lights
    for(let i = 0; i < 10; i++){
      const obj = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.2, 1),
          this.lightsData.lightsMaterials[i%3]
      )

      const light = new THREE.PointLight( this.lightsData.lightsMaterials[i%3].color.targetColor, 0, 5)

      const xPos = lightCoordinates[i]?.x ?? (Math.random()> .5 ? random(clearRange, scatter) : -random(clearRange, scatter))
      const zPos = lightCoordinates[i]?.y ?? (Math.random()> .5 ? random(clearRange, scatter) : -random(clearRange, scatter))

      obj.position.set(xPos, 0.1, zPos)
      light.position.set(xPos, 0.1, zPos)
      obj.layers.enable(this.BLOOM_LAYER)

      this.scene.add(obj)
      // this.scene.add(light) // removed for performance reasons

      this.lightsData.lightsMeshes.push(obj)
      this.lightsData.lights.push(light)
    }
  }

  _InitDebugHelpers() {

    this.stats = Stats()
    document.body.appendChild(this.stats.dom)

    const bloomPass = this.effectComposers.bloomComposer.passes[1]

    const gui = new GUI()
    const bloomFolder = gui.addFolder('Bloom')
    bloomFolder.add(bloomPass, 'strength', 0, 10)
    bloomFolder.add(bloomPass, 'radius', 0, 10)
    bloomFolder.add(bloomPass, 'threshold', 0, 1)

    const ambientLight = this.scene.getObjectByName('global_ambient_light')
    const directionalLight = this.scene.getObjectByName('global_directional_light')

    const lightsFolder = gui.addFolder('Lights')
    lightsFolder.add(ambientLight, 'intensity', 0, 5).name('AmbientLight')
    lightsFolder.add(directionalLight, 'intensity', 0, 5).name('DirectionalLight')
    lightsFolder.add(this.renderer, 'toneMappingExposure', 0.1, 2)

    const ssrPass = this.effectComposers.finalComposer.passes[1]

    const ssrFolder = gui.addFolder('SSR')
    ssrFolder.add(ssrPass, 'thickness', 0, 1, 0.001)
    ssrFolder.add(ssrPass, 'maxDistance', 0, 5, 0.01)

    let fogCopy = this.scene.fog ? this.scene.fog.clone() : new THREE.Fog(0xffffff, 1, 200)

    const fogFolder = gui.addFolder('Fog')
    fogFolder.add({ EnableFog: true }, 'EnableFog').onChange((enabled) => {
      if (enabled) {
        this.scene.fog = fogCopy
        return
      }
      fogCopy = this.scene.fog.clone()
      this.scene.fog = null
    })
    fogFolder.add({ color: '#000000' }, 'color').onChange((colorValue) => {
      this.scene.fog.color = new THREE.Color(colorValue)
    })
    fogFolder.add({ near: 100 }, 'near', 1, 2000).onChange((near) => {
      if (this.scene.fog) this.scene.fog.near = near
    })
    fogFolder.add({ far: 2000 }, 'far', 1, 5000).onChange((far) => {
      if (this.scene.fog) this.scene.fog.far = far
    })

    const axesHelper = new THREE.AxesHelper(500)

    const helpersFolder = gui.addFolder('Helpers')
    const directionalLightHelper = new THREE.CameraHelper(
      this.scene.getObjectByName('global_directional_light').shadow.camera
    )
    helpersFolder
      .add({ AxesHelper: false }, 'AxesHelper')
      .onChange((enabled) => {
        if (enabled) {
          this.scene.add(axesHelper)
          return
        }
        this.scene.remove(axesHelper)
      })
    helpersFolder
      .add({ DirLightHelper: false }, 'DirLightHelper')
      .onChange((enabled) => {
        if (enabled) {
          this.scene.add(directionalLightHelper)
          return
        }
        this.scene.fog = null
        this.scene.remove(directionalLightHelper)
      })



    let controls

    helpersFolder
        .add({ OrbitControlsHelper: false }, 'OrbitControlsHelper')
        .onChange((enabled) => {
          const contentOverlay = document.querySelector('.main-content')
          if (enabled) {
            controls = new OrbitControls(this.camera, this.renderer.domElement)
            contentOverlay.style.display = 'none'
            this.InputController.controls.enable = false

            return
          }

          this.InputController.controls.enable = true
          contentOverlay.style.display = null
          controls.dispose()
        })

    helpersFolder.open()
  }

  _OnModelsLoaded() {

    // remove all materials and replace with basic material - useful for checking first render delay (breaks animations)
    // if( this.debugMode ){
    //   var basicMaterial = new THREE.MeshStandardMaterial(  );
    //
    //   this.scene.traverse((obj) => {
    //     obj.material = basicMaterial
    //   })
    // }

    this.renderer.compile(this.scene, this.camera) // helps with initial render stutter (precompiled shaders)

    this.InputController.setupRaycasterObjects()
    this.AnimationController.initIntroAnimation()

    this._RenderLoop()
    this._LogicLoop()
  }

  _OnWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.effectComposers.bloomComposer.setSize(
      window.innerWidth,
      window.innerHeight
    )
    this.effectComposers.finalComposer.setSize(
      window.innerWidth,
      window.innerHeight
    )
  }
}

window.addEventListener('TranslationsLoaded', () => {
  window.app = new kleczewskyWorld()
})
