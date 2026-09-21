


const stars = [
    { src: 'assets/star_1.png', chance: 8 },
    { src: 'assets/star_2.png', chance: 12 },
    { src: 'assets/star_3.png', chance: 40 },
    { src: 'assets/star_4.png', chance: 30 },
    { src: 'assets/star_5.png', chance: 20 },
];

const sizeCache = {};

function preload_Sizes(list, callback) {

    let loaded = 0;

    list.forEach(star => {
        const img = new Image();
        img.onload = () => {
            sizeCache[star.src] = img.naturalWidth;
            if (++loaded === list.length) callback();
        };

        img.onerror = () => {
            console.error('Could not load image:', star.src);
            sizeCache[star.src] = 8;
            if (++loaded === list.length) callback();
        };

        img.src = star.src;

    });
}

function pick_Random_Star() {

    const total = stars.reduce((sum, s) => sum + s.chance, 0);
    let r = Math.random() * total;
    for (const star of stars) {
        if (r < star.chance) return star;
        r -= star.chance;
    }
    return stars[stars.length - 1];

}

function flicker_Random_Star() {

    const allStars = document.querySelectorAll('.star');

    if (allStars.length > 0) {
        const star = allStars[Math.floor(Math.random() * allStars.length)];
        star.classList.remove('flackert');
        void star.offsetWidth;
        star.classList.add('flackert');
    }
    setTimeout(flicker_Random_Star, 25 + Math.random() * 1800);
}


function create_Stars(count) {

    const sky = document.querySelector('.sky');

    for (let i = 0; i < count; i++) {

        const star = pick_Random_Star();
        const el = document.createElement('img');
        el.src = star.src;

        el.className = 'star';

        const baseSize = sizeCache[star.src];
        const scale = 1 + Math.random() * 1.5;
        el.style.width = (baseSize * scale) + 'px';
        el.style.top = Math.random() * 95 + '%';
        el.style.left = Math.random() * 95 + '%';

        sky.appendChild(el);

    }
}


//erde+moon drehen, easter eggs 


//test wirklich anpassen
const tabContent = [
    { title: 'STELLA', text: 'PLay_Now', items: ['Rockets', 'Planets', 'and more :)'], image: 'assets/Capsule.png' },
    { title: 'test', text: 'test', items: ['test', 'test', 'test'], image: 'assets/Empty_Structure_S2_M.png' },
    { title: 'test', text: 'test', items: ['test', 'test', 'test'], image: 'assets/Engine_S2.png' },
];

function showTab(index) {

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${index}"]`).classList.add('active');


    if (index === 3) {
        document.getElementById('panel').style.display = 'none';
        document.getElementById('start-overlay').classList.add('active');
        return;


    }

    document.getElementById('start-overlay').classList.remove('active');

    document.getElementById('panel').style.display = 'block';


    const content = tabContent[index];
    document.getElementById('tab-title').textContent = content.title;

    document.getElementById('tab-desc').textContent = content.text;


    const list = document.getElementById('tab-list');

    list.innerHTML = '';

    content.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);

    });

    document.getElementById('tab-image').src = content.image;
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(parseInt(btn.dataset.tab)));

});

document.getElementById('start-game-btn').addEventListener('click', () => {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('screen').style.display = 'block';

});

showTab(0);

preload_Sizes(stars, () => {

    create_Stars(75);

    flicker_Random_Star();
});