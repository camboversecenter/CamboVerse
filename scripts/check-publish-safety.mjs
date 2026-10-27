// Local, dependency-free Git check. Never prints credential values or uploads data.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const privateSuffix=/\.(?:zip|7z|rar|tar|tgz|tar\.gz|insp|insv|mp4|m4v|mkv|webm|mov|avi|mts|m2ts|dng|cr2|nef|arw|splat|ksplat|spz|ply|ckpt|pt|pth|safetensors|blend\d*|pem|key|p12|pfx|har|pyc|pyo)$/i;
// Previously committed synthetic demos; not camera captures. Explicit hashes
// prevent a private replacement at an allowed path from passing unnoticed.
const demoClouds=new Map([
  ['public/models/angkor-wat.splat','4a825020c28b573b3c885c63337b7310746b52b7b6fe3616ca849dd467d88224'],
  ['public/models/wat-phnom.splat','747608e9e4f48165eaa68e739e8444866516350c5c7b33d1241c11981ccb5d20'],
]);
const releasedCaptures=new Map([
  ['public/models/captures/wat-phnom-clock-v1/normal.splat','f0b9d9ccb7c7b8b406ca30db3f9213d62567b983c53e47c6dafc79455a8336d9'],
  ['public/models/captures/wat-phnom-clock-v1/ultra.splat','d3dc2f0dc6fbb5cf052f5058f1911342d65d807d5deac61a7959ea55dc0ef302'],
  ['public/models/captures/wat-phnom-staircase-v1/normal.splat','2d2c3391ce392cb10a6083307cc8f737a7c4d9748143a87abb7f8f3936f9b8b9'],
  ['public/models/captures/wat-phnom-staircase-v1/ultra.splat','ddcbc6502d068a7933abbaee6b792a8ca454c95c2173548af853b45abf9aa948'],
]);
// This introduction video was already published with the province collection.
// Keep its exact existing bytes; other videos remain private by default.
const existingPublicMedia=new Map([
  ['camboverse-provinces/video/camboverse-provinces-avatars-16x9.mp4','7a5561338fc8bee64b284d079bd8ce825cd7b1bfa132163f12c8fd71112117b5'],
]);
export function privatePath(path) {
  const p=path.replaceAll('\\','/');
  if(/^(?:output|tmp|temp|captures|training|datasets|downloads|\.codex-tools|\.codex|\.claude|NUM status|num-status-split|node_modules|dist|\.wrangler)\//i.test(p))return true;
  if(p.startsWith('public/models/local/')&&p!=='public/models/local/README.md')return true;
  if(p.startsWith('data/')&&p!=='data/README.md')return true;
  if(/(^|\/)(?:\.aws|\.ssh|\.kaggle|__pycache__|\.ipynb_checkpoints)\//i.test(p))return true;
  const name=p.split('/').at(-1);
  if(/^(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/i.test(name)&&!name.endsWith('.example'))return true;
  if(/^(?:kaggle|credentials|auth)\.json$|service[-_]account.*\.json$|^(?:id_rsa|id_ed25519|\.npmrc|\.pypirc|\.netrc)$|^(?:cookies|storage-?state).*(?:\.json|\.txt)$/i.test(name))return true;
  if(!p.includes('/')&&/\.(?:docx|pptx|pdf|jpe?g|png|webp|heic|tiff?)$/i.test(p))return true;
  return privateSuffix.test(p)&&!demoClouds.has(p)&&!releasedCaptures.has(p)&&!existingPublicMedia.has(p);
}

const patterns=[
  ['Private key',/-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/g],
  ['Provider API key',/\bsk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{24,}/g],
  ['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['Google API key',/\bAIza[A-Za-z0-9_-]{30,}/g],
  ['Slack token',/\bxox[baprs]-[A-Za-z0-9-]{20,}/g],
  ['Signed URL or URL credential',/[?&](?:X-Goog-Signature|X-Amz-Signature|access_token|api_key|token)=[A-Za-z0-9%._~+/-]{16,}/gi],
  ['Password in URL',/\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?)?:\/\/[^\s/<>:]+:[^\s/<>@]{4,}@/g],
  ['JWT',/\beyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/g],
];
const placeholder=/^(?:your[-_ ]|replace|example|placeholder|dummy|test[-_]|change[-_]?me|<|\$\{|process\.env|import\.meta\.env|os\.environ)/i;

export function scanText(text) {
  const findings=[];
  const add=(kind,index)=>findings.push({kind,line:text.slice(0,index).split('\n').length});
  for(const [kind,re] of patterns){
    re.lastIndex=0;
    for(const match of text.matchAll(re))add(kind,match.index);
  }
  const assignments=/(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|secret[_-]?key|kaggle[_-]?key|CLOUDFLARE_API_TOKEN)\s*["']?\s*[:=]\s*["']([^"'\r\n]{12,})["']/gi;
  for(const match of text.matchAll(assignments)){
    if(!placeholder.test(match[1])&&!match[1].includes('${'))add('Possible hardcoded credential',match.index);
  }
  return findings;
}

export function inspectContent(path,buffer) {
  const findings=[];
  if(existingPublicMedia.has(path)&&createHash('sha256').update(buffer).digest('hex')!==existingPublicMedia.get(path))findings.push({kind:'Previously published collection media changed; review replacement',line:0});
  if(releasedCaptures.has(path)&&createHash('sha256').update(buffer).digest('hex')!==releasedCaptures.get(path))findings.push({kind:'Published capture differs from the reviewed preview',line:0});
  if(demoClouds.has(path)&&createHash('sha256').update(buffer).digest('hex')!==demoClouds.get(path))findings.push({kind:'Synthetic demo cloud was replaced; review publication permission',line:0});
  if(buffer.length>100*1024*1024)findings.push({kind:'File exceeds 100 MiB; use reviewed asset storage',line:0});
  if(buffer.subarray(0,8000).includes(0))return {findings,text:false};
  const text=buffer.toString('utf8').replace(/^\uFEFF/,'');
  findings.push(...scanText(text));
  if(path.endsWith('.ipynb')){
    try{
      const notebook=JSON.parse(text);
      if(notebook.cells?.some(cell=>cell.outputs?.length||cell.execution_count!=null))findings.push({kind:'Notebook contains saved outputs or execution counts',line:0});
    }catch{findings.push({kind:'Notebook is not valid JSON',line:0});}
  }
  return {findings,text:true};
}

function git(args,options={}) {
  return execFileSync('git',args,{maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe'],...options});
}
function list(args){return git(args).toString('utf8').split('\0').filter(Boolean);}

export function audit({staged=false}={}) {
  const root=git(['rev-parse','--show-toplevel']).toString('utf8').trim();
  const paths=staged?list(['diff','--cached','--name-only','--diff-filter=ACMR','-z']):[...new Set(list(['ls-files','--cached','--others','--exclude-standard','-z']))];
  let scanned=0,binary=0,deleted=0;
  const findings=[],large=[];
  for(const path of paths){
    let content;
    if(staged){content=git(['show',`:${path}`]);}
    else{
      let info;
      try{info=lstatSync(resolve(root,path));}catch(error){if(error.code==='ENOENT'){deleted++;continue;}throw error;}
      if(info.isSymbolicLink()){findings.push({path,line:0,kind:'Review symlink before publishing'});continue;}
      if(!info.isFile())continue;
      if(info.size>100*1024*1024){findings.push({path,line:0,kind:'File exceeds 100 MiB; use reviewed asset storage'});continue;}
      content=readFileSync(resolve(root,path));
    }
    if(privatePath(path))findings.push({path,line:0,kind:'Private/local file is included in Git candidates'});
    if(content.length>10*1024*1024)large.push(path);
    const result=inspectContent(path,content);
    if(result.text)scanned++;else binary++;
    findings.push(...result.findings.map(f=>({...f,path})));
  }
  return {mode:staged?'staged':'working tree plus tracked files',scanned,binary,deleted,large,findings};
}

/** Reachable local history, text blobs only, without materialising or exposing
 * old credentials. Images/media and oversized blobs are explicitly unscanned. */
export function auditHistory() {
  const objects=new Map();
  for(const line of git(['rev-list','--objects','--all']).toString('utf8').split('\n')){
    const split=line.indexOf(' ');if(split<0)continue;
    const oid=line.slice(0,split),path=line.slice(split+1);
    if(/\.(?:[cm]?js|jsx|tsx?|py|jsonc?|ipynb|ya?ml|toml|ini|cfg|conf|txt|md|html?|css|sh|ps1|sql|xml|csv)$/i.test(path)||/(?:^|\/)(?:\.env[^/]*|\.dev\.vars[^/]*|\.npmrc|\.netrc|kaggle\.json)$/.test(path))objects.set(oid,path);
  }
  const queries=[...objects].map(([oid,path])=>`${oid} ${path}`).join('\n')+'\n';
  const metadata=git(['cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize) %(rest)'],{input:queries}).toString('utf8').split('\n');
  const blobs=[];let oversized=0;
  for(const line of metadata){
    const match=/^([a-f0-9]+) blob (\d+) (.*)$/.exec(line);if(!match)continue;
    const size=Number(match[2]);if(size>8*1024*1024){oversized++;continue;}
    blobs.push({oid:match[1],size,path:match[3]});
  }
  let scanned=0,binary=0;const findings=[];
  for(let first=0;first<blobs.length;){
    const batch=[];let size=0;
    while(first<blobs.length&&size<24*1024*1024&&batch.length<60){const blob=blobs[first++];batch.push(blob);size+=blob.size;}
    const output=git(['cat-file','--batch'],{input:batch.map(b=>b.oid).join('\n')+'\n'});
    let offset=0;
    for(const blob of batch){
      const end=output.indexOf(10,offset);if(end<0)throw new Error('Invalid Git batch');
      offset=end+1;const content=output.subarray(offset,offset+blob.size);offset+=blob.size+1;
      if(content.subarray(0,8000).includes(0)){binary++;continue;}
      scanned++;
      findings.push(...scanText(content.toString('utf8')).map(f=>({...f,path:blob.path,revision:blob.oid.slice(0,12)})));
    }
  }
  return {scanned,binary,oversized,findings};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const args=process.argv.slice(2);
    if(args.includes('--history')){
      if(args.length!==1)throw new Error('History is a separate check.');
      const report=auditHistory();
      console.log(`History check: ${report.scanned} reachable text blobs checked; ${report.binary} binary and ${report.oversized} oversized text candidates skipped. Media content is not scanned.`);
      for(const f of report.findings)console.error(`${f.path}:${f.line} (${f.revision}): ${f.kind}`);
      console.log(report.findings.length?`FAILED: ${report.findings.length} historical finding(s). Values are redacted.`:'PASS: no matching credential patterns in scanned local history.');
      process.exitCode=report.findings.length?1:0;
    }else{
    if(args.some(a=>a!=='--staged'))throw new Error('Use no arguments, --staged or --history.');
    const stagedOnly=args.includes('--staged');
    const report=audit({staged:stagedOnly});
    if(!stagedOnly){
      const staged=audit({staged:true});
      report.findings.push(...staged.findings.map(f=>({...f,kind:`Staged: ${f.kind}`})));
    }
    console.log(`Publish check (${report.mode}): ${report.scanned} text files and ${report.binary} binary files checked; ${report.deleted} missing tracked files skipped.`);
    for(const finding of report.findings)console.error(`${finding.path}${finding.line?`:${finding.line}`:''}: ${finding.kind}`);
    if(report.large.length)console.log(`${report.large.length} included files exceed 10 MiB; review asset sizes.`);
    console.log(report.findings.length?`FAILED: ${report.findings.length} finding(s). Values are redacted.`:'PASS: no matching credential patterns, private-file candidates or saved notebook outputs found.');
    console.log('Staged content is also checked. Pattern scanning cannot prove absence of all secrets or remove content from previous commits.');
    process.exitCode=report.findings.length?1:0;
    }
  }catch{console.error('Publish check could not complete. Check Git, file access and command arguments. No credentials were printed.');process.exitCode=2;}
}
