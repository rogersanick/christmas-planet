import "./style.css"
import { GUI } from "dat.gui"
import { 
    TextureLoader, CubeTextureLoader, Scene, Mesh, 
    MeshStandardMaterial, sRGBEncoding, RepeatWrapping, 
    SphereGeometry, DirectionalLight, PerspectiveCamera, WebGLRenderer, 
    CineonToneMapping, PCFSoftShadowMap, Clock 
} from "three"
import * as CANNON from "cannon-es"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

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
  * Update all materials
  */
const updateAllMaterials = () =>
{
    scene.traverse((child) =>
    {
        if(child instanceof Mesh && child.material instanceof MeshStandardMaterial)
        {
            // child.material.envMap = environmentMap
            child.material.envMapIntensity = debugObject.envMapIntensity
            child.material.needsUpdate = true
            child.castShadow = true
            child.receiveShadow = true
        }
    })
}
 
/**
  * Environment map
  */
const environmentMap = cubeTextureLoader.load([
    "/textures/environmentMap/px.jpg",
    "/textures/environmentMap/nx.jpg",
    "/textures/environmentMap/py.jpg",
    "/textures/environmentMap/ny.jpg",
    "/textures/environmentMap/pz.jpg",
    "/textures/environmentMap/nz.jpg"
])
 
environmentMap.encoding = sRGBEncoding
scene.environment = environmentMap
 
debugObject.envMapIntensity = 0.4
gui.add(debugObject, "envMapIntensity").min(0).max(4).step(0.001).onChange(updateAllMaterials)
 
/** 
  * Physics
  */
const worldPhysics = new CANNON.World()
worldPhysics.gravity.set(0, 0, 0)

/**
  * Planet Christmas
  */

const worldBody = new CANNON.Body({
    mass: 1, // the planet has a mass of 1 kg
    shape: new CANNON.Sphere(10), // the shape of the planet is a sphere with a radius of 10
    position: new CANNON.Vec3(0, 0, 0), // the position of the planet is at the origin
    quaternion: new CANNON.Quaternion() // the orientation of the planet is default (i.e. no rotation)
})

const worldColorTexture = textureLoader.load("textures/dirt/color.jpg")
worldColorTexture.encoding = sRGBEncoding
worldColorTexture.repeat.set(1.5, 1.5)
worldColorTexture.wrapS = RepeatWrapping
worldColorTexture.wrapT = RepeatWrapping
 
const worldNormalTexture = textureLoader.load("textures/dirt/normal.jpg")
worldNormalTexture.repeat.set(1.5, 1.5)
worldNormalTexture.wrapS = RepeatWrapping
worldNormalTexture.wrapT = RepeatWrapping
 
const worldGeometry = new SphereGeometry(5, 64)
const worldMaterial = new MeshStandardMaterial({
    map: worldColorTexture,
    normalMap: worldNormalTexture
})
const world = new Mesh(worldGeometry, worldMaterial)
world.rotation.x = - Math.PI * 0.5
scene.add(world)
 
/**
  * Lights
  */
const directionalLight = new DirectionalLight("#ffffff", 4)
directionalLight.castShadow = true
directionalLight.shadow.camera.far = 15
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.normalBias = 0.05
directionalLight.position.set(3.5, 2, - 1.25)
scene.add(directionalLight)
 
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
renderer.toneMapping = CineonToneMapping
renderer.toneMappingExposure = 1.75
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap
renderer.setClearColor("#211d20")
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
 
/**
  * Animate
  */
const clock = new Clock()
 
const tick = () =>
{
    const deltaTime = clock.getDelta()
 
    // Update controls
    controls.update()
 
    // Render
    renderer.render(scene, camera)
 
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}
 
tick()