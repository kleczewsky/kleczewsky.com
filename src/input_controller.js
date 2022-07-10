import * as THREE from 'three'
import debounce from "lodash-es/debounce";


export default class InputController {


    constructor(context) {
        this.context = context
        this._Initialize()
    }

    _Initialize() {
        window.addEventListener( 'pointermove', (event) => this._onPointerMove(event) );

        this.pointer = new THREE.Vector2()
        this.raycaster = new THREE.Raycaster();
        this.explodedLetters = new Set()
    }

    _onPointerMove(event) {
        this.pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        this.pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }

    // Collects all the objects that raycaster should pick up
    setupRaycasterObjects() {
        this._raycasterObjects = Object.keys(this.context.letterData.letterMeshes)
            .reduce((value, key) => {
            return value.concat(this.context.letterData.letterMeshes[key]);
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


    update() {
        this.raycaster.setFromCamera( this.pointer, this.context.camera );

        const intersectingObjects = this.raycaster.intersectObjects(this._raycasterObjects, false)

        if(intersectingObjects.length > 0){
            const groupName = intersectingObjects[0].object.parent.name
            this._debouncedExplode(groupName)
        }

    }

}
