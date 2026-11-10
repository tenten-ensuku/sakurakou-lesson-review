// Private media stays outside Git. Publication uploads only reviewed teaching crops.
import assert from 'node:assert/strict';
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{spawnSync}from'node:child_process';
import{resolve,join}from'node:path';
import{createHash}from'node:crypto';
import{renderSeptemberMaterial}from'./render-september-material.mjs';
import{SITE_ORIGIN}from'../app/lib/site-origin.mjs';
import * as source from '../content/october-26-source.mjs';
import boards from '../content/october-26-boards.json' with {type:'json'};
import tileQuestions from '../content/october-26-tiles.json' with {type:'json'};
const [rootArg]=process.argv.slice(2);assert.ok(rootArg);
const root=resolve(rootArg),{lesson,scenes,questions,summary,references}=source;
const hash=b=>createHash('sha256').update(b).digest('hex');
const meta=JSON.parse(await readFile(join(root,'mLvqssxommU.info.json')));
assert.equal(meta.upload_date,'20261026');assert.equal(meta.channel,'ねじまき鳥');assert.equal(questions.length,15);
await mkdir(join(root,'reviewed'),{recursive:true});
let uploads={};try{uploads=JSON.parse(await readFile(join(root,'image-uploads.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const images={};
const font='C\\:/Windows/Fonts/meiryo.ttc';
const labels=[{x:333,y:398,w:113,h:64},{x:280,y:80,w:68,h:120},{x:620,y:76,w:110,h:70},{x:718,y:395,w:63,h:103}];
for(const[key,scene]of Object.entries(scenes)){
 for(const kind of ['summary']){
  const file=key+'-'+kind+'.png',path=join(root,'reviewed',file);
  const masks=labels.flatMap(b=>[`drawbox=x=${b.x}:y=${b.y}:w=${b.w}:h=${b.h}:color=0x063654:t=fill`,`drawtext=fontfile='${font}':text='新人':fontcolor=white:fontsize=16:x=${b.x+5}:y=${b.y+8}`,`drawtext=fontfile='${font}':text='初級':fontcolor=white:fontsize=14:x=${b.x+5}:y=${b.y+31}`]);
  const filters=scene.diagram?[`crop=590:${scene.at===2960?260:230}:315:120`]:[...masks,...(kind==='question'?['drawbox=x=332:y=465:w=378:h=40:color=0x032844:t=fill','drawbox=x=332:y=540:w=378:h=40:color=0x032844:t=fill']:[]),'crop=690:580:166:0'];
  const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',join(root,'frames',`scene-${scene.at}.png`),'-vf',filters.join(','),'-frames:v','1',path],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const bytes=await readFile(path),sha256=hash(bytes);
  if(process.argv.includes('--prepare-only'))continue;
  if(uploads[file]?.sha256!==sha256){
   assert.ok(process.argv.includes('--upload-images'),'Review generated crops first, then pass --upload-images: '+file);
   const r=await fetch(SITE_ORIGIN+'/api/images',{method:'POST',headers:{'content-type':'image/png'},body:bytes,signal:AbortSignal.timeout(60000)});assert.ok(r.ok,'Upload '+r.status);
   const{url}=await r.json();assert.ok(url?.startsWith(SITE_ORIGIN+'/api/images/note-images/'));
   const check=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.ok(check.ok);assert.equal(hash(Buffer.from(await check.arrayBuffer())),sha256);
   uploads[file]={url,sha256};await writeFile(join(root,'image-uploads.json'),JSON.stringify(uploads,null,2)+'\n');
  }
  images[key+(kind==='question'?'-board':'')]={...scene,...uploads[file],file,width:scene.diagram?590:690,height:scene.diagram?(scene.at===2960?260:230):580,transformation:scene.diagram?'Original lecturer diagram cropped; not an actual game board.':'Original contiguous tile faces retained at original resolution; only player-label areas anonymized as 新人/初級, and evaluation bars outside the hand hidden in question crops. No tile redraw or resizing.'};
 }
}
if(process.argv.includes('--prepare-only')){console.log('Reviewed crops prepared; no network calls or public files changed.');process.exit(0);}
const stamp=at=>`${Math.floor(at/60)}:${String(at%60).padStart(2,'0')}`;
const image=(key,question=false)=>`![${question?'出題場面の盤面':images[key].caption}（${stamp(images[key].at)}）](${images[key].url})`;
const boardImage=key=>{const url=Object.keys(boards).find(url=>boards[url].id===key);assert.ok(url,'Unmatched NAGA scene: '+key);return `![出題場面の盤面（${stamp(scenes[key].at)}）](${url})`;};
const video=q=>lesson.videoUrl+'&t='+q.at+'s';
const data={lessons:[lesson],cards:[],items:[],resources:[]},mapping=[];
for(const[i,q]of questions.entries()){
 const check=['choice','cloze'].includes(q.type),id=(check?'check':'card')+'-20261026-'+q.id;
 const question=q.scene&&q.type!=='tile'?q.question+'\n\n'+boardImage(q.scene):q.question;
 const answer=[q.answer,q.explanation,...(q.answerScene?[image(q.answerScene)]:[]),video(q),...q.refs.map(k=>references[k].url)].join('\n\n');
 assert.ok(question.length<=2000&&answer.length<=5000);
 if(check){assert.equal(new Set(q.choices).size,4);assert.ok(q.choices[q.correctIndex]);if(q.type==='cloze')assert.ok(q.question.includes('［　］'));data.items.push({id,theoryId:'',type:q.type,question,choices:q.choices,correctIndex:q.correctIndex,explanation:answer,lessonIds:[lesson.id],sortOrder:i+1,deleted:false,revision:1});}
 else data.cards.push({id,lessonId:lesson.id,kind:'question',question,answer,sortOrder:i+1,...(q.type==='tile'?{tileQuestion:tileQuestions[q.id]}:{})});
 mapping.push({appId:id,displayNumber:i+1,type:q.type,at:q.at,sourceUrl:video(q),scene:q.scene??null,answerScene:q.answerScene??null,canonicalSources:q.refs,reviewStatus:'caption-and-source-frame-checked'});
}
// Two note cards, outside every question session. Both preserve image -> point order.
for(const[part,points]of[summary.slice(0,7),summary.slice(7)].entries()){
 const answer=points.map(p=>[image(p.scene),`${summary.indexOf(p)+1}. ${p.title}`,p.text,video(scenes[p.scene])].join('\n\n')).join('\n\n');assert.ok(answer.length<=5000);
 data.cards.push({id:'card-20261026-summary-'+(part+1),lessonId:lesson.id,kind:'note',question:`授業の要約：${part===0?'前半':'後半'}の${points.length}ポイント`,answer,sortOrder:part-2});
}
data.resources.push({id:'resource-20261026-summary',lessonId:lesson.id,kind:'link',label:`授業の要約・盤面で振り返る${summary.length}のポイント`,url:SITE_ORIGIN+'/materials/october-2026/1026.html',sortOrder:0});
for(const[i,[key,r]]of Object.entries(references).entries())data.resources.push({id:'resource-20261026-'+key,lessonId:lesson.id,kind:'link',label:r.title,url:r.url,sortOrder:i+1});
const nagaProof=JSON.parse(await readFile('docs/october-26-naga-provenance.json'));
data.resources.push({id:'resource-20261026-naga',lessonId:lesson.id,kind:'link',label:'NAGA解析で盤面を確認する',url:'https://naga.dmv.nico/htmls/report_viewer.html?report_id='+nagaProof.reportId+'&tw=0',sortOrder:4});
const docs=JSON.parse(await readFile(join(root,'canonical-documents.json')));
const provenance={lessonDate:'2026-10-26',checkedAt:'2026-11-10',sources:[{id:'mLvqssxommU',title:meta.title,channel:meta.channel,uploadDate:meta.upload_date,durationSeconds:meta.duration,url:lesson.videoUrl,transcriptSha256:hash(await readFile(join(root,'captions-clean.json')))}],method:'Complete Japanese auto-caption track (1213 segments, through closing remarks) read. Relevant source frames inspected individually. No full continuous audiovisual playback claimed. Summary screenshots retain contiguous original tile faces; question boards use shared NAGA JSON replay.',naga:{reportUrlProvided:true,modelRatesExtracted:true,reportId:nagaProof.reportId,reportSha256:nagaProof.reportSha256,boardCount:10,tileQuestionCount:3,modelCount:7,verification:'Full source hand, draw, dora and remaining wall matched against video frames. Instructor answers kept separate from model probabilities.'},canonicalDocuments:docs.map(({text,...d})=>({...d,checkedAt:'2026-11-10'})),tenten2:{guide:'指南方針.md',applied:['Preserve lecture corrections and permitted alternatives.','Compare shanten, safe tile count and point conditions before choosing a rule.','Do not label a reasonable alternative a large mistake.'],relatedNote:{videoId:'CGy9emIzZHg',at:1444,verification:'Note text read for the distinction between hand-building and defending against riichi; not reused as a matching image.'}},corrections:[{at:2652,from:'8s切りは完全形',adopted:'6sが余剰の余剰牌型',reason:'Lecturer corrects classification.'},{at:3269,from:'生徒は9sを切った',adopted:'実打は8m。講師も評価を訂正',reason:'Retain final judgement and avoid falsely marking student wrong.'},{at:3752,from:'赤を残さないと逆転できない',adopted:'5本場・供託1本で1300+2500=3800。赤5m切り立直を検討',reason:'Lecturer checks point condition again.'},{at:2337,from:'4s切りは安牌見落とし',adopted:'壁等から4sも非常に通りやすいと訂正',reason:'Not extracted as a new mistake question.'}],questions:mapping,images};
await writeFile('content/october-26.json',JSON.stringify(data,null,2)+'\n');
await writeFile('docs/october-26-provenance.json',JSON.stringify(provenance,null,2)+'\n');
await mkdir('public/materials/october-2026',{recursive:true});
await writeFile('public/materials/october-2026/1026.html',renderSeptemberMaterial(provenance,source));
console.log(JSON.stringify({questions:questions.length,notes:2,summary:summary.length,images:Object.keys(images).length,sourceUploadDate:meta.upload_date}));
