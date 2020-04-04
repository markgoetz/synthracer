let canvas, context;
const FIXED_TIMESTEP = 1/50;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const ROAD_WIDTH = 10;
const ROAD_SEGMENT_COUNT = 4096;
const SEGMENT_LENGTH = 100;
const SEGMENTS_PER_STRIP = 3;

const LANE_COUNT = 3;
const STRIPE_WIDTH = .2;

const CAMERA_OFFSET = { x: 0, y: 3, z: -5 };
const CAMERA_SCREEN_DISTANCE = 30;

const MAX_DRAW_DISTANCE = 10000;

const SKY_COLOR_DARK = '#004042';
const SKY_COLOR_LIGHT = '#017F84';
const SUN_COLOR_DARK = '#DC5227';
const SUN_COLOR_LIGHT = '#CD910D';
const TERRAIN_COLOR_LIGHT = '#8713D7';
const TERRAIN_COLOR_DARK = '#66179D';
const ROAD_COLOR_LIGHT = '#351727';
const ROAD_COLOR_DARK = '#2E1121';
const LINE_COLOR = '#F7AC06';
const SUN_CENTER_X = 632;
const SUN_CENTER_Y = 304;
const SUN_RADIUS = 160;
const SUN_GRADIENT_PERCENTAGE = .5;

const CURVE_LENGTH = 50;
const TAPER_LENGTH = 5;
const MIN_X_FREQUENCY = .002;
const MAX_X_FREQUENCY = .05;
const MIN_X_SCALE = -30;
const MAX_X_SCALE = 30;
const MIN_Y_FREQUENCY = .002;
const MAX_Y_FREQUENCY = .05;
const MIN_Y_SCALE = -30;
const MAX_Y_SCALE = 30;

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp = (p, a, b) => a + clamp(p, 0, 1) * (b - a);
const random = (min, max) => min + lerp(Math.random(), 0, max - min);
const easeInOut = (p, a, b) => lerp((-Math.cos(p*Math.PI)/2) + 0.5, a, b);
const addVectors = (v1, v2) => ({ x: +v1.x + +v2.x, y: +v1.y + +v2.y, z: +v1.z + +v2.z });

let skyGradient, sunGradient;

let playerPosition = { x: 0, y: 0, z: 0 };
let cameraPosition = { x: 0, y: 0, z: 0 };
let speed = 400;

const KEY_CODES = {
    a: 'left',
    d: 'right',
    s: 'down',
    w: 'up',
};

let keyStatus = {};

let roadSegments = [];

function keyDownHandler(e) {
    if (e.repeat !== true && KEY_CODES[e.key] != null) {
        keyStatus[KEY_CODES[e.key]] = true;
    }
}

function keyUpHandler(e) {
    if (KEY_CODES[e.key] != null) {
        keyStatus[KEY_CODES[e.key]] = false;
    }
}

const update = () => {
    playerPosition.z += (speed * FIXED_TIMESTEP);
    const currentSegment = roadSegments.find(segment => segment.z0 <= playerPosition.z && segment.z1 > playerPosition.z);
    playerPosition.y = currentSegment.y0;
    cameraPosition = addVectors(playerPosition, CAMERA_OFFSET);
};

const drawPoly = (p1, p2, p3, p4, color) => {
    context.beginPath();
    context.fillStyle = color;
    context.moveTo(p1.x, p1.y | 0);
    context.lineTo(p2.x, p2.y | 0);
    context.lineTo(p3.x, p3.y | 0);
    context.lineTo(p4.x, p4.y | 0);
    context.lineTo(p1.x, p1.y | 0);
    context.fill();
};

const worldToScreenCoordinates = (x, y, z) => {
    const cameraCoords = {
        x: x - cameraPosition.x,
        y: y - cameraPosition.y,
        z: z - cameraPosition.z,
    };
    const projectionRatio = CAMERA_SCREEN_DISTANCE / cameraCoords.z;
    const projectedPos = { x: cameraCoords.x * projectionRatio, y: cameraCoords.y * projectionRatio };
    return ({
        x: (CANVAS_WIDTH / 2) + ((CANVAS_WIDTH / 2) * projectedPos.x),
        y: (CANVAS_HEIGHT / 2) - ((CANVAS_HEIGHT / 2) * projectedPos.y),
    });
};

const renderBackground = () => {
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.fillStyle = sunGradient;
    context.filter = 'drop-shadow(0 0 25px #D76A1D)';
    context.beginPath();
    context.arc(SUN_CENTER_X, SUN_CENTER_Y, SUN_RADIUS, 0, 2 * Math.PI);
    context.fill();
    context.filter = 'none';
};

const renderRoad = () => {
    roadSegments.filter(
        segment => segment.z0 >= cameraPosition.z && segment.z0 <= cameraPosition.z + MAX_DRAW_DISTANCE
    ).forEach(segment => {
        const topLeft = worldToScreenCoordinates(segment.x0 - ROAD_WIDTH, segment.y0, segment.z0);
        const topRight = worldToScreenCoordinates(segment.x0 + ROAD_WIDTH, segment.y0, segment.z0);
        const bottomLeft = worldToScreenCoordinates(segment.x1 - ROAD_WIDTH, segment.y1, segment.z1);
        const bottomRight = worldToScreenCoordinates(segment.x1 + ROAD_WIDTH, segment.y1, segment.z1);
        drawPoly(
            { x: 0, y: topLeft.y },
            { x: CANVAS_WIDTH, y: topLeft.y },
            { x: CANVAS_WIDTH, y: bottomLeft.y },
            { x: 0, y: bottomLeft.y }, 
            segment.isStrip ? TERRAIN_COLOR_LIGHT : TERRAIN_COLOR_DARK,
        );
        
        drawPoly(topLeft, topRight, bottomRight, bottomLeft, segment.isStrip ? ROAD_COLOR_LIGHT : ROAD_COLOR_DARK);

        if (segment.isStrip) {
            for (let lane = 0; lane < LANE_COUNT - 1; lane++) {
                const laneOffset = ((lane + 1) * 2) / LANE_COUNT - 1;
                const laneX0 = segment.x0 + ROAD_WIDTH * laneOffset;
                const laneX1 = segment.x1 + ROAD_WIDTH * laneOffset;

                const tlStrip = worldToScreenCoordinates(laneX0 - STRIPE_WIDTH, segment.y0, segment.z0);
                const trStrip = worldToScreenCoordinates(laneX0 + STRIPE_WIDTH, segment.y0, segment.z0);
                const blStrip = worldToScreenCoordinates(laneX1 - STRIPE_WIDTH, segment.y1, segment.z1);
                const brStrip = worldToScreenCoordinates(laneX1 + STRIPE_WIDTH, segment.y1, segment.z1);
                drawPoly(tlStrip, trStrip, brStrip, blStrip, LINE_COLOR);
            }
        }
    });
};

const render = () => {
    renderBackground();
    renderRoad();

    window.requestAnimationFrame(render);
};

const buildRoad = () => {
    let isStrip = false;
    let xStart = 0, xEnd = 0, yStart = 0, yEnd = 0;

    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
        if (i % SEGMENTS_PER_STRIP === 0) {
            isStrip = !isStrip;
        }

        const curveTimer = i % CURVE_LENGTH;

        if (curveTimer === 0) {
            xStart = xEnd;
            yStart = yEnd;
            xEnd = xEnd + random(MIN_X_SCALE, MAX_X_SCALE);
            yEnd = yEnd + random(MIN_Y_SCALE, MAX_Y_SCALE);
        }

        const x0 = easeInOut(curveTimer / CURVE_LENGTH, xStart, xEnd);
        const y0 = easeInOut(curveTimer / CURVE_LENGTH, yStart, yEnd);

        roadSegments.push({ x0, y0, z0: i * SEGMENT_LENGTH, isStrip });
    }

    for (let i = 1; i < ROAD_SEGMENT_COUNT; i++) {
        roadSegments[i - 1].x1 = roadSegments[i].x0;
        roadSegments[i - 1].y1 = roadSegments[i].y0;
        roadSegments[i - 1].z1 = roadSegments[i].z0;
    }
    roadSegments[ROAD_SEGMENT_COUNT - 1].x1 = roadSegments[ROAD_SEGMENT_COUNT - 1].x0;
    roadSegments[ROAD_SEGMENT_COUNT - 1].y1 = roadSegments[ROAD_SEGMENT_COUNT - 1].y0;
    roadSegments[ROAD_SEGMENT_COUNT - 1].z1 = roadSegments[ROAD_SEGMENT_COUNT - 1].z0;
}

function init() {
    canvas = document.querySelector('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    context = canvas.getContext('2d');

    skyGradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, SKY_COLOR_DARK);
    skyGradient.addColorStop(1, SKY_COLOR_LIGHT);
    
    sunGradient = context.createLinearGradient(0, SUN_CENTER_Y - SUN_RADIUS, 0, SUN_CENTER_Y + SUN_RADIUS);
    sunGradient.addColorStop(0, SUN_COLOR_DARK);
    sunGradient.addColorStop(SUN_GRADIENT_PERCENTAGE, SUN_COLOR_LIGHT);

    window.setInterval(update, FIXED_TIMESTEP / 1000);
    window.requestAnimationFrame(render);
    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);

    buildRoad();
}

init();
