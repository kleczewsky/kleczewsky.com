import * as THREE from 'three'
import { WEBGL } from './webgl_check'

import PostProcessing from './post_processing'
import AnimationController from './animation_controller'
import LoaderController from './loader_controller'

import { GUI } from 'dat.gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { debounce } from 'lodash-es'

import Stats from 'three/examples/jsm/libs/stats.module'
import InputController from "./input_controller";
import {random} from "lodash-es/number";

class kleczewskyWorld {
  scene = null
  camera = null

  BLOOM_LAYER = 1
  DARK_MATERIAL = new THREE.MeshBasicMaterial({ color: 'black' })

  letterData = [] // SKY letter meshes and materials
  lightsData = [] // lights meshes and materials
  effectComposers = []

  constructor() {
    this._Initialize()
  }

  _Initialize() {
    if (!WEBGL.isWebGLAvailable()) {
      document.body.appendChild(WEBGL.getWebGLErrorMessage())
      return false
    }

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      precision: 'highp', // possible fix for https://github.com/kleczewsky/kleczewsky-threejs/issues/1
      // antialias: true,
      stencil: false,
      // depth: false,
      // logarithmicDepthBuffer: true,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ReinhardToneMapping

    document.body.appendChild(this.renderer.domElement)

    this.LoaderController = new LoaderController(this, () => this._OnModelsLoad())
    this.AnimationController = new AnimationController(this)
    this.InputController = new InputController(this)

    this._InitScene()
    this._InitCamera()
    this._LoadModels()

    this.PostProcessing = new PostProcessing(this)


    this._RenderLoop()

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
    this.scene.fog = new THREE.Fog(0x000000, 1, 200)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    const directionalLight = new THREE.DirectionalLight(0xffffff)

    directionalLight.position.set(0, 20, 20)
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

    this.camera.position.set(0, 2, 30)
    this.camera.rotateX(-90)
  }

  // callback rate dependent on monitor refresh rate
  _RenderLoop() {
    requestAnimationFrame(() => {
      this._RenderLoop()
      this.AnimationController.animate()
      this.PostProcessing.render()

      if (this.debugMode) {
        this.stats.update()
      }
    })
  }

  // simple 30 Hz logic loop
  _LogicLoop(){
    setInterval(()=>{
      this.InputController.update()
    }, 33)
  }

  _LoadModels() {
    // Setup ground lights
    this._SetupLights()

    // Load writing
    const setupKleczewsky = (gltf) => {
      this.letterData.letterMaterials = []
      this.letterData.letterMeshes = []

      const root = gltf.scene
      root.scale.set(5, 5, 5)
      root.position.set(2, 0, 0)

      // Enable bloom layer for letters meshes
      root.children.forEach((group) => {
        if (!group.name.endsWith('Group')) {
          group.castShadow = true
          return
        }
        this.letterData.letterMaterials[group.name] = group.children[0].material
        this.letterData.letterMeshes[group.name] = []
        group.traverse((obj) => {
          if (obj.isMesh) {
            this.letterData.letterMeshes[group.name].push(obj)
          }
          // todo: decide if enable on all
          if (Math.random() > 0) {
            obj.layers.enable(this.BLOOM_LAYER)
            obj.castShadow = true
          }
        })
      })
      this.scene.add(root)

      this.AnimationController.initLetterAnimations(
        this.letterData.letterMeshes
      )
    }
    this.LoaderController.LoadGltf(
      './static/models/kleczewsky.glb',
      setupKleczewsky
    )

    // Load terrain
    const setupTerrain = (gltf) => {
      const root = gltf.scene
      root.scale.set(3, 3, 3)
      root.position.set(0, 9, 0)

      root.children[0].receiveShadow = true

      this.scene.add(root)
    }
    this.LoaderController.LoadGltf(
      './static/models/kleczewsky_terrain.glb',
      setupTerrain
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
      const material = new THREE.MeshPhongMaterial({
        color: '#000000',
        emissive:'#000000',
      })
      material.color.targetColor = new THREE.Color(color)

      this.lightsData.lightsMaterials.push(material)
    })


    // Generate meshes and corresponding point lights
    for(let i = 0; i < 10; i++){
      const obj = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.2, 1),
          this.lightsData.lightsMaterials[i%3]
      )

      const light = new THREE.PointLight( this.lightsData.lightsMaterials[i%3].color.targetColor, 0, 5)

      const xPos = Math.random()> .5 ? random(clearRange, scatter) : -random(clearRange, scatter)
      const zPos = Math.random()> .5 ? random(clearRange, scatter) : -random(clearRange, scatter)

      obj.position.set(xPos, 0, zPos)
      light.position.set(xPos, 0, zPos)

      this.scene.add(obj)
      this.scene.add(light)

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
    bloomFolder.add(this.renderer, 'toneMappingExposure', 0.1, 2)

    const ssrPass = this.effectComposers.finalComposer.passes[1]

    const ssrFolder = gui.addFolder('SSR')
    ssrFolder.add(ssrPass, 'thickness', 0, 1, 0.001)
    ssrFolder.add(ssrPass, 'maxDistance', 0, 5, 0.01)

    let fogCopy = this.scene.fog.clone()

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
        .add({ ObitControlsHelper: false }, 'ObitControlsHelper')
        .onChange((enabled) => {
          if (enabled) {
            controls = new OrbitControls(this.camera, this.renderer.domElement)

            return
          }
          controls.dispose()
        })

    helpersFolder.open()
  }

  _OnModelsLoad() {
    this.InputController.setupRaycasterObjects()
    this.AnimationController.initIntroAnimation()

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

let APP = null

window.addEventListener('DOMContentLoaded', () => {
  APP = new kleczewskyWorld()
})
