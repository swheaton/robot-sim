# Omni-directional (Mecanum Wheeled) Robotic Vehicle Simulation
Mecanum wheels put a force at a 45 degree angle instead of straight ahead like typical wheels. This allows a robot with these wheels to move in any direction and rotate. This simulation directs the robot by controlling the individually-driven wheels, then feeding those values through the kinematic equations to get the realized velocity and position.
## Getting Started
Easy. Open up RobotSim.html in a browser. RobotSim.js will be loaded if it is in the same directory (which it should be).
## Design
This simulator is written in HTML and Javascript, and uses the HTML5 Canvas drawing feature.  Multiple canvases are layered on top of each other so that some drawings like the background grid need only be drawn once.  The simulation becomes animated by redrawing the top canvas repeatedly.
### Advantages
* Simple method of drawing frames
* No additional packages or inclusions required
* HTML web page is much easier to run than other languages that could've been chosen like Python or Java
* By using the HTML animation frame feature, real time is used as the time delta between frames, thus making the simulation more realistic and able to deal with the time constraints 
### Disadvantages
* JS isn't object-oriented or type-safe which is a con for me, maybe not for others. 
* Animation frame feature allows the browser to decide when to draw the next frame. If the browser is busy, the time delta between frames can get large enough to mess up the simulation
* My lack of GUI / JS knowledge required a large amount of the code to be devoted to just inputs
## Robot
* 2 feet wide by 4 feet long
* Wheel radius chosen was 1. The full length of the robot is 4, so the maximum radius would be 2 (since the length is from axle to axle, so twice the radius can fit as the length). 2 would clearly be oversized wheels and not realistic. But we want the wheels to be as big as possible so that lower rotations of the wheel are required to hit a given velocity. So I chose half that, or a radius of 1 foot. This also makes calculations by hand nice.
* In this simulation, the transparent rectangle is the robot. The red dot is the center of the robot. The white rectangle inside the robot marks the front. 
* Background has 1/2 foot grid lines
* Maximum vehicle speed (with respect to the center of the robot) is 15.0 ft/s. This does not count rotation at all. If any input would require the robot to travel faster than is possible given this max velocity, an error will be alerted and the action not performed.
## Interface
Clearly I am not a user interface developer based on the terribleness that is the IO interface on the right panel. The focus was on the robot simulation, but an interface was necessary. This section describes what's there.
### Inputs
Multiple input modes exist to direct the robot. Select the desired mode, input parameters, then click the 'Submit Control Change' button.
* None: Does nothing, obviously
* Route and Rotation: Specify a ray to travel along forever, and a rotation rate. Robot will stop if mouse is clicked on the canvas or if any key is pressed.
  * Theta: Angle of travel, measured in degrees from global inertial frame of reference x axis (horizontal).
  * Speed: Speed of travel, in feet per second.
  * Rotation Rate: Rate of rotation, in degrees per second, where positive rotation rate is defined as counterclockwise and vice versa.
* Wheel Controls: Hard-code the wheel control inputs and watch what happens live!!
  * Wheels 1-4: Rotation rate of Mecanum wheels, in rotations per second. See Wheel Control section of Outputs below for location of wheels.
* Point: Travel to an x,y coordinate in space, possibly visiting some waypoints along the way.
  * Theta: Final theta you want the robot to have, where theta is defined below in the output section. Degrees.
  * End Point: X,Y coordinate of end point you want the robot to travel to.
  * Waypoints: Array of X,Y coordinates the robot will travel to, in order, on its way to the end point. This array is comma separated, with x,y pairs concatenated together, like this: [x1,y1,x2,y2,...,xn,yn]. Input this without the square brackets.
  * Time to Complete: Time, in seconds, for which the robot will complete the path, including waypoints.
* Circular Path: Travel in a circle
  * Radius: Radius of the circle, in feet.
  * Inclination: Direction of the center of the circle, in degrees, measured from the inertial global reference frame x axis (horizontal).
  * Time to Complete: Time, in seconds, for which the robot will complete the path.
* Rectangular Path: Travel along a rectangle.
  * Inclination: Direction of opposite corner of the rectangle, in degrees, measured from the inertial global reference frame x axis (horizontal). Assume the robot is on a corner to begin.
  * Side Lengths: Lengths of the rectangle, where length 1 is the nearest side as the robot travels clockwise around the rectangle, and length 2 is the other one.
  * Time to Complete: Time, in seconds, for which the robot will complete the path.
* Figure Eight: Travel along two circles instead of one.
  * Radii: Radii of the two circles that the robot will travel.
  * Inclinations: Directions of the centers of the circles, in degrees, measured from the inertial global reference frame x axis (horizontal).
  * Time to Complete: Time, in seconds, for which the robot will complete the path (both circles).
### Outputs
The rightmost panel contains outputs that update every simulation frame update
* Position: X and Y position in feet of the center of the robot. If it goes off the screen, the viewing window will shift but the position will remain the same.
* Theta: Angle from robot frame of reference x axis (crosswise) to global inertial frame of reference x axis (horizontal). If the angle is increasing, the robot is rotating clockwise, and vice versa.
* Velocity: X and Y velocity in feet per second the center of the robot is moving. This is relative to the robot frame of reference, where the y axis is lengthwise through the front of the robot, and the x axis is widthwise.
* Wheel Control: The control signal that each wheel, 1-4, is given in rotations per second.  Wheel 1 is front left, wheel 2 is front right, wheel 3 is back left, and wheel 4 is back right.
