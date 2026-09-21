import { game_State } from "./state.js";
import { draw_main_menu, handle_Click_Main_Menu } from "./main_menu.js";
import { draw_space_center, handle_Click_Space_Center } from "./space_center.js";
import { draw_game, handle_Click_Game } from "./game.js";
import { draw_map, handle_Click_Map } from "./map.js";


const screen = document.getElementById('screen');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
screen.appendChild(canvas);


let mouseX = 0;
let mouseY = 0;
let build_menu_loaded = false; 

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  canvas.addEventListener('mousemove', (e)=>{mouseX = e.clientX; mouseY = e.clientY});

  canvas.addEventListener('click', () =>{

    if(game_State.current_Screen === 'MAIN_MENU'){
        handle_Click_Main_Menu(mouseX, mouseY);
    }else if(game_State.current_Screen === 'SPACE_CENTER'){
        handle_Click_Space_Center(mouseX, mouseY);
    }else if(game_State.current_Screen === 'GAME'){
        handle_Click_Game(mouseX, mouseY);
    }else if (game_State.current_Screen === 'MAP'){
        handle_Click_Map(mouseX, mouseY);
    }

  });

  function start_Build_Menu(){

    if(!build_menu_loaded){
        build_menu_loaded = true;
        canvas.remove();
        window.removeEventListener('resize', resizeCanvas);
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'build_menu.js';
    document.body.appendChild(script);
    }
  }


function loop(){

    if(game_State.current_Screen === 'BUILD_MENU'){

        if(!build_menu_loaded){
        build_menu_loaded = true;
        canvas.remove();

        window.removeEventListener('resize', resizeCanvas);
        const script = document.createElement('script');
      script.type = 'module'; 
       script.src = 'build_menu.js';
        document.body.appendChild(script);
        
    }

    requestAnimationFrame(loop)
    return; 
    }else if(build_menu_loaded){
    build_menu_loaded = false;


    screen.appendChild(canvas);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

}

if(game_State.current_Screen === 'MAIN_MENU'){
    draw_main_menu(ctx, canvas);
        } else if (game_State.current_Screen === 'SPACE_CENTER'){
    draw_space_center(ctx, canvas);
        }else if(game_State.current_Screen === 'GAME'){
    draw_game(ctx, canvas);
        }else if(game_State.current_Screen === 'MAP')
    draw_map(ctx, canvas);


requestAnimationFrame(loop);

}

requestAnimationFrame(loop);