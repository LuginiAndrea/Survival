import {FiniteStateMachine} from "./FiniteStateMachine.js";
import {SpawnFunctions} from "../game.js";
export {Entity, PhysEntity, ArmedEntity}

class Entity {
    constructor(parent, name, model, x = 0, y = 0, z = 0) {
        this.__parent = parent; //Sarebbe la MainScene
        this.__name = name;
        this.__model = model;//ExtendedObject3D (senza fisica)
        this.__model.position.set(x,y,z);
        this.__model.name = "object3D_" + name;
        this.__finiteStateMachine = new FiniteStateMachine(this);
        this.__inventory = null;     // Type inventory
    }
    load() {
       this.__parent.add.existing(this.model); //Aggiungiamo la mesh alla scena
    }
    /* Distruttore */
    destroy() {
        this.model.clear();
        return this.inventory;
    }
    /* Getters */
    get model() {
        return this.__model;
    }
    get name() {
        return this.__name;
    }
    get animations() {
        return this.__model.animation;
    }
    /* Trasformazioni 3D */
    rotate(degX, degY, degZ) {
        degX = degX * Math.PI / 180;
        degY = degY * Math.PI / 180;
        degZ = degZ * Math.PI / 180;
        this.model.rotateX(degX);
        this.model.rotateY(degY);
        this.model.rotateZ(degZ);
    }
    setPosition(x,y,z) {
        this.model.position.set(x,y,z);
    }
    /* Finite State Machine */
    get FiniteStateMachine() {
        return this.__finiteStateMachine;
    }
    addState(stateName,ifStopState) {
        this.FiniteStateMachine.addState(stateName,ifStopState);
    }
    setState(stateName) {
        this.FiniteStateMachine.setState(stateName);
    }
    get currentState() {
        return this.FiniteStateMachine.currentState;
    }
    getState(stateName) {
        return this.FiniteStateMachine.getState(stateName);
    }
    /* Inventario */
    set inventory (inv) {
        this.__inventory = inv;
    }
    get inventory() {
        return this.__inventory;
    }
}

class PhysEntity extends Entity {
    constructor({parent, name, model, x = 0, y = 0, z = 0, collisionFlag = 0, physConfig = {compounds = null, mass = 1, offset = {x = 0, y = 0, z = 0} = {}} = {}, maxHealth = 0, health = 0, inventory = null} = {}) { 
        super(parent,name,model,x,y,z);
        this.__maxHealth = maxHealth; //float
        this._health = health; //float
        /* Physics stuff */
        this.__collisionFlag = collisionFlag; //int 
        this.__physConfig = physConfig; //PhysConfing -> Ha le informazioni per l'instanziazione del body
    }
    load() {
        super.load();
        const physConf = this.__physConfig;
        this.__parent.physics.add.existing(this.model, {compound:physConf.compounds, offset:physConf.offset, mass:physConf.mass});
        this.body.setCollisionFlags(this.__collisionFlag);
    }
    /* Distruttore */
    destroy() {
        this.__parent.physics.destroy(this.__model);
        return super.destroy();
    }
    /* Getters */
    get health() {
        return this._health;
    }
    get body() {
        return this.model.body;
    }
    get model() {
        return this.__model;
    }

    /* Trasformazioni 3D */
    move(forward, side, upward) { 
        let cosZ = Math.cos(this.model.world.theta);
        let sinZ = Math.sin(this.model.world.theta);
        if(forward != 0) {
            this.body.setVelocityZ(forward * -cosZ); //Avanti e dietro
            this.body.setVelocityX(forward * -sinZ);
        }
        else if(side != 0) {
            this.body.setVelocityZ(side * -sinZ); //Destra e sinistra
            this.body.setVelocityX(side * cosZ);
        }
        if(upward != 0)
            this.body.setVelocityY(upward); //Verticale
    }
    rotate(degX, degY, degZ) {
        this.body.setAngularVelocityX(degX);
        this.body.setAngularVelocityY(degY);
        this.body.setAngularVelocityZ(degZ);   
    }
    /*setPosition(x = 0, y = 0, z = 0) { //Solo per kinematic bodies --> Visto che non funzionano i kinematic, togliere?
        super.setPosition(x,y,z);
        this.body.needUpdate = true;
    }*/
}

class ArmedEntity extends PhysEntity { //Wrapper per entità che possono equipaggiare degli item
    constructor({parent, name, model, x = 0, y = 0, z = 0, collisionFlag = 0, physConfig = {compounds = null, mass = 1, offset = {x = 0, y = 0, z = 0} = {}} = {}, maxHealth = 0, health = 0} = {}) { 
        super({parent:parent,name:name,model:model,x:x,y:y,z:z,collisionFlag:collisionFlag,physConfig:physConfig,maxHealth:maxHealth,health:health});
        this._equipped = {index: null, weapon: null}; //L'indice nell'inventario, l'entità fisica
    }
    destroy() {
        if(this.equippedItem != null) this.equippedItem.destroy();
        return super.destroy();
    }
    /* Equipped items */
    __loadEquipped() { //Private, serve al load dell'item
        let item = this.inventory.items[this._equipped.index];
        this._equipped.weapon = SpawnFunctions[item.name + "Spawner"](this.__parent,"weapon-" + item.name + "-"+ this.__name, {x:this.model.position.x, y:this.model.position.y / 2, z:this.model.position.z / 2});
        this._equipped.weapon.load();
        this.__parent.physics.add.constraints.fixed(this.body, this._equipped.weapon.body); //lega i due oggetti
    }
    equip(index) {
        if(this.inventory.items[index].equippable) {
            this._equipped.index = index;
            this.__loadEquipped();
        }
        else console.warn("Item non equipaggiabile");
    }
    get equippedItem() {
        return this._equipped.weapon;
    }
    setState(stateName) { //Setta lo state a entrambi (Devono avere lo stesso nome!)
        super.setState(stateName);
        /*Bisogna implementare gli stati degli item equipaggiabbili this._equipped.physEnt.setState(stateName); */
    }
}

class WeaponEntity extends PhysEntity { //Wrapper semplice semplice  ---> Le WeaponEntity Non hanno inventari (Anzichè ereditarla gestiral come un contenitore di physEnt?)
    constructor({parent, name, model, x = 0, y = 0, z = 0, collisionFlag = 0, physConfig = {compounds = null, mass = 1, offset = {x = 0, y = 0, z = 0} = {}} = {}, maxHealth = 0, health = 0, offset = {x = 0, y = 0, z = 0} = {}, damage = 0} = {}) {
        super({parent:parent,name:name,model:model,x:x,y:y,z:z,collisionFlag:collisionFlag,physConfig:physConfig,maxHealth:maxHealth,health:health});
        this._damage = damage;
    }
    destroy() {super.destroy(); return null;} // Le Weapon Entity non ritornano inventari
}

