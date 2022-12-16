import { DoubleSide, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, 
    PlaneGeometry, Quaternion, Scene, SphereGeometry, TextureLoader, Vector3 } from "three"

class ImageGallery {

    frameGroup: Group
    frame: Mesh
    material: MeshBasicMaterial
    photoIndex = 1
    target: string
    loader: TextureLoader
    numPhotos: number
    fileExtension: string
    goForwardButton: Mesh
    goBackwardButton: Mesh
    scene: Scene

    constructor(
        position: Vector3, 
        scene: Scene, 
        loader: TextureLoader, 
        target: string, 
        numPhotos: number, 
        fileExtension: string
    ) {
        this.material = new MeshBasicMaterial({
            side: DoubleSide,
        })
        this.target = target
        this.loader = loader
        this.numPhotos = numPhotos
        this.fileExtension = fileExtension
        this.scene = scene
        const gallerySize = 12
        this.frameGroup = new Group()

        this.frame = new Mesh(
            new PlaneGeometry(gallerySize, gallerySize),
            this.material
        )

        const buttonGeometry = new SphereGeometry(0.5, 32, 32)
        this.goForwardButton = new Mesh(
            buttonGeometry,
            new MeshPhysicalMaterial({
                color: 0x808080,
                clearcoat: 1,
                clearcoatRoughness: 0.1,
            })
        )
        this.goForwardButton.position.set(-gallerySize/2, 0, 0)
        this.goBackwardButton = new Mesh(
            buttonGeometry,
            new MeshPhysicalMaterial({
                color: 0x808080,
                clearcoat: 1,
                clearcoatRoughness: 0.1,
            })
        )
        this.goBackwardButton.position.set(gallerySize/2, 0, 0)
        this.frameGroup.add(this.goForwardButton, this.goBackwardButton, this.frame)

        this.frame.rotateX(-Math.PI / 2)
        const framePosition = position.multiplyScalar(1.01)
        this.frameGroup.position.set(framePosition.x, framePosition.y, framePosition.z)
        this.frameGroup.lookAt(new Vector3(0, 0, 0))
        

        scene.add(this.frameGroup)

        loader.load(`/${this.target}/VERSION_${this.photoIndex}.${this.fileExtension}`, (texture) => {
            this.material.map = texture
            this.material.needsUpdate = true
        })
    }

    navigateForward() {
        if (this.photoIndex < this.numPhotos) {
            this.photoIndex++
        } else {
            this.photoIndex = 1
        }            
        this.loader.load(`/${this.target}/VERSION_${this.photoIndex}.${this.fileExtension}`, (texture) => {
            this.material.map = texture
            this.material.needsUpdate = true
        })
    }

    navigateBackward() {
        if (this.photoIndex > 1) {
            this.photoIndex--
        } else {
            this.photoIndex = this.numPhotos
        }            
        this.loader.load(`/${this.target}/VERSION_${this.photoIndex}.${this.fileExtension}`, (texture) => {
            this.material.map = texture
            this.material.needsUpdate = true
        })
    }


}

export default ImageGallery