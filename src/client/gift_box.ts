import { Box3, Group, Vector3 } from "three"
import RAPIER, { RotationOps } from "@dimforge/rapier3d-compat"
/**
  * Penguin
  */

class GiftBox {

    object: Group
    body: RAPIER.RigidBody
    shouldRotate = true

    constructor(object: Group, worldRadius: number, world: RAPIER.World, dimensions: Vector3) {
        this.object = object.clone()
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setLinearDamping(1)
                .setTranslation(4, worldRadius + 1, 0)
                .setCcdEnabled(true)
                .setGravityScale(0.0)
        )
      
        dimensions.multiplyScalar(0.5)
        world.createCollider(
            RAPIER.ColliderDesc.cuboid(dimensions.x, dimensions.y, dimensions.z).setFriction(100).setDensity(1)
                .setRestitution(0.4), this.body)
    }

    setPosition(position: Vector3) {
        this.body.setTranslation(new RAPIER.Vector3(position.x, position.y, position.z), true)
    }
}

export default GiftBox