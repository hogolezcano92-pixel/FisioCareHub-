import { useEffect,useMemo,useState } from "react";
import { BrainCircuit, CheckCircle2, ChevronRight, Clock3, RotateCcw, Sparkles, Target } from "lucide-react";
import { supabase } from "../lib/supabase";
type Option={key:string;text:string};
type Q={id:string;area:string;subarea?:string;topic?:string;statement:string;options:Option[];correct_answer:string;explanation?:string;references_text?:string};
const optionLetters=["A","B","C","D","E","F"];
const normalizeOptions=(raw:any)=>{
  if(!Array.isArray(raw)) return [];
  return raw.map((o:any,i:number)=>{
    if(typeof o==="string") return {key:optionLetters[i]||String(i+1),text:o};
    return {key:String(o?.key||o?.label||optionLetters[i]||String(i+1)).trim(),text:String(o?.text||o?.value||o?.option||"").trim()};
  }).filter((o:any)=>o.text);
};
const normalizeCorrectAnswer=(answer:any,options:any[])=>{
  const value=String(answer??"").trim();
  if(!value) return "";
  const direct=options.find((o:any)=>o.key.toLowerCase()===value.toLowerCase());
  if(direct) return direct.key;
  const letter=value.match(/^[([\\s]*([A-F])[)\\].:\\s-]/i)?.[1]?.toUpperCase();
  if(letter&&options.some((o:any)=>o.key===letter)) return letter;
  return options.find((o:any)=>o.text.toLowerCase()===value.toLowerCase())?.key||value;
};

export default function FisioQuestions(){
 const [qs,setQs]=useState<Q[]>([]),[answers,setAnswers]=useState<Record<string,string>>({}),[idx,setIdx]=useState(0),[loading,setLoading]=useState(true),[done,setDone]=useState(false),[attempt,setAttempt]=useState<string|null>(null),[seconds,setSeconds]=useState(0);
 const [area,setArea]=useState("Ortopedia");
 const load=async()=>{setLoading(true);setDone(false);setAnswers({});setIdx(0);setSeconds(0);const {data}=await supabase.from("questoes_fisio").select("*").eq("review_status","published").eq("area",area).limit(10);setQs((data||[]).map((raw:any)=>{const options=normalizeOptions(raw.options);return {...raw,options,correct_answer:normalizeCorrectAnswer(raw.correct_answer,options)}}).filter((q:any)=>q.options.length>0));setLoading(false)};
 useEffect(()=>{load()},[area]); useEffect(()=>{if(done)return;const t=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(t)},[done]);
 const q=qs[idx]; const answered=q?answers[q.id]:undefined;
 const finish=async()=>{const user=(await supabase.auth.getUser()).data.user;if(!user)return;const total=qs.length,correct=qs.reduce((n,x)=>n+(answers[x.id]===x.correct_answer?1:0),0);const {data}=await supabase.from("tentativas_fisio").insert({user_id:user.id,mode:"simulado",total_questions:total,correct_answers:correct,score:total?correct/total*100:0,total_time_seconds:seconds,completed_at:new Date().toISOString()}).select("id").single();if(data){setAttempt(data.id);await supabase.from("respostas_questoes_fisio").insert(qs.map(x=>({attempt_id:data.id,question_id:x.id,user_id:user.id,answer:answers[x.id]||null,is_correct:answers[x.id]===x.correct_answer,response_time_seconds:null}))) }setDone(true)};
 if(loading)return <div className="min-h-[70vh] flex items-center justify-center"><div className="text-center"><BrainCircuit className="mx-auto mb-4 animate-pulse text-blue-500" size={42}/><p className="font-bold text-slate-500">Preparando seu estudo...</p></div></div>;
 if(!qs.length)return <div className="max-w-5xl mx-auto p-6"><div className="rounded-[2rem] p-8 bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-2xl"><Sparkles size={30}/><h1 className="text-3xl font-black mt-3">Estudos Clínicos</h1><p className="mt-2 text-white/80">Ainda não há questões publicadas com alternativas válidas para esta área.</p><select value={area} onChange={e=>setArea(e.target.value)} className="mt-6 rounded-xl px-4 py-3 text-slate-900"><option>Ortopedia</option><option>Neurologia</option><option>Geriatria</option><option>Cardiorrespiratória</option><option>Fisioterapia do Trabalho</option></select></div></div>;
 if(done){const correct=qs.filter(x=>answers[x.id]===x.correct_answer).length;return <div className="max-w-4xl mx-auto p-6"><div className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 shadow-xl p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={54}/><p className="text-sm font-black uppercase tracking-widest text-slate-400 mt-4">Resultado</p><h1 className="text-5xl font-black mt-2">{Math.round(correct/qs.length*100)}%</h1><p className="text-slate-500 mt-2">{correct} de {qs.length} questões corretas</p><button onClick={load} className="mt-8 px-6 py-3 rounded-xl bg-blue-600 text-white font-black"><RotateCcw size={16} className="inline mr-2"/>Novo simulado</button></div></div>}
 return <div className="max-w-5xl mx-auto p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4 mb-6"><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-500">FisioCareHub • Estudos</p><h1 className="text-3xl font-black mt-1">Raciocínio Clínico</h1></div><div className="flex items-center gap-2 text-slate-500 font-bold"><Clock3 size={17}/>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</div></div><div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-6"><div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{width:`${(idx+1)/qs.length*100}%`}}/></div><div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 shadow-xl p-6 sm:p-9"><div className="flex gap-3 text-xs font-black uppercase tracking-widest text-blue-500"><Target size={16}/> {area} • Questão {idx+1}/{qs.length}</div><h2 className="text-xl sm:text-2xl font-bold leading-relaxed mt-5">{q.statement}</h2><div className="grid gap-3 mt-7">{q.options.map((o:any)=><button key={o.key} onClick={()=>setAnswers(a=>({...a,[q.id]:o.key}))} className={`text-left p-4 rounded-2xl border-2 transition-all ${answered===o.key?"border-blue-500 bg-blue-500/10":"border-slate-200 dark:border-white/10 hover:border-blue-300"}`}><b className="mr-3">{o.key}</b>{o.text}</button>)}</div><div className="flex justify-between mt-8"><button disabled={idx===0} onClick={()=>setIdx(i=>i-1)} className="px-5 py-3 rounded-xl border font-bold disabled:opacity-30">Anterior</button>{idx===qs.length-1?<button disabled={!answered} onClick={finish} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black disabled:opacity-40">Finalizar</button>:<button disabled={!answered} onClick={()=>setIdx(i=>i+1)} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black disabled:opacity-40">Próxima <ChevronRight className="inline" size={18}/></button>}</div></div></div>
}