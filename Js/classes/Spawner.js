export {spawners, weaponOffsets, DROP_OFFSET}
import {Quest} from "./Quest.js";
import {PhysEntity, ArmedEntity, PlayerEntity, Item} from "./Entity.js";
import {createInventoryItem,PlayerInventory, Inventory} from "./Inventory.js";
const {ExtendedObject3D} = ENABLE3D;
/* --------------- Quest Spawners ---------------- */
const questSpawners = Object.freeze({
    moveQuest: addMoveQuest,
    invQuest: addInvQuest,
    destroyQuest: addDestroyQuest,
    completeAll: addCompleteAlQuest
});
function addMoveQuest(scene) {
    let parameters = Object.freeze({
                                player: scene.player,
                                sound: scene.sounds["lessGo"],
                                nome: "Primi passi"
                            });
    const start = (args) => {}
    const check = (args) => { 
        return (args.player.states.current.state != "Idle" && args.player.states.current.state != "Attacking");
    }
    const end = (args) => {
        args.sound.play();
        $("#Pog").show();
        $("#Pog").html("<br><br>" + args.nome + "<br><br> COMPLETATO");
        setTimeout(()=>{$("#Pog").hide();},3100);
    }
    return new Quest("moveQuest",start,check,end,parameters);
}
function addInvQuest(scene) {
    let parameters = Object.freeze({
                                keyR: scene.keys.r,
                                sound: scene.sounds["lessGo"],
                                nome: "Sbircia l'inventario"
                            });
    const start = (args) => {}
    const check = (args) => { 
        return (args.keyR.status);
    }
    const end = (args) => {
        args.sound.play();
        $("#Pog").show();
        $("#Pog").html("<br><br>" + args.nome + "<br><br> COMPLETATO");
        setTimeout(()=>{$("#Pog").hide();},3100);
    }
    return new Quest("InvQuest",start,check,end,parameters);
}
function addDestroyQuest(scene) {
    let parameters = Object.freeze({
                                entities: scene.entityManager.entities.list,
                                sound: scene.sounds["lessGo"],
                                nome: "Piccolo vandalo"
                            });
    const start = (args) => {}
    const check = (args) => { 
        const keys = Object.keys(args.entities);
        for(let names of keys) {
            if (args.entities[names].destroyedBy == args.entities["player"]) return true;
        }
        return false;
    }
    const end = (args) => { //Inserire css
        args.sound.play();
        $("#Pog").show();
        $("#Pog").html("<br><br>" + args.nome + "<br><br> COMPLETATO");
        setTimeout(()=>{$("#Pog").hide();},3100);
    }
    return new Quest("DestroyQuest",start,check,end,parameters);
}
function addCompleteAlQuest(scene, player) {
    let parameters = { 
        sound: scene.sounds["lessGo"],
        quest: null 
    };
    const start = (args) => {
        if(Object.keys(args.quest.manager.quests.list).length == 1) {
            args.quest.status = 0; //Started
        }
        else 
            args.quest.status = -1; //Not started
    }
    const check = (args) => {
        return (Object.keys(args.quest.manager.quests.list).length == 1);
    }
    const end = (args) => {
        $("#Pog").css("background-image","url(../Resources/Textures/pog.png");
        $("#Pog").show();
        args.sound.play();
        setTimeout(()=>{$("#Pog").hide();},3100);
    };

    let q = new Quest("CompleteAll",start,check,end,parameters);
    q.__args.quest = q;
    return q;
}
/* ------------- Entity spawners -------------------*/
const GROUND_NAME = "body_id_21";
var names = { //hash map con i nomi degli oggetti
    Tree: 0,
    Inventory: 0,
    Sword:0,
    Animal:0
};
const DROP_OFFSET = Object.freeze({
    z: 4,
    y:1
  });
/*Globali fisica*/
const bodyTypes = Object.freeze({
    DYNAMIC : 0,
    GHOST : 4
});
const entitySpawners = Object.freeze({
    Player: addPlayer,
    Tree1: addTree1,
    Tree2: addTree2,
    Tree3: addTree3,
    Tree4: addTree4,
    Tree5: addTree5,
    Tree6: addTree6,
    Inventory: addInventory,
    Sword: addSword,
    Table: addTable,
    Animal1: addAnimal1,
    Animal2: addAnimal2,
    Animal3: addAnimal3,
    Animal4: addAnimal4,
    Animal5: addAnimal5,
});
/*----- UTIL FUNCTIONS ------- */
function LoadModel({scene, modelName, animationNames = null, loop = false, radX = 0, radY = 0, radZ = 0, x = 0, y = 0, z = 0} = {}) {
  let model = new ExtendedObject3D();
  scene.load.gltf(modelName).then( gltf => {
    const child = gltf.scene.children[0];
    child.rotation.x = radX; //Rotazione
    child.rotation.y = radY;
    child.rotation.z = radZ;
    model.add(child);
    if(animationNames != null) { //Animazioni
      scene.animationMixers.add(model.animation.mixer);
      const minLenght = Math.min(animationNames.length,gltf.animations.length);
      for(let i = 0; i < minLenght; i++) {
        model.animation.add(animationNames[i],gltf.animations[i],loop);
      }
    }
  });
  return model;
}
function LoadModelWithShadows({scene, modelName, animationNames = null, loop = false, radX = 0, radY = 0, radZ = 0, x = 0, y = 0, z = 0} = {}) {
    let model = new ExtendedObject3D();
    scene.load.gltf(modelName).then( gltf => {
      const child = gltf.scene.children[0];
      child.rotation.x = radX; //Rotazione
      child.rotation.y = radY;
      child.rotation.z = radZ;
  
      gltf.scene.traverse(function(node) {
        if(node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      child.castShadow = true;
      child.receiveShadow = true;
  
      model.add(child);
      if(animationNames != null) { //Animazioni
        scene.animationMixers.add(model.animation.mixer);
        for(let i = 0; i < gltf.animations.length && i < animationNames.length; i++) {
          model.animation.add(animationNames[i],gltf.animations[i],loop);
        }
      }
    });
    return model;
}
/* ------ FINE UTIL ------- */
function addPlayer(scene, name, {x = 0, y = 320, z = 0} = {}) {
  /* Model Load */
  const model = LoadModel({ scene:scene, 
                            modelName:"player",
                            animationNames: ["Idle","Jump","LeftSideStep","RightSideStep","RunJump","Running","BackStep","Walking"],
                            radX:Math.PI/2,
                          });
  /* Physics setup */
  const compounds = [   {shape:"sphere", radius:1.5, y:7.6, z:0.8}, //Testa
                        {shape:"box", width: 5, depth: 3.5, height: 6.3, y:3.1, z:-0.25}, //Busto e gambe
                    ];
  const physConf = {compounds:compounds, mass:60}; 
  const newMan = new PlayerEntity({ parent:scene, 
                                   name: name,
                                   model: model, 
                                   x:x,y:y,z:z, 
                                   physConfig: physConf,
                                   maxHealth: 350,
                                   health: 350
                                });
  /*Caricamento FSM*/
  newMan.states.add("Idle","Idle",scene.sounds["noSound"]);
  newMan.states.add("Jump","Idle",scene.sounds["noSound"]);
  newMan.states.add("LeftSideStep","Idle",scene.sounds["playerWalk"]);
  newMan.states.add("RightSideStep","Idle",scene.sounds["playerWalk"]);
  newMan.states.add("Running","Idle",scene.sounds["playerRun"]);
  newMan.states.add("BackStep","Idle",scene.sounds["playerWalk"]);
  newMan.states.add("Walking","Idle",scene.sounds["playerWalk"]);
  newMan.states.set("Idle");
  /*Caricamento inventario*/
  //newMan.inventory = new createInventoryItem["wood"](3);
  newMan.inventory = new PlayerInventory(15);
  newMan.inventory.items.add(createInventoryItem["Sword"](1));
  newMan.inventory.items.add(createInventoryItem["Wood"](10));
  newMan.inventory.items.add(createInventoryItem["Apple"](5));
  newMan.inventory.items.add(createInventoryItem["Meat"](4));
  newMan.inventory.items.add(createInventoryItem["Stone"](5));
  newMan.inventory.items.add(createInventoryItem["Bonfire"](1));
  newMan.inventory.items.add(createInventoryItem["CookedApple"](1));
  newMan.inventory.items.add(createInventoryItem["CookedMeat"](1));
  newMan.inventory.items.add(createInventoryItem["CraftingTable"](1));
  return newMan;
}
function addTable(scene,name,{x = 0, y = 330, z = 0} = {}) {
    const model = LoadModel({scene:scene,
                             modelName: "table",
                            });

    const compounds = [{shape:"box", width:12, depth:12, height:5.6}];
    const physConf = {compounds:compounds, mass:400, offset: {y:-2.8, z:-0.2}};
    return new PhysEntity({ parent:scene,
                            name:name,
                            model:model,
                            x:x,y:y,z:z,
                            physConfig:physConf,
                            maxHealth: 200,
                            health: 200
                        });
}
function addTree1(scene, name, {x = 0, y = 370, z = 0} = {}) {
    /* Model Load */
    const model = LoadModelWithShadows({ scene:scene, 
                              modelName:"tree1",
                              radX: Math.PI * 3/2,
                            });
    
    model.scale.x = 0.5;
    model.scale.y = 0.5;
    model.scale.z = 0.5;
    names["Tree"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 30, depth: 30, height: 90}, {shape:"box", width: 10, depth: 120, height: 0, y: -46}, {shape:"box", width: 120, depth: 10, height: 0, y: -46}];
    const physConf = {compounds:compounds, offset: {y:-22.5, x: 2, z: 2}, mass:3000}; //Per gli oggetti che non si devono muovere basta mettere la massa a questo valore
    let entity = new PhysEntity({ parent:scene, 
                                  name:name + names["Tree"], 
                                  model:model,
                                  x:x,y:y,z:z, 
                                  physConfig:physConf,
                                  maxHealth: 300,
                                  health: 300
                                });
    /* Caricamento inventario */
    entity.inventory = new Inventory(5);
    entity.inventory.items.add(createInventoryItem["Wood"](1));
    return entity;
}
function addTree2(scene, name, {x = 0, y = 370, z = 0} = {}) {
    /* Model Load */
    const model = LoadModelWithShadows({ scene:scene, 
                              modelName:"tree2",
                              radX: Math.PI * 3/2,
                            });
    /* Physics setup */
    names["Tree"]++;
    const compounds = [ {shape:"box", width: 35, depth: 32, height: 90}, {shape:"box", width: 10, depth: 120, height: 0, y: -46}, {shape:"box", width: 120, depth: 10, height: 0, y: -46}];
    const physConf = {compounds:compounds, offset: {y:-45, z: 7}, mass:3000}; //Per gli oggetti che non si devono muovere basta mettere la massa a questo valore
    let entity = new PhysEntity({ parent:scene, 
                                  name:name + names["Tree"],
                                  model:model,
                                  x:x,y:y,z:z, 
                                  physConfig:physConf,
                                  maxHealth: 300,
                                  health: 300
                                });
    /* Caricamento inventario */
    entity.inventory = new Inventory(5);
    entity.inventory.items.add(createInventoryItem["Wood"](1));
    return entity;
}
function addTree3(scene, name, {x = 0, y = 370, z = 0} = {}) {
    /* Model Load */
    const model = LoadModelWithShadows({ scene:scene, 
                              modelName:"tree3",
                              radX: Math.PI * 3/2,
                            });
    
    model.scale.x = 0.4;
    model.scale.y = 0.4;
    model.scale.z = 0.4;
    names["Tree"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 37, depth: 39, height: 90}, {shape:"box", width: 10, depth: 120, height: 0, y: -46} , {shape:"box", width: 120, depth: 10, height: 0, y: -46}];
    const physConf = {compounds:compounds, offset: {y:-18}, mass:3000}; //Per gli oggetti che non si devono muovere basta mettere la massa a questo valore
    let entity = new PhysEntity({ parent:scene, 
                                  name:name + names["Tree"], 
                                  model:model,
                                  x:x,y:y,z:z, 
                                  physConfig:physConf,
                                  maxHealth: 300,
                                  health: 300
                                });
    /* Caricamento inventario */
    entity.inventory = new Inventory(5);
    entity.inventory.items.add(createInventoryItem["Wood"](1));
    return entity;
}
function addTree4(scene, name, {x = 0, y = 370, z = 0} = {}) {
    /* Model Load */
    const model = LoadModelWithShadows({ scene:scene, 
                              modelName:"tree4",
                              radX: Math.PI * 3/2,
                            });
    
    model.scale.x = 0.4;
    model.scale.y = 0.4;
    model.scale.z = 0.4;
    names["Tree"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 23, depth: 23, height: 90}, {shape:"box", width: 10, depth: 120, height: 0, y: -46}, {shape:"box", width: 120, depth: 10, height: 0, y: -46}];
    const physConf = {compounds:compounds, offset: {y:-18}, mass:3000}; //Per gli oggetti che non si devono muovere basta mettere la massa a questo valore
    let entity = new PhysEntity({ parent:scene, 
                                  name:name + names["Tree"],
                                  model:model,
                                  x:x,y:y,z:z, 
                                  physConfig:physConf,
                                  maxHealth: 300,
                                  health: 300
                                });
    /* Caricamento inventario */
    entity.inventory = new Inventory(5);
    entity.inventory.items.add(createInventoryItem["Wood"](1));
    return entity;
}
function addTree5(scene, name, {x = 0, y = 370, z = 0} = {}) {
    /* Model Load */
    const model = LoadModelWithShadows({ scene:scene, 
                              modelName:"tree5",
                              radX: Math.PI * 3/2,
                            });

    /* Physics setup */
    names["Tree"]++;
    const compounds = [ {shape:"box", width: 28, depth: 32, height: 90}, {shape:"box", width: 10, depth: 120, height: 0, y: -46}, {shape:"box", width: 120, depth: 10, height: 0, y: -46}];
    const physConf = {compounds:compounds, offset: {y:-45, z: 12, x: -3}, mass:3000}; //Per gli oggetti che non si devono muovere basta mettere la massa a questo valore
    let entity = new PhysEntity({ parent:scene, 
                                  name:name + names["Tree"],
                                  model:model,
                                  x:x,y:y,z:z, 
                                  physConfig:physConf,
                                  maxHealth: 300,
                                  health: 300
                                });
    /* Caricamento inventario */
    entity.inventory = new Inventory(5);
    entity.inventory.items.add(createInventoryItem["Wood"](1));
    return entity;
}
function addTree6(scene, name, {x = 0, y = 370, z = 0} = {}) {
    /* Model Load */
    const model = LoadModelWithShadows({ scene:scene, 
                              modelName:"tree6",
                              radX: Math.PI * 3/2,
                            });
    
    model.scale.x = 0.4;
    model.scale.y = 0.55;
    model.scale.z = 0.4;
    names["Tree"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 20, depth: 20, height: 90}, {shape:"box", width: 10, depth: 120, height: 0, y: -46}, {shape:"box", width: 120, depth: 10, height: 0, y: -46}];
    const physConf = {compounds:compounds, offset: {y:-24.75}, mass:3000}; //Per gli oggetti che non si devono muovere basta mettere la massa a questo valore
    let entity = new PhysEntity({ parent:scene, 
                                  name:name + names["Tree"],
                                  model:model,
                                  x:x,y:y,z:z, 
                                  physConfig:physConf,
                                  maxHealth: 300,
                                  health: 300
                                });
    /* Caricamento inventario */
    entity.inventory = new Inventory(5);
    entity.inventory.items.add(createInventoryItem["Wood"](1));
    return entity;
}
function addInventory(scene, name, {x = 0, y = 0, z = 0} = {}) {
    /* Model Load */
    const model = LoadModel({ scene:scene, 
                                modelName:"inventory",
                            });
    names["Inventory"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 1, depth: 1, height: 0.3} ];
    const physConf = {compounds:compounds, offset: {y:-0.15}, mass:10}; 
    return new PhysEntity({ parent:scene, 
                            name:name + names["Inventory"], 
                            model:model,
                            x:x,y:y,z:z, 
                            physConfig:physConf
                        });
}
function addSword(scene, name, {x = 0, y = 0, z = 0} = {}, collFlag =  bodyTypes.DYNAMIC) { //Sostituire col weapon entity
    /* Model Load */
    const model = LoadModel({   scene:scene, 
                                modelName:"sword",
                                radX: Math.PI * 3/2,
                                radZ: Math.PI
                            });
    names["Sword"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 1, depth: 5.4, height: 0.1, z:1.9} ];
    const physConf = {compounds:compounds}; 
    let eqOffset = {x:1.5, z:-1.8,y:-0.6};
    x = x + eqOffset.x;
    y = y + eqOffset.y;
    z = z + eqOffset.z;
    return new PhysEntity({ parent:scene, 
                            name:name + names["Sword"], 
                            model:model,
                            x:x,y:y,z:z, 
                            physConfig:physConf, 
                            collisionFlag:collFlag
                        });
}       
function addAnimal1(scene, name, {x = 20, y = 330, z = 0} = {}) {
    /* Model Load */
    const model = LoadModel({ scene:scene, 
                              modelName:"animal1",
                              animationNames: ["Death","Idle", "Jump", "Move", "Move Slow"],
                            });

    model.scale.x = 1.5;
    model.scale.y = 1.5;
    model.scale.z = 1.5;

    names["Animal"]++;

    /* Physics setup */
    const compounds = [ {shape:"box", width: 3, depth: 7, height: 5}, {shape:"box", width: 15, depth: 2, height: 0, y: -2.5}, {shape:"box", width: 2, depth: 15, height: 0, y: -2.5}];
    const physConf = {compounds:compounds, offset: {y: -3.75} ,mass:300, collGroup:2}; 
    const newAnimal = new PhysEntity({ parent:scene, 
                                     name: name + names["Animal"],
                                     model: model, 
                                     x:x,y:y,z:z, 
                                     physConfig: physConf,
                                     maxHealth: 350,
                                     health: 350
                                  });
    /*Caricamento FSM*/
    newAnimal.states.add("Idle","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Move","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Death","Death",scene.sounds["noSound"]);
    newAnimal.states.add("Move Slow","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Jump","Idle",scene.sounds["noSound"]);
    /*Caricamento inventario*/
    newAnimal.inventory = new Inventory(1);
    newAnimal.inventory.items.add(createInventoryItem["Meat"](4));
    return newAnimal;
}

function addAnimal2(scene, name, {x = 20, y = 330, z = 0} = {}) {
    /* Model Load */
    const model = LoadModel({ scene:scene, 
                              modelName:"animal2",
                              animationNames: ["Death","Idle", "Jump", "Move", "Move Slow"],
                            });

    model.scale.x = 1.5;
    model.scale.y = 1.5;
    model.scale.z = 1.5;

    names["Animal"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 3, depth: 7, height: 5}, {shape:"box", width: 15, depth: 2, height: 0, y: -2.5}, {shape:"box", width: 2, depth: 15, height: 0, y: -2.5}];
    const physConf = {compounds:compounds, offset: {y: -3.75} ,mass:300, collGroup:2}; 
    const newAnimal = new PhysEntity({ parent:scene, 
        name: name + names["Animal"],
        model: model, 
        x:x,y:y,z:z, 
        physConfig: physConf,
        maxHealth: 350,
        health: 350
     });
    /*Caricamento FSM*/
    newAnimal.states.add("Idle","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Move","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Death","Death",scene.sounds["noSound"]);
    newAnimal.states.add("Move Slow","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Jump","Idle",scene.sounds["noSound"]);
    /*Caricamento inventario*/
    newAnimal.inventory = new Inventory(1);
    newAnimal.inventory.items.add(createInventoryItem["Meat"](4));
  
    return newAnimal;
}

function addAnimal3(scene, name, {x = 20, y = 330, z = 0} = {}) {
    /* Model Load */
    const model = LoadModel({ scene:scene, 
                              modelName:"animal3",
                              animationNames: ["Death","Idle", "Jump", "Move", "Move Slow"],
                            });

    model.scale.x = 1.5;
    model.scale.y = 1.5;
    model.scale.z = 1.5;

    names["Animal"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 3, depth: 7, height: 5}, {shape:"box", width: 15, depth: 2, height: 0, y: -2.5}, {shape:"box", width: 2, depth: 15, height: 0, y: -2.5}];
    const physConf = {compounds:compounds, offset: {y: -3.75} ,mass:300, collGroup:2}; 
    const newAnimal = new PhysEntity({ parent:scene, 
        name: name + names["Animal"],
        model: model, 
        x:x,y:y,z:z, 
        physConfig: physConf,
        maxHealth: 350,
        health: 350
     });
    /*Caricamento FSM*/
    newAnimal.states.add("Idle","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Move","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Death","Death",scene.sounds["noSound"]);
    newAnimal.states.add("Move Slow","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Jump","Idle",scene.sounds["noSound"]);
    /*Caricamento inventario*/
    newAnimal.inventory = new Inventory(1);
    newAnimal.inventory.items.add(createInventoryItem["Meat"](4));
  
    return newAnimal;
}

function addAnimal4(scene, name, {x = 20, y = 330, z = 0} = {}) {
    /* Model Load */
    const model = LoadModel({ scene:scene, 
                              modelName:"animal4",
                              animationNames: ["Death","Idle", "Jump", "Move", "Move Slow"],
                            });

    model.scale.x = 1.5;
    model.scale.y = 1.5;
    model.scale.z = 1.5;

    names["Animal"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 3, depth: 4, height: 5}, {shape:"box", width: 15, depth: 2, height: 0, y: -2.5}, {shape:"box", width: 2, depth: 15, height: 0, y: -2.5}];
    const physConf = {compounds:compounds, offset: {y: -3.75} ,mass:300, collGroup:2}; 
    const newAnimal = new PhysEntity({ parent:scene, 
        name: name + names["Animal"],
        model: model, 
        x:x,y:y,z:z, 
        physConfig: physConf,
        maxHealth: 350,
        health: 350
     });
    /*Caricamento FSM*/
    newAnimal.states.add("Idle","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Move","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Death","Death",scene.sounds["noSound"]);
    newAnimal.states.add("Move Slow","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Jump","Idle",scene.sounds["noSound"]);
    /*Caricamento inventario*/
    newAnimal.inventory = new Inventory(1);
    newAnimal.inventory.items.add(createInventoryItem["Meat"](4));
  
    return newAnimal;
}

function addAnimal5(scene, name, {x = 20, y = 330, z = 0} = {}) {
    /* Model Load */
    const model = LoadModel({ scene:scene, 
                              modelName:"animal5",
                              animationNames: ["Death","Idle", "Jump", "Move", "Move Slow"],
                            });

    model.scale.x = 1.5;
    model.scale.y = 1.5;
    model.scale.z = 1.5;

    names["Animal"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 3, depth: 7, height: 5}, {shape:"box", width: 15, depth: 2, height: 0, y: -2.5}, {shape:"box", width: 2, depth: 15, height: 0, y: -2.5}];
    const physConf = {compounds:compounds, offset: {y: -3.75} ,mass:300, collGroup:2}; 
    const newAnimal = new PhysEntity({ parent:scene, 
        name: name + names["Animal"],
        model: model, 
        x:x,y:y,z:z, 
        physConfig: physConf,
        maxHealth: 350,
        health: 350
     });
    /*Caricamento FSM*/
    newAnimal.states.add("Idle","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Move","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Death","Death",scene.sounds["noSound"]);
    newAnimal.states.add("Move Slow","Idle",scene.sounds["noSound"]);
    newAnimal.states.add("Jump","Idle",scene.sounds["noSound"]);
    /*Caricamento inventario*/
    newAnimal.inventory = new Inventory(1);
    newAnimal.inventory.items.add(createInventoryItem["Meat"](4));
  
    return newAnimal;
}                                 
/* ------------- Item Spawners ------------- */
const itemSpawners = Object.freeze({
    Sword: addSwordItem
});
const weaponOffsets = Object.freeze({
    Sword:{x:-2.85,y:4.1,z:1.8}
});
function addSwordItem(scene, name, {x = 0, y = 0, z = 0} = {}) { //---> Inserire il on.Collision
    let phys = spawners.entity["Sword"](scene,name,{x:x,y:y,z:z},bodyTypes.GHOST);
    let item = new Item(phys,30,200,scene.sounds["Clang"]);
    item.onCollision = (otherObj) => {
        if(otherObj.name != GROUND_NAME && item.user.usingItem == ArmedEntity.useStatusStates.first) {
            item.user.usingItem = ArmedEntity.useStatusStates.ongoing;
            const otherName = otherObj.name.split("_")[1];
            const entity = item.user.manager.entities.entity(otherName);
            if(entity) {
                item.playSound();
                entity.hit(item);
            }
        }
    };
    return item;
}
/* ------------ FINE SPAWNERS --------------- */
const spawners = Object.freeze({
    entity: entitySpawners,
    item: itemSpawners,
    quests: questSpawners
});
