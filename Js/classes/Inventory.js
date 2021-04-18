export {createInventoryItem,PlayerInventory, Inventory}

const createInventoryItem = {};
createInventoryItem["wood"] = createWoodItem;
createInventoryItem["sword"] = createSwordItem;
var imgPath = "../../Resources/Textures/";

/* ------------------------- Inizio classi ---------------------------*/
class InvItem {
    constructor({imgName = null, itemName = null, equippable = false, stacks = 0, maxStacks = 0} = {}) {
        this.__imgName = imgName;
        this.__itemName = itemName;
        this.__equippable = equippable;
        this._stacks = stacks;
        this.__maxStacks = maxStacks;
        if(this._stacks > this.__maxStacks) { 
            this._stacks = this.__maxStacks;
            console.warn("Non puoi dare più stack del numero massimo");
        }
    }
    copyItem(item) { //Copia
        this.__imgName = item.__imgName
        this.__itemName = item.__itemName
        this.__equippable = item.__equippable
        this._stacks = item._stacks
        this.__maxStacks = item.__maxStacks
    }
    /* Stacks */
    get stacks() { // ----> Interfaccia esterna
        return {
            get: () => { const s = this._stacks; return s; },
            set: (s) => { 
                if(s > this.__maxStacks) {
                    console.warn("Stacks maggiori del massimo, saranno settati al massimo");
                    s = this.__maxStacks;
                }
                this._stacks = s; 
            },
            add: (stacks) => { return this.__addStacks(stacks); }, 
            drop: (stacks) => { return this.__dropStacks(stacks); },
            dropAll: () => { this.__dropStacks(); }
        };
    }
    __addStacks(stack = 1) { 
        let remainingStacks = 0 //Gli stack che non sono stati presi (Se la capacità massima è stata raggiunta)
        this._stacks += stack
        if(this._stacks > this.__maxStacks) {
            remainingStacks = this._stacks - this.__maxStacks
            this._stacks = this.__maxStacks
        }
        return remainingStacks
    }
    __dropStacks(stack = this.__maxStacks) { 
        let dropStacks = 0 //Gli stack droppati
        if (this._stacks - stack < 0) {
            dropStacks = this._stacks
            this._stacks = 0
        }
        else {
            this._stacks -= stack
            dropStacks = stack
        }     
        return dropStacks   
    }
    /* Getters */
    get name() {
        return this.__itemName
    }
    get img () {
        return this.__imgName
    }
    get maxStacks() {
        return this.__maxStacks
    }
    get equippable() {
        return this.__equippable
    }
    get remainingSpace() {
        return (this.__maxStacks - this._stacks);
    }
}

class Inventory { //caricamento immagini negli li e la comparsa a schermo dell'inventario quando il puntatore ci va sopra, drop degli item, add degli item, creazione del modello dell'inventory
    constructor(maxSize = 0) {
        this._items = new Array(); // : invItem[]
        this.__maxSize = maxSize;
        this._size = 0;
        for(let i = 0; i < this.__maxSize; i++) 
            this._items.push(new InvItem());
    }
    /* Items */
    get items() { // ----> Interfaccia esterna
        return {
            list: () => { const itemsList = this._items; return itemsList; },
            add: (item,lastIndex = 0) => { return this.__addItem(item,lastIndex); },
            drop: (index,stacks = null) => { return this.__dropItem(index,stacks); },
            at: (index) => { return this._items[index]; } 
        };
    }
    __addItem(item, lastIndex = 0) { //Usiamo una funzione di callback che serve alla classe Player per scrivere sull'UI
        let index = -1;
        for(let i = lastIndex; i < this._items.length; i++) { //Vediamo i posti dove già esiste questo item (In caso esista)
            if(this._items[i].name == item.name && this._items[i].remainingSpace > 0) { index = i; break; }
        }
        let returningStacks = item.stacks.get();
        if(index == -1) { //Se l'item non c'è / tutti gli slot sono al completo 
            if(this.remainingSpace > 0) { //se c'è ancora spazio aggiungiamo, se no non possiamo fare nulla
                let tmp = new InvItem();
                tmp.copyItem(item);
                this._items[this._size] = tmp;
                returningStacks = 0; 
                this._size++;
            }
        }
        else { //Se invece ci sono degli slot non al completo
            returningStacks = this._items[index].stacks.add(item.stacks.get()); //Aggiungiamo dove possiamo
            if(returningStacks > 0) { //Se ci sono ancora degli stack da inserire
                item._stacks = returningStacks;
                returningStacks = this.__addItem(item,index+1); //Richiamiamo la funzione stessa
            }
        }
        return returningStacks;
    }
    __dropItem(index, stacks = null) {
        let dropStacks = 0;
        if(stacks == null) dropStacks = this._items[index].stacks.drop(); //Se è null si droppa tutto l'item
        else dropStacks = this._items[index].stacks.drop(stacks);
        let tmp = new InvItem(); //Costruiamo un nuovo item
        tmp.copyItem(this._items[index]);
        tmp.stacks.set(dropStacks);
        let inventory = new Inventory(1); //Un nuovo inventario
        inventory.addItem(tmp);  
        if(this._items[index].stacks.get() == 0) { 
            this._items.splice(index,1);
            this._items.push(new InvItem());
        }
        return inventory;        
    }
    /* Getters */
    get remainingSpace() {
        return (this.__maxSize - this._size);
    }
    get size() {
        return this._size;
    }
    get htmlElement() { /*Crea un ul con gli elementi*/
        let list = document.createElement("ul");
        let counter = 0;
        this._items.forEach((item) => {
            if(item.name != null) {
                let i = document.createElement("li");
                i.textContent = "\u00A0" + item.name + "\u00A0\u00A0\u00A0" + item.stacks.get();
                i.dataset.n = counter; /*Funziona come indice*/
                counter++;
                list.append(i);
            }
        });
        return list;
    }
    /* Metodi di classe */
    static moveFromInventory(from, to, index, stacks) { /*Comunicazione fra due inventari ---> Usato per gli inventari temporanei --> Vedere se rifarla */
        let tmp = new InvItem();
        tmp.copyItem(from.items[index]);
        tmp.stacks.set(stacks);             
        let returning = to.addItem(tmp);
        from.dropItem(index,stacks - returning,false);
        $("#tmpInv1").html(""); 
        $("#tmpInv1").append(from.htmlElement);
        $("#tmpInv2").html("");
        $("#tmpInv2").append(to.htmlElement);
    }
}       

class PlayerInventory extends Inventory{ //Un wrapper la cui unica vera utilità (per il momento) è chiamare UPDATEUI
    __addItem(item) {
        let tmp  = super.__addItem(item);
        updateUI(this._items);
        return tmp;
    }
    __dropItem(index, stacks = null) {
        let tmp = super.items.__dropItem(index,stacks);
        updateUI(this._items);
        return tmp;
    }
}
/*------------------ Fine classi --------------------------- */

function updateUI(inventory) { /*Aggiorna il css quando cambia qualcosa nell'inventario del giocatore*/
    let i = 0;
    for(let i = 0; i < inventory.length; i++) {
        let pos = $(".inventoryItem").eq(i);
        if(inventory[i].name != null) {
            pos.css("background-image","url(" + inventory[i].img + ")");
            pos.text(inventory[i].stacks.get());
        }
        else {
            pos.css("background-image","none");
            pos.text("\u00A0");
        }
    }
}

/* ----------------------- Create inventory items --------------------------------*/
function createWoodItem(nStacks = 1) {
    return (new InvItem({   imgName: (imgPath + "wood.svg"),
                            itemName: "Legno",
                            stacks: nStacks,
                            maxStacks: 10
                        })); 
}
function createSwordItem(nStacks = 1) {
    return (new InvItem({   imgName: ("../../Resources/Textures/grazio1.png"),
                            itemName: "Sword",
                            stacks: nStacks,
                            maxStacks: 2,
                            equippable:true
                        })); 
}
                     


                

            





        
    

