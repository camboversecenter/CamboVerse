import { test } from 'node:test';
import assert from 'node:assert/strict';
import { privatePath,scanText,inspectContent } from './check-publish-safety.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';

test('raw training media and credentials are blocked; project code and reviewed UI assets remain eligible',()=>{
  for(const path of ['data/capture/frames/a.jpg','NUM status/a.jpg','output/review.png','training/a.jpg','frame.jpg','clip.m4v','camera.dng','a.zip','public/models/raw.splat','public/models/local/tour/a.jpg','.env.local','.dev.vars.preview','nested/kaggle.json','secret.pem','model.ckpt','private.pptx'])assert.equal(privatePath(path),true,path);
  for(const path of ['src/components/Viewer.tsx','.env.example','.dev.vars.example','public/models/local/README.md','public/models/village/tree-normal.glb','public/art/icon.webp','notebooks/train_3dgs_kaggle.ipynb'])assert.equal(privatePath(path),false,path);
});
test('reports credential locations without returning their values',()=>{
  const fake=['sk','proj','x'.repeat(40)].join('-');
  const result=scanText(`hello\nconst value = '${fake}';`);
  assert.equal(result[0].line,2);assert.equal(result[0].kind,'Provider API key');
  assert.equal(JSON.stringify(result).includes(fake),false);
  assert.equal(scanText(`api_key = "replace-with-your-real-key"`).length,0);
});
test('catches signed URLs, passwords in URLs, and embedded credentials',()=>{
  assert.ok(scanText('https://example.test/object?X-Goog-Signature='+'a'.repeat(40)).length);
  assert.ok(scanText(['postgres','://','user',':',['a','private','password'].join('-'),'@','example.test/db'].join('')).length);
  assert.ok(scanText('api_key = "'+['not','a','real','key','1234567890'].join('-')+'"').length);
});
test('replacing an allowed procedural demo with capture bytes is rejected',()=>{
  assert.ok(inspectContent('public/models/angkor-wat.splat',Buffer.from([0,1,2,3])).findings.some(f=>f.kind.includes('replaced')));
});

test('only the four reviewed finished captures may be published, with pinned content',()=>{
  for(const name of ['clock','staircase'])for(const tier of ['normal','ultra']){
    const path=`public/models/captures/wat-phnom-${name}-v1/${tier}.splat`;
    assert.equal(privatePath(path),false);
    assert.ok(inspectContent(path,Buffer.from([0,1,2,3])).findings.some(f=>f.kind.includes('reviewed preview')));
  }
  assert.equal(privatePath('public/models/captures/wat-phnom-clock-v1/raw.splat'),true);
});

test('preserves the already-public province introduction while blocking replacement videos',()=>{
  const path='camboverse-provinces/video/camboverse-provinces-avatars-16x9.mp4';
  assert.equal(privatePath(path),false);
  assert.ok(inspectContent(path,Buffer.from([0,1])).findings.some(f=>f.kind.includes('collection media changed')));
  assert.equal(privatePath('camboverse-provinces/video/training.mp4'),true);
});
test('requires output-free notebooks, including Windows BOM JSON',()=>{
  const clean={cells:[{cell_type:'code',execution_count:null,outputs:[],source:['print(1)']}]};
  assert.equal(inspectContent('train.ipynb',Buffer.from('\uFEFF'+JSON.stringify(clean))).findings.length,0);
  clean.cells[0].outputs=[{output_type:'stream',text:'private output'}];
  assert.ok(inspectContent('train.ipynb',Buffer.from(JSON.stringify(clean))).findings.some(f=>f.kind.includes('saved outputs')));
});
test('checks actual staged bytes even when the working file has already been cleaned',()=>{
  const tempRoot=resolve(tmpdir()),directory=mkdtempSync(resolve(tempRoot,'camboverse-publish-test-'));
  const checker=fileURLToPath(new URL('./check-publish-safety.mjs',import.meta.url));
  const fake=['sk','proj','z'.repeat(40)].join('-');
  try{
    execFileSync('git',['init','--quiet'],{cwd:directory});
    writeFileSync(resolve(directory,'test.js'),`const value = '${fake}';`);
    execFileSync('git',['add','--','test.js'],{cwd:directory});
    writeFileSync(resolve(directory,'test.js'),'const value = "clean";');
    for(const args of [[],['--staged']]){
      let result;
      try{execFileSync(process.execPath,[checker,...args],{cwd:directory,stdio:['pipe','pipe','pipe']});assert.fail('Expected staged secret to block the check');}
      catch(error){result=error;}
      assert.equal(result.status,1);
      const output=String(result.stdout)+String(result.stderr);
      assert.ok(output.includes('Provider API key'));assert.equal(output.includes(fake),false);
    }
  }finally{
    // Verify the exact test target before recursive cleanup on Windows.
    if(directory.startsWith(tempRoot+sep)&&directory.split(sep).at(-1).startsWith('camboverse-publish-test-'))rmSync(directory,{recursive:true,force:true});
  }
});
