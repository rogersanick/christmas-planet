import { Mesh, MeshToonMaterial, Object3D, SphereGeometry, Vector3 } from "three"
import RAPIER from "@dimforge/rapier3d-compat"

class SnowBall {
    object: Object3D
    body: RAPIER.RigidBody
    collider: RAPIER.Collider
    shouldRotate = false
  
    constructor(world: RAPIER.World, initialPosition: Vector3) {
        const snowBallRadius = 0.5
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setLinearDamping(0.1)
                .setTranslation(initialPosition.x, initialPosition.y, initialPosition.z)
                .setGravityScale(0.0)
        )

        this.collider = world.createCollider(
            RAPIER.ColliderDesc.ball(snowBallRadius)
                .setMass(1), this.body)

        this.object = new Mesh(
            new SphereGeometry(snowBallRadius, 32, 32),
            new MeshToonMaterial({
                color: 0xffffff,
            })
        )
    }
}

const throwSnowBall = (
    snowBall: SnowBall, 
    direction: RAPIER.Vector3) => {
    snowBall.body.applyImpulse(direction, true)
}

export { SnowBall, throwSnowBall }