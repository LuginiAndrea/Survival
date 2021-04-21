export {spawners, weaponOffsets}
import {Quest} from "./Quest.js";
import {Entity, PhysEntity, ArmedEntity, PlayerEntity, Item} from "./Entity.js";
import {createInventoryItem,PlayerInventory, Inventory} from "./Inventory.js";
const {ExtendedObject3D} = ENABLE3D;

/* ------------ INIZIO SPAWNERS --------------- */

/* --------------- Quest Spawners ---------------- */
const questSpawners = Object.freeze({
    moveQuest: addMoveQuest,
    invQuest: addInvQuest
});

function addMoveQuest(scene) {
    let parameters = Object.freeze({
                                player: scene.player,
                                sound: scene.sounds["lessGo"]
                            });
    let start = (args) => {
        //Codice per scrivere nel css
    }
    let check = (args) => { 
        return (args.player.states.current.state != "Idle" && args.player.states.current.state != "Attacking");
    }
    let end = (args) => { //Inserire css
        args.sound.play();
        $("#Pog").show();
        $("#Pog").html("<br><br>Muovi i primi passi <br><br> COMPLETATO");
        setTimeout(()=>{$("#Pog").hide();},3100);
    }
    return new Quest("moveQuest",start,check,end,parameters);
}
function addInvQuest(scene) {
    let parameters = Object.freeze({
                                keyR: scene.keys.r,
                                sound: scene.sounds["lessGo"]
                            });
    let start = (args) => {
        //Codice per scrivere nel css
    }
    let check = (args) => { 
        return (args.keyR.status);
    }
    let end = (args) => { //Inserire css
        args.sound.play();
        $("#Pog").show();
        $("#Pog").html("<br><br>Sbircia l'inventario<br><br> COMPLETATO");
        setTimeout(()=>{$("#Pog").hide();},3100);
    }
    return new Quest("InvQuest",start,check,end,parameters);
}


/* ------------- Entity spawners -------------------*/
var names = { //hash map con i nomi degli oggetti
    Tree1: 0,
    Inventory: 0,
    Sword:0
};
const DROP_OFFSET = Object.freeze({
    z: 4,
    y:1
  });
var offsets = Object.freeze({
    Sword: {
        player: {x:-2.9,y:0,z:1.8}
    }
});
/*Globali fisica*/
const bodyTypes = Object.freeze({
    DYNAMIC : 0,
    GHOST : 4
});
const entitySpawners = Object.freeze({
    Player: addPlayer,
    Tree1: addTree1,
    Inventory: addInventory,
    Sword: addSword
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
      for(let i = 0; i < gltf.animations.length; i++) {
        model.animation.add(animationNames[i],gltf.animations[i],loop);
      }
    }
  });
  return model;
}

/* ------ FINE UTIL ------- */
function addPlayer(scene, name, {x = 0, y = 0, z = 0} = {}) {
  /* Model Load */
  const model = LoadModel({ scene:scene, 
                            modelName:"player",
                            animationNames: ["Idle","Jump","LeftSideStep","RightSideStep","RunJump","Running","BackStep","Walking"],
                            radX:Math.PI/2,
                          });
  /* Physics setup */
  const compounds = [   {shape:"sphere", radius:1.1, y:7.6, z:0.8, x:-0.2}, //Testa
                        {shape:"box", width: 1.2, depth: 2.2, height: 3, y:5.1, z:0.4}, //Busto
                        {shape:"box", width: 0.5, depth: 0.5, height: 0.5, y:6, z:0, x:-0.9}, //Braccio destro 1
                        {shape:"box", width: 0.5, depth: 0.5, height: 0.5, y:5.5, z:-0.3, x:-0.9}, //Braccio destro 2
                        {shape:"box", width: 0.5, depth: 0.5, height: 1, y:5.0, z:-0.8, x:-0.95}, //Braccio destro 3
                        {shape:"box", width: 0.7, depth: 0.5, height: 1.3, y:3.9, z:-0.8, x:-1.3}, //Braccio destro 4
                        {shape:"box", width: 10, depth: 5.5, height: 20}]; 
  const physConf = {compounds:compounds, mass:60, collGroup:2}; 
  const newMan = new ArmedEntity({ parent:scene, 
                                   name: name,
                                   model: model, 
                                   x:x,y:y,z:z, 
                                   physConfig: physConf, 
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
  newMan.inventory = new PlayerInventory(10);
  newMan.inventory.items.add(createInventoryItem["Sword"](1));
  newMan.inventory.items.add(createInventoryItem["Wood"](10));
  return newMan;
}

function addTree1(scene, name, {x = 0, y = 0, z = 0} = {}) {
    /* Model Load */
    const model = LoadModel({ scene:scene, 
                              modelName:"tree1",
                              radX: Math.PI * 3/2,
                            });
    names["Tree1"]++;
    /* Physics setup */
    const compounds = [ {shape:"box", width: 6, depth: 6, height: 12}, {shape:"box", width: 12, depth: 12, height: 12, y:10} ];
    const physConf = {compounds:compounds, offset: {y:-6}, mass:Number.MAX_SAFE_INTEGER}; //Per gli oggetti che non si devono muovere basta mettere la massa a questo valore
    let entity = new PhysEntity({ parent:scene, 
                                  name:name + names["Tree1"], 
                                  model:model,
                                  x:x,y:y,z:z, 
                                  physConfig:physConf
                                });
    /* Caricamento inventario */
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
    const physConf = {compounds:compounds, offset: {y:-0.15}}; 
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


/* ------------- Item Spawners ------------- */

const itemSpawners = Object.freeze({
    Sword: addSwordItem
});

const weaponOffsets = Object.freeze({
    Sword:{x:-2.9,y:0,z:1.9}
});

function addSwordItem(scene, name, {x = 0, y = 0, z = 0} = {}) { //---> Inserire il on.Collision
    let phys = spawners.entity["Sword"](scene,name,{x:x,y:y,z:z},bodyTypes.GHOST);
    let item = new Item(phys,300);
    /*item.onCollision = (otherObj,event) => {
        if(otherObj.name != GROUND_NAME) {
            console.log(otherObj.name);
        }
    };*/
    return item;
}
/* ------------ FINE SPAWNERS --------------- */

const spawners = Object.freeze({
    entity: entitySpawners,
    item: itemSpawners,
    quests: questSpawners
});
