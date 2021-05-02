export {State, FiniteStateMachine}

class State {            //Wrapper molto base che ci semplifica la vita
    constructor (finiteStateMachine, stateName, ifStopState = null, sound) {
        this.__finiteStateMachine = finiteStateMachine; 
        this._stateName = stateName; 
        this.__ifStopState = ifStopState; //Finito questo stato, quello al quale dobbiamo andare
        this._sound = sound;
        this._sound.setLoop(true);
    }
    get state() { return this._stateName; }
    get sound() { return this._sound; }
    set volume(v) { this._sound.setVolume(v); }
    get volume() { return this._sound; }
    setLeaveState(state) { this.__ifStopState = state; }
    enter() {
        this._sound.play();
        if(this.__finiteStateMachine.states.current != null && this.__finiteStateMachine.states.current.state != this._stateName) {//Se siamo già nello stesso stato non facciamo nulla
            this.__finiteStateMachine.parent.animations.play(this.state);
        }
    }
    exit() {
        this._sound.stop();
        this.__finiteStateMachine.states.set(this.__ifStopState);
    }
}
class FiniteStateMachine { //Wrapper che serve a gestire animazioni e suoni
    constructor(parent, initialState) {
        this.__parent = parent;
        this._currentState = null;
        this._states = {}; 
        this._onStartState = initialState;
    }
    get parent() { return this.__parent; }
    get states() { // Interfaccia esterna
        return {
            list: () => { const statesList = this._states; return statesList; },
            current: this._currentState,
            add: (stateName,ifStopState,audio) => { 
                this._states[stateName] = new State(this,stateName,ifStopState,audio);
            },
            set: (stateName) => {  
                if(this._currentState != null && this._currentState.state != stateName) { this._currentState.sound.stop(); }  
                const state = this._states[stateName];
                state.enter();
                this._currentState = state;
            },
            get: (stateName) => { return this._states[stateName]; }
        };
    }
}


