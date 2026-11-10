import {solveMarble} from '../shared/marble-solver';
self.onmessage=(event:MessageEvent<number[]>)=>self.postMessage(solveMarble(event.data));
