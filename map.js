import { bodies } from "./part_data.js";
import { draw_Speed_Controll, handle_Click_Controll } from "./controlls.js";
import { game_State } from "./state.js";
import { 
    
    home_planet_index, 
    get_planet_height, terrain_base_height, 
    tick_universe, get_rocket_world_position,
    planet_rotaion, planet_visual_scale,
    export_planet_orbit_lines, export_all_orbit_lines, get_soi_radius,
        export_full_encounter_preview, find_first_soi_entry, find_first_soi_exit, export_soi_transit_line,
    export_post_encounter_orbit, get_current_center, export_orbit_extrema, rocket_angle,
    create_maneuver_at_world, get_maneuver_node, adjust_maneuver_dv, clear_maneuver_node,
    move_maneuver_node_to_world,
    export_maneuver_orbit, export_maneuver_extrema, export_maneuver_post_encounter_orbit,
    export_maneuver_soi_transit_line} from "./game.js";


export const Img_Node_Dot = new Image();
Img_Node_Dot.src = 'assets/kugel.png';

export const Img_Arrow_Blue = new Image();
Img_Arrow_Blue.src = 'assets/blau_dreieck.png';

export const Img_Arrow_Red = new Image(); 
Img_Arrow_Red.src = 'assets/rot_dreieck.png';

const arrow_rotation_offset = 0;              
const arrow_rotation_offset_blue_extra = Math.PI; 

const rocket_target = 'rocket';
const max_radius_px = 2000000; 

let cameraX = 0;
let cameraY = 0;
let zoom = 0.0001;
const zoom_max = 13000;
const zoom_min = 0.0000000001;
const zoom_factor = 1.2;

let last_map_frame_time = null;

let map_fps = 0;
let map_fps_frame_count = 0;
let map_fps_last_time = 0;

let is_Dragging = false;
let last_Mouse_X = 0;
let last_Mouse_Y = 0;
let listeners_attached = false; 

let selectet_index = null;
let focused_index = null;
let last_focuse_target = null;
let hover_index = null;
let initialized = false;

let last_canvas_width = 0;
let last_canvas_height = 0;

let mouse_down_X = 0;
let mouse_down_Y = 0;
let dig_drag = false;

let map_rotation = 0;
const map_rotation_rate = 3.0;
const low_altitude_threshold_m = 100000;

const switch_btn_w = 90;
const switch_btn_h = 32;

const terrain_zoom_min_px = 60;
const terrain_zoom_full_px = 220;

const map_keys = { ArrowUp: false, ArrowDown: false };
const map_zoom_key_rate = 1.8;

let map_mouseX = 0;
let map_mouseY = 0;
let shift_held = false;
let hover_orbit_lines = [];   
let hover_orbit_point = null; 
const orbit_hover_px = 12;    

const maneuver_arrow_dist = 46;  
const maneuver_arrow_size = 13;   
const maneuver_hit_r = 20;       
const maneuver_dv_fraction = 0.005; 
const maneuver_dv_min = 0.5;     
let hovered_arrow = null;         
const maneuver_node_hit_r = 14;   
let dragging_maneuver_node = false;

function init_input(canvas) {
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (game_State.current_view !== 'map') return;

        const arrows = get_maneuver_arrows();
        if (arrows) {
            for (const a of [arrows.prograde, arrows.retrograde]) {
                if (Math.hypot(map_mouseX - a.x, map_mouseY - a.y) <= maneuver_hit_r) {
                    const direction = event.deltaY < 0 ? 1 : -1;
                    adjust_maneuver_dv(a.sign * direction * arrows.dv_step, 0);
                    return;
                }
            }
        }

        const zoom_in = event.deltaY < 0;
        zoom = zoom_in ? zoom * zoom_factor : zoom / zoom_factor;
        zoom = Math.min(zoom_max, Math.max(zoom_min, zoom));
    }, { passive: false });

    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
            const arrows = get_maneuver_arrows();
            if (arrows && Math.hypot(map_mouseX - arrows.pos.x, map_mouseY - arrows.pos.y) <= maneuver_node_hit_r) {
                dragging_maneuver_node = true;
                return;
            }

            is_Dragging = true;
            last_Mouse_X = event.clientX;
            last_Mouse_Y = event.clientY;
            mouse_down_X = event.clientX;
            mouse_down_Y = event.clientY;
            dig_drag = false;
        }
    });

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        map_mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
        map_mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
        shift_held = event.shiftKey;

        if (dragging_maneuver_node) {
            const w = screen_to_world(map_mouseX, map_mouseY);
            move_maneuver_node_to_world(w.x, w.y);
            return;
        }

        if (!is_Dragging) {
            let hit = null;
            const mouseX = event.offsetX || event.clientX;
            const mouseY = event.offsetY || event.clientY;

            if (focused_index !== rocket_target) {
                const rocket = get_target(rocket_target);
                if (rocket.pos) {
                    const pos = world_to_screen(rocket.pos.x, rocket.pos.y);
                    const screenR = Math.max(rocket.radius + 12, 16);
                    if (Math.hypot(mouseX - pos.x, mouseY - pos.y) <= screenR) hit = rocket_target;
                }
            }

            if (hit === null) for (let i = 0; i < bodies.length; i++) {
                if (focused_index === i) continue;
                const pos = world_to_screen(bodies[i].x, bodies[i].y);
                const screenR = Math.max(bodies[i].r * planet_visual_scale * zoom + 12, 16);
                if (Math.hypot(mouseX - pos.x, mouseY - pos.y) <= screenR) {
                    hit = i;
                    break;
                }
            }

            hover_index = hit;
            return;
        }

        const delta_X = event.clientX - last_Mouse_X;
        const delta_Y = event.clientY - last_Mouse_Y;
        if (!dig_drag && Math.hypot(event.clientX - mouse_down_X, event.clientY - mouse_down_Y) > 5) {
            dig_drag = true;
            focused_index = null;
        }

        const cos_r = Math.cos(map_rotation), sin_r = Math.sin(map_rotation);
        cameraX += (delta_X * cos_r + delta_Y * sin_r) / zoom;
        cameraY += (-delta_X * sin_r + delta_Y * cos_r) / zoom;
        last_Mouse_X = event.clientX;
        last_Mouse_Y = event.clientY;
    });

    window.addEventListener('mouseup', () => {
        is_Dragging = false;
        dig_drag = false;
        dragging_maneuver_node = false;
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'n' || event.key === 'N') focused_index = last_focuse_target;
        if (event.key === 'ArrowUp') map_keys.ArrowUp = true;
        if (event.key === 'ArrowDown') map_keys.ArrowDown = true;
        if (event.key === 'Shift') shift_held = true;

        if (event.key === 'x' || event.key === 'X' || event.key === 'Delete') {
            clear_maneuver_node();
        }
    });
    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowUp') map_keys.ArrowUp = false;
        if (event.key === 'ArrowDown') map_keys.ArrowDown = false;
        if (event.key === 'Shift') shift_held = false;
    });
    window.addEventListener('blur', () => {
        map_keys.ArrowUp = false;
        map_keys.ArrowDown = false;
        shift_held = false;
    });
}

function update_zoom_keys(real_dt) {
    if (game_State.current_view !== 'map') return;
    if (map_keys.ArrowUp) zoom = Math.min(zoom_max, zoom * (1 + map_zoom_key_rate * real_dt));
    if (map_keys.ArrowDown) zoom = Math.max(zoom_min, zoom / (1 + map_zoom_key_rate * real_dt));
}

function world_to_screen(wx, wy) {
    const rx = wx + cameraX, ry = wy + cameraY;
    const sx = rx * zoom, sy = ry * zoom;
    const cos_r = Math.cos(map_rotation), sin_r = Math.sin(map_rotation);
    return {
        x: last_canvas_width / 2 + (sx * cos_r - sy * sin_r),
        y: last_canvas_height / 2 + (sx * sin_r + sy * cos_r)
    };
}

function screen_to_world(sx, sy) {
    const dx = sx - last_canvas_width / 2;
    const dy = sy - last_canvas_height / 2;
    const cos_r = Math.cos(map_rotation), sin_r = Math.sin(map_rotation);
    const ux = (dx * cos_r + dy * sin_r) / zoom;
    const uy = (-dx * sin_r + dy * cos_r) / zoom;
    return { x: ux - cameraX, y: uy - cameraY };
}

function world_dir_to_screen_dir(dx, dy) {
    const cos_r = Math.cos(map_rotation), sin_r = Math.sin(map_rotation);
    const x = dx * cos_r - dy * sin_r;
    const y = dx * sin_r + dy * cos_r;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
}

function get_target(index) {
    if (index === rocket_target) {
        return {
            pos: game_State.active_rocket ? get_rocket_world_position() : null,
            radius: Math.min(14, Math.max(6, 15 / (1 + zoom * 10)))
        };
    }
    const body = bodies[index];
    return {
        pos: body ? { x: body.x, y: body.y } : null,
        radius: body ? body.r * planet_visual_scale * zoom : 0
    };
}


function reset_camera_to_default_focus() {
    focused_index = game_State.active_rocket ? rocket_target : home_planet_index;
    last_focuse_target = focused_index;
    const p = get_target(focused_index).pos || bodies[home_planet_index];
    cameraX = -p.x;
    cameraY = -p.y;
    initialized = true;
}

function closest_point_on_segment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len_sq = dx * dx + dy * dy;
    let t = len_sq > 0 ? ((px - ax) * dx + (py - ay) * dy) / len_sq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + dx * t, cy = ay + dy * t;
    return { x: cx, y: cy, dist: Math.hypot(px - cx, py - cy) };
}

function find_orbit_hover_point(lines, px = map_mouseX, py = map_mouseY) {
    let best = null;
    for (const points of lines) {
        if (!points || points.length < 2) continue;
        let prev = world_to_screen(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const cur = world_to_screen(points[i].x, points[i].y);
            if (points[i].blocked || points[i - 1].blocked) { prev = cur; continue; }
            if (isFinite(prev.x) && isFinite(prev.y) && isFinite(cur.x) && isFinite(cur.y)) {
                const c = closest_point_on_segment(px, py, prev.x, prev.y, cur.x, cur.y);
                if (!best || c.dist < best.dist) best = c;
            }
            prev = cur;
        }
    }
    return (best && best.dist <= orbit_hover_px) ? best : null;
}

function draw_orbit_hover_point(ctx) {
    if (!hover_orbit_point) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (Img_Node_Dot.complete && Img_Node_Dot.naturalWidth > 0) {
        const nat_w = Img_Node_Dot.naturalWidth;
        const nat_h = Img_Node_Dot.naturalHeight;
        const size = 10;
        const w = size, h = size * (nat_h / nat_w);
        ctx.drawImage(Img_Node_Dot, hover_orbit_point.x - w / 2, hover_orbit_point.y - h / 2, w, h);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(hover_orbit_point.x, hover_orbit_point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}


function get_maneuver_arrows(update_hover = false) {
    const node = get_maneuver_node();
    if (!node) {
        if (update_hover) hovered_arrow = null;
        return null;
    }

    const pos = world_to_screen(node.x, node.y);
    if (!isFinite(pos.x) || !isFinite(pos.y)) {
        if (update_hover) hovered_arrow = null;
        return null;
    }

    const u = world_dir_to_screen_dir(node.pro_x, node.pro_y);
    const dv_step = Math.max(maneuver_dv_min, node.speed * maneuver_dv_fraction) * (shift_held ? 10 : 1);

    const arrows = {
        node,
        pos,
        ux: u.x,
        uy: u.y,
        dv_step,
        prograde:   { x: pos.x + u.x * maneuver_arrow_dist, y: pos.y + u.y * maneuver_arrow_dist, sign:  1, key: 'prograde' },
        retrograde: { x: pos.x - u.x * maneuver_arrow_dist, y: pos.y - u.y * maneuver_arrow_dist, sign: -1, key: 'retrograde' }
    };

    if (update_hover) {
        hovered_arrow = null;
        for (const a of [arrows.prograde, arrows.retrograde]) {
            if (Math.hypot(map_mouseX - a.x, map_mouseY - a.y) <= maneuver_hit_r) {
                hovered_arrow = a.key;
                break;
            }
        }
    }

    return arrows;
}

function draw_arrow_head(ctx, x, y, ux, uy, size, img, highlight, extra_rotation = 0) {
    const angle = Math.atan2(uy, ux) + arrow_rotation_offset + extra_rotation;

    const nat_w = img.naturalWidth || 5;
    const nat_h = img.naturalHeight || 9;
    const h = size * 2;              
    const w = h * (nat_w / nat_h);   

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
    }
    ctx.restore();

    if (highlight) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, h * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}


function format_hud_value(kind, value) {
    if (!isFinite(value)) return '';

    if (kind === 'dv') {
        return Math.abs(value) >= 1000
            ? (value / 1000).toFixed(2) + ' km/s'
            : value.toFixed(1) + ' m/s';
    }

    if (kind === 'time') {
        if (value < 0) return '';
        const s = Math.round(value);
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${sec}s`;
        return `${sec}s`;
    }

    return Math.round(value) + ' m';
}

function draw_maneuver_node(ctx) {
    const arrows = get_maneuver_arrows();
    if (!arrows) return;
    const { node, pos, ux, uy } = arrows;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(arrows.retrograde.x, arrows.retrograde.y);
    ctx.lineTo(arrows.prograde.x, arrows.prograde.y);
    ctx.stroke();

    if (Img_Node_Dot.complete && Img_Node_Dot.naturalWidth > 0) {
        ctx.drawImage(Img_Node_Dot, pos.x - 8, pos.y - 8, 16, 16);
    } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    draw_arrow_head(ctx, arrows.prograde.x, arrows.prograde.y, ux, uy,
        maneuver_arrow_size, Img_Arrow_Blue, hovered_arrow === 'prograde', arrow_rotation_offset_blue_extra);
    draw_arrow_head(ctx, arrows.retrograde.x, arrows.retrograde.y, -ux, -uy,
        maneuver_arrow_size, Img_Arrow_Red, hovered_arrow === 'retrograde', 0);

    ctx.fillStyle = '#ffffff';
    ctx.font = "18px 'Tiny5', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`dv ${format_hud_value('dv', node.dv_pro)}`, pos.x + 14, pos.y - 10);
    if (Math.abs(node.dv_rad) > 1e-9) {
        ctx.fillText(`rad ${format_hud_value('dv', node.dv_rad)}`, pos.x + 14, pos.y + 6);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`T-${format_hud_value('time', node.dt)}`, pos.x + 14, pos.y + 22);

    ctx.restore();
}


function clip_segment_to_rect(x0, y0, x1, y1, xmin, ymin, xmax, ymax) {
    let t0 = 0, t1 = 1;
    const dx = x1 - x0, dy = y1 - y0;
    const p = [-dx, dx, -dy, dy];
    const q = [x0 - xmin, xmax - x0, y0 - ymin, ymax - y0];
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return null;
        } else {
            const r = q[i] / p[i];
            if (p[i] < 0) {
                if (r > t1) return null;
                if (r > t0) t0 = r;
            } else {
                if (r < t0) return null;
                if (r < t1) t1 = r;
            }
        }
    }
    return { x0: x0 + t0 * dx, y0: y0 + t0 * dy, x1: x0 + t1 * dx, y1: y0 + t1 * dy, t0, t1 };
}

function draw_polyline(ctx, points, clipped = false) {
    if (!points || points.length < (clipped ? 2 : 1)) return;

    const margin = 50;
    const xmin = -margin, ymin = -margin;
    const xmax = last_canvas_width + margin, ymax = last_canvas_height + margin;

    ctx.beginPath();
    let prev = null;
    let last_t1 = 0;
    let have_pen = false;
    let path_started = false;

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.blocked) { prev = null; have_pen = false; path_started = false; continue; }

        const s = world_to_screen(p.x, p.y);

        if (!clipped) {
            if (!path_started) { ctx.moveTo(s.x, s.y); path_started = true; }
            else ctx.lineTo(s.x, s.y);
            continue;
        }

        if (!isFinite(s.x) || !isFinite(s.y)) { prev = null; have_pen = false; continue; }

        if (prev) {
            const c = clip_segment_to_rect(prev.x, prev.y, s.x, s.y, xmin, ymin, xmax, ymax);
            if (c) {
                const continues = have_pen && last_t1 === 1 && c.t0 === 0;
                if (!continues) ctx.moveTo(c.x0, c.y0);
                ctx.lineTo(c.x1, c.y1);
                last_t1 = c.t1;
                have_pen = true;
            } else {
                have_pen = false;
            }
        }
        prev = s;
    }
    ctx.stroke();
}


function draw_maneuver_preview(ctx) {
    const dashed_lines = [
        { points: export_maneuver_orbit(), color: '#ffd24a' },
        { points: export_maneuver_soi_transit_line(zoom), color: '#ffd24a' },
        { points: export_maneuver_post_encounter_orbit(), color: '#ff66cc' }
    ];

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    for (const line of dashed_lines) {
        if (!line.points || line.points.length < 2) continue;
        ctx.strokeStyle = line.color;
        draw_polyline(ctx, line.points, true);
    }
    ctx.setLineDash([]);
    ctx.restore();

    const extrema = export_maneuver_extrema();
    if (!extrema) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = '#ffd24a';
    ctx.fillStyle = '#ffd24a';
    ctx.lineWidth = 1.5;
    ctx.font = "18px 'Tiny5', monospace";
    ctx.textAlign = 'center';
    ctx.setLineDash([4, 3]);

    for (const m of [extrema.periapsis, extrema.apoapsis]) {
        if (!m) continue;
        const pos = world_to_screen(m.x, m.y);
        if (!isFinite(pos.x) || !isFinite(pos.y)) continue;
        if (Img_Node_Dot.complete && Img_Node_Dot.naturalWidth > 0) {
            ctx.drawImage(Img_Node_Dot, pos.x - 7, pos.y - 7, 14, 14);
        } else {
            ctx.strokeRect(pos.x - 7, pos.y - 7, 14, 14);
        }
        ctx.fillText(format_hud_value('altitude', m.altitude), pos.x, pos.y - 12);
    }

    ctx.setLineDash([]);
    ctx.restore();
}

export function handle_Click_Map(mouseX, mouseY) {
    if (handle_Click_Controll(mouseX, mouseY)) return;

    const arrows = get_maneuver_arrows();
    if (arrows) {
        for (const a of [arrows.prograde, arrows.retrograde]) {
            if (Math.hypot(mouseX - a.x, mouseY - a.y) <= maneuver_hit_r) {
                adjust_maneuver_dv(a.sign * arrows.dv_step, 0);
                return;
            }
        }
    }

    const click_point = find_orbit_hover_point(hover_orbit_lines, mouseX, mouseY);
    if (click_point) {
        const w = screen_to_world(click_point.x, click_point.y);
        if (create_maneuver_at_world(w.x, w.y)) return;
    }

    if (selectet_index !== null) {
        const target = get_target(selectet_index);
        if (target.pos) {
            const screenR = Math.max(target.radius, 2);
            const pos = world_to_screen(target.pos.x, target.pos.y);
            const btnX = pos.x - switch_btn_w / 2, btnY = pos.y - screenR - switch_btn_h - 10;
            if (mouseX >= btnX && mouseX <= btnX + switch_btn_w && mouseY >= btnY && mouseY <= btnY + switch_btn_h) {
                focused_index = selectet_index;
                last_focuse_target = focused_index;
                selectet_index = null;
                return;
            }
        }
    }
    selectet_index = hover_index;
}


function draw_giant_circle(ctx, canvas, wx, wy, radius_world, draw_fn) {
    const screen_r = radius_world * zoom;

    if (screen_r <= max_radius_px) {
        draw_fn(ctx, wx, wy, radius_world, false);
        return;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const screen_center = world_to_screen(wx, wy);
    const dx = canvas.width / 2 - screen_center.x;
    const dy = canvas.height / 2 - screen_center.y;
    let angle = Math.atan2(dy, dx);
    if (dx === 0 && dy === 0) angle = 0;

    const surf_x = screen_center.x + Math.cos(angle) * screen_r;
    const surf_y = screen_center.y + Math.sin(angle) * screen_r;
    const clamped_x = surf_x - Math.cos(angle) * max_radius_px;
    const clamped_y = surf_y - Math.sin(angle) * max_radius_px;

    draw_fn(ctx, clamped_x, clamped_y, max_radius_px, true);
    ctx.restore();
}

function draw_rocket_marker(ctx) {
    const rocket = get_target(rocket_target);
    if (!rocket.pos) return;
    const pos = world_to_screen(rocket.pos.x, rocket.pos.y);
    const marker_r = rocket.radius;
    const screen_angle = rocket_angle + map_rotation;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(pos.x, pos.y);
    ctx.rotate(screen_angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -marker_r);
    ctx.lineTo(-marker_r * 0.65, marker_r * 0.75);
    ctx.lineTo(marker_r * 0.65, marker_r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function draw_hover_sqare(ctx, canvas) {
    if (hover_index === null) return;
    if (focused_index === hover_index) return;

    const target = get_target(hover_index);
    if (!target.pos) return;

    const too_close_limit = Math.max(canvas.width, canvas.height) * 0.5;
    if (hover_index !== rocket_target && target.radius > too_close_limit) return;

    const box_half_size = Math.min(max_radius_px, Math.max(target.radius + 8, 20));

    const pos = world_to_screen(target.pos.x, target.pos.y);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - box_half_size, pos.y - box_half_size, box_half_size * 2, box_half_size * 2);
    ctx.restore();
}

function draw_bodies(ctx, canvas) {
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        const display_r = body.r * planet_visual_scale;
        const screenR = display_r * zoom;

        const has_terrain = i !== 0; 
        let terrain_alpha = 0;
        if (has_terrain) {
            terrain_alpha = Math.max(0, Math.min(1, (screenR - terrain_zoom_min_px) / (terrain_zoom_full_px - terrain_zoom_min_px)));
        }

        const base_fill_r = (has_terrain && terrain_alpha > 0) 
            ? Math.max(display_r - 3000, 2 / zoom) 
            : Math.max(display_r, 2 / zoom);

        draw_giant_circle(ctx, canvas, body.x, body.y, base_fill_r, (ctx, x, y, r) => {
            ctx.save();
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        if (terrain_alpha < 1) {
            draw_giant_circle(ctx, canvas, body.x, body.y, Math.max(display_r, 2 / zoom), (ctx, x, y, r, in_screen) => {
                ctx.save();
                ctx.globalAlpha = 1 - terrain_alpha;
                ctx.strokeStyle = '#36b83f';
                ctx.lineWidth = in_screen ? 2 : 2 / zoom;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });
        }

        if (has_terrain && terrain_alpha > 0) {
            draw_planet_terrain(ctx, body, terrain_alpha, display_r, canvas, i);
        }
    }
}

function draw_planet_terrain(ctx, body, alpha, display_r, canvas, body_index) {
    const circ = 2 * Math.PI * body.r;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#2d5a27';

    const screenR = display_r * zoom;
    const dx = -cameraX - body.x, dy = -cameraY - body.y;
    const cam_dist = Math.hypot(dx, dy);
    const half_diag = Math.hypot(canvas.width, canvas.height) / (2 * zoom);

    let angle_min = 0, angle_max = Math.PI * 2, is_full_circle = true;
    if (cam_dist > 0 && half_diag < display_r * 0.95 && cam_dist > half_diag) {
        const center_angle = Math.atan2(dy, dx);
        const visible_arc = Math.asin(Math.min(1, (half_diag * 1.3) / cam_dist));
        angle_min = center_angle - visible_arc; angle_max = center_angle + visible_arc; is_full_circle = false;
    }

    const angle_span = is_full_circle ? Math.PI * 2 : (angle_max - angle_min);
    const sample_count = is_full_circle ? Math.max(360, Math.min(3000, Math.round(screenR * 0.6))) : Math.max(200, Math.min(4000, Math.round((angle_span * screenR) / 1.5)));

    ctx.beginPath();
    for (let i = 0; i <= sample_count; i++) {
        const angle = angle_min + (i / sample_count) * angle_span;
        let norm_angle = (angle + Math.PI / 2 - planet_rotaion) % (Math.PI * 2);
        if (norm_angle < 0) norm_angle += Math.PI * 2;
        
        const norm_x = (norm_angle / (Math.PI * 2)) * circ;
        const raw_height = get_planet_height(body_index, norm_x);
        const radius_offset = (terrain_base_height - raw_height) * planet_visual_scale;
        
        const wx = body.x + Math.cos(angle) * (display_r + radius_offset);
        const wy = body.y + Math.sin(angle) * (display_r + radius_offset);

        const screen_pos = world_to_screen(wx, wy);
        if (i === 0) ctx.moveTo(screen_pos.x, screen_pos.y);
        else ctx.lineTo(screen_pos.x, screen_pos.y);
    }
    if (!is_full_circle) {
        let center_pos = world_to_screen(body.x, body.y);
        
        const screen_cx = canvas.width / 2;
        const screen_cy = canvas.height / 2;
        const max_coord_dist = 2000000;
        const dist_to_center = Math.hypot(center_pos.x - screen_cx, center_pos.y - screen_cy);
        
        if (dist_to_center > max_coord_dist) {
            center_pos.x = screen_cx + ((center_pos.x - screen_cx) / dist_to_center) * max_coord_dist;
            center_pos.y = screen_cy + ((center_pos.y - screen_cy) / dist_to_center) * max_coord_dist;
        }
        
        ctx.lineTo(center_pos.x, center_pos.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function draw_switch_button(ctx) {
    if (selectet_index === null) return;
    const target = get_target(selectet_index);
    if (!target.pos) return;

    const screenR = Math.max(target.radius, 2);
    const pos = world_to_screen(target.pos.x, target.pos.y);
    const btnY = pos.y - screenR - switch_btn_h - 10, btnX = pos.x - switch_btn_w / 2;

    ctx.fillStyle = '#d190eb';
    ctx.fillRect(btnX, btnY, switch_btn_w, switch_btn_h);
    ctx.fillStyle = 'white';
    ctx.font = "20px 'Tiny5', monospace";
    ctx.fillText('switch', btnX + 15, btnY + 21);
}

function wrap_angle(a) {
    a = a % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
}

function get_target_map_rotation() {
    const center_index = get_current_center();
    if (center_index === 0) return 0;

    const body = bodies[center_index];
    if (!body) return 0;

    const rocket_pos = get_target(rocket_target).pos;
    if (!rocket_pos) return 0;

    const dx = rocket_pos.x - body.x;
    const dy = rocket_pos.y - body.y;
    const altitude = Math.hypot(dx, dy) - body.r;

    if (altitude >= low_altitude_threshold_m) return 0;

    const theta = Math.atan2(body.y - rocket_pos.y, body.x - rocket_pos.x);
    return wrap_angle(Math.PI / 2 - theta);
}


function draw_orbits_and_soi(ctx, canvas) {
    
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
    for (let b = 1; b < bodies.length; b++) {
        const soi_r = get_soi_radius(b);
        draw_giant_circle(ctx, canvas, bodies[b].x, bodies[b].y, soi_r, (ctx, x, y, r, in_screen) => {
            ctx.lineWidth = in_screen ? 1 : 1 / zoom;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
    ctx.restore();

    const lines = export_all_orbit_lines();
    ctx.save();
    ctx.lineWidth = 1.5 / zoom;
    for (const line of lines) {
        const points = line.points;
        if (points.length < 2) continue;
        const closed_points = points.concat([points[0]]);
        draw_faded_polyline(ctx, closed_points, 255, 255, 255, 0.4, 0.8);
    }
    ctx.restore();
}

function draw_orbit_extrema_markers(ctx) {
    const extrema = export_orbit_extrema();
    if (!extrema) return;
    if (extrema.periapsis) draw_node_marker(ctx, extrema.periapsis.x, extrema.periapsis.y, 14, '#ffffff');
    if (extrema.apoapsis) draw_node_marker(ctx, extrema.apoapsis.x, extrema.apoapsis.y, 14, '#ffffff');
}

function draw_orbit_extrema_labels(ctx) {

    const extrema = export_orbit_extrema();
    if (!extrema) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.font = "18px 'Tiny5', monospace";
    ctx.textAlign = 'center';

    if (extrema.periapsis) {
        const pos = world_to_screen(extrema.periapsis.x, extrema.periapsis.y);
        ctx.fillText(format_hud_value('altitude', extrema.periapsis.altitude), pos.x, pos.y - 16);
    }
    if (extrema.apoapsis) {
        const pos = world_to_screen(extrema.apoapsis.x, extrema.apoapsis.y);
        ctx.fillText(format_hud_value('altitude', extrema.apoapsis.altitude), pos.x, pos.y - 16);
    }
    ctx.restore();
}


function draw_trajectory_lines(ctx) {

    const centered_on_sun = get_current_center() === 0;

    if (centered_on_sun) {
        const enc = export_full_encounter_preview();
        hover_orbit_lines.push(enc.helio_before); 

        ctx.save();
        ctx.lineWidth = 2 / zoom;
        draw_faded_polyline(ctx, enc.helio_before, 239, 18, 52, 1.0, 0.1, 2);
        ctx.restore();
    }

    const soi_points = export_soi_transit_line(zoom);
    if (soi_points.length >= 2) {
        hover_orbit_lines.push(soi_points);

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2;
        draw_polyline(ctx, soi_points);
        ctx.restore();
    }

    if (!centered_on_sun) {
        const points = export_post_encounter_orbit();
        if (points && points.length >= 2) {
            ctx.save();
            ctx.lineWidth = 2 / zoom;
            draw_faded_polyline(ctx, points, 255, 102, 204, 1.0, 0.1, 2);
            ctx.restore();
        }
    }
}


function draw_encounter_markers(ctx) {
    const centered_on_sun = get_current_center() === 0;

    const entry = find_first_soi_entry();
    if (entry) {
        if (centered_on_sun) {
            draw_node_marker(ctx, entry.x, entry.y, 14, '#ff2a2a');
        }
        const body = bodies[entry.body_index];
        const soi_r = get_soi_radius(entry.body_index);
        draw_node_marker(
            ctx,
            body.x + soi_r * Math.cos(entry.angle),
            body.y + soi_r * Math.sin(entry.angle),
            14, '#2aff2a'
        );
    }

    const exit = find_first_soi_exit();
    if (exit) {
        const body = bodies[exit.body_index];
        const soi_r = get_soi_radius(exit.body_index);
        draw_node_marker(
            ctx,
            body.x + soi_r * Math.cos(exit.angle),
            body.y + soi_r * Math.sin(exit.angle),
            14, '#2a7bff'
        );
    }

    if (!centered_on_sun) {
        const points = export_post_encounter_orbit();
        if (points && points.length > 0) {
            draw_node_marker(ctx, points[0].x, points[0].y, 14, '#ff66cc');
        }
    }
}

function draw_node_marker(ctx, wx, wy, size = 14, tint = null) {
    const pos = world_to_screen(wx, wy);
    if (!isFinite(pos.x) || !isFinite(pos.y)) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (Img_Node_Dot.complete && Img_Node_Dot.naturalWidth > 0) {
        const x = pos.x - size / 2, y = pos.y - size / 2;
        ctx.drawImage(Img_Node_Dot, x, y, size, size);
        if (tint) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = tint;
            ctx.fillRect(x, y, size, size);
            ctx.globalCompositeOperation = 'source-over';
        }
    } else {
        ctx.strokeStyle = tint || '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size);
    }
    ctx.restore();
}

function draw_map_altitude_hud(ctx) {
    const rocket_pos = get_target(rocket_target).pos;
    const center_index = get_current_center();
    const body = bodies[center_index];

    if (rocket_pos && body) {
        const dx = rocket_pos.x - body.x;
        const dy = rocket_pos.y - body.y;
        const altitude = Math.hypot(dx, dy) - body.r;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#28d32b'; // Gleiches Grün wie in game_3.js
        ctx.font = "30px 'Tiny5', monospace";
        ctx.textAlign = 'left';
        ctx.fillText(`Altitude: ${Math.round(altitude)} m`, 10, 90);
        ctx.restore();
    }
}

export function draw_map(ctx, canvas) {

    if (!listeners_attached) { init_input(canvas); listeners_attached = true; }

    if (!initialized) {
        reset_camera_to_default_focus();
    }

    last_canvas_width = canvas.width;
    last_canvas_height = canvas.height;


    const now = performance.now();
    if (last_map_frame_time === null) last_map_frame_time = now;
    const real_dt = Math.min((now - last_map_frame_time) / 1000, 0.05);
    last_map_frame_time = now;

    map_fps_frame_count++;
    if (now - map_fps_last_time >= 1000) {
        map_fps = map_fps_frame_count;
        map_fps_frame_count = 0;
        map_fps_last_time = now;
    }

    tick_universe(real_dt, game_State.time_scale || 1);
    update_zoom_keys(real_dt);

     if (focused_index !== null) {
        const p = get_target(focused_index).pos;
        if (p) { cameraX = -p.x; cameraY = -p.y; }
    }

    const target_rotation = get_target_map_rotation();
    const rotation_diff = wrap_angle(target_rotation - map_rotation);
    const rotation_smoothing = 1 - Math.exp(-map_rotation_rate * real_dt);
    map_rotation += rotation_diff * rotation_smoothing;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = "20px 'Tiny5', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('FPS: ' + map_fps, 10, 20);

    hover_orbit_lines = []; // pro Frame neu sammeln

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(map_rotation);
    ctx.scale(zoom, zoom);
    ctx.translate(cameraX, cameraY);

    draw_bodies(ctx, canvas);
    draw_orbits_and_soi(ctx, canvas);

    draw_trajectory_lines(ctx);
    draw_map_altitude_hud(ctx);

    draw_encounter_markers(ctx);

    draw_orbit_extrema_markers(ctx);
    draw_hover_sqare(ctx, canvas); 

    ctx.restore();


    draw_maneuver_preview(ctx);

    get_maneuver_arrows(true); 

    hover_orbit_point = (dig_drag || hovered_arrow) ? null : find_orbit_hover_point(hover_orbit_lines);
    draw_orbit_hover_point(ctx);
    draw_maneuver_node(ctx);

    draw_rocket_marker(ctx);
    draw_switch_button(ctx);
    draw_orbit_extrema_labels(ctx);
    draw_Speed_Controll(ctx);
}

export function open_map_view() {
    game_State.current_view = 'map';
    game_State.current_Screen = 'MAP';
    reset_camera_to_default_focus();
}

function draw_faded_polyline(ctx, points, r, g, b, start_alpha = 1.0, end_alpha = 0.1, line_width_px = 1.5) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.lineCap = 'butt';  
    ctx.lineJoin = 'round';
    ctx.lineWidth = line_width_px;

    const total = points.length - 1;

    for (let i = 0; i < total; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        if (p1.blocked === true || p2.blocked === true) continue;

        const progress = i / total;
        let alpha = start_alpha + progress * (end_alpha - start_alpha);

        const s1 = world_to_screen(p1.x, p1.y);
        const s2 = world_to_screen(p2.x, p2.y);

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
    }
    ctx.restore();
}