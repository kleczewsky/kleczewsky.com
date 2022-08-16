import { gsap } from 'gsap'
import * as THREE from 'three'

export default class AnimationController {

    letterColors = {
        "S-Group": new THREE.Color("#e81313"),
        "K-Group": new THREE.Color("#cb39ff"),
        "Y-Group": new THREE.Color("#08e0b2")
    };

    animationMixers = [];

    constructor(context) {
        this.context = context
        this._Initialize()

    }

    _Initialize() {
        this.timeline = gsap.timeline()
        this.clock = new THREE.Clock()
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

    flickerLights(duration = 1, stayOn = false) {
        const lights = this.context.lightsData.lights
        const materials = this.context.lightsData.lightsMaterials
        const terrainMaterial = this.context.terrainData.material

        const intensity = 2;

        gsap.fromTo(terrainMaterial, terrainMaterial, {
            emissiveIntensity: intensity,
            ease: 'bounce.in',
            duration: duration,
        })

        if (!stayOn) {
            gsap.to(terrainMaterial, {
                emissiveIntensity: 0,
                ease: 'rough({ template: bounce.out, strength: 1.5, points: 20, taper: none, randomize: true, clamp: false})',
                duration: duration / 2,
                delay: duration,

            })
        }

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
                onUpdate: () => {
                    material.emissive.r = material.color.r
                    material.emissive.g = material.color.g
                    material.emissive.b = material.color.b
                }
            })

            if (!stayOn) {
                gsap.to(material.color, {
                    r: 0,
                    g: 0,
                    b: 0,
                    ease: 'rough({ template: bounce.out, strength: 1.5, points: 20, taper: none, randomize: true, clamp: false})',
                    duration: duration / 2,
                    delay: duration,
                    onUpdate: () => {
                        material.emissive.r = material.color.r
                        material.emissive.g = material.color.g
                        material.emissive.b = material.color.b
                    }
                })
            }
        })

        // animate lights intensity
        lights.forEach((light) => {
            gsap.fromTo(light, {
                intensity: 0,
            }, {
                intensity: intensity,
                ease: 'bounce.in',
                duration: duration,
            })

            if (!stayOn) {
                gsap.to(light, {
                    intensity: 0,
                    ease: 'rough({ template: bounce.out, strength: 1.5, points: 20, taper: none, randomize: true, clamp: false})',
                    duration: duration / 2,
                    delay: duration,
                })
            }
        })
    }

    initIntroAnimation() {
        const introAnim = gsap.timeline()
        const camera = this.context.camera


        // Initial rotation reveal
        introAnim.fromTo(camera.rotation, camera.rotation, {
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
            this.flickerLights(1)
        }, '-=3')
        introAnim.add(() => {
            this.staggeredLetterAnimation()
        }, '-=1')

        introAnim.add(() => {
            this.initIdleAnimation()
            this.context.InputController.enableControls = true
        })

        introAnim.add(() => {
            this.flickerLights(0.5, true)
        }, '+=1')

        introAnim.add(() => {
            gsap.to('.main-content', {
                opacity: 1,
                duration: 0.5,
            })
        }, '+=1')
    }

    onWelcomeAck(shown = false) {
        
        if (!shown) {
            gsap.to('.welcome-message', {
                opacity: 0,
                duration: 0.5,
                onComplete: function () {
                    this.targets()[0].classList.add('d-none')
                }
            })
        } else {
            document.querySelector('.welcome-message').classList.add('d-none')
        }

        gsap.to('.main-nav', {
            opacity: 1,
            delay: 0.5,
            duration: 0.5,
            onStart: function () {
                this.targets()[0].classList.remove('d-none')
            }
        })
    }

    onContactClick() {
        const camera = this.context.camera
        const contact = this.context.contact

        const duration = 3

        this.offsetCamera('left')

        this.context.InputController.isNavigating = true

        gsap.to('.main-nav', {
            bottom: '5%',
            duration: 1,
            ease: 'easeInOut',
        })

        gsap.to(camera.targetPosition, {
            z: contact.position.z ,
            y: contact.position.y,
            x: contact.position.x,
            duration: duration,
            ease: 'ease',
        })

        gsap.to(camera.position, {
            z: contact.position.z + 4 ,
            y: contact.position.y,
            x: contact.position.x - 8,
            duration: duration,
            ease: 'easeInOut',
            onUpdate: () => {
                contact.lookAt(camera.position)
            },
        })

        gsap.to('.contact-section', {
                opacity: 1,
                duration: 1,
                delay: duration,
                onStart: function () {
                    this.targets()[0].classList.remove('d-none')
                },
                onComplete: () => {
                    this.context.InputController.isNavigating = false
                }
            })
    }

    onContactExit() {
        gsap.to('.main-nav', {
            bottom: '30%',
            duration: 1,
            ease: 'easeInOut',
        })

        gsap.to('.contact-section', {
            opacity: 0,
            duration: 0.5,
            onComplete: function () {
                this.targets()[0].classList.add('d-none')
            }
        })

        this.offsetCamera('center')

    }

    onHomeClick() {
        const camera = this.context.camera
        this.flickerLights(0.5) // turn off lights
        this.stopIdleAnimation()

        this.context.InputController.isNavigating = true


        gsap.to(camera.targetPosition, {
            z: 0 ,
            y: 0,
            x: 0,
            delay: 0,
            duration: 3,
            ease: 'ease',
        })


        gsap.to(camera.position, {
            z: 40 ,
            y: 2,
            x: 0,
            duration: 3,
            ease: 'easeInOut',
            onComplete: () => {
                this.staggeredLetterAnimation()
                this.flickerLights(0.5, true)
                this.context.InputController.isNavigating = false
            }
        })
    }

    offsetCamera(side) {
        const offset = {
            from: this.context.camera.viewOffsetRatio ?? 0,
            target: 0}

        switch (side) {
            case 'left':
                offset.target = 0.25
                break
            case 'right':
                offset.target = 0.7
                break
            case 'center':
            default:
                offset.target = 0
                break
        }

        gsap.to(offset, {
                from: offset.target,
                duration: 3,
                ease: 'easeInOut',
                onUpdate: () => {
                    this.context.camera.setViewOffset(window.innerWidth, window.innerHeight, window.innerWidth * offset.from, 0, window.innerWidth, window.innerHeight)
                },
                onComplete: () => {
                    this.context.camera.viewOffsetRatio = offset.target
                }
            }
        )
    }

    animate() {
        this.animationMixers.forEach((mixer) => {
            mixer.update(this.clock.getDelta())
        })
    }
}
