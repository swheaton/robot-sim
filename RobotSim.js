//grid width and height
var pixelsPerFt = 40;
var gridWidth = pixelsPerFt * 30;
var gridHeight = pixelsPerFt * 15;

var context = document.getElementById("myCanvas").getContext("2d");

var robotSpecs = 
{
    "width": pixelsPerFt * 2,
    "height": pixelsPerFt * 4
}

var robotState = 
{
    "row": gridHeight/2,
    "col": gridWidth/2,
    "heading": 0
}

function drawBoard()
{
    for (var x = 0; x <= gridWidth; x += pixelsPerFt) {
        context.moveTo(0.5 + x, 0);
        context.lineTo(0.5 + x, gridHeight);
    }


    for (var x = 0; x <= gridHeight; x += pixelsPerFt) {
        context.moveTo(0, 0.5 + x);
        context.lineTo(gridWidth, 0.5 + x);
    }

    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();
}

function drawRobot()
{
	var ctx=document.getElementById("myCanvas").getContext("2d");
	ctx.save();
	ctx.translate(robotState.col, robotState.row);
	ctx.rotate(robotState.heading);
	ctx.fillStyle = "black";
	ctx.fillRect(-robotSpecs.width/2, -robotSpecs.height/2, robotSpecs.width, robotSpecs.height);
	ctx.fillStyle = "white";
	ctx.fillRect(0, -robotSpecs.height/2+5, robotSpecs.width/10, robotSpecs.height/10);
	ctx.restore();
}

drawBoard();
drawRobot();