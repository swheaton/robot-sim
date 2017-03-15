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
    
    // Location of last mouse position on the canvas, pixels
    this.mouseCenterX = 0;
    this.mouseCenterY = 0;
}

// Specifications of the robot
var robotSpecs = new function() {
    // Units of feet
    this.realWidth = 2;
    this.realHeight = 4;
    
    // Wheel radius chosen was 1. The full length of the robot is 4, so the maximum
    //  radius would be 2 (since the length is from axle to axle, so twice the radius
    //  can fit as the length). 2 would clearly be oversized wheels and not realistic.
    //  But we want the wheels to be as big as possible so that lower rotations of the
    //  wheel are required to hit a given velocity. So I chose half that, or a radius of
    //  1 foot. This also makes calculations nice.
    this.wheelRadius = 1.0;
    
    // Display width and height, in pixels
    this.displayWidth = this.realWidth * page.pixelsPerFt;
    this.displayHeight = this.realHeight * page.pixelsPerFt;
    
    // Max velocity of the robot, in ft/s
    this.maxVelocity = 15.0;
}

// Actual state of the robot
var actualState = {
    // Position of robot, in feet
    centerX: 0,
    centerY: 0,
    lastCenterX: 0,
    lastCenterY: 0,
    
    // Angle from robot's frame of reference X axis to global frame of reference X axis, radians.
    //  Increasing angle means a clockwise rotation
    theta: 0,
    
    // Velocity in robot frame of reference, ft/sec
    velX: 0,
    velY: 0,
    
    // Rotation rate, radians/sec
    velRot: 0,
    
    // A period in time, used to judge real time against
    stopwatchTime: 0,
    
    // A global to force robot to stop in some situations
    forceStop: false
}

// Control variables
var control = {
    // Angular rotation rate of Mecanum wheels, positive means going forward, rev / s
    wheel1: 0, // front left
    wheel2: 0, // front right
    wheel3: 0, // back left
    wheel4: 0, // back right

    // Intended velocities, ft/s and rad/s
    velX: 0,
    velY: 0,
    velRot: 0
}

// Inputs from the user interface
var inputs = {
    // Input option - default to "none"
    option: "none",
    manualMode: false,

    // Desired inputs
    theta: 0,
    speed: 0,
    velRot: 0,
    pointX: 0,
    pointY: 0,
    waypointArray: [], // [x1, y1, x2, y2... xn, yn]
    radius: 0,
    radius2: 0,
    inclination: 0,
    inclination2: 0,
    time: [0.0] // array of times required for each segment of travel
}

// Structure storing some draw information for the original goal path, so that
//  we can redraw it easily if we have to (viewing window gets reset).
var goalPath = {
    pointArray: [],
    radii: [],
    type: "none",
    centerX: 0.0,
    centerY: 0.0
}

// List of possible input fields from the .html
var inputFields = [
    "direction_input",
    "speed_input",
	"rotation_input",
	"wheel1_input",
	"wheel2_input",
	"wheel3_input",
	"wheel4_input",
	"PointX_input",
	"PointY_input",
	"Waypoints_input",
	"radius_input",
	"radius2_input",
	"inclination_input",
	"inclination2_input",
	"time_input",
	"length1_input",
	"length2_input"
]

// Needed inputs fields that should be visible for each input option type.
//  All others will be hidden.
var neededInputFields = {
    none: [],
    direct: ["direction_input", "speed_input", "rotation_input"],
    wheelControl: ["wheel1_input", "wheel2_input", "wheel3_input", "wheel4_input"],
    point: ["PointX_input", "PointY_input", "Waypoints_input", "time_input"],
    circle: ["radius_input", "inclination_input", "time_input"],
    rect: ["inclination_input", "length1_input", "length2_input", "time_input"],
    eight: ["radius_input", "radius2_input", "inclination_input", "inclination2_input", "time_input"],
    manual: []
}

// Draw the background grid with 1/2 foot grid lines. Grid canvas is in the background
function drawGrid() {
    // Draw horizontal
    var context = document.getElementById("gridCanvas").getContext("2d");
    for (var x = 0; x <= page.displayGridWidth; x += page.pixelsPerFt / 2) {
        context.moveTo(0.5 + x, 0);
        context.lineTo(0.5 + x, page.displayGridHeight);
    }

    // Draw vertical
    for (var x = 0; x <= page.displayGridHeight; x += page.pixelsPerFt / 2) {
        context.moveTo(0, 0.5 + x);
        context.lineTo(page.displayGridWidth, 0.5 + x);
    }

    // Black, but opaque
    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();
}

// Convert environment x position to column in the display
function robotXToCol(x) {
    return (x - page.centerX + page.realGridWidth / 2) * page.pixelsPerFt;
}

// Convert environment y position to row in the display
function robotYToRow(y) {
    return (page.centerY - y + page.realGridHeight / 2) * page.pixelsPerFt;
}

// Draws robot given its position and theta
function drawRobot() {
    var ctx = document.getElementById("robotCanvas").getContext("2d");
    ctx.save();

    // Draw the rectangular robot
    var centerCol = robotXToCol(actualState.centerX);
    var centerRow = robotYToRow(actualState.centerY);
    ctx.translate(centerCol, centerRow);
    ctx.rotate(actualState.theta);
    ctx.fillStyle = "black";
    ctx.globalAlpha = 0.5; // Make somewhat opaque to see grid lines and path behind it
    ctx.fillRect(-robotSpecs.displayWidth / 2, -robotSpecs.displayHeight / 2,
        robotSpecs.displayWidth, robotSpecs.displayHeight);

    // Forward heading marker
    ctx.globalAlpha=1.0;
    ctx.fillStyle = "white";
    ctx.fillRect(-robotSpecs.displayWidth / 20, -robotSpecs.displayHeight / 2 + 5,
        robotSpecs.displayWidth / 10, robotSpecs.displayHeight / 10);

    // Center dot
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.restore();

    // Draw path robot took from last position to here
    var pathCtx = document.getElementById("actualPathCanvas").getContext("2d");
    pathCtx.strokeStyle = "red";
    pathCtx.moveTo(robotXToCol(actualState.lastCenterX), robotYToRow(actualState.lastCenterY));
    pathCtx.lineTo(robotXToCol(actualState.centerX), robotYToRow(actualState.centerY));
    pathCtx.stroke();

    // Update numerical outputs on the display
    document.getElementById("xPos").textContent = actualState.centerX.toFixed(2);
    document.getElementById("yPos").textContent = actualState.centerY.toFixed(2);
    document.getElementById("theta").textContent = (actualState.theta / Math.PI * 180.0).toFixed(1);
}

// Clears actual path taken and redraws goal path too.
function clearDrawnPath() {
    var pathCanvas = document.getElementById("actualPathCanvas");
    pathCanvas.width = pathCanvas.width;
    drawGoalPath();
    console.log("Relocating frame and redrawing goal path. Also clearing actual path");
    // TODO figure out how to just add to actual path instead of clearing
}

// Make sure angle is within [0, 2*PI]
function fixupAngle(angle)
{
    var tempAngle = angle;
    if (angle < 0)
    {
        // Bring negative up to the right zone. Add 1 is in there so we don't get -0
        tempAngle += 2 * Math.PI * (-Math.floor(tempAngle / (2 * Math.PI)));
    }
    return tempAngle % (2 * Math.PI);
}

// Kinematic equations for updating robot position given its current velocities and state.
//  timeDiff is time to be used for current frame, in milliseconds
function updateRobotPosition(timeDiff) {
    // Store away current position
    actualState.lastCenterX = actualState.centerX;
    actualState.lastCenterY = actualState.centerY;
    
    // Update x, y, and theta due to current velocities.
    actualState.centerX = actualState.centerX + (timeDiff / 1000.0) *
        (actualState.velX * Math.cos(actualState.theta) + actualState.velY * Math.sin(actualState.theta));
    actualState.centerY = actualState.centerY + (timeDiff / 1000.0) *
        (actualState.velX * Math.sin(-actualState.theta) + actualState.velY * Math.cos(actualState.theta));
    actualState.theta = fixupAngle(actualState.theta - actualState.velRot * (timeDiff / 1000.0));

    // Move robot back to center if it's about to go within 3 feet of border.
    if (actualState.centerX <= page.centerX - (page.realGridWidth / 2 - 3) ||
        actualState.centerX >= page.centerX + (page.realGridWidth / 2 - 3)) {
        // Recenter the page and clear the path
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

// Kinematic equations to update robot state given control signals and last state
function updateRobotState(timeDiff) {
    actualState.velX = (robotSpecs.wheelRadius / 4) *
        (control.wheel1 - control.wheel2 - control.wheel3 + control.wheel4);
    actualState.velY = (robotSpecs.wheelRadius / 4) *
        (control.wheel1 + control.wheel2 + control.wheel3 + control.wheel4);
    actualState.velRot = robotSpecs.wheelRadius /
        (4 * (robotSpecs.realWidth / 2 + robotSpecs.realHeight / 2)) *
        (-control.wheel1 + control.wheel2 - control.wheel3 + control.wheel4);

    // Update velocities for output display
    document.getElementById("velX").textContent = actualState.velX.toFixed(2);
    document.getElementById("velY").textContent = actualState.velY.toFixed(2);

    // Now use physics to update the actual position of the robot
    updateRobotPosition(timeDiff);
}

// Returns time left on the timer, OR timeDiff if it is larger since we shouldn't use an interval smaller than the
//	simulation cycle
function getTimeLeft(timeDiff) {
    return Math.max(timeDiff / 1000.0, inputs.time[0] - ((new Date()).getTime() - actualState.stopwatchTime) / 1000.0);
}

// Euclidean distance between two points. Use * instead of pow for speed?
function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

// Get point to be used, but ensure that no invalid positions are ever used.
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

// The "brain" - sets intended velocities given the current goal
function updateRobotPlan(timeDiff) {
    // Set velocities based on control option and parameters
    var calcControls = true;
    var timeLeft = getTimeLeft(timeDiff);
    switch (inputs.option) {
        // Don't move
        case "none":
            control.velX = 0.0;
            control.velY = 0.0;
            control.velRot = 0.0;
            break;
        // Move in a certain direction with rotation
        case "direct":
            control.velX = inputs.speed * Math.cos(inputs.theta + actualState.theta);
            control.velY = inputs.speed * Math.sin(inputs.theta + actualState.theta);
            control.velRot = inputs.velRot;
            break;

        // Directly input wheel controls ... don't calculate anything
        case "wheelControl":
            calcControls = false;
            break;

        // For point and rectangle mode, just travel to the waypoints given
        case "point":
        case "rect":
            var point = getPoint();
            // Stop if forced to or we're really close to the point
            if (this.forceStop == true || Math.abs(point.y - actualState.centerY) < 0.005 && Math.abs(point.x - actualState.centerX) < 0.005) {
                control.velX = 0.0;
                control.velY = 0.0;
                if (inputs.waypointArray.length > 2) {
                    // We've completed a waypoint. Pop this point and reset stopwatch
                    inputs.time = inputs.time.splice(1, inputs.time.length);
                    actualState.stopwatchTime = (new Date()).getTime();
                    inputs.waypointArray = inputs.waypointArray.splice(2, inputs.waypointArray.length);
                }
                this.forceStop = false;
            }
            // Keep traveling towards the waypoint
            else {
                var distance = dist(actualState.centerX, actualState.centerY, point.x, point.y);
                var targetTheta = Math.atan2(point.y - actualState.centerY, point.x - actualState.centerX);
                control.velX = distance / timeLeft * Math.cos(targetTheta + actualState.theta);
                control.velY = distance / timeLeft * Math.sin(targetTheta + actualState.theta);
            }
            // Close to goal theta?
            if (Math.abs(inputs.theta - actualState.theta) < 0.005) {
                control.velRot = 0.0;
            }
            // Rotate until we reach goal theta
            else {
                control.velRot = -(inputs.theta - actualState.theta) / timeLeft;
            }
            break;

        // Travel along circular paths
        case "eight":
        case "circle":
            // Angle of robot from center of circle
            var currInclination = fixupAngle(Math.atan2(inputs.waypointArray[1] - actualState.centerY, inputs.waypointArray[0] - actualState.centerX));
            var targetTheta = currInclination + Math.PI / 2;

            // Error correction to try and get the path to conform to a circle
            targetTheta = targetTheta - (dist(inputs.waypointArray[0], inputs.waypointArray[1], actualState.centerX, actualState.centerY) - inputs.radius);

            // Stop case - we've made a full circle. Check timeLeft to make sure we didn't just start
            if (this.forceStop == true || timeLeft * 1000.0 <= 2 * timeDiff &&
                    Math.abs(currInclination - inputs.inclination) < 0.05) {
                control.velX = 0.0;
                control.velY = 0.0;

                // Got more points to take care of
                if (inputs.waypointArray.length > 2) {
                    // Pop off the point and reset stopwatch
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
                // Travel along what we think is the tangent to the intended circle
                var angleLeft = fixupAngle(currInclination - inputs.inclination);
                
                // Make a "0" angle be "2*PI" because it's easier
                if (angleLeft < 0.05 && timeLeft * 1000.0 > 2 * timeDiff) {
                    angleLeft = 2 * Math.PI;
                }

                control.velX = angleLeft * inputs.radius / timeLeft * Math.cos(targetTheta + actualState.theta);
                control.velY = angleLeft * inputs.radius / timeLeft * Math.sin(targetTheta + actualState.theta);
            }
            control.velRot = 0.0;
            break;
            
        case "manual":
            inputs.manualMode = true;
            break;

        default:
            console.error("Invalid control option somehow");
            break;
    }

    sanitizeVelocities();

    // Calculate wheel controls based on goal velocities - inverse kinematic equations
    if (calcControls === true) {
        control.wheel1 = (control.velY + control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
        control.wheel2 = (control.velY - control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
        control.wheel3 = (control.velY - control.velX - 3 * control.velRot) / robotSpecs.wheelRadius;
        control.wheel4 = (control.velY + control.velX + 3 * control.velRot) / robotSpecs.wheelRadius;
    }

    // Update wheel control output on display
    document.getElementById("w1").textContent = control.wheel1.toFixed(2);
    document.getElementById("w2").textContent = control.wheel2.toFixed(2);
    document.getElementById("w3").textContent = control.wheel3.toFixed(2);
    document.getElementById("w4").textContent = control.wheel4.toFixed(2);
}

// Draw goal path in blue
function drawGoalPath()
{
    // Clear goal path canvas
    var goalCanvas = document.getElementById("goalPathCanvas");
    goalCanvas.width = goalCanvas.width;
    var ctx = goalCanvas.getContext("2d");

    switch (goalPath.type)
    {
        // Draw a series of lines - either point execution or rectangle
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

        // Draw a series of circles
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

// Check if speed is greater than max velocity allowed
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

// Called when "Submit Control Change" button is pressed.
function onSubmitControlOption() {
    // Get and set control option
    var controlElt = document.getElementById("controlOption");
    var controlName = controlElt.value;
    console.log("Changing control mode: " + controlName);
    inputs.option = controlName;
    
    // Reset stopwatch to now
    actualState.stopwatchTime = (new Date()).getTime();

    // Also clear actual path canvas too
    var pathCanvas = document.getElementById("actualPathCanvas");
    pathCanvas.width = pathCanvas.width;

    // Clear some input stuff
    inputs.waypointArray = [];
    inputs.time = [];
    inputs.time.push(Number(document.getElementById("time").value));
    
    inputs.manualMode = false;
    goalPath.type = "none";
    
    var requiredSpeed = 0.0;
    switch (controlName) {
        // Direct mode: get direction, speed, rotation
        case "direct":
            inputs.theta = Number(document.getElementById("direction").value) * Math.PI / 180.0;
            inputs.speed = Number(document.getElementById("speed").value);
            inputs.velRot = Number(document.getElementById("rotation").value) * Math.PI / 180.0;
            requiredSpeed = inputs.speed;
            console.log("Theta, Speed, VelRot: " + inputs.theta + " " + inputs.speed + " " + inputs.velRot);
            break;

        case "wheelControl":
            // WHeel control: get all 4 wheels
            control.wheel1 = Number(document.getElementById("wheel1").value);
            control.wheel2 = Number(document.getElementById("wheel2").value);
            control.wheel3 = Number(document.getElementById("wheel3").value);
            control.wheel4 = Number(document.getElementById("wheel4").value);
            requiredSpeed = Math.sqrt(Math.pow((robotSpecs.wheelRadius / 4) * (control.wheel1 - control.wheel2 - control.wheel3 + control.wheel4), 2) + 
                                        Math.pow((robotSpecs.wheelRadius / 4) * (control.wheel1 + control.wheel2 + control.wheel3 + control.wheel4), 2));
            console.log("Wheel 1-4: " + control.wheel1 + " " + control.wheel2 + " " + control.wheel3 + " " + control.wheel4);
            break;

        case "point":
            inputs.theta = Number(document.getElementById("direction").value) * Math.PI / 180.0;

            // Get waypoints, then add final point
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
            
            // Current to first point
            inputs.time.push(overallTime * dist(actualState.centerX, actualState.centerY,
                inputs.waypointArray[0], inputs.waypointArray[1]));
            var totalDist = dist(actualState.centerX, actualState.centerY,
                inputs.waypointArray[0], inputs.waypointArray[1]);
            
            // To all subsequent points - time should be the comparative length
            //  of this segment over the whole distance, times the time we are allowed
            for (var i = 2; i < inputs.waypointArray.length; i += 2) {
                inputs.time.push(overallTime * dist(inputs.waypointArray[i - 2], inputs.waypointArray[i - 1],
                    inputs.waypointArray[i], inputs.waypointArray[i + 1]));
                totalDist += dist(inputs.waypointArray[i - 2], inputs.waypointArray[i - 1],
                    inputs.waypointArray[i], inputs.waypointArray[i + 1])
            }
            
            // Scale times based on distance
            for (var i = 0; i < inputs.time.length; i++) {
                inputs.time[i] /= totalDist;
            }

            requiredSpeed = totalDist / overallTime;

            console.log("(theta: waypoints): " + inputs.theta + ": " + inputs.waypointArray);
            console.log("times: " + inputs.time);

            // Set up goal path for drawing
            goalPath.type = "lines";
            goalPath.pointArray = inputs.waypointArray.slice();

            break;

        case "rect":
            // Get lengths and inclinations of opposite corners of the rectangle from current pos
            var length1 = Number(document.getElementById("length1").value);
            var length2 = Number(document.getElementById("length2").value);
            inputs.inclination = Number(Math.PI / 180.0 * document.getElementById("inclination").value);

            // Add waypoints as corners of rectangle
            var theAngle = Math.atan(length2 / length1);
            console.log(theAngle);
            var hypotenuse = Math.sqrt(length1 * length1 + length2 * length2);
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

            // Add times for each segment, scaled by side length
            var overallTime = inputs.time[0];
            inputs.time[0] = overallTime * (length1 / (length1 + length2) / 2);
            inputs.time.push(overallTime * (length2 / (length1 + length2) / 2));
            inputs.time.push(inputs.time[0]);
            inputs.time.push(inputs.time[1]);
            console.log("times: " + inputs.time);

            // Set up goal path for drawing
            goalPath.type = "lines";
            goalPath.pointArray = inputs.waypointArray.slice();

            break;

        case "circle":
            // Inclination of robot to center of circle, and radius. Store center point
            //  of circle for our own purposes
            inputs.inclination = Number(Math.PI / 180.0 * document.getElementById("inclination").value);
            inputs.radius = Number(document.getElementById("radius").value);
            inputs.waypointArray.push(actualState.centerX + inputs.radius * Math.cos(inputs.inclination));
            inputs.waypointArray.push(actualState.centerY + inputs.radius * Math.sin(inputs.inclination));
            
            requiredSpeed = inputs.radius * 2 * Math.PI / inputs.time[0];

            console.log("Circle (X, Y, radius): " + inputs.waypointArray[0] + ", " + inputs.waypointArray[1] + " " + inputs.radius);
            
            // Set up goal path drawing stuff
            goalPath.radii = [];
            goalPath.radii.push(inputs.radius);
            goalPath.pointArray = inputs.waypointArray.slice();
            goalPath.type = "circles";
            break;

        case "eight":
            // Inclinations of robot to centers of circles, and radii. Store center points
            //  of circles for our own purposes
            inputs.inclination = Number(Math.PI / 180.0 * document.getElementById("inclination").value);
            inputs.inclination2 = Number(Math.PI / 180.0 * document.getElementById("inclination2").value);
            inputs.radius = Number(document.getElementById("radius").value);
            inputs.radius2 = Number(document.getElementById("radius2").value);
            inputs.waypointArray.push(actualState.centerX + inputs.radius * Math.cos(inputs.inclination));
            inputs.waypointArray.push(actualState.centerY + inputs.radius * Math.sin(inputs.inclination));
            inputs.waypointArray.push(actualState.centerX + inputs.radius2 * Math.cos(inputs.inclination2));
            inputs.waypointArray.push(actualState.centerY + inputs.radius2 * Math.sin(inputs.inclination2));
            
            requiredSpeed = (inputs.radius * 2 * Math.PI + inputs.radius2 * 2 * Math.PI) / inputs.time[0];

            goalPath.pointArray = inputs.waypointArray.slice();
            goalPath.radii = [];
            goalPath.radii.push(inputs.radius);
            goalPath.radii.push(inputs.radius2);
            goalPath.type = "circles";
            
            // Scale time segments based on comparative circumferences
            var overallTime = inputs.time[0];
            inputs.time[0] = overallTime * inputs.radius / (inputs.radius + inputs.radius2);
            inputs.time.push(overallTime * inputs.radius2 / (inputs.radius + inputs.radius2));
            console.log(inputs.time);

            console.log("Circle 1 (X, Y, radius): " + inputs.waypointArray[0] + ", " + inputs.waypointArray[1] + " " + inputs.radius);
            console.log("Circle 2 (X, Y, radius): " + inputs.waypointArray[2] + ", " + inputs.waypointArray[3] + " " + inputs.radius2);
            break;
            
        case "manual":
            // Manual input - nothing special
            console.log("Manual control");
            inputs.centerX = actualState.centerX;
            inputs.centerY = actualState.centerY;
            inputs.theta = 0.0;
            break;
            
        case "none":
            break;

        default:
            control.option = "";
            console.error("Invalid control option (" + controlName + ") somehow");
            break;
    }
    
    // Error check speed - alerts failure to the user
    if (!errorCheckSpeed(requiredSpeed))
    {
        return;
    }
    
    // Draw goal path
    goalPath.centerX = actualState.centerX;
    goalPath.centerY = actualState.centerY;
    drawGoalPath();

    // Fix up theta to be in [0, 2PI) hopefully
    inputs.theta = (inputs.theta + 2 * Math.PI) % (2 * Math.PI);
    inputs.inclination = fixupAngle(inputs.inclination);
    inputs.inclination2 = fixupAngle(inputs.inclination2);
}

// Called continuously whenever a new frame can be drawn. Updates
//  all the things!
function updateCanvas(canvas, timeDiff) {
    // Clear the canvas before drawing
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Update everything
    updateRobotPlan(timeDiff);
    updateRobotState(timeDiff);
    drawRobot();
}

// Animate the picture by updating the canvas
function animate(canvas, currTime) {
    // Get difference in time between frames
    var time = (new Date()).getTime();
    var timeDiff = time - currTime;

    updateCanvas(document.getElementById("robotCanvas"), timeDiff);

    // request new frame. Asks browser to schedule call whenever the opportunity
    //  arises. This prevents overwork while still making animation as fast as possible
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

// If we have clicked somewhere, stop direct and wheelControl modes.
function onClick()
{
    if (inputs.option == "direct" || inputs.option == "wheelControl")
    {
        inputs.option = "none";
    }
}

// While mouseing over the canvas, store the initial 
//  mouse position if we are in manual mode
function onMouseover(event)
{
    if (inputs.manualMode)
    {
        page.mouseCenterX = event.clientX;
        page.mouseCenterY = event.clientY;
    }
}

// Mouse move event
function onMousemove(event)
{
    // In manual mode
    if (inputs.manualMode)
    {
        // Left click -- velocity move mode!
        if (page.mouseDown)
        {
            // Set theta and velocity relative to where the mouse has moved
            //  since last time
            var diffX = (event.clientX - page.mouseCenterX) / page.pixelsPerFt;
            var diffY = (page.mouseCenterY - event.clientY) / page.pixelsPerFt;
            inputs.theta = Math.atan2(diffY, diffX);
            inputs.velRot = 0.0;
            inputs.speed = Math.sqrt(diffX * diffX + diffY * diffY);
            inputs.option = "direct";
        }
        // No click - position movement
        else
        {
            // Only set the point every three movements to cut down on unrealistic jitter
            onMousemove.count = ++onMousemove.count || 1;
            if (onMousemove.count % 3 == 0)
            {
                // Make robot move how much the mouse has moved, comparatively
                var diffX = (event.clientX - page.mouseCenterX) / page.pixelsPerFt * 10.0;
                var diffY = (event.clientY - page.mouseCenterY) / page.pixelsPerFt * 10.0;
                inputs.waypointArray = [];
                inputs.waypointArray.push(actualState.centerX + diffX);
                inputs.theta = actualState.theta;
                inputs.waypointArray.push(actualState.centerY - diffY); // y is inverted
                inputs.time = [];
                
                // Make it take 0.2 s, arbitrarily
                inputs.time.push(0.2);
                actualState.stopwatchTime = (new Date()).getTime();
                inputs.option = "point";
                page.mouseCenterX = event.clientX;
                page.mouseCenterY = event.clientY;
            }
        }
    }
}

// On mouse down, recognize we want velocity mode
function onMousedown()
{
    page.mouseDown = true;
    page.mouseCenterX = event.clientX;
    page.mouseCenterY = event.clientY;
}

// Reset velocity mode
function onMouseup()
{
    page.mouseDown = false;
}

// Callback to hide input fields
function hideInput(inputName)
{
    document.getElementById(inputName).style.visibility = "hidden";
}

// Callback to show input fields
function showInput(inputName)
{
    document.getElementById(inputName).style.visibility = "visible";
}

// Hide every input field except the ones that are relevant for the new input option
function onControlChange()
{
    // First hide them all
    inputFields.forEach(hideInput);
    var controlOptionElt = document.getElementById("controlOption");
    var controlOption = controlOptionElt.options[controlOptionElt.selectedIndex].value;
    neededInputFields[controlOption].forEach(showInput);
}

// Add all the listeners
document.getElementById("robotCanvas").addEventListener('click', onClick, false);
window.addEventListener('keypress', onClick, false);
document.getElementById("robotCanvas").addEventListener('mouseover', onMouseover, false);
document.getElementById("robotCanvas").addEventListener('mousemove', onMousemove, false);
document.getElementById("robotCanvas").addEventListener('mousedown', onMousedown, false);
document.getElementById("robotCanvas").addEventListener('mouseup', onMouseup, false);
document.getElementById("controlOption").addEventListener('change', onControlChange, false);

onControlChange(); // Start off by calling this so inputs are hidden

