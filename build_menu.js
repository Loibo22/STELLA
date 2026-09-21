import { game_State } from "./state.js";
import { parts, Img_Capsule_S2, Img_Engine_M_S2, Img_Engine_Plate_S2, Img_Fueltank_Empty_M_S2, Img_Fueltank_Empty_M_S3, Img_Fueltank_Ox_M_S2, Img_Fueltank_Propellant_M_S2, Img_Heatshiel_S2, Img_Seperator_S2 } from "./part_data.js";

//variabeln
const screen = document.getElementById('screen');

const canvas = document.createElement('canvas');

const ctx = canvas.getContext('2d');

screen.appendChild(canvas);

const button_1 = new Image();
button_1.src = 'assets/button_2.png';
const button_top_images  =[
  new Image(),
  new Image(),
  new Image(),
  new Image()
]
button_top_images[0].src = 'assets/but_1.png';
button_top_images[1].src = 'assets/but_3.png';
button_top_images[2].src = 'assets/but_2.png';
button_top_images[3].src = 'assets/button_2.png';

const panel_margin = 20;
const header_heigt = 110;
const side_bar_gap = 8;
const side_bar_m = 20;
const b_margin = 60;
const buildmode_buttons = 12;

const snap_int = 40;
const world_width = 1300 / 0.7;
const world_height = 3000;

const line_grid = 2;

const fuel_line_edge_margin = 5;
const fuel_line_grid_cell = 2;
const fuel_line_lane_width = 2;
const fuel_line_max_lanes = 12;
const fuel_line_max_overlap_run = 120;
const fuel_line_collinear_eps = 0.5;

const side_panel_Toggle_Height = 30;
const side_panel_gap = 10;
const side_panel_box_height = 36;
const side_panel_box_gap = 8;
const side_panel_box_image_size = 32;
const side_panel_box_image_gap = 4;

const Side_Panel_Plus_Button = { x: 0, y: 0, width: 36, height: 36 };
const Play_Button = { x: 0, y: 0, width: 200, height: 50 };
const side_panel_Toggle_button = { x: 0, y: 0, width: 0, height: side_panel_Toggle_Height };
const filter_button_height = Play_Button.height;

const Tank_Number_Plus_Button = { x: 0, y: 0, width: 0, height: 0 };
const Tank_Number_Minus_Button = { x: 0, y: 0, width: 0, height: 0 };


let clipX;
let clipY;
let clipWidth;
let clipHeight;
let build_menu_size;

let panel_x = 0;
let panel_width = 0;
let content_width = 0;
let content_x = 0;

let panel_y = 0;
let panel_height = 0;
let grid_top_y = 0;
let grid_bottom_y = 0;
let grid_height = 0;

let filter_bar_y = 0;
let sidebar_x = 0;
let sidebar_width = 0;
let sidebar_button_size = 0;
let sidebar_top_y = 0;

let symmetry_mode = 0;
let filter_mode = 0;
let restrict_mode = 0;

let side_panel_active_tab = 1;
let side_panel_expanded = 0;
let side_panel_boxes = [];

let side_panel_list_x = 0;
let side_panel_list_y = 0;
let side_panel_list_width = 0;
let side_panel_list_height = 0;
let side_panel_box_scrollY = 0;
let side_panel_selected_index = -1;
let box_pick_mode = 0;
let box_pick_source_index = -1;

let side_panel_content_height = 250;

let side_panel_X = 0;
let side_panel_Y = 0;
let side_panel_width = 0;
let side_panel_upper_heigt = 0;
let side_panel_lower_Y = 0;
let side_panel_lower_height = 0;

const symmetry_links = {};

let buildmode = 1;
let lastTime = 0;
let frameCount = 0;
let fps = 0;
let build_menu_button_pressed = 0;
let in_place_mode = 0;
let scrollY = 0;
let mouseX = 0;
let mouseY = 0;
let part_clicked = 0;
let part_clicked_once = 0;
let Different_Builds_Count = 0;
let build_mode_scroll = 2.5;
let menuScrollY = 0;
let tank_mode = 0;
let selected_part_str = null;
let hovered_placed_str = null;

let right_clicked_part_name = null;
let right_clicked_pid = null;
let selected_tank_number = null;

let snaped = 0;
let main_capsule_pid = null;
let next_pid = 100000;   

let line_drawing_active = 0;
let line_start_pid = null;
let line_start_point = { x: 0, y: 0 };
let line_stage_box = null;
let line_stage_grid = null;
let line_start_offset = { x: 0, y: 0 };
const fuel_lines = [];
let hovered_fuel_line = null;

let last_preview_target = { x: null, y: null };
let cached_preview_path = [];
let last_rocket_hash = "";
let resolved_fuel_line_paths = [];

let in_drag_stack_mode = 0;
let dragged_stack_parts = [];
let dragged_stack_pts = [];
let dragged_stack_cons = [];
let drag_anchor_X = 0;
let drag_anchor_Y = 0;
let drag_top_part_idx = 0;
let drag_top_pid = 0;

const Tank_Fill_State = {};
const Tank_Number_State = {};

let draw_rect = 0;
let selected_part_name = null;
let selected_part_color = null;
let selected_part_form = null;
let selected_part_points = null;
let centerX = null;
let centerY = null;

let cameraX = 650;
let cameraY = 170;
let isDragging = false;

const Different_Builds = [];
const Different_Builds_Point_Array = [];
const Build_Menu_Con_Points = [];

const part_parent = {};
const part_children = {};
const part_link_to_parent = {};


function update_side_panel_layout() {
  side_panel_width = Play_Button.width;
  side_panel_X = canvas.width - side_panel_width - panel_margin;

  side_panel_Toggle_button.x = side_panel_X;
  side_panel_Toggle_button.width = side_panel_width;
  side_panel_Toggle_button.y = Play_Button.y + Play_Button.height + 10;
  side_panel_Y = side_panel_Toggle_button.y + side_panel_Toggle_Height + 10;

  const total_panel_content_height = (clipY + clipHeight) - side_panel_Y;
  side_panel_upper_heigt = (total_panel_content_height - side_panel_gap) / 2;

  side_panel_lower_Y = side_panel_Y + side_panel_upper_heigt + side_panel_gap;
  side_panel_lower_height = total_panel_content_height - side_panel_upper_heigt - side_panel_gap;

  Side_Panel_Plus_Button.x = side_panel_X + (side_panel_width - Side_Panel_Plus_Button.width) / 2;
  Side_Panel_Plus_Button.y = (clipY + clipHeight) - 20 - Side_Panel_Plus_Button.height;

  side_panel_list_x = side_panel_X + 20;
  side_panel_list_y = side_panel_Y;
  side_panel_list_width = side_panel_width - 40;
  side_panel_list_height = Side_Panel_Plus_Button.y - 10 - side_panel_list_y;
}

function update_Layout() {
  panel_y = header_heigt;
  panel_height = Math.max(200, canvas.height - header_heigt - b_margin);

  panel_x = panel_margin;
  panel_width = Math.max(320, Math.min(460, canvas.width * 0.32));

  sidebar_top_y = panel_y + side_bar_m;
  const sidebar_height = panel_height - 2 * side_bar_m;
  sidebar_button_size = (sidebar_height - (buildmode_buttons - 1) * side_bar_gap) / buildmode_buttons;
  sidebar_x = panel_x + 10;
  sidebar_width = sidebar_button_size + 20;

  content_x = sidebar_x + sidebar_width + panel_margin;
  content_width = Math.max(100, panel_x + panel_width - content_x - panel_margin);

  grid_top_y = panel_y + panel_margin;
  grid_bottom_y = panel_y + panel_height - panel_margin;
  grid_height = Math.max(50, grid_bottom_y - grid_top_y);

  Play_Button.x = canvas.width - Play_Button.width - panel_margin;
  Play_Button.y = header_heigt - Play_Button.height - 15;

  filter_bar_y = Play_Button.y;
  side_panel_width = Play_Button.width;
  side_panel_X = canvas.width - side_panel_width - panel_margin;

  clipX = panel_x + panel_width + panel_margin;
  clipY = Play_Button.y;
  clipWidth = Math.max(200, side_panel_X - panel_margin - clipX);
  clipHeight = Math.max(100, (panel_y + panel_height) - clipY);
  build_menu_size = [clipX, clipY, clipWidth, clipHeight];

  update_side_panel_layout();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  update_Layout();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();



function is_inside_rect(x, y, rect_x, rect_y, rect_width, rect_height) {
  return x >= rect_x && x <= rect_x + rect_width && y >= rect_y && y <= rect_y + rect_height;
}

function is_inside_button(x, y, button) {
  return is_inside_rect(x, y, button.x, button.y, button.width, button.height);
}

function is_mouse_in_build_area() {
  return is_inside_rect(mouseX, mouseY, clipX, clipY, clipWidth, clipHeight);
}

function get_mouse_world_position() {
  return {
    x: (mouseX - clipX) / build_mode_scroll + cameraX,
    y: (mouseY - clipY) / build_mode_scroll + cameraY
  };
}

function getCanvasMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function parse_part_string(part_str) {
  const numbers = part_str.match(/P(\d+)x(-?\d+)y(-?\d+)(I)?/);
  return {
    pid: part_str.split('P')[0],
    part_number: parseInt(numbers[1], 10),
    x: parseInt(numbers[2], 10),
    y: parseInt(numbers[3], 10),
    is_inner: numbers[4] === 'I'
  };
}

function find_part_string(pid) {
  for (const build of Different_Builds) {
    for (const part_str of build.parts) {
      if (part_str.split('P')[0] === String(pid)) return part_str;
    }
  }
  return null;
}

function find_build_index_by_pid(pid) {
  for (let i = 0; i < Different_Builds.length; i++) {
    const has_part = Different_Builds[i].parts.some(p => p.startsWith(`${pid}P`));
    if (has_part) return i;
  }
  return 0;
}

function get_part_number_by_pid(pid) {
  const part_str = find_part_string(pid);
  if (!part_str) return null;
  return parse_part_string(part_str).part_number;
}

function get_part_data_by_pid(pid) {
  const part_number = get_part_number_by_pid(pid);
  if (part_number === null) return null;
  return parts[part_number - 1];
}

function get_part_world_rect(pid) {
  const part_str = find_part_string(pid);
  if (!part_str) return null;
  const info = parse_part_string(part_str);
  const part_data = parts[info.part_number - 1];
  return { x: info.x, y: info.y, w: part_data.width, h: part_data.height };
}

function is_tank(part) {
  return part.isInnerTank === true;
}

function is_structure_tank(part) {
  return part.isStructureTank === true || part.capacity !== undefined;
}

function is_seperator(part_data) {
  if (!part_data) return false;
  const name_lower = part_data.name.toLowerCase();
  return name_lower.includes('seperator') || name_lower.includes('separator');
}

function is_command_capsule(part) {
  return part.name.includes('Capsule');
}

function get_default_tank_number(part) {
  return part.value === 2 ? 2 : 1;
}

function set_tank_mode(value) {
  tank_mode = value;
  Img_Fueltank_Empty_M_S2.src = tank_mode === 1 ? 'assets/Empty_Structure_S2_MM.png' : 'assets/Empty_Structure_S2_M.png';
}

function get_symmetry_center_X() {
  if (main_capsule_pid) {
    const rect = get_part_world_rect(main_capsule_pid);
    if (rect) return rect.x + rect.w / 2;
  }
  return 958;
}


function get_side_panel_box_height(index) {
  const image_count = side_panel_boxes[index].picked_pids.length;
  return side_panel_box_height + image_count * (side_panel_box_image_size + side_panel_box_image_gap);
}

function get_side_panel_box_y(index) {
  let y = side_panel_list_y + side_panel_box_scrollY;
  for (let i = 0; i < index; i++) {
    y += get_side_panel_box_height(i) + side_panel_box_gap;
  }
  return y;
}



export function init_build_menu() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
}

export function handle_Click_Build_Menu(mouseX, mouseY) {
  if (!is_inside_button(mouseX, mouseY, Play_Button)) return;

  set_tank_mode(0);

  let main_build = Different_Builds.find(build => build.parts.some(p => p.startsWith(`${main_capsule_pid}P`)));
  if (!main_build) main_build = Different_Builds[0];

  if (!main_build || main_build.parts.length === 0) {
    game_State.stages = [];
    return 'game';
  }

  const exported_rocket = [];
  const pid_to_export = {};
  let base_x = null;
  let base_y = null;

  for (const part_str of main_build.parts) {
    const info = parse_part_string(part_str);
    const part_data = parts[info.part_number - 1];

    const center_x = info.x + part_data.width / 2;
    const center_y = info.y + part_data.height / 2;

    if (base_x === null) {
      base_x = center_x;
      base_y = center_y;
    }

    const exported_part = {
      pid: parseInt(info.pid, 10),
      part_number: info.part_number,
      rel_X: center_x - base_x,
      rel_Y: center_y - base_y,
      parent_pid: part_parent[info.pid] || null,
      isInnerTank: info.is_inner,
      fuelType: part_data.fuelType || null,
      capacity: info.is_inner ? 1000 : 0
    };
    exported_rocket.push(exported_part);
    pid_to_export[info.pid] = exported_part;
  }

  game_State.active_rocket = exported_rocket;

  game_State.fuel_lines = fuel_lines.map(line => ({
    from_pid: line.from_pid,
    to_pid: line.to_pid
  }));

  game_State.stages = side_panel_boxes.map(box => ({
    parts: box.picked_pids
      .map(pid => pid_to_export[String(pid)])
      .filter(p => p !== undefined)
  }));

  return 'game';
}



function set_parent(child_pid, parent_pid) {
  const old_parent = part_parent[child_pid];
  if (old_parent && part_children[old_parent]) {
    part_children[old_parent] = part_children[old_parent].filter(id => id !== child_pid);
  }

  if (parent_pid) {
    part_parent[child_pid] = String(parent_pid);
    const parent_key = String(parent_pid);
    if (!part_children[parent_key]) part_children[parent_key] = [];
    part_children[parent_key].push(String(child_pid));
  } else {
    part_parent[child_pid] = null;
  }
}

function record_attachment(new_pid, host_pid, own_letter, host_letter) {
  set_parent(new_pid, host_pid);
  part_link_to_parent[new_pid] = { host_pid: String(host_pid), own_letter: own_letter, host_letter: host_letter };
}

function detach_from_parent(pid) {
  set_parent(pid, null);
  delete part_link_to_parent[pid];
}

function collect_descendant_pids(root_pid) {
  const result = new Set([String(root_pid)]);
  const queue = [String(root_pid)];

  while (queue.length > 0) {
    const current = queue.shift();
    const kids = part_children[current];
    if (!kids) continue;

    for (const kid of kids) {
      if (!result.has(kid)) {
        result.add(kid);
        queue.push(kid);
      }
    }
  }
  return result;
}

function is_main_rocket(pid) {
  if (!main_capsule_pid) return false;
  let current = String(pid);
  while (current && current !== main_capsule_pid) {
    current = part_parent[current];
  }
  return current === main_capsule_pid;
}

function get_rocket_pids(start_pid) {
  const visited = new Set([String(start_pid)]);
  const queue = [String(start_pid)];

  while (queue.length > 0) {
    const current = queue.shift();

    const is_start = current === String(start_pid);
    if (!is_start && is_seperator(get_part_data_by_pid(current))) continue;

    const neighbors = [part_parent[current], ...(part_children[current] || [])].filter(Boolean);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited;
}

function get_rocket_box(start_pid) {
  const pids = get_rocket_pids(start_pid);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pid of pids) {
    const rect = get_part_world_rect(pid);
    if (!rect) continue;
    minX = Math.min(minX, rect.x);
    maxX = Math.max(maxX, rect.x + rect.w);
    minY = Math.min(minY, rect.y);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
}


function get_point_array(form_string) {
  if (!form_string) return [];

  const points = [];
  const segments = form_string.split(',');
  for (const segment of segments) {
    const match = segment.match(/(-?\d+)z(-?\d+)/);
    if (!match) continue;
    points.push({ x: parseInt(match[1], 10), y: parseInt(match[2], 10) });
  }
  return points;
}

function create_part_point_string(pid, part_index, world_x, world_y, shape) {
  const points = get_point_array(shape);
  if (points.length === 0) return null;

  const world_points = points.map(pt => `${world_x + pt.x}z${world_y + pt.y}`);
  return `${pid}P${part_index + 1}:${world_points.join(',')}`;
}

function get_bounds_from_point_string(point_string) {
  const point_texts = point_string.split(':')[1].split(',');
  let min_x = Infinity;
  let max_x = -Infinity;
  let min_y = Infinity;
  let max_y = -Infinity;

  for (const text of point_texts) {
    const match = text.match(/(-?\d+)z(-?\d+)/);
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    if (x < min_x) min_x = x;
    if (x > max_x) max_x = x;
    if (y < min_y) min_y = y;
    if (y > max_y) max_y = y;
  }
  return { min_x: min_x, max_x: max_x, min_y: min_y, max_y: max_y };
}

function check_overlap(new_x, new_y, part_width, part_height) {
  const new_right = new_x + part_width;
  const new_bottom = new_y + part_height;

  for (const rocket of Different_Builds_Point_Array) {
    for (const point_string of rocket.parts) {
      const bounds = get_bounds_from_point_string(point_string);
      const overlaps_x = new_x < bounds.max_x && new_right > bounds.min_x;
      const overlaps_y = new_y < bounds.max_y && new_bottom > bounds.min_y;
      if (overlaps_x && overlaps_y) return true;
    }
  }
  return false;
}

function is_point_in_polygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const crosses_height = (yi > py) !== (yj > py);
    const intersect = crosses_height && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function is_point_in_any_polygon(px, py, polygons) {
  for (const polygon of polygons) {
    if (is_point_in_polygon(px, py, polygon)) return true;
  }
  return false;
}



function get_fuel_line_safe_area(rect) {
  const margin = Math.max(0, Math.min(fuel_line_edge_margin, rect.w / 2 - 2, rect.h / 2 - 2));
  return {
    x: rect.x + margin,
    y: rect.y + margin,
    w: rect.w - margin * 2,
    h: rect.h - margin * 2
  };
}

function clamp_point_to_area(px, py, area) {
  return {
    x: Math.max(area.x, Math.min(area.x + area.w, px)),
    y: Math.max(area.y, Math.min(area.y + area.h, py))
  };
}

function is_cell_far_from_edge(temp_cells, cx, cy, cols, rows, cell_size, margin_cells) {
  for (let dy = -margin_cells; dy <= margin_cells; dy++) {
    for (let dx = -margin_cells; dx <= margin_cells; dx++) {
      const distance = Math.sqrt(dx * dx + dy * dy) * cell_size;
      if (distance > fuel_line_edge_margin) continue;

      const nx = cx + dx;
      const ny = cy + dy;
      const is_outside_grid = nx < 0 || ny < 0 || nx >= cols || ny >= rows;
      if (is_outside_grid) return false;
      if (temp_cells[ny * cols + nx] === 0) return false;
    }
  }
  return true;
}

function build_stage_grid(stage_pids, box, cell_size) {
  const cols = Math.max(1, Math.ceil((box.maxX - box.minX) / cell_size));
  const rows = Math.max(1, Math.ceil((box.maxY - box.minY) / cell_size));

  const part_polygons = [];
  for (const pid of stage_pids) {
    const rect = get_part_world_rect(pid);
    const part_data = get_part_data_by_pid(pid);
    if (!rect || !part_data || is_seperator(part_data)) continue;

    const local_points = get_point_array(part_data.form);
    const world_points = local_points.map(pt => ({ x: rect.x + pt.x, y: rect.y + pt.y }));
    part_polygons.push(world_points);
  }

  const temp_cells = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const world_x = box.minX + cx * cell_size + cell_size / 2;
      const world_y = box.minY + cy * cell_size + cell_size / 2;
      if (is_point_in_any_polygon(world_x, world_y, part_polygons)) {
        temp_cells[cy * cols + cx] = 1;
      }
    }
  }

  const cells = new Uint8Array(cols * rows);
  const margin_cells = Math.ceil(fuel_line_edge_margin / cell_size);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      if (temp_cells[cy * cols + cx] !== 1) continue;
      if (is_cell_far_from_edge(temp_cells, cx, cy, cols, rows, cell_size, margin_cells)) {
        cells[cy * cols + cx] = 1;
      }
    }
  }

  return { cols: cols, rows: rows, cellSize: cell_size, originX: box.minX, originY: box.minY, cells: cells, temp_cells: temp_cells };
}

function world_to_cell(x, y, grid) {
  const cx = Math.floor((x - grid.originX) / grid.cellSize);
  const cy = Math.floor((y - grid.originY) / grid.cellSize);
  return {
    cx: Math.max(0, Math.min(grid.cols - 1, cx)),
    cy: Math.max(0, Math.min(grid.rows - 1, cy))
  };
}

function cell_to_world(cx, cy, grid) {
  return {
    x: grid.originX + cx * grid.cellSize + grid.cellSize / 2,
    y: grid.originY + cy * grid.cellSize + grid.cellSize / 2
  };
}



function is_segment_valid(p1, p2, grid, cell_array) {
  const c1 = world_to_cell(p1.x, p1.y, grid);
  const c2 = world_to_cell(p2.x, p2.y, grid);
  const min_cx = Math.min(c1.cx, c2.cx);
  const max_cx = Math.max(c1.cx, c2.cx);
  const min_cy = Math.min(c1.cy, c2.cy);
  const max_cy = Math.max(c1.cy, c2.cy);

  for (let cy = min_cy; cy <= max_cy; cy++) {
    for (let cx = min_cx; cx <= max_cx; cx++) {
      if (cell_array[cy * grid.cols + cx] !== 1) return false;
    }
  }
  return true;
}

function try_l_corner(p1, p2, grid, cell_array) {
  const is_straight = (p1.x === p2.x || p1.y === p2.y);
  if (is_straight) {
    if (is_segment_valid(p1, p2, grid, cell_array)) return [p1, p2];
    return null;
  }

  const corner_1 = { x: p2.x, y: p1.y };
  if (is_segment_valid(p1, corner_1, grid, cell_array) && is_segment_valid(corner_1, p2, grid, cell_array)) {
    return [p1, corner_1, p2];
  }

  const corner_2 = { x: p1.x, y: p2.y };
  if (is_segment_valid(p1, corner_2, grid, cell_array) && is_segment_valid(corner_2, p2, grid, cell_array)) {
    return [p1, corner_2, p2];
  }

  return null;
}

function try_z_corner(p1, p2, grid, cell_array) {
  const mid_x = (p1.x + p2.x) / 2;
  const a1 = { x: mid_x, y: p1.y };
  const a2 = { x: mid_x, y: p2.y };
  if (is_segment_valid(p1, a1, grid, cell_array) && is_segment_valid(a1, a2, grid, cell_array) && is_segment_valid(a2, p2, grid, cell_array)) {
    return [p1, a1, a2, p2];
  }

  const mid_y = (p1.y + p2.y) / 2;
  const b1 = { x: p1.x, y: mid_y };
  const b2 = { x: p2.x, y: mid_y };
  if (is_segment_valid(p1, b1, grid, cell_array) && is_segment_valid(b1, b2, grid, cell_array) && is_segment_valid(b2, p2, grid, cell_array)) {
    return [p1, b1, b2, p2];
  }

  return null;
}

function simplify_path_to_min_corners(raw_path, grid, cell_array) {
  if (raw_path.length <= 2) return raw_path;

  const result = [raw_path[0]];
  let current_index = 0;

  while (current_index < raw_path.length - 1) {
    const last_point = result[result.length - 1];
    let best_shortcut = null;
    let best_index = current_index + 1;

    for (let j = raw_path.length - 1; j > current_index; j--) {
      const shortcut = try_l_corner(last_point, raw_path[j], grid, cell_array);
      if (shortcut) {
        best_shortcut = shortcut;
        best_index = j;
        break;
      }
    }

    if (best_shortcut) {
      for (let k = 1; k < best_shortcut.length; k++) {
        result.push(best_shortcut[k]);
      }
      current_index = best_index;
    } else {
      current_index++;
      result.push(raw_path[current_index]);
    }
  }

  const cleaned = [result[0]];
  for (let i = 1; i < result.length - 1; i++) {
    const prev = cleaned[cleaned.length - 1];
    const curr = result[i];
    const next = result[i + 1];

    const dir1_x = Math.sign(curr.x - prev.x);
    const dir1_y = Math.sign(curr.y - prev.y);
    const dir2_x = Math.sign(next.x - curr.x);
    const dir2_y = Math.sign(next.y - curr.y);

    const same_direction = dir1_x === dir2_x && dir1_y === dir2_y;
    if (same_direction) continue;
    cleaned.push(curr);
  }
  cleaned.push(result[result.length - 1]);
  return cleaned;
}

function find_nearest_inside_cell(cell, grid, cell_array) {
  if (cell_array[cell.cy * grid.cols + cell.cx] === 1) return cell;

  let best_cell = null;
  let best_distance = Infinity;
  const max_radius = Math.max(grid.cols, grid.rows);

  for (let radius = 1; radius < max_radius; radius++) {
    let found_in_radius = false;
    const min_cx = Math.max(0, cell.cx - radius);
    const max_cx = Math.min(grid.cols - 1, cell.cx + radius);
    const min_cy = Math.max(0, cell.cy - radius);
    const max_cy = Math.min(grid.rows - 1, cell.cy + radius);

    for (let cy = min_cy; cy <= max_cy; cy++) {
      for (let cx = min_cx; cx <= max_cx; cx++) {
        const is_on_ring = (cy === min_cy || cy === max_cy || cx === min_cx || cx === max_cx);
        if (!is_on_ring) continue;
        if (cell_array[cy * grid.cols + cx] !== 1) continue;

        const distance = (cx - cell.cx) ** 2 + (cy - cell.cy) ** 2;
        if (distance < best_distance) {
          best_distance = distance;
          best_cell = { cx: cx, cy: cy };
          found_in_radius = true;
        }
      }
    }

    if (found_in_radius && best_distance <= (radius + 1) ** 2) break;
  }

  if (best_cell) return best_cell;
  return cell;
}

function run_astar(start_world, end_world, grid, cell_array) {
  const start_cell = find_nearest_inside_cell(world_to_cell(start_world.x, start_world.y, grid), grid, cell_array);
  const end_cell = find_nearest_inside_cell(world_to_cell(end_world.x, end_world.y, grid), grid, cell_array);

  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const turn_penalty = 4;
  const max_steps = 25000;

  const open_list = [];
  const g_scores = new Map();
  const came_from = new Map();

  const start_key = `${start_cell.cx}_${start_cell.cy}_-1`;
  g_scores.set(start_key, 0);
  open_list.push({
    cx: start_cell.cx,
    cy: start_cell.cy,
    dir: -1,
    f: Math.abs(start_cell.cx - end_cell.cx) + Math.abs(start_cell.cy - end_cell.cy)
  });

  let end_state = null;
  let steps = 0;

  while (open_list.length > 0 && steps < max_steps) {
    steps++;

    let best_index = 0;
    for (let i = 1; i < open_list.length; i++) {
      if (open_list[i].f < open_list[best_index].f) best_index = i;
    }
    const current = open_list.splice(best_index, 1)[0];

    if (current.cx === end_cell.cx && current.cy === end_cell.cy) {
      end_state = current;
      break;
    }

    const current_g = g_scores.get(`${current.cx}_${current.cy}_${current.dir}`);

    for (let d = 0; d < 4; d++) {
      const nx = current.cx + directions[d][0];
      const ny = current.cy + directions[d][1];
      if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
      if (cell_array[ny * grid.cols + nx] !== 1) continue;

      const is_turn = (current.dir !== -1 && current.dir !== d);
      const new_g = current_g + 1 + (is_turn ? turn_penalty : 0);
      const next_key = `${nx}_${ny}_${d}`;

      const is_better = !g_scores.has(next_key) || new_g < g_scores.get(next_key);
      if (is_better) {
        g_scores.set(next_key, new_g);
        came_from.set(next_key, `${current.cx}_${current.cy}_${current.dir}`);
        open_list.push({ cx: nx, cy: ny, dir: d, f: new_g + Math.abs(nx - end_cell.cx) + Math.abs(ny - end_cell.cy) });
      }
    }
  }

  if (!end_state) return null;

  const cell_path = [];
  let key = `${end_state.cx}_${end_state.cy}_${end_state.dir}`;
  while (key) {
    const pieces = key.split('_');
    cell_path.push({ cx: parseInt(pieces[0], 10), cy: parseInt(pieces[1], 10) });
    key = came_from.get(key);
  }
  cell_path.reverse();

  return cell_path.map(cell => cell_to_world(cell.cx, cell.cy, grid));
}

function find_path_through_rocket(start_world, end_world, grid) {
  let shortcut = try_l_corner(start_world, end_world, grid, grid.cells);
  if (!shortcut) shortcut = try_l_corner(start_world, end_world, grid, grid.temp_cells);
  if (!shortcut) shortcut = try_z_corner(start_world, end_world, grid, grid.cells);
  if (!shortcut) shortcut = try_z_corner(start_world, end_world, grid, grid.temp_cells);

  if (shortcut) {
    return simplify_path_to_min_corners(shortcut, grid, grid.temp_cells);
  }

  let active_cell_array = grid.cells;
  let raw_path = run_astar(start_world, end_world, grid, grid.cells);

  if (!raw_path) {
    active_cell_array = grid.temp_cells;
    raw_path = run_astar(start_world, end_world, grid, grid.temp_cells);
  }

  const end_cell = world_to_cell(end_world.x, end_world.y, grid);
  const end_is_inside = active_cell_array[end_cell.cy * grid.cols + end_cell.cx] === 1;

  if (!raw_path) {
    if (end_is_inside) return [start_world, end_world];
    return [start_world, start_world];
  }

  raw_path[0] = start_world;
  if (end_is_inside) {
    raw_path[raw_path.length - 1] = end_world;
  }
  return simplify_path_to_min_corners(raw_path, grid, active_cell_array);
}



function segment_orientation(a, b) {
  if (Math.abs(a.y - b.y) < fuel_line_collinear_eps) return 'H';
  if (Math.abs(a.x - b.x) < fuel_line_collinear_eps) return 'V';
  return null;
}

function segments_from_path(path) {
  const segments = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const orient = segment_orientation(a, b);
    if (orient) segments.push({ a: a, b: b, orient: orient });
  }
  return segments;
}

function collinear_overlap_length(seg1, seg2) {
  if (seg1.orient !== seg2.orient) return 0;

  let overlap;
  if (seg1.orient === 'H') {
    if (Math.abs(seg1.a.y - seg2.a.y) > fuel_line_collinear_eps) return 0;
    const seg1_max = Math.max(seg1.a.x, seg1.b.x);
    const seg1_min = Math.min(seg1.a.x, seg1.b.x);
    const seg2_max = Math.max(seg2.a.x, seg2.b.x);
    const seg2_min = Math.min(seg2.a.x, seg2.b.x);
    overlap = Math.min(seg1_max, seg2_max) - Math.max(seg1_min, seg2_min);
  } else {
    if (Math.abs(seg1.a.x - seg2.a.x) > fuel_line_collinear_eps) return 0;
    const seg1_max = Math.max(seg1.a.y, seg1.b.y);
    const seg1_min = Math.min(seg1.a.y, seg1.b.y);
    const seg2_max = Math.max(seg2.a.y, seg2.b.y);
    const seg2_min = Math.min(seg2.a.y, seg2.b.y);
    overlap = Math.min(seg1_max, seg2_max) - Math.max(seg1_min, seg2_min);
  }

  if (overlap > 0) return overlap;
  return 0;
}

function offset_segment(seg, offset) {
  if (seg.orient === 'H') {
    return { a: { x: seg.a.x, y: seg.a.y + offset }, b: { x: seg.b.x, y: seg.b.y + offset } };
  }
  return { a: { x: seg.a.x + offset, y: seg.a.y }, b: { x: seg.b.x + offset, y: seg.b.y } };
}

function find_worst_overlap(seg, other_segments) {
  let worst = 0;
  for (const other of other_segments) {
    const overlap = collinear_overlap_length(seg, other);
    if (overlap > worst) worst = overlap;
  }
  return worst;
}

function find_free_lane_offset(seg, other_segments) {
  let signs;
  if (seg.orient === 'H') {
    signs = seg.a.x > seg.b.x ? [1, -1] : [-1, 1];
  } else {
    signs = seg.a.y > seg.b.y ? [-1, 1] : [1, -1];
  }

  for (let lane = 1; lane <= fuel_line_max_lanes; lane++) {
    for (const sign of signs) {
      const offset = lane * fuel_line_lane_width * sign;
      const shifted = offset_segment(seg, offset);
      const shifted_seg = { a: shifted.a, b: shifted.b, orient: seg.orient };

      let is_free = true;
      for (const other of other_segments) {
        if (collinear_overlap_length(shifted_seg, other) > 0) {
          is_free = false;
          break;
        }
      }
      if (is_free) return offset;
    }
  }
  return null;
}

function build_lane_jog(a, b, orient, offset) {
  if (orient === 'H') {
    return [{ x: a.x, y: a.y + offset }, { x: b.x, y: a.y + offset }, { x: b.x, y: b.y }];
  }
  return [{ x: a.x + offset, y: a.y }, { x: a.x + offset, y: b.y }, { x: b.x, y: b.y }];
}

function simplify_collinear_points(points) {
  if (points.length <= 2) return points;

  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dir1_x = Math.sign(curr.x - prev.x);
    const dir1_y = Math.sign(curr.y - prev.y);
    const dir2_x = Math.sign(next.x - curr.x);
    const dir2_y = Math.sign(next.y - curr.y);

    const same_direction = dir1_x === dir2_x && dir1_y === dir2_y;
    const is_zero_length = dir1_x === 0 && dir1_y === 0;
    if (same_direction && !is_zero_length) continue;
    result.push(curr);
  }
  result.push(points[points.length - 1]);
  return result;
}

function resolve_fuel_line_lanes(raw_path, other_segments) {
  if (raw_path.length < 2) return raw_path;

  const result_points = [raw_path[0]];

  for (let i = 0; i < raw_path.length - 1; i++) {
    const a = raw_path[i];
    const b = raw_path[i + 1];
    const orient = segment_orientation(a, b);

    if (!orient) {
      result_points.push(b);
      continue;
    }

    const seg = { a: a, b: b, orient: orient };
    const worst_overlap = find_worst_overlap(seg, other_segments);

    if (worst_overlap <= 0) {
      result_points.push(b);
      continue;
    }

    if (worst_overlap > fuel_line_max_overlap_run) return result_points;

    const lane_offset = find_free_lane_offset(seg, other_segments);
    if (lane_offset === null) return result_points;

    const jog = build_lane_jog(a, b, orient, lane_offset);
    for (const point of jog) result_points.push(point);
  }

  return simplify_collinear_points(result_points);
}

function compute_all_fuel_line_paths() {
  let current_hash = fuel_lines.length + "_";
  for (let i = 0; i < Different_Builds.length; i++) {
    current_hash += Different_Builds[i].parts.join(",") + "|";
  }

  if (current_hash === last_rocket_hash) return;
  last_rocket_hash = current_hash;

  resolved_fuel_line_paths = [];
  const accumulated_segments = [];

  for (let i = 0; i < fuel_lines.length; i++) {
    const line = fuel_lines[i];
    const rect_1 = get_part_world_rect(line.from_pid);
    const rect_2 = get_part_world_rect(line.to_pid);

    if (!rect_1 || !rect_2) {
      resolved_fuel_line_paths.push({ path: [] });
      continue;
    }

    const p1 = { x: rect_1.x + line.from_offset.x, y: rect_1.y + line.from_offset.y };
    const p2 = { x: rect_2.x + line.to_offset.x, y: rect_2.y + line.to_offset.y };

    const stage_pids = get_rocket_pids(line.from_pid);
    const stage_box = get_rocket_box(line.from_pid);
    const grid = build_stage_grid(stage_pids, stage_box, fuel_line_grid_cell);

    const raw_path = find_path_through_rocket(p1, p2, grid);
    const final_path = resolve_fuel_line_lanes(raw_path, accumulated_segments);

    resolved_fuel_line_paths.push({ path: final_path });
    accumulated_segments.push(...segments_from_path(final_path));
  }
}


function is_box_pick_selectable(pid, part_data) {
  if (!is_main_rocket(pid)) return false;
  const name_lower = part_data.name.toLowerCase();
  return is_seperator(part_data) || name_lower.includes('engine');
}

function is_special_mode_selectable(pid, part_data) {
  if (!is_main_rocket(pid)) return false;

  const name_lower = part_data.name.toLowerCase();
  const is_separator = is_seperator(part_data);
  const is_engine_plate = name_lower.includes('engine_plate');
  const is_connectable_tank = is_tank(part_data);

  if (restrict_mode === 0) return is_connectable_tank;

  if (is_separator || is_engine_plate) return true;

  if (is_connectable_tank) {
    let tank_number = 1;
    if (Tank_Number_State[pid] !== undefined) tank_number = Tank_Number_State[pid];
    if (tank_number === selected_tank_number) return true;
  }
  return false;
}

function is_part_grayed(pid, part_data) {
  if (!is_main_rocket(pid)) return true;
  if (filter_mode === 1) return !is_special_mode_selectable(pid, part_data);
  if (box_pick_mode === 1) return !is_box_pick_selectable(pid, part_data);
  return false;
}



function create_tank_state(pid, part, world_x, world_y) {
  if (!part.capacity || !part.Slot_Points) return;

  const local_slots = get_point_array(part.Slot_Points);
  Tank_Fill_State[pid] = {
    capacity: part.capacity,
    used: 0,
    slots: new Array(part.capacity).fill(null),
    Slot_Points: local_slots.map(p => ({ x: world_x + p.x, y: world_y + p.y }))
  };
}

function get_tank_slot_world_point(pid, slot_index) {
  return Tank_Fill_State[pid].Slot_Points[slot_index];
}

function free_inner_tank_slots(pid) {
  const parent_pid = part_parent[pid];
  if (!parent_pid) return;

  const state = Tank_Fill_State[parent_pid];
  if (!state) return;   

  const numeric_pid = Number(pid);
  let freed = 0;
  for (let k = 0; k < state.slots.length; k++) {
    if (state.slots[k] === numeric_pid) {
      state.slots[k] = null;
      freed++;
    }
  }
  state.used = Math.max(0, state.used - freed);
}

function are_slots_free(state, start, count) {
  for (let k = start; k < start + count; k++) {
    if (state.slots[k] !== null && state.slots[k] !== undefined) return false;
  }
  return true;
}

function get_Inner_Tank_Snap_Points(part) {
  const slot_count = part.value;

  const own_top_point = (part.Con_Points || '').split(',').map(text => parse_Con_Points(text)).find(p => p && p.letter === 'T');
  const offset_x = own_top_point ? own_top_point.x : 0;
  const offset_y = own_top_point ? own_top_point.z : 0;

  const snap_points = [];

  for (const tank_pid in Tank_Fill_State) {
    if (!is_main_rocket(tank_pid)) continue;
    const state = Tank_Fill_State[tank_pid];

    for (let start = 0; start <= state.capacity - slot_count; start++) {
      if (!are_slots_free(state, start, slot_count)) continue;

      const slot_point = state.Slot_Points[start];
      if (!slot_point) continue;

      snap_points.push({
        x: slot_point.x,
        y: slot_point.y,
        own_offset_x: offset_x,
        own_offset_y: offset_y,
        pid: tank_pid,
        target_letter: null,
        own_letter: null,
        target_flags: [],
        slot_start: start
      });
    }
  }
  return snap_points;
}

function place_Inner_Tank(host_pid, part, save_x, save_y, slot_start) {
  const state = Tank_Fill_State[host_pid];
  const slot_count = part.value;

  for (let k = slot_start; k < slot_start + slot_count; k++) {
    state.slots[k] = next_pid;
  }
  state.used += slot_count;

  const new_part_str = `${next_pid}P${part_clicked + 1}x${save_x}y${save_y}I`;
  const build_index = find_build_index_by_pid(host_pid);
  Different_Builds[build_index].parts.push(new_part_str);

  Tank_Number_State[String(next_pid)] = get_default_tank_number(part);

  set_parent(String(next_pid), host_pid);
  next_pid++;
}



function parse_Con_Points(text) {
  const match = text.match(/^([TBLRM])(-?\d+)z(-?\d+)(S\d+)?([A-Z]*)$/);
  if (!match) return null;
  return {
    letter: match[1],
    x: Number(match[2]),
    z: Number(match[3]),
    socket: match[4] || null,
    flags: match[5] ? match[5].split('') : []
  };
}

function get_opposite_letters(letter) {
  if (letter === 'T') return ['B'];
  if (letter === 'B') return ['T'];
  if (letter === 'L') return ['R'];
  if (letter === 'R') return ['L'];
  return [];
}

// 100003P5x928y350W0T10z0W1B10z40
function get_Con_Data(str, letter) {
  const pid = str.split('P')[0];
  const position = str.match(/x(-?\d+)y(-?\d+)/);
  const socket_texts = str.split('W').slice(1);
  const pattern = new RegExp(`${letter}(-?\\d+)z(-?\\d+)(S\\d+)?([A-Z]*)`);

  for (const socket_text of socket_texts) {
    const match = socket_text.match(pattern);
    if (match) {
      return {
        pid: pid,
        letter: letter,
        x: Number(position[1]) + Number(match[1]),
        y: Number(position[2]) + Number(match[2]),
        socket: match[3] || null,
        flags: match[4] ? match[4].split('') : []
      };
    }
  }
  return null;
}

function get_con_w_index(part_number, letter) {
  const con_points = parts[part_number - 1].Con_Points.split(',');
  return con_points.findIndex(cp => cp.startsWith(letter));
}

function build_connection_string(part_pid, part_number, x, y, con_points_text) {
  const con_points = con_points_text.split(',');
  let text = `${part_pid}P${part_number}x${x}y${y}`;
  for (let i = 0; i < con_points.length; i++) {
    text += `W${i}${con_points[i]}`;
  }
  return text;
}

function get_socket_snap_points(part) {
  const snap_points = [];
  const own_con_points = (part.Con_Points || '').split(',');

  for (const own_text of own_con_points) {
    const own_point = parse_Con_Points(own_text);
    if (!own_point) continue;

    const target_letters = get_opposite_letters(own_point.letter);
    for (const target_letter of target_letters) {
      for (const con_string of Build_Menu_Con_Points) {
        if (!con_string.includes(target_letter)) continue;

        const target_point = get_Con_Data(con_string, target_letter);
        if (target_point && target_point.socket === own_point.socket) {
          snap_points.push({
            x: target_point.x,
            y: target_point.y,
            own_offset_x: own_point.x,
            own_offset_y: own_point.z,
            pid: target_point.pid,
            target_letter: target_point.letter,
            own_letter: own_point.letter,
            target_flags: target_point.flags,
            slot_start: -1
          });
        }
      }
    }
  }
  return snap_points;
}

function find_closest_snap_point(snap_points, world_x, world_y) {
  let closest = null;
  let smallest_distance = 9999;

  for (const point of snap_points) {
    const distance = Math.sqrt((world_x - point.x) ** 2 + (world_y - point.y) ** 2);
    if (distance < smallest_distance && distance < snap_int) {
      smallest_distance = distance;
      closest = point;
    }
  }
  return closest;
}

function get_free_snap_position(image) {
  const grid_size = build_mode_scroll * 5;
  return {
    x: Math.round(mouseX / grid_size) * grid_size - (image.naturalWidth / 2) * build_mode_scroll,
    y: Math.round(mouseY / grid_size) * grid_size - (image.naturalHeight / 2) * build_mode_scroll
  };
}



function place_first_capsule() {
  const part = parts[part_clicked];
  const start_x = 928;
  const start_y = 350;

  Different_Builds.push({ parts: [`${next_pid}P${part_clicked + 1}x${start_x}y${start_y}`], root_pid: `${next_pid}` });
  Different_Builds_Point_Array.push({ parts: [] });

  const point_string = create_part_point_string(next_pid, part_clicked, start_x, start_y, part.form);
  if (point_string) Different_Builds_Point_Array[0].parts.push(point_string);

  Build_Menu_Con_Points.push(build_connection_string(next_pid, part_clicked + 1, start_x, start_y, part.Con_Points));

  create_tank_state(next_pid, part, start_x, start_y);

  main_capsule_pid = String(next_pid);
  set_parent(main_capsule_pid, null);

  next_pid++;
  part_clicked_once = 1;
  Different_Builds_Count = 1;
  part_clicked = 0;
}

function place_normal_part(save_x, save_y, hit_pid, hit_letter, hit_target_letter, has_mirror, mirror_x) {
  const part = parts[part_clicked];
  const part_number = part_clicked + 1;
  const primary_pid = next_pid;

  const part_str = `${primary_pid}P${part_number}x${save_x}y${save_y}`;
  const point_str = create_part_point_string(primary_pid, part_clicked, save_x, save_y, part.form);
  let con_str = build_connection_string(primary_pid, part_number, save_x, save_y, part.Con_Points);

  let target_build_index = 0;

  if (hit_pid !== 0) {
    const host_con_index = Build_Menu_Con_Points.findIndex(str => str.startsWith(`${hit_pid}P`));
    Build_Menu_Con_Points[host_con_index] = Build_Menu_Con_Points[host_con_index].replace(hit_target_letter, 'X');
    con_str = con_str.replace(hit_letter, 'X');

    target_build_index = find_build_index_by_pid(hit_pid);
    const host_index = Different_Builds[target_build_index].parts.findIndex(p => p.startsWith(`${hit_pid}P`));
    const insert_index = host_index + 1;

    Different_Builds[target_build_index].parts.splice(insert_index, 0, part_str);
    if (point_str) Different_Builds_Point_Array[target_build_index].parts.splice(insert_index, 0, point_str);

    record_attachment(String(primary_pid), hit_pid, hit_letter, hit_target_letter);
  } else {
    Different_Builds.push({ parts: [part_str], root_pid: `${primary_pid}` });
    if (point_str) Different_Builds_Point_Array.push({ parts: [point_str] });

    set_parent(String(primary_pid), null);
  }

  if (is_structure_tank(part)) {
    Tank_Number_State[String(primary_pid)] = get_default_tank_number(part);
  }

  Build_Menu_Con_Points.push(con_str);
  create_tank_state(primary_pid, part, save_x, save_y);
  next_pid++;

  if (!has_mirror) return;

  const mirror_pid = next_pid;
  const mirror_save_x = Math.round(mirror_x);

  const mirror_part_str = `${mirror_pid}P${part_number}x${mirror_save_x}y${save_y}`;
  const mirror_point_str = create_part_point_string(mirror_pid, part_clicked, mirror_save_x, save_y, part.form);

  Different_Builds[target_build_index].parts.push(mirror_part_str);
  if (mirror_point_str) Different_Builds_Point_Array[target_build_index].parts.push(mirror_point_str);

  let mirror_con_str = build_connection_string(mirror_pid, part_number, mirror_save_x, save_y, part.Con_Points);

  if (hit_pid !== 0) {
    mirror_con_str = mirror_con_str.replace(hit_letter, 'X');

    const mirror_parent_pid = symmetry_links[hit_pid] || hit_pid;
    record_attachment(String(mirror_pid), mirror_parent_pid, hit_letter, hit_target_letter);
  } else {
    set_parent(String(mirror_pid), null);
  }

  if (is_structure_tank(part)) {
    Tank_Number_State[String(mirror_pid)] = get_default_tank_number(part);
  }

  Build_Menu_Con_Points.push(mirror_con_str);
  create_tank_state(mirror_pid, part, mirror_save_x, save_y);

  symmetry_links[primary_pid] = mirror_pid;
  symmetry_links[mirror_pid] = primary_pid;
  next_pid++;
}

function update_place_mode() {
  const part = parts[part_clicked];
  const image = part.Img;
  const is_inner_slot_mode = part.isInnerTank && tank_mode === 1;

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipWidth, clipHeight);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;

  const scaled_width = image.naturalWidth * build_mode_scroll;
  const scaled_height = image.naturalHeight * build_mode_scroll;

  let snap_points;
  if (is_inner_slot_mode) {
    snap_points = get_Inner_Tank_Snap_Points(part);
  } else {
    snap_points = get_socket_snap_points(part);
  }

  const mouse_world = get_mouse_world_position();
  const closest = find_closest_snap_point(snap_points, mouse_world.x, mouse_world.y);

  let snap_x;
  let snap_y;
  let hit_pid = 0;
  let hit_target_letter = 0;
  let hit_letter = 0;
  let hit_target_flags = [];
  let hit_slot_start = -1;

  if (closest) {
    snap_x = clipX + (closest.x - closest.own_offset_x - cameraX) * build_mode_scroll;
    snap_y = clipY + (closest.y - closest.own_offset_y - cameraY) * build_mode_scroll;
    hit_pid = closest.pid;
    hit_target_letter = closest.target_letter;
    hit_letter = closest.own_letter;
    hit_target_flags = closest.target_flags;
    hit_slot_start = closest.slot_start;
  } else {
    const free_position = get_free_snap_position(image);
    snap_x = free_position.x;
    snap_y = free_position.y;
  }

  const check_x = (snap_x - clipX) / build_mode_scroll + cameraX;
  const check_y = (snap_y - clipY) / build_mode_scroll + cameraY;
  const part_w = part.width;
  const part_h = part.height;

  const symmetry_center_x = get_symmetry_center_X();
  const part_center_x = check_x + part_w / 2;
  const distance_from_center = part_center_x - symmetry_center_x;
  const has_mirror = (symmetry_mode === 1 && Math.abs(distance_from_center) > 1);

  let is_primary_colliding;
  if (is_inner_slot_mode) {
    is_primary_colliding = !closest;
  } else {
    is_primary_colliding = check_overlap(check_x, check_y, part_w, part_h);
  }

  let mirror_check_x = 0;
  let is_mirror_colliding = false;
  if (has_mirror) {
    mirror_check_x = 2 * symmetry_center_x - check_x - part_w;
    is_mirror_colliding = check_overlap(mirror_check_x, check_y, part_w, part_h);
  }

  const is_colliding = is_primary_colliding || is_mirror_colliding;

  const target_has_h_flag = hit_target_flags.includes('H');
  if (closest && target_has_h_flag && !part.name.includes('Seperator')) {
    snaped = 0;
  }

  const placement_blocked = is_colliding && (!part.isInnerTank || !closest);
  if (placement_blocked) snaped = 0;

  if (snaped == 1 && !placement_blocked) {
    const save_x = Math.round((snap_x - clipX) / build_mode_scroll + cameraX);
    const save_y = Math.round((snap_y - clipY) / build_mode_scroll + cameraY);

    if (is_inner_slot_mode && hit_slot_start !== -1) {
      place_Inner_Tank(hit_pid, part, save_x, save_y, hit_slot_start);
    } else {
      place_normal_part(save_x, save_y, hit_pid, hit_letter, hit_target_letter, has_mirror, mirror_check_x);
    }

    snaped = 0;
    in_place_mode = 0;
    part_clicked = 0;
  }

  const hit_is_outside_main_rocket = hit_pid !== 0 && !is_main_rocket(hit_pid);
  if (placement_blocked || hit_is_outside_main_rocket) {
    ctx.filter = 'grayscale(100%) opacity(50%)';
  } else {
    ctx.filter = 'none';
  }
  ctx.drawImage(image, snap_x, snap_y, scaled_width, scaled_height);

  if (has_mirror) {
    const mirror_snap_x = clipX + (mirror_check_x - cameraX) * build_mode_scroll;
    ctx.drawImage(image, mirror_snap_x, snap_y, scaled_width, scaled_height);
  }

  ctx.globalAlpha = 1.0;
  ctx.filter = 'none';
  ctx.restore();
}


function start_dragging_stack(target_str) {
  const target_pid = target_str.split('P')[0];

  for (let r = 0; r < Different_Builds.length; r++) {
    const build = Different_Builds[r];
    if (!build.parts.includes(target_str)) continue;

    const link = part_link_to_parent[target_pid];
    if (link) {
      const host_con_index = Build_Menu_Con_Points.findIndex(c => c.startsWith(`${link.host_pid}P`));
      const host_part_number = get_part_number_by_pid(link.host_pid);
      const host_w_index = get_con_w_index(host_part_number, link.host_letter);
      Build_Menu_Con_Points[host_con_index] = Build_Menu_Con_Points[host_con_index].replace(`W${host_w_index}X`, `W${host_w_index}${link.host_letter}`);
    }

    const full_set_pids = collect_descendant_pids(target_pid);

    free_inner_tank_slots(target_pid);

    dragged_stack_parts = build.parts.filter(p => full_set_pids.has(p.split('P')[0]));
    build.parts = build.parts.filter(p => !full_set_pids.has(p.split('P')[0]));

    dragged_stack_pts = Different_Builds_Point_Array[r].parts.filter(p => full_set_pids.has(p.split(':')[0].split('P')[0]));
    Different_Builds_Point_Array[r].parts = Different_Builds_Point_Array[r].parts.filter(p => !full_set_pids.has(p.split(':')[0].split('P')[0]));

    const info = parse_part_string(target_str);
    drag_top_pid = target_pid;
    drag_top_part_idx = info.part_number - 1;
    drag_anchor_X = info.x;
    drag_anchor_Y = info.y;

    dragged_stack_cons = [];
    for (const pid of full_set_pids) {
      const con_index = Build_Menu_Con_Points.findIndex(c => c.startsWith(`${pid}P`));
      if (con_index !== -1) {
        dragged_stack_cons.push(Build_Menu_Con_Points.splice(con_index, 1)[0]);
      }
    }

    if (link) {
      const top_con_index = dragged_stack_cons.findIndex(c => c.startsWith(`${drag_top_pid}P`));
      const own_w_index = get_con_w_index(drag_top_part_idx + 1, link.own_letter);
      dragged_stack_cons[top_con_index] = dragged_stack_cons[top_con_index].replace(`W${own_w_index}X`, `W${own_w_index}${link.own_letter}`);
      detach_from_parent(target_pid);
    }

    in_drag_stack_mode = 1;
    selected_part_str = null;
    hovered_placed_str = null;
    break;
  }
}

function drop_dragged_stack(closest, top_part_data, delta_x, delta_y) {
  let hit_pid = 0;
  let hit_target_letter = null;
  let hit_letter = null;
  let hit_slot_start = -1;
  let hit_own_x = 0;
  let hit_own_y = 0;

  if (closest) {
    hit_pid = closest.pid;
    hit_target_letter = closest.target_letter;
    hit_letter = closest.own_letter;
    hit_slot_start = closest.slot_start;
    hit_own_x = closest.own_offset_x;
    hit_own_y = closest.own_offset_y;
  }

  const dropping_into_slot = top_part_data.isInnerTank && tank_mode === 1 && hit_slot_start !== -1;

  let target_build_index;
  if (hit_pid !== 0) {
    target_build_index = find_build_index_by_pid(hit_pid);

    if (!dropping_into_slot) {
      const host_con_index = Build_Menu_Con_Points.findIndex(str => str.startsWith(`${hit_pid}P`));
      Build_Menu_Con_Points[host_con_index] = Build_Menu_Con_Points[host_con_index].replace(hit_target_letter, 'X');
    }
  } else {
    Different_Builds.push({ parts: [], root_pid: `${drag_top_pid}` });
    Different_Builds_Point_Array.push({ parts: [] });
    target_build_index = Different_Builds.length - 1;
  }

  for (const part_str of dragged_stack_parts) {
    const info = parse_part_string(part_str);
    const is_top = (info.pid === String(drag_top_pid));

    let new_x = info.x + delta_x;
    let new_y = info.y + delta_y;
    let flag_suffix = info.is_inner ? 'I' : '';

    const is_top_in_slot = is_top && dropping_into_slot;

    if (is_top_in_slot) {
      const slot_point = get_tank_slot_world_point(hit_pid, hit_slot_start);
      new_x = Math.round(slot_point.x - hit_own_x);
      new_y = Math.round(slot_point.y - hit_own_y);
      flag_suffix = 'I';

      const state = Tank_Fill_State[hit_pid];
      const slot_count = top_part_data.value;
      for (let k = hit_slot_start; k < hit_slot_start + slot_count; k++) {
        state.slots[k] = Number(info.pid);
      }
      state.used += slot_count;
    } else if (is_top) {
      flag_suffix = '';
    }

    Different_Builds[target_build_index].parts.push(`${info.pid}P${info.part_number}x${new_x}y${new_y}${flag_suffix}`);

    if (!is_top_in_slot) {
      const part_data = parts[info.part_number - 1];
      const point_string = create_part_point_string(info.pid, info.part_number - 1, new_x, new_y, part_data.form);
      if (point_string) Different_Builds_Point_Array[target_build_index].parts.push(point_string);
    }
  }

  for (const part_str of dragged_stack_parts) {
    const moved_pid = part_str.split('P')[0];
    const state = Tank_Fill_State[moved_pid];
    if (!state) continue;

    state.Slot_Points = state.Slot_Points.map(pt => ({ x: pt.x + delta_x, y: pt.y + delta_y }));
  }

  if (!dropping_into_slot) {
    for (const con_str of dragged_stack_cons) {
      const pid = con_str.split('P')[0];
      const match = con_str.match(/P(\d+)x(-?\d+)y(-?\d+)(.*)/);
      const new_x = parseInt(match[2], 10) + delta_x;
      const new_y = parseInt(match[3], 10) + delta_y;

      let updated_con_str = `${pid}P${match[1]}x${new_x}y${new_y}${match[4]}`;
      if (pid === String(drag_top_pid) && hit_letter) {
        updated_con_str = updated_con_str.replace(hit_letter, 'X');
      }
      Build_Menu_Con_Points.push(updated_con_str);
    }
  }

  if (dropping_into_slot) {
    set_parent(String(drag_top_pid), hit_pid);
  } else if (hit_pid !== 0) {
    record_attachment(String(drag_top_pid), hit_pid, hit_letter, hit_target_letter);
  } else {
    set_parent(String(drag_top_pid), null);
  }

  snaped = 0;
  in_drag_stack_mode = 0;
  dragged_stack_parts = [];
  dragged_stack_pts = [];
  dragged_stack_cons = [];
}

function draw_dragged_stack(delta_x, delta_y, snap_found) {
  for (const part_str of dragged_stack_parts) {
    const info = parse_part_string(part_str);
    const image = parts[info.part_number - 1].Img;

    const screen_x = clipX + (info.x + delta_x - cameraX) * build_mode_scroll;
    const screen_y = clipY + (info.y + delta_y - cameraY) * build_mode_scroll;

    if (snap_found) {
      ctx.filter = 'none';
    } else {
      ctx.filter = 'grayscale(100%) opacity(50%)';
    }
    ctx.drawImage(image, screen_x, screen_y, image.naturalWidth * build_mode_scroll, image.naturalHeight * build_mode_scroll);
    ctx.filter = 'none';
  }
}

function update_drag_mode() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipWidth, clipHeight);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;

  const top_part_data = parts[drag_top_part_idx];
  const is_inner_slot_mode = top_part_data.isInnerTank && tank_mode === 1;

  let snap_points = [];
  if (is_inner_slot_mode) {
    snap_points = get_Inner_Tank_Snap_Points(top_part_data);
  } else if (!top_part_data.isInnerTank) {
    snap_points = get_socket_snap_points(top_part_data);
  }

  const mouse_world = get_mouse_world_position();
  const closest = find_closest_snap_point(snap_points, mouse_world.x, mouse_world.y);

  let snap_x;
  let snap_y;
  if (closest) {
    snap_x = clipX + (closest.x - closest.own_offset_x - cameraX) * build_mode_scroll;
    snap_y = clipY + (closest.y - closest.own_offset_y - cameraY) * build_mode_scroll;
  } else {
    const free_position = get_free_snap_position(top_part_data.Img);
    snap_x = free_position.x;
    snap_y = free_position.y;
  }

  const save_x = Math.round((snap_x - clipX) / build_mode_scroll + cameraX);
  const save_y = Math.round((snap_y - clipY) / build_mode_scroll + cameraY);
  const delta_x = save_x - drag_anchor_X;
  const delta_y = save_y - drag_anchor_Y;

  if (snaped == 1) {
    drop_dragged_stack(closest, top_part_data, delta_x, delta_y);
  }

  if (in_drag_stack_mode === 1) {
    draw_dragged_stack(delta_x, delta_y, closest !== null);
  }

  ctx.restore();
}


function get_picked_pids_of_selected_box() {
  const picked_pids = new Set();
  if (side_panel_selected_index !== -1) {
    const active_box = side_panel_boxes[side_panel_selected_index];
    for (const pid of active_box.picked_pids) picked_pids.add(pid);
  }
  return picked_pids;
}

function get_drawable_parts(build) {
  const drawable_parts = [];

  for (const part_str of build.parts) {
    const info = parse_part_string(part_str);
    const part_data = parts[info.part_number - 1];
    if (!part_data.Img) continue;

    drawable_parts.push({
      str: part_str,
      pid: info.pid,
      data: part_data,
      img: part_data.Img,
      x: clipX + (info.x - cameraX) * build_mode_scroll,
      y: clipY + (info.y - cameraY) * build_mode_scroll,
      w: part_data.Img.naturalWidth * build_mode_scroll,
      h: part_data.Img.naturalHeight * build_mode_scroll,
      is_shell_enclosed: info.is_inner
    });
  }
  return drawable_parts;
}

function is_hidden_inner_tank(part) {
  return part.data.isInnerTank && tank_mode !== 1 && part.is_shell_enclosed;
}

function draw_placed_part(part) {
  if (is_part_grayed(part.pid, part.data)) {
    ctx.filter = 'grayscale(100%) opacity(50%)';
  } else {
    ctx.filter = 'none';
  }

  if (part.str === selected_part_str) {
    ctx.globalAlpha = 0.8;
  } else {
    ctx.globalAlpha = 1.0;
  }

  ctx.drawImage(part.img, part.x, part.y, part.w, part.h);
}

function draw_part_outline(part, color, line_width) {
  const points = get_point_array(part.data.form);

  ctx.beginPath();
  for (let p = 0; p < points.length; p++) {
    const screen_x = part.x + points[p].x * build_mode_scroll;
    const screen_y = part.y + points[p].y * build_mode_scroll;
    if (p === 0) ctx.moveTo(screen_x, screen_y);
    else ctx.lineTo(screen_x, screen_y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = line_width;
  ctx.stroke();
}

function draw_debug_polygons() {
  for (const rocket of Different_Builds_Point_Array) {
    for (const point_string of rocket.parts) {
      const point_texts = point_string.split(':')[1].split(',');

      ctx.beginPath();
      for (let i = 0; i < point_texts.length; i++) {
        const coords = point_texts[i].match(/(-?\d+)z(-?\d+)/);
        const screen_x = clipX + (parseInt(coords[1], 10) - cameraX) * build_mode_scroll;
        const screen_y = clipY + (parseInt(coords[2], 10) - cameraY) * build_mode_scroll;
        if (i === 0) ctx.moveTo(screen_x, screen_y);
        else ctx.lineTo(screen_x, screen_y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(200, 130, 230, 0.4)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * build_mode_scroll;
      ctx.fill();
      ctx.stroke();
    }
  }
}

function draw_Rocket() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipWidth, clipHeight);
  ctx.clip();

  const picked_pids = get_picked_pids_of_selected_box();

  for (const build of Different_Builds) {
    const drawable_parts = get_drawable_parts(build);
    ctx.imageSmoothingEnabled = false;

    if (tank_mode === 1) {
      for (const part of drawable_parts) {
        if (!is_structure_tank(part.data)) draw_placed_part(part);
      }
      for (const part of drawable_parts) {
        if (is_structure_tank(part.data)) draw_placed_part(part);
      }
    } else {
      for (const part of drawable_parts) {
        if (is_hidden_inner_tank(part)) continue;
        draw_placed_part(part);
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';

    for (const part of drawable_parts) {
      if (is_hidden_inner_tank(part)) continue;

      const is_hovered_part = (part.str === hovered_placed_str && part.str !== selected_part_str);
      const is_hovered_line_tank = hovered_fuel_line !== null && (part.pid === hovered_fuel_line.from_pid || part.pid === hovered_fuel_line.to_pid);
      const is_picked = picked_pids.has(part.pid);

      if (!is_hovered_part && !is_hovered_line_tank && !is_picked) continue;

      if (is_hovered_part || is_hovered_line_tank) {
        draw_part_outline(part, 'rgba(140, 140, 140, 0.9)', 3 * build_mode_scroll);
      } else {
        draw_part_outline(part, 'rgba(255, 255, 255, 0.9)', 2 * build_mode_scroll);
      }
    }
  }

  if (draw_rect == 1) draw_debug_polygons();

  ctx.restore();
}



function get_fuel_line_color(from_pid) {
  const part_data = get_part_data_by_pid(from_pid);
  if (part_data && part_data.isInnerTank) {
    if (part_data.value === 1) return 'red';
    if (part_data.value === 2) return 'blue';
  }
  return '#ffcc00';
}

function trace_path_on_screen(path) {
  ctx.beginPath();
  for (let i = 0; i < path.length; i++) {
    const screen_x = clipX + (path[i].x - cameraX) * build_mode_scroll;
    const screen_y = clipY + (path[i].y - cameraY) * build_mode_scroll;
    if (i === 0) ctx.moveTo(screen_x, screen_y);
    else ctx.lineTo(screen_x, screen_y);
  }
}

function draw_fuel_line_hint() {
  if (filter_mode !== 1 || restrict_mode !== 0 || !hovered_placed_str) return;

  const info = parse_part_string(hovered_placed_str);
  const part_data = parts[info.part_number - 1];
  if (!is_tank(part_data) && !is_structure_tank(part_data)) return;

  const rect = get_part_world_rect(info.pid);
  const area = get_fuel_line_safe_area(rect);

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipWidth, clipHeight);
  ctx.clip();

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(
    clipX + (area.x - cameraX) * build_mode_scroll,
    clipY + (area.y - cameraY) * build_mode_scroll,
    area.w * build_mode_scroll,
    area.h * build_mode_scroll
  );
  ctx.setLineDash([]);
  ctx.restore();
}

function draw_fuel_lines() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipWidth, clipHeight);
  ctx.clip();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  for (let i = 0; i < fuel_lines.length; i++) {
    const line = fuel_lines[i];
    const path = resolved_fuel_line_paths[i].path;
    if (path.length < 2) continue;

    trace_path_on_screen(path);

    if (line === hovered_fuel_line) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * build_mode_scroll + 2;
      ctx.stroke();
    }

    ctx.strokeStyle = get_fuel_line_color(line.from_pid);
    ctx.lineWidth = 2 * build_mode_scroll;
    ctx.stroke();
  }
  ctx.restore();
}

function draw_fuel_line_preview() {
  const mouse_world = get_mouse_world_position();
  let end_x = mouse_world.x;
  let end_y = mouse_world.y;

  if (hovered_placed_str) {
    const target_pid = hovered_placed_str.split('P')[0];
    if (target_pid !== line_start_pid) {
      const target_part_data = get_part_data_by_pid(target_pid);
      if (is_special_mode_selectable(target_pid, target_part_data)) {
        const target_rect = get_part_world_rect(target_pid);
        const clamped = clamp_point_to_area(end_x, end_y, get_fuel_line_safe_area(target_rect));
        end_x = clamped.x;
        end_y = clamped.y;
      }
    }
  }

  const limited_x = Math.max(line_stage_box.minX, Math.min(line_stage_box.maxX, end_x));
  const limited_y = Math.max(line_stage_box.minY, Math.min(line_stage_box.maxY, end_y));
  const grid_x = Math.round(limited_x / line_grid) * line_grid;
  const grid_y = Math.round(limited_y / line_grid) * line_grid;

  if (last_preview_target.x !== grid_x || last_preview_target.y !== grid_y) {
    last_preview_target = { x: grid_x, y: grid_y };

    const path = find_path_through_rocket(line_start_point, { x: grid_x, y: grid_y }, line_stage_grid);

    const other_segments = [];
    for (const resolved of resolved_fuel_line_paths) {
      other_segments.push(...segments_from_path(resolved.path));
    }
    cached_preview_path = resolve_fuel_line_lanes(path, other_segments);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipWidth, clipHeight);
  ctx.clip();

  trace_path_on_screen(cached_preview_path);
  ctx.strokeStyle = get_fuel_line_color(line_start_pid);
  ctx.lineWidth = 2 * build_mode_scroll;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.stroke();
  ctx.restore();
}

function distance_point_to_segment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length_squared = dx * dx + dy * dy;

  let t = 0;
  if (length_squared !== 0) {
    t = ((px - a.x) * dx + (py - a.y) * dy) / length_squared;
  }
  t = Math.max(0, Math.min(1, t));

  const closest_x = a.x + t * dx;
  const closest_y = a.y + t * dy;
  return Math.sqrt((px - closest_x) ** 2 + (py - closest_y) ** 2);
}

function update_fuel_line_hover() {
  hovered_fuel_line = null;
  if (buildmode !== 1 || line_drawing_active === 1) return;
  if (!is_mouse_in_build_area()) return;

  const mouse_world = get_mouse_world_position();
  const hit_radius_world = 6 / build_mode_scroll;

  for (let i = 0; i < fuel_lines.length; i++) {
    const path = resolved_fuel_line_paths[i].path;
    if (path.length < 2) continue;

    for (let s = 0; s < path.length - 1; s++) {
      const distance = distance_point_to_segment(mouse_world.x, mouse_world.y, path[s], path[s + 1]);
      if (distance <= hit_radius_world) {
        hovered_fuel_line = fuel_lines[i];
        return;
      }
    }
  }
}

function reset_fuel_line_drawing() {
  restrict_mode = 0;
  selected_tank_number = null;
  selected_part_str = null;
  line_drawing_active = 0;
  line_start_pid = null;
  line_stage_box = null;
  line_stage_grid = null;
  hovered_fuel_line = null;
}



function draw_Blueprint_Background(x, y, width, height) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  const base_spacing = 20;
  const visible_world_w = width / build_mode_scroll;
  const visible_world_h = height / build_mode_scroll;

  const start_world_x = Math.floor(cameraX / base_spacing) * base_spacing;
  const end_world_x = cameraX + visible_world_w;
  const start_world_y = Math.floor(cameraY / base_spacing) * base_spacing;
  const end_world_y = cameraY + visible_world_h;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

  for (let world_x = start_world_x; world_x <= end_world_x + base_spacing; world_x += base_spacing) {
    for (let world_y = start_world_y; world_y <= end_world_y + base_spacing; world_y += base_spacing) {
      const screen_x = x + (world_x - cameraX) * build_mode_scroll;
      const screen_y = y + (world_y - cameraY) * build_mode_scroll;
      ctx.beginPath();
      ctx.rect(screen_x, screen_y, 2, 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function draw_top_filter_buttons() {
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < 4; i++) {
    const button_x = content_x + i * (content_width / 4);
    const button_width = content_width / 4 - 10;
    const is_hovered = is_inside_rect(mouseX, mouseY, button_x, filter_bar_y, button_width, filter_button_height);
    const is_active = (i === 0 && tank_mode === 1) || (i === 1 && symmetry_mode === 1) || (i === 2 && filter_mode === 1);

    ctx.drawImage(button_top_images[i], button_x, filter_bar_y, button_width, filter_button_height);

    if (is_hovered || is_active) {
      ctx.fillStyle = 'rgba(21, 25, 41, 0.5)';
      ctx.fillRect(button_x, filter_bar_y, button_width, filter_button_height);
    }
  }
}

function draw_sidebar_buttons() {
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < buildmode_buttons; i++) {
    const button_y = sidebar_top_y + i * (sidebar_button_size + side_bar_gap);
    ctx.drawImage(button_1, sidebar_x, button_y, sidebar_button_size, sidebar_button_size);
  }
}

function get_list_cell(index) {
  const cell_size = content_width / 3;
  return {
    x: (index % 3) * cell_size + content_x,
    y: Math.floor(index / 3) * cell_size + scrollY + grid_top_y,
    box_size: cell_size - 10
  };
}

function get_parts_of_selected_category() {
  return parts.filter(part => part.category === build_menu_button_pressed);
}

function draw_part_list() {
  const active_parts = get_parts_of_selected_category();
  const list_top = grid_top_y;
  const list_bottom = grid_bottom_y;

  for (let i = 0; i < active_parts.length; i++) {
    const part = active_parts[i];
    const cell = get_list_cell(i);
    const box_size = cell.box_size;

    let scale;
    if (part.width > part.height) scale = (box_size - 10) / part.width;
    else scale = (box_size - 10) / part.height;

    const image_x = (box_size - 10 - part.width * scale) / 2 + cell.x + 5;
    const image_y = (box_size - 10 - part.height * scale) / 2 + cell.y + 5;

    const is_mouse_over_x = mouseX >= cell.x && mouseX <= cell.x + box_size;
    const is_mouse_over_y = mouseY >= Math.max(list_top, cell.y) && mouseY <= Math.min(list_bottom, cell.y + box_size);
    const capsule_locked = (Different_Builds.length === 0) && !is_command_capsule(part);
    const is_grayed = filter_mode === 1 || capsule_locked;

    if (is_grayed) ctx.filter = 'grayscale(100%) opacity(40%)';
    else ctx.filter = 'none';

    if (is_grayed) {
      ctx.fillStyle = 'rgb(125, 139, 204)';
    } else if (is_mouse_over_x && is_mouse_over_y) {
      ctx.fillStyle = 'rgb(160, 175, 230)';
      canvas.style.cursor = 'pointer';
    } else {
      ctx.fillStyle = 'rgb(125, 139, 204)';
    }

    const is_above_list = cell.y + box_size <= list_top;
    const is_below_list = cell.y >= list_bottom;
    if (is_above_list || is_below_list) continue;

    let rect_y = cell.y;
    let rect_height = box_size;
    let draw_image_y = image_y;

    if (cell.y < list_top) {
      rect_y = list_top;
      rect_height = (cell.y + box_size) - list_top;
      draw_image_y = (box_size - 10 - part.height * scale) / 2 + list_top + 5;
    } else if (cell.y + box_size > list_bottom) {
      rect_height = list_bottom - cell.y;
    }

    ctx.fillRect(cell.x, rect_y, box_size, rect_height);
    if (part.Img) {
      ctx.drawImage(part.Img, image_x, draw_image_y, part.width * scale, part.height * scale);
    }
  }
  ctx.filter = 'none';
}

function draw_tank_number_controls() {
  const button_size = Math.min(36, side_panel_upper_heigt - 20);
  const button_gap = 12;
  const label_width = 40;
  const total_width = button_size * 2 + button_gap * 2 + label_width;
  const start_x = side_panel_X + (side_panel_width - total_width) / 2;
  const button_y = side_panel_Y + (side_panel_upper_heigt - button_size) / 2;

  Tank_Number_Plus_Button.x = start_x;
  Tank_Number_Plus_Button.y = button_y;
  Tank_Number_Plus_Button.width = button_size;
  Tank_Number_Plus_Button.height = button_size;

  Tank_Number_Minus_Button.x = start_x + button_size + button_gap + label_width + button_gap;
  Tank_Number_Minus_Button.y = button_y;
  Tank_Number_Minus_Button.width = button_size;
  Tank_Number_Minus_Button.height = button_size;

  ctx.fillStyle = 'rgb(60, 68, 110)';
  ctx.fillRect(Tank_Number_Plus_Button.x, Tank_Number_Plus_Button.y, Tank_Number_Plus_Button.width, Tank_Number_Plus_Button.height);
  ctx.fillRect(Tank_Number_Minus_Button.x, Tank_Number_Minus_Button.y, Tank_Number_Minus_Button.width, Tank_Number_Minus_Button.height);

  ctx.fillStyle = '#ffffff';
  ctx.font = "15px 'Tiny5', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', Tank_Number_Plus_Button.x + button_size / 2, Tank_Number_Plus_Button.y + button_size / 2);
  ctx.fillText('-', Tank_Number_Minus_Button.x + button_size / 2, Tank_Number_Minus_Button.y + button_size / 2);
  ctx.fillText(String(Tank_Number_State[right_clicked_pid]), start_x + button_size + button_gap + label_width / 2, button_y + button_size / 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function draw_side_panel_boxes() {
  ctx.fillStyle = 'rgb(30, 34, 58)';
  ctx.fillRect(side_panel_X, side_panel_Y, side_panel_width, (clipY + clipHeight) - side_panel_Y);

  ctx.save();
  ctx.beginPath();
  ctx.rect(side_panel_list_x, side_panel_list_y, side_panel_list_width, side_panel_list_height);
  ctx.clip();

  for (let i = 0; i < side_panel_boxes.length; i++) {
    const box = side_panel_boxes[i];
    const box_y = get_side_panel_box_y(i);
    const box_height = get_side_panel_box_height(i);

    const is_above_list = box_y + box_height < side_panel_list_y;
    const is_below_list = box_y > side_panel_list_y + side_panel_list_height;
    if (is_above_list || is_below_list) continue;

    ctx.fillStyle = 'rgb(60, 68, 110)';
    ctx.fillRect(side_panel_list_x, box_y, side_panel_list_width, box_height);

    if (i === side_panel_selected_index) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(side_panel_list_x, box_y, side_panel_list_width, box_height);
    }

    ctx.imageSmoothingEnabled = false;
    for (let p = 0; p < box.picked_pids.length; p++) {
      const part_data = get_part_data_by_pid(box.picked_pids[p]);
      if (!part_data || !part_data.Img) continue;

      const image = part_data.Img;
      const image_scale = Math.min(side_panel_box_image_size / image.naturalWidth, side_panel_box_image_size / image.naturalHeight);
      const draw_w = image.naturalWidth * image_scale;
      const draw_h = image.naturalHeight * image_scale;
      const image_x = side_panel_list_x + (side_panel_list_width - draw_w) / 2;
      const image_y = box_y + side_panel_box_height + p * (side_panel_box_image_size + side_panel_box_image_gap) + (side_panel_box_image_size - draw_h) / 2;
      ctx.drawImage(image, image_x, image_y, draw_w, draw_h);
    }
  }
  ctx.restore();

  ctx.fillStyle = 'rgb(60, 68, 110)';
  ctx.fillRect(Side_Panel_Plus_Button.x, Side_Panel_Plus_Button.y, Side_Panel_Plus_Button.width, Side_Panel_Plus_Button.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = "15px 'Tiny5', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', Side_Panel_Plus_Button.x + Side_Panel_Plus_Button.width / 2, Side_Panel_Plus_Button.y + Side_Panel_Plus_Button.height / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function draw_side_panel() {
  if (side_panel_active_tab === 1) ctx.fillStyle = 'rgb(102, 114, 168)';
  else ctx.fillStyle = 'rgb(140, 100, 160)';
  ctx.fillRect(side_panel_X, side_panel_Y, side_panel_width, side_panel_upper_heigt);

  if (right_clicked_pid !== null) {
    draw_tank_number_controls();
  } else {
    Tank_Number_Plus_Button.width = 0;
    Tank_Number_Minus_Button.width = 0;
  }

  ctx.fillStyle = 'rgb(80, 90, 130)';
  ctx.fillRect(side_panel_X, side_panel_lower_Y, side_panel_width, side_panel_lower_height);

  if (side_panel_expanded === 1) draw_side_panel_boxes();

  const tab_width = side_panel_Toggle_button.width / 2;

  if (side_panel_active_tab === 1) ctx.fillStyle = 'rgb(21,25,41)';
  else ctx.fillStyle = 'rgb(54, 63, 105)';
  ctx.fillRect(side_panel_Toggle_button.x, side_panel_Toggle_button.y, tab_width, side_panel_Toggle_button.height);

  if (side_panel_active_tab === 2) ctx.fillStyle = 'rgb(21,25,41)';
  else ctx.fillStyle = 'rgb(54, 63, 105)';
  ctx.fillRect(side_panel_Toggle_button.x + tab_width, side_panel_Toggle_button.y, tab_width, side_panel_Toggle_button.height);

  ctx.fillStyle = '#2266cc';
  ctx.fillRect(Play_Button.x, Play_Button.y, Play_Button.width, Play_Button.height);
}



function find_hovered_part_string() {
  const mouse_world = get_mouse_world_position();

  for (let i = Different_Builds.length - 1; i >= 0; i--) {
    const build_parts = Different_Builds[i].parts;

    for (let ii = build_parts.length - 1; ii >= 0; ii--) {
      const part_str = build_parts[ii];
      const info = parse_part_string(part_str);
      const part_data = parts[info.part_number - 1];

      if (part_data.isInnerTank && tank_mode !== 1 && info.is_inner) continue;
      if (filter_mode === 1 && !is_special_mode_selectable(info.pid, part_data)) continue;
      if (box_pick_mode === 1 && !is_box_pick_selectable(info.pid, part_data)) continue;

      if (is_inside_rect(mouse_world.x, mouse_world.y, info.x, info.y, part_data.width, part_data.height)) {
        return part_str;
      }
    }
  }
  return null;
}



function clampCamera() {
  const visible_world_w = clipWidth / build_mode_scroll;
  const visible_world_h = clipHeight / build_mode_scroll;
  const max_camera_x = Math.max(0, world_width - visible_world_w);
  const max_camera_y = Math.max(0, world_height - visible_world_h);

  cameraX = Math.max(0, Math.min(cameraX, max_camera_x));
  cameraY = Math.max(0, Math.min(cameraY, max_camera_y));
}



window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mousedown', (e) => {
  const is_right_click = e.button === 2;
  if (!is_right_click) return;
  if (!is_mouse_in_build_area()) return;
  if (buildmode !== 1) return;

  if (!hovered_placed_str) {
    right_clicked_part_name = null;
    right_clicked_pid = null;
    isDragging = true;
    return;
  }

  const info = parse_part_string(hovered_placed_str);
  const part_data = parts[info.part_number - 1];
  right_clicked_part_name = part_data.name;

  if (is_tank(part_data) || is_structure_tank(part_data)) {
    right_clicked_pid = info.pid;
    if (Tank_Number_State[right_clicked_pid] === undefined) {
      Tank_Number_State[right_clicked_pid] = get_default_tank_number(part_data);
    }
  } else {
    right_clicked_pid = null;
  }
});

window.addEventListener('mousemove', (e) => {
  const pos = getCanvasMousePos(e);
  mouseX = pos.x;
  mouseY = pos.y;

  if (isDragging) {
    cameraX -= e.movementX / build_mode_scroll;
    cameraY -= e.movementY / build_mode_scroll;
    clampCamera();
  }
});

window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('mouseleave', () => isDragging = false);


function handle_box_pick_click() {
  if (!hovered_placed_str) {
    box_pick_mode = 0;
    box_pick_source_index = -1;
    side_panel_selected_index = -1;
    return;
  }

  const picked_pid = hovered_placed_str.split('P')[0];
  const box = side_panel_boxes[box_pick_source_index];
  const index = box.picked_pids.indexOf(picked_pid);

  if (index === -1) box.picked_pids.push(picked_pid);
  else box.picked_pids.splice(index, 1);
}

function handle_side_panel_click() {
  if (is_inside_button(mouseX, mouseY, side_panel_Toggle_button)) {
    side_panel_expanded = side_panel_expanded === 0 ? 1 : 0;
  }

  if (side_panel_expanded === 0) return;

  if (is_inside_button(mouseX, mouseY, Side_Panel_Plus_Button)) {
    side_panel_boxes.push({ picked_pids: [] });
    return;
  }

  if (!is_inside_rect(mouseX, mouseY, side_panel_list_x, side_panel_list_y, side_panel_list_width, side_panel_list_height)) return;

  for (let i = 0; i < side_panel_boxes.length; i++) {
    const box_y = get_side_panel_box_y(i);
    const box_height = get_side_panel_box_height(i);
    if (mouseY < box_y || mouseY > box_y + box_height) continue;

    const was_selected = side_panel_selected_index === i;
    if (was_selected) side_panel_selected_index = -1;
    else side_panel_selected_index = i;

    if (!was_selected) {
      box_pick_mode = 1;
      box_pick_source_index = i;
    }
    break;
  }
}

function handle_tank_number_buttons_click() {
  if (right_clicked_pid === null) return;

  if (Tank_Number_Plus_Button.width > 0 && is_inside_button(mouseX, mouseY, Tank_Number_Plus_Button)) {
    Tank_Number_State[right_clicked_pid] += 1;
  }

  if (Tank_Number_Minus_Button.width > 0 && is_inside_button(mouseX, mouseY, Tank_Number_Minus_Button)) {
    Tank_Number_State[right_clicked_pid] = Math.max(0, Tank_Number_State[right_clicked_pid] - 1);
  }
}

function start_fuel_line(pid, part_data) {
  if (!is_tank(part_data) && !is_structure_tank(part_data)) return;

  restrict_mode = 1;
  if (Tank_Number_State[pid] !== undefined) selected_tank_number = Tank_Number_State[pid];
  else selected_tank_number = 1;
  selected_part_str = hovered_placed_str;

  line_drawing_active = 1;
  line_start_pid = pid;

  const rect = get_part_world_rect(pid);
  const safe_area = get_fuel_line_safe_area(rect);
  const click_world = get_mouse_world_position();
  line_start_point = clamp_point_to_area(click_world.x, click_world.y, safe_area);
  line_start_offset = { x: line_start_point.x - rect.x, y: line_start_point.y - rect.y };

  line_stage_box = get_rocket_box(pid);
  line_stage_grid = build_stage_grid(get_rocket_pids(pid), line_stage_box, fuel_line_grid_cell);
}

function finish_fuel_line(target_pid) {
  if (target_pid !== line_start_pid) {
    const rect = get_part_world_rect(target_pid);
    const safe_area = get_fuel_line_safe_area(rect);
    const click_world = get_mouse_world_position();
    const end_point = clamp_point_to_area(click_world.x, click_world.y, safe_area);

    fuel_lines.push({
      from_pid: line_start_pid,
      to_pid: target_pid,
      from_offset: line_start_offset,
      to_offset: { x: end_point.x - rect.x, y: end_point.y - rect.y }
    });
  }

  reset_fuel_line_drawing();
}

function handle_fuel_line_click() {
  if (!hovered_placed_str) return;

  const info = parse_part_string(hovered_placed_str);
  const part_data = parts[info.part_number - 1];

  if (restrict_mode === 0) {
    start_fuel_line(info.pid, part_data);
  } else {
    finish_fuel_line(info.pid);
  }
}

function handle_build_area_click() {
  if (!is_mouse_in_build_area()) return;

  if (filter_mode === 1) {
    handle_fuel_line_click();
  } else if (in_place_mode === 1 || in_drag_stack_mode === 1) {
    snaped = 1;
  } else if (buildmode === 1) {
    if (hovered_placed_str) start_dragging_stack(hovered_placed_str);
    else selected_part_str = null;
  }
}

function handle_sidebar_click() {
  if (buildmode !== 1 || in_place_mode !== 0) return;

  for (let i = 0; i < buildmode_buttons; i++) {
    const button_y = sidebar_top_y + i * (sidebar_button_size + side_bar_gap);
    if (is_inside_rect(mouseX, mouseY, sidebar_x, button_y, sidebar_button_size, sidebar_button_size)) {
      build_menu_button_pressed = i + 1;
      scrollY = 0;
    }
  }
}

function handle_top_buttons_click() {
  let clicked_button = 0;

  for (let i = 0; i < 4; i++) {
    const button_x = content_x + i * (content_width / 4);
    const button_width = content_width / 4 - 10;
    if (is_inside_rect(mouseX, mouseY, button_x, filter_bar_y, button_width, filter_button_height)) {
      clicked_button = i + 1;
    }
  }

  if (clicked_button === 1) {
    set_tank_mode(tank_mode === 0 ? 1 : 0);
  } else if (clicked_button === 2) {
    symmetry_mode = symmetry_mode === 0 ? 1 : 0;
  } else if (clicked_button === 3) {
    filter_mode = filter_mode === 0 ? 1 : 0;
    if (filter_mode === 0) reset_fuel_line_drawing();
  }
}

function handle_part_list_click() {
  if (filter_mode !== 0 || buildmode !== 1 || build_menu_button_pressed === 0) return;

  const active_parts = get_parts_of_selected_category();

  for (let i = 0; i < active_parts.length; i++) {
    const cell = get_list_cell(i);
    const is_click_x = mouseX >= cell.x && mouseX <= cell.x + cell.box_size;
    const is_click_y = mouseY >= Math.max(grid_top_y, cell.y) && mouseY <= Math.min(grid_bottom_y, cell.y + cell.box_size);
    if (!is_click_x || !is_click_y) continue;

    const candidate = active_parts[i];

    if (Different_Builds.length === 0 && !is_command_capsule(candidate)) break;

    part_clicked = parts.indexOf(candidate);
    if (Different_Builds.length !== 0) in_place_mode = 1;
    else part_clicked_once = 1;
    break;
  }
}

window.addEventListener('click', () => {
  if (box_pick_mode === 1 && is_mouse_in_build_area()) {
    handle_box_pick_click();
    return;
  }

  const result = handle_Click_Build_Menu(mouseX, mouseY);

  handle_side_panel_click();

  if (result === 'game') {
    game_State.current_Screen = 'GAME';
  }

  handle_tank_number_buttons_click();
  handle_build_area_click();
  handle_sidebar_click();
  handle_top_buttons_click();
  handle_part_list_click();
});


function scroll_part_list(e) {
  const scroll_speed = 40;
  e.preventDefault();

  const item_count = get_parts_of_selected_category().length;
  const total_rows = Math.ceil(item_count / 3);
  const total_content_height = total_rows * (content_width / 3);
  const max_scroll = Math.max(0, total_content_height - grid_height);

  menuScrollY += (e.deltaY < 0 ? scroll_speed : -scroll_speed);
  if (menuScrollY > 0) menuScrollY = 0;
  if (menuScrollY < -max_scroll) menuScrollY = -max_scroll;
}

function zoom_build_area(e) {
  e.preventDefault();

  const center_world_x = cameraX + (clipWidth / build_mode_scroll) / 2;
  const center_world_y = cameraY + (clipHeight / build_mode_scroll) / 2;

  build_mode_scroll += (e.deltaY < 0 ? 0.15 : -0.15);
  if (build_mode_scroll < 0.7) build_mode_scroll = 0.7;
  if (build_mode_scroll > 6) build_mode_scroll = 6;

  cameraX = center_world_x - (clipWidth / build_mode_scroll) / 2;
  cameraY = center_world_y - (clipHeight / build_mode_scroll) / 2;
  clampCamera();
}

function scroll_side_panel_list(e) {
  const scroll_speed = 40;
  e.preventDefault();

  let total_content_height = 0;
  for (let i = 0; i < side_panel_boxes.length; i++) {
    total_content_height += get_side_panel_box_height(i) + side_panel_box_gap;
  }
  const max_scroll = Math.max(0, total_content_height - side_panel_list_height);

  side_panel_box_scrollY += (e.deltaY < 0 ? scroll_speed : -scroll_speed);
  if (side_panel_box_scrollY > 0) side_panel_box_scrollY = 0;
  if (side_panel_box_scrollY < -max_scroll) side_panel_box_scrollY = -max_scroll;
}

window.addEventListener('wheel', (e) => {
  const is_over_part_list = is_inside_rect(mouseX, mouseY, content_x, grid_top_y, content_width, grid_height);
  if (is_over_part_list && buildmode === 1 && build_menu_button_pressed !== 0) {
    scroll_part_list(e);
  }

  if (is_mouse_in_build_area() && buildmode === 1) {
    zoom_build_area(e);
  }

  const is_over_side_list = is_inside_rect(mouseX, mouseY, side_panel_list_x, side_panel_list_y, side_panel_list_width, side_panel_list_height);
  if (side_panel_expanded === 1 && is_over_side_list) {
    scroll_side_panel_list(e);
  }
}, { passive: false });




function draw_build_mode() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgb(54, 63, 105)';
  ctx.fillRect(content_x - panel_margin / 2, panel_y + panel_margin / 2, content_width + panel_margin, panel_height - panel_margin);

  draw_top_filter_buttons();

  ctx.fillStyle = 'rgb(28, 33, 58)';
  ctx.fillRect(content_x, grid_top_y, content_width, grid_height);
  ctx.fillStyle = 'rgb(16, 18, 41)';
  ctx.fillRect(...build_menu_size);
  draw_Blueprint_Background(...build_menu_size);

  hovered_placed_str = null;
  if (in_place_mode === 0 && is_mouse_in_build_area()) {
    hovered_placed_str = find_hovered_part_string();
    canvas.style.cursor = hovered_placed_str ? 'pointer' : 'default';
  }

  draw_sidebar_buttons();

  compute_all_fuel_line_paths();
  if (filter_mode === 1) update_fuel_line_hover();
  else hovered_fuel_line = null;

  draw_Rocket();
  draw_fuel_line_hint();
  if (filter_mode === 1) draw_fuel_lines();
  if (filter_mode === 1 && line_drawing_active === 1 && line_stage_box) draw_fuel_line_preview();

  draw_side_panel();

  if (build_menu_button_pressed !== 0) {
    draw_part_list();

    if (Different_Builds_Count == 0 && part_clicked_once == 1) place_first_capsule();
    if (in_place_mode == 1) update_place_mode();
    if (in_drag_stack_mode == 1) update_drag_mode();
  }
}

function gameLoop(timestamp) {
  if (game_State.current_Screen !== 'BUILD_MENU') {
    canvas.remove();
    window.removeEventListener('resize', resizeCanvas);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  frameCount++;
  if (timestamp - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = timestamp;
  }

  ctx.fillStyle = 'red';
  ctx.font = "15px 'Tiny5', monospace";
  ctx.fillText("FPS: " + fps, 20, 20);

  if (right_clicked_part_name) {
    ctx.fillStyle = '#ffffff';
    ctx.font = "15px 'Tiny5', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(right_clicked_part_name, canvas.width / 2, 30);
    ctx.textAlign = 'left';
  }

  if (buildmode == 1) draw_build_mode();

  window.requestAnimationFrame(gameLoop);
}

window.requestAnimationFrame(gameLoop);
