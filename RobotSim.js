//grid width and height
var pixelsPerFt = 40;
var gridWidth = pixelsPerFt * 30;
var gridHeight = pixelsPerFt * 15;

window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
    function(callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

var robotSpecs = 
{
    "width": pixelsPerFt * 2,
    "height": pixelsPerFt * 4,
    wheelRadius: 1
}

var robotState = 
{
    "centerRow": gridHeight/2,
    "centerCol": gridWidth/2,
    "heading": 0,
    velX: 0,
    velY: 0,
    velRot: 0
}

// Angular rotation rate of wheel, positive means going forward
var control = 
{
    wheel1: -40,
    wheel2: 40,
    wheel3: 40,
    wheel4: -40
}

function drawGrid()
{
    var context = document.getElementById("gridCanvas").getContext("2d");
    for (var x = 0; x <= gridWidth; x += pixelsPerFt/2) {
        context.moveTo(0.5 + x, 0);
        context.lineTo(0.5 + x, gridHeight);
    }

    for (var x = 0; x <= gridHeight; x += pixelsPerFt/2) {
        context.moveTo(0, 0.5 + x);
        context.lineTo(gridWidth, 0.5 + x);
    }

    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();
}

// Draws robot given its 
function drawRobot()
{
	var ctx=document.getElementById("robotCanvas").getContext("2d");
	ctx.save();
	ctx.translate(robotState.centerCol, robotState.centerRow);
	ctx.rotate(robotState.heading);
	ctx.fillStyle = "black";
	ctx.fillRect(-robotSpecs.width/2, -robotSpecs.height/2, robotSpecs.width, robotSpecs.height);
	ctx.fillStyle = "white";
	ctx.fillRect(0, -robotSpecs.height/2+5, robotSpecs.width/10, robotSpecs.height/10);
	ctx.restore();
}

function updateRobotPosition(timeDiff)
{
    robotState.centerRow = robotState.centerRow - robotState.velY * (timeDiff / 1000.0);
    robotState.centerCol = robotState.centerCol + robotState.velX * (timeDiff / 1000.0);
    robotState.heading = (robotState.heading + 
        robotState.velRot * (timeDiff / 1000.0)) % (Math.PI * 2);
        
    // Move robot back to center if it's about to go off screen.
    if (robotState.centerRow < pixelsPerFt * 3 || robotState.centerRow > pixelsPerFt * 12)
    {
        robotState.centerRow = gridHeight/2;
    }
    if (robotState.centerCol < pixelsPerFt * 3 || robotState.centerCol > pixelsPerFt * 27)
    {
        robotState.centerCol = gridWidth/2;
    }
}

// Update robot state given control signals and last state
function updateRobotState(timeDiff)
{
    robotState.velX = (robotSpecs.wheelRadius/4) *
        (control.wheel1-control.wheel2-control.wheel3+control.wheel4);
    robotState.velY = (robotSpecs.wheelRadius/4) *
        (control.wheel1+control.wheel2+control.wheel3+control.wheel4);
    robotState.velRot = robotSpecs.wheelRadius/
        (4*(robotSpecs.width/2 + robotSpecs.height/2)) *
        (-control.wheel1+control.wheel2-control.wheel3+control.wheel4);
    
    updateRobotPosition(timeDiff);
}

function updateCanvas(canvas, timeDiff)
{
    // Clear the canvas before drawing
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    updateRobotState(timeDiff);
    drawRobot();
}

// Animate the frame
function animate(canvas, currTime)
{
    // update
    var time = (new Date()).getTime();
    var timeDiff = time-currTime;

    updateCanvas(document.getElementById("robotCanvas"), timeDiff);

    // request new frame
    requestAnimationFrame(function() {
        animate(canvas, time);
    });
}

// Initial drawing
drawGrid();
drawRobot();

// wait one second before starting animation
setTimeout(function() {
    var startTime = (new Date()).getTime();
    animate(document.getElementById("robotCanvas"), startTime);
}, 1000);