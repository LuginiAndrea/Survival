
import {spawners} from "./classes/Spawner.js";
import {QuestManager} from "./classes/Quest.js";
import { ArmedEntity, EntityManager } from "./classes/Entity.js";
const {ExtendedMesh, Project, Scene3D, PhysicsLoader, THREE, ExtendedObject3D,  ThirdPersonControls, PointerLock, PointerDrag} = ENABLE3D;



const MAX_PRESS_COUNTER = 40;
var player;
var camera;
var scene;
/*Globali inventario*/
var selectedItemTmp1 = -1; //Item selezionato dall'inventario di scambio 1
var selectedItemTmp2 = -1; //Item selezionato dall'inventario di scambio 2
var selectedItem = 0; //Item selezionato dall'inventario
var inventoryShowing = 0; // 0 no, 1 si, 2 sta mostrando il tmpInventory 
/*Globali fisica*/
const WALK_SPEED = -5;
const SIDE_STEP_SPEED = -3;
const RUN_SPEED = -10;
const JUMP_SPEED = 10; 
const NULL_SPEED = 0;
const JUMP_OFFSET = 0.14391;
const GROUND_NAME = "body_id_21";
/* ------------------------------ INIZIO MAIN SCENE --------------------------- */

class MainScene extends Scene3D {
  constructor() {
    super('MainScene');
    scene = this;
    this.entityManager = new EntityManager(this); //Array di tutte le entità meno player
    this.player = null;
    this.questManager = new QuestManager();
    this.audio = new AudioManager();
    this.sounds = {};
    /* Keys */
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

    this.moveTop = 0
    this.moveRight = 0
  }

async init() {
    console.log('init');
    $("#inventory").hide();
    $(".tmpInv").hide();
    $("#Pog").hide();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
} 

 async preload() {
    console.log('preload');
    this.warpSpeed("-ground");
    this.physics.debug.enable();
    this.camera.fov=90;
    this.camera.updateProjectionMatrix();
    camera = this.camera;
    await preLoad(this);  
    this.sounds["background"].play();
  }

  async create() {
    /* Base physics setup */
    console.log('create');
    this.physics.add.ground({width:100, height:100, depth:3, y:-10});
    //this.physics.debug.disable();

    /*Player Loading*/
    this.player = this.entityManager.entities.add(spawners.entity["Player"](this,"player"));
    this.player.body.setDamping(0.8,0.8); //Evita il "moonwalking"
    this.player.jump = {status:false, oldY: -8.5, pressed: false}; 
    player = this.player;

    /*Quest Loading*/
    this.questManager.quests.add(spawners.quests["moveQuest"](this));
    this.questManager.quests.add(spawners.quests["invQuest"](this));
    this.questManager.quests.add(spawners.quests["destroyQuest"](this));

    /*Entity loading*/
    this.entityManager.entities.add(spawners.entity["Tree1"](this,"tree1", {z:-10}));
    this.entityManager.entities.add(spawners.entity["Tree1"](this,"tree1", {z:10}));
  
    /* Telecamera */
    this.controls = new ThirdPersonControls(this.camera, this.player.__model, {
      offset: new THREE.Vector3(0.3, 8, -1),
      targetRadius: 12,
      radius: 0,
      sensitivity: new THREE.Vector2(0.3, 0.3)
    });
    let pl = new PointerLock(this.canvas);
    let pd = new PointerDrag(this.canvas);
    pd.onMove(delta => {
      if(pl.isLocked()) {
        this.controls.update(delta.x * 2, delta.y * 2);
      }
    });
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
    if(this.keys.SpaceBar && this.player.jump.status == false && this.player.jump.pressed == false && this.player.usingItem == ArmedEntity.useStatusStates.no) { 
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
      if(this.player.jump.status == false && this.player.jump.pressed == false && this.player.usingItem == ArmedEntity.useStatusStates.no) 
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
    /*Collisione salto controllo sgravato pazzurdo*/
    if(this.player.jump.status == true) { //Se stiamo saltando
      if(Math.abs(this.player.body.velocity.y) < JUMP_OFFSET) {  //Siamo fermi? (Verticalmente)
        this.player.jump.status = false;
        this.player.jump.pressed = false;
        this.player.states.current.exit();
      }
      this.player.jump.oldY = this.player.model.position.y; //Aggiorniamo le vecchie coordinate 
    }


    
    /* Telecamera */
    if(this.player.model) {
      this.controls.update(this.moveRight * 2, -this.moveTop * 2);
      const v3 = new THREE.Vector3();
      const rotation = this.camera.getWorldDirection(v3);
      const theta = Math.atan2(rotation.x, rotation.z);
      const thetaMan = this.player.model.world.theta;
      this.player.body.setAngularVelocityY(0);
      const l = Math.abs(theta - thetaMan);
      let rotationSpeed = 4;
      let d = Math.PI / 24  ;   
      if (l > d) {
        if (l > Math.PI - d) rotationSpeed *= -1;
        if (theta < thetaMan) rotationSpeed *= -1;
        this.player.body.setAngularVelocityY(rotationSpeed);
      }
    }

    this.entityManager.update();
    this.questManager.update();
  }
}
// load from '/lib/ammo/kripken' or '/lib/ammo/moz'
PhysicsLoader('/lib/ammo/kripken', () => new Project({ scenes: [MainScene], antialias:true }));

/* ------------------------------ FINE MAIN SCENE --------------------------- */
function setMinVolume(entities) { //Vedere come calcolare il volume
  let max = 0;
  const computeDist = function (entity1, entity2) {
    let diffX = entity1.model.position.x - entity2.model.position.x;
    let diffY = entity1.model.position.y - entity2.model.position.y;
    return Math.sqrt(diffX*diffX + diffY*diffY);
  }
  for(let entity in entities) {
    let r = computeDist(player,entity);
    if(r > max) max = r;
  }
}
/* --------------------------- Inizio ADDERS ------------------------ */
async function preLoad(mainScene) {
  /*Model load*/
  mainScene.load.preload("inventory", "../Resources/Models/Inventory/scene.gltf");
  mainScene.load.preload("player","../Resources/Models/Protagonista/Protagonista.glb"); 
  mainScene.load.preload("truck", "../Resources/Models/Truck/scene.gltf");
  mainScene.load.preload("tree1", "../Resources/Models/trees/tree1.gltf");
  mainScene.load.preload("sword","../Resources/Models/Sword/Sword.glb");
  /*Audio load*/
  await mainScene.audio.load("noSound","../Resources/Audio/noSound", "mp3", "ogg");
  await mainScene.audio.load('playerWalk', '../Resources/Audio/Protagonista/playerWalk', 'wav', 'ogg');
  await mainScene.audio.load('LessGo', '../Resources/Audio/Protagonista/LessGo', 'mp3', 'ogg');
  await mainScene.audio.load("playerRun","../Resources/Audio/Protagonista/playerRun", "mp3", "ogg");
  await mainScene.audio.load("background", "../Resources/Audio/backgroundSound", "mp3", "ogg");
  mainScene.sounds["noSound"] = await mainScene.audio.add("noSound");
  mainScene.sounds["playerWalk"] = await mainScene.audio.add("playerWalk");
  mainScene.sounds["playerRun"] = await mainScene.audio.add("playerRun");
  mainScene.sounds["background"] = await mainScene.audio.add("background");
  mainScene.sounds["lessGo"] = await mainScene.audio.add("LessGo");
  mainScene.sounds["background"].setVolume(0.05);
  mainScene.sounds["playerWalk"].setVolume(0.3);
  mainScene.sounds["lessGo"].setVolume(5);
  //mainScene.sounds["lessGo"].play();
}

/* --------------------------- FINE ADDERS ------------------------ */

/*Destroyer*/ 
//Aggiustare
function dropItem(scene,inv,index,{c_x = 0,c_y = 0,c_z = 0} = {},stacks = null) {
  let newInv = inv.dropItem(index,stacks);
  scene.entities.push(new SpawnFunctions.entity["InventorySpawner"](scene,"inventario",{z:c_z,y:c_y}))
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
  $(document).click((event) => { 
    /*if(inventoryShowing == 0) {
      const inventoryOffsets = { w: 1, d:1, h:0.3 };
      const raycaster = scene.physics.add.raycaster('closest');
      const v3 = new THREE.Vector3();
      let {x,y,z} = camera.getWorldDirection(v3);
      raycaster.setRayFromWorld(x,y,z);
      raycaster.setRayToWorld(x2,y2,z-10);
      //console.log(theta);
      const material = new THREE.LineBasicMaterial({ color: 0x0000ff })
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x,y,z+10),
        new THREE.Vector3(x2,y2,z)
      ])
      const line = new THREE.Line(geometry, material)
      scene.scene.add(line)
      const keys = Object.keys(scene.entityManager.entities.list);
      console.log(keys);
      //raycaster.setFromCamera( mouse, camera );
      //console.log(scene);
      //const intersects = raycaster.intersectObjects( scene.scene.children );
      //console.log(intersects);
    } */
    player.use();
  });
});