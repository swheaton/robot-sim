//grid width and height
var pixelsPerFt = 40;
var gridWidth = pixelsPerFt * 30;
var gridHeight = pixelsPerFt * 15;

var robotWidth = pixelsPerFt * 2;
var robotLength = pixelsPerFt * 4;

var context = document.getElementById("myCanvas").getContext("2d");

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
	ctx.fillRect(gridWidth/2 - robotWidth/2, gridHeight/2 - robotLength/2, robotWidth, robotLength);
	ctx.stroke();
}

drawBoard();
drawRobot();