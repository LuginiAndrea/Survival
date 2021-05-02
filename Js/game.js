export {setLastInventory}
import {spawners, DROP_OFFSET} from "./classes/Spawner.js";
import {QuestManager} from "./classes/Quest.js";
import {PlayerEntity, ArmedEntity, EntityManager } from "./classes/Entity.js";
import {Light} from './classes/AmbientLight.js';
import { Inventory } from "./classes/Inventory.js";
import { RecipeManager, Recipes } from "./classes/Recipe.js";
const {ExtendedMesh, Project, Scene3D, PhysicsLoader, ExtendedObject3D,  ThirdPersonControls, PointerLock, PointerDrag} = ENABLE3D;



const MAX_PRESS_COUNTER = 40;
var player;
var scene;
var lastInventory = null;
const setLastInventory = (i) => { lastInventory = i; };
/*Globali inventario*/
var selectedItemTmp1 = -1; //Item selezionato dall'inventario di scambio 1
var selectedItemTmp2 = -1; //Item selezionato dall'inventario di scambio 2
var selectedItem = 0; //Item selezionato dall'inventario
var inventoryShowing = 0; // 0 no, 1 si, 2 sta mostrando il tmpInventory 
/*Globali fisica*/
const WALK_SPEED = -15;
const SIDE_STEP_SPEED = -9;
const RUN_SPEED = -20;
const JUMP_SPEED = 10; 
const NULL_SPEED = 0;
const JUMP_OFFSET = 0.14391;
var generatedMobs = false;

/* ------------------------------ INIZIO MAIN SCENE --------------------------- */

class MainScene extends Scene3D {
  constructor() {
    super('MainScene');
    scene = this;
    this.entityManager = new EntityManager(this); //Array di tutte le entità 
    this.player = null; //Il player
    this.questManager = new QuestManager(this);
    this.recipeManager = new RecipeManager(this);
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
      t: { status: false, counter: 0 }, //Counter ha lo stesso scopo in modo leggermente diverso
      e: false,
      g: false,
      v: { status: false, change: false },
      one: false
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
        case 't' : { this.keys.t.status = status; break; }
        case 'e' : { this.keys.e = status; break; }
        case 'g' : { this.keys.g = status; break; }
        case 'v': { this.keys.v.status = status; break; }
        case '1': { this.keys.one = status; break; }
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
    $("#CraftingMenu").hide();
    $("#Pog").hide();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowSide = THREE.CullFaceBack;

    this.camera.far = 1000000;
    this.camera.near = 0.1;
} 

 async preload() {
    console.log('preload');
    this.warpSpeed("-ground", "-sky");
    //this.physics.debug.enable();
    this.camera.fov=90;
    this.camera.updateProjectionMatrix();
    await preLoad(this);  
    this.sounds["background"].play();
  }

  async create() {
    /* Base physics setup */
    console.log('create');
    /*Player Loading*/
    this.player = this.entityManager.entities.add(spawners.entity["Player"](this,"player"));
    this.player.body.setDamping(0.8,0.8); //Evita il "moonwalking"
    this.player.jump = {status:false, oldY: -8.5, pressed: false}; 
    this.player.__model.body.setGravity(0, -15, 0);
    this.player.__model.body.setCcdMotionThreshold(3.5);
    this.player.__model.body.setCcdSweptSphereRadius(0.7);
    player = this.player;
    lastInventory = this.player.inventory;
    /*Quest Loading*/
    this.questManager.quests.add(spawners.quests["moveQuest"](this));
    this.questManager.quests.add(spawners.quests["invQuest"](this));
    this.questManager.quests.add(spawners.quests["destroyQuest"](this));
    this.questManager.quests.add(spawners.quests["completeAll"](this,player));
    /*Recipes Loading*/
    this.recipeManager.recipes.add(Recipes["cookedApple"]);
    this.recipeManager.recipes.add(Recipes["cookedMeat"]);
    this.recipeManager.recipes.add(Recipes["Bonfire"]);
    this.recipeManager.recipes.add(Recipes["ChefCuisine"]);
    this.recipeManager.recipes.add(Recipes["Table"]);
    
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

    /*Illuminazione, cielo, giorno/notte*/
    this.light = new Light(this.scene, this.renderer, 8500);
    
    /*Caricamento mappa e texture terreno*/
    const grassTexture = new THREE.TextureLoader().load("../Resources/Textures/grass.png");
    const dirtTexture = new THREE.TextureLoader().load("../Resources/Textures/dirt.jpg");
    
    let material = THREE.Terrain.generateBlendedMaterial([ //Materiale composto da più texture che si combinano a certe altezze del terreno
      {texture: grassTexture},
      {texture: dirtTexture, levels: [20, 20, 95, 110]}
    ]);
    
    let terrainScene = THREE.Terrain({
      easing: THREE.Terrain.Linear,
      smoothing: "none",
      frequency: 3,
      heightmap: THREE.Terrain.PerlinDiamond,
      material: material,
      maxHeight: 290,
      minHeight: 20,
      steps: 9,
      useBufferGeometry: true,
      xSegments: 90,
      xSize: 8192,
      ySegments: 90,
      ySize: 8192,
    });
    
    terrainScene.receiveShadow = true;
    terrainScene.children[0].receiveShadow = true;
    
    this.scene.add(terrainScene);
    terrainScene.name = "Terreno";
    this.physics.add.existing(terrainScene, { shape: 'concaveMesh', mass: Number.MAX_SAFE_INTEGER});
    terrainScene.body.setCollisionFlags(2);
    terrainScene.body.physics.gravity.y = -9.28;

    /*Generazione alberi*/
    let i = 0;
    let positionX, positionZ, chosenTree, tree;

    while(i < 70) {
      positionX = (Math.floor(Math.random() * 8192)) - 4096;
      positionZ = (Math.floor(Math.random() * 8192)) - 4096;

      chosenTree = Math.floor(Math.random() * ((6 - 1) + 1)) + 1;

      switch(chosenTree) {
        case 1: {
          tree = this.entityManager.entities.add(spawners.entity["Tree1"](this,"tree",{x: positionX, z: positionZ}));
        }

        case 2: {
          tree = this.entityManager.entities.add(spawners.entity["Tree2"](this,"tree",{x: positionX, z: positionZ}));
        }

        case 3: {
          tree = this.entityManager.entities.add(spawners.entity["Tree3"](this,"tree",{x: positionX, z: positionZ}));
        }

        case 4: {
          tree = this.entityManager.entities.add(spawners.entity["Tree4"](this,"tree",{x: positionX, z: positionZ}));
        }

        case 5: {
          tree = this.entityManager.entities.add(spawners.entity["Tree5"](this,"tree",{x: positionX, z: positionZ}));
        }

        case 6: {
          tree = this.entityManager.entities.add(spawners.entity["Tree6"](this,"tree",{x: positionX, z: positionZ}));
        }
      }
      i++;
    }
  }

  update() {
    if(this.repeatRender()) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    } 

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
        $("#CraftingMenu").hide();
        this.keys.r.change = false;
        if(inventoryShowing == 0) { inventoryShowing = 1; }
        else { inventoryShowing = 0; }
      } 
    }       
    else this.keys.r.change = true;

    if(this.keys.e) {
      if(selectedItem != -1) this.player.equip(selectedItem);
    }

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

    if(this.keys.v.status) {
      if(this.keys.v.change) {
        this.keys.v.change = false;
        $("#tmpInv1").toggle();
        $("#tmpInv2").toggle();
        if(inventoryShowing == 0) {
          inventoryShowing = 2;
          this.player.inventory.displayToTmp(1);
          lastInventory.displayToTmp(2);
        }
        else inventoryShowing = 0;
      }
    }
    else this.keys.v.change = true;

    if(this.keys.enter.status) { 
      if(this.keys.enter.change) {
        this.keys.enter.change = false;
        if(inventoryShowing == 2) { //Se siamo nella tmp Inventory view
          if(selectedItemTmp1 != -1) 
            Inventory.moveFromInventory(this.player.inventory,lastInventory,selectedItemTmp1,1);
          else if(selectedItemTmp2 != -1)
            Inventory.moveFromInventory(lastInventory,this.player.inventory,selectedItemTmp2,1);
          this.player.inventory.displayToTmp(1);
          lastInventory.displayToTmp(2);
          if(selectedItemTmp1 != -1) $("#tmpInv1").children().children().eq(selectedItemTmp1).css("background-color","red");
          else if(selectedItemTmp2 != -1) $("#tmpInv2").children().children().eq(selectedItemTmp2).css("background-color","red");
        }
      }
    }
    else this.keys.enter.change = true;

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

    if(this.player._equipped.weapon != null) {
      const _index = this.player._equipped.index;
      $(".inventoryItem").eq(_index).html(this.player.inventory.items.at(_index).stacks.get + "(E)");
    }


    if(generatedMobs == false) {
      generateMobs(this);
      generatedMobs = true;
    }
  }

  repeatRender() {
    const canvas = this.renderer.domElement;
    
    if((canvas.width != canvas.clientWidth) || (canvas.height != canvas.clientHeight)) {
      this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      return false;
    }

    return true;
  }
}
// load from '/lib/ammo/kripken' or '/lib/ammo/moz'
PhysicsLoader('/lib/ammo/moz', () => new Project({ scenes: [MainScene], antialias:true }));

/* ------------------------------ FINE MAIN SCENE --------------------------- */
/* --------------------------- Inizio ADDERS ------------------------ */
async function preLoad(mainScene) {
  /*Model load*/
  mainScene.load.preload("inventory", "../Resources/Models/Inventory/scene.gltf");
  mainScene.load.preload("player","../Resources/Models/Protagonista/Protagonista.glb"); 
  mainScene.load.preload("truck", "../Resources/Models/Truck/scene.gltf");
  mainScene.load.preload("sword","../Resources/Models/Sword/Sword.glb");
  mainScene.load.preload("table","../Resources/Models/myTable/table.gltf");
  mainScene.load.preload("tree1", "../Resources/Models/trees/albero1.glb");
  mainScene.load.preload("tree2", "../Resources/Models/trees/albero2.glb");
  mainScene.load.preload("tree3", "../Resources/Models/trees/albero3.glb");
  mainScene.load.preload("tree4", "../Resources/Models/trees/albero4.glb");
  mainScene.load.preload("tree5", "../Resources/Models/trees/albero5.glb");
  mainScene.load.preload("tree6", "../Resources/Models/trees/albero6.glb");

  /*Mob model load*/
  mainScene.load.preload("animal1", "../Resources/Models/Animals/Cow.glb")
  mainScene.load.preload("animal2", "../Resources/Models/Animals/Horse.glb")
  mainScene.load.preload("animal3", "../Resources/Models/Animals/Pig.glb")
  mainScene.load.preload("animal4", "../Resources/Models/Animals/Sheep.glb")
  mainScene.load.preload("animal5", "../Resources/Models/Animals/Zebra.glb")

  /*Audio load*/
  await mainScene.audio.load("noSound","../Resources/Audio/noSound", "mp3", "ogg");
  await mainScene.audio.load('playerWalk', '../Resources/Audio/Protagonista/playerWalk', 'wav', 'ogg');
  await mainScene.audio.load('LessGo', '../Resources/Audio/Protagonista/LessGo', 'mp3', 'ogg');
  await mainScene.audio.load("playerRun","../Resources/Audio/Protagonista/playerRun", "mp3", "ogg");
  await mainScene.audio.load("background", "../Resources/Audio/backgroundSound", "mp3", "ogg");
  await mainScene.audio.load("Clang","../Resources/Audio/clang", "wav", "ogg");
  mainScene.sounds["noSound"] = await mainScene.audio.add("noSound");
  mainScene.sounds["playerWalk"] = await mainScene.audio.add("playerWalk");
  mainScene.sounds["playerRun"] = await mainScene.audio.add("playerRun");
  mainScene.sounds["background"] = await mainScene.audio.add("background");
  mainScene.sounds["lessGo"] = await mainScene.audio.add("LessGo");
  mainScene.sounds["Clang"] = await mainScene.audio.add("Clang");
  mainScene.sounds["background"].setVolume(0.05);
  mainScene.sounds["playerWalk"].setVolume(0.3);
  mainScene.sounds["lessGo"].setVolume(0.2);
  mainScene.sounds["Clang"].setVolume(1);
}
function generateMobs(scene) {
  let positionX, positionZ;
  let chosenMob;
  let i = 0;
  
  let mobs = [];

  while(i < 40) {
    positionX = rando(-4096, 4096);
    positionZ = rando(-4096, 4096);
  
    chosenMob = Math.floor(Math.random() * ((5 - 1) + 1)) + 1;
    switch(chosenMob) {
      case 1: {
        mobs.push(scene.entityManager.entities.add(spawners.entity["Animal1"](scene,"animal",{x: positionX, z: positionZ})));
      }
  
      case 2: {
        mobs.push(scene.entityManager.entities.add(spawners.entity["Animal2"](scene,"animal",{x: positionX, z: positionZ})));
      }
  
      case 3: {
        mobs.push(scene.entityManager.entities.add(spawners.entity["Animal3"](scene,"animal",{x: positionX, z: positionZ})));
      }
  
      case 4: {
        mobs.push(scene.entityManager.entities.add(spawners.entity["Animal4"](scene,"animal",{x: positionX, z: positionZ})));
      }
  
      case 5: {
        mobs.push(scene.entityManager.entities.add(spawners.entity["Animal5"](scene,"animal",{x: positionX, z: positionZ})));
      }
    }

    i++;
  }

  for(let mob of mobs) {
    setTimeout(function() {
      mob.states.set("Idle");
    }, 300);
  }
}



/* --------------------------- FINE ADDERS ------------------------ */
function dropItem(scene,inv,index,{c_x = 0,c_y = 0,c_z = 0} = {},stacks = null) {
  let newInv = inv.items.drop(index,stacks);
  let invObj = scene.entityManager.entities.add(new spawners.entity["Inventory"](scene,"inventario",{z:c_z,y:c_y}))
  invObj.inventory = newInv;
  lastInventory = invObj.inventory;
  return invObj;
}
/* ----------------- Inizio gestori mouse ----------------- */
$(document).ready(() => {
  /* Inventari */
  $(".inventoryItem").on("click", (event) => { //Selezionare un item dell'inventario
    $(".inventoryItem").css("border-color","white");
    const index = event.target.getAttribute("data-n");
    $("#insideCraftingMenu").html("");
    $("#CraftingMenu").hide();
    if(index == selectedItem) { 
      selectedItem = -1;
      selectedItemTmp1 = -1;
      selectedItemTmp2 = -1;
      player.craftingStatus = PlayerEntity.craftingStatuses.no;
      return;
    }
    else if(index == selectedItemTmp1) {
      selectedItemTmp1 = -1;
      selectedItemTmp2 = -1;
      player.craftingStatus = PlayerEntity.craftingStatuses.pickFirst;
    }
    else if(index == selectedItemTmp2) {
      selectedItemTmp2 = -1;
      PlayerEntity.craftingStatuses.pickSecond;
    }
    else {
      if(player.craftingStatus == PlayerEntity.craftingStatuses.no) {
        selectedItem = index;
        selectedItemTmp1 = -1;
        selectedItemTmp2 = -1;
      }
      else if(player.craftingStatus == PlayerEntity.craftingStatuses.pickFirst) {
        selectedItemTmp1 = index;
        player.craftingStatus = PlayerEntity.craftingStatuses.pickSecond;
        selectedItemTmp2 = -1;
      }
      else {
        player.craftingStatus = PlayerEntity.craftingStatuses.waitForCraft;
        selectedItemTmp2 = index;
        player.presentCraft(selectedItemTmp1,selectedItemTmp2);
      }
    }
    if(selectedItem != -1) $(".inventoryItem").eq(selectedItem).css("border-color","red");
    if(selectedItemTmp1 != -1) $(".inventoryItem").eq(selectedItemTmp1).css("border-color","Cyan");
    if(selectedItemTmp2 != -1) $(".inventoryItem").eq(selectedItemTmp2).css("border-color","yellow");    
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

  $("#insideCraftingMenu").on("click", "button", (event) => {
      const recipeName = event.target.value;
      const recipe = scene.recipeManager.recipes.get(recipeName);
      recipe.craft(player.inventory,selectedItemTmp1,selectedItemTmp2);
      player.craftingStatus = PlayerEntity.craftingStatuses.no;
      $(".inventoryItem").css("border-color","white");
      $("#CraftingMenu").hide();
      selectedItem = -1;
      selectedItemTmp1 = -1;
      selectedItemTmp2 = -1;
  });


  /* Altro */
  $(document).click((event) => { 
    player.use();
  });
});