import {describe, expect, it} from 'vitest';
import {answerHeartStudy, newHeartStudy, observeHeartStudy, type HeartObservation} from './heartStudy';

const room: HeartObservation = {layer:'cutaway', selected:'heart', taken:'heart', separated:true, section:true, pin:null};
const ready = () => {
  let s = newHeartStudy();
  for (let i = 0; i < 4; i++) s = observeHeartStudy(s, room);
  return s;
};
describe('shared heart study learning loop', () => {
  it('requires separation and section before observations, then two different structures', () => {
    let s = observeHeartStudy(newHeartStudy(), {...room, layer:'combined'});
    expect(s.step).toBe(0);
    s = observeHeartStudy(s, room);
    s = observeHeartStudy(s, room);
    expect(observeHeartStudy(s, {...room, separated:false}).step).toBe(2);
    s = observeHeartStudy(s, room);
    expect(observeHeartStudy(s, {...room, section:false}).step).toBe(3);
    s = observeHeartStudy(s, room);
    s = observeHeartStudy(s, {...room, pin:0});
    expect(observeHeartStudy(s, {...room, pin:0})).toBe(s);
    expect(observeHeartStudy(s, {...room, pin:99})).toBe(s);
    s = observeHeartStudy(s, {...room, pin:2});
    expect(s.step).toBe(5);
    expect(s.seen).toEqual([0,2]);
    const wrong = answerHeartStudy(s, 'right-atrium');
    expect(wrong.step).toBe(5);
    expect(wrong.feedback).toContain('Try again');
    const correct = answerHeartStudy(wrong, 'left-ventricle');
    expect(correct.step).toBe(6);
    expect(observeHeartStudy(correct, room).step).toBe(6);
    expect(observeHeartStudy(correct, {...room, selected:null, taken:null, layer:'frame'}).step).toBe(0);
    const done = observeHeartStudy(correct, {...room, taken:null});
    expect(done.step).toBe(7);
    expect(observeHeartStudy(done, {...room, taken:'brain'})).toBe(done);
  });
  it('does not count another organ, early answers or an early return as completion', () => {
    const s = ready();
    expect(answerHeartStudy(s, 'left-ventricle')).toBe(s);
    expect(observeHeartStudy(s, {...room, taken:'brain', pin:0})).toEqual({...newHeartStudy(), step:1});
    expect(observeHeartStudy(s, {...room, taken:null}).step).toBe(1);
    expect(observeHeartStudy(s, {...room, taken:null, layer:'frame'}).step).toBe(0);
  });
  it('resumes unchanged across display modes without awarding repeated observations', () => {
    const s = observeHeartStudy(ready(), {...room, pin:1});
    expect(observeHeartStudy(s, {...room, pin:1})).toBe(s);
    expect(newHeartStudy()).toEqual({step:0, seen:[], feedback:''});
  });
});
