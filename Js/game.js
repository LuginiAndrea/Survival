export {SpawnFunctions}
import {Entity, PhysEntity, ArmedEntity, Item} from "./classes/Entity.js"
import {createInventoryItem, PlayerInventory, Inventory} from "./classes/Inventory.js"
const {ExtendedMesh, Project, Scene3D, PhysicsLoader, THREE, ExtendedObject3D,  ThirdPersonControls, PointerLock, PointerDrag} = ENABLE3D

var names = { //hash map con i nomi degli oggetti
  Tree1: 0,
  Inventory: 0,
  Sword:0
};
const MAX_PRESS_COUNTER = 40;
var player;
const attackStatus = Object.freeze({
  NO: 0,
  FIRSTATTACK:1,
  ONGOING:2 //Evitare che vengano chiamate più collisioni per un solo attacco
});
/*Globali inventario*/
var selectedItemTmp1 = -1; //Item selezionato dall'inventario di scambio 1
var selectedItemTmp2 = -1; //Item selezionato dall'inventario di scambio 2
var selectedItem = 0; //Item selezionato dall'inventario
var inventoryShowing = 0; // 0 no, 1 si, 2 sta mostrando il tmpInventory 
const DROP_OFFSET = Object.freeze({
  z: 4,
  y:1
});
/*Globali fisica*/
const bodyTypes = Object.freeze({
  DYNAMIC : 0,
  GHOST : 4
});
const WALK_SPEED = 5;
const SIDE_STEP_SPEED = 3;
const RUN_SPEED = 10;
const JUMP_SPEED = 10; 
const NULL_SPEED = 0;
const JUMP_OFFSET = 0.14391;
const GROUND_NAME = "body_id_21";
/*Spawner di entities*/
const SpawnFunctions = {};
SpawnFunctions["PlayerSpawner"] = addMan;
SpawnFunctions["Tree1Spawner"] = addTree1;
SpawnFunctions["InventorySpawner"] = addInventory;
SpawnFunctions["SwordSpawner"] = addSword;

/* ------------------------------ INIZIO MAIN SCENE --------------------------- */

class MainScene extends Scene3D {
  constructor() {
    super('MainScene');
    this.entities = new Array(); //Array di tutte le entità meno player
    this.player = null;
  }

async init() {
    console.log('init');
    $("#inventory").hide();
    $(".tmpInv").hide();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    preLoad(this);
  } 

  preload() {
    console.log('preload');
    this.warpSpeed("-ground");
    this.physics.debug.enable();
    this.camera.fov=90;
    this.camera.updateProjectionMatrix();
  }

  async create() {
    /* Base physics setup */
    console.log('create');
    this.physics.add.ground({width:100, height:100, depth:3, y:-10});
    //this.physics.debug.disable();
    /* Keys events */
    this.keys = {
      w: false,
      a: false,
      d: false,
      s: false,
      SpaceBar: false,
      shift: false,
      r: { status: false, change: true }, //La variabile change in questi tasti ci permetti di evitare che il 
      enter: { status: false, change: true }, //tener premuto un tasto venga contato come un continuo premere
      arrowLeft: { status: false, change: true },
      arrowRight: { status: false, change: true },
      t: { status: false, counter: 0 }, //Counter ha lo stesso scopo in modo leggermente diverso
      e: false,
      g: false
    };
    const press = (e, status) => {
      this.keys.shift = e.shiftKey;
      switch (e.key) {
        case 'w': { this.keys.w = status; break; }
        case 'W': { this.keys.w = status; break; }
        case 'a': { this.keys.a = status; break; }
        case 'd': { this.keys.d = status; break; }
        case 's': { this.keys.s = status; break; }
        case ' ': { this.keys.SpaceBar = status; break; }
        case 'r': { this.keys.r.status = status; break; }
        case 'Enter': { this.keys.enter.status = status; break; }
        case 'ArrowLeft' : { this.keys.arrowLeft.status = status; break; }
        case 'ArrowRight' : { this.keys.arrowRight.status = status; break; }
        case 't' : { this.keys.t.status = status; break; }
        case 'e' : { this.keys.e = status; break; }
        case 'g' : { this.keys.g = status; break } 
      }
    };
    $(window).keydown(e => press(e,true));
    $(window).keyup(e => press(e,false));
    /*Player Loading*/
    this.player = SpawnFunctions["PlayerSpawner"](this,"ciccio");
    this.player.load();
    this.player.body.setDamping(0.8,0.8); //Evita il "moonwalking"
    this.player.jump = {status:false, oldY: -8.5, pressed: false}; 
    this.player.attacking = attackStatus.NO;
    player = this.player;
    
    this.entities.push(SpawnFunctions["Tree1Spawner"](this,"tree",{z:-10}));
    this.entities[this.entities.length-1].load();
    this.entities.push(SpawnFunctions["Tree1Spawner"](this,"tree",{z:10}));
    this.entities[this.entities.length-1].load();
    /*this.player.equippedItem.body.on.collision((otherObj, e) => {
      if(otherObj.name != GROUND_NAME && this.player.attacking == attackStatus.FIRSTATTACK) {
        this.player.attacking = attackStatus.ONGOING;
        console.log("OOf");
      }
    });*/
  }

  update() {
    /*Movement controls*/
    let forward = NULL_SPEED;
    let side = NULL_SPEED;
    let y = NULL_SPEED;

    /* WASD */
    if(this.keys.w && this.player.jump.pressed == false) { 
      if(this.keys.shift) { 
        this.player.states.set("Running");
        forward = RUN_SPEED;
      }
      else {
        this.player.states.set("Walking");
        forward = WALK_SPEED;
      }

    }
    else if(this.keys.a && this.player.jump.pressed == false) {
      this.player.states.set("LeftSideStep");
      side = -SIDE_STEP_SPEED;
    }
    else if(this.keys.d && this.player.jump.pressed == false) {
      this.player.states.set("RightSideStep");
      side = SIDE_STEP_SPEED;
    }
    else if(this.keys.s && this.player.jump.pressed == false) {
      this.player.states.set("BackStep");
      forward = -WALK_SPEED;
    }

    /*Jump*/
    if(this.keys.SpaceBar && this.player.jump.status == false && this.player.jump.pressed == false && this.player.attacking == attackStatus.NO) { 
      this.player.jump.pressed = true;
      let before = this.player.states.current.state;
      this.player.states.set("Jump");
      this.player.states.get(this.player.states.current.state).setLeaveState(before);
      setTimeout(() => {  this.player.jump.status = true;
                          y = JUMP_SPEED; 
                          this.player.move(NULL_SPEED,NULL_SPEED,y);
                        }, 500);                   
    }

    if(forward == NULL_SPEED && side == NULL_SPEED) { //Se non abbiamo premuto nulla torniamo all'idle
      if(this.player.jump.status == false && this.player.jump.pressed == false && this.player.attacking == attackStatus.NO) 
        this.player.states.current.exit(); //Se nessun movimento è attivo allora andiamo in idle 
    }
    this.player.move(forward,side,NULL_SPEED);

    /*Inventario*/
    if(this.keys.r.status) { //Apre inventario
      if(this.keys.r.change == true) {
        $("#inventory").toggle();
        this.keys.r.change = false;
        if(inventoryShowing == 0) { inventoryShowing = 1; }
        else { inventoryShowing = 0; }
      } 
    }       
    else this.keys.r.change = true;

    if(this.keys.t.status && inventoryShowing == 1) { //Droppa item
      if(this.keys.t.counter > MAX_PRESS_COUNTER) { //Droppa tutto item (Un work-around un po' del pipo che però pare funzionare)
        dropItem(this,this.player.inventory,selectedItem,{c_z:this.player.model.position.z-DROP_OFFSET.z,c_y:this.player.model.position.y+DROP_OFFSET.y});
        this.keys.t.counter = 1;
      }
      else if(this.keys.t.counter == 0) { //Droppa uno stack
        dropItem(this,this.player.inventory,selectedItem,{c_z:this.player.model.position.z-DROP_OFFSET.z,c_y:this.player.model.position.y+DROP_OFFSET.y},1);
      }
      this.keys.t.counter++;
    }
    else this.keys.t.counter = 0;

    if(this.keys.arrowRight.status) {
      if(this.keys.arrowRight.change == true && inventoryShowing == 1) {
        this.keys.arrowRight.change = false;
        selectedItem++;
        if(selectedItem >= this.player.inventory.size) selectedItem = 0;
        $(".inventoryItem").css("border-color","white");
        $(".inventoryItem").eq(selectedItem).css("border-color","red");
      }
    }
    else this.keys.arrowRight.change = true;

    if(this.keys.arrowLeft.status) { 
      if(this.keys.arrowLeft.change == true && inventoryShowing == 1) {
        this.keys.arrowLeft.change = false;
        selectedItem--;
        if(selectedItem < 0) selectedItem = this.player.inventory.size-1;
        $(".inventoryItem").css("border-color","white");
        $(".inventoryItem").eq(selectedItem).css("border-color","red");
      }
    }
    else this.keys.arrowLeft.change = true;

    if(this.keys.e && this.player.equippedItem == null) {
      this.player.equip(0);
    }

    /*Collisione salto controllo sgravato pazzurdo*/
    if(this.player.jump.status == true) { //Se stiamo saltando
      if(Math.abs(this.player.body.velocity.y) < JUMP_OFFSET) {  //Siamo fermi? (Verticalmente)
        this.player.jump.status = false;
        this.player.jump.pressed = false;
        this.player.states.current.exit();
      }
      this.player.jump.oldY = this.player.model.position.y; //Aggiorniamo le vecchie coordinate 
    }
  }
}
// load from '/lib/ammo/kripken' or '/lib/ammo/moz'
PhysicsLoader('/lib/ammo/kripken', () => new Project({ scenes: [MainScene], antialias:true }));

/* ------------------------------ FINE MAIN SCENE --------------------------- */

/* --------------------------- Inizio ADDERS ------------------------ */
function preLoad(mainScene) {
  mainScene.load.preload("inventory", "../Resources/Models/Inventory/scene.gltf");
  mainScene.load.preload("player","../Resources/Models/Protagonista/Protagonista.glb"); 
  mainScene.load.preload("truck", "../Resources/Models/Truck/scene.gltf");
  mainScene.load.preload("tree1", "../Resources/Models/trees/tree1.gltf");
  mainScene.load.preload("sword","../Resources/Models/Sword/Sword.glb");
}
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
function addMan(scene, name, {x = 0, y = 0, z = 0} = {}) {
  /* Model Load */
  const model = LoadModel({ scene:scene, 
                            modelName:"player",
                            animationNames: ["Idle","Jump","LeftSideStep","RightSideStep","RunJump","Running","BackStep","Walking"],
                            radX:Math.PI/2, radZ:Math.PI
                          });
  /* Physics setup */
  const compounds = [{shape:"box", width: 2.9, depth: 5.5, height: 8.5}]; 
  const physConf = {compounds:compounds, mass:60, offset: {y:-4.25}}; 
  const newMan = new ArmedEntity({ parent:scene, 
                                   name: name,
                                   model: model, 
                                   x:x,y:y,z:z, 
                                   physConfig: physConf, 
                                });
  /*Caricamento FSM*/
  newMan.states.add("Idle","Idle");
  newMan.states.add("Jump","Idle");
  newMan.states.add("LeftSideStep","Idle");
  newMan.states.add("RightSideStep","Idle");
  newMan.states.add("Running","Idle");
  newMan.states.add("BackStep","Idle");
  newMan.states.add("Walking","Idle");
  newMan.states.set("Idle");
  /*Caricamento inventario*/
  //newMan.inventory = new createInventoryItem["wood"](3);
  newMan.inventory = new PlayerInventory(10);
  newMan.inventory.items.add(createInventoryItem["sword"](1));
  newMan.inventory.items.add(createInventoryItem["wood"](10));
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
function addSword(scene, name, {x = 0, y = 0, z = 0} = {}) { //Sostituire col weapon entity
  /* Model Load */
  const model = LoadModel({ scene:scene, 
                            modelName:"sword",
                            radX: Math.PI * 3/2,
                          });
  names["Sword"]++;
  /* Physics setup */
  const compounds = [ {shape:"box", width: 1, depth: 5.4, height: 0.1} ];
  const physConf = {compounds:compounds, offset: {z:+1.9}}; 
  let eqOffset = {x:1.5, z:-1.8,y:-0.6};
  x = x + eqOffset.x;
  y = y + eqOffset.y;
  z = z + eqOffset.z;
  let phys = new PhysEntity({ parent:scene, 
                          name:name + names["Sword"], 
                          model:model,
                          x:x,y:y,z:z, 
                          physConfig:physConf, 
                          collisionFlag:bodyTypes.GHOST
                        });
  return new Item(phys,10);
}
/* --------------------------- FINE ADDERS ------------------------ */

/*Destroyer*/ 
function destroyObject(scene,index,{c_x = 0,c_y = 0,c_z = 0} = {}) { 
  let obj = scene.entities[index];
  let inv = obj.destroy();
  if(inv == null) { //Se non ha returnato un inventario eliminiamo e basta
    scene.entities.splice(index,1);
  }
  else {
    let newInventory = SpawnFunctions["InventorySpawner"](scene,"inventory",{x:c_x,y:c_y,z:c_z});
    newInventory.inventory = obj.destroy();
    scene.entities[index] = newInventory;
    scene.entities[index].load();
  }
}
function dropItem(scene,inv,index,{c_x = 0,c_y = 0,c_z = 0} = {},stacks = null) {
  let newInv = inv.dropItem(index,stacks);
  scene.entities.push(new SpawnFunctions["InventorySpawner"](scene,"inventario",{z:c_z,y:c_y}))
  scene.entities[scene.entities.length-1].inventory = newInv;
  scene.entities[scene.entities.length-1].load();
}

/* ----------------- Inizio gestori mouse ----------------- */

/*Other stuff*/
$(document).ready(() => {
  /* Inventari */
  $(".inventoryItem").on("click", (event) => { //Selezionare un item dell'inventario
    $(".inventoryItem").css("border-color","white");
    event.target.style.borderColor = "red";
    selectedItem = event.target.getAttribute("data-n");
  });
  $(".tmpInv").on("click", (event) => { //Selezionare un item dell'inventario tmp
    $(".tmpInv").children().children().css("background","none");
    event.target.style.backgroundColor = "red";
    if(event.target.parentElement.parentElement.getAttribute("id") == "tmpInv1") {
      selectedItemTmp1 = event.target.getAttribute("data-n");
      selectedItemTmp2 = -1;
    }
    else {
      selectedItemTmp2 = event.target.getAttribute("data-n");
      selectedItemTmp1 = -1;
    }
  });
  /* Altro */
  $(document).click((event) => { /*Click su una entità
    /*
    if(inventoryShowing == 0) {
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
      raycaster.setFromCamera( mouse, camera );
      const intersects = raycaster.intersectObjects( scene.children );
      console.log(intersects);
    }*/
    if (player.attacking == attackStatus.NO) { 
      player.attacking = attackStatus.FIRSTATTACK; 
      setTimeout(()=>{player.attacking = attackStatus.NO},200);
    }
  });
});