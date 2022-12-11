import { 
    AdditiveBlending, BufferGeometry, Float32BufferAttribute, Points, 
    PointsMaterial, TextureLoader
} from "three"

class Snow {

    parameters: any[]
    materials: PointsMaterial[]
    particleSystems: Points[]

    constructor() {
    // Load the texture that will be used to display our snow
        const textureLoader = new TextureLoader()
  
        const sprite1 = textureLoader.load(
            "/textures/sprites/snowflake1.png"
        )
        const sprite2 = textureLoader.load(
            "/textures/sprites/snowflake2.png"
        )
        const sprite3 = textureLoader.load(
            "/textures/sprites/snowflake3.png"
        )
        const sprite4 = textureLoader.load(
            "/textures/sprites/snowflake4.png"
        )
        const sprite5 = textureLoader.load(
            "/textures/sprites/snowflake5.png"
        )
  
        // Create the geometry that will hold all our vertices
        const geometry = new BufferGeometry()
        const vertices = []
        const particleSystems = []
  
        // create the vertices and add store them in our vertices array
        for (let i = 0; i < 10000; i++) {
            const x = Math.random() * 800 // generate random number between -1000 to 1000
            const y = Math.random() * 800
            const z = Math.random() * 800
            vertices.push(x, y, z)
        }
  
        // Add the vertices stored in our array to set
        // the position attribute of our geometry.
        // Position attribute will be read by threejs
        geometry.setAttribute(
            "position",
            new Float32BufferAttribute(vertices, 3)
        )
  
        this.parameters = [
            [[1.0, 0.2, 0.5], sprite2, 20],
            [[0.95, 0.2, 0.5], sprite3, 15],
            [[0.9, 0.2, 0.5], sprite1, 10],
            [[0.85, 0.2, 0.5], sprite5, 8],
            [[0.8, 0.2, 0.5], sprite4, 5],
        ]
  
        this.materials = []
        for (let i = 0; i < this.parameters.length; i++) {
            const color = this.parameters[i][0]
            const sprite = this.parameters[i][1]
            const size = this.parameters[i][2]
  
            // Create the material that will be used to render each vertex of our geometry
            this.materials[i] = new PointsMaterial({
                size,
                map: sprite,
                blending: AdditiveBlending,
                depthWrite: false,
                // depthTest: false,
                
                transparent: true,
            })
            this.materials[i].color.setHSL(color[0], color[1], color[2])
  
            // Create the particle system
            const particleSystem = new Points(geometry, this.materials[i])
            geometry.center()
  
            /* Offset the particle system x, y, z to different random points to break
              uniformity in the direction of movement during animation */
            particleSystem.rotation.x = Math.random() * 6
            particleSystem.rotation.y = Math.random() * 6
            particleSystem.rotation.z = Math.random() * 6
  
            particleSystems.push(particleSystem)
        }
        this.particleSystems = particleSystems
    }
}

export default Snow