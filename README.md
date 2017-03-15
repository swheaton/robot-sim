# Omni-directional (Mecanum Wheeled) Robotic Vehicle Simulation
Mecanum wheels put a force at a 45 degree angle instead of straight ahead like typical wheels. This allows a robot with these wheels to move in any direction and rotate. This simulation directs the robot by controlling the individually-driven wheels, then feeding those values through the kinematic equations to get the realized velocity and position.
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
## Interface
Clearly I am not a user interface developer based on the terribleness that is the IO interface on the right panel. The focus was on the robot simulation, but an interface was necessary. This section describes what's there.
### Inputs
### Outputs
The rightmost panel contains outputs that update every simulation frame update
* Position: X and Y position in feet of the center of the robot. If it goes off the screen, the viewing window will shift but the position will remain the same.
* Theta: Angle from robot frame of reference x axis (crosswise) to global inertial frame of reference x axis (horizontal). If the angle is increasing, the robot is rotating clockwise, and vice versa.
* Velocity: X and Y velocity in feet per second the center of the robot is moving. This is relative to the robot frame of reference, where the y axis is lengthwise through the front of the robot, and the x axis is widthwise.
* Wheel Control: The control signal that each wheel, 1-4, is given in rotations per second.  Wheel 1 is front left, wheel 2 is front right, wheel 3 is back left, and wheel 4 is back right.
