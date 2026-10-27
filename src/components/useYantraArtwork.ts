import { useEffect, useState } from 'react';
import { prepareYantra } from '../sakyantArtwork';

/** A failed asset never silently substitutes the rejected old illustration. */
export function useYantraArtwork(id:string) {
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState({id:'',ready:false,error:false});
  useEffect(()=>{
    let live=true;
    setState({id,ready:false,error:false});
    prepareYantra(id).then(()=>{
      if(live) setState({id,ready:true,error:false});
    }).catch(()=>{
      if(live) setState({id,ready:false,error:true});
    });
    return ()=>{live=false;};
  },[id,attempt]);
  return {ready:state.id===id&&state.ready,error:state.id===id&&state.error,retry:()=>setAttempt(a=>a+1)};
}
