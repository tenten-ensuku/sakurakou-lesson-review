// node scripts/prepare-october-15-lesson.mjs <private-source-dir> [--upload-images]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import * as content from '../content/october-15-source.mjs';
import naga from '../content/october-15-naga.json' with {type:'json'};
import jsonBoards from '../content/october-15-json-boards.json' with {type:'json'};
import {normalizeTileQuestion} from '../app/lib/tile-question.mjs';
import {renderSeptemberMaterial} from './render-september-material.mjs';
import {SITE_ORIGIN} from '../app/lib/site-origin.mjs';
const {lesson,videos,questions,summary,scenes,references,reportId}=content;
if(!process.argv[2])throw Error('Private source directory required');
const root=resolve(process.argv[2]),hash=b=>createHash('sha256').update(b).digest('hex');
const cache=join(root,'app-image-uploads.json');let uploads={};
try{uploads=JSON.parse(await readFile(cache,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const images={},imageScenes={...scenes};
for(const q of questions.filter(q=>q.scene))imageScenes[q.scene+'-board']={...scenes[q.scene]};
for(const [key,s]of Object.entries(imageScenes)){
 const file=`frames-public/${key}.jpg`,bytes=await readFile(join(root,file)),sha256=hash(bytes);
 if(uploads[file]?.sha256!==sha256){
  if(!process.argv.includes('--upload-images'))throw Error('Image not uploaded: '+file);
  const r=await fetch(SITE_ORIGIN+'/api/images',{method:'POST',headers:{'content-type':'image/jpeg'},body:bytes,signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error(`Image upload ${file}: ${r.status}`);
  const {url}=await r.json();if(!url?.startsWith(SITE_ORIGIN+'/api/images/note-images/'))throw Error('Unexpected image URL');
  const check=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!check.ok||hash(Buffer.from(await check.arrayBuffer()))!==sha256)throw Error('Readback mismatch: '+file);
  uploads[file]={sha256,url};await writeFile(cache,JSON.stringify(uploads,null,2)+'\n');
 }
 images[key]={...s,...uploads[file],sourceFile:file,width:s.part==='first'?970:704,height:s.part==='first'?720:580,videoId:videos.find(v=>v.part===s.part).id,transformation:s.diagram?'Original lecturer diagram cropped to remove decorative margins.':'Source board cropped to remove decorative margins, controls and metrics. All player labels anonymized as 新人/初級.'};
 if(key.endsWith('-board'))images[key].transformation+=' Original answer bars and selection outlines masked outside tile faces; no hand redraw. Question caption contains no answer.';
}
const stamp=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const image=(key,question=false)=>`![${question?'出題場面の盤面':images[key].caption}（${images[key].part==='first'?'前半':'後半'} ${stamp(images[key].at)}）](${images[key].url})`;
const video=q=>videos.find(v=>v.part===q.part).url+`&t=${q.at}s`;
const output={lessons:[lesson],cards:[],items:[],resources:[]};
for(const part of ['first','second']){
 const points=summary.filter(s=>scenes[s.scene].part===part);
 const answer=points.map(s=>`${image(s.scene)}\n\n${summary.indexOf(s)+1}. ${s.title}\n${s.text}\n${video(scenes[s.scene])}`).join('\n\n');
 if(answer.length>5000)throw Error('Summary editor limit exceeded');
 output.cards.push({id:`card-20261015-summary-${part}`,lessonId:lesson.id,kind:'note',question:`授業の要約：${part==='first'?'前半':'後半'}の${points.length}ポイント`,answer,sortOrder:part==='first'?-2:-1});
}
const mapping=[];if(new Set(questions.map(q=>q.id)).size!==questions.length)throw Error('Duplicate source IDs');
for(const [i,q]of questions.entries()){
 if(!q.answer||!q.explanation||q.at<0||q.at>(q.part==='first'?3058:3579)||q.scene&&!images[q.scene])throw Error('Invalid question: '+q.id);
 const question=q.scene?[q.question,image(q.scene+'-board',true)].join('\n\n'):q.question;
 const answer=[q.answer,q.explanation,...(q.answerScene?[image(q.answerScene)]:[]),video(q),...q.refs.map(k=>references[k].url)].join('\n\n');
 if(question.length>2000||answer.length>5000)throw Error('Editor limit: '+q.id);
 const check=['choice','cloze'].includes(q.type),id=(check?'check':'card')+'-20261015-'+q.id;
 if(check){
  if(q.choices.length!==4||new Set(q.choices).size!==4||q.choices[q.correctIndex]===undefined||q.type==='cloze'&&!question.includes('［　］'))throw Error('Invalid choices');
  output.items.push({id,theoryId:'',type:q.type,question,choices:q.choices,correctIndex:q.correctIndex,explanation:answer,lessonIds:[lesson.id],sortOrder:i+1,deleted:false,revision:1});
 }else{
  const tileQuestion=q.tileQuestion?normalizeTileQuestion({...q.tileQuestion,...(jsonBoards[id]??{board:{...q.tileQuestion.sourceBoard,imageUrl:images[q.scene+'-board'].url}}),naga:naga[q.id]}):null;
  if(q.tileQuestion&&!tileQuestion)throw Error('Invalid tile question: '+q.id);
  output.cards.push({id,lessonId:lesson.id,kind:'question',question,answer,sortOrder:i+1,...(tileQuestion?{tileQuestion}:{})});
 }
 mapping.push({sourceId:q.id,appId:id,displayNumber:i+1,type:q.type,part:q.part,at:q.at,videoUrl:video(q),scene:q.scene??null,canonicalSources:q.refs,reviewStatus:'manually-source-checked',...(q.tileQuestion?{nagaSource:q.tileQuestion.source}:{})});
}
output.resources.push({id:'resource-20261015-summary',lessonId:lesson.id,kind:'link',label:`授業の要約・盤面で振り返る${summary.length}のポイント`,url:SITE_ORIGIN+'/materials/october-2026/1015.html',sortOrder:0});
for(const [i,v]of videos.entries())output.resources.push({id:'resource-20261015-'+v.part,lessonId:lesson.id,kind:'link',label:v.label,url:v.url,sortOrder:i+1});
for(const [i,[key,r]]of Object.entries(references).entries())output.resources.push({id:'resource-20261015-'+key,lessonId:lesson.id,kind:'link',label:r.title,url:r.url,sortOrder:i+3});
output.resources.push({id:'resource-20261015-naga',lessonId:lesson.id,kind:'link',label:'授業で使用したNAGA解析',url:`https://naga.dmv.nico/htmls/report_viewer.html?report_id=${reportId}&tw=0`,sortOrder:6});
const docs=JSON.parse(await readFile(join(root,'canonical-documents.json'),'utf8'));
const sourceVideos=[];for(const v of videos){const info=JSON.parse(await readFile(join(root,v.part,v.id+'.info.json'),'utf8'));sourceVideos.push({id:v.id,title:info.title,channel:info.channel,uploadDate:info.upload_date,durationSeconds:info.duration,url:v.url,transcriptSha256:hash(await readFile(join(root,v.part,'captions-clean.json')))});}
const provenance={lessonDate:'2026-10-15',sources:sourceVideos,method:'Both complete Japanese automatic-caption tracks read through the conclusion. Selected source frames individually inspected, including enlarged hand crops for seven exact NAGA matches. No full continuous audiovisual playback or separate ASR claimed.',tools:{downloader:'yt-dlp 2026.08.19',frames:'ffmpeg',captions:'YouTube ja-orig'},canonicalDocuments:docs.map(d=>({title:d.title,documentId:d.documentId,revisionId:d.revisionId,checkedAt:'2026-10-16',tabs:d.documentId===references.theory.url.match(/\/d\/([^/]+)/)?.[1]?[{id:'t.0',empty:false},{id:'t.mbzxyws4etwa',empty:true}]:[{id:'t.0',empty:false}]})),tenten2:{guide:'指南方針.md',applied:['Compare whole-hand purpose before local tile efficiency.','Distinguish lecturer, canonical baseline, correction, acceptable alternative and NAGA rates.','Treat small chiitoitsu choices and limited calculation time fairly.'],relatedNotes:[{videoId:'t4u3k9n4t-E',at:2928,usedFor:'Finisher purpose and pushable tiles; note text read, not imported as a matching board.'},{videoId:'vNHRcqjnSEE',at:4450,usedFor:'Headless I/II boundary; note text read, not imported as a matching board.'}]},editorialNotes:['User-specified 10/15 class groups both parts. First source upload date is 10/10; not mislabelled as a 10/15 upload.','Eighteen distinct points, no fixed thirty-question quota. Notes excluded from all study modes.','Lecturer corrects 3s-discard classification from 余剰牌型 to ヘッドレス1型 at first 40:35.','3334557s + 3s - 7s waits on 2/4/5s, not a fifth 3s. Corrected range shorthand after independent enumeration.','The parent 7700/5800 comparisons are not child 8000/3900 point comparisons.','NAGA Omega/Nishiki rates are exact source values, never instructor grading. Seven hand/draw/dora matches; red tiles retained.','34 divided by effective tile kinds and doubling chi chances are lecture heuristics, not exact probabilities.','Do not present lecturer speculation about AI training dates or a corrected hypothetical bad-move rate as verified statistics.','Public player labels use 新人/初級. Raw media, full reports and private reference corpus stay outside the repository.','Existing shared lesson edits, IDs and learner data remain untouched.'],questions:mapping,images};
await mkdir('public/materials/october-2026',{recursive:true});
await writeFile('content/october-15.json',JSON.stringify(output,null,2)+'\n');
await writeFile('docs/october-15-provenance.json',JSON.stringify(provenance,null,2)+'\n');
const material={...content,summary:summary.map(s=>({...s,videoUrl:videos.find(v=>v.part===scenes[s.scene].part).url}))};
await writeFile('public/materials/october-2026/1015.html',renderSeptemberMaterial(provenance,material));
console.log(JSON.stringify({questions:questions.length,notes:2,flashcards:questions.filter(q=>q.type==='flashcard').length,choices:output.items.filter(q=>q.type==='choice').length,cloze:output.items.filter(q=>q.type==='cloze').length,tileQuestions:questions.filter(q=>q.tileQuestion).length,summary:summary.length,images:Object.keys(images).length}));
