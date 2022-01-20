import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three'

export default class AnimationController {
  constructor(context) {
    this.context = context
  }

  initLetterAnimations(letterMeshes) {
    Object.keys(letterMeshes).forEach((group) => {
      letterMeshes[group].forEach((mesh) => {
        const tween = new TWEEN.Tween(mesh.position)
        tween
          .to(
            {
              x: Math.random() - 0.5,
              y: Math.random() - 0.5,
              z: Math.random(),
            },
            800
          )
          .easing(TWEEN.Easing.Back.InOut)
          .repeat(Infinity)
          .delay(500)
          .yoyo(true)
          .start()
      })
    })
  }

  animate() {
    TWEEN.update()
  }
}
