import {Text} from 'react-native';
import {render,screen,fireEvent,act} from '@testing-library/react-native';
import {CrashGuard,describeError} from '../src/components/CrashGuard';

let fail=true;
function Boom(){if(fail)throw new TypeError('undefined is not a function');return <Text>All good</Text>}

beforeEach(()=>{fail=true;jest.spyOn(console,'error').mockImplementation(()=>{})});
afterEach(()=>jest.restoreAllMocks());

test('an error while drawing shows the crash screen instead of closing the app, and Try again recovers',async()=>{
 await render(<CrashGuard><Boom/></CrashGuard>);
 expect(screen.getByText('Something went wrong')).toBeTruthy();
 expect(screen.getByText('TypeError: undefined is not a function')).toBeTruthy();
 fail=false;
 await fireEvent.press(screen.getByText('Try again'));
 expect(screen.getByText('All good')).toBeTruthy();
});

test('fatal JavaScript errors outside drawing are routed to the crash screen in release builds',async()=>{
 await render(<CrashGuard><Text>Playing</Text></CrashGuard>);
 const handler=(globalThis as any).ErrorUtils.getGlobalHandler();
 const dev=(globalThis as any).__DEV__;(globalThis as any).__DEV__=false;
 try{await act(async()=>handler(new RangeError('bad index'),true))}finally{(globalThis as any).__DEV__=dev}
 expect(screen.getByText('RangeError: bad index')).toBeTruthy();
});

test('non-Error values are described safely',()=>{
 expect(describeError('plain text')).toEqual({title:'plain text',stack:''});
 expect(describeError(new Error('x')).title).toBe('Error: x');
});
