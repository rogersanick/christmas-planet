import "./style.css"
import { GUI } from "dat.gui"
import { 
    TextureLoader, Scene, Mesh, sRGBEncoding, SphereGeometry, 
    DirectionalLight, PerspectiveCamera, WebGLRenderer, PCFSoftShadowMap, 
    Clock, MeshPhysicalMaterial, BufferAttribute, AmbientLight, Vector3, 
    ArrowHelper, Object3D, Group, Quaternion, BoxGeometry, Box3, MeshBasicMaterial
} from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader"
import ChristmasPenguin from "./christmasPenguin"
import { SnowBall, throwSnowBall } from "./snowBall"
import Snow from "./snow"
import { getRapier } from "./rapier"
import RAPIER from "@dimforge/rapier3d-compat"
import GiftBox from "./gift_box"

// TODO: Adjust camera scrolling
// TODO: Enable snowball throwing
// TODO: Simple bad guys

// Enable Async
(async () => {

    /** Initialzie and setup */
    const RAPIER = await getRapier()

    // Loaders
    const gltfLoader = new GLTFLoader()
    const textureLoader = new TextureLoader()
 
    // Debug
    const gui = new GUI()
    const debugObject = {
        envMapIntensity: 5,
        penguinSpeed: 15,
        zoom: 0.7,
        debugPhysics: false
    }
    gui.add(debugObject, "penguinSpeed", 10, 30)
    gui.add(debugObject, "zoom", 0, 5)
 
    // Canvas
    const canvas = document.querySelector("canvas.webgl") as HTMLElement
 
    // Scene
    const scene = new Scene()

    /** Vector visualization utilities */ 
    const visualize = (vector: Vector3, object: Object3D) => {
        const arrowHelper = new ArrowHelper(vector, object.position, 2, 0xff0000)
        scene.add(arrowHelper)
        setTimeout(() => {
            scene.remove(arrowHelper)
        }, 1000)
    }

    const visualizeQuaternion = (quaternion: Quaternion, object: Object3D) => {
        const arrowHelper = new ArrowHelper(new Vector3(0, 0, 0), object.position, 2, 0xff0000)
        arrowHelper.rotation.setFromQuaternion(quaternion)
        scene.add(arrowHelper)
        setTimeout(() => {
            scene.remove(arrowHelper)
        }, 1000)
    }

    /**
     * Game Elements
     */
    type GameElement = { body: RAPIER.RigidBody, object: Object3D, shouldRotate: boolean }
    const gameElements: GameElement[] = []
    
    /** 
     * Snow 
     */
    const snow = new Snow()

    // Add particleSystems to scene
    for (let i = 0; i < snow.particleSystems.length; i++) {
        scene.add(snow.particleSystems[i])
    }

 
    /** 
    * Physics
    */
    const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 })

    /**
    * Planet Christmas
    */
    const worldRadius = 150
    const worldRigidBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
    )
    world.createCollider(RAPIER.ColliderDesc.ball(worldRadius)
        .setDensity(1)
        .setRestitution(0.4), worldRigidBody)

    const colorTexture = textureLoader.load("/textures/angele-kamp-g8IEMx8p_z8-unsplash.jpg")
    colorTexture.encoding = sRGBEncoding
    colorTexture.repeat.set(0.5, 0.8)
    const normalTexture = textureLoader.load("/textures/Snow_003_NORM.jpg")
    const ambientOcclusionTexture = textureLoader.load("/textures/Snow_003_OCC.jpg")
    const roughnessTexture = textureLoader.load("/textures/Snow_003_ROUGH.jpg")
 
    const worldGeometry = new SphereGeometry(worldRadius, 1024)
    worldGeometry.setAttribute("uv2", new BufferAttribute(worldGeometry.attributes.uv.array, 2))
    const worldMaterial = new MeshPhysicalMaterial({
        normalMap: normalTexture,
        aoMap: ambientOcclusionTexture,
        roughnessMap: roughnessTexture,
    })
    worldMaterial.aoMapIntensity = 0.2
    worldMaterial.displacementScale = 1
    worldMaterial.normalScale.set(2, 2)
    const worldMesh = new Mesh(worldGeometry, worldMaterial)
    worldMesh.rotation.x = - Math.PI * 0.5
    scene.add(worldMesh)
 
    /**
     * Christmas Tree
     */
    const treeModel: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/christmas_tree.glb", (obj) => {
            resolve(obj.scene)
        })
    })
    treeModel.position.y = worldRadius
    treeModel.scale.set(3,3,3)
    // scene.add(treeModel)

    /**
     * Snowman
     */
    const snowmanModel: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/snow_girl.glb", (obj) => {
            resolve(obj.scene)
        })
    })
    snowmanModel.position.y = worldRadius + 2
    snowmanModel.scale.set(3,3,3)
    // scene.add(snowmanModel)

    /** Gift */
    const giftModel: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/gift_box.gltf", (obj) => {
            obj.scene.traverse( function( node ) {
                if ( node instanceof Mesh ) { 
                    node.castShadow = true 
                    node.translateY(-1.4)
                }
            })
            resolve(obj.scene)
        })
    })
    console.log(giftModel)
    const modelSize = new Box3().setFromObject(giftModel)
    const size = modelSize.getSize(new Vector3())

    const createGiftBox = (scale: number) => {
        const giftBox = new GiftBox(giftModel, worldRadius, world, size.multiplyScalar(scale))
        giftBox.object.scale.setScalar(scale)
        gameElements.push(giftBox)
        return giftBox
    }
    const track = createGiftBox(1)

    /**
    * Penguin
    */
    const christmasPenguinModel: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/christmas_penguin_glTF.glb", (gltf) => {
            resolve(gltf.scene)
            gltf.scene.scale.set(1.5, 1.5, 1.5)
            gltf.scene.children[0].rotateX(-Math.PI/2)
            gltf.scene.children[0].rotateY(-Math.PI/2)
        })
    })
    const christmasPenguin = new ChristmasPenguin(christmasPenguinModel, worldRadius, world)
    gameElements.push(christmasPenguin)

    window.addEventListener("keydown", function(event) {
        if (event.shiftKey) {
            console.log(christmasPenguin.object.rotation.z)
            // Create and add a snowball
            const snowBallPosition = christmasPenguin.object.position.clone()
            snowBallPosition.y += 5
            const snowBall = new SnowBall(world, snowBallPosition)
            scene.add(snowBall.object)
            gameElements.push(snowBall)

            // Determine the snowball direction and throw
            const snowBallDirection = new Vector3()
            christmasPenguin.object.getWorldDirection(snowBallDirection)
            visualize(new Vector3().applyQuaternion(christmasPenguin.object.quaternion), christmasPenguin.object)
            snowBallDirection.multiplyScalar(1000)
            throwSnowBall(snowBall, new RAPIER.Vector3(snowBallDirection.x, snowBallDirection.y, snowBallDirection.z))

            // Cleanup after two seconds
            setTimeout(() => {
                scene.remove(snowBall.object)
                world.removeCollider(snowBall.collider, false)
                world.removeRigidBody(snowBall.body)
                gameElements.splice(gameElements.indexOf(snowBall), 1)
            }, 2000)
        }
        applyForce(event.key, christmasPenguin.object, christmasPenguin.body)
    })
        

    window.addEventListener("wheel", (e) =>
    {
        const penguinDistanceToCenterOfPlanet = christmasPenguin.object.position.distanceTo(worldMesh.position)
        const cameraDistanceToCenterOfPlanet = camera.position.distanceTo(worldMesh.position)
        if (debugObject.zoom < 100 && penguinDistanceToCenterOfPlanet < cameraDistanceToCenterOfPlanet) {
            debugObject.zoom += e.deltaY * 0.0003
            gui.updateDisplay()
        } else if (e.deltaY > 0) {
            debugObject.zoom += e.deltaY * 0.0003
            gui.updateDisplay()
        }
    })

    let prevX: number | null = 0
    window.addEventListener("mousemove", (e) => {
        if (shouldRotate) {
            if (prevX == null) {
                prevX = e.clientX
            } else if (prevX < e.clientX) {
                christmasPenguin.object.rotateZ((e.clientX - prevX) * 0.01)
                prevX = e.clientX
            } else if (prevX > e.clientX) {
                christmasPenguin.object.rotateZ((e.clientX - prevX) * 0.01)
                prevX = e.clientX
            }
        }

    })

    let shouldRotate = false
    window.addEventListener("mousedown", (event) => {
        shouldRotate = true
    })
    window.addEventListener("mouseup", () => {
        shouldRotate = false
        prevX = null
    })

    let jumpCount = 0
    const applyForce = (inputKey: string, object: Object3D, body: RAPIER.RigidBody) => {
        // Calculate the new velocity based on the direction
        const direction = new Vector3()
        if (inputKey === " " && jumpCount < 2) {
            jumpCount++
            const jumpVector = new Vector3().subVectors(
                object.position, worldMesh.position).normalize().multiplyScalar(debugObject.penguinSpeed * 30)
            const jumpCannonVector = new RAPIER.Vector3(jumpVector.x, jumpVector.y, jumpVector.z)
            body.applyImpulse(jumpCannonVector, true)
            setTimeout(() => {
                jumpCount--
            }, 1000)
        } else if (inputKey === "ArrowUp" || inputKey === "w") {
            direction.subVectors(object.position, camera.position).normalize()
        } else if (inputKey === "ArrowDown" || inputKey === "s") {
            direction.subVectors(camera.position, object.position).normalize()
        } else if (inputKey === "ArrowLeft" || inputKey === "a") {
            direction.subVectors(object.position, camera.position).normalize()
            const axis = new Vector3(0, 1, 0).projectOnPlane(direction)
            direction.applyAxisAngle(axis, Math.PI / 2)
        } else if (inputKey === "ArrowRight" || inputKey === "d") {
            direction.subVectors(object.position, camera.position).normalize()
            const axis = new Vector3(0, 1, 0).projectOnPlane(direction)
            direction.applyAxisAngle(axis, -Math.PI / 2)
        }

        // Update the object's velocity
        direction.multiplyScalar(debugObject.penguinSpeed)
        body.applyImpulse(new RAPIER.Vector3(direction.x, direction.y, direction.z), true)
    }


    /**
    * Lights
    */
    const directionalLight = new DirectionalLight("#ffffff", 1)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.far = 30
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.normalBias = 0.05
    directionalLight.position.set(3.5, 2, - 1.25)
    scene.add(directionalLight)

    const ambientLight = new AmbientLight("#ffffff", 0.3)
    scene.add(ambientLight)
 
    gui.add(directionalLight, "intensity").min(0).max(10).step(0.001).name("lightIntensity")
    gui.add(directionalLight.position, "x").min(- 5).max(5).step(0.001).name("lightX")
    gui.add(directionalLight.position, "y").min(- 5).max(5).step(0.001).name("lightY")
    gui.add(directionalLight.position, "z").min(- 5).max(5).step(0.001).name("lightZ")
 
    /**
    * Sizes
    */
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }
 
    window.addEventListener("resize", () =>
    {
    // Update sizes
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight
 
        // Update camera
        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()
 
        // Update renderer
        renderer.setSize(sizes.width, sizes.height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })
 
    /**
    * Camera
    */
    // Base camera
    const camera = new PerspectiveCamera(35, sizes.width / sizes.height, 0.1)
    scene.add(camera)
 
    /**
    * Renderer
    */
    const renderer = new WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    renderer.physicallyCorrectLights = true
    renderer.outputEncoding = sRGBEncoding
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /**
    * Animate
    */

    new RAPIER.DebugRenderPipeline()
    gameElements.forEach(({ object }) => {
        scene.add(object)
    })

    // Get time related variables
    const clock = new Clock()
    const waddleClockwise = true
    let waddleClockwiseCount = 50
    const tick = () =>
    {
        // Step the physics world
        const deltaTime = clock.getDelta()
        world.step()

        // Position the game elements
        gameElements.forEach(({ object, body, shouldRotate }) => {

            // Calculate the direction from the object to the origin
            const bodyPosition = body.translation()
            object.position.copy(new Vector3(bodyPosition.x, bodyPosition.y, bodyPosition.z))

            // If they should rotate, rotate them
            if (shouldRotate) {
                const { x, y, z, w } = body.rotation()
                object.quaternion.copy(new Quaternion(x, y, z, w))
            }

            // Apply a gravitational force to the object, pulling it towards the origin
            const direction = new Vector3().subVectors(new Vector3(0, 0, 0), object.position).normalize()
            direction.multiplyScalar(9.81)
            body.applyImpulse(new RAPIER.Vector3(direction.x, direction.y, direction.z), true)
        })

        // Get christmas game element properties
        const { object } = christmasPenguin

        // Rotate the penguin from the center of the earth
        const preserveZRotation = object.rotation.z
        object.lookAt(worldMesh.position.x, worldMesh.position.y, worldMesh.position.z)
        object.rotation.z = preserveZRotation

        // Waddle the penguin if it's moving
        if (waddleClockwise && waddleClockwiseCount > 100) {
            christmasPenguin.object.children[0].rotateX(clock.getElapsedTime() * 0.01)
            waddleClockwiseCount--
        } 
        
        if (!waddleClockwise && waddleClockwiseCount < 100) {
            christmasPenguin.object.children[0].rotateX(clock.getElapsedTime() * -0.01)
            waddleClockwiseCount++
        }
 
        // Update controls
        const newCameraVector = new Vector3().subVectors(object.position, worldMesh.position)
            .multiplyScalar(1.5).multiplyScalar(debugObject.zoom)
        camera.position.set(newCameraVector.x, newCameraVector.y, newCameraVector.z + 30)
        camera.lookAt(object.position.x, object.position.y, object.position.z)

        // Snow
        const time = clock.getElapsedTime()
        snow.particleSystems.forEach((particleSystem, i) => {
            particleSystem.rotation.y = time * (i < 4 ? i + 1 : -(i + 1)) * 0.05
        })

        snow.materials.forEach((material, i) => {
            const color = snow.parameters[i][0]
            const h = (360 * ((color[0] + time) % 360)) / 360
            material.color.setHSL(h, color[1], color[2])
        })
 
        // Render
        renderer.render(scene, camera)
        
 
        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }
 
    tick()
})()