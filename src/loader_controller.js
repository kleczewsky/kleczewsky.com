import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { throttle, mean, once } from 'lodash-es'
import { gsap } from 'gsap'
import { GreaterStencilFunc } from 'three'

export default class LoaderController {
  constructor(context) {
    this.context = context
    this._Initialize()
  }

  _Initialize() {
    this.GLTFLoader = new GLTFLoader()

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
    this.loaderText.innerText = roundedTotal + '%'

    gsap.to(this.loaderIndicatorTween, {
      progress: roundedTotal / 100,
    })

    if (roundedTotal == 100 && !this.loaded) {
      this.loaded = true
      document.querySelector('.loader-screen').style.opacity = 0

      setTimeout(() => {
        document.querySelector('.loader-screen').remove()
      }, 500)
    }
  }

  LoadBackground() {
    const loader = new THREE.CubeTextureLoader()

    const path = './static/models/textures/cubemap/'

    loader.setPath(path)

    this._ReportLoadingStatus(path, null, 0)

    // todo: optimize skybox size
    return loader.load(
      [
        'corona_ft.png',
        'corona_bk.png',
        'corona_up.png',
        'corona_dn.png',
        'corona_rt.png',
        'corona_lf.png',
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
