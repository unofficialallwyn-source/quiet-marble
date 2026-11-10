import {solveMarble} from '../shared/marble-solver';
import type {MarbleVariant} from '../shared/game';
self.onmessage=(event:MessageEvent<{board:number[];game:MarbleVariant}>)=>self.postMessage(solveMarble(event.data.board,250000,event.data.game));
