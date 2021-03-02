import * as THREE from 'https://unpkg.com/three/build/three.module.js';
export {createTexture}

function createTexture (imgPath) { 
    return new THREE.TextureLoader().load(imgPath);
}