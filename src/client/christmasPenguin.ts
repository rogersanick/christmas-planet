import { Group, Vector3 } from "three"
import * as CANNON from "cannon-es"

/**
  * Penguin
  */

class ChristmasPenguin {

    object: Group
    body: CANNON.Body
    physicalMaterial: CANNON.Material

    constructor(object: Group, worldRadius: number) {
        this.object = object
        this.physicalMaterial = new CANNON.Material("penguinMaterial")

        const radius = 1
        const initialPenguinPosition = new Vector3(0, worldRadius + 5, 0)

        this.body = new CANNON.Body({
            mass: 1, // the robot has a mass of 1 kg
            material: this.physicalMaterial,
            shape: new CANNON.Sphere(radius),
            position: new CANNON.Vec3(initialPenguinPosition.x, 
                initialPenguinPosition.y, initialPenguinPosition.z) // the position of the robot is at the origin
        })
    }
}

export default ChristmasPenguin