import "./style.css"
import { GUI } from "dat.gui"
import { 
    TextureLoader, CubeTextureLoader, Scene, Mesh, 
    MeshStandardMaterial, sRGBEncoding, RepeatWrapping, 
    SphereGeometry, DirectionalLight, PerspectiveCamera, WebGLRenderer, 
    CineonToneMapping, PCFSoftShadowMap, Clock, MeshPhysicalMaterial, 
    BufferAttribute, AmbientLight, Vector3, ArrowHelper, Quaternion, Vector, Object3D, Group, Euler
} from "three"
import * as CANNON from "cannon-es"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { SAPBroadphase, Vec3 } from "cannon-es"

// TODO: Fix camera rotation
// TODO: Fix penguin rotation (less urgent)
// TODO: Enable snowball throwing
// TODO: Simple bad guys

// Enable Async
(async () => {
    /**
   * Loaders
   */
    const gltfLoader = new GLTFLoader()
    const textureLoader = new TextureLoader()
 
    /**
    * Base
    */
    // Debug
    const gui = new GUI()
    const debugObject = {
        envMapIntensity: 5,
        penguinSpeed: 20
    }

    gui.add(debugObject, "penguinSpeed", 0, 100)
 
    // Canvas
    const canvas = document.querySelector("canvas.webgl") as HTMLElement
 
    // Scene
    const scene = new Scene()

    // Vector visualization
    const visualize = (vector: Vector3, object: Object3D) => {
        const arrowHelper = new ArrowHelper(vector, object.position, 2, 0xff0000)
        scene.add(arrowHelper)
        setTimeout(() => {
            scene.remove(arrowHelper)
        }, 1000)
    }
    
 
    /** 
    * Physics
    */
    const world = new CANNON.World()
    world.broadphase = new SAPBroadphase(world)
    world.gravity.set(0, 0, 0)

    /**
    * Planet Christmas
    */
    const worldBodyMaterial = new CANNON.Material("ground")
    const worldRadius = 100
    const worldPosition = new Vector3(0, 0, 0)
    const worldBody = new CANNON.Body({
        material: worldBodyMaterial,
        mass: 0, // the planet has a mass of 1 kg
        shape: new CANNON.Sphere(worldRadius), // the shape of the planet is a sphere with a radius of 10
        position: new CANNON.Vec3(
            worldPosition.x, worldPosition.y, worldPosition.z), // the position of the planet is at the origin
        quaternion: new CANNON.Quaternion() // the orientation of the planet is default (i.e. no rotation)
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
    const christmasPenguin: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/christmas_penguin_glTF.glb", (gltf) => {
            resolve(gltf.scene)
            console.log(gltf.scene)
            gltf.scene.scale.set(2,2,2)
        })
    })
    scene.add(christmasPenguin)

    const radius = 1
    const initialPenguinPosition = new Vector3(0, worldRadius + 5, 0)
    scene.add(christmasPenguin)

    const christmasPenguinBody = new CANNON.Body({
        mass: 1, // the robot has a mass of 1 kg
        shape: new CANNON.Sphere(radius), // the shape of the robot is a sphere with a radius of 1
        position: new CANNON.Vec3(initialPenguinPosition.x, 
            initialPenguinPosition.y, initialPenguinPosition.z) // the position of the robot is at the origin
    })
    world.addBody(christmasPenguinBody)
    christmasPenguin.position.set(initialPenguinPosition.x, initialPenguinPosition.y, initialPenguinPosition.z)

    window.addEventListener("keydown", function(event) {
        applyForce(event.key, christmasPenguin)
    })

    const applyForce = (inputKey: string, object: Object3D) => {
        // Calculate the new velocity based on the direction
        const direction = new Vector3()
        if (inputKey === " ") {
            const jumpVector = new Vector3().subVectors(
                christmasPenguin.position, worldMesh.position).normalize()
            const jumpCannonVector = new Vec3(jumpVector.x, jumpVector.y, jumpVector.z)
            christmasPenguinBody.velocity = jumpCannonVector.scale(50)
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

        visualize(direction, object)

        // christmasPenguin.children[0].rotation.y = (christmasPenguin.children[0].rotation.y + direction.y) / 2

        // Update the object's velocity
        christmasPenguinBody.applyForce(
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
    camera.position.set(christmasPenguinBody.position.x, 
        christmasPenguinBody.position.y + 20, christmasPenguinBody.position.z + 20)
    camera.lookAt(christmasPenguin.position)
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
    // renderer.setClearColor("#211d20")
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
 
    /**
  * Animate
  */
    const clock = new Clock()
 
    const tick = () =>
    {
        const deltaTime = clock.getDelta()

        // Step the physics world
        world.step(1 / 60, deltaTime, 3)

        // Update the position of the planet and ball based on their physics bodies
        const newWorldPosition = new Vector3(worldBody.position.x, worldBody.position.y, worldBody.position.z)
        worldMesh.position.copy(newWorldPosition)

        // Position the christmas penguin
        const penguinDelta = new Vector3()
            .subVectors(christmasPenguin.position, 
                new Vector3(christmasPenguinBody.position.x, 
                    christmasPenguinBody.position.y, christmasPenguinBody.position.z))
        christmasPenguin.position.copy(new Vector3(christmasPenguinBody.position.x, 
            christmasPenguinBody.position.y, christmasPenguinBody.position.z))
        
        // Rotate the penguin from the center of the earth
        christmasPenguin.lookAt(worldMesh.position)
        christmasPenguin.rotateX(-Math.PI / 2)

        // Calculate the direction from the object to the origin
        const direction = new Vector3().subVectors(new Vector3(0, 0, 0), christmasPenguin.position)

        // Apply a gravitational force to the object, pulling it towards the origin
        christmasPenguinBody.applyForce(
            new CANNON.Vec3(direction.x, direction.y, direction.z),
            new CANNON.Vec3(0, 0, 0)
        )
 
        // Update controls
        const jumpVector = new Vector3().subVectors(
            christmasPenguin.position, worldMesh.position).normalize()
        camera.position.addScaledVector(penguinDelta.negate(), 1)
 
        // Render
        renderer.render(scene, camera)
 
        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }
 
    tick()
})()