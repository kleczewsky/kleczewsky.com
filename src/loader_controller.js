import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/dracoloader'
import { throttle, mean } from 'lodash-es'
import { gsap } from 'gsap'
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";

export default class LoaderController {
  constructor(context) {
    this.context = context
    this._Initialize()
  }

  _Initialize() {
    this.GLTFLoader = new GLTFLoader()

    // support for DRACO compressed meshes
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('./static/draco/')
    dracoLoader.preload()
    this.GLTFLoader.setDRACOLoader(dracoLoader)

    // support for KTX2 basis supercompressed textures
    const ktxLoader = new KTX2Loader()
    ktxLoader.detectSupport(this.context.renderer)
    ktxLoader.setTranscoderPath('./static/basis/')
    this.GLTFLoader.setKTX2Loader(ktxLoader)

    this.loadingStatus = []

    this.throttledUpdateUi = throttle(this._UpdateUi, 300)

    this.loaderText = document.querySelector('.loader-text')

    this.loaderIndicatorTween = gsap.to('.loader-frag', {
      background: 'green',
      boxShadow: '0px 0px 20px 2px green',

      ease: 'ease',

      duration: 5,
    })

    this.loaded = false

    gsap.fromTo(
      '.loader-text',
      { y: -50, opacity: 0 },
      {
        fontSize: '150%',
        opacity: 1,
        y: -35,

        duration: 1,
        delay: 0.3,
      }
    )
  }

  _ReportLoadingStatus(id, xhr = null, progressPercent = null) {
    if (xhr !== null) {
      if (!xhr.lengthComputable) {
        this.loadingStatus[id] = false
      } else {
        this.loadingStatus[id] = (xhr.loaded / xhr.total) * 100
      }
    }

    if (progressPercent !== null) this.loadingStatus[id] = progressPercent

    this.throttledUpdateUi()
  }

  _UpdateUi() {
    let roundedTotal = Math.round(mean(Object.values(this.loadingStatus)))

    if (!this.loaded) {
      this.loaderText.innerText = roundedTotal + '%'
    }

    gsap.to(this.loaderIndicatorTween, {
      progress: roundedTotal / 100,
    })

    if (roundedTotal === 100 && !this.loaded) {
      this.loaded = true

      setTimeout(() => this.context.events.emit('modelsLoaded'), 1000)

      gsap.to('.loader', {
        opacity: 0
      })

      this.loaderText.innerText = i18next.t('Gotowe')
    }
  }

  LoadBackground() {
    const loader = new THREE.CubeTextureLoader()

    const path = './static/models/textures/skybox/'

    loader.setPath(path)

    this._ReportLoadingStatus(path, null, 0)

    return loader.load(
      [
        'corona_ft.jpg',
        'corona_bk.jpg',
        'corona_up.jpg',
        'corona_dn.jpg',
        'corona_rt.jpg',
        'corona_lf.jpg',
      ],
      () => this._ReportLoadingStatus(path, null, 100),
      (xhr) => console.log(xhr),
      (error) => console.error(error)
    )
  }

  LoadGltf(modelPath, callback) {
    return this.GLTFLoader.load(
      modelPath,
      (gltf) => {
        callback(gltf)
        this._ReportLoadingStatus(modelPath, null, 100)
      },
      (xhr) => this._ReportLoadingStatus(modelPath, xhr),
      (error) => console.error(error)
    )
  }
}
