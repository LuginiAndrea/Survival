import {FiniteStateMachine} from "./FiniteStateMachine.js";
import {spawners, weaponOffsets} from "./Spawner.js";
export {Entity, PhysEntity, ArmedEntity, Item, PlayerEntity, EntityManager}

class Entity {
    constructor(parent, name, model, x = 0, y = 0, z = 0) {
        this.__parent = parent; //Sarebbe la MainScene
        this.__name = name;
        this.__model = model;//ExtendedObject3D (senza fisica)
        this.__model.position.set(x,y,z);
        this.__model.name = "object3D_" + name;
        this.__finiteStateMachine = new FiniteStateMachine(this);
        this.__inventory = null;     // Type inventory
        this.__manager = null;
    }
    load() {
       this.__parent.add.existing(this.model); //Aggiungiamo la mesh alla scena
    }
    /* Distruttore */
    destroy() {
        this.model.clear();
        return this.inventory;
    }
    set manager(m) {
        this.__manager = m;
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
    get parent() {
        return this.__parent;
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
            add: (stateName,ifStopState,audio) => { this.__addState(stateName,ifStopState,audio); },
            set: (stateName) => { this.__setState(stateName); },
            get: (stateName) => { return this.__getState(stateName); },
            current: this.FiniteStateMachine.states.current,
            list: this.FiniteStateMachine.states.list()
        }
    } 
    __addState(stateName,ifStopState,audio) { //Queste rimangono per motivi di ereditarietà
        this.FiniteStateMachine.states.add(stateName,ifStopState,audio);
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
    setPosition(x = 0, y = 0, z = 0) { 
        super.setPosition(x,y,z);
        this.body.needUpdate = true;
    }
}

class ArmedEntity extends PhysEntity { //Wrapper per entità che possono equipaggiare degli item
    constructor({parent, name, model, x = 0, y = 0, z = 0, collisionFlag = 0, physConfig = {compounds = null, mass = 1, offset = {x = 0, y = 0, z = 0} = {}} = {}, maxHealth = 0, health = 0} = {}) { 
        super({parent:parent,name:name,model:model,x:x,y:y,z:z,collisionFlag:collisionFlag,physConfig:physConfig,maxHealth:maxHealth,health:health});
        this._equipped = {index: -1, weapon: null}; //L'indice nell'inventario, la weapon entity
    }
    destroy() {
        if(this.equippedItem != null) this.equippedItem.destroy();
        return super.destroy();
    }
    load() {
        super.load();
        this.equip(0);
    }
    /* Equipped items */
    equip(index) { //Aggiungerli sotto un get inventory? Boh
        if(this.inventory.items.at(index).equippable) {
            this._equipped.index = index;
            this.__loadEquipped();
        }
        else console.warn("Item non equipaggiabile");
    }
    /*unequip() { //Vedere attentamente sta funzione
        if(this._equipped.weapon != null) {
            this._equipped.weapon.destroy();
            console.log(this._equipped.weapon);
            this._equipped.index = -1;
        }
    }*/
    get equippedItem() {
        return this._equipped.weapon;
    }
    __loadEquipped() { //Private, serve al load dell'item
        let item = this.inventory.items.at([this._equipped.index]);
        const {x,y,z} = weaponOffsets[item.name];
        this._equipped.weapon = spawners.item[item.name](this.__parent,"weapon-" + item.name + "-"+ this.__name, {x:this.model.position.x+x, y:this.model.position.y / 2+y, z:(this.model.position.z / 2)+z});
        this._equipped.weapon.load();
        this.__parent.physics.add.constraints.lock(this.body, this._equipped.weapon.body); //lega i due oggetti
    }
    //setState(stateName) { //Setta lo state a entrambi (Devono avere lo stesso nome!)
        //super.setState(stateName);
        /*Bisogna implementare gli stati degli item equipaggiabbili this._equipped.physEnt.setState(stateName); */
    //}
}

class PlayerEntity extends ArmedEntity {
    /*unequip() {
        if(this._equipped.index >= 0 && this._equipped.index <= this.inventory.maxSize) {
            const newHtml = $(".inventoryItem").eq(this._equipped.index).html();
            newHtml = newHtml.substring(0,newHtml.length-3);
            $(".inventoryItem").eq(this._equipped.index).html(newHtml);
        }
        super.unequip();
    }*/
    __loadEquipped() {
        super.__loadEquipped("player");
        $(".inventoryItem").eq(this._equipped.index).html($(".inventoryItem").eq(this._equipped.index).html() + "(E)");
    }
}

class Item {
    constructor(entity, damage = 0) {
        this._entity = entity;
        this._damage = damage;
        this._onCollision = (otherObj,event) => {};
    }
    destroy() { this._entity.destroy(); }
    load() { 
        this._entity.load(); 
        this._entity.body.on.collision((otherObj,event) => {this._onCollision(otherObj,event);});
    }
    get entity() { return this._entity; }
    get body() { return this._entity.body; }
    get model() { return this._entity.model; }
    get FiniteStateMachine() { return this._entity.FiniteStateMachine; }
    get states() { return this._entity.states; }
    set onCollision(callback) { this._onCollision = callback; }
    get onCollision() { return this._onCollision; }
    //spth.gob.es
}


class EntityManager {
    constructor() {
        this._entities = {};
    }
    get entities() {
        return {
            add: (entity) => {
                this._entities[entity.name] = entity;
                this._entities[entity.name].manager = this;
                this._entities[entity.name].load();
                return this._entities[entity.name];
            },
            remove: (entityName, {c_x = 0,c_y = 0,c_z = 0} = {}) => {
                let obj = this._entities[entityName];
                const scene = obj.parent;
                const inv = obj.destroy();
                delete this._entities[entityName];
                if(inv != null) { 
                   let newInventory = this.entities.add(spawners.entity["Inventory"](scene,"inventory",{x:c_x,y:c_y,z:c_z}));
                   newInventory.inventory = inv;
                   newInventory.load();
                }
            },
            entity: (entityName) => {
                return this._entities[entityName];
            },
            list: this._entities
        };
    }
}

                
  
