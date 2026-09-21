//physics and all 


import { game_State } from "./state.js";
import { open_map_view } from "./map.js";
import { parts, bodies, Img_Fuel_Outer, Img_Fuel_Inner } from "./part_data.js";
import { draw_Speed_Controll, handle_Click_Controll, handle_Mousemove_Controll } from "./controlls.js";

export function handle_Click_Game(mouseX, mouseY) {
    handle_Click_Controll(mouseX, mouseY);
    if (hovered_part_index !== -1) {
        const clicked = game_State.active_rocket && game_State.active_rocket[hovered_part_index];
        if (clicked && clicked.part_number === 6) clicked.engine_active = !clicked.engine_active;
        jettison_below_separator(hovered_part_index);
    }
}

export const PIXELS_PER_METER = 50;

function to_meters(px) {
    return (px || 0) / PIXELS_PER_METER;
}

let input_listeners_attached = false;
let cameraX = 100;
let cameraY = 500;
let zoom = PIXELS_PER_METER;
const min_zoom = PIXELS_PER_METER / 2500;
const max_zoom = PIXELS_PER_METER * 4;
const zoom_step = 0.1;

const keys = { ArrowUp: false, ArrowDown: false, KeyQ: false, KeyE: false, KeyW: false };
const zoom_key_rate = 1.8;

let game_mouseX = 0;
let game_mouseY = 0;
let hovered_part_index = -1;

let test = 77;
export const meters_per_game_unit = 1.0;
export const home_planet_index = 1;
export const planet_circ = 2 * Math.PI * bodies[home_planet_index].r;

let rocket_local_X = 0;
let rocket_local_Y = 0;
let rocket_com_offset_X = 0;
let rocket_com_offset_Y = 0;
let rocket_total_mass = 0;
let rocket_render_angle = 0;

export let rocket_angle = 0;
export let rocket_omega = 0;
export let rocket_inertia = 50000;

export let planet_rotaion = 0;
export const planet_rotaion_speed = Math.PI * 2 / (60 * 60 * 18);
export const planet_visual_scale = 1.0;

let last_frame_time = null;

let fps = 0;
let fps_frame_count = 0;
let fps_last_time = 0;

export const terrain_base_height = 900;

let cached_rocket_signature = null;
let cached_active_rocket = null;
let rocket_Outline_Points = [];
let rocket_children_map = {};
let debris_vessels = [];


function setup_game_input(canvas) {
    const in_game = () => game_State.current_Screen === 'GAME' || game_State.current_view === 'GAME' || game_State.current_view === 'game';

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (!in_game()) return;
        const direction = event.deltaY > 0 ? -1 : 1;
        zoom = Math.min(max_zoom, Math.max(min_zoom, zoom + direction * zoom_step * zoom));
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        game_mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        game_mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'm' || event.key === 'M') {
            if (game_State.current_Screen === 'GAME' || game_State.current_view === 'game') {
                open_map_view();
            } else if (game_State.current_Screen === 'MAP' || game_State.current_view === 'map') {
                game_State.current_Screen = 'GAME';
                game_State.current_view = 'game';
            }
        }
        if (event.key === 'ArrowUp') keys.ArrowUp = true;
        if (event.key === 'ArrowDown') keys.ArrowDown = true;
        if (event.code === 'KeyQ') keys.KeyQ = true;
        if (event.code === 'KeyE') keys.KeyE = true;
        if (event.code === 'KeyW') keys.KeyW = true;
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowUp') keys.ArrowUp = false;
        if (event.key === 'ArrowDown') keys.ArrowDown = false;
        if (event.code === 'KeyQ') keys.KeyQ = false;
        if (event.code === 'KeyE') keys.KeyE = false;
        if (event.code === 'KeyW') keys.KeyW = false;
    });

    window.addEventListener('blur', () => {
        keys.ArrowUp = false;
        keys.ArrowDown = false;
        keys.KeyE = false;
        keys.KeyQ = false;
        keys.KeyW = false;
    });
}

function build_Rocket_Outline(parts_Array, com_X, com_Y) {

    const outline = [];
    for (let i = 0; i < parts_Array.length; i++) {

        const part = parts_Array[i];
        const part_Data = parts[part.part_number - 1];
        if (!part_Data) continue;

        const part_w = to_meters(part_Data.width);
        const part_h = to_meters(part_Data.height);
        const local_Points = part_Data.form? part_Data.form.split(',').map(segment => {
                const match = segment.match(/(-?\d+)z(-?\d+)/);
                if (!match) return null;
                return { x: to_meters(parseInt(match[1], 10)), y: to_meters(parseInt(match[2], 10)) };
            }).filter(point => point !== null)
            : [
                { x: 0, y: 0 },
                { x: part_w, y: 0 },
                { x: part_w, y: part_h },
                { x: 0, y: part_h }
            ];
        if (local_Points.length === 0) continue;
        const rotation = part.rotation || 0;
        const cos_r = Math.cos(rotation);
        const sin_r = Math.sin(rotation);
        const part_rel_x = to_meters(part.rel_X);
        const part_rel_y = to_meters(part.rel_Y);
        const centerX = part_rel_x - com_X;
        const centerY = part_rel_y - com_Y;

        const world_Points = local_Points.map(pt => {

            const offset_X = pt.x - part_w / 2;
            const offset_Y = pt.y - part_h / 2;
            const rotated_X = offset_X * cos_r - offset_Y * sin_r;
            const rotated_Y = offset_X * sin_r + offset_Y * cos_r;
            return { x: (part_rel_x - com_X) + rotated_X, y: (part_rel_y - com_Y) + rotated_Y };
        });
        outline.push({ points: world_Points, centerX, centerY, part_index: i });
    }
    return outline;
}

function build_stack_outline(outline) {

    const pts = [];
    for (let i = 0; i < outline.length; i++) {
        const p = outline[i].points;
        for (let j = 0; j < p.length; j++) pts.push(p[j]);
    }
    pts.sort((a, b) => a.x - b.x || a.y - b.y);
    if (pts.length <= 2) return pts;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower = [];
    for (const p of pts) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);

}

function is_separator_part(part_Data) {

    if (!part_Data || !part_Data.name) return false;
    const n = part_Data.name.toLowerCase();

    return n.includes('seperator') || n.includes('separator');

}

function compute_mass_properties(parts_Array) {
    let total_mass = 0, weighted_X = 0, weighted_Y = 0;
    for (let i = 0; i < parts_Array.length; i++) {
        const part = parts_Array[i];
        const part_Data = parts[part.part_number - 1];
        if (!part_Data) continue;

        let mass = part_Data.weight || 0;

        if (part.isInnerTank || (part_Data && part_Data.isInnerTank)) {
            const cap = part.capacity || part_Data.capacity || 1000;
            const curFuel = part.currentFuel !== undefined ? part.currentFuel : cap;
            const dry = part_Data.dryWeight !== undefined ? part_Data.dryWeight : 100;
            const full = part_Data.weight || 1000;

            mass = dry + (curFuel / cap) * (full - dry);
        }

        total_mass += mass;
        weighted_X += to_meters(part.rel_X) * mass;
        weighted_Y += to_meters(part.rel_Y) * mass;
    }
    const com_X = total_mass > 0 ? weighted_X / total_mass : 0;
    const com_Y = total_mass > 0 ? weighted_Y / total_mass : 0;
    const inertia = Math.max(10000, total_mass * 30);
    return { total_mass, com_X, com_Y, inertia };
}

function get_section_panel_tank_data() {

    const active_rocket = game_State.active_rocket || [];
    if (active_rocket.length === 0) return [];

    const children_map = {};
    const by_pid = new Map();
    let root_pid = null;

    for (let i = 0; i < active_rocket.length; i++) {

        const part = active_rocket[i];
        by_pid.set(String(part.pid), part);
        if (part.parent_pid === null || part.parent_pid === undefined) {
            root_pid = String(part.pid);
        } else {
            const key = String(part.parent_pid);
            if (!children_map[key]) children_map[key] = [];
            children_map[key].push(String(part.pid));
        }
    }
    if (root_pid === null) return [];


    const sections = [];
    function collect_section(start_pid) {
        const pids = new Set();
        let sum_y = 0, count = 0;
        const queue = [start_pid];

        while (queue.length) {
            const cur = queue.shift();
            pids.add(cur);

            const cur_part = by_pid.get(cur);
            if (cur_part) { sum_y += to_meters(cur_part.rel_Y); count++; }

            const cur_data = cur_part ? parts[cur_part.part_number - 1] : null;
            const cur_is_separator = is_separator_part(cur_data);

            const kids = children_map[cur] || [];
            for (let k = 0; k < kids.length; k++) {
                if (cur_is_separator) collect_section(kids[k]);
                else queue.push(kids[k]);
            }

        }
        sections.push({ pids, avg_y: count > 0 ? sum_y / count : 0 });
    }

    collect_section(root_pid);
    sections.sort((a, b) => a.avg_y - b.avg_y); 

    const result = [];
    for (let s = 0; s < sections.length; s++) {

        const pids = sections[s].pids;
        const ox = { current: 0, capacity: 0, present: false };
        const prop = { current: 0, capacity: 0, present: false };

        for (let i = 0; i < active_rocket.length; i++) {
            const part = active_rocket[i];
            if (!pids.has(String(part.pid))) continue;

            const part_Data = parts[part.part_number - 1];
            const isInner = part.isInnerTank || (part_Data && part_Data.isInnerTank) || part.part_number === 3 || part.part_number === 4;
            if (!isInner) continue;

            const type = part.fuelType || (part_Data && part_Data.fuelType) || (part.part_number === 3 ? 'oxidizer' : part.part_number === 4 ? 'propellant' : null);
            const cap = part.capacity || (part_Data && part_Data.capacity) || 1000;
            const cur = part.currentFuel !== undefined ? part.currentFuel : cap;

            if (type === 'oxidizer') { ox.present = true; ox.current += cur; ox.capacity += cap; }
            else if (type === 'propellant') { prop.present = true; prop.current += cur; prop.capacity += cap; }
        }

        const bars = [];
        if (ox.present) bars.push({ type: 'oxidizer', ratio: ox.capacity > 0 ? ox.current / ox.capacity : 0 });
        if (prop.present) bars.push({ type: 'propellant', ratio: prop.capacity > 0 ? prop.current / prop.capacity : 0 });
        if (bars.length > 0) result.push(bars);
    }
    return result;
}



const FUEL_TYPE_COLORS = {
    oxidizer: '#0035c5',
    propellant: '#681818'
};
const FUEL_INNER_INSET = 1; 
const FUEL_PANEL_MARGIN = 20;
const FUEL_TANK_SCALE = 1.5;
const FUEL_TANK_GAP = 3;       
const FUEL_SECTION_GAP = 14;   
const FUEL_SEPARATOR_COLOR = 'rgba(255, 255, 255, 0.6)';

const STAGE_PANEL_MARGIN = 20;
const STAGE_PANEL_WIDTH = 200;
const STAGE_BOX_HEIGHT = 36;
const STAGE_BOX_GAP = 8;
const STAGE_BOX_IMAGE_SIZE = 32;
const STAGE_BOX_IMAGE_GAP = 4;

function draw_hud_panels(ctx, canvas) {

    const stages = game_State.stages || [];
    if (stages.length > 0) {
        const box_height = (stage) => {
            if (!stage || !stage.parts || stage.parts.length === 0) return STAGE_BOX_HEIGHT;
            return STAGE_BOX_HEIGHT + stage.parts.length * (STAGE_BOX_IMAGE_SIZE + STAGE_BOX_IMAGE_GAP);
        };

        const panel_x = canvas.width - STAGE_PANEL_WIDTH - STAGE_PANEL_MARGIN;
        const panel_bottom = canvas.height - STAGE_PANEL_MARGIN;

        let total_height = 0;
        for (let i = 0; i < stages.length; i++) {
            total_height += box_height(stages[i]);
            if (i > 0) total_height += STAGE_BOX_GAP;
        }

        let y = panel_bottom - total_height;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            const box_h = box_height(stage);

            ctx.fillStyle = 'rgb(60, 68, 110)';
            ctx.fillRect(panel_x, y, STAGE_PANEL_WIDTH, box_h);

            for (let p = 0; p < stage.parts.length; p++) {
                const part = stage.parts[p];
                const part_Data = parts[part.part_number - 1];
                if (!part_Data || !part_Data.Img) continue;

                const img = part_Data.Img;
                const img_scale = Math.min(STAGE_BOX_IMAGE_SIZE / img.naturalWidth, STAGE_BOX_IMAGE_SIZE / img.naturalHeight);
                const draw_w = img.naturalWidth * img_scale;
                const draw_h = img.naturalHeight * img_scale;
                const img_x = panel_x + (STAGE_PANEL_WIDTH - draw_w) / 2;
                const img_y = y + STAGE_BOX_HEIGHT + p * (STAGE_BOX_IMAGE_SIZE + STAGE_BOX_IMAGE_GAP) + (STAGE_BOX_IMAGE_SIZE - draw_h) / 2;
                ctx.drawImage(img, img_x, img_y, draw_w, draw_h);
            }

            y += box_h + STAGE_BOX_GAP;
        }

        ctx.restore();
    }

    const section_bars = get_section_panel_tank_data();

    if (section_bars.length === 0) return;

    const tank_w = (Img_Fuel_Outer.naturalWidth || 58) * FUEL_TANK_SCALE;
    const tank_h = (Img_Fuel_Outer.naturalHeight || 18) * FUEL_TANK_SCALE;

    const rows = [];
    for (let s = 0; s < section_bars.length; s++) {
        const bars = section_bars[s];
        for (let b = 0; b < bars.length; b++) rows.push({ type: 'bar', bar: bars[b] });
        if (s < section_bars.length - 1) rows.push({ type: 'sep' });
    }

    let fuel_total_height = 0;

    for (let i = 0; i < rows.length; i++) {
        fuel_total_height += (rows[i].type === 'bar') ? tank_h : FUEL_SECTION_GAP;
        if (rows[i].type === 'bar' && i < rows.length - 1 && rows[i + 1].type === 'bar') {
            fuel_total_height += FUEL_TANK_GAP;
        }
    }

    const fx = FUEL_PANEL_MARGIN;
    let fy = canvas.height - FUEL_PANEL_MARGIN - fuel_total_height;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < rows.length; i++) {

        const row = rows[i];

        if (row.type === 'bar') {
            ctx.drawImage(Img_Fuel_Outer, fx, fy, tank_w, tank_h);

            const inset_x = FUEL_INNER_INSET * (tank_w / Img_Fuel_Outer.naturalWidth);
            const inset_y = FUEL_INNER_INSET * (tank_h / Img_Fuel_Outer.naturalHeight);
            const inner_w = tank_w - inset_x * 2;
            const inner_h = tank_h - inset_y * 2;
            const fill_w = inner_w * Math.max(0, Math.min(1, row.bar.ratio));

            if (fill_w > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(fx + inset_x, fy + inset_y, fill_w, inner_h);
                ctx.clip();

                ctx.drawImage(Img_Fuel_Inner, fx + inset_x, fy + inset_y, inner_w, inner_h);
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = FUEL_TYPE_COLORS[row.bar.type] || '#ffffff';
                ctx.fillRect(fx + inset_x, fy + inset_y, inner_w, inner_h);
                ctx.globalCompositeOperation = 'source-over';

                ctx.restore();
            }

            fy += tank_h;
            if (i < rows.length - 1 && rows[i + 1].type === 'bar') fy += FUEL_TANK_GAP;
        } else {
            const sep_y = fy + FUEL_SECTION_GAP / 2;
            ctx.strokeStyle = FUEL_SEPARATOR_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx - 6, Math.round(sep_y) + 0.5);
            ctx.lineTo(fx + tank_w + 6, Math.round(sep_y) + 0.5);
            ctx.stroke();
            fy += FUEL_SECTION_GAP;
        }
    }

    ctx.restore();
}

function update_and_draw_hovered_part(ctx, canvas) {

    hovered_part_index = -1;
    if (!game_State.active_rocket) return;

    const anchor_X = canvas.width / 2;
    const anchor_Y = canvas.height / 2;
    const cos_r = Math.cos(rocket_render_angle);
    const sin_r = Math.sin(rocket_render_angle);

    const candidates = rocket_Outline_Points.filter(o => {
        const p = game_State.active_rocket[o.part_index];
        return p && !p.isInnerTank;
    });

    let hit_poly = null;
    for (let c = 0; c < candidates.length; c++) {
        const poly = candidates[c].points.map(pt => {

            const rx = pt.x * cos_r - pt.y * sin_r;
            const ry = pt.x * sin_r + pt.y * cos_r;
            return { x: anchor_X + rx * zoom, y: anchor_Y + ry * zoom };
        });

        // Punkt-in-Polygon fixxx
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const intersect = ((yi > game_mouseY) !== (yj > game_mouseY)) &&
                (game_mouseX < (xj - xi) * (game_mouseY - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        if (inside) {
            hovered_part_index = candidates[c].part_index;
            hit_poly = poly;
            canvas.style.cursor = 'pointer';
            break;
        }
    }
    if (!hit_poly) {
        canvas.style.cursor = 'default';
        return;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    hit_poly.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

export function update_maneuver_node(sim_time) {
    if (!maneuver_node) return;

    maneuver_node.dt -= sim_time;

    const pos = get_orbit_position_at_anomaly(maneuver_node.true_anomaly);
    if (pos) {
        maneuver_node.x = pos.x;
        maneuver_node.y = pos.y;
        maneuver_node.pro_x = pos.pro_x;
        maneuver_node.pro_y = pos.pro_y;
    }
}

function get_enigine_conn_tank_pid(engine, fuel_lines) {

    
    const graph = new Map();
    (fuel_lines || []).forEach(line => {
        const a = String(line.from_pid), b = String(line.to_pid);
        if (!graph.has(a)) graph.set(a, new Set());
        if (!graph.has(b)) graph.set(b, new Set());
        graph.get(a).add(b);
        graph.get(b).add(a);
    });

    const visited = new Set();
    const queue = [];

    const start_candi = [String(engine.pid)];
    if (engine.parent_pid !== null && engine.parent_pid !== undefined) {
        start_candi.push(String(engine.parent_pid));
    }
    for (const c of start_candi) {
        if (graph.has(c) && !visited.has(c)) { visited.add(c); queue.push(c); }
    }
    while (queue.length) {
        const cur = queue.shift();
        const neighbors = graph.get(cur);
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (!visited.has(n)) { visited.add(n); queue.push(n); }
        }
    }
    return visited;
}

function apply_thrust(real_dt) {

    if (!game_State.active_rocket || !keys.KeyW) return;

    const engines = game_State.active_rocket.filter(p => p.part_number === 6 && p.engine_active);
    if (engines.length === 0) return;

    let active_thrust = 0;

    engines.forEach(engine => {

        const engine_data = parts[engine.part_number - 1];
        const rate = (engine_data && engine_data.fuelConsumption) ? engine_data.fuelConsumption : 20;
        const burn_needed = rate * real_dt;

        const visitedPids = get_enigine_conn_tank_pid(engine, game_State.fuel_lines);
        const oxTanks = [];
        const propTanks = [];

        game_State.active_rocket.forEach(part => {
            if (!visitedPids.has(String(part.pid))) return;
            const pData = parts[part.part_number - 1];
            const isInner = part.isInnerTank || (pData && pData.isInnerTank) || part.part_number === 3 || part.part_number === 4;
            if (!isInner) return;

            if (part.currentFuel === undefined) {
                part.currentFuel = part.capacity || (pData ? pData.capacity : 1000);
            }

            if (part.currentFuel > 0) {
                const type = part.fuelType || (pData ? pData.fuelType : (part.part_number === 3 ? 'oxidizer' : 'propellant'));
                if (type === 'oxidizer') oxTanks.push(part);
                if (type === 'propellant') propTanks.push(part);
            }
        });

        if (oxTanks.length > 0 && propTanks.length > 0) {
            const ox_burn_per_tank = burn_needed / oxTanks.length;
            const prop_burn_per_tank = burn_needed / propTanks.length;

            oxTanks.forEach(t => {
                t.currentFuel = Math.max(0, t.currentFuel - ox_burn_per_tank);
            });

            propTanks.forEach(t => {
                t.currentFuel = Math.max(0, t.currentFuel - prop_burn_per_tank);
            });

            active_thrust += (engine_data && engine_data.thrust) ? engine_data.thrust : 500000;
        }
    });

    if (active_thrust <= 0) return;

    const mass = rocket_total_mass > 0 ? rocket_total_mass : 1;
    const accel = active_thrust / mass;
    const dv_step = accel * real_dt;

    rocket_vx += Math.sin(rocket_angle) * dv_step;
    rocket_vy += -Math.cos(rocket_angle) * dv_step;

    if (maneuver_node && maneuver_node.center === current_center) {
        maneuver_node.dv_pro -= dv_step;
    }

    orbit_initialized = false;
    soi_encounter_computed_time = null;
    maneuver_soi_entry_dirty = true;
}

function jettison_below_separator(part_index) {

    if (!game_State.active_rocket) return;
    const part = game_State.active_rocket[part_index];
    if (!part) return;

    const part_Data = parts[part.part_number - 1];
    if (!is_separator_part(part_Data)) return;

    const to_remove = new Set();
    const queue = [String(part.pid)];
    while (queue.length) {
        const cur = queue.shift();
        const kids = rocket_children_map[cur];
        if (!kids) continue;
        for (const k of kids) {
            if (!to_remove.has(k)) {
                to_remove.add(k);
                queue.push(k);
            }
        }
    }
    if (to_remove.size === 0) return;


    let sep_vertical = true;
    const sep_children = rocket_children_map[String(part.pid)];
    if (sep_children && sep_children.length > 0) {
        let total_dx = 0, total_dy = 0;
        for (const child_pid of sep_children) {
            const child = game_State.active_rocket.find(p => String(p.pid) === child_pid);
            if (!child) continue;
            total_dx += Math.abs(child.rel_X - part.rel_X);
            total_dy += Math.abs(child.rel_Y - part.rel_Y);
        }
        sep_vertical = total_dy >= total_dx;
    }
    if (sep_vertical) to_remove.add(String(part.pid));

    const jettisoned_parts = game_State.active_rocket.filter(p => to_remove.has(String(p.pid)));
    game_State.active_rocket = game_State.active_rocket.filter(p => !to_remove.has(String(p.pid)));

    if (jettisoned_parts.length > 0) {


        const mass_props = compute_mass_properties(jettisoned_parts);
        const world = get_world_state();

        const cos_r = Math.cos(rocket_angle);
        const sin_r = Math.sin(rocket_angle);
        const local_dx = mass_props.com_X - rocket_com_offset_X;
        const local_dy = mass_props.com_Y - rocket_com_offset_Y;

        const world_offset_x = local_dx * cos_r - local_dy * sin_r;
        const world_offset_y = local_dx * sin_r + local_dy * cos_r;

        const separation_speed = 1.5;
        const dir_x = Math.sin(rocket_angle);
        const dir_y = -Math.cos(rocket_angle);

        const outline = build_Rocket_Outline(jettisoned_parts, mass_props.com_X, mass_props.com_Y);
        const hull = build_stack_outline(outline);

        debris_vessels.push({

            parts: jettisoned_parts,
            world_x: world.x + world_offset_x,
            world_y: world.y + world_offset_y,
            world_vx: world.vx - dir_x * separation_speed,
            world_vy: world.vy - dir_y * separation_speed,
            angle: rocket_angle,
            omega: rocket_omega,

            com_offset_X: mass_props.com_X || 0,
            com_offset_Y: mass_props.com_Y || 0,
            inertia: mass_props.inertia,
            hull: hull

        });
    }

    hovered_part_index = -1;
}

function draw_Game_object(ctx, canvas, parts_Array, opts) {


    const o = opts || {};
    const angle = o.angle !== undefined ? o.angle : rocket_render_angle;

    const com_X = o.com_offset_X !== undefined ? o.com_offset_X : rocket_com_offset_X;
    const com_Y = o.com_offset_Y !== undefined ? o.com_offset_Y : rocket_com_offset_Y;
    const anchor_X = o.anchor_X !== undefined ? o.anchor_X : canvas.width / 2;
    const anchor_Y = o.anchor_Y !== undefined ? o.anchor_Y : canvas.height / 2;

    const cos_r = Math.cos(angle);
    const sin_r = Math.sin(angle);

    for (let i = 0; i < parts_Array.length; i++) {

        const part = parts_Array[i];
        const part_Data = parts[part.part_number - 1];
        if (!part_Data || !part_Data.Img) continue;

        if (part.isInnerTank) continue;

        const offset_X = to_meters(part.rel_X) - com_X;
        const offset_Y = to_meters(part.rel_Y) - com_Y;
        const rotated_X = offset_X * cos_r - offset_Y * sin_r;
        const rotated_Y = offset_X * sin_r + offset_Y * cos_r;

        const draw_Width = to_meters(part_Data.width) * zoom;
        const draw_Height = to_meters(part_Data.height) * zoom;

        ctx.save();
        ctx.translate(anchor_X + rotated_X * zoom, anchor_Y + rotated_Y * zoom);
        ctx.rotate(angle + (part.rotation || 0));
        ctx.drawImage(part_Data.Img, -draw_Width / 2, -draw_Height / 2, draw_Width, draw_Height);
        ctx.restore();

    }
}

export function calculate_engine_plate_fuel(active_rocket = [], fuel_lines = []) {


    if (!active_rocket || active_rocket.length === 0) return {};
    const engine_plate_fuel = {};

    const getTankInfo = (part) => {
        const part_Data = parts[part.part_number - 1];
        const isInner = part.isInnerTank || (part_Data && part_Data.isInnerTank) || part.part_number === 3 || part.part_number === 4;
        if (!isInner) return null;
        const type = part.fuelType || (part_Data && part_Data.fuelType) || (part.part_number === 3 ? 'oxidizer' : part.part_number === 4 ? 'propellant' : null);
        const cap = part.capacity || (part_Data && part_Data.capacity) || 1000;
        return { type, cap };
    };

    const engines = active_rocket.filter(p => p.part_number === 6);

    engines.forEach(engine => {
        const visitedPids = get_enigine_conn_tank_pid(engine, fuel_lines);

        let total_ox = 0;
        let total_prop = 0;

        active_rocket.forEach(p => {
            if (!visitedPids.has(String(p.pid))) return;
            const info = getTankInfo(p);
            if (!info) return;
            const amount = p.currentFuel !== undefined ? p.currentFuel : info.cap;
            if (info.type === 'oxidizer') total_ox += amount;
            if (info.type === 'propellant') total_prop += amount;
        });

        engine_plate_fuel[engine.pid] = { ox: total_ox, prop: total_prop };
    });

    return engine_plate_fuel;

}

export function draw_engine_plate_fuel_labels(ctx, canvas) {

    if (!game_State.active_rocket || game_State.active_rocket.length === 0) return;

    const engine_plate_fuel = calculate_engine_plate_fuel(game_State.active_rocket, game_State.fuel_lines || []);
    const anchor_X = canvas.width / 2;
    const anchor_Y = canvas.height / 2;
    const cos_r = Math.cos(rocket_render_angle);
    const sin_r = Math.sin(rocket_render_angle);

    game_State.active_rocket.forEach(part => {


        if (part.part_number === 6) {
            const fuel_data = engine_plate_fuel[part.pid] || { ox: 0, prop: 0 };

            const offset_X = to_meters(part.rel_X) - rocket_com_offset_X;
            const offset_Y = to_meters(part.rel_Y) - rocket_com_offset_Y;
            const rotated_X = offset_X * cos_r - offset_Y * sin_r;
            const rotated_Y = offset_X * sin_r + offset_Y * cos_r;
            const screen_x = anchor_X + rotated_X * zoom;
            const screen_y = anchor_Y + rotated_Y * zoom;

            ctx.save();
            ctx.fillStyle = part.engine_active ? '#00ff66' : '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.font = "15px 'Tiny5', monospace";
            ctx.textAlign = 'center';

            const text_ox = `O: ${fuel_data.ox.toFixed(2)}`;
            const text_prop = `P: ${fuel_data.prop.toFixed(2)}`;

            ctx.strokeText(text_ox, screen_x, screen_y - 6);
            ctx.fillText(text_ox, screen_x, screen_y - 6);

            ctx.strokeText(text_prop, screen_x, screen_y + 6);
            ctx.fillText(text_prop, screen_x, screen_y + 6);
            ctx.restore();

        }
    });
}


export function tick_universe(real_dt, time_scale = 1) {

    const sim_time = real_dt * Math.max(0, time_scale);
    if (sim_time <= 0) return;

    planet_rotaion += planet_rotaion_speed * sim_time;
    tick_planet_orbit(sim_time);

    if (!other_planets_initialized) init_other_planet_orbits();

    for (const key in other_planet_orbits) {
        const i = Number(key);
        const s = body_position_at_time(i, 0);
        bodies[i].x = s.x;
        bodies[i].y = s.y;
    }

    if (game_State.active_rocket) {

        if (rocket_landed && current_center !== 0) {

            const theta_inertial = landed_surface_angle - Math.PI / 2 + planet_rotaion;
            rocket_x = landed_radius * Math.cos(theta_inertial);
            rocket_y = landed_radius * Math.sin(theta_inertial);
            rocket_vx = -planet_rotaion_speed * rocket_y;
            rocket_vy = planet_rotaion_speed * rocket_x;
            if (keys.KeyW) exit_landed_state();
        } else {

            if (!rocket_landed) {

                let available_torque = 0;
                for (let i = 0; i < game_State.active_rocket.length; i++) {
                    const part_data = parts[game_State.active_rocket[i].part_number - 1];
                    if (part_data && part_data.torque) available_torque += part_data.torque;
                }
                
                if (available_torque > 0) {
                    if (keys.KeyE) rocket_omega += (available_torque / rocket_inertia) * real_dt;
                    if (keys.KeyQ) rocket_omega -= (available_torque / rocket_inertia) * real_dt;
                }

                rocket_angle += rocket_omega * real_dt;
                rocket_render_angle = rocket_angle;
            }

            apply_thrust(real_dt);
            handle_ground_collision(real_dt);
            compute_all(sim_time);

        }
    }

    if (debris_vessels.length > 0) {


        for (const d of debris_vessels) {
            let ax = 0, ay = 0;
            for (let b = 0; b < bodies.length; b++) {

                const body = bodies[b];
                const dx = body.x - d.world_x;
                const dy = body.y - d.world_y;
                const dist_sq = dx * dx + dy * dy;
                const dist = Math.sqrt(dist_sq) || 1;
                const a = (G * body.mass) / dist_sq;
                ax += a * dx / dist;
                ay += a * dy / dist;
            }
            d.world_vx += ax * sim_time;
            d.world_vy += ay * sim_time;
            d.world_x += d.world_vx * sim_time;
            d.world_y += d.world_vy * sim_time;
            d.angle += d.omega * sim_time;
        }

        const planet_state = get_center_state(home_planet_index);
        for (let i = 0; i < debris_vessels.length; i++) {

            const d = debris_vessels[i];
            if (!d.hull || d.hull.length === 0) continue;

            const rel_x = d.world_x - planet_state.x;
            const rel_y = d.world_y - planet_state.y;
            const rel_vx = d.world_vx - planet_state.vx;
            const rel_vy = d.world_vy - planet_state.vy;

            const result = resolve_terrain_collision(home_planet_index, d.hull, d.angle, rel_x, rel_y, rel_vx, rel_vy, d.omega, d.inertia);
            if (!result) continue;

            d.omega += result.domega;
            d.world_x = planet_state.x + rel_x + result.dx;
            d.world_y = planet_state.y + rel_y + result.dy;
            d.world_vx = planet_state.vx + rel_vx + result.dvx;
            d.world_vy = planet_state.vy + rel_vy + result.dvy;

        }
    }
}

export function draw_game(ctx, canvas) {

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0b1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    if (last_frame_time === null) last_frame_time = now;
    const real_dt = Math.min((now - last_frame_time) / 1000, 0.05);
    last_frame_time = now;

    fps_frame_count++;
    if (now - fps_last_time >= 1000) {
        fps = fps_frame_count;
        fps_frame_count = 0;
        fps_last_time = now;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = "15px 'Tiny5', monospace";
    ctx.fillText('FPS: ' + fps, 10, 20);

    let current_signature = null;

    if (game_State.active_rocket) {
        current_signature = '';

        for (let i = 0; i < game_State.active_rocket.length; i++) {
            const p = game_State.active_rocket[i];
            current_signature += p.part_number + ':' + p.rel_X + ',' + p.rel_Y + ',' + (p.rotation || 0) + '|';
        }

    }

    if (current_signature !== cached_rocket_signature) {


        const com = compute_mass_properties(game_State.active_rocket);
        rocket_inertia = com.inertia;
        rocket_com_offset_X = com.com_X || 0;
        rocket_com_offset_Y = com.com_Y || 0;
        rocket_total_mass = com.total_mass || 0;
        rocket_Outline_Points = build_Rocket_Outline(game_State.active_rocket, rocket_com_offset_X, rocket_com_offset_Y);

        rocket_children_map = {};
        if (game_State.active_rocket) {

            for (let i = 0; i < game_State.active_rocket.length; i++) {
                const part = game_State.active_rocket[i];
                if (part.parent_pid === null || part.parent_pid === undefined) continue;
                const key = String(part.parent_pid);
                if (!rocket_children_map[key]) rocket_children_map[key] = [];
                rocket_children_map[key].push(String(part.pid));
            }
        }

        cached_rocket_signature = current_signature;
        cached_active_rocket = game_State.active_rocket;
    }

    if (game_State.active_rocket) {
        const pre_tick_altitude = get_rocket_position().alt;

        if (pre_tick_altitude < 100000 && game_State.time_scale > 5) {
            game_State.time_scale = 5;
        }
    }

    tick_universe(real_dt, game_State.time_scale || 1);
    let current_altitude = Infinity;

    const in_game = game_State.current_Screen === 'GAME' || game_State.current_view === 'GAME' || game_State.current_view === 'game';

    if (in_game) {
        if (keys.ArrowUp) zoom = Math.min(max_zoom, zoom * (1 + zoom_key_rate * real_dt));
        if (keys.ArrowDown) zoom = Math.max(min_zoom, zoom / (1 + zoom_key_rate * real_dt));
    }

    if (game_State.active_rocket && current_center !== 0) {

        const planet = bodies[current_center];
        const dx = rocket_x;
        const dy = rocket_y;

        current_altitude = Math.hypot(dx, dy) - planet.r;
        const theta = Math.atan2(dy, dx);

        let angle = theta + Math.PI / 2 - planet_rotaion;
        angle = angle % (Math.PI * 2);
        if (angle < 0) angle += Math.PI * 2;

        const body_circ = 2 * Math.PI * planet.r;
        rocket_local_X = (angle / (Math.PI * 2)) * body_circ;
        rocket_local_Y = terrain_base_height - current_altitude;

        cameraX = rocket_local_X;
        cameraY = rocket_local_Y;
    }

    if (game_State.active_rocket && current_center !== 0) {
        draw_Game_Terrain(ctx, canvas, current_center, rocket_local_X, current_altitude);
        draw_Game_object(ctx, canvas, game_State.active_rocket);
        draw_engine_plate_fuel_labels(ctx, canvas);
        update_and_draw_hovered_part(ctx, canvas);
    }


    const home_planet = bodies[home_planet_index];
    for (const d of debris_vessels) {
        const d_dx = d.world_x - home_planet.x;
        const d_dy = d.world_y - home_planet.y;
        const d_altitude = Math.hypot(d_dx, d_dy) - home_planet.r;
        let d_angle = (Math.atan2(d_dy, d_dx) + Math.PI / 2 - planet_rotaion) % (Math.PI * 2);
        if (d_angle < 0) d_angle += Math.PI * 2;
        const d_local_X = (d_angle / (Math.PI * 2)) * planet_circ;
        const d_local_Y = terrain_base_height - d_altitude;

        draw_Game_object(ctx, canvas, d.parts, {
            angle: d.angle,
            com_offset_X: d.com_offset_X,
            com_offset_Y: d.com_offset_Y,
            anchor_X: canvas.width / 2 + (d_local_X - rocket_local_X) * zoom,
            anchor_Y: canvas.height / 2 + (d_local_Y - rocket_local_Y) * zoom
        });
    }

    ctx.fillStyle = '#28d32b';
    ctx.font = "15px 'Tiny5', monospace";
    const altt = get_rocket_position().alt;

    ctx.fillText(`l_X: ${rocket_x.toFixed(8)} m`, 10, 310);
    ctx.fillText(`l_Y: ${rocket_y.toFixed(8)} m`, 10, 325);
    ctx.fillText(`l_VX: ${rocket_vx.toFixed(6)} m/s`, 10, 340);
    ctx.fillText(`l_VY: ${rocket_vy.toFixed(6)} m/s`, 10, 355);
    ctx.fillText(test, 10, 130);
    ctx.fillText(`a: ${o_a.toFixed(2)} m`, 10, 145);
    ctx.fillText(`e: ${o_e.toFixed(4)}`, 10, 160);
    ctx.fillText(`T: ${o_t.toFixed(1)} s`, 10, 175);
    ctx.fillText(`apo: ${o_apo.toFixed(2)} m`, 10, 190);
    ctx.fillText(`per: ${o_per.toFixed(4)}`, 10, 205);
    ctx.fillText(`eps: ${o_eps.toFixed(2)} s`, 10, 220);
    const dbg_theta0 = Math.atan2(rocket_y, rocket_x) * 180 / Math.PI;
    const dbg_om_deg = o_om * 180 / Math.PI;
    ctx.fillText(`om(deg): ${dbg_om_deg.toFixed(2)}`, 10, 250);
    ctx.fillText(`rocket_angle(deg): ${dbg_theta0.toFixed(2)}`, 10, 265);
    ctx.fillText(`diff(deg): ${(dbg_theta0 - dbg_om_deg).toFixed(2)}`, 10, 280);
    ctx.fillText(`alt: ${altt.toFixed(2)}`, 10, 295);

    draw_Speed_Controll(ctx);
    draw_hud_panels(ctx, canvas);

    if (!input_listeners_attached) { setup_game_input(canvas); input_listeners_attached = true; }
}


const biomes = [

    { name: 'a', color: [255, 0, 0], amplitude: 2000, persistence: 0.25, weight: 1, large_chance: 0.2, terracing: 0.5, plateau_chance: 0 },
    { name: 'b', color: [0, 0, 255], amplitude: 400, persistence: 0.5, weight: 2, large_chance: 0.3, terracing: 0.3, plateau_chance: 0 },
    { name: 'b', color: [0, 255, 255], amplitude: 4000, persistence: 0.25, weight: 1, large_chance: 0.1, terracing: 2, plateau_chance: 0 },
    { name: 'c', color: [0, 255, 0], amplitude: 600, persistence: 0.3, weight: 7, large_chance: 0.6, terracing: 0.8, plateau_chance: 0 }
];


function pick_weighted_biome(r, exclude_id = -1) {
    let total = 0;
    for (let i = 0; i < biomes.length; i++) {
        if (i === exclude_id) continue;
        total += biomes[i].weight;
    }
    const fallback = exclude_id === -1 ? biomes.length - 1 : exclude_id;
    if (total <= 0) return fallback;
    const target = r * total;
    let acc = 0;
    for (let i = 0; i < biomes.length; i++) {
        if (i === exclude_id) continue;
        acc += biomes[i].weight;
        if (target < acc) return i;
    }
    return fallback;
}

const min_biome_lenght = 200;
const max_biome_lenght = 10000;
const base_cell_size = (min_biome_lenght + max_biome_lenght) / 2;
const max_jitter = (base_cell_size - min_biome_lenght) / 2;
const perm_Cache = new Map();

function simplexNoise(x, seed) {

    let p = perm_Cache.get(seed);
    if (!p) {
        let s = seed | 0;
        const rand = () => {
            s |= 0; s = (s + 0x6D2B79F5) | 0;

            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const perm = [...Array(256).keys()];
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        p = [...perm, ...perm];
        perm_Cache.set(seed, p);

    }

    const i0 = Math.floor(x);
    const i1 = i0 + 1;
    const x0 = x - i0;
    const x1 = x0 - 1;
    const grad = (hash, x) => ((hash & 1) === 0 ? x : -x);
    let n0 = grad(p[i0 & 255], x0);
    let n1 = grad(p[i1 & 255], x1);
    const t0 = 1 - x0 * x0;
    const t1 = 1 - x1 * x1;
    n0 *= t0 * t0 * t0 * t0;
    n1 *= t1 * t1 * t1 * t1;
    return 0.8 * (n0 + n1);

}

function hash_int(x, seed) {

    let h = (x * 123456789 + seed * 123456780) | 0;

    h = Math.imul(h ^ (h >>> 14), 3659732191);
    h = (h ^ (h >>> 18)) >>> 0;
    return h / 4294967296;
}

const DEFAULT_TERRAIN_SEED = 4242;
const terrain_contexts = new Map();

function get_terrain_ctx(body_index) {

    let ctx = terrain_contexts.get(body_index);
    if (ctx) return ctx;
    const body = bodies[body_index];
    const body_seed = (body && body.seed !== undefined) ? body.seed : (DEFAULT_TERRAIN_SEED + body_index * 10007);
    ctx = {
        seed: body_seed,
        circ: 2 * Math.PI * body.r,
        biome_id_cache: new Map(),
        plateau_cache: new Map(),
        seam_height_cache: null
    };
    ctx.biome_id_cache.set(0, pick_weighted_biome(hash_int(0, body_seed + 578)));
    terrain_contexts.set(body_index, ctx);
    return ctx;
}

function boundary_position(ctx, i) {

    const jitter = (hash_int(i, ctx.seed) * 2 - 1) * max_jitter;
    return i * base_cell_size + jitter;
}

function cell_biome_id(ctx, i) {
    const cache = ctx.biome_id_cache;
    if (cache.has(i)) return cache.get(i);
    if (i > 0) {

        let j = i;
        while (!cache.has(j)) j--;
        for (let k = j; k < i; k++) {
            const prev_id = cache.get(k);

            const stick = biomes[prev_id].large_chance || 0;
            const roll = hash_int(k + 1, ctx.seed + 4243);
            const next_id = (roll < stick) ? prev_id : pick_weighted_biome(hash_int(k + 1, ctx.seed + 578), prev_id);
            cache.set(k + 1, next_id);

        }
    } else {

        let j = i;
        while (!cache.has(j)) j++;
        for (let k = j; k > i; k--) {
            const next_id = cache.get(k);
            const stick = biomes[next_id].large_chance || 0;
            const roll = hash_int(k, ctx.seed + 4243);
            const prev_id = (roll < stick) ? next_id : pick_weighted_biome(hash_int(k, ctx.seed + 578), next_id);
            cache.set(k - 1, prev_id);
        }

    }

    return cache.get(i);
}

function smoothstep(s) { return s * s * (3 - 2 * s); }

const min_transition_width = 12000, max_transition_width = 20000;
const max_blend_margin = Math.ceil(max_transition_width / min_biome_lenght) + 2;

function get_biome_params(ctx, x) {

    const membership = (j) => {
        const cell_len = (k) => boundary_position(ctx, k + 1) - boundary_position(ctx, k);
        const trans_w = (k) => Math.max(min_transition_width, Math.min(max_transition_width, Math.min(cell_len(k - 1), cell_len(k)) * 0.2));
        const b_left = boundary_position(ctx, j), b_right = boundary_position(ctx, j + 1);
        const tw_left = trans_w(j), tw_right = trans_w(j + 1);
        const ramp_in = Math.max(0, Math.min(1, (x - (b_left - tw_left / 2)) / tw_left));
        const ramp_out = Math.max(0, Math.min(1, ((b_right + tw_right / 2) - x) / tw_right));
        return smoothstep(ramp_in) * smoothstep(ramp_out);

    };

    let i = Math.floor(x / base_cell_size);
    while (boundary_position(ctx, i) > x) i--;
    while (boundary_position(ctx, i + 1) <= x) i++;

    let total_weight = 0;
    let color_r = 0, color_g = 0, color_b = 0;
    let amplitude = 0, persistence = 0, terracing = 0;

    for (let j = i; j <= i + max_blend_margin; j++) {

        const w = membership(j);
        if (w <= 0 && j > i) break;
        if (w <= 0) continue;
        const b = biomes[cell_biome_id(ctx, j)];
        color_r += b.color[0] * w; color_g += b.color[1] * w; color_b += b.color[2] * w;
        amplitude += b.amplitude * w; persistence += b.persistence * w; terracing += b.terracing * w; total_weight += w;

    }
    for (let j = i - 1; j >= i - max_blend_margin; j--) {

        const w = membership(j);
        if (w <= 0) break;
        const b = biomes[cell_biome_id(ctx, j)];
        color_r += b.color[0] * w; color_g += b.color[1] * w; color_b += b.color[2] * w;
        amplitude += b.amplitude * w; persistence += b.persistence * w; terracing += b.terracing * w; total_weight += w;

    }
    if (total_weight <= 0) total_weight = 1;

    return {

        color: [Math.round(color_r / total_weight), Math.round(color_g / total_weight), Math.round(color_b / total_weight)],
        amplitude: amplitude / total_weight, persistence: persistence / total_weight, terracing: terracing / total_weight
    };

}


export function get_planet_raw_height(body_index, x) { return compute_planet_height(get_terrain_ctx(body_index), x); }
const seam_blend_width = 5000;


export function get_planet_height(body_index, x) {

    const ctx = get_terrain_ctx(body_index);
    let m = x % ctx.circ;
    if (m < 0) m += ctx.circ;
    const dist_to_seam = Math.min(m, ctx.circ - m);

    if (dist_to_seam < seam_blend_width) {


        if (ctx.seam_height_cache === null) ctx.seam_height_cache = compute_planet_height(ctx, 0);
        const seam_h = ctx.seam_height_cache;
        const t = smoothstep(dist_to_seam / seam_blend_width);
        return seam_h + (compute_planet_height(ctx, m) - seam_h) * t;
    }


    return compute_planet_height(ctx, m);
}

function spline(x, points) {
    if (x <= points[0][0]) return points[0][1];
    const last = points[points.length - 1];
    if (x >= last[0]) return last[1];
    for (let i = 0; i < points.length - 1; i++) {
        const [x0, y0] = points[i], [x1, y1] = points[i + 1];
        if (x > x0 && x <= x1) {
            const t = (x - x0) / (x1 - x0);
            return y0 + (y1 - y0) * (t * t * (3 - 2 * t));
        }
    }
    return last[1];
}

const continental_spline = [[-1, -500], [-0.4, -150], [-0.1, 0], [0.3, 300], [1, 900]];
const erosion_spline = [[-1, 1.8], [-0.3, 1.2], [0.2, 0.5], [0.6, 0.8], [1, 0.02]];


function compute_raw_height(ctx, x) {

    const base = terrain_base_height, p = get_biome_params(ctx, x);

    const wx = x + simplexNoise(x * 0.0003, ctx.seed + 69696) * 400; 
    const continentalness = simplexNoise(x * 0.00006, ctx.seed + 11000);
    const erosion = simplexNoise(x * 0.00012, ctx.seed + 22000);

    const weirdness = simplexNoise(x * 0.00018, ctx.seed + 33000);
    const peaks_valleys = 1 - Math.abs(3 * Math.abs(weirdness) - 2);

    const height_from_continent = spline(continentalness, continental_spline);
    const mountain_factor = spline(erosion, erosion_spline);

    let height = height_from_continent + peaks_valleys * 600 * mountain_factor;
    let amplitude = p.amplitude * 0.045 * mountain_factor, freq = 0.0009;

    for (let o = 0; o < 8; o++) {
        height += simplexNoise(wx * freq, ctx.seed + o * 1069) * amplitude;
        amplitude *= p.persistence;
        freq *= 2.5;
    }

    
    height += base;
    if (p.terracing <= 0) return height;
    const step = Math.max(0.3, Math.min(3, 25 / p.terracing));
    return base + Math.round((height - base) / step) * step;
}

const plateau_slot_size = 3000, plateau_blend_width_min = 150, plateau_blend_width_max = 1550, plateau_search_margin = 300, plateau_flatten_persistnce = 0.6, plateau_detaiil_amplitude = 18, plateau_sample_count = 14, plateau_min_peak_gap_fraction = 0.35;

function get_plateau_slots(ctx, s) {
    const cache = ctx.plateau_cache;
    if (cache.has(s)) return cache.get(s);
    const slot_start = s * plateau_slot_size, slot_end = slot_start + plateau_slot_size;

    const mid_x = slot_start + plateau_slot_size / 2;
    let cell_i = Math.floor(mid_x / base_cell_size);
    while (boundary_position(ctx, cell_i) > mid_x) cell_i--;
    while (boundary_position(ctx, cell_i + 1) <= mid_x) cell_i++;
    const chance = biomes[cell_biome_id(ctx, cell_i)].plateau_chance || 0;

    const search_start = slot_start + plateau_search_margin, search_end = slot_end - plateau_search_margin, usable_width = search_end - search_start;

    if (hash_int(s, ctx.seed + 69697) >= chance || usable_width <= 0) {
        const result = { active: false }; cache.set(s, result); return result;
    }

    let best1_x = search_start, best1_h = Infinity;
    for (let k = 0; k < plateau_sample_count; k++) {
        const sx = search_start + (k / (plateau_sample_count - 1)) * usable_width, h = compute_raw_height(ctx, sx);
        if (h < best1_h) { best1_h = h; best1_x = sx; }
    }
    let best2_x = best1_x, best2_h = Infinity;
    for (let k = 0; k < plateau_sample_count; k++) {
        const sx = search_start + (k / (plateau_sample_count - 1)) * usable_width;
        if (Math.abs(sx - best1_x) < usable_width * plateau_min_peak_gap_fraction) continue;
        const h = compute_raw_height(ctx, sx);
        if (h < best2_h) { best2_h = h; best2_x = sx; }
    }
    const peak_left_x = Math.min(best1_x, best2_x), peak_right_x = Math.max(best1_x, best2_x);

    const blend_left = plateau_blend_width_min + hash_int(s * 2, ctx.seed + 81457) * (plateau_blend_width_max - plateau_blend_width_min);
    const blend_right = plateau_blend_width_min + hash_int(s * 2 + 1, ctx.seed + 81457) * (plateau_blend_width_max - plateau_blend_width_min);

    const result = { active: true, peak_left_x, peak_right_x, height_left: peak_left_x === best1_x ? best1_h : best2_h, height_right: peak_right_x === best1_x ? best2_h : best1_h, level: Math.min(best1_h, best2_h), blend_left, blend_right, slot_start, slot_end };
    cache.set(s, result); return result;
}

function compute_planet_height(ctx, x) {
    const s = Math.floor(x / plateau_slot_size), slot = get_plateau_slots(ctx, s);
    if (slot.active) {

        const plateau_height = () => {
            let detail = 0, amp = plateau_detaiil_amplitude, freq = 0.03;

            for (let o = 0; o < 3; o++) {
                detail += simplexNoise(x * freq, ctx.seed + 55000 + o * 787) * amp;
                amp *= plateau_flatten_persistnce; freq *= 2.5;
            }
            return slot.level + detail;
        };

        if (x >= slot.peak_left_x && x <= slot.peak_right_x) return plateau_height();
        const blend_left = Math.max(1, Math.min(slot.blend_left, slot.peak_left_x - slot.slot_start));
        const blend_right = Math.max(1, Math.min(slot.blend_right, slot.slot_end - slot.peak_right_x));
        if (x >= slot.peak_left_x - blend_left && x < slot.peak_left_x) {
            const raw = compute_raw_height(ctx, x);
            return raw + (plateau_height() - raw) * smoothstep(Math.max(0, Math.min(1, (x - (slot.peak_left_x - blend_left)) / blend_left)));
        }
        if (x > slot.peak_right_x && x <= slot.peak_right_x + blend_right) {

            const raw = compute_raw_height(ctx, x);

            return raw + (plateau_height() - raw) * smoothstep(Math.max(0, Math.min(1, ((slot.peak_right_x + blend_right) - x) / blend_right)));
        }
    }
    return compute_raw_height(ctx, x);
}



export function local_map_position(x, y) {
    const planet = bodies[home_planet_index];
    const theta = -Math.PI / 2 + (x / planet_circ) * 2 * Math.PI + planet_rotaion;
    const visual_radius = ((planet.r || 0) + (terrain_base_height - y)) * planet_visual_scale;
    return { x: planet.x + visual_radius * Math.cos(theta), y: planet.y + visual_radius * Math.sin(theta) };
}

export function get_rocket_map_position() {
    const w = get_world_state();
    return { x: w.x, y: w.y };
}

export function get_rocket_position() {
    const planet = bodies[home_planet_index];
    const world = get_world_state();

    const alt_dx = current_center === home_planet_index ? rocket_x : world.x - planet.x;
    const alt_dy = current_center === home_planet_index ? rocket_y : world.y - planet.y;
    const current_altitude = Math.hypot(alt_dx, alt_dy) - planet.r;

    return {
        x: world.x,
        y: world.y,
        alt: current_altitude,
        speed: Math.hypot(world.vx, world.vy),
        has_rocket: game_State.active_rocket !== null
    };
}

const SPAWN_PLANET_INDEX = 1;

const spawn_local_x = 1000000;
const spawn_planet_r = bodies[SPAWN_PLANET_INDEX].r;
const spawn_planet_circ = 2 * Math.PI * spawn_planet_r;
const spawn_terrain_h = get_planet_height(SPAWN_PLANET_INDEX, spawn_local_x);
const spawn_margin = 5;
const spawn_radius = spawn_planet_r + (terrain_base_height - spawn_terrain_h) + spawn_margin;

const spawn_theta = (spawn_local_x / spawn_planet_circ) * 2 * Math.PI - Math.PI / 2 + planet_rotaion;

let rocket_x = spawn_radius * Math.cos(spawn_theta);
let rocket_y = spawn_radius * Math.sin(spawn_theta);

let rocket_vx = -planet_rotaion_speed * rocket_y;
let rocket_vy = planet_rotaion_speed * rocket_x;

export let rocket_landed = false;
let landed_surface_angle = 0;
let landed_radius = 0;

export function is_rocket_landed() {
    return rocket_landed;
}

function exit_landed_state() {
    rocket_landed = false;
    rocket_vx = -planet_rotaion_speed * rocket_y;
    rocket_vy = planet_rotaion_speed * rocket_x;
    orbit_initialized = false;
    soi_encounter_computed_time = null;
    maneuver_soi_entry_dirty = true;
}

let o_a = 0;
let o_t = 0;
let o_per = 0;
let o_apo = 0;
let o_e = 0;
let o_om = 0;
let o_eps = 0;
let o_dir = 0;

const o_points = 900;
const sun = bodies[0];
const G = 6.674e-11;

export function get_rocket_world_position() {
    const w = get_world_state();
    return { x: w.x, y: w.y };
}


let p_o_r = 0;
let p_o_an = 0;
let p_o_om = 0;
let p_o_i = false;
let p_o_t = 0;

let other_planet_orbits = {};
let other_planets_initialized = false;

export function tick_planet_orbit(dt) {
    const planet = bodies[home_planet_index];

    if (!p_o_i) {
        const rx = planet.x - sun.x;
        const ry = planet.y - sun.y;
        p_o_r = Math.sqrt(rx * rx + ry * ry);
        p_o_an = Math.atan2(ry, rx);

        const mu = G * sun.mass;
        p_o_om = Math.sqrt(mu / (p_o_r ** 3));
        p_o_t = 0;
        p_o_i = true;
    }
    p_o_t += dt;
    const angle = p_o_an + p_o_om * p_o_t;

    planet.x = sun.x + p_o_r * Math.cos(angle);
    planet.y = sun.y + p_o_r * Math.sin(angle);
}

function init_other_planet_orbits() {


    const mu_sun = G * sun.mass;
    for (let i = 0; i < bodies.length; i++) {
        if (i === 0 || i === home_planet_index) continue;

        const b = bodies[i];
        const rx = b.x - sun.x;
        const ry = b.y - sun.y;
        const vx = b.vx || 0;
        const vy = b.vy || 0;

        const elems = elements_from_state(rx, ry, vx, vy, mu_sun);
        const theta0 = Math.atan2(ry, rx) - elems.om;

        let M0;
        if (elems.e < 1) {
            const E0 = 2 * Math.atan2(Math.sqrt(Math.max(0, 1 - elems.e)) * Math.sin(theta0 / 2), Math.sqrt(1 + elems.e) * Math.cos(theta0 / 2));
            M0 = E0 - elems.e * Math.sin(E0);
        } else {
            const H0 = 2 * Math.atanh(clamp(Math.sqrt((elems.e - 1) / (elems.e + 1)) * Math.tan(theta0 / 2), -0.999999, 0.999999));
            M0 = elems.e * Math.sinh(H0) - H0;
        }

        other_planet_orbits[i] = { a: elems.a, e: elems.e, om: elems.om, dir: elems.dir, M0, mu: mu_sun };
    }

    other_planets_initialized = true;
}


function body_position_at_time(body_index, t_future) {
    if (body_index === home_planet_index) {
        const angle = p_o_an + p_o_om * (p_o_t + t_future);
        return {
            x: sun.x + p_o_r * Math.cos(angle),
            y: sun.y + p_o_r * Math.sin(angle),
            vx: -p_o_r * p_o_om * Math.sin(angle),
            vy: p_o_r * p_o_om * Math.cos(angle)
        };
    }
    const el = other_planet_orbits[body_index];
    if (!el) return { x: bodies[body_index].x, y: bodies[body_index].y, vx: 0, vy: 0 };
    const s = orbit_local_state(el.a, el.e, el.om, el.dir, el.M0, el.mu, p_o_t + t_future);
    return { x: sun.x + s.x, y: sun.y + s.y, vx: s.vx, vy: s.vy };
}

export function export_planet_orbit_lines() {
    const points = [];
    const num = 500;
    const current_angle = p_o_an + p_o_om * p_o_t;
    for (let i = 0; i <= num; i++) {
        const a = current_angle + (i / num) * 2 * Math.PI;
        points.push({
            x: sun.x + p_o_r * Math.cos(a),
            y: sun.y + p_o_r * Math.sin(a)
        });
    }
    return points;
}

const soi_factor_cache = new Map();

export function get_soi_radius(body_index) {
    const body = bodies[body_index];
    if (!body || body_index === 0) return 0;
    let factor = soi_factor_cache.get(body_index);
    if (factor === undefined) {
        factor = Math.pow(body.mass / sun.mass, 0.4) * 1.8;
        soi_factor_cache.set(body_index, factor);
    }
    const dist = Math.hypot(body.x - sun.x, body.y - sun.y);
    return dist * factor;
}

function get_center_state(body_index) {
    if (body_index === 0) return { x: sun.x, y: sun.y, vx: 0, vy: 0, mass: sun.mass };
    const s = body_position_at_time(body_index, 0);
    return { x: s.x, y: s.y, vx: s.vx, vy: s.vy, mass: bodies[body_index].mass };
}

function get_world_state() {
    const center = get_center_state(current_center);
    return {
        x: center.x + rocket_x,
        y: center.y + rocket_y,
        vx: center.vx + rocket_vx,
        vy: center.vy + rocket_vy
    };
}

let current_center = SPAWN_PLANET_INDEX;
export function get_current_center() { return current_center; }
let orbit_initialized = false;
let orbit_M0 = 0;
let sim_time_total = 0;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }


function solve_kepler(M, e) {
    if (e >= 1) {
        let H = Math.log(2 * Math.abs(M) / e + 1.8);
        if (M < 0) H = -H;
        for (let iter = 0; iter < 50; iter++) {
            const f = e * Math.sinh(H) - H - M;
            const fp = e * Math.cosh(H) - 1;
            H -= f / fp;
        }
        return H;
    }

    let Mn = M % (Math.PI * 2);
    if (Mn > Math.PI) Mn -= Math.PI * 2;
    if (Mn < -Math.PI) Mn += Math.PI * 2;

    const sgn = Mn < 0 ? -1 : 1;
    const Ma = Math.abs(Mn);
    let E = e > 0.8 ? Math.PI : Ma;
    for (let i = 0; i < 50; i++) {
        const f = E - e * Math.sin(E) - Ma;
        const fp = 1 - e * Math.cos(E);
        const delta = f / fp;
        E -= delta;
        if (Math.abs(delta) < 1e-12) break;
    }
    return sgn * E;
}

function elements_from_state(rx, ry, vx, vy, mu) {
    const r0 = Math.hypot(rx, ry);
    const v_sq = vx * vx + vy * vy;
    const eps = v_sq / 2 - mu / r0;
    const h = rx * vy - ry * vx;
    const rv = rx * vx + ry * vy;
    const a = -mu / (2 * eps);
    const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h * h) / (mu * mu)));
    const ex = ((v_sq - mu / r0) * rx - rv * vx) / mu;
    const ey = ((v_sq - mu / r0) * ry - rv * vy) / mu;
    const om = Math.atan2(ey, ex);
    const dir = h >= 0 ? 1 : -1;
    return { a, e, om, dir };
}

function init_orbit_from_state() {
    const mu = G * bodies[current_center].mass;

    let saved_node = null;
    if (maneuver_node && maneuver_node.center === current_center &&
        isFinite(o_a) && o_a > 0 && o_e < 1 &&
        maneuver_node.t_abs > sim_time_total) {
        const s = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, maneuver_node.t_abs);
        saved_node = {
            rel_x: s.x,
            rel_y: s.y,
            dv_pro: maneuver_node.dv_pro,
            dv_rad: maneuver_node.dv_rad
        };
    }

    const elems = elements_from_state(rocket_x, rocket_y, rocket_vx, rocket_vy, mu);
    o_a = elems.a;
    o_e = elems.e;
    o_om = elems.om;
    o_dir = elems.dir;

    const theta0 = Math.atan2(rocket_y, rocket_x) - o_om;

    if (o_e < 1) {
        const E0 = 2 * Math.atan2(Math.sqrt(Math.max(0, 1 - o_e)) * Math.sin(theta0 / 2), Math.sqrt(1 + o_e) * Math.cos(theta0 / 2));
        orbit_M0 = E0 - o_e * Math.sin(E0);
    } else {
        const H0 = 2 * Math.atanh(clamp(Math.sqrt((o_e - 1) / (o_e + 1)) * Math.tan(theta0 / 2), -0.999999, 0.999999));
        orbit_M0 = o_e * Math.sinh(H0) - H0;
    }

    sim_time_total = 0;
    orbit_initialized = true;

    if (saved_node && o_e < 1) {
        const cos_om = Math.cos(o_om), sin_om = Math.sin(o_om);
        const best_E = find_closest_E_on_orbit(saved_node.rel_x, saved_node.rel_y, cos_om, sin_om);
        maneuver_node = {
            t_abs: maneuver_t_abs_from_E(best_E),
            dv_pro: saved_node.dv_pro,
            dv_rad: saved_node.dv_rad,
            center: current_center
        };
        maneuver_soi_entry_dirty = true;
    } else {
        maneuver_node = null;
    }
}

function orbit_local_state(a, e, om, dir, M0, mu, t) {
    const cos_om = Math.cos(om), sin_om = Math.sin(om);
    if (e < 1) {
        const n = Math.sqrt(mu / (a ** 3));
        const M = M0 + dir * n * t;
        const E = solve_kepler(M, e);
        const x_orb = a * (Math.cos(E) - e);
        const y_orb = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
        const dE_dt = dir * n / (1 - e * Math.cos(E));
        const vx_orb = -a * Math.sin(E) * dE_dt;
        const vy_orb = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.cos(E) * dE_dt;
        return { x: x_orb*cos_om - y_orb*sin_om, y: x_orb*sin_om + y_orb*cos_om,
                 vx: vx_orb*cos_om - vy_orb*sin_om, vy: vx_orb*sin_om + vy_orb*cos_om };
    } else {
        const n = Math.sqrt(mu / ((-a) ** 3));
        const M = M0 + dir * n * t;
        const H = solve_kepler(M, e);
        const x_orb = a * (Math.cosh(H) - e);
        const y_orb = -a * Math.sqrt(e * e - 1) * Math.sinh(H);
        const dH_dt = dir * n / (e * Math.cosh(H) - 1);
        const vx_orb = a * Math.sinh(H) * dH_dt;
        const vy_orb = -a * Math.sqrt(e * e - 1) * Math.cosh(H) * dH_dt;
        return { x: x_orb*cos_om - y_orb*sin_om, y: x_orb*sin_om + y_orb*cos_om,
                 vx: vx_orb*cos_om - vy_orb*sin_om, vy: vx_orb*sin_om + vy_orb*cos_om };
    }
}

function find_soi_crossing_time(t_lo, t_hi, inside_fn) {
    const start_inside = inside_fn(t_lo);
    for (let i = 0; i < 40; i++) {
        const t_mid = (t_lo + t_hi) / 2;
        if (inside_fn(t_mid) === start_inside) t_lo = t_mid; else t_hi = t_mid;
    }
    return (t_lo + t_hi) / 2;
}



function compute_all(dt) {
    if (!orbit_initialized) init_orbit_from_state();

    const t_start = sim_time_total;
    sim_time_total += dt;
    const t_end = sim_time_total;

    const mu = G * bodies[current_center].mass;
    if (!isFinite(o_a) || o_a === 0) return;

    const s = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, t_end);
    rocket_x = s.x; rocket_y = s.y; rocket_vx = s.vx; rocket_vy = s.vy;

    if (o_e < 1) {
        o_per = o_a * (1 - o_e);
        o_apo = o_a * (1 + o_e);
        o_t = 2 * Math.PI * Math.sqrt((o_a ** 3) / mu);
    } else {
        o_per = o_a * (1 - o_e);
        o_apo = Infinity;
        o_t = Infinity;
    }
    o_eps = -mu / (2 * o_a);

    if (current_center === 0) {
        for (let b = 1; b < bodies.length; b++) {
            const soi_r = get_soi_radius(b);
            const dist_at = (t) => {
                const st = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, t);
                const bp = body_position_at_time(b, t - t_end);
                return Math.hypot(st.x - bp.x, st.y - bp.y);
            };
            if (dist_at(t_end) > soi_r && dist_at(t_start) <= soi_r) {
                const t_cross = find_soi_crossing_time(t_start, t_end, (t) => dist_at(t) <= soi_r);
                const sc = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, t_cross);
                const bp = body_position_at_time(current_center, t_cross - t_end);
                rocket_x = bp.x + sc.x; rocket_y = bp.y + sc.y;
                rocket_vx = bp.vx + sc.vx; rocket_vy = bp.vy + sc.vy;
                current_center = 0;
                orbit_initialized = false;
                soi_encounter_computed_time = null;
                maneuver_soi_entry_dirty = true;
                compute_all(t_end - t_cross);
            }
        }
    } else {
        const soi_r = get_soi_radius(current_center);
        const dist_at = (t) => {
            const st = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, t);
            return Math.hypot(st.x, st.y);
        };
        if (dist_at(t_end) > soi_r && dist_at(t_start) <= soi_r) {
            const t_cross = find_soi_crossing_time(t_start, t_end, (t) => dist_at(t) <= soi_r);
            const sc = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, t_cross);
            const bp = body_position_at_time(current_center, t_cross - t_end);
            rocket_x = bp.x + sc.x; rocket_y = bp.y + sc.y;
            rocket_vx = bp.vx + sc.vx; rocket_vy = bp.vy + sc.vy;
            current_center = 0;
            orbit_initialized = false;
            soi_encounter_computed_time = null;
            maneuver_soi_entry_dirty = true;
            compute_all(t_end - t_cross);
        }
    }
}


export function rocket_state_at_time(t_future) {
    if (!isFinite(o_a) || o_a <= 0 || o_e >= 1) return null;

    const center = get_center_state(current_center);
    const mu = G * center.mass;
    const n = Math.sqrt(mu / (o_a ** 3));
    const M = orbit_M0 + o_dir * n * (sim_time_total + t_future);
    const E = solve_kepler(M, o_e);

    const cos_om = Math.cos(o_om), sin_om = Math.sin(o_om);
    const x_orb = o_a * (Math.cos(E) - o_e);
    const y_orb = o_a * Math.sqrt(Math.max(0, 1 - o_e * o_e)) * Math.sin(E);

    const dE_dt = o_dir * n / (1 - o_e * Math.cos(E));
    const vx_orb = -o_a * Math.sin(E) * dE_dt;
    const vy_orb = o_a * Math.sqrt(Math.max(0, 1 - o_e * o_e)) * Math.cos(E) * dE_dt;

    let c_x = center.x, c_y = center.y, c_vx = center.vx, c_vy = center.vy;
    if (current_center === home_planet_index) {
        const p_s = body_position_at_time(home_planet_index, t_future);
        c_x = p_s.x; c_y = p_s.y; c_vx = p_s.vx; c_vy = p_s.vy;
    }

    return {
        x: c_x + (x_orb * cos_om - y_orb * sin_om),
        y: c_y + (x_orb * sin_om + y_orb * cos_om),
        vx: c_vx + (vx_orb * cos_om - vy_orb * sin_om),
        vy: c_vy + (vx_orb * sin_om + vy_orb * cos_om)
    };
}


function is_inside_any_soi(pos, t, body_list) {
    if (body_list) {
        for (let idx = 0; idx < body_list.length; idx++) {
            const b = body_list[idx];
            const body_pos = body_position_at_time(b, t);
            const soi_r = get_soi_radius(b);
            if (Math.hypot(pos.x - body_pos.x, pos.y - body_pos.y) <= soi_r) return b;
        }
        return -1;
    }
    for (let b = 1; b < bodies.length; b++) {
        const body_pos = body_position_at_time(b, t);
        const soi_r = get_soi_radius(b);
        if (Math.hypot(pos.x - body_pos.x, pos.y - body_pos.y) <= soi_r) return b;
    }
    return -1;
}

function get_relevant_bodies_for_orbit(a, e) {
    const bounds = (a_, e_) => (e_ < 1)
        ? { r_min: a_ * (1 - e_), r_max: a_ * (1 + e_) }
        : { r_min: a_ * (1 - e_), r_max: Infinity };

    const rocket_bounds = bounds(a, e);
    const relevant = [];
    for (let b = 1; b < bodies.length; b++) {
        const soi_r = get_soi_radius(b);

        let body_bounds;
        if (b === home_planet_index) {
            body_bounds = { r_min: p_o_r, r_max: p_o_r };
        } else {
            if (!other_planets_initialized) init_other_planet_orbits();
            const el = other_planet_orbits[b];
            if (!el) {
                const bd = bodies[b];
                const r = Math.hypot(bd.x - sun.x, bd.y - sun.y);
                body_bounds = { r_min: r, r_max: r };
            } else {
                body_bounds = bounds(el.a, el.e);
            }
        }

        const lo = body_bounds.r_min - soi_r;
        const hi = (body_bounds.r_max === Infinity) ? Infinity : body_bounds.r_max + soi_r;
        if (rocket_bounds.r_max >= lo && rocket_bounds.r_min <= hi) {
            relevant.push(b);
        }
    }
    return relevant;
}

let cached_soi_encounter = null;
let soi_encounter_computed_time = null;
let soi_encounter_last_real_ms = 0;
const soi_encounter_min_recompute_ms = 500;
const soi_bisect_iterations = 40;
const soi_transit_target_px = 1.5;
const soi_transit_max_depth = 14;

function soi_orbit_position(local, n_local, M1, dir, dt, cos_om, sin_om, body_index, entry_t) {
    const M = M1 + dir * n_local * dt;
    const H = solve_kepler(M, local.e);
    const x_orb = local.a * (Math.cosh(H) - local.e);
    const y_orb = -local.a * Math.sqrt(local.e * local.e - 1) * Math.sinh(H);

    const body = bodies[body_index];

    return {
        x: body.x + x_orb * cos_om - y_orb * sin_om,
        y: body.y + x_orb * sin_om + y_orb * cos_om
    };
}


function subdivide_soi_segment(points, dt_a, p_a, dt_b, p_b, zoom, depth, args) {
    const screen_dist = Math.hypot(p_b.x - p_a.x, p_b.y - p_a.y) * zoom;
    if (depth >= soi_transit_max_depth || screen_dist <= soi_transit_target_px) {
        points.push({ x: p_b.x, y: p_b.y, blocked: false });
        return;
    }
    const dt_mid = (dt_a + dt_b) / 2;
    const p_mid = soi_orbit_position(args.local, args.n_local, args.M1, args.dir, dt_mid, args.cos_om, args.sin_om, args.body_index, args.entry_t);
    subdivide_soi_segment(points, dt_a, p_a, dt_mid, p_mid, zoom, depth + 1, args);
    subdivide_soi_segment(points, dt_mid, p_mid, dt_b, p_b, zoom, depth + 1, args);
}




function theta_to_hyperbolic_H(theta, e) {
    let a = theta % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    const arg = clamp(Math.sqrt((e - 1) / (e + 1)) * Math.tan(a / 2), -0.999999, 0.999999);
    return 2 * Math.atanh(arg);
}

function build_maneuver_elliptical_sampler(elems, mu, th0) {
    const n = Math.sqrt(mu / (elems.a ** 3));
    const E0 = 2 * Math.atan2(
        Math.sqrt(Math.max(0, 1 - elems.e)) * Math.sin(th0 / 2),
        Math.sqrt(1 + elems.e) * Math.cos(th0 / 2)
    );
    const M0 = E0 - elems.e * Math.sin(E0);
    const cos_om = Math.cos(elems.om), sin_om = Math.sin(elems.om);

    return function (dt_local) {
        const M = M0 + elems.dir * n * dt_local;
        const E = solve_kepler(M, elems.e);
        const x_orb = elems.a * (Math.cos(E) - elems.e);
        const y_orb = elems.a * Math.sqrt(Math.max(0, 1 - elems.e * elems.e)) * Math.sin(E);
        return {
            x: x_orb * cos_om - y_orb * sin_om,
            y: x_orb * sin_om + y_orb * cos_om
        };
    };
}

let cached_maneuver_soi_entry = null;
let maneuver_soi_entry_dirty = true;
let maneuver_soi_entry_last_real_ms = -Infinity;
const maneuver_soi_entry_min_recompute_ms = 500;

function get_maneuver_soi_entry(elems, st) {
    if (!maneuver_soi_entry_dirty) return cached_maneuver_soi_entry;

    const now = performance.now();
    if (now - maneuver_soi_entry_last_real_ms < maneuver_soi_entry_min_recompute_ms) {
        return cached_maneuver_soi_entry;
    }

    let entry = null;
    if (current_center === 0 && maneuver_node && isFinite(elems.a) && elems.a > 0 && elems.e < 1) {
        const relevant_bodies = get_relevant_bodies_for_orbit(elems.a, elems.e);
        const period = 2 * Math.PI * Math.sqrt((elems.a ** 3) / st.mu);
        if (relevant_bodies.length > 0 && isFinite(period) && period > 0) {
            const dt_burn = maneuver_node.t_abs - sim_time_total;
            const th0 = Math.atan2(st.y, st.x) - elems.om;
            const center = get_center_state(current_center);
            const rel0 = build_maneuver_elliptical_sampler(elems, st.mu, th0)(0);
            const start_pos = { x: center.x + rel0.x, y: center.y + rel0.y };
            const start_body = is_inside_any_soi(start_pos, dt_burn, relevant_bodies);
            entry = (start_body !== -1)
                ? { dt_local: 0, body_index: start_body, x: start_pos.x, y: start_pos.y }
                : find_helio_soi_entry(elems, st.x, st.y, st.mu, dt_burn);
        }
    }

    cached_maneuver_soi_entry = entry;
    maneuver_soi_entry_last_real_ms = now;
    maneuver_soi_entry_dirty = false;
    return entry;
}

function compute_soi_encounter() {
    let entry = null;
    if (isFinite(o_a) && o_a > 0 && o_e < 1 && isFinite(o_t) && o_t > 0) {
        const relevant_bodies = get_relevant_bodies_for_orbit(o_a, o_e);
        if (relevant_bodies.length > 0) {
            const start_pos = rocket_state_at_time(0);
            const start_body = is_inside_any_soi(start_pos, 0, relevant_bodies);
            if (start_body !== -1) {
                const body_pos0 = body_position_at_time(start_body, 0);
                const angle0 = Math.atan2(start_pos.y - body_pos0.y, start_pos.x - body_pos0.x);
                entry = { t: 0, body_index: start_body, x: start_pos.x, y: start_pos.y, angle: angle0 };
            } else {
                let min_soi_r = Infinity;
                for (const b of relevant_bodies) min_soi_r = Math.min(min_soi_r, get_soi_radius(b));
                const mu_helio = G * sun.mass;
                const v_peri = Math.sqrt(mu_helio * (2 / o_per - 1 / o_a));
                const safe_dt = (2 * min_soi_r) / v_peri / 6;
                const dyn_points = Math.min(4000, Math.max(o_points, Math.ceil(o_t / safe_dt)));

                let prev_t = 0;
                for (let i = 1; i <= dyn_points; i++) {
                    const t = (i / dyn_points) * o_t;
                    const pos = rocket_state_at_time(t);
                    const body = is_inside_any_soi(pos, t, relevant_bodies);

                    if (body !== -1) {
                        let t_lo = prev_t, t_hi = t;
                        for (let k = 0; k < soi_bisect_iterations; k++) {
                            const t_mid = (t_lo + t_hi) / 2;
                            const inside_mid = is_inside_any_soi(rocket_state_at_time(t_mid), t_mid, relevant_bodies) !== -1;
                            if (inside_mid) t_hi = t_mid; else t_lo = t_mid;
                        }
                        const final_pos = rocket_state_at_time(t_hi);
                        const body_pos = body_position_at_time(body, t_hi);
                        const angle = Math.atan2(final_pos.y - body_pos.y, final_pos.x - body_pos.x);
                        entry = { t: t_hi, body_index: body, x: final_pos.x, y: final_pos.y, angle };
                        break;
                    }
                    prev_t = t;
                }
            }
        }
    }
    if (!entry) return null;

    const rocket_state = rocket_state_at_time(entry.t);
    if (!rocket_state) return null;

    const body = bodies[entry.body_index];
    const body_state = body_position_at_time(entry.body_index, entry.t);

    const rel_x = entry.x - body_state.x;
    const rel_y = entry.y - body_state.y;
    const rel_vx = rocket_state.vx - (body_state.vx || 0);
    const rel_vy = rocket_state.vy - (body_state.vy || 0);

    const mu_body = G * body.mass;
    const local = elements_from_state(rel_x, rel_y, rel_vx, rel_vy, mu_body);

    if (local.e < 1) {
        return { entry, body_index: entry.body_index, local, bound: true };
    }

    const H1 = theta_to_hyperbolic_H(entry.angle - local.om, local.e);

    const M1 = local.e * Math.sinh(H1) - H1;
    const n_local = Math.sqrt(mu_body / ((-local.a) ** 3));
    const dt_transit = -2 * M1 / (local.dir * n_local);
    const exit_angle = 2 * local.om - entry.angle;

    const valid_transit = isFinite(dt_transit) && dt_transit > 0;
    return {
        entry, body_index: entry.body_index, local, mu_body, n_local, M1,
        dt_transit: valid_transit ? dt_transit : null,
        exit_angle, bound: false,
        exit_planet_time: valid_transit ? (p_o_t + entry.t + dt_transit) : null
    };
}

function get_soi_encounter() {

    if (current_center === 0) {
        const now = performance.now();
        const needs_recompute =
            soi_encounter_computed_time === null &&
            (cached_soi_encounter === null || now - soi_encounter_last_real_ms >= soi_encounter_min_recompute_ms);

        if (needs_recompute) {
            cached_soi_encounter = compute_soi_encounter();
            soi_encounter_computed_time = sim_time_total;
            soi_encounter_last_real_ms = now;
        }
    }
    return cached_soi_encounter;
}

export function find_first_soi_entry() {
    const enc = get_soi_encounter();
    return enc ? enc.entry : null;
}

export function find_first_soi_exit() {
    const enc = get_soi_encounter();
    if (!enc || enc.bound) return null;
    return { body_index: enc.body_index, angle: enc.exit_angle };
}

export function export_soi_transit_line(zoom = 1) {
    if (current_center !== 0) {
        const points = [];
        if (!isFinite(o_a) || o_a === 0) return points;

        if (o_e < 1) {
            const num_pts = 400;
            const center = get_center_state(current_center);
            const cos_om = Math.cos(o_om), sin_om = Math.sin(o_om);

            for (let i = 0; i <= num_pts; i++) {
                const E = (i / num_pts) * Math.PI * 2;
                const px = o_a * (Math.cos(E) - o_e);
                const py = o_a * Math.sqrt(Math.max(0, 1 - o_e * o_e)) * Math.sin(E);

                points.push({
                    x: center.x + px * cos_om - py * sin_om,
                    y: center.y + px * sin_om + py * cos_om,
                    blocked: false
                });
            }
            return points;
        }

        const cos_om = Math.cos(o_om), sin_om = Math.sin(o_om);
        const center = get_center_state(current_center);
        const num_pts = 200;

        const mu_hyp = G * center.mass;

    const n_hyp = Math.sqrt(mu_hyp / ((-o_a) ** 3));
        const M_now = orbit_M0 + o_dir * n_hyp * sim_time_total;
        const H_now = solve_kepler(M_now, o_e);

        const soi_r = get_soi_radius(current_center);

        const cosh_H = Math.max(1, (soi_r / Math.abs(o_a) + 1) / o_e);
        const H_max = Math.acosh(cosh_H);
        const H_exit = o_dir * H_max;

        for (let i = 0; i <= num_pts; i++) {
            const H = H_now + (i / num_pts) * (H_exit - H_now);
            const px = o_a * (Math.cosh(H) - o_e);
            const py = -o_a * Math.sqrt(o_e * o_e - 1) * Math.sinh(H);

            const rel_x = px * cos_om - py * sin_om;
            const rel_y = px * sin_om + py * cos_om;

            points.push({
                x: center.x + rel_x,
                y: center.y + rel_y,
                blocked: false
            });
        }
        return points;
    }

    const enc = get_soi_encounter();

    if (!enc || enc.bound || !enc.dt_transit) return [];

    const cos_om = Math.cos(enc.local.om);
    const sin_om = Math.sin(enc.local.om);
    const p_entry = soi_orbit_position(enc.local, enc.n_local, enc.M1, enc.local.dir, 0, cos_om, sin_om, enc.body_index, enc.entry.t);
    const p_exit = soi_orbit_position(enc.local, enc.n_local, enc.M1, enc.local.dir, enc.dt_transit, cos_om, sin_om, enc.body_index, enc.entry.t);

    const points = [];
    points.push({ x: p_entry.x, y: p_entry.y, blocked: false });

    subdivide_soi_segment(points, 0, p_entry, enc.dt_transit, p_exit, zoom, 0, {
        local: enc.local, n_local: enc.n_local, M1: enc.M1, dir: enc.local.dir, cos_om, sin_om, body_index: enc.body_index, entry_t: enc.entry.t
    });
    return points;
}

export function export_post_encounter_orbit() {


    let abs_x, abs_y, abs_vx, abs_vy;

    if (current_center !== 0) {
        const exit = compute_planet_soi_exit();
        if (!exit) return [];
        abs_x = exit.abs_x; abs_y = exit.abs_y;
        abs_vx = exit.abs_vx; abs_vy = exit.abs_vy;
    } else {
        const enc = get_soi_encounter();
        if (!enc || enc.bound || !enc.dt_transit) return [];

        const dt = enc.dt_transit;
        const { local, n_local, body_index } = enc;

        const M = enc.M1 + local.dir * n_local * dt;
        const H = solve_kepler(M, local.e);

        const x_orb = local.a * (Math.cosh(H) - local.e);
        const y_orb = -local.a * Math.sqrt(local.e * local.e - 1) * Math.sinh(H);
        const dH_dt = local.dir * n_local / (local.e * Math.cosh(H) - 1);
        const vx_orb = local.a * Math.sinh(H) * dH_dt;
        const vy_orb = -local.a * Math.sqrt(local.e * local.e - 1) * Math.cosh(H) * dH_dt;

        const cos_om = Math.cos(local.om), sin_om = Math.sin(local.om);
        const rel_x = x_orb * cos_om - y_orb * sin_om;
        const rel_y = x_orb * sin_om + y_orb * cos_om;
        const rel_vx = vx_orb * cos_om - vy_orb * sin_om;
        const rel_vy = vx_orb * sin_om + vy_orb * cos_om;

        const dt_future = enc.exit_planet_time - p_o_t;
        const p_s = body_position_at_time(body_index, dt_future);

        abs_x = p_s.x + rel_x;
        abs_y = p_s.y + rel_y;
        abs_vx = p_s.vx + rel_vx;

        abs_vy = p_s.vy + rel_vy;

    }

    const mu_sun = G * sun.mass;
    const elems = elements_from_state(abs_x - sun.x, abs_y - sun.y, abs_vx, abs_vy, mu_sun);

    const points = [];
    if (!isFinite(elems.a) || elems.a === 0) return points;


    const post_cos = Math.cos(elems.om), post_sin = Math.sin(elems.om);
    const rx0 = abs_x - sun.x;
    const ry0 = abs_y - sun.y;
    const th0 = Math.atan2(ry0, rx0) - elems.om;

    if (elems.e < 1) {
        const E0 = 2 * Math.atan2(Math.sqrt(Math.max(0, 1 - elems.e)) * Math.sin(th0 / 2), Math.sqrt(1 + elems.e) * Math.cos(th0 / 2));
        const num_pts = 400;
        const delta = elems.dir > 0 ? 2 * Math.PI : -2 * Math.PI;

        for (let i = 0; i <= num_pts; i++) {
            const E = E0 + (i / num_pts) * delta;
            const px = elems.a * (Math.cos(E) - elems.e);
            const py = elems.a * Math.sqrt(Math.max(0, 1 - elems.e * elems.e)) * Math.sin(E);
            points.push({
                x: sun.x + px * post_cos - py * post_sin,
                y: sun.y + px * post_sin + py * post_cos,
                blocked: false
            });
        }

    } else {

        const H0 = 2 * Math.atanh(clamp(Math.sqrt((elems.e - 1) / (elems.e + 1)) * Math.tan(th0 / 2), -0.999999, 0.999999));

        const num_pts = 200;
        const delta = elems.dir > 0 ? 3 : -3;

        for (let i = 0; i <= num_pts; i++) {
            const H = H0 + (i / num_pts) * delta;
            const px = elems.a * (Math.cosh(H) - elems.e);
            const py = -elems.a * Math.sqrt(elems.e * elems.e - 1) * Math.sinh(H);

            points.push({
                x: sun.x + px * post_cos - py * post_sin,
                y: sun.y + px * post_sin + py * post_cos,
                blocked: false

            });
        }
    }
    return points;
}

function compute_planet_soi_exit() {
    if (current_center === 0) return null;
    const soi_r = get_soi_radius(current_center);
    if (!isFinite(soi_r) || soi_r <= 0 || !isFinite(o_a) || o_a === 0) return null;

    const mu = G * bodies[current_center].mass;

    if (o_e < 1) {
        const apo = o_a * (1 + o_e);
        if (apo <= soi_r) return null;
    }

    const p = Math.abs(o_a * (1 - o_e * o_e));
    const cos_theta = clamp((p / soi_r - 1) / o_e, -1, 1);

    const theta_exit_abs = Math.acos(cos_theta);
    const theta_exit = o_dir > 0 ? theta_exit_abs : -theta_exit_abs;

    const n = Math.sqrt(mu / (Math.abs(o_a) ** 3));
    let dt_exit = 0;

    if (o_e < 1) {

        const E_exit = 2 * Math.atan2(Math.sqrt(1 - o_e) * Math.sin(theta_exit / 2), Math.sqrt(1 + o_e) * Math.cos(theta_exit / 2));

        const M_exit = E_exit - o_e * Math.sin(E_exit);
        const M_now = orbit_M0 + o_dir * n * sim_time_total;
        let delta_M = (M_exit - M_now) % (2 * Math.PI);
        if (delta_M < 0) delta_M += 2 * Math.PI;
        dt_exit = delta_M / n;
    } else {

        const H_exit = theta_to_hyperbolic_H(theta_exit_abs, o_e);
        const M_exit = o_dir * (o_e * Math.sinh(H_exit) - H_exit);
        const M_now = orbit_M0 + o_dir * n * sim_time_total;
        dt_exit = (M_exit - M_now) / (o_dir * n);
        if (dt_exit < 0) dt_exit = 0;
    }

    const s = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, sim_time_total + dt_exit);
    const p_s = body_position_at_time(current_center, dt_exit);
    return {
        dt_exit,
        abs_x: p_s.x + s.x,
        abs_y: p_s.y + s.y,
        abs_vx: p_s.vx + s.vx,
        abs_vy: p_s.vy + s.vy
    };
}

export function export_all_orbit_lines() {
    if (!other_planets_initialized) init_other_planet_orbits();
    const num = 360;
    const lines = [];

    for (let i = 0; i < bodies.length; i++) {
        if (i === 0) continue;

        if (i === home_planet_index) {
            lines.push({ body_index: i, points: export_planet_orbit_lines() });
            continue;
        }

        const el = other_planet_orbits[i];
        if (!el || el.e >= 1) continue;

        const n = Math.sqrt(el.mu / (el.a ** 3));
        const M_now = el.M0 + el.dir * n * p_o_t;
        const E_now = solve_kepler(M_now, el.e);

        const cos_om = Math.cos(el.om), sin_om = Math.sin(el.om);
        const points = [];
        for (let k = 0; k <= num; k++) {
            const E = E_now + (k / num) * 2 * Math.PI;
            const x_orb = el.a * (Math.cos(E) - el.e);
            const y_orb = el.a * Math.sqrt(Math.max(0, 1 - el.e * el.e)) * Math.sin(E);
            points.push({
                x: sun.x + x_orb * cos_om - y_orb * sin_om,
                y: sun.y + x_orb * sin_om + y_orb * cos_om
            });
        }
        lines.push({ body_index: i, points });
    }
    return lines;
}

export function export_orbit_map() {
    const points = [];
    if (!isFinite(o_a) || o_a <= 0) return points;
    if (o_e >= 1) return points;

    const center = get_center_state(current_center);
    const cos_om = Math.cos(o_om);
    const sin_om = Math.sin(o_om);

    const mu = G * bodies[current_center].mass;
    const n = Math.sqrt(mu / (o_a ** 3));
    const M_now = orbit_M0 + o_dir * n * sim_time_total;
    const E_now = solve_kepler(M_now, o_e); 

    for (let i = 0; i <= o_points; i++) {
        const E = E_now + o_dir * (i / o_points) * Math.PI * 2; 

        const x_orb = o_a * (Math.cos(E) - o_e);
        const y_orb = o_a * Math.sqrt(Math.max(0, 1 - o_e * o_e)) * Math.sin(E);

        let rel_x = x_orb * cos_om - y_orb * sin_om;
        let rel_y = x_orb * sin_om + y_orb * cos_om;

        if (current_center === home_planet_index) {
            const M_point = E - o_e * Math.sin(E);
            let delta_M = (M_point - M_now) % (2 * Math.PI);
            if (o_dir > 0 && delta_M < 0) delta_M += 2 * Math.PI;
            if (o_dir < 0 && delta_M > 0) delta_M -= 2 * Math.PI;
            const dt = delta_M / (o_dir * n);
            const rot_angle = -planet_rotaion_speed * dt;
            const cos_r = Math.cos(rot_angle);
            const sin_r = Math.sin(rot_angle);
            const rx = rel_x * cos_r - rel_y * sin_r;
            const ry = rel_x * sin_r + rel_y * cos_r;
            rel_x = rx;
            rel_y = ry;
        }

        points.push({ x: center.x + rel_x, y: center.y + rel_y, blocked: false });
    }
    return points;
}

export function export_full_encounter_preview() {

    return { helio_before: export_orbit_map(), flyby: [] };
}

export function export_orbit_extrema() {
    if (!isFinite(o_a) || o_a === 0 || !orbit_initialized) return null;

    const center = get_center_state(current_center);
    const body = bodies[current_center];
    const cos_om = Math.cos(o_om), sin_om = Math.sin(o_om);

    const result = {
        periapsis: {
            x: center.x + o_per * cos_om,
            y: center.y + o_per * sin_om,
            altitude: o_per - body.r
        }
    };

    if (o_e < 1 && isFinite(o_apo)) {
        result.apoapsis = {
            x: center.x - o_apo * cos_om,
            y: center.y - o_apo * sin_om,
            altitude: o_apo - body.r
        };
    }
    return result;
}

let maneuver_node = null;

function maneuver_orbit_valid() {

    return orbit_initialized && isFinite(o_a) && o_a > 0 && o_e < 1;
}

function maneuver_t_abs_from_E(E) {
    const mu = G * bodies[current_center].mass;
    const n = Math.sqrt(mu / (o_a ** 3));
    const M_point = E - o_e * Math.sin(E);
    const M_now = orbit_M0 + o_dir * n * sim_time_total;

    let delta_M = (M_point - M_now) % (Math.PI * 2);
    if (o_dir > 0 && delta_M < 0) delta_M += Math.PI * 2;
    if (o_dir < 0 && delta_M > 0) delta_M -= Math.PI * 2;

    const dt = delta_M / (o_dir * n);
    return sim_time_total + Math.max(0, dt);
}

function find_closest_E_on_orbit(rel_x, rel_y, cos_om, sin_om) {
    const rel_point = (E) => {
        const px = o_a * (Math.cos(E) - o_e);
        const py = o_a * Math.sqrt(Math.max(0, 1 - o_e * o_e)) * Math.sin(E);
        return { x: px * cos_om - py * sin_om, y: px * sin_om + py * cos_om };
    };

    const sample = 720;
    let best_E = 0, best_d = Infinity;
    for (let i = 0; i < sample; i++) {
        const E = (i / sample) * Math.PI * 2;
        const p = rel_point(E);
        const d = Math.hypot(p.x - rel_x, p.y - rel_y);
        if (d < best_d) { best_d = d; best_E = E; }
    }

    let step = (Math.PI * 2) / sample;
    for (let k = 0; k < 40; k++) {
        step *= 0.5;
        for (const cand of [best_E - step, best_E + step]) {
            const p = rel_point(cand);
            const d = Math.hypot(p.x - rel_x, p.y - rel_y);
            if (d < best_d) { best_d = d; best_E = cand; }
        }
    }
    return best_E;
}

export function create_maneuver_at_world(wx, wy) {
    if (!maneuver_orbit_valid()) return false;

    const center = get_center_state(current_center);
    const rel_x = wx - center.x;
    const rel_y = wy - center.y;
    const cos_om = Math.cos(o_om), sin_om = Math.sin(o_om);
    const best_E = find_closest_E_on_orbit(rel_x, rel_y, cos_om, sin_om);

    maneuver_node = {
        t_abs: maneuver_t_abs_from_E(best_E),
        dv_pro: 0,
        dv_rad: 0,
        center: current_center
    };
    maneuver_soi_entry_dirty = true;
    return true;
}

export function move_maneuver_node_to_world(wx, wy) {
    if (!maneuver_node || !maneuver_orbit_valid()) return;

    const center = get_center_state(current_center);
    const rel_x = wx - center.x;
    const rel_y = wy - center.y;
    const cos_om = Math.cos(o_om), sin_om = Math.sin(o_om);
    const best_E = find_closest_E_on_orbit(rel_x, rel_y, cos_om, sin_om);

    maneuver_node.t_abs = maneuver_t_abs_from_E(best_E);
    maneuver_soi_entry_dirty = true;
}

export function clear_maneuver_node() {
    maneuver_node = null;
}

export function adjust_maneuver_dv(d_pro, d_rad) {
    if (!maneuver_node) return;
    maneuver_node.dv_pro += d_pro || 0;
    maneuver_node.dv_rad += d_rad || 0;
    maneuver_soi_entry_dirty = true;
}

export function has_maneuver_node() {
    return maneuver_node !== null;
}

export function get_maneuver_node() {
    if (!maneuver_node) return null;

    if (maneuver_node.center !== current_center || !maneuver_orbit_valid()) {
        maneuver_node = null;
        return null;
    }
    if (sim_time_total > maneuver_node.t_abs) {
        maneuver_node = null;
        return null;
    }

    const mu = G * bodies[current_center].mass;
    const s = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, maneuver_node.t_abs);
    const center = get_center_state(current_center);

    const v = Math.hypot(s.vx, s.vy) || 1;
    const r = Math.hypot(s.x, s.y) || 1;

    return {
        x: center.x + s.x,
        y: center.y + s.y,
        pro_x: s.vx / v,
        pro_y: s.vy / v,
        rad_x: s.x / r,
        rad_y: s.y / r,
        speed: v,
        dv_pro: maneuver_node.dv_pro,
        dv_rad: maneuver_node.dv_rad,
        dv_total: Math.hypot(maneuver_node.dv_pro, maneuver_node.dv_rad),
        dt: maneuver_node.t_abs - sim_time_total
    };
}

function maneuver_post_burn_state() {
    if (!maneuver_node || !maneuver_orbit_valid()) return null;

    const mu = G * bodies[current_center].mass;
    const s = orbit_local_state(o_a, o_e, o_om, o_dir, orbit_M0, mu, maneuver_node.t_abs);

    const v = Math.hypot(s.vx, s.vy) || 1;
    const r = Math.hypot(s.x, s.y) || 1;

    const vx = s.vx + maneuver_node.dv_pro * (s.vx / v) + maneuver_node.dv_rad * (s.x / r);
    const vy = s.vy + maneuver_node.dv_pro * (s.vy / v) + maneuver_node.dv_rad * (s.y / r);

    return { x: s.x, y: s.y, vx, vy, mu };
}

function compute_maneuver_hyperbolic_exit(elems, st) {
    if (current_center === 0 || elems.e < 1) return null;
    const soi_r = get_soi_radius(current_center);
    if (!isFinite(soi_r) || soi_r <= 0) return null;

    const th0 = Math.atan2(st.y, st.x) - elems.om;
    const H0 = 2 * Math.atanh(clamp(Math.sqrt((elems.e - 1) / (elems.e + 1)) * Math.tan(th0 / 2), -0.999999, 0.999999));
    const M0 = elems.e * Math.sinh(H0) - H0;
    const n = Math.sqrt(st.mu / ((-elems.a) ** 3));

    const r_at = (dt) => {
        const M = M0 + elems.dir * n * dt;
        const H = solve_kepler(M, elems.e);
        const x = elems.a * (Math.cosh(H) - elems.e);
        const y = -elems.a * Math.sqrt(elems.e * elems.e - 1) * Math.sinh(H);
        return Math.hypot(x, y);
    };

    if (r_at(0) >= soi_r) return { H0, M0, n, dt_exit: 0 };

    let dt_hi = Math.max(30, soi_r / Math.max(1, Math.hypot(st.vx, st.vy)));
    let guard = 0;
    while (r_at(dt_hi) < soi_r && guard < 60) { dt_hi *= 1.7; guard++; }

    let t_lo = 0, t_hi = dt_hi;
    for (let i = 0; i < 60; i++) {
        const t_mid = (t_lo + t_hi) / 2;
        if (r_at(t_mid) < soi_r) t_lo = t_mid; else t_hi = t_mid;
    }
    return { H0, M0, n, dt_exit: (t_lo + t_hi) / 2 };
}

let cached_maneuver_orbit_rel = [];
let cached_maneuver_orbit_sig = null;

function sample_curve_adaptive(fn, t0, t1) {
    const base_segments = 96;
    const tol = 0.001;
    const max_depth = 12;
    const max_points = 3000;

    const pts = [fn(t0)];

    const refine = (ta, a, tb, b, depth) => {
        if (depth < max_depth && pts.length < max_points) {
            const tm = (ta + tb) / 2;
            const m = fn(tm);
            const cx = b.x - a.x, cy = b.y - a.y;
            const chord = Math.hypot(cx, cy);

            const dev = chord > 0 ? Math.abs((m.x - a.x) * cy - (m.y - a.y) * cx) / chord : 0;

            if (dev > tol * chord) {
                refine(ta, a, tm, m, depth + 1);
                refine(tm, m, tb, b, depth + 1);
                return;
            }
        }
        pts.push(b);
    };

    let prev_t = t0, prev = pts[0];

    for (let i = 1; i <= base_segments; i++) {
        const t = t0 + (t1 - t0) * (i / base_segments);
        const p = fn(t);
        refine(prev_t, prev, t, p, 0);
        prev_t = t;
        prev = p;
    }
    return pts;
}




function ellipse_sweep_for_time(e, dir, E0, target) {

    target = Math.min(target, 2 * Math.PI);
    let lo = 0, hi = 2 * Math.PI;
    for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        const t_mid = mid - dir * e * (Math.sin(E0 + dir * mid) - Math.sin(E0));

        if (t_mid < target) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

function compute_maneuver_planet_exit(elems, st) {
    if (current_center === 0) return null;

    if (elems.e >= 1) {
        const ex = compute_maneuver_hyperbolic_exit(elems, st);
        return ex ? { M0: ex.M0, dt_exit: ex.dt_exit } : null;
    }

    const soi_r = get_soi_radius(current_center);
    const apo = elems.a * (1 + elems.e);
    if (!isFinite(soi_r) || soi_r <= 0 || apo <= soi_r) return null;

    const th0 = Math.atan2(st.y, st.x) - elems.om;
    const E0 = 2 * Math.atan2(
        Math.sqrt(Math.max(0, 1 - elems.e)) * Math.sin(th0 / 2),
        Math.sqrt(1 + elems.e) * Math.cos(th0 / 2)
    );
    const M0 = E0 - elems.e * Math.sin(E0);

    const Ex = Math.acos(clamp((1 - soi_r / elems.a) / elems.e, -1, 1));
    const Mx = Ex - elems.e * Math.sin(Ex);
    const n = Math.sqrt(st.mu / (elems.a ** 3));

    let delta_M = (Mx - elems.dir * M0) % (Math.PI * 2);
    if (delta_M < 0) delta_M += Math.PI * 2;
    return { M0, dt_exit: delta_M / n };
}

export function export_maneuver_orbit() {
    const node = get_maneuver_node();
    if (!node) { cached_maneuver_orbit_sig = null; return []; }
    if (Math.abs(node.dv_pro) < 1e-9 && Math.abs(node.dv_rad) < 1e-9) {
        cached_maneuver_orbit_sig = null;
        return [];
    }

    const st = maneuver_post_burn_state();
    if (!st) return [];

    const elems = elements_from_state(st.x, st.y, st.vx, st.vy, st.mu);
    if (!isFinite(elems.a) || elems.a === 0) return [];

    let max_dt = 0;
    let encounter_key = 'none';
    const th0 = Math.atan2(st.y, st.x) - elems.om;

    if (elems.e < 1) {
        const period = 2 * Math.PI * Math.sqrt((elems.a ** 3) / st.mu);
        const encounter = get_maneuver_soi_entry(elems, st);
        const planet_exit = compute_maneuver_planet_exit(elems, st);
        max_dt = encounter ? encounter.dt_local
            : (planet_exit ? planet_exit.dt_exit
            : (isFinite(period) && period > 0 ? period : 0));
        encounter_key = encounter ? (encounter.body_index + ':' + encounter.dt_local.toFixed(3))
            : (planet_exit ? 'exit:' + planet_exit.dt_exit.toFixed(3) : 'none');
    }

    const sig = [
        maneuver_node.t_abs, maneuver_node.dv_pro, maneuver_node.dv_rad,
        current_center, o_a, o_e, o_om, o_dir, orbit_M0, encounter_key
    ].join('|');

    if (sig !== cached_maneuver_orbit_sig) {
        let rel_points = [];

        if (elems.e < 1) {
            const e = elems.e;
            const dir = elems.dir;
            const n = Math.sqrt(st.mu / (elems.a ** 3));
            const b_fac = Math.sqrt(Math.max(0, 1 - e * e));
            const cos_om = Math.cos(elems.om), sin_om = Math.sin(elems.om);
            const E0 = 2 * Math.atan2(Math.sqrt(Math.max(0, 1 - e)) * Math.sin(th0 / 2), Math.sqrt(1 + e) * Math.cos(th0 / 2));

            const s_end = ellipse_sweep_for_time(e, dir, E0, n * max_dt);

            rel_points = sample_curve_adaptive((s) => {
                const E = E0 + dir * s;
                const px = elems.a * (Math.cos(E) - e);
                const py = elems.a * b_fac * Math.sin(E);
                return { x: px * cos_om - py * sin_om, y: px * sin_om + py * cos_om };
            }, 0, s_end);
        } else {
            const cos_om = Math.cos(elems.om), sin_om = Math.sin(elems.om);
            const exit = compute_maneuver_hyperbolic_exit(elems, st);

            let H_start, H_end;
            if (!exit) {
                H_start = 2 * Math.atanh(clamp(Math.sqrt((elems.e - 1) / (elems.e + 1)) * Math.tan(th0 / 2), -0.999999, 0.999999));
                H_end = H_start + (elems.dir > 0 ? 3 : -3);
            } else {
                H_start = exit.H0;
                const M_exit = exit.M0 + elems.dir * exit.n * exit.dt_exit;
                H_end = solve_kepler(M_exit, elems.e);
            }

            rel_points = sample_curve_adaptive((H) => {
                const px = elems.a * (Math.cosh(H) - elems.e);
                const py = -elems.a * Math.sqrt(elems.e * elems.e - 1) * Math.sinh(H);
                return { x: px * cos_om - py * sin_om, y: px * sin_om + py * cos_om };
            }, H_start, H_end);
        }

        cached_maneuver_orbit_rel = rel_points;
        cached_maneuver_orbit_sig = sig;
    }

    const center = get_center_state(current_center);
    const rel = cached_maneuver_orbit_rel;
    const points = new Array(rel.length);
    for (let i = 0; i < rel.length; i++) {
        points[i] = { x: center.x + rel[i].x, y: center.y + rel[i].y, blocked: false };
    }
    return points;
}

function find_helio_soi_entry(elems, x, y, mu, t_offset) {
    if (!isFinite(elems.a) || elems.a <= 0 || elems.e >= 1) return null;

    const relevant_bodies = get_relevant_bodies_for_orbit(elems.a, elems.e);
    if (relevant_bodies.length === 0) return null;

    const period = 2 * Math.PI * Math.sqrt((elems.a ** 3) / mu);
    if (!isFinite(period) || period <= 0) return null;

    const th0 = Math.atan2(y, x) - elems.om;
    const sample = build_maneuver_elliptical_sampler(elems, mu, th0);
    const world_at = (dt_local) => {
        const rel = sample(dt_local);
        return { x: sun.x + rel.x, y: sun.y + rel.y };
    };

    let min_soi_r = Infinity;
    for (const b of relevant_bodies) min_soi_r = Math.min(min_soi_r, get_soi_radius(b));
    const per = elems.a * (1 - elems.e);
    const v_peri = Math.sqrt(mu * (2 / per - 1 / elems.a));
    const safe_dt = (2 * min_soi_r) / v_peri / 6;
    const dyn_points = Math.min(4000, Math.max(o_points, Math.ceil(period / safe_dt)));

    let prev_dt_local = 0;
    for (let i = 1; i <= dyn_points; i++) {
        const dt_local = (i / dyn_points) * period;
        const body = is_inside_any_soi(world_at(dt_local), t_offset + dt_local, relevant_bodies);

        if (body !== -1) {
            let t_lo = prev_dt_local, t_hi = dt_local;
            for (let k = 0; k < soi_bisect_iterations; k++) {
                const t_mid = (t_lo + t_hi) / 2;
                const inside_mid = is_inside_any_soi(world_at(t_mid), t_offset + t_mid, relevant_bodies) !== -1;
                if (inside_mid) t_hi = t_mid; else t_lo = t_mid;
            }
            const final_pos = world_at(t_hi);
            return { dt_local: t_hi, body_index: body, x: final_pos.x, y: final_pos.y };
        }
        prev_dt_local = dt_local;
    }
    return null;
}

function compute_transit_from_helio_entry(elems, M0, mu, entry, t_offset) {
    const s = orbit_local_state(elems.a, elems.e, elems.om, elems.dir, M0, mu, entry.dt_local);
    const body_state = body_position_at_time(entry.body_index, t_offset + entry.dt_local);

    const rel_x = entry.x - body_state.x;
    const rel_y = entry.y - body_state.y;
    const rel_vx = s.vx - (body_state.vx || 0);
    const rel_vy = s.vy - (body_state.vy || 0);

    const mu_body = G * bodies[entry.body_index].mass;
    const local = elements_from_state(rel_x, rel_y, rel_vx, rel_vy, mu_body);
    if (local.e < 1) return null; 

    const H1 = theta_to_hyperbolic_H(Math.atan2(rel_y, rel_x) - local.om, local.e);
    const M1 = local.e * Math.sinh(H1) - H1;
    const n_local = Math.sqrt(mu_body / ((-local.a) ** 3));
    const dt_transit = -2 * M1 / (local.dir * n_local);
    if (!isFinite(dt_transit) || dt_transit <= 0) return null;

    return { local, n_local, M1, dt_transit, body_index: entry.body_index };
}

export function export_maneuver_soi_transit_line(zoom = 1) {
    let enc = null;

    if (current_center === 0) {
        const node = get_maneuver_node();
        if (node && !(Math.abs(node.dv_pro) < 1e-9 && Math.abs(node.dv_rad) < 1e-9)) {
            const st = maneuver_post_burn_state();
            if (st) {
                const elems = elements_from_state(st.x, st.y, st.vx, st.vy, st.mu);
                if (isFinite(elems.a) && elems.a > 0 && elems.e < 1) {
                    const entry = get_maneuver_soi_entry(elems, st);
                    if (entry) {
                        const th0 = Math.atan2(st.y, st.x) - elems.om;
                        const E0 = 2 * Math.atan2(
                            Math.sqrt(Math.max(0, 1 - elems.e)) * Math.sin(th0 / 2),
                            Math.sqrt(1 + elems.e) * Math.cos(th0 / 2)
                        );
                        const M0 = E0 - elems.e * Math.sin(E0);
                        enc = compute_transit_from_helio_entry(elems, M0, st.mu, entry, maneuver_node.t_abs - sim_time_total);
                    }
                }
            }
        }
    } else {
        enc = (get_maneuver_exit_chain() || {}).encounter;
    }
    if (!enc) return [];

    const cos_om = Math.cos(enc.local.om);
    const sin_om = Math.sin(enc.local.om);
    const p_entry = soi_orbit_position(enc.local, enc.n_local, enc.M1, enc.local.dir, 0, cos_om, sin_om, enc.body_index, 0);
    const p_exit = soi_orbit_position(enc.local, enc.n_local, enc.M1, enc.local.dir, enc.dt_transit, cos_om, sin_om, enc.body_index, 0);

    const points = [{ x: p_entry.x, y: p_entry.y, blocked: false }];
    subdivide_soi_segment(points, 0, p_entry, enc.dt_transit, p_exit, zoom, 0, {
        local: enc.local, n_local: enc.n_local, M1: enc.M1, dir: enc.local.dir,
        cos_om, sin_om, body_index: enc.body_index, entry_t: 0
    });
    return points;
}

let cached_maneuver_exit_chain = null;
let cached_maneuver_exit_chain_sig = null;
let cached_maneuver_exit_chain_ms = -Infinity;

function build_maneuver_exit_chain() {
    const st = maneuver_post_burn_state();
    if (!st) return null;

    const elems = elements_from_state(st.x, st.y, st.vx, st.vy, st.mu);
    if (!isFinite(elems.a) || elems.a === 0) return null;

    const exit = compute_maneuver_planet_exit(elems, st);
    if (!exit) return null;

    const rel = orbit_local_state(elems.a, elems.e, elems.om, elems.dir, exit.M0, st.mu, exit.dt_exit);

    const dt_future = (maneuver_node.t_abs - sim_time_total) + exit.dt_exit;
    const p_s = body_position_at_time(current_center, dt_future);

    const abs_x = p_s.x + rel.x;
    const abs_y = p_s.y + rel.y;
    const abs_vx = p_s.vx + rel.vx;
    const abs_vy = p_s.vy + rel.vy;

    const mu_sun = G * sun.mass;
    const rx0 = abs_x - sun.x;
    const ry0 = abs_y - sun.y;
    const helio = elements_from_state(rx0, ry0, abs_vx, abs_vy, mu_sun);
    if (!isFinite(helio.a) || helio.a === 0) return null;

    const th0 = Math.atan2(ry0, rx0) - helio.om;
    const cos_h = Math.cos(helio.om), sin_h = Math.sin(helio.om);

    let pink_points = [];
    let encounter = null;

    if (helio.e < 1) {
        const E0 = 2 * Math.atan2(
            Math.sqrt(Math.max(0, 1 - helio.e)) * Math.sin(th0 / 2),
            Math.sqrt(1 + helio.e) * Math.cos(th0 / 2)
        );
        const M0h = E0 - helio.e * Math.sin(E0);
        const n_h = Math.sqrt(mu_sun / (helio.a ** 3));
        const b_fac = Math.sqrt(Math.max(0, 1 - helio.e * helio.e));

        const entry = find_helio_soi_entry(helio, rx0, ry0, mu_sun, dt_future);
        const s_end = entry ? ellipse_sweep_for_time(helio.e, helio.dir, E0, n_h * entry.dt_local) : 2 * Math.PI;

        pink_points = sample_curve_adaptive((s) => {
            const E = E0 + helio.dir * s;
            const px = helio.a * (Math.cos(E) - helio.e);
            const py = helio.a * b_fac * Math.sin(E);
            return { x: sun.x + px * cos_h - py * sin_h, y: sun.y + px * sin_h + py * cos_h, blocked: false };
        }, 0, s_end);

        if (entry) encounter = compute_transit_from_helio_entry(helio, M0h, mu_sun, entry, dt_future);
    } else {
        const H0 = 2 * Math.atanh(clamp(Math.sqrt((helio.e - 1) / (helio.e + 1)) * Math.tan(th0 / 2), -0.999999, 0.999999));
        pink_points = sample_curve_adaptive((H) => {
            const px = helio.a * (Math.cosh(H) - helio.e);
            const py = -helio.a * Math.sqrt(helio.e * helio.e - 1) * Math.sinh(H);
            return { x: sun.x + px * cos_h - py * sin_h, y: sun.y + px * sin_h + py * cos_h, blocked: false };
        }, H0, H0 + (helio.dir > 0 ? 3 : -3));
    }

    return { pink_points, encounter };
}

function get_maneuver_exit_chain() {
    if (current_center === 0) return null;

    const node = get_maneuver_node();
    if (!node || (Math.abs(node.dv_pro) < 1e-9 && Math.abs(node.dv_rad) < 1e-9)) {
        cached_maneuver_exit_chain_sig = null;
        cached_maneuver_exit_chain = null;
        return null;
    }

    const sig = [
        maneuver_node.t_abs, maneuver_node.dv_pro, maneuver_node.dv_rad,
        current_center, o_a, o_e, o_om, o_dir, orbit_M0
    ].join('|');
    if (sig === cached_maneuver_exit_chain_sig) return cached_maneuver_exit_chain;

    const now = performance.now();
    if (cached_maneuver_exit_chain_sig !== null && now - cached_maneuver_exit_chain_ms < 300) {
        return cached_maneuver_exit_chain;
    }

    cached_maneuver_exit_chain_ms = now;
    cached_maneuver_exit_chain_sig = sig;
    cached_maneuver_exit_chain = build_maneuver_exit_chain();
    return cached_maneuver_exit_chain;
}

export function export_maneuver_post_encounter_orbit() {
    const chain = get_maneuver_exit_chain();
    return chain ? chain.pink_points : [];
}

export function export_maneuver_extrema() {
    const node = get_maneuver_node();
    if (!node) return null;
    if (Math.abs(node.dv_pro) < 1e-9 && Math.abs(node.dv_rad) < 1e-9) return null;

    const st = maneuver_post_burn_state();
    if (!st) return null;

    const elems = elements_from_state(st.x, st.y, st.vx, st.vy, st.mu);
    if (!isFinite(elems.a) || elems.a === 0) return null;

    const center = get_center_state(current_center);
    const body = bodies[current_center];
    const cos_om = Math.cos(elems.om), sin_om = Math.sin(elems.om);
    const per = elems.a * (1 - elems.e);

    const result = {
        periapsis: {
            x: center.x + per * cos_om,
            y: center.y + per * sin_om,
            altitude: per - body.r
        }
    };

    if (elems.e < 1) {
        const apo = elems.a * (1 + elems.e);
        result.apoapsis = {
            x: center.x - apo * cos_om,
            y: center.y - apo * sin_om,
            altitude: apo - body.r
        };
    }
    return result;
}

function resolve_terrain_collision(body_index, hull, angle, pos_x, pos_y, vel_x, vel_y, omega, inertia) {
    const planet = bodies[body_index];
    const body_circ = 2 * Math.PI * planet.r;
    let collision_count = 0;
    let total_push_x = 0, total_push_y = 0;
    let total_torque = 0;
    let total_impulse_x = 0, total_impulse_y = 0;

    const cos_r = Math.cos(angle);
    const sin_r = Math.sin(angle);

    for (let i = 0; i < hull.length; i++) {
        const pt = hull[i];
        const rx = pt.x * cos_r - pt.y * sin_r;
        const ry = pt.x * sin_r + pt.y * cos_r;

        const dx = pos_x + rx;
        const dy = pos_y + ry;
        const dist = Math.hypot(dx, dy);

        const theta = Math.atan2(dy, dx);
        let a = theta + Math.PI / 2 - planet_rotaion;
        a = a % (Math.PI * 2);
        if (a < 0) a += Math.PI * 2;

        const m = (a / (Math.PI * 2)) * body_circ;
        const th = get_planet_height(body_index, m);
        const terrain_radius = planet.r + (terrain_base_height - th);

        if (dist < terrain_radius) {
            collision_count++;
            const penetration = terrain_radius - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            total_push_x += nx * penetration;
            total_push_y += ny * penetration;

            const p_vx = vel_x - omega * ry;
            const p_vy = vel_y + omega * rx;

            const ground_vx = -planet_rotaion_speed * dy;
            const ground_vy = planet_rotaion_speed * dx;

            const rel_vx = p_vx - ground_vx;
            const rel_vy = p_vy - ground_vy;

            const vel_along_normal = rel_vx * nx + rel_vy * ny;

            if (vel_along_normal < 0) {
                const restitution = 0.4;
                const j = -(1 + restitution) * vel_along_normal;
                const impulse_x = j * nx;
                const impulse_y = j * ny;

                total_impulse_x += impulse_x;
                total_impulse_y += impulse_y;
                total_torque += (rx * impulse_y - ry * impulse_x);
            }
        }
    }

    if (collision_count === 0) return null;

    return {
        dx: total_push_x / collision_count,
        dy: total_push_y / collision_count,
        dvx: total_impulse_x / collision_count,
        dvy: total_impulse_y / collision_count,
        domega: (total_torque / collision_count) / inertia
    };
}

export function handle_ground_collision(dt) {
    if (!game_State.active_rocket || current_center === 0) return;

    if (rocket_landed) {
        if (keys.KeyW) exit_landed_state();
        return;
    }

    const outline = build_Rocket_Outline(game_State.active_rocket, rocket_com_offset_X, rocket_com_offset_Y);
    const hull = build_stack_outline(outline);

    const result = resolve_terrain_collision(current_center, hull, rocket_angle, rocket_x, rocket_y, rocket_vx, rocket_vy, rocket_omega, rocket_inertia);
    if (!result) return;

    rocket_x += result.dx;
    rocket_y += result.dy;
    rocket_vx += result.dvx;
    rocket_vy += result.dvy;
    rocket_omega += result.domega;

    orbit_initialized = false;
    soi_encounter_computed_time = null;
    maneuver_soi_entry_dirty = true;

    const ground_vx = -planet_rotaion_speed * rocket_y;
    const ground_vy = planet_rotaion_speed * rocket_x;
    const rel_speed = Math.hypot(rocket_vx - ground_vx, rocket_vy - ground_vy);

    const LANDED_SPEED_THRESHOLD = 0.5;
    const LANDED_SPIN_THRESHOLD = 0.02;

    if (!keys.KeyW && rel_speed < LANDED_SPEED_THRESHOLD && Math.abs(rocket_omega) < LANDED_SPIN_THRESHOLD) {
        const radius = Math.hypot(rocket_x, rocket_y);
        const theta = Math.atan2(rocket_y, rocket_x);
        let surface_angle = theta + Math.PI / 2 - planet_rotaion;
        surface_angle = surface_angle % (Math.PI * 2);
        if (surface_angle < 0) surface_angle += Math.PI * 2;

        rocket_landed = true;
        landed_surface_angle = surface_angle;
        landed_radius = radius;
        rocket_omega = 0;
    }
}

function draw_Game_Terrain(ctx, canvas, body_index, rocket_m, rocket_altitude) {
    const anchor_X = canvas.width / 2;
    const anchor_Y = canvas.height / 2;

    const scale = zoom;
    if (scale <= 0) return;

    const half_diag_px = Math.hypot(canvas.width, canvas.height) / 2;
    const half_diag_m = half_diag_px / scale;
    const margin = 1.4;
    const s_min = -half_diag_m * margin;
    const s_max = half_diag_m * margin;
    const span_m = s_max - s_min;

    const sample_count = Math.max(200, Math.min(4000, Math.round((span_m * scale) / 1.5)));

    const to_screen = (s, oy) => {
        return {
            x: Math.round(anchor_X + s * scale),
            y: Math.round(anchor_Y + oy * scale)
        };
    };

    ctx.save();
    ctx.fillStyle = '#2d5a27';
    ctx.beginPath();

    let max_oy = -Infinity;

    let prev_p = null;
    for (let i = 0; i <= sample_count; i++) {
        const s = s_min + (i / sample_count) * span_m;
        const m = rocket_m + s;
        const th = get_planet_height(body_index, m);
        const oy = rocket_altitude - (terrain_base_height - th);
        if (oy > max_oy) max_oy = oy;
        const p = to_screen(s, oy);
        if (i === 0) {
            ctx.moveTo(p.x, p.y);
        } else {
            ctx.lineTo(p.x, prev_p.y);
            ctx.lineTo(p.x, p.y);
        }
        prev_p = p;
    }

    const depth = half_diag_m * 4 + Math.max(0, max_oy);
    const p_right_deep = to_screen(s_max, depth);
    const p_left_deep = to_screen(s_min, depth);
    ctx.lineTo(p_right_deep.x, p_right_deep.y);
    ctx.lineTo(p_left_deep.x, p_left_deep.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}