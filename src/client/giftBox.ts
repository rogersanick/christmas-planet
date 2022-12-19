import { Group, Matrix4, Quaternion, Scene, Vector3 } from "three"
import RAPIER from "@dimforge/rapier3d-compat"
import { RAPIER_SCALING_COEFFICIENT } from "./constants"
/**
  * Penguin
  */

class GiftBox {

    world: RAPIER.World
    scene: Scene
    object: Group
    body: RAPIER.RigidBody
    collider: RAPIER.Collider
    shouldRotate = true
    opened = false
    private present: (...args : any[]) => void

    constructor(object: Group, scene: Scene, 
        world: RAPIER.World, dimensions: Vector3, present: (...args : any[]) => void) {
        this.object = object
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic().setAdditionalMass(10)
                .setLinearDamping(1)
                .setCanSleep(true)
                .setGravityScale(0.0)
        )
      
        dimensions.divideScalar(RAPIER_SCALING_COEFFICIENT)
        dimensions.multiplyScalar(0.45)
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.cuboid(dimensions.x, dimensions.y, dimensions.z).setFriction(10).setDensity(1)
                .setRestitution(0.1), this.body)
        this.present = present
        this.world = world
        this.scene = scene
    }

    setPosition(position: Vector3) {
        const adjPosition = position.divideScalar(RAPIER_SCALING_COEFFICIENT)
        this.body.setTranslation(new RAPIER.Vector3(adjPosition.x, adjPosition.y, adjPosition.z), true)

        const rotation = new Quaternion().setFromRotationMatrix(
            new Matrix4().lookAt(adjPosition, new Vector3(0, 0, 0), new Vector3(0, 1, 0)))
        this.body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }, false)
    }

    openPresent() {
        if (!this.opened) {
            this.present(this.object.position)
            this.opened = true
        }
        this.removeSelfFromGame()
    }

    removeSelfFromGame() { 
        this.world.removeCollider(this.collider, true)
        this.scene.remove(this.object)
    }
}

export default GiftBox