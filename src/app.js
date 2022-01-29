import * as THREE from 'three'
import { WEBGL } from './webgl_check'
import PostProcessing from './post_processing'
import AnimationController from './animation_controller'
import { GUI } from 'dat.gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { debounce } from 'lodash-es'

import Stats from 'three/examples/jsm/libs/stats.module'

class kleczewskyWorld {
  scene = null
  camera = null

  BLOOM_LAYER = 1
  DARK_MATERIAL = new THREE.MeshBasicMaterial({ color: 'black' })

  letterData = [] //
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
      // antialias: true,
      stencil: false,
      // depth: false,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ReinhardToneMapping

    document.body.appendChild(this.renderer.domElement)

    this.AnimationController = new AnimationController(this)

    this._InitScene()
    this._InitCamera()
    this._LoadModels()
    this._InitPostprocessing()

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
    this.scene.fog = new THREE.Fog(0x000000, 1, 100)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    const directionalLight = new THREE.DirectionalLight(0xffffff)

    directionalLight.position.set(0, 20, 20)
    directionalLight.name = 'global_directional_light'

    this.scene.add(ambientLight)

    this.scene.add(directionalLight)
  }

  _InitCamera() {
    this.camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      1,
      10000
    )

    this.camera.position.set(0, 5, 100)
    this.camera.lookAt(0, 0, 0)
  }

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

  _LoadModels() {
    const loader = new GLTFLoader()

    // kleczewsky
    loader.load(
      './static/models/kleczewsky.glb',
      (gltf) => {
        this.letterData.letterMaterials = []
        this.letterData.letterMeshes = []

        const root = gltf.scene
        root.scale.set(5, 5, 5)

        // Enable bloom layer for letters meshes
        root.children.forEach((group) => {
          if (!group.name.endsWith('Group')) {
            group.castShadow = true
            return
          }
          this.letterData.letterMaterials[group.name] =
            group.children[0].material
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
      },
      (xhr) => console.log(xhr),
      (error) => console.error(error)
    )

    // Load terrain
    loader.load(
      './static/models/kleczewsky_terrain.glb',
      (gltf) => {
        const root = gltf.scene
        root.scale.set(3, 3, 3)
        root.position.set(0, 10, 0)

        root.children[0].receiveShadow = true

        this.scene.add(root)
      },
      (xhr) => console.log(xhr),
      (error) => console.error(error)
    )
  }

  _InitPostprocessing() {
    this.PostProcessing = new PostProcessing(this)
  }

  _InitDebugHelpers() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)

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

    helpersFolder.open()
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
