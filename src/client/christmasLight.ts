import { Object3D, Quaternion, Scene, Vector3 } from "three"
import RAPIER from "@dimforge/rapier3d-compat"
import { RAPIER_SCALING_COEFFICIENT } from "./constants"

/**
  * Christmas Light
  */
class ChristmasLight {

    world: RAPIER.World
    scene: Scene
    object: Object3D
    body: RAPIER.RigidBody
    collider: RAPIER.Collider
    shouldRotate = true
    opened = false

    constructor(object: Object3D, scene: Scene, world: RAPIER.World) {
        this.object = object
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setLinearDamping(0.2)
                .setCanSleep(true)
                .setGravityScale(0.0)
        )
    
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.ball(1).setDensity(0.05)
                .setRestitution(0.05), this.body)
        this.world = world
        this.scene = scene
    }

    setPosition(position: Vector3) {
        const adjPosition = position.divideScalar(RAPIER_SCALING_COEFFICIENT)
        this.body.setTranslation(new RAPIER.Vector3(adjPosition.x, adjPosition.y, adjPosition.z), true)

        const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 0), position)
        this.body.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }, true)
        return this
    }

    removeSelfFromGame() { 
        this.world.removeCollider(this.collider, true)
        this.scene.remove(this.object)
    }
}

export default ChristmasLight