export {Quest, QuestManager}

const questStatus = Object.freeze({
    notStarted: -1,
    started: 0,
    finished: 1
});
class Quest { 
    constructor(questName, startQuest, checkQuest, endQuest, args) {
        this.__manager = null;
        this.__questName = questName;
        this.__startQuest = startQuest;
        this.__checkQuest = checkQuest;
        this.__endQuest = endQuest;
        this.__args = args;
        this._status = questStatus.notStarted;
    }
    start() {                                       //Ogni funzione prende un argomento ma non è detto che lo usi!
        this._status = questStatus.started;
        return this.__startQuest(this.__args);
    }
    check() {
        return this.__checkQuest(this.__args);
    }
    end() {
        this._status = questStatus.finished;
        let returnValues = this.__endQuest(this.__args);
        this.__manager.quests.remove(this.__questName); //Rimuoviamo la quest dal manager
        return returnValues;
    }
    get status() { return this._status; }
    set status(s) { this._status = s; }
    get name() { return this.__questName; }
    set manager(m) { this.__manager = m; }
    get manager() { return this.__manager; }
}
class QuestManager {
    constructor(parent) {
        this.__parent = parent;
        this._quests = {}; //Object Literal (Funziona come hash map) di quests
    }
    get quests() { //Interfaccia esterna
        return {
            add: (quest) => { 
                this._quests[quest.name] = quest;
                this._quests[quest.name].manager = this;
                return this._quests[quest.name];
            },
            remove: (questName) => {
                delete this._quests[questName];
            },
            quest: (questName) => {
                if(questName in this._quests)
                    return this.__quests[questName];
                else
                    console.error("Quest non presente nel manager");
            },
            list: this._quests
        }
    }
    update() {
        const keys = Object.keys(this._quests);
        for(let name of keys) {
            if(this._quests[name].status == questStatus.notStarted) {
                this._quests[name].start();
                $("#insideQuests").html(this.htmlElement);
            }
            else if(this._quests[name].check()) {
                this._quests[name].end();
                $("#insideQuests").html(this.htmlElement);
            }
        }
    }
    get parent() { return this.__parent; }
    get htmlElement() {
        let ul = document.createElement("ul");
        const keys = Object.keys(this._quests);
        for(let name of keys) {
            if(this._quests[name].status != questStatus.notStarted) {
                let q = document.createElement("li");
                q.textContent = this._quests[name].__args.nome;
                ul.appendChild(q);
            }
        }
        return ul;
    }
}



