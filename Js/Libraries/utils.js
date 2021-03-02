export {createTexture, loadModel}

function createTexture (imgPath) { 
    return new THREE.TextureLoader().load(imgPath);
}

function loadModel(ModelName, SCENE,CAMERA) {
    const loader = new THREE.GLTFLoader();
    var loadedModel = null;
    ModelName = "../../Resources/Models/asset_pack/modello.gltf";
    loader.load(ModelName, function (gltf) { 
        loadedModel = gltf.scene.children[0];
        loadedModel.position.set(10,-200,-10);
        //loadedModel.scale(1,0.1,0.1);
        console.log(loadedModel.position)
        console.log(typeof(loadedModel));
        SCENE.add(loadedModel); 
    });

    return loadedModel;
}

