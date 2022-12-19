import "./style.css"
import { GUI } from "dat.gui"
import Stats from "stats.js"
import { 
    TextureLoader, Scene, Mesh, sRGBEncoding, SphereGeometry, 
    DirectionalLight, PerspectiveCamera, WebGLRenderer, PCFSoftShadowMap, 
    Clock, MeshPhysicalMaterial, BufferAttribute, AmbientLight, Vector3, 
    ArrowHelper, Object3D, Group, Quaternion, Box3, Spherical, 
    Vector2, Raycaster, PointLight, MeshStandardMaterial, MeshMatcapMaterial, MeshBasicMaterial
} from "three"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader"
import ChristmasPenguin from "./christmasPenguin"
import { SnowBall, throwSnowBall } from "./snowBall"
import Snow from "./snow"
import { getRapier } from "./rapier"
import RAPIER from "@dimforge/rapier3d-compat"
import GiftBox from "./giftBox"
import { RANDOM_SKY_COORDINATES, RANDOM_SPHERE_COORDINATES, RAPIER_SCALING_COEFFICIENT } from "./constants"
import ImageGallery from "./gallery"
import PhysicsEnabledObject from "./physicsEnabledObject"
import ChristmasLight from "./christmasLight"

// PRIORITIZED TODO
// TODO: Add Jim's presents + audio
// TODO: Fix Penguin controls
// TODO: Adjust camera scrolling
// TODO: Enable snowball throwing
// TODO: Simple bad guys

// Enable Async
(async () => {

    /** Initialize and setup */
    const RAPIER = await getRapier()

    // Loaders
    const gltfLoader = new GLTFLoader()
    const textureLoader = new TextureLoader()
    const fontLoader = new FontLoader()

    // Load Font
    const font = await new Promise<Font>((resolve, reject) => {
        fontLoader.load(
            "/fonts/ornamental_versals_regular.json",
            (font) => resolve(font),
            undefined,
            (error) => reject(error)
        )
    })
    
    // Debug
    const gui = new GUI()
    const debugObject = {
        envMapIntensity: 5,
        penguinSpeed: 5,
        zoom: 3,
        debugPhysics: false,
        radius: 1,
        phi: 0.05
    }
    gui.add(debugObject, "radius", 0, 10)
    gui.add(debugObject, "phi", 0, 3)
    gui.add(debugObject, "penguinSpeed", 0, 10)
    gui.add(debugObject, "zoom", 1, 3)

    /** Set up basic statistics */
    const stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom)
 
    // Canvaswa
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
    type GameElements = { [colliderHandle: number]: GameElement }
    type GameElement = { 
        collider: RAPIER.Collider, 
        body: RAPIER.RigidBody, 
        object: Object3D, 
        shouldRotate: boolean
        scene: Scene,
        world: RAPIER.World
    }
    const gameElements: GameElements = {}
    
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
    const worldRadius = 400
    const worldRigidBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setCanSleep(true)
    )
    world.createCollider(RAPIER.ColliderDesc.ball(worldRadius / RAPIER_SCALING_COEFFICIENT)
        .setDensity(1)
        .setRestitution(0.4), worldRigidBody)

    const colorTexture = textureLoader.load("/textures/angele-kamp-g8IEMx8p_z8-unsplash.jpg")
    colorTexture.encoding = sRGBEncoding
    colorTexture.repeat.set(0.5, 0.8)
    const normalTexture = textureLoader.load("/textures/Snow_003_NORM.jpg")
    const ambientOcclusionTexture = textureLoader.load("/textures/Snow_003_OCC.jpg")
    const roughnessTexture = textureLoader.load("/textures/Snow_003_ROUGH.jpg")
 
    const worldGeometry = new SphereGeometry(worldRadius, 1024)
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
    worldMesh.receiveShadow = true
    scene.add(worldMesh)
 
    /**
     * Christmas Tree
     */
    const treeModel: Object3D = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/christmas_tree.glb", (obj) => {
            obj.scene.children[0].traverse(child => {
                if (child instanceof Mesh) {
                    child.position.y -= 5
                }
            })
            resolve(obj.scene.children[0])
        })
    })

    // Create a gift box
    const createTree = (scale: number) => {
        const modelSize = new Box3().setFromObject(treeModel)
        const size = modelSize.getSize(new Vector3())
        const tree = new PhysicsEnabledObject(
            treeModel.clone(), scene, world, size.clone().multiplyScalar(scale))
        tree.object.scale.setScalar(scale)
        gameElements[tree.collider.handle] = tree
        return tree
    }
    const northPoleTree = createTree(3)
    northPoleTree.setPosition(new Vector3(0, worldRadius + 2, 0))

    /** Welcome Message */
        
    // Material
    const material = new MeshBasicMaterial({color: 0xffffff})
        
    // Text
    const textGeometry = new TextGeometry(
        "Christmas Planet",
        {
            font: font,
            size: 50,
            height: 0.5,
            curveSegments: 12,
        }
    )
    textGeometry.center()
    const text = new Mesh(textGeometry, material)
    text.position.set(worldRadius + 10, 0 ,0)
    scene.add(text)

    /** Gifts */
    const giftModel: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/gift_box.gltf", (obj) => {
            obj.scene.traverse( function( node ) {
                node.castShadow = true 
                node.translateY(-1.4)
            })
            resolve(obj.scene)
        })
    })

    // Create a gift box
    const createGiftBox = (scale: number, present: (position: Vector3) => void) => {
        const modelSize = new Box3().setFromObject(giftModel)
        const size = modelSize.getSize(new Vector3())
        const giftBox = new GiftBox(giftModel.clone(), scene, world, size.clone().multiplyScalar(scale), present)
        giftBox.object.scale.setScalar(scale)
        gameElements[giftBox.collider.handle] = giftBox
        return giftBox
    }

    // Image Gallery Gifts
    const imageGalleries: ImageGallery[] = []
    const giftBoxes: GiftBox[] = [
        // Lensa Pack 1
        createGiftBox(5, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery(position, scene, textureLoader, "lensa_pack_1", 100, "JPG")
            )
        }),

        // Lensa Pack 2
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery(position, scene, textureLoader, "lensa_pack_2", 200, "JPG")
            )
        }),

        // Santa Penguin
        createGiftBox(6, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery(position, scene, textureLoader, "santa_penguin", 32, "png")
            )
        }),

        // Jess Universal
        createGiftBox(5, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery(position, scene, textureLoader, "jess_universal", 32, "png")
            )
        }),

        // Swing Private
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery(position, scene, textureLoader, "dance_private", 1, "png")
            )
        }),

        // Swing Public
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery(position, scene, textureLoader, "dance_series", 1, "png")
            )
        })
    ]
    giftBoxes.forEach((giftBox, index) => {
        giftBox.setPosition(new Vector3(
            RANDOM_SPHERE_COORDINATES[index][0],
            RANDOM_SPHERE_COORDINATES[index][1],
            RANDOM_SPHERE_COORDINATES[index][2]
        ))
    })

    const adjustGiftBoxFraction = () => {
        const fractionContainer = document.getElementById("gifts-fraction-container")
        const giftsOpened = giftBoxes.reduce((acc, curr) => {
            if (curr.opened) {
                return acc + 1
            } else {
                return acc
            }
        }, 0)
        fractionContainer!.innerHTML = `
            <div class="gifts-fraction">
                <sup>${giftsOpened}</sup>&frasl;<sub>${giftBoxes.length}</sub>
            </div>
        `
    }
    adjustGiftBoxFraction()

    /**
    * Penguin
    */
    const christmasPenguinModel: Group = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/christmas_penguin_glTF.glb", (gltf) => {
            gltf.scene.traverse( function( node ) {
                node.castShadow = true
            })
            gltf.scene.scale.set(2.5, 2.5, 2.5)
            gltf.scene.children[0].rotateX(-Math.PI/2)
            gltf.scene.children[0].rotateY(-Math.PI/2)
            resolve(gltf.scene)
        })
    })
    const christmasPenguin = new ChristmasPenguin(christmasPenguinModel, scene, world)
    christmasPenguin.setPosition(new Vector3(worldRadius + 2, 0, 0))
    gameElements[christmasPenguin.collider.handle] = christmasPenguin

    let moveForward = false
    let moveBackward = false
    let moveLeft = false
    let moveRight = false
    let jump = true
    window.addEventListener("keydown", function(event) {
        if (event.shiftKey) {
            // Create and add a snowball
            const snowBallPosition = christmasPenguin.object.position.clone()
            snowBallPosition.y += 5
            const snowBall = new SnowBall(scene, world)
            snowBall.setPosition(snowBallPosition)
            gameElements[snowBall.collider.handle] = snowBall
            scene.add(snowBall.object)

            // Determine the snowball direction and throw
            const snowBallDirection = new Vector3()
            christmasPenguin.object.getWorldDirection(snowBallDirection)
            visualize(new Vector3().applyQuaternion(christmasPenguin.object.quaternion), christmasPenguin.object)
            snowBallDirection.multiplyScalar(100)
            throwSnowBall(snowBall, new RAPIER.Vector3(snowBallDirection.x, snowBallDirection.y, snowBallDirection.z))

            // Cleanup after two seconds
            setTimeout(() => {
                snowBall.removeSelfFromGame()
            }, 2000)
        }

        const inputKey = event.key
        if (inputKey === "ArrowUp" || inputKey === "w") {
            moveForward = true
        } else if (inputKey === "ArrowDown" || inputKey === "s") {
            moveBackward = true
        } else if (inputKey === "ArrowLeft" || inputKey === "a") {
            moveLeft = true
        } else if (inputKey === "ArrowRight" || inputKey === "d") {
            moveRight = true
        } else if (inputKey === " ") {
            jump = true
        }
    })

    window.addEventListener("keyup", function(event) {
        const inputKey = event.key
        if (inputKey === "ArrowUp" || inputKey === "w") {
            moveForward = false
        } else if (inputKey === "ArrowDown" || inputKey === "s") {
            moveBackward = false
        } else if (inputKey === "ArrowLeft" || inputKey === "a") {
            moveLeft = false
        } else if (inputKey === "ArrowRight" || inputKey === "d") {
            moveRight = false
        }
    })

    let jumpCount = 0
    const applyForce = (object: Object3D, body: RAPIER.RigidBody) => {
        // Calculate the new velocity based on the direction
        if (jump && jumpCount < 2) {
            jumpCount++
            const jumpVector = new Vector3().subVectors(
                object.position, worldMesh.position).normalize().multiplyScalar(debugObject.penguinSpeed * 90)
            const jumpCannonVector = new RAPIER.Vector3(jumpVector.x, jumpVector.y, jumpVector.z)
            body.applyImpulse(jumpCannonVector, true)
            jump = false
            setTimeout(() => {
                jumpCount--
            }, 1000)
        } 
        
        if (moveForward) {
            const direction = new Vector3()
            direction.subVectors(
                object.position, 
                camera.position.clone().divideScalar(debugObject.zoom)
            ).normalize()

            // Update the object's velocity
            direction.multiplyScalar(debugObject.penguinSpeed)
            body.applyImpulse(new RAPIER.Vector3(direction.x, direction.y, direction.z), true)
        } 
        
        if (moveBackward) {
            const direction = new Vector3()
            direction.subVectors(
                camera.position.clone().divideScalar(debugObject.zoom), 
                object.position
            ).normalize()

            // Update the object's velocity
            direction.multiplyScalar(debugObject.penguinSpeed)
            body.applyImpulse(new RAPIER.Vector3(direction.x, direction.y, direction.z), true)
        }
        
        if (moveLeft) {
            const direction = new Vector3()
            direction.subVectors(
                object.position, 
                camera.position.clone().divideScalar(debugObject.zoom)
            ).normalize()
            const axis = new Vector3(0, 1, 0).projectOnPlane(direction)
            direction.applyAxisAngle(axis, Math.PI / 2)

            // Update the object's velocity
            direction.multiplyScalar(debugObject.penguinSpeed)
            body.applyImpulse(new RAPIER.Vector3(direction.x, direction.y, direction.z), true)
        }
        
        if (moveRight) {
            const direction = new Vector3()
            direction.subVectors(
                object.position, 
                camera.position.clone().divideScalar(debugObject.zoom)
            ).normalize()
            const axis = new Vector3(0, 1, 0).projectOnPlane(direction)
            direction.applyAxisAngle(axis, -Math.PI / 2)

            // Update the object's velocity
            direction.multiplyScalar(debugObject.penguinSpeed)
            body.applyImpulse(new RAPIER.Vector3(direction.x, direction.y, direction.z), true)
        }
    }
        

    window.addEventListener("wheel", (e) =>
    {
        const penguinDistanceToCenterOfPlanet = christmasPenguin.object.position.distanceTo(worldMesh.position)
        const cameraDistanceToCenterOfPlanet = camera.position.distanceTo(worldMesh.position)
        if (debugObject.zoom < 100 
            && (penguinDistanceToCenterOfPlanet < cameraDistanceToCenterOfPlanet || gameFunction === viewingObject)) {
            debugObject.zoom += e.deltaY * 0.0003
            gui.updateDisplay()
        } else if (e.deltaY > 0) {
            debugObject.zoom += e.deltaY * 0.0003
            gui.updateDisplay()
        }
    })

    /**
    * Mouse Input and Raycasting
    */
    let prevX: number | null = 0
    const mouse = new Vector2()
    const raycaster = new Raycaster()
    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX / sizes.width * 2 - 1
        mouse.y = - (e.clientY / sizes.height) * 2 + 1
        if (prevX == null) {
            prevX = e.clientX
        } else if (prevX < e.clientX) {
            christmasPenguin.object.rotateZ((e.clientX - prevX) * 0.01)
            prevX = e.clientX
        } else if (prevX > e.clientX) {
            christmasPenguin.object.rotateZ((e.clientX - prevX) * 0.01)
            prevX = e.clientX
        }
    })

    window.addEventListener("mousedown", () => {

        // Click Raycaster
        raycaster.setFromCamera(mouse, camera)

        // Go forward buttons
        const goForwardButtons = imageGalleries.map((gallery) => gallery.goForwardButton)
        const intersectsForward = raycaster.intersectObjects(goForwardButtons, true)
        const intersectedForwardObjectIDs = intersectsForward.map((intersect) => intersect.object.id)
        const goForwardTargetGallery = imageGalleries.find(imageGallery => {
            return imageGallery.frameGroup.children.find(ele => intersectedForwardObjectIDs.includes(ele.id) )
        })

        if (goForwardTargetGallery) {
            goForwardTargetGallery.navigateForward()
            return
        }
        
        // Go backward buttons
        const goBackwardButtons = imageGalleries.map((gallery) => gallery.goBackwardButton)
        const intersectsBackward = raycaster.intersectObjects(goBackwardButtons, true)
        const intersectedBackwardObjectIDs = intersectsBackward.map((intersect) => intersect.object.id)
        const goBackwardTargetGallery = imageGalleries.find(imageGallery => {
            return imageGallery.frameGroup.children.find(ele => intersectedBackwardObjectIDs.includes(ele.id) )
        })

        if (goBackwardTargetGallery) {
            goBackwardTargetGallery.navigateBackward()
            return
        }
        
        // Frames themselves
        const frames = imageGalleries.map((gallery) => gallery.frame)
        const intersectsFrame = raycaster.intersectObjects(frames, true)
        const intersectedFrameObjectIDs = intersectsFrame.map((intersect) => intersect.object.id)
        const frameGallery = imageGalleries.find(imageGallery => {
            return imageGallery.frameGroup.children.find(ele => intersectedFrameObjectIDs.includes(ele.id) )
        })
        if (currExitViewingMode) {
            currExitViewingMode()
        } else if (frameGallery) {
            enterViewingMode(frameGallery.frameGroup)
        }
    })

    /**
    * Light
    */
    const directionalLight = new DirectionalLight("#ffffff", 0.5)
    directionalLight.position.set(3.5, 2, - 1.25)
    scene.add(directionalLight)

    const ambientLight = new AmbientLight("#ffffff", 0.4)
    scene.add(ambientLight)

    const christmasLights: ChristmasLight[] = []
    const bulbGeometry = new SphereGeometry( 0.02, 8, 8 )
    const bulbMat = new MeshStandardMaterial( {
        emissive: 0xf8edd4,
        emissiveIntensity: 10,
        color: 0x000000
    })
    const makeChristmasLight = (color: number) => {
        const bulbLight = new PointLight( color, 50, 100, 0.6 )
        bulbLight.add( new Mesh( bulbGeometry, bulbMat ) )
        bulbLight.position.set(10, worldRadius + 10, 5)
        bulbLight.castShadow = true
        const newLight = new ChristmasLight(bulbLight, scene, world)
        return newLight
    }
    
    const numChristmasLights = 6
    let colorIndex = 0
    const colors = [0xff0000, 0x00ff00, 0xFDF4DC]
    for (let i = 0; i < numChristmasLights; i++) {
        if (colorIndex < colors.length - 1) {
            colorIndex++
        } else {
            colorIndex = 0
        }
        christmasLights.push(makeChristmasLight(colors[colorIndex]).setPosition(RANDOM_SKY_COORDINATES[i]))
    }
    christmasLights.forEach(ele => {
        gameElements[ele.collider.handle] = ele
    })
    setInterval(() => {
        christmasLights[Math.floor(Math.random() * christmasLights.length)].body
            .applyImpulse(new RAPIER.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100), true)
    }, 2000)
 
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
    const camera = new PerspectiveCamera(50, sizes.width / sizes.height, 0.1)
    const newCameraPosition = new Vector3(
        christmasPenguin.object.position.x,
        christmasPenguin.object.position.y,
        christmasPenguin.object.position.z
    ).multiplyScalar(1.2)
    camera.position.set(newCameraPosition.x, newCameraPosition.y, newCameraPosition.z + 20)
    scene.add(camera)
    text.lookAt(camera.position)
    text.rotateY(Math.PI)
 
    /**
    * Renderer
    */
    const renderer = new WebGLRenderer({
        canvas: canvas,
    })

    renderer.physicallyCorrectLights = true
    renderer.outputEncoding = sRGBEncoding
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Add all game element threejs objects to the scene
    Object.values(gameElements).forEach(({ object }) => {
        scene.add(object)
    })

    /** 
     * Enter viewing mode
     */
    let currExitViewingMode: (() => void) | undefined
    const enterViewingMode = (object: Object3D) => {
        gameFunction = viewingObject
        targetObject = object
        const oldPosition = object.position.clone()
        const oldRotation = object.quaternion.clone()
        const oldZoom = debugObject.zoom
        debugObject.zoom = 2
        currExitViewingMode = () => {
            exitViewingMode(object, oldPosition, oldRotation, oldZoom)
        }
    }

    /** 
     * Exit Viewing Mode 
     */
    const exitViewingMode = (
        object: Object3D, 
        targetObjectOriginalPosition: Vector3, 
        targetObjectOriginalRotation: Quaternion,
        oldZoom: number
    ) => {
        const { x, y, z} = targetObjectOriginalPosition
        object.position.set(x, y, z)
        object.rotation.setFromQuaternion(targetObjectOriginalRotation)
        targetObject = undefined
        currExitViewingMode = undefined
        debugObject.zoom = oldZoom
        gameFunction = mainGame
    }

    /**
     * Animate
    */

    // Get time related variables
    const clock = new Clock()
    const waddleClockwise = true

    // Physics, collision detection and processing queue
    const eventQueue = new RAPIER.EventQueue(true)

    // Game mode constants
    let gameFunction: () => void = () => console.log("Not Set!")

    // Viewing Target
    let targetObject: Object3D | undefined

    // Main game definition
    const spherical = new Spherical()
    const mainGame = () => {
        // Detect collision events
        eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            const maybeGiftBox = gameElements[handle1]
            if (maybeGiftBox && maybeGiftBox instanceof GiftBox && !maybeGiftBox.opened) {
                maybeGiftBox.openPresent()
                adjustGiftBoxFraction()
            }
        })

        // Position the game elements
        for (const key in gameElements) {
            const { object, body, shouldRotate } = gameElements[key]
            
            // Calculate the direction from the object to the origin
            if (!body.isSleeping()) {
                const bodyPosition = body.translation()
                object.position.set(
                    bodyPosition.x * RAPIER_SCALING_COEFFICIENT,
                    bodyPosition.y * RAPIER_SCALING_COEFFICIENT,
                    bodyPosition.z * RAPIER_SCALING_COEFFICIENT
                )
     
                // If they should rotate, rotate them
                if (shouldRotate) {
                    const { x, y, z, w } = body.rotation()
                    object.quaternion.x = x
                    object.quaternion.y = y
                    object.quaternion.z = z
                    object.quaternion.w = w
                }
            }
 
            // Apply a gravitational force to the object, pulling it towards the origin
            const direction = new Vector3(0, 0, 0).sub(object.position).normalize()
            direction.multiplyScalar(9.81)
            body.applyImpulse(new RAPIER.Vector3(direction.x, direction.y, direction.z), true)
        }        

        // Move the christmas penguin
        const { object } = christmasPenguin
        applyForce(christmasPenguin.object, christmasPenguin.body)

        // Rotate the penguin from the center of the earth
        const preserveZRotation = object.rotation.z
        object.lookAt(worldMesh.position.x, worldMesh.position.y, worldMesh.position.z)
        object.rotation.z = preserveZRotation

        // Waddle the penguin if it's moving
        // TODO: Implement a better waddle

        /** Move the camera relative to the penguin */
        spherical.setFromVector3(object.position)
        spherical.radius += debugObject.radius
        spherical.phi += debugObject.phi
        camera.position.setFromSpherical(spherical)
        camera.position.multiplyScalar(debugObject.zoom)
        camera.lookAt(object.position)
    }

    // Viewing mode definition
    const viewingObject = () => {
        targetObject?.position.lerp(new Vector3(10 * debugObject.zoom,0,0), 0.01)
        targetObject!.lookAt(camera.position)
        targetObject?.rotateX(Math.PI/2)
        camera.position.lerp(new Vector3(0,0,0), 0.01)
        camera.lookAt(targetObject!.position)
    }

    gameFunction = mainGame
    
    const tick = () =>
    {
        stats.begin()
        const time = clock.getElapsedTime()

        // Step the physics world
        world.step(eventQueue)

        // Apply the current game logic
        gameFunction()

        // Snow
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
        stats.end()
        console.log("Number of Triangles :", renderer.info.render.triangles)
        window.requestAnimationFrame(tick)
    }
 
    tick()
})()