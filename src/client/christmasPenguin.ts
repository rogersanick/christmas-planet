import { Group } from "three"
import RAPIER from "@dimforge/rapier3d-compat"

/**
  * Penguin
  */

class ChristmasPenguin {

    object: Group
    body: RAPIER.RigidBody
    shouldRotate = false

    constructor(object: Group, worldRadius: number, world: RAPIER.World) {
        this.object = object
        const radius = 1
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setLinearDamping(1)
                .setTranslation(0, worldRadius + 5, 0)
                .setCcdEnabled(true).setCanSleep(false)
                .setGravityScale(0.0)
        )
        
        world.createCollider(
            RAPIER.ColliderDesc.ball(radius).setFriction(100).setDensity(1)
                .setRestitution(0.3), this.body)
    }
}

export default ChristmasPenguin