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

    staggeredLetterAnimation(staggerTime = 250) {
        let staggerCounter= 0;
        Object.keys(this.context.letterData.letterMeshes).forEach((group) => {

            setTimeout(() => {
                this.explodeLetter(this.context.letterData.letterMeshes[group])
            }, 250 * staggerCounter)

            setTimeout(() => {
                this.implodeLetter(this.context.letterData.letterMeshes[group])
            }, 250 * staggerCounter + 1300)
            staggerCounter++
        })
    }

    initIdleAnimation() {
        setInterval(() => {
            this.staggeredLetterAnimation(500)
        }, 7000)

    }

    initIntroAnimation() {
        const introAnim = gsap.timeline()
        const camera = this.context.camera


        // Initial rotation reveal
        introAnim.to(camera.rotation, {
            x: -0.05,
            ease: 'elastic.out(0.8, 1.2)',
            duration: 3, // seconds
        }, 0.5)


        const fovZTimeOffset = 1
        const fovZDuration = 3

        // Z movement with fov change
        introAnim.fromTo (camera.position,{
            z: 20
        } ,{
            z: 45,
            ease:'power1.out',
            duration: fovZDuration,
        },fovZTimeOffset )
        introAnim.fromTo(camera,{
            fov:90
        } , {
            fov: 55,
            ease:'power1.out',
            duration: fovZDuration,
            onUpdate: () => {
                camera.updateProjectionMatrix()
            },
        }, fovZTimeOffset )

        introAnim.add(() => {
            this.staggeredLetterAnimation()
        }, '-=1')

        introAnim.add(() => {
            this.initIdleAnimation()
        })
    }

    animate() {
    }
}
