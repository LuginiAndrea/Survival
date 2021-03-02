import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import {createTexture} from './Libraries/utils.js'
export {CAMERA,RENDERER}

//Constanti utili ---------------------------
const SCENE = new THREE.Scene();
const CAMERA = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 1 ,5000); //Fov-ratio-near-far
const RENDERER = new THREE.WebGLRenderer();
const RAYCASTER = new THREE.Raycaster();
const MOUSE = new THREE.Vector2();
const BASETEXTURE = createTexture("./Resources/Textures/baseTexture.png");
//------------------------------------------




//Setup----------------------------((Da mettere alla fine)
RENDERER.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(RENDERER.domElement); //Inseriamo il canvas dove il renderer "Scrive"
function animations() {}; //Da definire
function renderLoop() { //Loop che reinderizza le immagini
    requestAnimationFrame(renderLoop);
    RENDERER.render(SCENE,CAMERA);
    animations();
}
renderLoop();
//RENDERER.setClearColor("#dfe8e8");
SCENE.background = createTexture('../Resources/Textures/sky.jpg');
//--- Background si setta così ----> SCENE.background = <la roba>
//    O se vogliamo un colore -----> RENDERER.setClearColor("codice colore")
//-------------------------------------------
