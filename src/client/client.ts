import "./style.css"
import { GUI } from "dat.gui"
import { 
    TextureLoader, Scene, Mesh, sRGBEncoding, SphereGeometry, 
    DirectionalLight, PerspectiveCamera, WebGLRenderer, PCFSoftShadowMap, 
    Clock, MeshPhysicalMaterial, BufferAttribute, AmbientLight, Vector3, 
    ArrowHelper, Object3D, Group, Quaternion, Euler, FogExp2, Points
} from "three"
import * as CANNON from "cannon-es"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { SAPBroadphase, Vec3 } from "cannon-es"
import CannonDebugRenderer from "./cannon/cannonDebugRenderer"
import ChristmasPenguin from "./christmasPenguin"
import { SnowBall, throwSnowBall } from "./snowBall"
import Snow from "./snow"

// TODO: Fix camera rotation
// TODO: Fix penguin rotation (less urgent)
// TODO: Enable snowball throwing
// TODO: Simple bad guys
// TODO: Add camera scroll

// Enable Async
(async () => {

    /** Initialzie and setup */

    // Loaders
    const gltfLoader = new GLTFLoader()
    const textureLoader = new TextureLoader()
 
    // Debug
    const gui = new GUI()
    const debugObject = {
        envMapIntensity: 5,
        penguinSpeed: 20,
        zoom: 0.7,
        debugPhysics: false
    }
    gui.add(debugObject, "penguinSpeed", 0, 100)
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
    type GameElement = { body: CANNON.Body, object: Object3D }
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
    const world = new CANNON.World()
    world.broadphase = new SAPBroadphase(world)

    // This is overriden in the animation function
    world.gravity.set(0, 0, 0)
    const debugRenderer = new CannonDebugRenderer(scene, world)

    /**
    * Planet Christmas
    */
    const worldBodyMaterial = new CANNON.Material("ground")
    const worldRadius = 150
    const worldPosition = new Vector3(0, 0, 0)
    const worldBody = new CANNON.Body({
        material: worldBodyMaterial,
        mass: 0, // the planet has a mass of 1 kg
        shape: new CANNON.Sphere(worldRadius)
    })
    world.addBody(worldBody)

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
    * Penguin
    */
    const christmasPenguinModel: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/christmas_penguin_glTF.glb", (gltf) => {
            resolve(gltf.scene)
            gltf.scene.scale.set(2,2,2)
            gltf.scene.children[0].rotateX(-Math.PI/2)
            gltf.scene.children[0].rotateY(-Math.PI/2)
        })
    })
    const christmasPenguin = new ChristmasPenguin(christmasPenguinModel, worldRadius)
    gameElements.push(christmasPenguin)

    window.addEventListener("keydown", function(event) {
        if (event.shiftKey) {
            console.log(christmasPenguin.object.rotation.z)
            // Create and add a snowball
            const snowBall = new SnowBall()
            scene.add(snowBall.object)
            world.addBody(snowBall.body)
            gameElements.push(snowBall)

            // Set the initial snowball position
            const snowBallPosition = christmasPenguin.body.position.clone()
            snowBallPosition.z += 3

            // Determine the snowball direction and throw
            const snowBallDirection = new Vector3()
            christmasPenguin.object.getWorldDirection(snowBallDirection)
            visualize(new Vector3().applyQuaternion(christmasPenguin.object.quaternion), christmasPenguin.object)
            const test = new Vec3(snowBallDirection.x, snowBallDirection.y, snowBallDirection.z)
            throwSnowBall(snowBall, snowBallPosition, test)

            // Cleanup after two seconds
            setTimeout(() => {
                scene.remove(snowBall.object)
                world.removeBody(snowBall.body)
                gameElements.splice(gameElements.indexOf(snowBall), 1)
            }, 2000)
        }
        applyForce(event.key, christmasPenguin.object, christmasPenguin.body)
    })


    /** 
     * Friction
     */
    const penguinWorldMaterial = new CANNON.ContactMaterial(
        christmasPenguin.body.material!,
        worldBody.material!,
        {
            friction: 10000,
            restitution: 0.1,
        }
    )
    world.addContactMaterial(penguinWorldMaterial)
        

    window.addEventListener("wheel", (e) =>
    {
        const penguinDistanceToCenterOfPlanet = christmasPenguin.object.position.distanceTo(worldPosition)
        const cameraDistanceToCenterOfPlanet = camera.position.distanceTo(worldPosition)
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

    
    const applyForce = (inputKey: string, object: Object3D, body: CANNON.Body) => {
        // Calculate the new velocity based on the direction
        const direction = new Vector3()
        const jumpVector = new Vector3().subVectors(
            object.position, worldMesh.position).normalize()
        const jumpCannonVector = new Vec3(jumpVector.x, jumpVector.y, jumpVector.z)
        if (inputKey === " ") {
            body.applyForce(jumpCannonVector.scale(3000))
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
        body.applyForce(
            new CANNON.Vec3(direction.x, direction.y, direction.z).scale(100))
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

    // Add all gameElements to world and scene
    gameElements.forEach(({ object, body }) => {
        scene.add(object)
        world.addBody(body)
    })

    // Get time related variables
    const clock = new Clock()
    const tick = () =>
    {
        const deltaTime = clock.getDelta()

        // Step the physics world
        world.step(1 / 60, deltaTime)

        // Position the game elements
        gameElements.forEach(({ object, body }) => {

            // Calculate the direction from the object to the origin
            object.position.copy(new Vector3(body.position.x, 
                body.position.y, body.position.z))

            // Apply a gravitational force to the object, pulling it towards the origin
            const direction = new Vector3().subVectors(new Vector3(0, 0, 0), object.position)
            body.applyForce(
                new CANNON.Vec3(direction.x, direction.y, direction.z),
                new CANNON.Vec3(0, 0, 0)
            )
        })

        // Get christmas game element properties
        const { object, body } = christmasPenguin

        // Rotate the penguin from the center of the earth
        const preserveZRotation = object.rotation.z
        object.lookAt(worldMesh.position.x, worldMesh.position.y, worldMesh.position.z)
        object.rotation.z = preserveZRotation
 
        // Update controls
        const newCameraVector = new Vector3().subVectors(object.position, worldMesh.position)
            .multiplyScalar(1.5).multiplyScalar(debugObject.zoom)
        camera.position.set(newCameraVector.x, newCameraVector.y, newCameraVector.z + 20)
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
        debugRenderer.update()
        renderer.render(scene, camera)
        
 
        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }
 
    tick()
})()