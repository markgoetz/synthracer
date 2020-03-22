let canvas, context;
const FIXED_TIMESTEP = 1000/50;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const ROAD_WIDTH = 10;
const ROAD_SEGMENT_COUNT = 5000;
const SEGMENT_LENGTH = 100;
const SEGMENTS_PER_STRIP = 3;

const LANE_COUNT = 3;
const STRIPE_WIDTH = .2;

const CAMERA_POSITION = { x: 0, y: 3, z: -5 };
const CAMERA_SCREEN_DISTANCE = 30;

const MAX_DRAW_DISTANCE = 10000;

let playerPosition = { x: 0, y: 0, z: 0 };
let speed = 3;

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
    const cameraCoords = { x: x - CAMERA_POSITION.x, y: y - CAMERA_POSITION.y, z: z - CAMERA_POSITION.z };
    const projectionRatio = CAMERA_SCREEN_DISTANCE / cameraCoords.z;
    const projectedPos = { x: cameraCoords.x * projectionRatio, y: cameraCoords.y * projectionRatio };
    return ({
        x: (CANVAS_WIDTH / 2) + ((CANVAS_WIDTH / 2) * projectedPos.x),
        y: (CANVAS_HEIGHT / 2) - ((CANVAS_HEIGHT / 2) * projectedPos.y),
    });
};

const renderBackground = () => {
    const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#004042');
    gradient.addColorStop(1, '#017F84');
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
};

const renderRoad = () => {
    roadSegments.filter(
        segment => segment.z0 >= playerPosition.z && segment.z0 <= playerPosition.z + MAX_DRAW_DISTANCE
    )
        .forEach(segment => {
        const topLeft = worldToScreenCoordinates(segment.x0 - ROAD_WIDTH, segment.y0, segment.z0 - playerPosition.z);
        const topRight = worldToScreenCoordinates(segment.x0 + ROAD_WIDTH, segment.y0, segment.z0 - playerPosition.z);
        const bottomLeft = worldToScreenCoordinates(segment.x1 - ROAD_WIDTH, segment.y1, segment.z1 - playerPosition.z);
        const bottomRight = worldToScreenCoordinates(segment.x1 + ROAD_WIDTH, segment.y1, segment.z1 - playerPosition.z);
        drawPoly(
            { x: 0, y: topLeft.y },
            { x: CANVAS_WIDTH, y: topLeft.y },
            { x: CANVAS_WIDTH, y: bottomLeft.y },
            { x: 0, y: bottomLeft.y }, 
            segment.isStrip ? '#9A179D' : '#6D1970',
        );
        
        drawPoly(topLeft, topRight, bottomRight, bottomLeft, segment.isStrip ? '#351727' : '#2E1121');

        if (segment.isStrip) {
            for (let lane = 0; lane < LANE_COUNT - 1; lane++) {
                const laneOffset = ((lane + 1) * 2) / LANE_COUNT - 1;
                const laneX0 = segment.x0 + ROAD_WIDTH * laneOffset;
                const laneX1 = segment.x1 + ROAD_WIDTH * laneOffset;

                const tlStrip = worldToScreenCoordinates(laneX0 - STRIPE_WIDTH, segment.y0, segment.z0 - playerPosition.z);
                const trStrip = worldToScreenCoordinates(laneX0 + STRIPE_WIDTH, segment.y0, segment.z0 - playerPosition.z);
                const blStrip = worldToScreenCoordinates(laneX1 - STRIPE_WIDTH, segment.y1, segment.z1 - playerPosition.z);
                const brStrip = worldToScreenCoordinates(laneX1 + STRIPE_WIDTH, segment.y1, segment.z1 - playerPosition.z);
                drawPoly(tlStrip, trStrip, brStrip, blStrip, '#E8D717');
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

    for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
        if (i % SEGMENTS_PER_STRIP === 0) {
            isStrip = !isStrip;
        }

        roadSegments.push({
            x0: 0, y0: 0, z0: i * SEGMENT_LENGTH,
            x1: 0, y1: 0, z1: (i + 1) * SEGMENT_LENGTH,
            isStrip,
        });
    }
}

function init() {
    canvas = document.querySelector('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    context = canvas.getContext('2d');
    window.setInterval(update, FIXED_TIMESTEP);
    window.requestAnimationFrame(render);
    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);

    buildRoad();
}

init();
