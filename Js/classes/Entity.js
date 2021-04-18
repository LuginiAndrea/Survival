import {FiniteStateMachine} from "./FiniteStateMachine.js";
import {SpawnFunctions} from "../game.js";
export {Entity, PhysEntity, ArmedEntity, Item}

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
    get states() { // Interfaccia esterna
        return {
            add: (stateName,ifStopState) => { this.__addState(stateName,ifStopState); },
            set: (stateName) => { this.__setState(stateName); },
            get: (stateName) => { return this.__getState(stateName); },
            current: this.FiniteStateMachine.states.current,
            list: this.FiniteStateMachine.states.list()
        }
    } 
    __addState(stateName,ifStopState) { //Queste rimangono per motivi di ereditarietà
        this.FiniteStateMachine.states.add(stateName,ifStopState);
    }
    __setState(stateName) {
        this.FiniteStateMachine.states.set(stateName);
    }
    __getState(stateName) {
        return this.FiniteStateMachine.states.get(stateName);
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
        this._equipped = {index: null, weapon: null}; //L'indice nell'inventario, la weapon entity
    }
    destroy() {
        if(this.equippedItem != null) this.equippedItem.destroy();
        return super.destroy();
    }
    /* Equipped items */
    equip(index) { //Aggiungerli sotto un get inventory? Boh
        if(this.inventory.items.at(index).equippable) {
            this._equipped.index = index;
            this.__loadEquipped();
        }
        else console.warn("Item non equipaggiabile");
    }
    get equippedItem() {
        return this._equipped.weapon;
    }
    __loadEquipped() { //Private, serve al load dell'item
        let item = this.inventory.items.at([this._equipped.index]);
        this._equipped.weapon = SpawnFunctions[item.name + "Spawner"](this.__parent,"weapon-" + item.name + "-"+ this.__name, {x:this.model.position.x, y:this.model.position.y / 2, z:this.model.position.z / 2});
        this._equipped.weapon.load();
        this.__parent.physics.add.constraints.fixed(this.body, this._equipped.weapon.body); //lega i due oggetti
    }
    //setState(stateName) { //Setta lo state a entrambi (Devono avere lo stesso nome!)
        //super.setState(stateName);
        /*Bisogna implementare gli stati degli item equipaggiabbili this._equipped.physEnt.setState(stateName); */
    //}
}
class Item {
    constructor(entity, damage = 0) {
        this._entity = entity;
        this._damage = damage;
    }
    destroy() { this._entity.destroy(); }
    load() { this._entity.load(); }
    get body() { return this._entity.body; }
    get model() { return this._entity.model; }
    get FiniteStateMachine() { return this._entity.FiniteStateMachine; }
    get states() { return this._entity.states; }
}
