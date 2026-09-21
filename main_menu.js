import { game_State } from "./state.js";



const button = {x: 200, y: 200, width: 200, height: 60, label: 'Space_Center'};


export function draw_main_menu(ctx, canvas){

    ctx.clearRect(0, 0, canvas.width, canvas.height); 

    ctx.fillStyle = 'white'; 
    ctx.font = "30px 'Tiny5', monospace";
    ctx.fillText("MAIN MENU", 50, 100);

    ctx.fillStyle = '#1049a0';
    ctx.fillRect(button.x, button.y, button.width, button.height);

    ctx.fillStyle = 'white';
    ctx.font = "20px 'Tiny5', monospace";
    ctx.fillText(button.label, button.x + 30, button.y + 39);

}


export function handle_Click_Main_Menu(mouseX, mouseY){

    if (mouseX >= button.x && mouseX <= button.x + button.width && mouseY >= button.y && mouseY <= button.y + button.height) {
        game_State.current_Screen = 'SPACE_CENTER';
    }
}