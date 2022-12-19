import { Group, Scene, Vector3 } from "three"
import RAPIER, { ActiveEvents } from "@dimforge/rapier3d-compat"
import { RAPIER_SCALING_COEFFICIENT } from "./constants"

/**
  * Penguin
  */

class ChristmasPenguin {

    object: Group
    body: RAPIER.RigidBody
    collider: RAPIER.Collider
    shouldRotate = false
    scene: Scene
    world: RAPIER.World

    constructor(object: Group, scene: Scene, world: RAPIER.World, ) {
        this.object = object
        const radius = 1
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic().setAdditionalMass(10)
                .setLinearDamping(1)
                .setCanSleep(false)
                .setGravityScale(0.0)
        )
        
        const collider = RAPIER.ColliderDesc.ball(radius / RAPIER_SCALING_COEFFICIENT)
            .setFriction(100).setDensity(20)
            .setRestitution(0.1)
        collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        collider.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.DEFAULT)
        this.collider = world.createCollider(collider, this.body)
        this.world = world
        this.scene = scene
    }

    setPosition(position: Vector3) {
        const adjPosition = position.divideScalar(RAPIER_SCALING_COEFFICIENT)
        this.body.setTranslation(new RAPIER.Vector3(adjPosition.x, adjPosition.y + 5, adjPosition.z), true)
    }
}

export default ChristmasPenguin