import {FiniteStateMachine} from "./FiniteStateMachine.js";
import {spawners, weaponOffsets} from "./Spawner.js";
export {Entity, PhysEntity, ArmedEntity, Item, PlayerEntity, EntityManager}

class Entity {
    constructor(parent, name, model, x = 0, y = 0, z = 0) {
        this.__parent = parent; //Sarebbe la MainScene
        this.__name = name;
        this.__model = model; //ExtendedObject3D (senza fisica)
        this.__model.position.set(x,y,z);
        this.__model.name = "object3D_" + name;
        this.__finiteStateMachine = new FiniteStateMachine(this);
        this.__inventory = null;     //inventory
        this.__manager = null; //Entity Manager
    }
    load() {
       this.__parent.add.existing(this.model); //Aggiungiamo la mesh alla scena
    }
    destroy() {
        this.model.clear();
        return this.inventory;
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
    setPosition(x,y,z) { this.model.position.set(x,y,z); }
    /* Finite State Machine */
    get FiniteStateMachine() { return this.__finiteStateMachine; }
    get states() { // Interfaccia esterna
        return {
            add: (stateName,ifStopState,audio) => { this.__addState(stateName,ifStopState,audio); },
            set: (stateName) => { this.__setState(stateName); },
            get: (stateName) => { return this.__getState(stateName); },
            current: this.FiniteStateMachine.states.current,
            list: this.FiniteStateMachine.states.list()
        }
    } 
    __addState(stateName,ifStopState,audio) { this.FiniteStateMachine.states.add(stateName,ifStopState,audio); }
    __setState(stateName) { this.FiniteStateMachine.states.set(stateName); }
    __getState(stateName) { return this.FiniteStateMachine.states.get(stateName); }
    /* Getters e setters*/
    set inventory (inv) { this.__inventory = inv; }
    get inventory() { return this.__inventory; }
    set manager(m) { this.__manager = m; }
    get manager() { return this.__manager; }
    get model() { return this.__model; }
    get name() { return this.__name; }
    get animations() { return this.__model.animation; }
    get parent() { return this.__parent; }
}

class PhysEntity extends Entity {
    constructor({parent, name, model, x = 0, y = 0, z = 0, collisionFlag = 0, physConfig = {compounds = null, mass = 1, offset = {x = 0, y = 0, z = 0} = {}} = {}, maxHealth = -1, health = 0, inventory = null} = {}) { 
        super(parent,name,model,x,y,z);
        this.__maxHealth = maxHealth; //float
        this._health = health; //float
        /* Physics stuff */
        this.__collisionFlag = collisionFlag; //int 
        this.__physConfig = physConfig; //PhysConfing -> Ha le informazioni per l'instanziazione del body
        this._destroyedBy = null;
    }
    /* Fisica */
    load() {
        super.load();
        const physConf = this.__physConfig;
        this.__parent.physics.add.existing(this.model, {compound:physConf.compounds, offset:physConf.offset, mass:physConf.mass});
        this.body.setCollisionFlags(this.__collisionFlag);
    }
    destroy() {
        this.__parent.physics.destroy(this.__model);
        return super.destroy();
    }
    get body() { return this.model.body; }
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
    /* hit & health */
    hit(item) {
        this._health -= item.damage;
        this._destroyedBy = item.user;
    }
    get destroyedBy() { 
        if(!this.isAlive) 
            return this._destroyedBy;
    }
    get health() { return this._health; }
    get isAlive() { return !(this.__maxHealth >= 0 && this._health < 0); }
}

class ArmedEntity extends PhysEntity { //Wrapper per entità che possono equipaggiare degli item
    constructor({parent, name, model, x = 0, y = 0, z = 0, collisionFlag = 0, physConfig = {compounds = null, mass = 1, offset = {x = 0, y = 0, z = 0} = {}} = {}, maxHealth = -1, health = 0} = {}) { 
        super({parent:parent,name:name,model:model,x:x,y:y,z:z,collisionFlag:collisionFlag,physConfig:physConfig,maxHealth:maxHealth,health:health});
        this._equipped = {index: -1, weapon: null, using: 0}; //L'indice nell'inventario, la weapon entity e il suo use status
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
    static get useStatusStates() {
        return {
            no: 0,
            first:1,
            ongoing:2
        };
    }             
    use() {
        if(this._equipped.using == ArmedEntity.useStatusStates.no) {
            this._equipped.using = ArmedEntity.useStatusStates.first;
            setTimeout(()=>{this._equipped.using = ArmedEntity.useStatusStates.no}, this._equipped.weapon.useTime);
        }
    }
    equip(index) { 
        if(this.inventory.items.at(index).equippable && this._equipped.using == ArmedEntity.useStatusStates.no) {
            this._equipped.index = index;
            this.__loadEquipped(this);
        }
        else console.warn("Item non equipaggiabile");
    }
    /* unequip() { //Vedere attentamente sta funzione
        if(this._equipped.weapon != null) {
            this._equipped.weapon.destroy();
            console.log(this._equipped.weapon);
            this._equipped.index = -1;
        }
    } */
    get usingItem() { return this._equipped.using; }
    set usingItem(s) { this._equipped.using = s; }
    get equippedItem() { return this._equipped.weapon; }
    __loadEquipped() { //Private, serve al load dell'item
        let item = this.inventory.items.at([this._equipped.index]);
        const x = this.model.position.x + weaponOffsets[item.name].x;
        const y = (this.model.position.y / 2) + weaponOffsets[item.name].y;
        const z = (this.model.position.z / 2) + weaponOffsets[item.name].z;
        this._equipped.weapon = this.manager.entities.add(spawners.item[item.name](this.__parent,"weapon-" + item.name + "-"+ this.__name, {x:x, y:y, z:z}));
        this._equipped.weapon.user = this;
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
    destroy() {
        //codice per dire che sei morto con comando per respawnare
        super.destroy();
    }
    __loadEquipped() {
        super.__loadEquipped();
        $(".inventoryItem").eq(this._equipped.index).html($(".inventoryItem").eq(this._equipped.index).html() + "(E)");
    }
}

class Item {
    constructor(entity, damage = 0, useTime = 0) {
        this._entity = entity; //PhysEntity
        this.__damage = damage;
        this._onCollision = (otherObj,event) => {}; //function pointer
        this._user = null; //Armed Entity
        this.__useTime = useTime;
    }
    destroy() { this._entity.destroy(); }
    load() { 
        this._entity.load(); 
        this._entity.body.on.collision((otherObj,event) => {this._onCollision(otherObj,event);});
    }
    set user (u) { this._user = u; }
    get user() { return this._user; }
    get useTime () { return this.__useTime; }
    get damage() { return this.__damage; }
    get name() { return this._entity.name; }
    get entity() { return this._entity; }
    get body() { return this._entity.body; }
    get model() { return this._entity.model; }
    get FiniteStateMachine() { return this._entity.FiniteStateMachine; }
    get states() { return this._entity.states; }
    set onCollision(callback) { this._onCollision = callback; }
    get onCollision() { return this._onCollision; }
    get isAlive() { return true; }
    //spth.gob.es
}


class EntityManager {
    constructor(parent = null) {
        this.__parent = parent;
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
            remove: (entityName) => {
                if (entityName in this._entities) {
                    let obj = this._entities[entityName];
                    const {x,y,z} = obj.model.position;
                    const scene = obj.parent;
                    const inv = obj.destroy();
                    delete this._entities[entityName]; //eliminiamo la proprietà
                    if(inv != null) { 
                        let newInventory = this.entities.add(spawners.entity["Inventory"](scene,"inventory",{x:x,y:y+2,z:z}));
                        newInventory.inventory = inv;
                        newInventory.load();
                    }
                }
                else 
                    console.error("Quest non presente nel manager");
            },
            entity: (entityName) => {
                if (entityName in this._entities)
                    return this._entities[entityName];
                else 
                    console.error("Quest non presente nel manager");
            },
            list: this._entities
        };
    }
    update() {
        const keys = Object.keys(this._entities);
        for(let name of keys) {
            if(!this._entities[name].isAlive) {
                this.__parent.questManager.update();
                this.entities.remove(name);
            }
        }
    }
}


                
  
