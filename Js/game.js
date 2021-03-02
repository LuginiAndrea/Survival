import {createTexture, loadModel} from './Libraries/utils.js'
export {CAMERA,RENDERER}
import { OrbitControls } from 'https://unpkg.com/three@0.118/examples/jsm/controls/OrbitControls.js';

//Constanti utili ---------------------------
const SCENE = new THREE.Scene();
const CAMERA = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 0.1 ,5000); //Fov-ratio-near-far
const RENDERER = new THREE.WebGLRenderer();
const RAYCASTER = new THREE.Raycaster();
const MOUSE = new THREE.Vector2();
const BASETEXTURE = createTexture("./Resources/Textures/baseTexture.png");
const CONTROLS = new OrbitControls(CAMERA, RENDERER.domElement);
const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
SCENE.add( light );
//------------------------------------------

loadModel('chicken', SCENE, CAMERA);



//Setup----------------------------((Da mettere alla fine)
RENDERER.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(RENDERER.domElement); //Inseriamo il canvas dove il renderer "Scrive"
function animations() {}; //Da definire
function renderLoop() { //Loop che reinderizza le immagini
    requestAnimationFrame(renderLoop);
    CONTROLS.update();
    RENDERER.render(SCENE,CAMERA);
    animations();
}
renderLoop();
window.addEventListener('resize', function () {
    CAMERA.aspect = window.innerWidth / window.innerHeight;
    CAMERA.updateProjectionMatrix();
    RENDERER.setSize( window.innerWidth, window.innerHeight );
});
//RENDERER.setClearColor("#dfe8e8");
SCENE.background = createTexture('../Resources/Textures/sky.jpg');
CAMERA.position.set( 0, 0, 100 );//--- Background si setta così ----> SCENE.background = <la roba>
//    O se vogliamo un colore -----> RENDERER.setClearColor("codice colore")
//-------------------------------------------
