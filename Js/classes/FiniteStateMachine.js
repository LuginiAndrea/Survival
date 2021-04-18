export {State, FiniteStateMachine}

class State {            //Wrapper molto base che ci semplifica la vita
    constructor (finiteStateMachine, stateName, ifStopState = null) {
        this.__finiteStateMachine = finiteStateMachine; 
        this._stateName = stateName; 
        this.__ifStopState = ifStopState; //Finito questo stato, quello al quale dobbiamo andare
    }
    get state() {
        return this._stateName;
    }
    setLeaveState(state) {
        this.__ifStopState = state;
    }
    enter() {
        if(this.__finiteStateMachine.states.current != null && this.__finiteStateMachine.states.current.state != this._stateName) //Se siamo già nello stesso stato non facciamo nulla
            this.__finiteStateMachine.parent.animations.play(this.state);
    }
    exit() {
        this.__finiteStateMachine.states.set(this.__ifStopState);
    }
}

class FiniteStateMachine { //Wrapper che serve a gestire animazioni e suoni
    constructor(parent, initialState) {
        this.__parent = parent;
        this._currentState = null;
        this._states = {}; 
    }
    get parent() {
        return this.__parent;
    }
    get states() { // Interfaccia esterna
        return {
            list: () => { const statesList = this._states; return statesList; },
            current: this._currentState,
            add: (stateName,ifStopState) => { this._states[stateName] = new State(this,stateName,ifStopState); },
            set: (stateName) => {    
                const state = this._states[stateName];
                state.enter();
                this._currentState = state;

            },
            get: (stateName) => { return this._states[stateName]; }
        };
    }
}


