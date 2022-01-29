import { gsap } from 'gsap'

export default class AnimationController {
  constructor(context) {
    this.context = context
    this._Initialize()
  }

  _Initialize() {
    this.timeline = gsap.timeline()

    document.querySelector('canvas').addEventListener('click', () => {
      Object.keys(this.context.letterData.letterMeshes).forEach((group) => {
        this.explodeLetter(this.context.letterData.letterMeshes[group])
      })
    })

    document.querySelector('canvas').addEventListener('auxclick', () => {
      Object.keys(this.context.letterData.letterMeshes).forEach((group) => {
        this.implodeLetter(this.context.letterData.letterMeshes[group])
      })
    })
  }

  explodeLetter(letterGroup) {
    letterGroup.forEach((mesh) => {
      gsap.to(mesh.position, {
        x: Math.random() - 0.5,
        y: Math.random() - 0.5,
        z: Math.random(),

        duration: 1,

        ease: 'back.out',
      })
      gsap.to(mesh.material.color, {
        r: Math.random(),
        g: Math.random(),
        b: Math.random(),

        ease: 'back.out',

        duration: 1,
      })
    })
  }

  implodeLetter(letterGroup) {
    letterGroup.forEach((mesh) => {
      gsap.to(mesh.position, {
        x: 0,
        y: 0,
        z: 0,

        ease: 'back.out',
        duration: 1,
      })
      gsap.fromTo(mesh.material.color, mesh.material.color, {
        r: mesh.material.color.originalColor.r,
        g: mesh.material.color.originalColor.g,
        b: mesh.material.color.originalColor.b,

        ease: 'back.out',

        duration: 1,
      })
    })
  }

  initLetterAnimations(letterMeshes) {
    Object.keys(letterMeshes).forEach((group) => {
      this.context.letterData.letterMaterials[group].color.originalColor =
        this.context.letterData.letterMaterials[group].color.clone()
    })
  }

  animate() {}
}
