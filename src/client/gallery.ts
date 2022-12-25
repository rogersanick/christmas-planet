import { DoubleSide, Group, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, 
    PlaneGeometry, Scene, SphereGeometry, TextureLoader, Vector3 } from "three"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry"
import { Font } from "three/examples/jsm/loaders/FontLoader"
import { getOrnateFont, getTextFont } from "./font"

class ImageGallery {

    frameGroup: Group
    frame: Mesh
    material: MeshBasicMaterial
    photoIndex = 1
    target: string
    loader: TextureLoader
    numPhotos: number
    fileExtension: string
    goForwardButton: Group
    goBackwardButton: Group
    scene: Scene
    progressText: Mesh
    frameSize = 12
    title: string
    textMaterial = new MeshBasicMaterial({color: 0xffffff})
    behindTextMaterial = new MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.5})

    constructor(
        title: string,
        position: Vector3, 
        scene: Scene, 
        loader: TextureLoader, 
        target: string, 
        numPhotos: number, 
        fileExtension: string,
        frameSize?: number
    ) {

        // Create a frame for the gallery and initialize
        this.material = new MeshBasicMaterial({
            side: DoubleSide,
        })
        this.target = target
        this.loader = loader
        this.numPhotos = numPhotos
        this.fileExtension = fileExtension
        this.scene = scene
        this.title = title
        if (frameSize) { this.frameSize = frameSize }

        // Create a group for frame elements
        this.frameGroup = new Group()

        // Create the frame
        this.frame = new Mesh(
            new PlaneGeometry(this.frameSize, this.frameSize),
            this.material
        )

        // Touch Plate geometry
        const touchPlateGeo = new PlaneGeometry(this.frameSize/4, this.frameSize/12).rotateX(Math.PI / 2)

        // Setup go forward button
        this.goForwardButton = new Group()
        this.goForwardButton.add(new Mesh(
            new TextGeometry(
                "nexT >",
                {
                    font: getOrnateFont(),
                    size: this.frameSize/24,
                    height: 0.1,
                    curveSegments: 10,
                }
            ).rotateX(-Math.PI / 2).rotateZ(Math.PI).center(),
            this.textMaterial
        ))
        this.goForwardButton.add(
            new Mesh(
                touchPlateGeo,
                this.behindTextMaterial
            )
        )
        this.goForwardButton.position.set(-this.frameSize/3, 0, -this.frameSize/1.8)

        // Setup go backward button
        this.goBackwardButton = new Group()
        this.goBackwardButton.add(
            new Mesh(
                new TextGeometry(
                    "< Prev",
                    {
                        font: getOrnateFont(),
                        size: this.frameSize/24,
                        height: 0.1,
                        curveSegments: 10,
                    }
                ).rotateX(-Math.PI / 2).rotateZ(Math.PI).center(),
                this.textMaterial
            )
        )
        this.goBackwardButton.add(
            new Mesh(
                touchPlateGeo,
                this.behindTextMaterial
            )
        )
        this.goBackwardButton.position.set(this.frameSize/3, 0, -this.frameSize/1.8)

        // Add the buttons and frame to the frame group
        this.frameGroup.add(this.goForwardButton, this.goBackwardButton, this.frame)

        // Rotate the frame
        this.frame.rotateX(-Math.PI / 2)
        this.frame.rotateY(Math.PI)

        // Position and rotate the frame
        const framePosition = position.multiplyScalar(1.01)
        this.frameGroup.position.set(framePosition.x, framePosition.y, framePosition.z)
        this.frameGroup.lookAt(new Vector3(0, 0, 0))

        this.progressText = this.createProgressText()
        this.frameGroup.add(this.progressText)
        this.frameGroup.add(this.createTitleText())

        scene.add(this.frameGroup)

        loader.load(`/${this.target}/VERSION_${this.photoIndex}.${this.fileExtension}`, (texture) => {
            this.material.map = texture
            this.material.needsUpdate = true
        })
    }

    createTitleText() {
        const newTitleText = new Mesh(
            new TextGeometry(
                this.title,
                {
                    font: getOrnateFont(),
                    size: this.frameSize/24,
                    height: 0.1,
                    curveSegments: 10,
                }
            ).rotateX(-Math.PI / 2).rotateZ(Math.PI).center(),
            this.textMaterial
        )
        newTitleText.position.set(0, 0, this.frameSize/1.65)
        return newTitleText
    }

    createProgressText() {
        const newProgressText = new Mesh(
            new TextGeometry(
                `${this.photoIndex}/${this.numPhotos}`,
                {
                    font: getTextFont(),
                    size: this.frameSize/20,
                    height: 0.1,
                    curveSegments: 12,
                }
            ).rotateX(-Math.PI / 2).rotateZ(Math.PI).center(),
            this.textMaterial
        )
        newProgressText.position.set(0, 0, -this.frameSize/1.8)
        return newProgressText
    }

    changeProgressText() {
        this.frameGroup.remove(this.progressText)
        this.scene.remove(this.progressText);
        (this.progressText.material as Material).dispose()
        this.progressText.geometry.dispose()

        this.progressText = this.createProgressText()
        this.frameGroup.add(this.progressText)
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
        this.changeProgressText()
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
        this.changeProgressText()
    }
}

export default ImageGallery