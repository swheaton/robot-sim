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
var page = new function() {
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
var robotSpecs = new function() {
    this.realWidth = 2;
    this.realHeight = 4;
    this.wheelRadius = 1;
    this.displayWidth = this.realWidth * page.pixelsPerFt;
    this.displayHeight = this.realHeight * page.pixelsPerFt;
    this.maxVelocity = 15.0;
}

var actualState = {
    // Units of feet
    centerX: 0,
    centerY: 0,
    lastCenterX: 0,
    lastCenterY: 0,
    // Radians
    theta: 0,
    // Ft/sec
    velX: 0,
    velY: 0,
    // Radians/sec
    velRot: 0,
    stopwatchTime: 0,
    forceStop: false
}

var control = {
    // Angular rotation rate of wheel, positive means going forward
    wheel1: 0,
    wheel2: 0,
    wheel3: 0,
    wheel4: 0,

    // Intended velocities
    velX: 0,
    velY: 0,
    velRot: 0
}

var inputs = {
    // Input option - default to "direct" with 0 movement
    option: "none",
    // Desired heading/speeds
    theta: 0,
    speed: 0,
    velRot: 0,
    pointX: 0,
    pointY: 0,
    waypointArray: [],
    radius: 0,
    inclination: 0,
    time: [0.0]
}

var goalPath = {
    pointArray: [],
    radii: [],
    type: "none",
    centerX: 0.0,
    centerY: 0.0
}

function drawGrid() {
    var context = document.getElementById("gridCanvas").getContext("2d");
    for (var x = 0; x <= page.displayGridWidth; x += page.pixelsPerFt / 2) {
        context.moveTo(0.5 + x, 0);
        context.lineTo(0.5 + x, page.displayGridHeight);
    }

    for (var x = 0; x <= page.displayGridHeight; x += page.pixelsPerFt / 2) {
        context.moveTo(0, 0.5 + x);
        context.lineTo(page.displayGridWidth, 0.5 + x);
    }

    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();
}

function robotXToCol(x) {
    return (x - page.centerX + page.realGridWidth / 2) * page.pixelsPerFt;
}

function robotYToRow(y) {
    return (page.centerY - y + page.realGridHeight / 2) * page.pixelsPerFt;
}

// Draws robot given its 
function drawRobot() {
    var ctx = document.getElementById("robotCanvas").getContext("2d");
    ctx.save();

    // Draw the rectangular robot
    var centerCol = robotXToCol(actualState.centerX);
    var centerRow = robotYToRow(actualState.centerY);
    ctx.translate(centerCol, centerRow);
    ctx.rotate(actualState.theta);
    ctx.fillStyle = "black";
    ctx.fillRect(-robotSpecs.displayWidth / 2, -robotSpecs.displayHeight / 2,
        robotSpecs.displayWidth, robotSpecs.displayHeight);

    // Forward heading marker
    ctx.fillStyle = "white";
    ctx.fillRect(-robotSpecs.displayWidth / 20, -robotSpecs.displayHeight / 2 + 5,
        robotSpecs.displayWidth / 10, robotSpecs.displayHeight / 10);

    // Center dot
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.restore();

    // Draw path robot took
    var pathCtx = document.getElementById("actualPathCanvas").getContext("2d");
    pathCtx.strokeStyle = "red";
    pathCtx.moveTo(robotXToCol(actualState.lastCenterX), robotYToRow(actualState.lastCenterY));
    pathCtx.lineTo(robotXToCol(actualState.centerX), robotYToRow(actualState.centerY));
    pathCtx.stroke();

    // Update numerical outputs
    document.getElementById("xPos").textContent = actualState.centerX.toFixed(2);
    document.getElementById("yPos").textContent = actualState.centerY.toFixed(2);
    document.getElementById("theta").textContent = (actualState.theta / Math.PI * 180.0).toFixed(1);
}

function clearDrawnPath() {
    var pathCanvas = document.getElementById("actualPathCanvas");
    pathCanvas.width = pathCanvas.width;
    drawGoalPath();
    console.log("Relocating frame and redrawing goal path. Also clearing actual path");
    // TODO figure out how to just add to actual path instead of clearing
}

function updateRobotPosition(timeDiff) {
    actualState.lastCenterX = actualState.centerX;
    actualState.lastCenterY = actualState.centerY;
    actualState.centerX = actualState.centerX + (timeDiff / 1000.0) *
        (actualState.velX * Math.cos(actualState.theta) + actualState.velY * Math.sin(actualState.theta));
    actualState.centerY = actualState.centerY + (timeDiff / 1000.0) *
        (actualState.velX * Math.sin(-actualState.theta) + actualState.velY * Math.cos(actualState.theta));
    actualState.theta = (actualState.theta - actualState.velRot * (timeDiff / 1000.0) + 2 * Math.PI) % (Math.PI * 2);

    // Move robot back to center if it's about to go off screen.
    if (actualState.centerX <= page.centerX - (page.realGridWidth / 2 - 3) ||
        actualState.centerX >= page.centerX + (page.realGridWidth / 2 - 3)) {
        page.centerX = actualState.centerX;
        page.centerY = actualState.centerY;
        clearDrawnPath();
    }
    if (actualState.centerY <= page.centerY - (page.realGridHeight / 2 - 3) ||
        actualState.centerY >= page.centerY + (page.realGridHeight / 2 - 3)) {
        page.centerX = actualState.centerX;
        page.centerY = actualState.centerY;
        clearDrawnPath();
    }
}

// Update robot state given control signals and last state
function updateRobotState(timeDiff) {
    actualState.velX = (robotSpecs.wheelRadius / 4) *
        (control.wheel1 - control.wheel2 - control.wheel3 + control.wheel4);
    actualState.velY = (robotSpecs.wheelRadius / 4) *
        (control.wheel1 + control.wheel2 + control.wheel3 + control.wheel4);
    actualState.velRot = robotSpecs.wheelRadius /
        (4 * (robotSpecs.realWidth / 2 + robotSpecs.realHeight / 2)) *
        (-control.wheel1 + control.wheel2 - control.wheel3 + control.wheel4);

    document.getElementById("velX").textContent = actualState.velX.toFixed(2);
    document.getElementById("velY").textContent = actualState.velY.toFixed(2);

    updateRobotPosition(timeDiff);
}

// Returns time left on the timer, OR timeDiff if it is larger since we shouldn't use an interval smaller than the
//	simulation cycle
function getTimeLeft(timeDiff) {
    return Math.max(timeDiff / 1000.0, inputs.time[0] - ((new Date()).getTime() - actualState.stopwatchTime) / 1000.0);
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function getPoint() {
    if (inputs.waypointArray.length < 2) {
        return {
            x: 0,
            y: 0
        };
    }
    else {
        return {
            x: Number(inputs.waypointArray[0]),
            y: Number(inputs.waypointArray[1])
        };
    }
}

// "Sanitize" velocities by making sure they make sense
function sanitizeVelocities()
{
    var velocity = Math.sqrt(control.velX * control.velX + control.velY * control.velY);
    // Should never be trying to go more than slightly over max speed
    if (velocity > robotSpecs.maxVelocity * 5.0)
    {
        console.error("Tried to go too fast. Something went wrong. Just stopping because we're most likely done anyways.");
        control.velX = 0.0;
        control.velY = 0.0;
        this.forceStop = true;
    }
    // Velocity is slightly over the max, so scale it back to 15.
    else if (velocity > robotSpecs.maxVelocity)
    {
        console.log("Scaling velocity back to 15 ft/s");
        var ratio = robotSpecs.maxVelocity / velocity;
        control.velX *= ratio;
        control.velY *- ratio;
    }
}

function updateRobotPlan(timeDiff) {
    // Set velocities based on control option and parameters
    var calcControls = true;
    var timeLeft = getTimeLeft(timeDiff);
    switch (inputs.option) {
        case "none":
            control.velX = 0.0;
            control.velY = 0.0;
            control.velRot = 0.0;
            break;
        case "direct":
            control.velX = inputs.speed * Math.cos(inputs.theta + (actualState.theta /*+ inputs.velRot * (timeDiff / 1000.0)*/ ));
            control.velY = inputs.speed * Math.sin(inputs.theta + (actualState.theta /*+ inputs.velRot * (timeDiff / 1000.0)*/ ));
            control.velRot = inputs.velRot;
            break;

        case "wheelControl":
            calcControls = false;
            break;

        case "point":
        case "rect":
            var point = getPoint();
            //console.log("curr point: " + point);
            if (this.forceStop == true || Math.abs(point.y - actualState.centerY) < 0.005 && Math.abs(point.x - actualState.centerX) < 0.005) {
                control.velX = 0.0;
                control.velY = 0.0;
                //console.log(0);
                if (inputs.waypointArray.length > 2) {
                    // We've completed a waypoint
                    inputs.time = inputs.time.splice(1, inputs.time.length);
                    actualState.stopwatchTime = (new Date()).getTime();
                    inputs.waypointArray = inputs.waypointArray.splice(2, inputs.waypointArray.length);
                    console.log("popped. time: " + inputs.time + " points: " + inputs.waypointArray);
                }
                this.forceStop = false;
            }
            else {
                var distance = dist(actualState.centerX, actualState.centerY, point.x, point.y);
                var targetTheta = Math.atan2(point.y - actualState.centerY, point.x - actualState.centerX);
                control.velX = distance / timeLeft * Math.cos(targetTheta + (actualState.theta));
                control.velY = distance / timeLeft * Math.sin(targetTheta + (actualState.theta));
                //console.log(control.velX, control.velY);
            }
            if (Math.abs(inputs.theta - actualState.theta) < 0.005) {
                control.velRot = 0.0;
            }
            else {
                control.velRot = -(inputs.theta - actualState.theta) / timeLeft;
            }
            break;

        case "eight":
        case "circle":
            var currInclination = (Math.atan2(inputs.waypointArray[1] - actualState.centerY, inputs.waypointArray[0] - actualState.centerX) +
                2 * Math.PI) % (2 * Math.PI);
            var targetTheta = currInclination + Math.PI / 2;

            // Error correction
            targetTheta = targetTheta - (dist(inputs.waypointArray[0], inputs.waypointArray[1], actualState.centerX, actualState.centerY) - inputs.radius);

            // Stop case
            if (this.forceStop == true || timeLeft * 1000.0 <= 2 * timeDiff && Math.abs(currInclination - inputs.inclination) < 0.05) {
                control.velX = 0.0;
                control.velY = 0.0;

                // Got more points to take care of
                if (inputs.waypointArray.length > 2) {
                    inputs.time = inputs.time.splice(1, inputs.time.length);
                    inputs.waypointArray = inputs.waypointArray.splice(2, inputs.waypointArray.length);
                    actualState.stopwatchTime = (new Date()).getTime();

                    // TODO REMOVE HACK
                    inputs.inclination = inputs.inclination2;
                    inputs.radius = inputs.radius2;
                }
                this.forceStop = false;
            }
            else {
                var angleLeft = (currInclination - inputs.inclination + 2 * Math.PI) % (2 * Math.PI);
                if (angleLeft < 0.05 && timeLeft * 1000.0 > 2 * timeDiff) {
                    angleLeft = 2 * Math.PI;
                }

                control.velX = angleLeft * inputs.radius / timeLeft * Math.cos(targetTheta + (actualState.theta));
                control.velY = angleLeft * inputs.radius / timeLeft * Math.sin(targetTheta + (actualState.theta));
            }
            control.velRot = 0.0;
            break;

        default:
            console.error("Invalid control option somehow");
            break;
    }
    
    sanitizeVelocities();

    // Calculate wheel controls based on goal velocities
    if (calcControls === true) {
        control.wheel1 = (control.velY + control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
        control.wheel2 = (control.velY - control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
        control.wheel3 = (control.velY - control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
        control.wheel4 = (control.velY + control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
    }

    document.getElementById("w1").textContent = control.wheel1.toFixed(2);
    document.getElementById("w2").textContent = control.wheel2.toFixed(2);
    document.getElementById("w3").textContent = control.wheel3.toFixed(2);
    document.getElementById("w4").textContent = control.wheel4.toFixed(2);
}

function drawGoalPath()
{
    // Clear goal path canvas
    var goalCanvas = document.getElementById("goalPathCanvas");
    goalCanvas.width = goalCanvas.width;
    var ctx = goalCanvas.getContext("2d");

    // Line path
    switch (goalPath.type)
    {
        case "lines":
            // Draw line to point
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = "blue";
            ctx.moveTo(robotXToCol(goalPath.centerX), robotYToRow(goalPath.centerY));
            for (var i = 0; i < goalPath.pointArray.length; i += 2) {
                ctx.lineTo(robotXToCol(goalPath.pointArray[i]), robotYToRow(goalPath.pointArray[i + 1]));
            }
            ctx.stroke();
            ctx.restore();
            break;
        case "circles":
            ctx.save();
            ctx.strokeStyle = "blue";
            for (var i = 0; i < goalPath.pointArray.length; i += 2)
            {
                ctx.beginPath();
                ctx.arc(robotXToCol(goalPath.pointArray[i]), robotYToRow(goalPath.pointArray[i + 1]),
                    goalPath.radii[i/2] * page.pixelsPerFt, 0, 2 * Math.PI, false);
                ctx.stroke();
                ctx.closePath();
            }
            ctx.restore();
            break;
            
        default:
            break;
    }
}

function errorCheckSpeed(speed)
{
    console.log("Required speed: " + speed);
    if (speed > robotSpecs.maxVelocity)
    {
        alert("Necessary velocity of " + speed + " is greater than max of 15.0 ft/s");
        inputs.option = "none";
        return false;
    }
    return true;
}

function onSubmitControlOption() {
    var controlElt = document.getElementById("controlOption");
    var controlName = controlElt.value;
    console.log("Changing control mode: " + controlName);
    inputs.option = controlName;
    actualState.stopwatchTime = (new Date()).getTime();

    // Also clear actual path canvas too
    var pathCanvas = document.getElementById("actualPathCanvas");
    pathCanvas.width = pathCanvas.width;

    inputs.waypointArray = [];
    inputs.time = [];
    inputs.time.push(Number(document.getElementById("time").value));
    
    var requiredSpeed = 0.0;
    switch (controlName) {
        case "direct":
            inputs.theta = Number(document.getElementById("direction").value) * Math.PI / 180.0;
            inputs.speed = Number(document.getElementById("speed").value);
            inputs.velRot = Number(document.getElementById("rotation").value) * Math.PI / 180.0;
            requiredSpeed = inputs.speed;
            console.log("Theta, Speed, VelRot: " + inputs.theta + " " + inputs.speed + " " + inputs.velRot);
            break;

        case "wheelControl":
            control.wheel1 = Number(document.getElementById("wheel1").value);
            control.wheel2 = Number(document.getElementById("wheel2").value);
            control.wheel3 = Number(document.getElementById("wheel3").value);
            control.wheel4 = Number(document.getElementById("wheel4").value);
            // TODO check requiredSpeed for wheel control
            console.log("Wheel 1-4: " + control.wheel1 + " " + control.wheel2 + " " + control.wheel3 + " " + control.wheel4);
            break;

        case "point":
            inputs.theta = Number(document.getElementById("direction").value) * Math.PI / 180.0;

            // Get waypoints
            inputs.waypointArray = document.getElementById("Waypoints").value.split(",");
            if (inputs.waypointArray.length == 1)
            {
                inputs.waypointArray = [];
            }
            inputs.waypointArray.push(Number(document.getElementById("PointX").value));
            inputs.waypointArray.push(Number(document.getElementById("PointY").value));

            // Break up path into time chunks based on distance
            var overallTime = inputs.time[0];
            inputs.time = [];
            inputs.time.push(overallTime * dist(actualState.centerX, actualState.centerY,
                inputs.waypointArray[0], inputs.waypointArray[1]));
            var totalDist = dist(actualState.centerX, actualState.centerY,
                inputs.waypointArray[0], inputs.waypointArray[1]);
            for (var i = 2; i < inputs.waypointArray.length; i += 2) {
                inputs.time.push(overallTime * dist(inputs.waypointArray[i - 2], inputs.waypointArray[i - 1],
                    inputs.waypointArray[i], inputs.waypointArray[i + 1]));
                totalDist += dist(inputs.waypointArray[i - 2], inputs.waypointArray[i - 1],
                    inputs.waypointArray[i], inputs.waypointArray[i + 1])
            }
            console.log(inputs.time);
            for (var i = 0; i < inputs.time.length; i++) {
                inputs.time[i] /= totalDist;
            }

            requiredSpeed = totalDist / overallTime;

            console.log("(theta: waypoints): " + inputs.theta + ": " + inputs.waypointArray);
            console.log("times: " + inputs.time);

            // Set up goal path for drawing
            goalPath.type = "lines";
            goalPath.pointArray = inputs.waypointArray;

            break;

        case "rect":
            var length1 = Number(document.getElementById("length1").value);
            var length2 = Number(document.getElementById("length2").value);
            inputs.inclination = Number(Math.PI / 180.0 * document.getElementById("inclination").value);
            inputs.inclination = (inputs.inclination + Math.PI * 2) % (Math.PI * 2);

            // Add waypoints as corners of rect
            var theAngle = Math.atan(length2 / length1);
            console.log(theAngle);
            var hypotenuse = Math.sqrt(length2 * length2 + length2 * length2);
            inputs.waypointArray.push(actualState.centerX + length1 * Math.cos(theAngle + inputs.inclination));
            inputs.waypointArray.push(actualState.centerY + length1 * Math.sin(theAngle + inputs.inclination));
            inputs.waypointArray.push(actualState.centerX + hypotenuse * Math.cos(inputs.inclination));
            inputs.waypointArray.push(actualState.centerY + hypotenuse * Math.sin(inputs.inclination));
            inputs.waypointArray.push(inputs.waypointArray[2] - length1 * Math.cos(theAngle + inputs.inclination));
            inputs.waypointArray.push(inputs.waypointArray[3] - length1 * Math.sin(theAngle + inputs.inclination));

            // Final point is starting position
            inputs.waypointArray.push(actualState.centerX);
            inputs.waypointArray.push(actualState.centerY);

            console.log("point and waypoints: " + inputs.pointX + "," + inputs.pointY + " " + inputs.waypointArray);
            
            requiredSpeed = (length1 * 2 + length2 * 2) / inputs.time[0];

            // Fix time
            var overallTime = inputs.time[0];
            inputs.time[0] = overallTime * (length1 / (length1 + length2) / 2);
            inputs.time.push(overallTime * (length2 / (length1 + length2) / 2));
            inputs.time.push(inputs.time[0]);
            inputs.time.push(inputs.time[1]);
            console.log("times: " + inputs.time);

            // Set up goal path for drawing
            goalPath.type = "lines";
            goalPath.pointArray = inputs.waypointArray;

            break;

        case "circle":
            inputs.inclination = Number(Math.PI / 180.0 * document.getElementById("inclination").value);
            inputs.radius = Number(document.getElementById("radius").value);
            inputs.waypointArray.push(actualState.centerX + inputs.radius * Math.cos(inputs.inclination));
            inputs.waypointArray.push(actualState.centerY + inputs.radius * Math.sin(inputs.inclination));
            
            requiredSpeed = inputs.radius * 2 * Math.PI / inputs.time[0];

            console.log("Circle (X, Y, radius): " + inputs.waypointArray[0] + ", " + inputs.waypointArray[1] + " " + inputs.radius);
            goalPath.radii.push(inputs.radius);
            goalPath.pointArray = inputs.waypointArray;
            goalPath.type = "circles";
            break;

        case "eight":
            inputs.inclination = Number(Math.PI / 180.0 * document.getElementById("inclination").value);
            inputs.inclination2 = Number(Math.PI / 180.0 * document.getElementById("inclination2").value);
            inputs.radius = Number(document.getElementById("length1").value);
            inputs.radius2 = Number(document.getElementById("length2").value);
            inputs.waypointArray.push(actualState.centerX + inputs.radius * Math.cos(inputs.inclination));
            inputs.waypointArray.push(actualState.centerY + inputs.radius * Math.sin(inputs.inclination));
            inputs.waypointArray.push(actualState.centerX + inputs.radius2 * Math.cos(inputs.inclination2));
            inputs.waypointArray.push(actualState.centerY + inputs.radius2 * Math.sin(inputs.inclination2));
            
            requiredSpeed = (inputs.radius * 2 * Math.PI + inputs.radius2 * 2 * Math.PI) / inputs.time[0];

            goalPath.pointArray = inputs.waypointArray;
            goalPath.radii.push(inputs.radius);
            goalPath.radii.push(inputs.radius2);
            goalPath.type = "circles";
            
            var overallTime = inputs.time[0];
            inputs.time[0] = overallTime * inputs.radius / (inputs.radius + inputs.radius2);
            inputs.time.push(overallTime * inputs.radius2 / (inputs.radius + inputs.radius2));
            console.log(inputs.time);

            console.log("Circle 1 (X, Y, radius): " + inputs.waypointArray[0] + ", " + inputs.waypointArray[1] + " " + inputs.radius);
            console.log("Circle 2 (X, Y, radius): " + inputs.waypointArray[2] + ", " + inputs.waypointArray[3] + " " + inputs.radius2);
            break;

        default:
            control.option = "";
            console.error("Invalid control option somehow");
            break;
    }
    
    if (!errorCheckSpeed(requiredSpeed))
    {
        return;
    }
    goalPath.centerX = actualState.centerX;
    goalPath.centerY = actualState.centerY;
    drawGoalPath();

    // Fix up theta to be in [0, 2PI) hopefully
    inputs.theta = (inputs.theta + 2 * Math.PI) % (2 * Math.PI);
}

function updateCanvas(canvas, timeDiff) {
    // Clear the canvas before drawing
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    updateRobotPlan(timeDiff);
    updateRobotState(timeDiff);
    drawRobot();
}

// Animate the frame
function animate(canvas, currTime) {
    // update
    var time = (new Date()).getTime();
    var timeDiff = time - currTime;

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
