import { game_State } from "./state.js";

const build_2Img = new Image();
build_2Img.src = './assets/space_center_2.png';

const build_3Img = new Image();
build_3Img.src = './assets/space_center_1.png';

const build_1Img = new Image();
build_1Img.src = './assets/space_center.png';

const grond = 0.65;

const build_2 = { img: build_2Img, scale: 3 };
const build_3 = { img: build_3Img, scale: 3 };

const build_1 = { img: build_1Img, scale: 3 };



[build_2, build_3, build_1].forEach(item => {
    item.img.onload = () => {

        item.w = item.img.naturalWidth * item.scale;
        item.h = item.img.naturalHeight * item.scale;
    };

});


//kein vollbild
export function draw_space_center(ctx, canvas) {

    build_2.x = canvas.width / 3*1.2;
    build_2.y = 520;
    build_3.x = canvas.width / 3*0.5;
    build_3.y = 340;
    build_1.x = canvas.width / 3*2;
    build_1.y = 298;


    //später atmosphäre
    ctx.fillStyle = '#98cbf8';
    ctx.fillRect(0, 0, canvas.width, canvas.height * grond);
    ctx.fillStyle = 'green';
    ctx.fillRect(0, canvas.height * grond, canvas.width, canvas.height - canvas.height * grond);

    ctx.fillStyle = 'white';
    ctx.font = "30px 'Tiny5', monospace";
    
    ctx.fillText("Space_Center", 50, 60);

    ctx.imageSmoothingEnabled = false;

    [build_2, build_3, build_1].forEach(item => {
        if (item.w) ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
    });


}

export function handle_Click_Space_Center(mouseX, mouseY) {

    if (!build_1.w) return;
    if (mouseX >= build_1.x && mouseX <= build_1.x + build_1.w &&
        mouseY >= build_1.y && mouseY <= build_1.y + build_1.h) {
        game_State.current_Screen = 'BUILD_MENU';
    }

}

