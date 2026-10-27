import { afterEach, expect, it, vi } from 'vitest';
import { speak, stopSpeaking } from './voice';
afterEach(()=>vi.unstubAllGlobals());
it('handles narration start, completion, errors, and cancellation',()=>{
  const synth={cancel:vi.fn(),speak:vi.fn<(utterance:SpeechSynthesisUtterance)=>void>(),getVoices:()=>[]};
  vi.stubGlobal('window',{speechSynthesis:synth});
  vi.stubGlobal('SpeechSynthesisUtterance',class {constructor(public text:string) {}});
  const handlers={onStart:vi.fn(),onEnd:vi.fn(),onError:vi.fn()};
  expect(speak('Guardian lion.','en-US',handlers)).toBe(true);
  const utterance=synth.speak.mock.calls[0][0] as unknown as SpeechSynthesisUtterance;
  utterance.onstart!({} as SpeechSynthesisEvent);expect(handlers.onStart).toHaveBeenCalledOnce();
  utterance.onend!({} as SpeechSynthesisEvent);expect(handlers.onEnd).toHaveBeenCalledOnce();
  utterance.onerror!({} as SpeechSynthesisErrorEvent);expect(handlers.onError).toHaveBeenCalledOnce();
  stopSpeaking();expect(synth.cancel).toHaveBeenCalledTimes(2);
});
it('does not start narration when the browser has no speech service',()=>{
  vi.stubGlobal('window',{});expect(speak('Hello','en-US')).toBe(false);
});
