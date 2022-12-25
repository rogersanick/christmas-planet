import "./style.css"
import { GUI } from "dat.gui"
import Stats from "stats.js"
import { 
    TextureLoader, Scene, Mesh, sRGBEncoding, SphereGeometry, 
    DirectionalLight, PerspectiveCamera, WebGLRenderer, PCFSoftShadowMap, 
    Clock, MeshPhysicalMaterial, AmbientLight, Vector3, 
    ArrowHelper, Object3D, Group, Quaternion, Box3, Spherical, 
    Vector2, Raycaster, PointLight, MeshStandardMaterial, MeshBasicMaterial, 
    PlaneGeometry, MeshPhongMaterial, Material, BufferGeometry, BufferAttribute, Line, LineBasicMaterial
} from "three"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { TGALoader } from "three/examples/jsm/loaders/TGALoader"
import ChristmasPenguin from "./christmasPenguin"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { SnowBall, throwSnowBall } from "./snowBall"
import Snow from "./snow"
import { getRapier } from "./rapier"
import RAPIER from "@dimforge/rapier3d-compat"
import GiftBox from "./giftBox"
import { RANDOM_SKY_COORDINATES, RANDOM_SPHERE_COORDINATES, RAPIER_SCALING_COEFFICIENT } from "./constants"
import ImageGallery from "./gallery"
import PhysicsEnabledObject from "./physicsEnabledObject"
import ChristmasLight from "./christmasLight"
import { GameElements } from "./types"
import { getOrnateFont, initFonts } from "./font"
import gsap from "gsap"
import getPathGeometry from "./sleighPath"
import StoryPage from "./storyPage"

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
    const objLoader = new OBJLoader()
    const tgaLoader = new TGALoader()
    const textureLoader = new TextureLoader()
    initFonts()
    
    // Debug
    const gui = new GUI()
    gui.close()
    const debugObject = {
        envMapIntensity: 5,
        penguinSpeed: 3,
        zoom: 3,
        debugPhysics: false,
        radius: 1,
        phi: 0.1,
    }
    gui.add(debugObject, "radius", 0, 10)
    gui.add(debugObject, "phi", 0, 3)
    gui.add(debugObject, "penguinSpeed", 0, 10)
    gui.add(debugObject, "zoom", 1, 3)

    /** Set up basic statistics */
    const stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    // document.body.appendChild(stats.dom)
 
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
     * Orbiting Elements
     */
    const candyCaneModel: Object3D = await new Promise((resolve, reject) => {
        gltfLoader.load("/models/candy_cane.glb", (obj) => {
            obj.scene.scale.set(5, 5, 5)
            resolve(obj.scene)
        })
    })
    const sleightMaterial: Material = await new Promise((resolve, reject) => {
        tgaLoader.load("/models/sleigh_col.tga", (texture) => {
            texture.encoding = sRGBEncoding
            const material = new MeshPhongMaterial({
                map: texture,
            })
            resolve(material)
        })
    })
    const sleighModel: Object3D = await new Promise((resolve, reject) => {
        objLoader.load("/models/sleigh.obj", (obj) => {
            obj.scale.set(0.5, 0.5, 0.5)
            obj.children.forEach(child => {
                if (child instanceof Mesh) {
                    // child.geometry.center()
                    child.material = sleightMaterial
                }
            })
            resolve(obj)
        })
    })
    scene.add(sleighModel)
    const orbitingElements = [
        {
            offset: 0.4 + Math.random() * 0.6, 
            model: candyCaneModel,
            xInversion: Math.random() > 0.5 ? 1 : -1, 
            yInversion: Math.random() > 0.5 ? 1 : -1,
            zInversion: Math.random() > 0.5 ? 1 : -1 
        },
        {
            offset: 0.4 + Math.random() * 0.6, 
            model: candyCaneModel.clone(),
            xInversion: Math.random() > 0.5 ? 1 : -1, 
            yInversion: Math.random() > 0.5 ? 1 : -1,
            zInversion: Math.random() > 0.5 ? 1 : -1 
        },
    ]
    orbitingElements.forEach((ele) => { scene.add(ele.model) })

    /** 
     * Sleigh Path
     */
    const sleighPath = getPathGeometry(1000, worldRadius * 1.5, worldRadius / 3, 32)
    // For future path rendering
    // const sleighPathMaterial = new LineBasicMaterial({ color: 0x0000ff })
    // const sleighGeo = new BufferGeometry()
    // sleighGeo.setFromPoints(sleighPath.getSpacedPoints(2000))
    // const line = new Line(sleighGeo)
    // line.material = sleighPathMaterial
    // scene.add(line)

    /**
     * Christmas Tree
     */
    const treeModel: Object3D = await new Promise((resolve) => {
        gltfLoader.load("/models/christmas_tree.glb", (obj) => {
            obj.scene.children[0].traverse(child => {
                if (child instanceof Mesh) {
                    child.position.y -= 5
                }
            })
            obj.scene.children[0].position.set(0, worldRadius + 2, 0)
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
                new ImageGallery("ai Avatars Part 1,\nan ai generated collection of avatars", 
                    position, scene, textureLoader, "lensa_pack_1", 59, "JPG")
            )
        }),

        // Lensa Pack 1 Bloopers
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("ai Avatar Bloopers Part 1,\nSome ai generated avatars that turned out... weird.", 
                    position, scene, textureLoader, "lensa_pack_1_bloopers", 41, "JPG")
            )
        }),

        // Lensa Pack 2
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("ai Avatars Part 2,\nan ai generated collection of avatars", 
                    position, scene, textureLoader, "lensa_pack_2", 119, "JPG")
            )
        }),

        // Lensa Pack 2 Bloopers
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("ai Avatars Bloopers Part 2,\nSome ai generated avatars that turned out... weird.", 
                    position, scene, textureLoader, "lensa_pack_2_bloopers", 81, "JPG")
            )
        }),

        // Santa Penguin
        createGiftBox(6, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("Santa and the Christmas penguin,\nan ai oil painting collection", 
                    position, scene, textureLoader, "santa_penguin", 32, "png")
            )
        }),

        // Jess Universal
        createGiftBox(5, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("Jess on a universal background,\na collection of ai renderings", 
                    position, scene, textureLoader, "jess_universal", 32, "png")
            )
        }),

        // Swing Private
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("Private swing Dance lessons,\na headstart to our swing dance journey", 
                    position, scene, textureLoader, "dance_private", 1, "png")
            )
        }),

        // Swing Public
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("Swing dance series,\nthe first few lessons of our swing dance journey", 
                    position, scene, textureLoader, "dance_series", 1, "png")
            )
        }),

        // Jim Audio Gift
        createGiftBox(4, (position: Vector3) => {
            imageGalleries.push(
                new ImageGallery("Audio by Jim Wolvington,\nBeautiful, thoughtful"
                + "atmosphere for Christmas Planet\nHit the 1, 2 or 3 keys to change the song", 
                position, scene, textureLoader, "jim_gift", 2, "png")
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

    let songIndex = 0
    const songs = [
        "walking_in_air",
        "home_for_christmas",
        "silent_night",
    ]

    let audioElement: HTMLElement | undefined
    const createAudioPlayer = () => {
        if (audioElement) {
            (document.getElementById("audio-player") as HTMLAudioElement).pause()
            audioElement.parentNode?.removeChild(audioElement)
            audioElement = undefined
        }
        audioElement = document.createElement("div")
        audioElement.id = "audio-player-container"
        audioElement.innerHTML = `
        <audio id="audio-player" loop controls style="display:none;">
            <source src="jim_audio/${songs[songIndex]}.m4a"></source>
        </audio>
        `
        document.body.append(audioElement);
        (document.getElementById("audio-player") as HTMLAudioElement).play()
    }

    const createGiftBoxFractionContainer = () => {
        const giftsFoundElement = document.createElement("div")
        giftsFoundElement.classList.add("gifts-found")
        giftsFoundElement.innerHTML = `
            <img class="gifts-icon" src="gift_icon.png"><img>
            <div id="gifts-fraction-container" class="gifts-fraction-container">
                <div class="gifts-fraction">
                    <sup>0</sup>&frasl;<sub>${giftBoxes.length}</sub>
                </div>
            </div>
        `
        document.body.append(giftsFoundElement)
    }

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

        if (inputKey === "1") {
            songIndex = 0
            createAudioPlayer()
        } else if (inputKey === "2") {
            songIndex = 1
            createAudioPlayer()
        } else if (inputKey === "3") {
            songIndex = 2
            createAudioPlayer()
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
                object.position, worldMesh.position).normalize().multiplyScalar(debugObject.penguinSpeed * 150)
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
            && (penguinDistanceToCenterOfPlanet < cameraDistanceToCenterOfPlanet 
                || gameFunction === viewingObject || gameFunction === introductionScreen)) {
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
        const goForwardButtons = imageGalleries.flatMap((gallery) => gallery.goForwardButton.children)
        const intersectsForward = raycaster.intersectObjects(goForwardButtons, true)
        const intersectedForwardObjectIDs = intersectsForward.map((intersect) => intersect.object.parent 
            && intersect.object.parent.id)
        const goForwardTargetGallery = imageGalleries.find(imageGallery => {
            return intersectedForwardObjectIDs.includes(imageGallery.goForwardButton.id)
        })

        if (goForwardTargetGallery) {
            goForwardTargetGallery.navigateForward()
            return
        }
        
        // Go backward buttons
        const goBackwardButtons = imageGalleries.flatMap((gallery) => gallery.goBackwardButton.children)
        const intersectsBackward = raycaster.intersectObjects(goBackwardButtons, true)
        const intersectedBackwardObjectIDs = intersectsBackward.map((intersect) => intersect.object.parent 
            && intersect.object.parent.id)
        const goBackwardTargetGallery = imageGalleries.find(imageGallery => {
            return intersectedBackwardObjectIDs.includes(imageGallery.goBackwardButton.id)
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

        if (currExitViewingMode && frameGallery) {
            console.log("exit viewing mode")
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

    const ambientLight = new AmbientLight("#ffffff", 0.5)
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
        bulbLight.castShadow = true
        const newLight = new ChristmasLight(bulbLight, scene, world)
        return newLight
    }
    
    const numChristmasLights = 6
    let colorIndex = 0
    const colors = [0xFDF4DC, 0xff0000, 0x00ff00]
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
            .applyImpulse(new RAPIER.Vector3(Math.random() * 50, Math.random() * 50, Math.random() * 50), true)
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
 
    /**
    * Renderer
    */
    const renderer = new WebGLRenderer({
        antialias: true,
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
     * Animate
    */

    // Get time related variables
    const clock = new Clock()

    // Physics, collision detection and processing queue
    const eventQueue = new RAPIER.EventQueue(true)

    // Game mode constants
    let gameFunction: () => void = () => console.log("Not Set!")

    // Viewing Target
    let targetObject: Object3D | undefined

    /**
     * PRIMARY GAME DEFINITION
     */ 
    let mainGameSetup = false
    const mainGame = () => {

        // Setup the game
        if (!mainGameSetup) {
            createGiftBoxFractionContainer()
            mainGameSetup = true
        }

        // Detect collision events
        eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            const maybeGiftBox = gameElements[handle1]
            if (maybeGiftBox && maybeGiftBox instanceof GiftBox && !maybeGiftBox.opened) {
                setTimeout(() => {
                    maybeGiftBox.openPresent()
                    adjustGiftBoxFraction()
                }, 1000)
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
        const spherical = new Spherical()
        spherical.setFromVector3(object.position)
        spherical.radius += debugObject.radius
        spherical.phi += debugObject.phi

        const newPosition = new Vector3()
            .setFromSpherical(spherical)
            .multiplyScalar(debugObject.zoom)
        camera.position.lerp(newPosition, 0.07)
        camera.lookAt(object.position)
    }

    /**
     * VIEWING SINGLE OBJECT MODE DEFINITION
     */
    const viewingObject = () => {
        targetObject?.position.lerp(new Vector3(1000,1000,1000), 0.01)
        targetObject!.lookAt(camera.position)
        targetObject?.rotateY(Math.PI)
        targetObject?.rotateX(Math.PI/2)
        camera.position.lerp(new Vector3(1000 - 10 * debugObject.zoom, 1000, 1000), 0.01)
        camera.lookAt(targetObject!.position)
    }

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
     * GAME START SCREEN DEFINITION
     */
    let gameStartScreenSetup = false
    let gameStartScreenControls: OrbitControls | undefined
    const gameStartScreen = async () => {
        if (!gameStartScreenSetup) {
            camera.position.set(worldRadius * 3, worldRadius, 0)
            camera.lookAt(0, 0, 0)
            gameStartScreenControls = new OrbitControls(camera, renderer.domElement)
            gameStartScreenControls.enableDamping = true
            gameStartScreenControls.dampingFactor = 0.05
            gameStartScreenSetup = true

            /** Introduction Messages */
            // Welcome message
            const welcomeTextMaterial = new MeshBasicMaterial({color: 0xffffff})
            const welcomeTextGeometry = new TextGeometry(
                "Planet Christmas",
                {
                    font: await getOrnateFont(),
                    size: 50,
                    height: 0.5,
                    curveSegments: 12,
                }
            )
            welcomeTextGeometry.center()
            const welcomeTextMesh = new Mesh(welcomeTextGeometry, welcomeTextMaterial)
            welcomeTextMesh.position.set(worldRadius + 10, worldRadius / 3,0)
            welcomeTextMesh.lookAt(camera.position)

            // Start Button
            const startTextMaterial = new MeshBasicMaterial({color: 0xffffff})
            const startTextGeometry = new TextGeometry(
                "Start",
                {
                    font: await getOrnateFont(),
                    size: 20,
                    height: 0.5,
                    curveSegments: 12,
                }
            )
            startTextGeometry.center()
            const startTextMesh = new Mesh(startTextGeometry, startTextMaterial)
            startTextMesh.position.set(worldRadius + 10, worldRadius / 3 -70 ,0)
            startTextMesh.lookAt(camera.position)

            scene.add(welcomeTextMesh, startTextMesh)

            const touchPlate = new Mesh(
                new PlaneGeometry(100, 50),
                new MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0})
            )
            touchPlate.position.set(startTextMesh.position.x, startTextMesh.position.y, startTextMesh.position.z)
            touchPlate.lookAt(camera.position)
            scene.add(touchPlate)

            window.addEventListener("mousemove", () => {
                    
                // Hover Raycaster
                raycaster.setFromCamera(mouse, camera)
                const intersects = raycaster.intersectObjects([startTextMesh, touchPlate])

                // Change color
                if (intersects.length > 0) {
                    startTextMaterial.color.set(0xD6001C)
                } else {
                    startTextMaterial.color.set(0xffffff)
                }
            })

            const handler = () => {
                // Click Raycaster
                raycaster.setFromCamera(mouse, camera)
                const intersects = raycaster.intersectObjects([startTextMesh, touchPlate])

                // Tear down
                if (intersects.length > 0) {
                    window.removeEventListener("mousedown", handler)
                    scene.remove(welcomeTextMesh, startTextMesh)
                    welcomeTextMesh.geometry.dispose()
                    welcomeTextMesh.material.dispose()
                    startTextMesh.geometry.dispose()
                    startTextMesh.material.dispose()
                    gameStartScreenControls?.dispose()
                    gameFunction = introductionScreen
                    gsap.to(debugObject, {zoom: 50, duration: 2})
                }
            }
            window.addEventListener("mousedown", handler)

        }
        gameStartScreenControls?.update()
    }

    /** 
     * Introduction Screen Definition
     */
    let introductionScreenSetup = false
    const introductionText = [
        "welcome to Christmas Planet",
        "This is the story of how Santa\nand the Christmas Penguin",
        "worked together to deliver the merriest\n of Christmases to all the boys and girls.",
        "But specifically to Jessica wolvington,\nwho sits at the tippy top of the nice list.",
        "not many know this, but presents are\nActually no longer made on earth.",
        "ever since remote work became the norm,\nSanta moved full time to planet Christmas.",
        "So that he could live the christmas lifestyle,\nall year round'.",
        "Santa, the Christmas Penguin, the elves\nand now You are the only ones who know this.",
        "who is the Christmas Penguin you ask",
        "well, the Christmas Penguin is a Penguin\nthat lives on Planet Christmas.",
        "And one of Santa's old drinking buddies.",
        "A really good drinking buddy.",
        "everything was going swimmingly\n...until this year.",
        "On the night before Christmas,\nall was seemingly lost.",
        "Santa had loaded up his sleigh with gifts,\nready to depart from Christmas Planet.",
        "but Then, red alert. major malfunction\nin santa's sleigh's engine.",
        "Santa was stuck in orbit\ncircling Planet Christmas.",
        "In order to break out of orbit,\nSanta needed to jettison some gifts.",
        "As the nicest person on earth, Jessica's presents\nwere at the top of Santa's Sack.",
        "so in a panic, Santa jettisoned jessica's presents\ninto the atmosphere of Christmas Planet.",
        "The presents fell to the ground\nand scattered all over the planet.",
        "Santa Shouted - Christmas Penguin, i need your help.\nI need you to find Jessica's presents.",
        "The Christmas Penguin, being the great friend\nthat he is, agreed to help Santa.",
        "but the Christmas Penguin needs your help too.",
        "use the Arrow Keys to move the Christmas Penguin\nand collect Jessica's presents.",
        "Collect presents by simply bumping into them.",
        "Their contents will then be revealed.",
        "click the revealed present to enter\nviewing mode.",
        "Once in viewing mode, click the\nrevealed presents content again to zoom out.",
        "Use two fingers on the track pad\nto zoom in and out.",
        "Your progress in collecting Jessica's\npresents will be tracked here.",
        "Once you have collected all of Jessica's presents,\nthe Christmas Penguin will deliver them.",
        "For technical support, call your husband,\nhe's on the nice list as well, but just barely.",
        "Merry Christmas and good luck.\nClick the picture to get started."
    ]
    const loader = new TextureLoader()
    const introductionChristmasStory = new StoryPage(
        introductionText, new Vector3(worldRadius * 5, 0 ,0), 
        scene, loader, "intro_story", introductionText.length, "png", 300)
    const introductionScreen = async () => {
        
        if (!introductionScreenSetup) {

            // Start playing music
            createAudioPlayer()

            // Set up complete
            introductionScreenSetup = true
            
            // Add a timeout before detecting mouse position to ensure transition
            setTimeout(() => {
                const handler = () => {

                    // Click Raycaster
                    raycaster.setFromCamera(mouse, camera)
                    const intersects = raycaster.intersectObjects(
                        [introductionChristmasStory.goForwardButton, 
                            introductionChristmasStory.goBackwardButton, introductionChristmasStory.frame])
    
                    // Tear down
                    const frameIntersected = intersects.find(intersect => 
                        intersect.object === introductionChristmasStory.frame)
                    if (frameIntersected 
                        && introductionChristmasStory.photoIndex === introductionChristmasStory.numPhotos) {
                        scene.remove(introductionChristmasStory.frameGroup)
                        introductionChristmasStory.frameGroup.children.forEach(child => {
                            if (child instanceof Mesh) {
                                child.geometry.dispose()
                                child.material.dispose()
                            } else if (child instanceof Group) {
                                child.children.forEach(grandchild => {
                                    if (grandchild instanceof Mesh) {
                                        grandchild.geometry.dispose()
                                        grandchild.material.dispose()
                                    }
                                })
                            }
                            
                        })
                        gameStartScreenControls?.dispose()
                        window.removeEventListener("mousedown", handler)
                        gameFunction = mainGame
                        gsap.to(debugObject, {zoom: 1.1, duration: 1})
                    }
    
                    // Go Forward
                    const goForwardButtons = introductionChristmasStory.goForwardButton.children
                    const intersectsForward = raycaster.intersectObjects(goForwardButtons, true)
                    const intersectedForwardObjectIDs = intersectsForward.map((intersect) => intersect.object.parent 
                        && intersect.object.parent.id)
                
    
                    if (intersectedForwardObjectIDs.includes(introductionChristmasStory.goForwardButton.id)) {
                        introductionChristmasStory.navigateForward()
                        return
                    }
            
                    // Go Backward
                    const goBackwardButtons = introductionChristmasStory.goBackwardButton.children
                    const intersectsBackward = raycaster.intersectObjects(goBackwardButtons, true)
                    const intersectedBackwardObjectIDs = intersectsBackward.map((intersect) => intersect.object.parent 
                && intersect.object.parent.id)
    
                    if (intersectedBackwardObjectIDs.includes(introductionChristmasStory.goBackwardButton.id)) {
                        introductionChristmasStory.navigateBackward()
                        return
                    }
                }
                window.addEventListener("mousedown", handler)
            }, 2050)

        }

        // Set positions and rotations
        introductionChristmasStory.frameGroup.position.lerp(new Vector3(1000,1000,1000), 0.01)
        introductionChristmasStory.frameGroup.lookAt(camera.position)
        introductionChristmasStory.frameGroup.rotateY(Math.PI)
        introductionChristmasStory.frameGroup.rotateX(Math.PI/2)
        camera.position.lerp(new Vector3(1000 - 11 * debugObject.zoom, 1000, 1000), 0.01)
        camera.lookAt(introductionChristmasStory.frameGroup.position)
    }


    gameFunction = gameStartScreen
    
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

        /** Orbiting Elements */ 
        orbitingElements.forEach(({model, offset, xInversion, yInversion, zInversion}) => {
            model.position.set(
                xInversion * Math.cos(clock.elapsedTime * offset) * worldRadius * 1.1,
                yInversion * Math.sin(clock.elapsedTime * offset) * worldRadius * 1.1,
                zInversion * Math.sin(clock.elapsedTime * offset) * worldRadius * 1.1
            )
            model.lookAt(worldMesh.position)
            model.rotateY(Math.PI)
            model.rotateX(Math.PI / 2)
        })
        
        /** Santa Sleigh */
        const sleighPosition = sleighPath.getPoint(time * 0.05)
        sleighModel.position.lerp(
            sleighPosition, 0.5
        )
        sleighModel.lookAt(sleighPath.getPoint((time + 0.01) * 0.05))

 
        // Render
        renderer.render(scene, camera)        
 
        // Call tick again on the next frame
        stats.end()
        window.requestAnimationFrame(tick)
    }
 
    tick()
})()