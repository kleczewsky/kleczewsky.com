import { gsap } from 'gsap'
import * as THREE from 'three'

export default class AnimationController {

    letterColors = {
        "S-Group": new THREE.Color("#e81313"),
        "K-Group": new THREE.Color("#cb39ff"),
        "Y-Group": new THREE.Color("#08e0b2")
    };

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
        const scale = 1.3

        letterGroup.forEach((mesh) => {
            gsap.to(mesh.position, {
                x: (Math.random() - 0.5) * scale,
                y: (Math.random() - 0.5) * scale,
                z: Math.random() - 0.5,

                duration: 1,

                ease: 'back.out',
            })
            gsap.to(mesh.material.color, {
                r: mesh.material.color.explodedColor.r,
                g: mesh.material.color.explodedColor.g,
                b: mesh.material.color.explodedColor.b,

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

            this.context.letterData.letterMaterials[group].color.explodedColor =
                this.letterColors[group]
        })
    }

    staggeredLetterAnimation(staggerTime = 250) {
        let staggerCounter= 0;
        Object.keys(this.context.letterData.letterMeshes).forEach((group) => {

            setTimeout(() => {
                this.explodeLetter(this.context.letterData.letterMeshes[group])
            }, staggerTime * staggerCounter)

            setTimeout(() => {
                this.implodeLetter(this.context.letterData.letterMeshes[group])
            }, staggerTime * staggerCounter + 1300)
            staggerCounter++
        })
    }

    initIdleAnimation() {
        this.idleAnimationId = setInterval(() => {
            this.staggeredLetterAnimation()
        }, 7000)

    }

    stopIdleAnimation() {
        if(this.idleAnimationId){
            clearInterval(this.idleAnimationId)
        }

        this.idleAnimationId = null
    }

    lightsOnAnimation() {
        const lights = this.context.lightsData.lights
        const materials = this.context.lightsData.lightsMaterials

        const duration = 1
        const delay = 1.5

        // animate material colors
        materials.forEach((material) => {
            gsap.fromTo(material.color, {
                r: 0,
                g: 0,
                b: 0
            }, {
                r: material.color.targetColor.r,
                g: material.color.targetColor.g,
                b: material.color.targetColor.b,
                ease: 'bounce.in',
                duration: duration,
                delay: delay,
                onUpdate: () => {
                    material.emissive.r = material.color.r
                    material.emissive.g = material.color.g
                    material.emissive.b = material.color.b
                }
            })
        })

        // animate lights intesity
        lights.forEach((light) => {
            gsap.fromTo(light, {
                intensity: 0
            }, {
                intensity: 5,
                ease: 'bounce.in',
                duration: duration,
                delay: delay,
            })
        })
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
        const fovZDuration = 4

        // Z movement with fov change
        introAnim.fromTo (camera.position,{
            z: 150
        } ,{
            z: 40,
            ease:'easeInOut',
            duration: fovZDuration,
        },fovZTimeOffset )
        introAnim.fromTo(camera,{
            zoom:6
        } , {
            zoom: 1.5,
            ease:'easeInOut',
            duration: fovZDuration,
            onUpdate: () => {
                camera.updateProjectionMatrix()
            },
        }, fovZTimeOffset )

        introAnim.add(() => {
            this.staggeredLetterAnimation()

        }, '-=1')

        introAnim.add(() => {
            this.lightsOnAnimation()
            this.initIdleAnimation()
        })
    }

    animate() {
    }
}
