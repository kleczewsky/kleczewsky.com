import * as THREE from 'three'
import debounce from "lodash-es/debounce";
import Cookies from 'js-cookie'
import {lerp} from "three/src/math/MathUtils";
import throttle from "lodash-es/throttle";
import differenceBy from "lodash-es/differenceBy";


export default class InputController {

     controls = {
         enable: false, // disables any controls (mouse / scroll)
         dollyCameraOffset: true, // disables camera dolly controls
         scroll: false, // disables scroll offset changing
    }

    constructor(context) {
        this.context = context
        this._Initialize()
    }

    _Initialize() {
        window.addEventListener( 'pointermove', (event) => this._onPointerMove(event) );
        window.addEventListener( 'click', () => this.raycasterCheckIntersecting(true) );

        window.addEventListener('wheel', throttle((event) => this._onWheel(event), 100));

        this.pointer = new THREE.Vector2()
        this.pointerPrevious = new THREE.Vector2()
        this.raycaster = new THREE.Raycaster()
        this.intersectingObjects = []
        this.explodedLetters = new Set()

        this.targetCameraOffset = new THREE.Vector2()
        this.currentScrollOffset = new THREE.Vector2()

        this.targetCameraOffsetLerp = new THREE.Vector2()

        this.scrollOffset = 0

        this.isNavigating = false
        this.hasNavigated = false

        this.searchParams = new URLSearchParams(window.location.search)
        if(!this.searchParams.has('active')) {
            this.searchParams.set('active', 'home')
        }
        this._initializeSiteControls()
    }

    _onPointerMove(event) {
        this.pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1
        this.pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1

        this.raycasterCheckIntersecting()
    }

    _onWheel(event) {
        if (event.deltaY == 0) return

        if (!this.controls.enable) return

        // Scroll up
        if (event.deltaY < 0) {
            this.context.events.emit('mousewheel.up')
        }
        // Scroll down
        if (event.deltaY > 0) {
            this.context.events.emit('mousewheel.down')
        }

    }

    // Collects all the objects that raycaster should pick up
    setupRaycasterObjects() {
        this._raycasterObjects = []

        // exploding letters meshes
        this.context.letterData.triggers.forEach(trigger => {
                const groupName = trigger.name + '-Group'
                trigger.onMouseEnter = () => {
                    // this._debouncedExplode(trigger.name + '-Group')
                    this.context.AnimationController.stopIdleAnimation()
                    this.context.AnimationController.explodeLetter(this.context.letterData.letterMeshes[groupName])
                }
                trigger.onMouseExit = () => {
                    // this._debouncedImplode(trigger.name + '-Group')
                    this.context.AnimationController.implodeLetter(this.context.letterData.letterMeshes[groupName])
                }

                this._raycasterObjects.push(trigger)
            })


        this.context.postersObject.children.forEach(poster => {

            poster.onClick = () => {
                this.context.AnimationController.showPosterSection(poster.name)
            }
            poster.onMouseEnter = () => {
                this.context.AnimationController.highlightPoster(poster)
            }
            poster.onMouseExit = () => {
                this.context.AnimationController.unHighlightPoster(poster)
            }

            this._raycasterObjects.push(poster)
        })

        const arcade = this.context.scene.getObjectByName('arcade-trigger')

        arcade.visible = false

        arcade.onClick = () => {
            arcade.onMouseEnter = ()=>{}
            arcade.onMouseExit = ()=>{}
            this.context.AnimationController.showPosterSection('contact-section')
        }
        arcade.onMouseEnter = () => this.context.AnimationController.highlightArcade()
        arcade.onMouseExit = () => this.context.AnimationController.unHighlightArcade()

        this._raycasterObjects.push(arcade)
    }

    // todo: refactor this to a proper event system
    raycasterCheckIntersecting(onClick = false) {
        if (!this.controls.enable || this.isNavigating)
            return

        if (!this._raycasterObjects || !this._raycasterObjects.length)
            return

        this.raycaster.setFromCamera(this.pointer, this.context.camera);

        this.prevIntersectingObjects = this.intersectingObjects
        this.intersectingObjects = []

        this._raycasterObjects.forEach(object => {
            const intersected = this.raycaster.intersectObject(object, false)[0]
            if (intersected)
                this.intersectingObjects.push(intersected)
        })

        const noLongerIntersecting = differenceBy(this.prevIntersectingObjects, this.intersectingObjects, 'object')
        const newIntersecting = differenceBy(this.intersectingObjects, this.prevIntersectingObjects, 'object')


        if (this.intersectingObjects.length > 0) {
            if (typeof this.intersectingObjects[0].object?.onMouseOver === 'function') {
                this.intersectingObjects[0].object.onMouseOver()
            }

            if (onClick && typeof this.intersectingObjects[0].object?.onClick === 'function') {
                this.intersectingObjects[0].object.onClick()
                document.body.style.cursor = 'auto'
            }
        }

        noLongerIntersecting.forEach((intersection) => {
            if (typeof intersection.object.onMouseExit === 'function') {
                intersection.object.onMouseExit()
                document.body.style.cursor = 'auto'
            }
        })

        newIntersecting.forEach((intersection) => {
            if (typeof intersection.object.onMouseEnter === 'function') {
                intersection.object.onMouseEnter()
                if(typeof intersection.object.onClick === 'function'){
                    document.body.style.cursor = 'pointer'
                }
            }
        })
    }

    _debouncedImplode = debounce(() => {
        let staggerCounter = 0
        this.explodedLetters.forEach((groupName) => {
            setTimeout(() => {
                this.context.AnimationController.implodeLetter(this.context.letterData.letterMeshes[groupName])

            }, 250 * staggerCounter)
            staggerCounter++
        })
        this.explodedLetters.clear()

    }, 1000, {leading: false, trailing: true})

    _debouncedExplode = (groupName) => {
        this.context.AnimationController.stopIdleAnimation()

        if (!this.explodedLetters.has(groupName)) {
            this.context.AnimationController.explodeLetter(this.context.letterData.letterMeshes[groupName])
            this.explodedLetters.add(groupName)
        }

        this._debouncedImplode()
    }

    _initializeSiteControls() {
        if (Cookies.get('welcome-message-shown')) {
            this.context.AnimationController.onWelcomeAck(true)
        } else {
            document.getElementById('welcome-message-ack')
                .addEventListener('click', () => {
                        this.context.AnimationController.onWelcomeAck(false)
                        Cookies.set('welcome-message-shown', true, {expires: 1})
                    }
                )
        }
        const closePosterTriggers = document.querySelectorAll('.close-full-screen-modal')
        closePosterTriggers.forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                event.stopPropagation()
                this.context.AnimationController.hidePosterSection(trigger.parentElement.id)
            })
        })


        const warpTriggers = document.querySelectorAll('.warp-trigger')
        warpTriggers.forEach( (trigger) => {
            trigger.addEventListener('click', async (event) => {
                event.stopPropagation()
                const target = event.target
                const lastActive = this.searchParams.get('active')

                if(this.isNavigating) return false

                this.context.events.removeListener('mousewheel.down',  this.context.AnimationController.onFirstNavigate)

                if(!this.hasNavigated) {
                    await this.context.AnimationController.onFirstNavigate()

                    await (async function(resolve) {
                        console.log('wtf')
                        setTimeout(resolve,500)
                    }) // wait after first transition
                }

                switch (target.dataset.warpTo) {
                    // case 'home':
                    //     this.context.AnimationController.onHomeClick()
                    //     break
                    case 'contact':
                        await this.context.AnimationController.onContactClick()
                        break
                    // case 'about':
                    //     this.context.AnimationController.onAboutClick()
                    //     break
                    case 'projects':
                        await this.context.AnimationController.onProjectsClick()
                        break
                    default:
                        return false
                }


                this.searchParams.set('active', target.dataset.warpTo)
            })
        })

        this.context.events.on('mousewheel.up', () => {
            if (this.controls.scroll && this.scrollOffset < 3)
                this.scrollOffset += 1
        })

        this.context.events.on('mousewheel.down', () => {
            if (this.controls.scroll && this.scrollOffset > -31)
                this.scrollOffset -= 1
        })
    }

    update() {
        if(this.controls.enable && this.controls.dollyCameraOffset) {
            // lerp camera position to desired offset using the distance of pointer from center

            this.targetCameraOffset.x = (this.pointer.x*1.5)
            this.targetCameraOffset.y = (this.pointer.y*1.5)
            this.context.dolly.position.lerp(new THREE.Vector3(this.targetCameraOffset.x, this.targetCameraOffset.y, 0), 0.02)
        }

        if (this.controls.enable && !this.isNavigating) {

            if(!this.controls.dollyCameraOffset) {
                // lerp camera position to desired offset using delta pointer pos

                this.targetCameraOffset.x = (this.pointer.x - this.pointerPrevious.x) * -3
                this.targetCameraOffset.y = (this.pointer.y - this.pointerPrevious.y) * 0.8

                this.targetCameraOffsetLerp.lerp(this.targetCameraOffset, 0.02)

                this.context.camera.translateX(this.targetCameraOffsetLerp.x)
                this.context.camera.translateY(this.targetCameraOffsetLerp.y)
            }

            if (this.controls.scroll) {
                // "not so" smooth elevation control
                const translateBy = lerp(this.currentScrollOffset.y, this.scrollOffset, 0.01 ) - this.currentScrollOffset.y
                this.context.camera.translateY(translateBy)

                this.currentScrollOffset.y += translateBy
            } else {
                // lerp camera rotation to look at target
                const qStart = this.context.camera.quaternion.clone()
                this.context.camera.lookAt(this.context.camera.targetPosition)
                const qEnd = this.context.camera.quaternion.clone()
                this.context.camera.quaternion.copy(qStart)

                this.context.camera.quaternion.slerp(qEnd, 0.05)
            }


        }

        this.pointerPrevious.copy(this.pointer)
    }
}
