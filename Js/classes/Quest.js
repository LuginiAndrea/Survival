export {Quest, QuestManager}

const questStatus = Object.freeze({
    notStarted: -1,
    starting: 0,
    onGoing: 1,
    finished: 2
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
        this._status = questStatus.starting;
        return this.__startQuest(this.__args);
    }
    check() {
        this._status = questStatus.onGoing;
        return this.__checkQuest(this.__args);
    }
    end() {
        this._status = questStatus.finished;
        let returnValues = this.__endQuest(this.__args);
        this.__manager.quests.remove(this.__questName); //Rimuoviamo la quest dal manager
        return returnValues;
    }
    get status() { return this._status; }
    set status(s) { this._status = questStatus[s]; }
    get name() { return this.__questName; }
    set manager(m) { this.__manager = m; }
    get manager() { return this.__manager; }
}

class QuestManager {
    constructor() {
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
            start: (questName) => { 
                if(questName in this._quests) 
                    this._quests[questName].start;
                else 
                    console.error("Quest non presente nel manager");    
            },
            check: (questName) => {
                if(questName in this._quests)
                    return this._quests[questName].check;
                else
                    console.error("Quest non presente nel manager");
            },
            end: (questName) => {
                if(questName in this._quests) 
                    return this._quests[questName].end;
                else
                    console.error("Quest non presente nel manager");
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
            if(this._quests[name].check()) {
                this._quests[name].end();
            }
        }
    }
}



