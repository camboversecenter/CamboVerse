import {it,expect} from 'vitest';
import {showStudyDentition} from './mouthStudy';
it('only shows added teeth when extracted and enabled',()=>{
 for(const taken of [false,true])for(const enabled of [false,true]){
  expect(showStudyDentition(true,taken,enabled)).toBe(taken&&enabled);
  expect(showStudyDentition(false,taken,enabled)).toBe(true);
 }
});
