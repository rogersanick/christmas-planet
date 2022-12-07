import "./style.css"
import { GUI } from "dat.gui"
import { 
    TextureLoader, CubeTextureLoader, Scene, Mesh, 
    MeshStandardMaterial, sRGBEncoding, RepeatWrapping, 
    SphereGeometry, DirectionalLight, PerspectiveCamera, WebGLRenderer, 
    CineonToneMapping, PCFSoftShadowMap, Clock, MeshPhysicalMaterial, 
    BufferAttribute, AmbientLight, Vector3
} from "three"
import * as CANNON from "cannon-es"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { SAPBroadphase } from "cannon-es"

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader()
const textureLoader = new TextureLoader()
const cubeTextureLoader = new CubeTextureLoader()
 
/**
  * Base
  */
// Debug
const gui = new GUI()
const debugObject = {
    envMapIntensity: 5
}
 
// Canvas
const canvas = document.querySelector("canvas.webgl") as HTMLElement
 
// Scene
const scene = new Scene()
 
/** 
  * Physics
  */
const world = new CANNON.World()
world.broadphase = new SAPBroadphase(world)
world.gravity.set(0, 0, 0)

/**
  * Planet Christmas
  */

const worldRadius = 10
const worldPosition = new Vector3(0, 0, 0)
const worldBody = new CANNON.Body({
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
const heightTexture = textureLoader.load("/textures/Snow_003_DISP.png")
const normalTexture = textureLoader.load("/textures/Snow_003_NORM.jpg")
const ambientOcclusionTexture = textureLoader.load("/textures/Snow_003_OCC.jpg")
const roughnessTexture = textureLoader.load("/textures/Snow_003_ROUGH.jpg")
 
const worldGeometry = new SphereGeometry(10, 128)
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
 * Jess Robot
 */
const radius = 1
const position = new Vector3(0, 20, 0)
const robotMesh = new Mesh(
    new SphereGeometry(radius, 32, 32),
    new MeshStandardMaterial()
)
robotMesh.position.y = 20
scene.add(robotMesh)

const robotBody = new CANNON.Body({
    mass: 1, // the robot has a mass of 1 kg
    shape: new CANNON.Sphere(1), // the shape of the robot is a sphere with a radius of 1
    position: new CANNON.Vec3(position.x, position.y, position.z) // the position of the robot is at the origin
})
world.addBody(robotBody)

window.addEventListener("keydown", function(event) {
    switch (event.key) {
    case "ArrowUp":
        updateVelocity(new Vector3(0, 0, 1))
        break
    case "ArrowDown":
        updateVelocity(new Vector3(0, 0, -1))
        break
    case "ArrowLeft":
        updateVelocity(new Vector3(-1, 0, 0))
        break
    case "ArrowRight":
        updateVelocity(new Vector3(1, 0, 0))
        break
    }
})

const updateVelocity = (direction: Vector3) => {
    // Calculate the new velocity based on the direction
    const velocity = new CANNON.Vec3(direction.x, direction.y, direction.z)
  
    // Update the object's velocity
    robotBody.velocity = robotBody.velocity.addScaledVector(1, velocity)
}


/**
  * Lights
  */
const directionalLight = new DirectionalLight("#ffffff", 1)
directionalLight.castShadow = true
directionalLight.shadow.camera.far = 15
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
const camera = new PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(12, 8, 16)
scene.add(camera)
 
// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
 
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

    const newRobotPosition = new Vector3(robotBody.position.x, robotBody.position.y, robotBody.position.z)
    robotMesh.position.copy(newRobotPosition)

    // Calculate the direction from the object to the origin
    const direction = new Vector3().subVectors(new Vector3(0, 0, 0), robotMesh.position)

    // Apply a gravitational force to the object, pulling it towards the origin
    robotBody.applyForce(
        new CANNON.Vec3(direction.x, direction.y, direction.z),
        new CANNON.Vec3(0, 0, 0)
    )
 
    // Update controls
    controls.update()
 
    // Render
    renderer.render(scene, camera)
 
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}
 
tick()