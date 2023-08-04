
import { ReadonlyVec2, ReadonlyVec3, ReadonlyVec4, mat4, vec2, vec3, vec4 } from 'gl-matrix';

const TAU = Math.PI * 2;

class Canvas {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public mouse = vec2.create();
    public mouseLast = vec2.create();
    public mouseDelta = vec2.create();
    public mouseWheel = 0;
    public mouseButton = 0;
    // tristate. non-existent = not pressed, false = pressed but not this frame, true = pressed this frame.
    public keysDown = new Map<string, boolean>();

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.onmousedown = this.updateMouseState.bind(this);
        this.canvas.onmousemove = this.updateMouseState.bind(this);
        this.canvas.onmouseup = this.updateMouseState.bind(this);
        this.canvas.onwheel = this.updateMouseWheel.bind(this);
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d')!;

        document.addEventListener('keydown', this.onKeyDown.bind(this), { capture: true });
        document.addEventListener('keyup', this.onKeyUp.bind(this), { capture: true });
        document.addEventListener('contextmenu', (e) => { e.preventDefault(); });

        window.addEventListener('resize', this.onResize.bind(this));
        this.onResize();
    }

    public getSize(size: number): number {
        // sizes were authored assuming a devicePixelRatio of 2
        return size * window.devicePixelRatio / 2;
    }

    private onResize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private updateMouseState(e: MouseEvent): void {
        this.mouse[0] = e.clientX;
        this.mouse[1] = e.clientY;
        vec2.sub(this.mouseDelta, this.mouse, this.mouseLast);
        this.mouseButton = e.buttons;
        e.preventDefault();
    }

    private updateMouseWheel(e: WheelEvent): void {
        this.mouseWheel = e.deltaY;
    }

    private onKeyDown(e: KeyboardEvent): void {
        this.keysDown.set(e.code, !e.repeat);
    }

    private onKeyUp(e: KeyboardEvent): void {
        this.keysDown.delete(e.code);
    }

    public isKeyDownEventTriggered(key: string): boolean {
        return !!this.keysDown.get(key);
    }

    public isKeyDown(key: string): boolean {
        return this.keysDown.has(key);
    }

    public endFrame(): void {
        this.mouseWheel = 0;
        vec2.copy(this.mouseLast, this.mouse);
        vec2.zero(this.mouseDelta);

        // Go through and mark all keys as non-event-triggered.
        this.keysDown.forEach((v, k) => {
            this.keysDown.set(k, false);
        });
    }

    public clearScreen(color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private circle2d(x: number, y: number, radius: number): void {
        this.ctx.arc(x, y, radius, 0.0, Math.PI * 2);
    }

    public drawPoint(canvasPosition: ReadonlyVec2, color = 'black', size = 8): void {
        // Draw a circle centered at canvasPosition, with a radius of size / 2.
        this.ctx.beginPath();
        this.circle2d(canvasPosition[0], canvasPosition[1], this.getSize(size / 2));
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    public drawCircle(canvasPosition: ReadonlyVec2, radius: number, color = 'black', size = 8): void {
        // Draw a circle centered at canvasPosition, with a radius of size / 2.
        this.ctx.beginPath();
        this.circle2d(canvasPosition[0], canvasPosition[1], radius / 2);
        this.ctx.closePath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.getSize(size);
        this.ctx.stroke();
    }

    public drawLine(canvasPositionA: ReadonlyVec2, canvasPositionB: ReadonlyVec2, color = 'black', lineWidth = 2): void {
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPositionA[0], canvasPositionA[1]);
        this.ctx.lineTo(canvasPositionB[0], canvasPositionB[1]);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.getSize(lineWidth);
        this.ctx.stroke();
    }

    public drawArrow(canvasPositionA: ReadonlyVec2, canvasPositionB: ReadonlyVec2, color = 'black', lineWidth = 2): void {
        this.ctx.beginPath();
        this.ctx.moveTo(canvasPositionA[0], canvasPositionA[1]);
        this.ctx.lineTo(canvasPositionB[0], canvasPositionB[1]);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.getSize(lineWidth);
        this.ctx.stroke();

        // Draw the little arrows at canvasPositionB.
        this.ctx.beginPath();
        const dir = vec2.sub(vec2.create(), canvasPositionB, canvasPositionA);
        vec2.normalize(dir, dir);
        this.ctx.moveTo(canvasPositionB[0], canvasPositionB[1]);
        const arrowSize = this.getSize(lineWidth) * 2.0;
        const arrowP1X = -dir[1] * arrowSize, arrowP1Y =  dir[0] * arrowSize;
        const arrowP2X =  dir[1] * arrowSize, arrowP2Y = -dir[0] * arrowSize;
        const arrowP3X =  dir[0] * 20, arrowP3Y =  dir[1] * 20;
        this.ctx.lineTo(canvasPositionB[0] + arrowP1X, canvasPositionB[1] + arrowP1Y);
        this.ctx.lineTo(canvasPositionB[0] + arrowP3X, canvasPositionB[1] + arrowP3Y);
        this.ctx.lineTo(canvasPositionB[0] + arrowP2X, canvasPositionB[1] + arrowP2Y);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    public drawGridPlane(canvasPositionCenter: ReadonlyVec2, basisX: ReadonlyVec2, basisY: ReadonlyVec2, gridSize: number, cellCount: number, color: string = 'black', lineWidth: number = 4): void {
        const halfGridSize = gridSize * 0.5;

        // Do lines along the X basis first ("horizontal").
        for (let i = 0; i <= cellCount; i++) {
            const t = (i / cellCount) * 2.0 - 1.0;

            // Compute the left and right points of the "horizontal" line.
            const canvasPositionA = vec2.scaleAndAdd(vec2.create(), canvasPositionCenter, basisX, -halfGridSize);
            vec2.scaleAndAdd(canvasPositionA, canvasPositionA, basisY, t * halfGridSize);

            const canvasPositionB = vec2.scaleAndAdd(vec2.create(), canvasPositionCenter, basisX, halfGridSize);
            vec2.scaleAndAdd(canvasPositionB, canvasPositionB, basisY, t * halfGridSize);

            this.drawLine(canvasPositionA, canvasPositionB, color, lineWidth);
        }

        // Do lines along the Y basis now ("vertical").
        for (let i = 0; i <= cellCount; i++) {
            const t = (i / cellCount) * 2.0 - 1.0;

            // Compute the top and bottom points of the "vertical" line.
            const canvasPositionA = vec2.scaleAndAdd(vec2.create(), canvasPositionCenter, basisY, -halfGridSize);
            vec2.scaleAndAdd(canvasPositionA, canvasPositionA, basisX, t * halfGridSize);

            const canvasPositionB = vec2.scaleAndAdd(vec2.create(), canvasPositionCenter, basisY, halfGridSize);
            vec2.scaleAndAdd(canvasPositionB, canvasPositionB, basisX, t * halfGridSize);

            this.drawLine(canvasPositionA, canvasPositionB, color, lineWidth);
        }
    }

    public get width() { return this.canvas.width; }
    public get height() { return this.canvas.height; }
}

class PositionDrag {
    private offset = vec2.create();

    constructor(public out: vec2, dragStart: ReadonlyVec2, private mouseButtons: number) {
        vec2.sub(this.offset, this.out, dragStart);
    }

    public update(mouse: ReadonlyVec2, mouseButtons: number): boolean {
        vec2.add(this.out, mouse, this.offset);

        return this.mouseButtons !== mouseButtons;
    }
}

class NormalDrag {
    private origin = vec2.create();
    private dragStart = vec2.create();
    private normalStart = vec2.create();

    constructor(public out: vec2, origin: ReadonlyVec2, dragStart: ReadonlyVec2, private mouseButtons: number) {
        vec2.copy(this.normalStart, out);
        vec2.copy(this.origin, origin);
        vec2.copy(this.dragStart, dragStart);
    }

    public update(mouse: ReadonlyVec2, mouseButtons: number): boolean {
        const toDragStart = vec2.sub(vec2.create(), this.dragStart, this.origin);
        vec2.normalize(toDragStart, toDragStart);

        const toMouse = vec2.sub(vec2.create(), mouse, this.origin);
        vec2.normalize(toMouse, toMouse);

        const sin = toDragStart[0] * toMouse[1] - toDragStart[1] * toMouse[0];
        const cos = toDragStart[0] * toMouse[0] + toDragStart[1] * toMouse[1];

        // apply rotation
        this.out[0] = this.normalStart[0] * cos - this.normalStart[1] * sin;
        this.out[1] = this.normalStart[0] * sin + this.normalStart[1] * cos;

        return this.mouseButtons !== mouseButtons;
    }
}

function lineRayIntersect(a0: ReadonlyVec2, a1: ReadonlyVec2, b0: ReadonlyVec2, b1: ReadonlyVec2) {
    const a = vec2.sub(vec2.create(), a1, a0);
    const b = vec2.sub(vec2.create(), b1, b0);

    function cross(a: ReadonlyVec2, b: ReadonlyVec2) {
        return a[0] * b[1] - b[0] * a[1];
    }

    const c = vec2.sub(vec2.create(), b0, a0);
    const denom = cross(a, b);

    if (Math.abs(denom) < 0.01)
        return -1; // colinear / parallel

    const at = cross(c, a) / denom;
    const bt = cross(c, b) / denom;
    if (at < 0 || bt < -0.01 || bt > 1.01)
        return -1;

    return at;
}

function perpL(v: ReadonlyVec2): vec2 {
    return vec2.fromValues(-v[1], v[0]);
}

function lerp(a: number, b: number, t: number): number {
    return (b - a) * t + a;
}

function invlerp(a: number, b: number, v: number): number {
    return (v - a) / (b - a);
}

function clamp(x: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, x));
}

function saturate(x: number) {
    return clamp(x, 0.0, 1.0);
}

function lineDistance(a0: ReadonlyVec2, a1: ReadonlyVec2, p: ReadonlyVec2) {
    const a = vec2.sub(vec2.create(), a1, a0);
    const p0 = vec2.sub(vec2.create(), p, a0);
    const t = saturate(vec2.dot(a, p0) / vec2.squaredLength(a));
    vec2.scale(a, a, t);
    return vec2.distance(p0, a);
}

const enum Demo {
    DotProduct,
    DotProductNormal,
    SurfaceNormal,
    CameraFrustum,
    CameraFrustumProjectionMatrix,
    PointLight,
    PointLightPixel,
    Count,
}

function computeUnitSphereCoords(azimuthal: number, polar: number): vec3 {
    const sinP = Math.sin(polar);
    return vec3.fromValues(
        sinP * Math.cos(azimuthal),
        Math.cos(polar),
        sinP * Math.sin(azimuthal),
    );
}

// Clips the line going from A to B to the given plane. Returns false if the line is fully clipped away.
function clipToPlane(clipPositionA: vec4, clipPositionB: vec4, planeNormal: ReadonlyVec4): boolean {
    const dotA = vec4.dot(clipPositionA, planeNormal);
    const dotB = vec4.dot(clipPositionB, planeNormal);

    if (dotA < 0.0 && dotB < 0.0) {
        // Both are behind the plane. Don't draw it.
        return false;
    }

    const t = dotA / (dotA - dotB);
    if (dotA < 0.0) {
        vec4.lerp(clipPositionA, clipPositionA, clipPositionB, t);
    } else if (dotB < 0.0) {
        vec4.lerp(clipPositionB, clipPositionA, clipPositionB, t);
    }

    return true;
}

function colorLerp(ca: string, cb: string, t: number): string {
    const ra = parseInt(ca.slice(1, 3), 16);
    const ga = parseInt(ca.slice(3, 5), 16);
    const ba = parseInt(ca.slice(5, 7), 16);

    const rb = parseInt(cb.slice(1, 3), 16);
    const gb = parseInt(cb.slice(3, 5), 16);
    const bb = parseInt(cb.slice(5, 7), 16);

    const r = lerp(ra, rb, t);
    const g = lerp(ga, gb, t);
    const b = lerp(ba, bb, t);
    return `rgb(${r}, ${g}, ${b})`;
}

class Viz {
    private canvas: Canvas;
    private viewport2D = vec4.create();

    private viewFromWorld3D = mat4.create();
    private clipFromView3D = mat4.create();
    private clipFromWorld3D = mat4.create();

    private drag: PositionDrag | NormalDrag | null = null;
    private sliderDragLabel: string | null = null;

    private stateDefault = {
        demo: Demo.DotProduct,
        surfaceNormal: vec2.fromValues(1, 1),
        lightDir: vec2.fromValues(-1, 0),
        lightPos: vec2.fromValues(.75, .75),
        lightRayNum: 10,
        cameraLatitude3D: -TAU * (0.7/4),
        cameraLongitude3D: 2.2,
        cameraDistance3D: -100,
        frustumFovy: 360 / 4.5,
        frustumAspect: 16/9,
        frustumFar: 15,
        frustumCubeLerp: 0,
    };

    private state: typeof this.stateDefault;

    constructor() {
        this.canvas = new Canvas();

        this.state = { ... this.stateDefault };
        this.loadState();
    }

    private beginFrame2D(): void {
        const r = Math.min(this.canvas.width, this.canvas.height);
        const rx = Math.max((this.canvas.width - r) / 2, 0);
        const ry = Math.max((this.canvas.height - r) / 2, 0);
        this.viewport2D[0] = r;
        this.viewport2D[1] = r;
        this.viewport2D[2] = rx;
        this.viewport2D[3] = ry;
    }

    private beginFrame3D(): void {
        // Set our default projection matrix.
        mat4.perspective(this.clipFromView3D, TAU / 4.5, this.canvas.width / this.canvas.height, 0.1, Infinity);

        // Set our view matrix (we look at the origin from a given point in space, known as the 'eye').

        // We generate the eye using langitude / longitude coordinates, which we can control with the mouse x/y.
        const eye = computeUnitSphereCoords(this.state.cameraLatitude3D, this.state.cameraLongitude3D);
        // This is the distance away from the origin we are.
        vec3.scale(eye, eye, this.state.cameraDistance3D);

        const origin = vec3.fromValues(0, 0, 0);
        const up = vec3.fromValues(0, 1, 0);

        mat4.lookAt(this.viewFromWorld3D, eye, origin, up);
        mat4.mul(this.clipFromWorld3D, this.clipFromView3D, this.viewFromWorld3D);
    }

    public drawPoint3D(worldPosition: ReadonlyVec3, color = 'black', size = 8): void {
        const clipPosition = this.transformWorld3DToClip(worldPosition);

        // If this is behind the camera, then don't show it.
        const clipSpaceZ = clipPosition[2] / clipPosition[3];
        if (clipSpaceZ < -1.0 || clipSpaceZ > 1.0)
            return;

        const canvasPosition = this.transformClipToCanvas(clipPosition);
        this.canvas.drawPoint(canvasPosition as ReadonlyVec2, color, size);
    }

    private drawLine3D(worldPositionA: ReadonlyVec3, worldPositionB: ReadonlyVec3, color = 'black', lineWidth = 2): void {
        const clipPositionA = this.transformWorld3DToClip(worldPositionA);
        const clipPositionB = this.transformWorld3DToClip(worldPositionB);

        // If this intersects the near clip plane, we need to find the relevant intersection.

        const lineIsVisible = clipToPlane(clipPositionA, clipPositionB, vec4.fromValues(0, 0, 1.0, 1.0));
        if (!lineIsVisible)
            return;

        const canvasPositionA = this.transformClipToCanvas(clipPositionA);
        const canvasPositionB = this.transformClipToCanvas(clipPositionB);
        this.canvas.drawLine(canvasPositionA as ReadonlyVec2, canvasPositionB as ReadonlyVec2, color, lineWidth);
    }

    private drawQuadFill3D(worldPositionA: ReadonlyVec3, worldPositionB: ReadonlyVec3, worldPositionC: ReadonlyVec3, worldPositionD: ReadonlyVec3, color: string): void {
        const clipPositionA = this.transformWorld3DToClip(worldPositionA);
        const clipPositionB = this.transformWorld3DToClip(worldPositionB);
        const clipPositionC = this.transformWorld3DToClip(worldPositionC);
        const clipPositionD = this.transformWorld3DToClip(worldPositionD);

        const canvasPositionA = this.transformClipToCanvas(clipPositionA);
        const canvasPositionB = this.transformClipToCanvas(clipPositionB);
        const canvasPositionC = this.transformClipToCanvas(clipPositionC);
        const canvasPositionD = this.transformClipToCanvas(clipPositionD);
        const ctx = this.canvas.ctx;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(canvasPositionA[0], canvasPositionA[1]);
        ctx.lineTo(canvasPositionB[0], canvasPositionB[1]);
        ctx.lineTo(canvasPositionC[0], canvasPositionC[1]);
        ctx.lineTo(canvasPositionD[0], canvasPositionD[1]);
        ctx.closePath();
        ctx.fill();
    }

    private drawGridPlane3D(worldPositionCenter: ReadonlyVec3, basisX: ReadonlyVec3, basisY: ReadonlyVec3, gridSize: number, cellCount: number, color: string = 'black', lineWidth: number = 4): void {
        const halfGridSize = gridSize * 0.5;

        // Do lines along the X basis first ("horizontal").
        for (let i = 0; i <= cellCount; i++) {
            const t = (i / cellCount) * 2.0 - 1.0;

            // Compute the left and right points of the "horizontal" line.
            const worldPositionA = vec3.scaleAndAdd(vec3.create(), worldPositionCenter, basisX, -halfGridSize);
            vec3.scaleAndAdd(worldPositionA, worldPositionA, basisY, t * halfGridSize);

            const worldPositionB = vec3.scaleAndAdd(vec3.create(), worldPositionCenter, basisX, halfGridSize);
            vec3.scaleAndAdd(worldPositionB, worldPositionB, basisY, t * halfGridSize);

            this.drawLine3D(worldPositionA, worldPositionB, color, lineWidth);
        }

        // Do lines along the Y basis now ("vertical").
        for (let i = 0; i <= cellCount; i++) {
            const t = (i / cellCount) * 2.0 - 1.0;

            // Compute the top and bottom points of the "vertical" line.
            const worldPositionA = vec3.scaleAndAdd(vec3.create(), worldPositionCenter, basisY, -halfGridSize);
            vec3.scaleAndAdd(worldPositionA, worldPositionA, basisX, t * halfGridSize);

            const worldPositionB = vec3.scaleAndAdd(vec3.create(), worldPositionCenter, basisY, halfGridSize);
            vec3.scaleAndAdd(worldPositionB, worldPositionB, basisX, t * halfGridSize);

            this.drawLine3D(worldPositionA, worldPositionB, color, lineWidth);
        }
    }

    private transformWorld3DToClip(v: ReadonlyVec3): vec4 {
        const clipPosition = vec4.fromValues(v[0], v[1], v[2], 1.0);
        vec4.transformMat4(clipPosition, clipPosition, this.clipFromWorld3D);
        return clipPosition;
    }

    private transformClipToCanvas(clipSpace: ReadonlyVec4): vec3 {
        const clipW = clipSpace[3];
        const clipX = clipSpace[0] / clipW;
        const clipY = clipSpace[1] / clipW;
        const clipZ = clipSpace[2] / clipW;

        // Go from -1...1 to 0...size
        const canvasX = (clipX + 1) * this.canvas.width / 2;
        const canvasY = (clipY + 1) * this.canvas.height / 2;

        // Note: in our clip space, +Y is up, while in a 2D canvas, +Y is down. For this reason,
        // we have to flip everything up-side down.
        const canvasYFlipped = this.canvas.height - canvasY;

        return vec3.fromValues(canvasX, canvasYFlipped, clipZ);
    }

    private transformWorld2DToCanvas(v: ReadonlyVec2): vec2 {
        const x = (v[0] * 0.5 + 0.5) * this.viewport2D[0] + this.viewport2D[2];
        const y = (-v[1] * 0.5 + 0.5) * this.viewport2D[1] + this.viewport2D[3];
        return vec2.fromValues(x, y);
    }

    private transformCanvasToWorld2D(v: ReadonlyVec2): vec2 {
        const x = ((v[0] - this.viewport2D[2]) / this.viewport2D[0]) * 2 - 1;
        const y = -(((v[1] - this.viewport2D[3]) / this.viewport2D[1]) * 2 - 1);
        return vec2.fromValues(x, y);
    }

    private update2D() {
        this.beginFrame2D();
        const mouseWorld = this.transformCanvasToWorld2D(this.canvas.mouse);

        if (this.drag !== null) {
            if (this.drag.update(mouseWorld, this.canvas.mouseButton))
                this.drag = null;
        }

        this.state.lightRayNum += -Math.sign(this.canvas.mouseWheel);
        this.state.lightRayNum = Math.max(this.state.lightRayNum, 2);

        // Draw surface.
        const surfacePerp = perpL(this.state.surfaceNormal);
        const surfaceSize = 0.4;
        const surfaceOrigin = vec2.fromValues(0, 0);
        const surfaceA = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, surfacePerp, surfaceSize);
        const surfaceB = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, surfacePerp, -surfaceSize);

        const lightDirPerp = perpL(this.state.lightDir);
        const lightDirSize = 0.4;
        const lightDirOrigin = vec2.fromValues(0, 0);
        const lightDirLineWidth = lerp(6, 2, saturate(invlerp(10, 40, this.state.lightRayNum)));

        let surfaceColor = '#666';
        let lightDirColor = '#cccccc', lightDirHitColor = '#ffa500', lightDirHitBackfaceColor = '#aaaaaa';

        const showSurface = true;
        const showSurfaceNormal = this.state.demo === Demo.DotProductNormal || this.state.demo === Demo.SurfaceNormal || this.state.demo === Demo.PointLightPixel;
        const showLightRayDir = this.state.demo === Demo.DotProduct || this.state.demo === Demo.DotProductNormal;
        const showLightRayPos = this.state.demo === Demo.PointLight || this.state.demo === Demo.PointLightPixel;

        if (this.drag !== null) {
            if (this.drag.out === this.state.surfaceNormal) {
                surfaceColor = '#666';
            } else if (this.drag.out === this.state.lightDir || this.drag.out === this.state.lightPos) {
                lightDirColor = '#cccccc';
                lightDirHitColor = '#ff8800';
            }
        }
        
        if (this.drag === null && showSurface) {
            let overSurface = false;
            
            if (lineDistance(surfaceA, surfaceB, mouseWorld) < 0.02)
                overSurface = true;

            if (showSurfaceNormal) {
                const surfaceArrowB = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, this.state.surfaceNormal, surfaceSize - (40 / this.viewport2D[0]));
                if (lineDistance(surfaceOrigin, surfaceArrowB, mouseWorld) < 0.02)
                    overSurface = true;
            }

            if (overSurface) {
                surfaceColor = '#999';
                if (this.canvas.mouseButton !== 0)
                    this.drag = new NormalDrag(this.state.surfaceNormal, surfaceOrigin, mouseWorld, this.canvas.mouseButton);
            }
        }

        if (this.drag === null && showLightRayDir && vec2.distance(mouseWorld, lightDirOrigin) >= 0.4) {
            lightDirColor = '#999';
            if (this.canvas.mouseButton !== 0)
                this.drag = new NormalDrag(this.state.lightDir, lightDirOrigin, mouseWorld, this.canvas.mouseButton);
        }

        if (this.drag === null && showLightRayPos && vec2.distance(mouseWorld, this.state.lightPos) < 0.02) {
            lightDirColor = '#999';
            if (this.canvas.mouseButton !== 0)
                this.drag = new PositionDrag(this.state.lightPos, mouseWorld, this.canvas.mouseButton);
        }

        let lightRayNum = 0;
        let lightRayHitNum = 0;
        let lightDir = this.state.lightDir;

        if (showLightRayDir) {
            lightRayNum = this.state.lightRayNum + 1;
            for (let i = 0; i <= this.state.lightRayNum; i++) {
                const rayT = (i / this.state.lightRayNum) * 2 - 1;
                const magnitude = 4;
                const lightDirO = vec2.scaleAndAdd(vec2.create(), lightDirOrigin, lightDirPerp, rayT * lightDirSize);
                const lightDirA = vec2.scaleAndAdd(vec2.create(), lightDirO, this.state.lightDir, -2);
                const lightDirB = vec2.scaleAndAdd(vec2.create(), lightDirA, this.state.lightDir, magnitude);

                const t = lineRayIntersect(surfaceA, surfaceB, lightDirA, lightDirB);
                let color = lightDirColor;
                if (t >= 0) {
                    const backface = this.state.demo === Demo.DotProductNormal && (vec2.dot(this.state.surfaceNormal, this.state.lightDir) > 0);
                    color = backface ? lightDirHitBackfaceColor : lightDirHitColor;
                    vec2.lerp(lightDirB, lightDirA, lightDirB, t - 0.02);
                    lightRayHitNum++;
                }

                this.canvas.drawArrow(this.transformWorld2DToCanvas(lightDirA), this.transformWorld2DToCanvas(lightDirB), color, lightDirLineWidth);
            }
        } else if (this.state.demo === Demo.PointLight) {
            const lightPos = this.state.lightPos;
            this.canvas.drawPoint(this.transformWorld2DToCanvas(lightPos), lightDirHitColor, 16);

            lightDir = vec2.sub(vec2.create(), surfaceOrigin, lightPos);
            vec2.normalize(lightDir, lightDir);

            for (let i = 0; i < this.state.lightRayNum; i++) {
                const rayTheta = (i / this.state.lightRayNum) * TAU;
                const rayDir = vec2.fromValues(Math.cos(rayTheta), Math.sin(rayTheta));

                const magnitude = 4;
                const lightDirA = vec2.scaleAndAdd(vec2.create(), this.state.lightPos, rayDir, 0.025);
                const lightDirB = vec2.scaleAndAdd(vec2.create(), this.state.lightPos, rayDir, magnitude);

                let color = '#cccccc';

                {
                    const lightDir = vec2.sub(vec2.create(), surfaceOrigin, lightPos);
                    vec2.normalize(lightDir, lightDir);
    
                    const surfacePerp = perpL(lightDir);
                    const surfaceA = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, surfacePerp, surfaceSize);
                    const surfaceB = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, surfacePerp, -surfaceSize);
                    const t = lineRayIntersect(surfaceA, surfaceB, lightDirA, lightDirB);
                    if (t < 0) {
                        color = '#eeeeee';
                        lightRayNum--;
                    }
                }

                lightRayNum++;
                const t = lineRayIntersect(surfaceA, surfaceB, lightDirA, lightDirB);
                if (t >= 0) {
                    color = lightDirHitColor;
                    vec2.lerp(lightDirB, lightDirA, lightDirB, t - 0.02);
                    lightRayHitNum++;
                }

                this.canvas.drawArrow(this.transformWorld2DToCanvas(lightDirA), this.transformWorld2DToCanvas(lightDirB), color, lightDirLineWidth);
            }
        } else if (this.state.demo === Demo.PointLightPixel) {
            const lightPos = this.state.lightPos;
            this.canvas.drawPoint(this.transformWorld2DToCanvas(lightPos), lightDirHitColor, 16);

            lightDir = vec2.sub(vec2.create(), surfaceOrigin, lightPos);
            vec2.normalize(lightDir, lightDir);

            const dot = saturate(-vec2.dot(lightDir, this.state.surfaceNormal));
            const color = colorLerp('#333333', lightDirHitColor, dot);

            const lightDirA = vec2.scaleAndAdd(vec2.create(), this.state.lightPos, lightDir, 0.025);
            const lightDirB = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, lightDir, -0.1);

            this.canvas.drawArrow(this.transformWorld2DToCanvas(lightDirA), this.transformWorld2DToCanvas(lightDirB), color, lightDirLineWidth);
        }

        if (this.state.demo === Demo.DotProductNormal || this.state.demo === Demo.PointLightPixel) {
            const surfaceArrowB = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, this.state.surfaceNormal, surfaceSize - (40 / this.viewport2D[0]));
            this.canvas.drawArrow(this.transformWorld2DToCanvas(surfaceOrigin), this.transformWorld2DToCanvas(surfaceArrowB), surfaceColor, 4);
        } if (this.state.demo === Demo.SurfaceNormal) {
            this.canvas.drawGridPlane(this.transformWorld2DToCanvas(vec2.create()), vec2.fromValues(1, 0), vec2.fromValues(0, 1), surfaceSize * this.viewport2D[0] * 4, 40, '#eee', 1);

            this.canvas.drawLine(this.transformWorld2DToCanvas(vec2.create()), this.transformWorld2DToCanvas(vec2.fromValues(surfaceSize, 0)), '#a66', 2);
            this.canvas.drawLine(this.transformWorld2DToCanvas(vec2.create()), this.transformWorld2DToCanvas(vec2.fromValues(0, surfaceSize)), '#6a6', 2);

            const surfaceArrowB = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, this.state.surfaceNormal, surfaceSize - (40 / this.viewport2D[0]));
            this.canvas.drawCircle(this.transformWorld2DToCanvas(surfaceOrigin), surfaceSize * this.viewport2D[0], '#ccc', 2);
            this.canvas.drawArrow(this.transformWorld2DToCanvas(surfaceOrigin), this.transformWorld2DToCanvas(surfaceArrowB), surfaceColor, 4);
            const ctx = this.canvas.ctx;

            const textWidth = 250, textHeight = 75;

            const textPos = vec2.scaleAndAdd(vec2.create(), surfaceOrigin, this.state.surfaceNormal, surfaceSize);
            const canvasPosition = this.transformWorld2DToCanvas(textPos);

            canvasPosition[0] += this.state.surfaceNormal[0] * textWidth * 0.5;
            canvasPosition[1] += this.state.surfaceNormal[1] * -textHeight * 0.5;

            // ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            // ctx.fillRect(canvasPosition[0] - textWidth * 0.5, canvasPosition[1] - textHeight * 0.5, textWidth, textHeight);

            ctx.fillStyle = '#333';
            ctx.font = `${this.canvas.getSize(24)}pt sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const normalX = this.state.surfaceNormal[0].toFixed(3);
            const normalY = this.state.surfaceNormal[1].toFixed(3);
            ctx.fillText(`${normalX}, ${normalY}`, canvasPosition[0], canvasPosition[1]);
        }

        if (showSurface) {
            this.canvas.drawLine(this.transformWorld2DToCanvas(surfaceA), this.transformWorld2DToCanvas(surfaceB), surfaceColor, 4);
        }

        if (this.state.demo === Demo.DotProduct || this.state.demo === Demo.DotProductNormal || this.state.demo === Demo.PointLight) {
            const canvasPosition = this.transformWorld2DToCanvas(vec2.fromValues(0.0, -0.65));

            const ctx = this.canvas.ctx;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(0, canvasPosition[1] - this.canvas.getSize(50), this.canvas.width, this.canvas.height);

            ctx.fillStyle = '#333';
            ctx.font = `${this.canvas.getSize(24)}pt sans-serif`;
            ctx.textAlign = 'center';

            ctx.fillText(`Total number of possible light rays: ${lightRayNum}`, canvasPosition[0], canvasPosition[1]);
            canvasPosition[1] += this.canvas.getSize(40);
            ctx.fillText(`Number of light rays hitting the surface: ${lightRayHitNum}`, canvasPosition[0], canvasPosition[1]);
            canvasPosition[1] += this.canvas.getSize(40);
            const ratio = lightRayHitNum / (lightRayNum);
            ctx.fillText(`Ratio: ${lightRayHitNum} / ${lightRayNum} = ${ratio.toFixed(4)}`, canvasPosition[0], canvasPosition[1]);
            canvasPosition[1] += this.canvas.getSize(40);
            const cos = Math.abs(vec2.dot(this.state.surfaceNormal, lightDir));
            ctx.fillText(`Angle: ${(Math.acos(cos) * 180 / Math.PI).toFixed(0)}°  Cos: ${cos.toFixed(4)}`, canvasPosition[0], canvasPosition[1]);
        } else if (this.state.demo === Demo.PointLightPixel) {
            const canvasPosition = this.transformWorld2DToCanvas(vec2.fromValues(0.0, -0.75));

            const ctx = this.canvas.ctx;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(0, canvasPosition[1] - this.canvas.getSize(50), this.canvas.width, this.canvas.height);

            ctx.fillStyle = '#333';
            ctx.font = `${this.canvas.getSize(24)}pt sans-serif`;
            ctx.textAlign = 'center';

            canvasPosition[1] += this.canvas.getSize(40) * 2;
            const cos = -vec2.dot(lightDir, this.state.surfaceNormal);
            ctx.fillText(`Angle: ${(Math.acos(cos) * 180 / Math.PI).toFixed(0)}°  Cos: ${cos.toFixed(4)}`, canvasPosition[0], canvasPosition[1]);
        }
    }

    private update3D(): void {
        this.beginFrame3D();

        if (this.canvas.mouseButton && this.sliderDragLabel === null) {
            this.state.cameraLatitude3D += this.canvas.mouseDelta[0] * 0.005;
            this.state.cameraLongitude3D += this.canvas.mouseDelta[1] * 0.005;
        }

        this.state.cameraDistance3D += -Math.sign(this.canvas.mouseWheel) * 4;
        this.state.cameraDistance3D = Math.min(this.state.cameraDistance3D, -10);

        this.drawGridPlane3D(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0), vec3.fromValues(0, 0, 1), 100, 10, '#ccc', 3);

        // Construct frustum.
        const m = mat4.create();
        mat4.perspective(m, this.state.frustumFovy * Math.PI / 180, this.state.frustumAspect, -2, -this.state.frustumFar);
        const im = mat4.invert(mat4.create(), m);
        im[0] *= -1;
        im[5] *= -1;

        // Extract corners.
        const corner = (x: number, y: number, z: number): vec3 => {
            const v = vec3.fromValues(x, y, z);
            vec3.transformMat4(v, v, im);
            const cubeScale = 5;
            const cubeCoords = vec3.fromValues(x * cubeScale * this.state.frustumAspect, y * cubeScale, z * cubeScale);
            vec3.lerp(v, v, cubeCoords, this.state.frustumCubeLerp);
            return v;
        };

        const n00 = corner(-1, -1, -1);
        const n10 = corner(1, -1, -1);
        const n01 = corner(-1, 1, -1);
        const n11 = corner(1, 1, -1);

        const f00 = corner(-1, -1, 1);
        const f10 = corner(1, -1, 1);
        const f01 = corner(-1, 1, 1);
        const f11 = corner(1, 1, 1);

        const quadAlpha = this.state.frustumCubeLerp;
        const quadColor = `rgba(128, 200, 240, ${quadAlpha})`;
        this.drawQuadFill3D(n00, n10, n11, n01, quadColor);

        // Draw frustum.
        const frustumColor = 'black', frustumLineWidth = 4;
        this.drawLine3D(n00, n10, frustumColor, frustumLineWidth);
        this.drawLine3D(n10, n11, frustumColor, frustumLineWidth);
        this.drawLine3D(n11, n01, frustumColor, frustumLineWidth);
        this.drawLine3D(n01, n00, frustumColor, frustumLineWidth);

        this.drawLine3D(f00, f10, frustumColor, frustumLineWidth);
        this.drawLine3D(f10, f11, frustumColor, frustumLineWidth);
        this.drawLine3D(f11, f01, frustumColor, frustumLineWidth);
        this.drawLine3D(f01, f00, frustumColor, frustumLineWidth);
        
        this.drawLine3D(n00, f00, frustumColor, frustumLineWidth);
        this.drawLine3D(n10, f10, frustumColor, frustumLineWidth);
        this.drawLine3D(n11, f11, frustumColor, frustumLineWidth);
        this.drawLine3D(n01, f01, frustumColor, frustumLineWidth);

        // Draw UI.
        {
            this.beginFrame2D();
            const canvasPosition = this.transformWorld2DToCanvas(vec2.fromValues(0.0, -0.75));

            const ctx = this.canvas.ctx;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(0, canvasPosition[1] - 50, this.canvas.width, this.canvas.height);

            const slider = ({ x, y, min, max, value, label } : { x: number, y: number, min: number, max: number, value: number, label: string }) => {
                const canvasPosition = this.transformWorld2DToCanvas(vec2.fromValues(x, y));
                const sizeX = 200;
                const trackMinX = canvasPosition[0];
                const trackMaxX = canvasPosition[0] + sizeX;
                const trackY = canvasPosition[1];

                let t = invlerp(min, max, value);
                const handleX = lerp(trackMinX, trackMaxX, t);

                const handlePos = vec2.fromValues(handleX, trackY);
                let handleColor = '#888';
                let handleSize = 20;
                let drawValue = false;

                this.canvas.drawLine(vec2.fromValues(trackMinX, trackY), vec2.fromValues(trackMaxX, trackY), '#ccc', 8);

                if (this.sliderDragLabel === label) {
                    handleSize = 24;
                    handleColor = '#555';
                    drawValue = true;

                    const newHandleX = this.canvas.mouse[0];
                    t = saturate(invlerp(trackMinX, trackMaxX, newHandleX));
                    value = lerp(min, max, t);
                    handlePos[0] = lerp(trackMinX, trackMaxX, t);

                    if (!this.canvas.mouseButton)
                        this.sliderDragLabel = null;
                } else if (this.sliderDragLabel === null) {
                    if (vec2.distance(this.canvas.mouse, handlePos) <= 24) {
                        handleSize = 24;
                        drawValue = true;

                        if (this.canvas.mouseButton)
                            this.sliderDragLabel = label;
                    }
                }

                this.canvas.drawPoint(handlePos, handleColor, handleSize);

                ctx.save();
                ctx.font = `${this.canvas.getSize(24)}pt sans-serif`;

                if (drawValue) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(handlePos[0] - 40, handlePos[1] - 60, 80, 40);

                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#333';
                    ctx.fillText(value.toFixed(2), handlePos[0], handlePos[1] - 28);
                }

                ctx.fillStyle = this.sliderDragLabel === label ? '#333' : '#999';

                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, trackMinX - 24, trackY);

                ctx.restore();

                return value;
            };

            this.state.frustumFovy = slider({ x: 0.0, y: -0.7, min: 15, max: 180, value: this.state.frustumFovy, label: 'Field of View' });
            this.state.frustumAspect = slider({ x: 0.0, y: -0.78, min: 0.1, max: 3, value: this.state.frustumAspect, label: 'Aspect Ratio' });
            this.state.frustumFar = slider({ x: 0.0, y: -0.86, min: 0.1, max: 100, value: this.state.frustumFar, label: 'Far Plane' });
            this.state.frustumCubeLerp = slider({ x: 0.0, y: -0.94, min: 0.0, max: 1.0, value: this.state.frustumCubeLerp, label: 'Perspective Divide' });

            if (this.state.demo === Demo.CameraFrustumProjectionMatrix) {
                const mx = this.canvas.width - this.canvas.getSize(500), my = this.canvas.getSize(100);
                const ctx = this.canvas.ctx;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.strokeStyle = '#333333CC';
                ctx.lineWidth = this.canvas.getSize(4);
                ctx.fillRect(mx, my, this.canvas.getSize(450), this.canvas.getSize(240));
                ctx.strokeRect(mx, my, this.canvas.getSize(450), this.canvas.getSize(240));

                ctx.save();
                ctx.font = `${this.canvas.getSize(24)}pt sans-serif`;

                ctx.fillStyle = '#333';
                ctx.textAlign = 'left';
                ctx.fillText('Projection Matrix', mx, my - this.canvas.getSize(20));

                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                for (let x = 0; x < 4; x++) {
                    for (let y = 0; y < 4; y++) {
                        const n = m[y*4 + x];
                        ctx.fillStyle = n !== 0 ? '#333' : '#aaa';
                        const tx = mx + x * this.canvas.getSize(100) + this.canvas.getSize(110);
                        const ty = my + y * this.canvas.getSize(50) + this.canvas.getSize(65);
                        ctx.fillText(n.toFixed(2), tx, ty);
                    }
                }

                ctx.restore();
            }
        }
    }

    private setDemo(idx: Demo): void {
        if (idx === this.state.demo)
            return;

        this.state.demo = idx;
    }

    public update = () => {
        this.canvas.clearScreen('#fff');

        // Demo switch
        for (let i = 0; i < Demo.Count; i++)
            if (this.canvas.isKeyDownEventTriggered(`Digit${i + 1}`))
                this.setDemo(i);

        if (this.canvas.isKeyDownEventTriggered(`KeyP`))
            this.resetStateToDefault();

        switch (this.state.demo) {
        case Demo.DotProduct:
        case Demo.DotProductNormal:
        case Demo.SurfaceNormal:
        case Demo.PointLight:
        case Demo.PointLightPixel:
            this.update2D();
            break;
        case Demo.CameraFrustum:
        case Demo.CameraFrustumProjectionMatrix:
            this.update3D();
            break;
        }

        this.canvas.endFrame();

        this.saveState();
        requestAnimationFrame(this.update);
    };

    private loadState(): void {
        const stateString = window.localStorage.getItem('State');
        if (stateString !== null) {
            const state = JSON.parse(stateString) as typeof this.state;
            Object.assign(this.state, state);
        }

        this.state.surfaceNormal = vec2.normalize(vec2.create(), this.state.surfaceNormal);
        this.state.lightDir = vec2.normalize(vec2.create(), this.state.lightDir);
        this.state.lightPos = vec2.clone(this.state.lightPos);
    }

    private saveState(): void {
        window.localStorage.setItem('State', JSON.stringify(this.state));
    }

    private resetStateToDefault(): void {
        this.state = { ... this.stateDefault };
        this.saveState();
        this.loadState();
    }
}

function main() {
    const scene = new Viz();
    (window as any).scene = scene;
    scene.update();
}

main();
