//images
export const Img_Capsule_S2 = new Image();
Img_Capsule_S2.src = 'assets/Capsule.png';
export const Img_Fueltank_Ox_M_S2 = new Image();
Img_Fueltank_Ox_M_S2.src = 'assets/Innertank_S2_2.png';
export const Img_Fueltank_Propellant_M_S2 = new Image();
Img_Fueltank_Propellant_M_S2.src = 'assets/Innerzank_s2_1.png';
export const Img_Fueltank_Empty_M_S3 = new Image();
Img_Fueltank_Empty_M_S3.src = 'assets/Empty_Structure_S3_M.png';
export const Img_Engine_M_S2 = new Image();
Img_Engine_M_S2.src = 'assets/Engine_S2.png';
export const Img_Heatshiel_S2 = new Image();
Img_Heatshiel_S2.src = 'assets/heatshield.png';
export const Img_Engine_Plate_S2 = new Image();
Img_Engine_Plate_S2.src = 'assets/Engine_Plate_S2.png';
export const Img_Seperator_S2 = new Image();
Img_Seperator_S2.src = 'assets/Seperator_unten.png';
export const Img_Seperator_1 = new Image();
Img_Seperator_1.src = 'assets/seperator_side_s2.png'; 

export const Img_Fueltank_Empty_M_S2 = new Image();
Img_Fueltank_Empty_M_S2.src = 'assets/Empty_Structure_S2_M.png';


export const Img_Fuel_Outer = new Image();
Img_Fuel_Outer.src = 'assets/fuel_outer.png';

export const Img_Fuel_Inner = new Image();
Img_Fuel_Inner.src = 'assets/fuel_inner.png';

export const parts = [ 
    { partnumber: 1, category: 1, name: 'Capsule_S2', form: 'a22z0,b0z46,c60z46,d37z0', Con_Points:'T30z0S0,B30z46S2', Img: Img_Capsule_S2, height: 46, width:60, weight: 1000, torque:40000, allow_side_parts: false, side_placeble: true},
    { partnumber: 2, category: 1, name: 'Fueltank_Empty_M_S2', form:'a0z0,b0z50,c60z50,d60z0' , Con_Points:'T30z0S2,B30z50S2,L0z25S2,R60z25S2', Img:Img_Fueltank_Empty_M_S2, height: 50, width:60, isStructureTank: true, capacity: 3, Slot_Points: '30z0,30z17,30z33', weight: 2, allow_side_parts: true, side_placeble: true},
    { partnumber: 3, category: 2, name: 'Fueltank_Ox_M_S2_I', form: 'a0z0,b0z29,c58z29,d58z0', Con_Points:'T29z0S2,B29z29S2', Img:Img_Fueltank_Ox_M_S2, height: 29, width:58, isInnerTank: true, fuelType: 'oxidizer', capacity: 1000, value: 2, weight: 1000, dryWeight: 100, allow_side_parts: false, side_placeble: true}, 
    { partnumber: 4, category: 2, name: 'Fueltank_Propellant_M_S2_I', form: 'a0z0,b0z18,c58z18,d58z0', Con_Points:'T29z0S2,B29z18S2', Img:Img_Fueltank_Propellant_M_S2, height: 18, width:58, isInnerTank: true, fuelType: 'propellant', capacity: 1000, value: 1, weight: 1000, dryWeight: 100, allow_side_parts: false, side_placeble: true, no_filter: true},
    { partnumber: 5, category: 1, name: 'Fueltank_Empty_M_S3', form:'a0z0,b0z50,c120z50,d120z0' , Con_Points:'T60z0S3,B60z50S3', Img:Img_Fueltank_Empty_M_S3, height: 50, width:120, isStructureTank: true, capacity: 6, weight: 1000, allow_side_parts: false, side_placeble: true, no_filter: true},
    { partnumber: 6, category: 1, name: 'Engine_M_S2', form: 'a0z0,b0z42,c28z42,d28z0', Con_Points:'T14z0S2,B14z42S2', Img:Img_Engine_M_S2, height:42 , width:28, weight: 1000, thrust: 700000, fuelConsumption: 7.5, allow_side_parts: false, side_placeble: true},
    { partnumber: 7, category: 1, name: 'Heatshiel_S2', form: 'a0z0,b0z4,c60z4,d60z0', Con_Points:'T30z0S2,B30z4S2', Img:Img_Heatshiel_S2, height:4, width:60, weight: 1000, allow_side_parts: false, side_placeble: true},
    { partnumber: 8, category: 1, name: 'Engine_Plate_S2', form: 'a0z0,b0z5, c60z5,d60z0', Con_Points:'T30z0S2,B30z5S2', Img: Img_Engine_Plate_S2, height:5 , width:60, weight: 1000, allow_side_parts: false, side_placeble: true, no_filter: true},
    { partnumber: 9, category: 1, name: 'Seperator_S2', form: 'a0z0,b0z5,c60z5,d60z0', Con_Points:'T30z0S2,B30z5S2', Img:Img_Seperator_S2, height:5 , width:60, weight: 1000, layer: 1, allow_side_parts: false, side_placeble: true},
    { partnumber: 10, category: 1, name: 'Seperator_1', form:'a0z0,b0z34,c3z34,d3z0' , Con_Points:'L0z17S2,R3z17S2', Img:Img_Seperator_1, height: 34, width:3, weight: 2, allow_side_parts: true, side_placeble: true},
];

export const bodies =[
    {name: 'sun', cat :1, mass: 1.989e30, r:700000000, x:0, y:0, vx:0, vy:0},
    {name: 'mars', cat :2, mass: 5.2e24, r:7000000, x:227900000000, y:0, vx:0, vy:16339, seed: 4242},
    {name: 'mercur', cat :2, mass: 3.3e23, r:2400000, x:100000000000, y:0, vx:0, vy:36435, seed: 91823},
    {name: 'jupiter', cat :2, mass: 1.9e27, r:69900000, x:0, y:400000000000, vx:-18218, vy:0, seed: 55210},
    {name: 'saturn', cat :2, mass: 5.7e26, r:58200000, x:-600000000000, y:0, vx:0, vy:-14874, seed: 33071},
    {name: 'komet', cat :2, mass: 1.0e21, r:500000, x:0, y:-200000000000, vx:34000, vy:0, seed: 78341}
];
