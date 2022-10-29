import * as THREE from 'three'
import debounce from "lodash-es/debounce";
import Cookies from 'js-cookie'
import {lerp} from "three/src/math/MathUtils";
import throttle from "lodash-es/throttle";


export default class InputController {

     controls = {
         enable: false,
         dollyCameraOffset: true,
         scroll: false,
    }

    constructor(context) {
        this.context = context
        this._Initialize()
    }

    _Initialize() {
        window.addEventListener( 'pointermove', (event) => this._onPointerMove(event) );
        window.addEventListener('wheel', throttle((event) => this._onWheel(event), 100));

        this.pointer = new THREE.Vector2()
        this.pointerPrevious = new THREE.Vector2()
        this.raycaster = new THREE.Raycaster()
        this.explodedLetters = new Set()

        this.targetCameraOffset = new THREE.Vector2()
        this.currentScrollOffset = new THREE.Vector2()

        this.targetCameraOffsetLerp = new THREE.Vector2()

        this.scrollOffset = 0

        this.isNavigating = false

        this.searchParams = new URLSearchParams(window.location.search)
        if(!this.searchParams.has('active')) {
            this.searchParams.set('active', 'home')
        }
        this._initializeSiteControls()
    }

    _onPointerMove(event) {
        this.pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1
        this.pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1
    }

    _onWheel(event) {
        if(event.deltaY !== 0 && this.controls.scroll){
            if(event.deltaY < 0 && this.scrollOffset < 0)  this.scrollOffset += 1
            if(event.deltaY > 0 && this.scrollOffset > -20)  this.scrollOffset -= 1
        }
    }

    // Collects all the objects that raycaster should pick up
    setupRaycasterObjects() {
        this._raycasterObjects = Object.keys(this.context.letterData.letterMeshes)
            .reduce((value, key) => {
            return value.concat(this.context.letterData.letterMeshes[key])
        }, [])
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
                        Cookies.set('welcome-message-shown', true, {expires: 7})
                    }
                )

        }

        const warpTriggers = document.querySelectorAll('.warp-trigger')

        warpTriggers.forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                const target = event.target
                const lastActive = this.searchParams.get('active')

                if (target.dataset.warpTo === lastActive) return false

                if(this.isNavigating) return false

                switch (target.dataset.warpTo) {
                    case 'home':
                        this.context.AnimationController.onHomeClick()
                        break
                    case 'contact':
                        this.context.AnimationController.onContactClick()
                        break
                    case 'about':
                        // this.context.AnimationController.onAboutClick()
                        // break
                    case 'projects':
                        // this.context.AnimationController.onProjectsClick()
                        // break
                    default:
                        return false
                }

                // clean up changes from previous state
                switch (lastActive) {
                    case 'contact':
                        this.context.AnimationController.onContactExit()
                        break
                }

                target.classList.add('text-primary', 'opacity-50')
                document.querySelector(`.warp-trigger[data-warp-to=${lastActive}]`).classList.remove('text-primary', 'opacity-50')
                this.searchParams.set('active', target.dataset.warpTo)
            })
        })
    }

    update() {
        this.raycaster.setFromCamera(this.pointer, this.context.camera);

        if (this.controls.enable && !this.isNavigating) {
            if(this.controls.dollyCameraOffset) {
                // lerp camera position to desired offset using the distance of pointer from center

                this.targetCameraOffset.x = (this.pointer.x*1.5)
                this.targetCameraOffset.y = (this.pointer.y*1.5)
                this.context.dolly.position.lerp(new THREE.Vector3(this.targetCameraOffset.x, this.targetCameraOffset.y, 0), 0.02)
            } else {
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


            // interact with letters
            const intersectingObjects = this.raycaster.intersectObjects(this._raycasterObjects, false)

            if (intersectingObjects.length > 0) {
                const groupName = intersectingObjects[0].object.parent.name
                this._debouncedExplode(groupName)
            }

        }

        this.pointerPrevious.copy(this.pointer)
    }
}
