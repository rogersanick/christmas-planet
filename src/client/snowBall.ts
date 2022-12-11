import { Mesh, MeshToonMaterial, Object3D, SphereGeometry } from "three"
import * as CANNON from "cannon-es"

class SnowBall {
    object: Object3D
    body: CANNON.Body
  
    constructor() {
        const snowBallRadius = 0.5
        this.body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Sphere(0.1),
            position: new CANNON.Vec3(0, 0, 0)
        })

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
    origin: CANNON.Vec3, 
    direction: CANNON.Vec3) => {
    snowBall.body.position.set(origin.x, origin.y, origin.z)
    snowBall.body.applyImpulse(direction, snowBall.body.position)
}

export { SnowBall, throwSnowBall }