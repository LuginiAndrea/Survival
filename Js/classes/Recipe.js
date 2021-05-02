import {createInventoryItem} from "./Inventory.js";
import {spawners} from "./Spawner.js";
export {RecipeManager, Recipes} 

class Recipe {
    constructor(nameItem1, stacksItem1, nameItem2, stacksItem2, nameResultingItem, stacksResultingItem, physical = false) {
        this.__item1 =  {name: nameItem1, stacks: stacksItem1};
        this.__item2 =  {name: nameItem2, stacks: stacksItem2};
        this.__resultingItem =  {name: nameResultingItem, stacks: stacksResultingItem, physic: physical};
        this._manager = null;
    }
    isValid(item1, item2) {
        return ((item1.name == this.__item1.name && item1.stacks.get >= this.__item1.stacks &&
                 item2.name == this.__item2.name && item2.stacks.get >= this.__item2.stacks) || 
                (item1.name == this.__item2.name && item1.stacks.get >= this.__item2.stacks &&
                 item2.name == this.__item1.name && item2.stacks.get >= this.__item1.stacks));
    }
    get resulting() { return this.__resultingItem; }
    getHtmlElement(n) {
        let li = document.createElement("li");
        let btn = document.createElement("button");
        btn.textContent = (this.__item1.name + ": " + this.__item1.stacks + " + " 
                       + this.__item2.name + ": " + this.__item2.stacks 
                       + " -> " + this.__resultingItem.name + ": " +this.__resultingItem.stacks);
        btn.value = this.__resultingItem.name;
        btn.classList.add("recipe");
        li.append(btn);
        return li;
    }
    craft(inventory, index1, index2) {
        inventory.items.drop(index1, this.__item1.stacks);
        inventory.items.drop(index2, this.__item2.stacks);
        if(this.__resultingItem.physic) { //Spawn dell'entità fisica
            let scene = this._manager.parent;
            scene.entityManager.entities.add(spawners.entity[this.__resultingItem.name](scene, this.__resultingItem.name, 
                                                                                        {x: scene.player.model.position.x, 
                                                                                        y:scene.player.model.position.y+3, 
                                                                                        z:scene.player.model.position.z-15}
                                                                                        ));
        }
        else { ///se non è un item
            let item = createInventoryItem[this.__resultingItem.name](this.__resultingItem.stacks);
            inventory.items.add(item);
        }
    }
    set manager(m) { this._manager = m; }
    get manager() { return this._manager; }
    get name() { return this.__resultingItem.name; }
}
class RecipeManager {
    constructor(parent) {
        this.__parent = parent;
        this._recipes = {};
    }
    get recipes() {
        return {
            add: (recipe) => { 
                recipe.manager = this;
                this._recipes[recipe.name] = recipe; 
            },
            remove: (recipeName) => { 
                if(recipeName in this._recipes)
                    delete this._recipes[recipeName];
                else 
                    console.error("Ricetta non presente nel manager");
            },
            get: (recipeName) => {
                if (recipeName in this._recipes)
                    return this._recipes[recipeName];
                else 
                    console.error("Ricetta non presente nel manager");
            },
            list: this._recipes
        };
    }
    get htmlElement() {
        const keys = Object.keys(this._recipes);
        let list = document.createElement("ul");
        let counter = 0;
        for(let name of keys) {
            list.append(this._recipes[name].getHtmlElement(counter));
            counter++;
        }
        return list;
    }
    get parent() { return this.__parent; }
}


const Recipes = Object.freeze({
    cookedApple: new Recipe("Apple",1,"Bonfire",1,"CookedApple",1),
    cookedMeat: new Recipe("Meat",1,"Bonfire",1,"CookedMeat",1),
    Bonfire: new Recipe("Stone",2,"Wood",2,"Bonfire",1),
    ChefCuisine: new Recipe("CookedApple",2,"CookedMeat",1,"ChefCuisine",2),
    Table: new Recipe("Wood",4,"Stone",1,"Table",1,true)
});


/* Materiali base:
    --> Legno
    --> Roccia
    --> Mela
    --> Carne
*/     

/* Ricette: 
    --> Tavolo = 5 Legno + 1 pietra ---> Farla come physEntity
    --> Tavolo in pietra = 4 pietre + 1 legno  ---> Farla come physEntity
    --> Carne cotta = 1 falò + 1 carne 
    --> Falò = 2 pietre + 4 legne
    --> Mela cottà = 1 falò + 1 mela
    --> Piatto da chef = 1 carne + 4 mela
*/