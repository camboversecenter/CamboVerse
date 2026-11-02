/** A short, user-requested narration. Credentials never leave the Worker. */
export async function handleGuideVoice(request:Request,env:{GEMINI_API_KEY?:string}):Promise<Response> {
  let body:{text?:unknown};
  try{body=await request.json() as typeof body;}catch{return new Response('Invalid request',{status:400});}
  if(!body||typeof body.text!=='string'||!body.text.trim()||body.text.length>1500)return new Response('Invalid text',{status:400});
  if(!env.GEMINI_API_KEY)return new Response('Narration unavailable',{status:503});
  try{
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent',{
      method:'POST',signal:AbortSignal.timeout(20000),
      headers:{'x-goog-api-key':env.GEMINI_API_KEY,'content-type':'application/json'},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:body.text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{voice:'Kore'}}}}),
    });
    if(!response.ok)return new Response('Narration unavailable',{status:502});
    const data=await response.json() as {candidates?:Array<{content?:{parts?:Array<{inlineData?:{data?:string;mimeType?:string}} >}} >};
    const audio=data.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.data)?.inlineData;
    if(!audio?.data||audio.data.length>6000000)return new Response('Narration unavailable',{status:502});
    const raw=atob(audio.data),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    if(raw.slice(0,4)!=='RIFF'||raw.slice(8,12)!=='WAVE')return new Response('Narration unavailable',{status:502});
    return new Response(bytes,{headers:{'content-type':'audio/wav','cache-control':'no-store','x-content-type-options':'nosniff'}});
  }catch{return new Response('Narration unavailable',{status:502});}
}
