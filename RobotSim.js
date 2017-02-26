// Animation help
window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
    function(callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

// Specs of the HTML page
var page = new function()
{
    this.pixelsPerFt = 40;

    // Units in feet
    this.realGridWidth = 30;
    this.realGridHeight = 15;

    // Units in pixels
    this.displayGridWidth = this.realGridWidth * this.pixelsPerFt;
    this.displayGridHeight = this.realGridHeight * this.pixelsPerFt;

    // Center of the grid corresponds to these coordinates in feet
    this.centerX = 0;
    this.centerY = 0;
}

// Units of feet
var robotSpecs = new function() 
{
    this.realWidth = 2;
    this.realHeight = 4;
    this.wheelRadius = 1;
    this.displayWidth = this.realWidth * page.pixelsPerFt;
    this.displayHeight = this.realHeight * page.pixelsPerFt;
}

var actualState = 
{
    // Units of feet
    centerX: 0,
    centerY: 0,
    // Radians
    theta: 0,
    // Ft/sec
    velX: 0,
    velY: 0,
    // Radians/sec
    velRot: 0
}

/*var perceivedState = 
{
    
}*/

var control = 
{
    // Angular rotation rate of wheel, positive means going forward
    wheel1: 0,
    wheel2: 0,
    wheel3: 0,
    wheel4: 0,
    /*
    option: "direct", // Control option, default to "direct" with 0 movement
    heading: 0, // heading that we think we have
    // velocities that we want to have
    velX: 0,
    velY: 0,
    velRot: 0,
    // Parameters connected to control options
    direction: 0,
    speed: 0,
    rotation: 0*/
}

function drawGrid()
{
    var context = document.getElementById("gridCanvas").getContext("2d");
    for (var x = 0; x <= page.displayGridWidth; x += page.pixelsPerFt/2) {
        context.moveTo(0.5 + x, 0);
        context.lineTo(0.5 + x, page.displayGridHeight);
    }

    for (var x = 0; x <= page.displayGridHeight; x += page.pixelsPerFt/2) {
        context.moveTo(0, 0.5 + x);
        context.lineTo(page.displayGridWidth, 0.5 + x);
    }

    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();
}

// Draws robot given its 
function drawRobot()
{
	var ctx=document.getElementById("robotCanvas").getContext("2d");
	ctx.save();
	var centerCol = (actualState.centerX - page.centerX + page.realGridWidth / 2) * page.pixelsPerFt;
	var centerRow = (page.centerY - actualState.centerY + page.realGridHeight / 2) * page.pixelsPerFt;
	ctx.translate(centerCol, centerRow);
	ctx.rotate(actualState.theta);
	ctx.fillStyle = "black";
	ctx.fillRect(-robotSpecs.displayWidth/2, -robotSpecs.displayHeight/2,
	    robotSpecs.displayWidth, robotSpecs.displayHeight);
	ctx.fillStyle = "white";
	ctx.fillRect(-robotSpecs.displayWidth/20, -robotSpecs.displayHeight/2 + 5,
	    robotSpecs.displayWidth/10, robotSpecs.displayHeight/10);
	ctx.restore();
	
	document.getElementById("xPos").textContent = actualState.centerX.toFixed(2);
	document.getElementById("yPos").textContent = actualState.centerY.toFixed(2);
	document.getElementById("theta").textContent = (actualState.theta / Math.PI * 180.0).toFixed(1);
}

function updateRobotPosition(timeDiff)
{
    actualState.centerX = actualState.centerX + actualState.velX * (timeDiff / 1000.0);
    actualState.centerY = actualState.centerY + actualState.velY * (timeDiff / 1000.0);
    actualState.theta = (actualState.theta - actualState.velRot * (timeDiff / 1000.0)) % (Math.PI * 2);
        
    // Move robot back to center if it's about to go off screen.
    if (actualState.centerX <= page.centerX - (page.realGridWidth / 2 - 3) ||
        actualState.centerX >= page.centerX + (page.realGridWidth / 2 - 3))
    {
        page.centerX = actualState.centerX;
        page.centerY = actualState.centerY;
    }
    if (actualState.centerY <= page.centerY - (page.realGridHeight / 2 - 3) ||
        actualState.centerY >= page.centerY + (page.realGridHeight / 2 - 3))
    {
        page.centerX = actualState.centerX;
        page.centerY = actualState.centerY;
    }
}


// Update robot state given control signals and last state
function updateRobotState(timeDiff)
{
    actualState.velX = (robotSpecs.wheelRadius/4) *
        (control.wheel1-control.wheel2-control.wheel3+control.wheel4);
    actualState.velY = (robotSpecs.wheelRadius/4) *
        (control.wheel1+control.wheel2+control.wheel3+control.wheel4);
    actualState.velRot = robotSpecs.wheelRadius/
        (4*(robotSpecs.realWidth/2 + robotSpecs.realHeight/2)) *
        (-control.wheel1+control.wheel2-control.wheel3+control.wheel4);

    updateRobotPosition(timeDiff);
}

/*
function updateRobotPlan(timeDiff)
{
    // Set velocities based on control option and parameters
    switch (control.option)
    {
        case "direct":
            // TODO: fix up angles and stuff
            control.velRot = control.rotation;
            control.heading = control.heading + control.velRot * (timeDiff / 1000.0);
            control.velX = control.speed * Math.cos(control.direction - control.heading);
            control.velY = control.speed * Math.sin(control.direction - control.heading);

            break;
        default:
            console.error("Invalid control option somehow");
            break;
    }
    
    // Calculate wheel controls based on goal velocities
    control.wheel1 = (control.velY + control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
    control.wheel2 = (control.velY - control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
    control.wheel3 = (control.velY - control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
    control.wheel4 = (control.velY + control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
}

function onSubmitControlOption()
{
    var controlElt = document.getElementById("controlOption");
    var controlName = controlElt.value;
    console.log("Changing control mode: " + controlName);
    control.option = controlName;
    switch (controlName)
    {
        case "direct":
            control.direction = document.getElementById("direction").value;
            control.speed = document.getElementById("speed").value;
            control.rotation = document.getElementById("rotation").value;
            console.log(control.direction + " " + control.speed + " " + control.rotation);

            break;

        default:
        control.option = ""
            console.error("Invalid control option somehow");
            break;
    }
}

*/
function updateCanvas(canvas, timeDiff)
{
    // Clear the canvas before drawing
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    //updateRobotPlan(timeDiff);
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