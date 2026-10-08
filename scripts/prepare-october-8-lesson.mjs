// node scripts/prepare-october-8-lesson.mjs <private-source-dir> [--upload-images]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import * as content from '../content/october-8-source.mjs';
import naga from '../content/october-8-naga.json' with { type: 'json' };
import { normalizeTileQuestion } from '../app/lib/tile-question.mjs';
import { renderSeptemberMaterial } from './render-september-material.mjs';
import { SITE_ORIGIN } from '../app/lib/site-origin.mjs';
const { lesson, videoId, questions, summary, scenes, references }=content;
if(!process.argv[2])throw Error('Private source directory required');
const root=resolve(process.argv[2]);
const hash=b=>createHash('sha256').update(b).digest('hex');
const cache=join(root,'app-image-uploads.json');
let uploads={};try{uploads=JSON.parse(await readFile(cache,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const images={};
const imageScenes={...scenes};
for(const q of questions.filter(q=>q.scene))imageScenes[q.scene+'-board']={...scenes[q.scene],width:835,height:644};
for(const [key,s]of Object.entries(imageScenes)){
 const file=`frames-public/${key}.jpg`,bytes=await readFile(join(root,file));
 const sha256=hash(bytes);
 if(uploads[file]?.sha256!==sha256){
  if(!process.argv.includes('--upload-images'))throw Error('Image not uploaded: '+file);
  const r=await fetch(SITE_ORIGIN+'/api/images',{method:'POST',headers:{'content-type':'image/jpeg'},body:bytes,signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error(`Image upload ${file}: ${r.status}`);
  const {url}=await r.json();
  if(!url?.startsWith(SITE_ORIGIN+'/api/images/note-images/'))throw Error('Unexpected URL');
  const downloaded=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!downloaded.ok||hash(Buffer.from(await downloaded.arrayBuffer()))!==sha256)throw Error('Image readback mismatch: '+file);
  uploads[file]={sha256,url};await writeFile(cache,JSON.stringify(uploads,null,2)+'\n');
 }
 images[key]={...s,...uploads[file],sourceFile:file,sourceSecond:s.at,width:s.width??1280,height:s.height??720,transformation:key.endsWith('-board')?'Original source frame cropped to x=0,y=0,835x644. Answer-bearing lower third and toolbar removed. Secondary player names masked and replaced with 初級; visible names are 新人. No board/hand redrawing.':'Full source frame. Secondary player names and viewer seat selector anonymized as 新人/初級. No board/hand redrawing.'};
}
const stamp=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
// Question captions identify only the scene/time, never the teaching conclusion.
const image=(key,question=false)=>`![${question?'出題場面の盤面':images[key].caption}（動画 ${stamp(images[key].at)}）](${images[key].url})`;
const video=at=>lesson.videoUrl+`&t=${at}s`;
const output={lessons:[lesson],cards:[],items:[],resources:[]};
output.cards.push({id:'card-20261008-summary',lessonId:lesson.id,kind:'note',question:`授業の要約：${summary.length}のポイント`,answer:summary.map((s,i)=>`${image(s.scene)}\n\n${i+1}. ${s.title}\n${s.text}\n${video(s.at)}`).join('\n\n'),sortOrder:-1});
if(output.cards[0].answer.length>5000)throw Error('Summary editor limit exceeded');
const mapping=[];
if(new Set(questions.map(q=>q.id)).size!==questions.length)throw Error('Duplicate source IDs');
for(const [i,q]of questions.entries()){
 if(!q.answer||!q.explanation||q.at<0||q.at>5140||q.scene&&!images[q.scene])throw Error('Invalid question: '+q.id);
 const question=q.scene?[q.question,image(q.scene+'-board',true)].join('\n\n'):q.question;
 const answer=[q.answer,q.explanation,video(q.at),...q.refs.map(k=>references[k].url)].join('\n\n');
 if(question.length>2000||answer.length>5000)throw Error('Editor limit: '+q.id);
 const id=(q.type==='choice'||q.type==='cloze'?'check':'card')+'-20261008-'+q.id;
 if(['choice','cloze'].includes(q.type)){
  if(q.choices.length!==4||new Set(q.choices).size!==4||q.choices[q.correctIndex]===undefined||q.type==='cloze'&&!question.includes('［　］'))throw Error('Invalid choices: '+q.id);
  output.items.push({id,theoryId:'',type:q.type,question,choices:q.choices,correctIndex:q.correctIndex,explanation:answer,lessonIds:[lesson.id],sortOrder:i+1,deleted:false,revision:1});
 }else{
  const tileQuestion=q.tileQuestion?normalizeTileQuestion({...q.tileQuestion,board:{...q.tileQuestion.sourceBoard,imageUrl:images[q.scene+'-board'].url},naga:naga[q.id]}):null;
  if(q.tileQuestion&&!tileQuestion)throw Error('Invalid verified tile question: '+q.id);
  output.cards.push({id,lessonId:lesson.id,kind:'question',question,answer,sortOrder:i+1,...(tileQuestion?{tileQuestion}:{})});
 }
 mapping.push({sourceId:q.id,appId:id,displayNumber:i+1,type:q.type,at:q.at,scene:q.scene??null,canonicalSources:q.refs,reviewStatus:'manually-source-checked',...(q.tileQuestion?{nagaSource:q.tileQuestion.source}: {})});
}
output.resources.push({id:'resource-20261008-summary',lessonId:lesson.id,kind:'link',label:`授業の要約・盤面で振り返る${summary.length}のポイント`,url:SITE_ORIGIN+'/materials/october-2026/1008.html',sortOrder:0});
for(const [i,[k,r]]of Object.entries(references).entries())output.resources.push({id:'resource-20261008-'+k,lessonId:lesson.id,kind:'link',label:r.title,url:r.url,sortOrder:i+1});
const docs=JSON.parse(await readFile(join(root,'canonical-documents.json'),'utf8'));
const info=JSON.parse(await readFile(join(root,'video.info.json'),'utf8'));
const provenance={video:{id:videoId,title:info.title,channel:info.channel,date:'2026-10-08',durationSeconds:info.duration,url:lesson.videoUrl},method:'Full Japanese automatic-caption track read through the conclusion, and selected source frames individually inspected. Captions are an index, not verbatim authority; no continuous audiovisual playback or separate ASR claimed.',tools:{downloader:'yt-dlp 2026.08.19',frames:'ffmpeg',captions:'YouTube ja-orig'},canonicalDocuments:docs.map(d=>({title:d.title,documentId:d.documentId,revisionId:d.revisionId,checkedAt:'2026-10-08'})),transcriptSha256:hash(await readFile(join(root,'captions-clean.json'))),editorialNotes:['No fixed 30-question quota. Eighteen distinct lecturer-emphasized questions; concise 雀豪 explanations.','Question images remove the answer-bearing lower-third; theory/definition cards need no unrelated board.','The video contains edited NAGA viewer hands. Only two exact hand/draw/dora matches use the supplied report. Evaluation rates remain independent of instructor answers.','The 6-minute spoken two-meld explanation conflicts with the displayed reconstructed hand. It is tested as an explicit 2-meld/4-block theory question without that misleading scene.','6m, 5m and 7p in the 76-minute comparison are all allowed by the lecturer. The late preference for 7p is retained, not overwritten by the first 5m suggestion.','Last-round point condition: opponent is dealer; 1300/2600 tsumo closes 7800 of the 7400 gap.','Public screenshots retain board/rivers/scores/tiles but anonymize secondary player labels; raw video/report stay outside Git.','Older lesson IDs, shared edits and learning records are untouched.'],questions:mapping,images};
await mkdir('public/materials/october-2026',{recursive:true});
await writeFile('content/october-8.json',JSON.stringify(output,null,2)+'\n');
await writeFile('docs/october-8-provenance.json',JSON.stringify(provenance,null,2)+'\n');
await writeFile('public/materials/october-2026/1008.html',renderSeptemberMaterial(provenance,content));
console.log(JSON.stringify({questions:questions.length,flashcards:output.cards.length-1,checks:output.items.length,tileQuestions:questions.filter(q=>q.tileQuestion).length,summary:summary.length,images:Object.keys(images).length}));
