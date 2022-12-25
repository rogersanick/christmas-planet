import { CatmullRomCurve3, Vector3 } from "three"

const getPathGeometry = (numPoints: number, radius: number, height: number, waveFrequency: number) => {
    return new CatmullRomCurve3(getCirclePoints(numPoints, radius, height, waveFrequency), true, "catmullrom", 0.1)
}

const getCirclePoints = (numPoints: number, radius: number, height: number, waveFrequency: number) => {
    const angle = 2 * Math.PI / numPoints
    const points = []

    for (let i = 0; i < numPoints; i++) {
        const x = radius * Math.cos(angle * i)
        const y = Math.sin(i/waveFrequency) * height
        const z = radius * Math.sin(angle * i)
        points.push(new Vector3(x, y, z))
    }

    return points
}

export default getPathGeometry