import RAPIER from "@dimforge/rapier3d-compat"
import { Object3D, Scene } from "three"

type GameElements = { [colliderHandle: number]: GameElement }
type GameElement = { 
    collider: RAPIER.Collider, 
    body: RAPIER.RigidBody, 
    object: Object3D, 
    shouldRotate: boolean
    scene: Scene,
    world: RAPIER.World
}

export { GameElements, GameElement }