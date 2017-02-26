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
    this.pixelsPerFt = 30;

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
    
    // Intended velocities
    velX: 0,
    velY: 0,
    velRot: 0,
    
    /*
    heading: 0, // heading that we think we have
    */
}

var inputs =
{
    // Input option - default to "direct" with 0 movement
    option: "direct",
    // Desired heading/speeds
    theta: 0,
    speed: 0,
    velRot: 0
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
	    
	ctx.fillStyle = "red";
	ctx.beginPath();
	ctx.arc(0, 0, 4, 0, 2 * Math.PI, false);
	ctx.fill();
	ctx.restore();
	
	document.getElementById("xPos").textContent = actualState.centerX.toFixed(2);
	document.getElementById("yPos").textContent = actualState.centerY.toFixed(2);
	document.getElementById("theta").textContent = (actualState.theta / Math.PI * 180.0).toFixed(1);
}

function updateRobotPosition(timeDiff)
{
    actualState.centerX = actualState.centerX + (timeDiff / 1000.0) * 
        (actualState.velX * Math.cos(actualState.theta) + actualState.velY * Math.sin(actualState.theta));
    actualState.centerY = actualState.centerY + (timeDiff / 1000.0) *
        (actualState.velX * Math.sin(-actualState.theta) + actualState.velY * Math.cos(actualState.theta));
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
        
    document.getElementById("velX").textContent = actualState.velX.toFixed(2);
    document.getElementById("velY").textContent = actualState.velY.toFixed(2);

    updateRobotPosition(timeDiff);
}

function updateRobotPlan(timeDiff)
{
    // Set velocities based on control option and parameters
    switch (inputs.option)
    {
        case "direct":
            //control.heading = control.heading + control.velRot * (timeDiff / 1000.0);
            control.velX = inputs.speed * Math.cos(inputs.theta + (actualState.theta /*+ inputs.velRot * (timeDiff / 1000.0)*/));
            control.velY = inputs.speed * Math.sin(inputs.theta + (actualState.theta /*+ inputs.velRot * (timeDiff / 1000.0)*/));
            control.velRot = inputs.velRot;

            break;
        default:
            console.error("Invalid control option somehow");
            break;
    }
    var a = 2;

    // Calculate wheel controls based on goal velocities
    control.wheel1 = (control.velY + control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
    control.wheel2 = (control.velY - control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
    control.wheel3 = (control.velY - control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
    control.wheel4 = (control.velY + control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
    document.getElementById("w1").textContent = control.wheel1.toFixed(2);
    document.getElementById("w2").textContent = control.wheel2.toFixed(2);
    document.getElementById("w3").textContent = control.wheel3.toFixed(2);
    document.getElementById("w4").textContent = control.wheel4.toFixed(2);
}


function onSubmitControlOption()
{
    var controlElt = document.getElementById("controlOption");
    var controlName = controlElt.value;
    console.log("Changing control mode: " + controlName);
    inputs.option = controlName;
    switch (controlName)
    {
        case "direct":
            inputs.theta = document.getElementById("direction").value * Math.PI / 180.0;
            inputs.speed = document.getElementById("speed").value;
            inputs.velRot = document.getElementById("rotation").value * Math.PI / 180.0;
            console.log(inputs.theta + " " + inputs.speed + " " + inputs.velRot);

            break;

        default:
        control.option = ""
            console.error("Invalid control option somehow");
            break;
    }
}

function updateCanvas(canvas, timeDiff)
{
    // Clear the canvas before drawing
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    updateRobotPlan(timeDiff);
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