README:


STELLA

A space based game around rockets.

STELLA is a browser-based space simulation game where you can build, launch and control your own rockets. The project focuses on realistic physics, orbital mechanics and procedural planets.

The build_menu allows you to create your own spacecraft from individaul parts, manage fuel systems and stages, and then test them in a simulated solar system. The project is built from scratch using JavaScript, including the physics, orbital calculations, terrain generation and map system.


![main_menu](s_1.png)
![build_menu](s_2.png)
![game :)](s_3.png)

Features:

Rocket Building
	Build custom rockets with different parts
	Command pods, tanks, engines and separators
	Use symmetry when building rockets

Fuel System
	Create and manage different fuel systems
	Connect tanks using fuel lines
	Manage separate fuel systems for different rocket stages

Staging
	Build rockets with multiple stages
	Separate different rocket sections during flight

Planets and Terrain
	Explore multiple planets
	Generate terrain procedurally
	Use seeded terrain Generation

Physics
	Use custom physics for rockets and spacecraft
	Simulate gravity, thrust and acceleration
	Simulate ground collisions 

Orbits
	Simulate planetary and solar orbits
	Calculate elliptical and escape trajectories
	Use spheres of influence for planets
	Switch between planet-relative and solar coordinate systems

Map
	View the solar system and rocket trajectories
	Track the current position of the rocket
	Create and edit maneuver nodes
	Plan orbital transfers and future maneuvers

Time Warp
	Speed up the simulation 
	Use different time warp speeds


How to Play:

Click on the PLAY button and navigate through the game until you reach the Space Center.
Click on the large Space Center building to enter the Build Menu.

You are now in the Build Menu.

Select the first button on the left and click on the command pod. You can now start placing parts onto your rocket.

To place fuel tanks, press the first button at the top. You can then select the second button on the left and drag inner tanks into empty structural parts. The empty structural tanks are the white ones that turn gray when an inner tank is placed inside.

Next, place an engine plate somewhere in the stage. A stage is defined as all parts that are connected without a separator between them.

The second button at the top activates an early version of the symmetry system.

The third button at the top activates the fuel line system. For this to work, inner tank mode must be activated. You can then drag fuel lines from the inner tanks to the engine plates. Each engine requires both types of fuel.

Once your rocket is complete, click on the blue button in the top right to launch it.

Flight Controls:

You can activate an engine by clicking on it.
Press 'W' to accelerate and 'Q' and 'E' to rotate the roket.
Click on a Separator to separate the rocket at that point.
Press 'M' to switch to the map View. Use the scroll wheel to zoom in and out in both the game and the map.
Click on a planet, the sun, or a rocket to center the map on it.
time warp is located in the top left corner. Time warp can only be used when the rocket is above 100 km.

Maneuver Nodes:

To create a maneuver node, click on the rocket's trajectory in the map view.
Use the two arrows on the trajectory and scroll to adjust the maneuver.



Current State:
	STELLA is still actively being developed
	This is a very early Version of the game
	Some systems are still experimental and may change during development

Hope you like it :)
