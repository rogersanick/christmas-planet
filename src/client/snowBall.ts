import { Mesh, MeshToonMaterial, Object3D, Scene, SphereGeometry, Vector3 } from "three"
import RAPIER from "@dimforge/rapier3d-compat"
import { RAPIER_SCALING_COEFFICIENT } from "./constants"

class SnowBall {
    object: Object3D
    body: RAPIER.RigidBody
    collider: RAPIER.Collider
    shouldRotate = false
    world: RAPIER.World
    scene: Scene
  
    constructor(scene: Scene, world: RAPIER.World) {
        const radius = 1
        this.object = new Mesh(
            new SphereGeometry(radius, 32, 32),
            new MeshToonMaterial({ color: 0xffffff })
        )
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic().setAdditionalMass(10)
                .setLinearDamping(1)
                .setCcdEnabled(true).setCanSleep(false)
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

    removeSelfFromGame() { 
        this.world.removeCollider(this.collider, true)
        this.scene.remove(this.object)
    }
}

const throwSnowBall = (
    snowBall: SnowBall, 
    direction: RAPIER.Vector3) => {
    snowBall.body.applyImpulse(direction, true)
}

export { SnowBall, throwSnowBall }