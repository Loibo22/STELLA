import { game_State } from "./state.js";

export const speed_levels = [1,10,50,100,500,1000,10000,100000,1000000,10000000];

export const Img_Speed_Anzeige = new Image();

Img_Speed_Anzeige.src = 'assets/speed_anzeige.png';

export const Img_Speed_Pointer = new Image();

//Img_Speed_Pointer.src = 'assets/pfeil.png';

let Img_Speed_Pointer_White = null;

Img_Speed_Pointer.onload = () => {

    const off = document.createElement('canvas');
    off.width = Img_Speed_Pointer.naturalWidth;
    off.height = Img_Speed_Pointer.naturalHeight;
    const octx = off.getContext('2d');

    octx.drawImage(Img_Speed_Pointer, 0, 0);
    octx.globalCompositeOperation = 'source-atop';
    octx.fillStyle = '#ffffff';

    octx.fillRect(0, 0, off.width, off.height);
  //   Img_Speed_Pointer_White = off;

};

const menu_x = 10;
const menu_y = 30;
const DISPLAY_WIDTH = 228; 

const PAD_LEFT_RATIO = 4 / 76;
const CONTENT_WIDTH_RATIO = 70 / 76;

function get_panel_metrics() {

    const nat_w = Img_Speed_Anzeige.naturalWidth || 76;
    const nat_h = Img_Speed_Anzeige.naturalHeight || 18;
    const scale = DISPLAY_WIDTH / nat_w;
    const panel_w = nat_w * scale;
    const panel_h = nat_h * scale;
    const inner_x = menu_x + PAD_LEFT_RATIO * nat_w * scale;
    const content_w = CONTENT_WIDTH_RATIO * nat_w * scale;
    const seg_w = content_w / speed_levels.length;
    return { scale, panel_w, panel_h, inner_x, seg_w };

}

export function draw_Speed_Controll(ctx){

    const { panel_w, panel_h, inner_x, seg_w } = get_panel_metrics();

    if (Img_Speed_Anzeige.complete && Img_Speed_Anzeige.naturalWidth > 0) {
        ctx.drawImage(Img_Speed_Anzeige, menu_x, menu_y, panel_w, panel_h);
    }

   /* if (hovered_segment_index !== -1 && hovered_segment_index !== active_index) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(inner_x + hovered_segment_index * seg_w, menu_y, seg_w, panel_h);
    }
    const active_index = speed_levels.indexOf(game_State.time_scale);
   /* if (active_index !== -1 && Img_Speed_Pointer_White) {
        const pointer_ratio = Img_Speed_Pointer.naturalHeight / Img_Speed_Pointer.naturalWidth;
        const pointer_w = seg_w;
        const pointer_h = pointer_w * pointer_ratio;
        const px = inner_x + active_index * seg_w;
        const py = menu_y + (panel_h - pointer_h) / 2;
       // ctx.drawImage(Img_Speed_Pointer_White, px, py, pointer_w, pointer_h);
    }*/

    ctx.fillStyle = 'white';
    ctx.font = "14px 'Tiny5', monospace";
    ctx.fillText(game_State.time_scale + 'x', menu_x + panel_w + 10, menu_y + panel_h / 2 + 5);

}

export function handle_Click_Controll(mouseX, mouseY){

    const { panel_w, panel_h, inner_x, seg_w } = get_panel_metrics();

    if (mouseX < menu_x || mouseX > menu_x + panel_w || mouseY < menu_y || mouseY > menu_y + panel_h) {
        return false;
    }

    let index = Math.floor((mouseX - inner_x) / seg_w);
    index = Math.max(0, Math.min(speed_levels.length - 1, index));

    game_State.time_scale = speed_levels[index];
    return true;

}

let hovered_segment_index = -1;

export function handle_Mousemove_Controll(mouseX, mouseY){

    const { panel_w, panel_h, inner_x, seg_w } = get_panel_metrics();
    if (mouseX < menu_x || mouseX > menu_x + panel_w || mouseY < menu_y || mouseY > menu_y + panel_h) {
        hovered_segment_index = -1;
        return;
    }
    let index = Math.floor((mouseX - inner_x) / seg_w);
    hovered_segment_index = Math.max(0, Math.min(speed_levels.length - 1, index));

}