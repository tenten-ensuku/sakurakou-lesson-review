// Both complete caption tracks read; final explanations checked against source frames.
// The class date is user-specified: the first video was uploaded on 10/10, the second on 10/15.
import { references as canonical } from './september-2026-source.mjs';
import { checkpoint } from './october-15-checkpoint.mjs';
export const references = { ranking: canonical.order, theory: canonical.theory, shanten: canonical.shape };
export const reportId = '8961624c46df9bfb32d0caac72ac6f2979d0249f89962b6b362ad8e7ea80f05ev2_2';
export const videos = [
  { part:'first', id:'guKgCOJ_Kng', label:'前半をYouTubeで見る', url:'https://www.youtube.com/watch?v=guKgCOJ_Kng' },
  { part:'second', id:'yOVM-RWRlYE', label:'後半をYouTubeで見る', url:'https://www.youtube.com/watch?v=yOVM-RWRlYE' },
];
export const lesson = { id:'lesson-20261015-nejimaki', date:'10/15', teacher:'ねじまき鳥', title:'牌譜検討③｜一向聴の質・基本序列・七対子', videoUrl:videos[0].url };
const codes = s => [...s.matchAll(/([0-9]+)([mpsz])/g)].flatMap(m=>[...m[1]].map(n=>n+m[2]));
const sourceTiles=(hand,correct,draw,ts,tv,dora,part='first')=>{
 const tiles=codes(hand), first=part==='first';
 const regions=tiles.map((_,i)=>({x:first?264+i*34:Math.round(174+i*25.3),y:first?646:505,width:first?34:Math.round(174+(i+1)*25.3)-Math.round(174+i*25.3),height:first?48:34}));
 if(draw)regions.push({x:first?720:515,y:first?646:505,width:first?34:25.3,height:first?48:34});
 return {hand:tiles,correctTiles:codes(correct),...(draw?{draw}:{}),source:{tw:0,ts,tv,dora},sourceBoard:{width:first?970:704,height:first?720:580,regions}};
};
export const scenes = {
 'first-267':{part:'first',at:267,caption:'東1局：6mツモ。7mと9pで一向聴の質を比較'},
 'first-695':{part:'first',at:695,diagram:true,caption:'講師の分解図：5677m・333455sのくっつき受けを両方から探す'},
 'first-725':{part:'first',at:725,caption:'東1局：7sツモ。カン6sの役あり聴牌を取るか比較'},
 'first-1278':{part:'first',at:1278,caption:'東1局：5sポン直後。7mと4sの待ち選択（ポンは画面下端）'},
 'first-1465':{part:'first',at:1465,diagram:true,caption:'基本序列の原典で、オタ風と孤立1・9の逆転条件を確認'},
 'first-1845':{part:'first',at:1845,caption:'東1局1本場：5pツモ。4mと7pで同じ聴牌受けを維持できる'},
 'first-2270':{part:'first',at:2270,caption:'東2局：6sツモ。1sが4枚見えの手で3sと7sを比較'},
 'first-2840':{part:'first',at:2840,caption:'東4局：カン4mの愚形聴牌。手変わりと立直を比較'},
 'second-260':{part:'second',at:260,caption:'南1局の親：8巡目、1p・3pのシャンポンで残り3枚'},
 'second-850':{part:'second',at:850,caption:'南2局：僅差の点況で、南バック3900点のチーを検討'},
 'second-1105':{part:'second',at:1105,caption:'南3局：5sツモ。689mの9mと役牌を比較'},
 'second-2175':{part:'second',at:2175,caption:'南3局1本場：1mツモで、萬子と字牌が4ブロックになった場面'},
 'second-2280':{part:'second',at:2280,caption:'南3局1本場：七対子一向聴。面子手への渡りと南の単騎候補を比較'},
 'second-2860':{part:'second',at:2860,caption:'南3局1本場の終盤：聴牌時にドラ4sを押せるかまで考える'},
 'second-3005':{part:'second',at:3005,caption:'南3局1本場：3pの安全を精査できるか、明確な現物を使うか'},
 'second-3300':{part:'second',at:3300,caption:'南4局：4m・6mシャンポンの、枯れ・フリテン変化を確認'},
};
export const summary = [
 {scene:'first-267',title:'最大受け入れと、鳴けるタンヤオを比べる',text:'7m切りはヘッドレス2型連続形で7〜9p・2〜6sの8種25枚。9p切りは余剰牌型で瞬間の受けは12枚だが、4・7mと4sをチーでき、ドラ6m引きの打点変化もある。講師は両方を許容。チーを2倍と数える説明は機会の概算で、実際の和了率ではない。'},
 {scene:'first-695',title:'くっつきは、面子と雀頭の置き方を変えて探す',text:'5677m・234p・333455sは、4〜9mと2〜7sの12種38枚受け。5677mは7mだけでなく筋の4mも受ける。索子は333sを面子にする分解と345sを面子にする分解を重ね、7s受けを見落とさない。'},
 {scene:'first-725',title:'7700点の役あり聴牌を、薄い変化のために外さない',text:'7mを切ってカン6sの聴牌を取る。萬子の大きな打点変化は限られ、9m側にはフリテンもある。聴牌を取っても索子の変化は残る。7sを切る変化は、3sツモで2・4・5s、4sツモで3〜6s、5sツモで2〜6s待ち。3sツモ後は3sを4枚使っており、3s自体では和了れない。'},
 {scene:'first-1278',title:'5800点なら、一種の満貫変化より今の和了りやすさ',text:'5sポン後は7m切り。2・4・5s待ちは計8枚、4・7m待ちは6枚でドラそば。4s切りには6mツモで満貫になる利点があるが、その一種の変化だけで広い待ちを逃さない。7m自体がドラなら比較は変わる。'},
 {scene:'first-1465',title:'「手が悪い」の逆転条件を、別の比較へ広げない',text:'オタ風＞孤立1・9となる主な条件は、混一色を見る場合と筋で持つ孤立1・9。0面子＋2愚形以上の重い手で役牌を残す話は「役牌と孤立2・8」の比較。どの二者の逆転なのかを分ける。'},
 {scene:'first-1845',title:'同じ一向聴なら、他家への安全度も比較する',text:'4m切りでも7p切りでも、聴牌受けは1・4pと5・8s。講師の推奨は7p。上家には筋、下家には6pが3枚見えでワンチャンスとなり、4mより通しやすい。受け入れを把握したうえで比較し、ピンズが分からないから4mとはしない。ワンチャンスは安全の保証ではない。'},
 {scene:'first-2270',title:'三面張を残すため、ヘッドレス1型を選ぶ',text:'3s切りで6sの暗刻を面子とみれば、三面子一ターツのヘッドレス1型。7sを残すことで、後に2・5・8sの三面張を残せる。講師は最初の「余剰牌型」を後で訂正。今回は1sが4枚見えで、7s切り側の受けがさらに弱い。連続形2型なら常に最優先、とはしない。'},
 {scene:'first-2840',title:'愚形2600点の立直は、待ちと変化の質まで見る',text:'講師は立直を許容しつつ、カン4mが和了りにくく、1・2・6・7・9mと3sの6種に改善があるためダマも評価した。原典の基本線「立直＋1飜あれば愚形でも立直」とは分け、今回の待ち・変化込みの講師判断として覚える。AIの学習時期に関する推測は根拠にしない。'},
 {scene:'second-260',title:'親の8巡目は、遠い好形化より今の聴牌を生かす',text:'1pが直前に切れて残り3枚でも、講師は立直推奨。聴牌を外して望む好形化は3・5mと2pの3種程度で、その後の和了まで遠い。34÷3＝約11.3巡は講義の概算で、見え枚数を反映した精密な待ち時間ではない。大きなトップ目なら別の判断もある。'},
 {scene:'second-850',title:'南2局の僅差では、3900点の一和了が重い',text:'南バックで両面から鳴く判断も有力。残り局数が少なく、3900点の加点でトップ目に立つ価値が大きい。講師は南ポンを明確に推奨し、両面チーとスルーの差は微差とした。常に両面から鳴く規則にはしない。'},
 {scene:'second-1105',title:'スキップ牌の加点だけで、基本序列を逆転させない',text:'689mの9mは通常の孤立9mより少し機能があるが、役牌より上という意味ではない。今回は0面子の重い手で、9mを切って役牌の重なりと守備力を残す。ドラ受け9sを残すかの別場面も、00物件の手全体の方針から見直す。'},
 {scene:'second-2175',title:'一枚のツモで、混一色4ブロックが成立する',text:'1mツモで11223mが2ブロック、688mが1ブロック、東対子が1ブロック。染め色と字牌で4ブロックあるので、北からではなく5pまたは3sを処理して混一色への渡りを残す。枚数だけでなく、ブロックの増えた瞬間に気づく。'},
 {scene:'second-2280',title:'七対子一向聴では、実際に使う単騎候補を残す',text:'面子手へ行く現実的な手順が薄ければ、3sのくっつきより南などのフィニッシャーを持つ。ドラ4sを引いても七対子を続けるなら、3sの機能を過大評価しない。ただし今回の細かな残し牌の不一致は、混一色の見落としと同じ大ミスとして扱わない。'},
 {scene:'second-2860',title:'聴牌時に押せない牌があるなら、名目の一向聴にこだわらない',text:'面子手で聴牌してもドラ4sを切るつもりがなければ、その受けを残す価値は低い。より通しやすい3mを使って降りる選択も考える。安全度を時間内に精査できない場合は、推測で数牌を切るより明確に認識した現物を使う。'},
];
export const questions = [
 {id:'wide-or-open',type:'tile',scene:'first-267',part:'first',at:267,refs:['shanten','theory'],question:'何切る？（講師が許容した候補を選ぶ）',tileQuestion:sourceTiles('577m23489p33450s','7m9p','6m',0,61,'0m'),answer:'7m・9pのどちらも有力。',explanation:'7mは連続形のヘッドレス2型、8種25枚。9pはタンヤオで4・7mと4sを鳴け、ドラ6mの変化もある。瞬間の枚数だけで一択にしない。'},
 {id:'double-decomposition',type:'flashcard',part:'first',at:695,answerScene:'first-695',refs:['shanten'],question:'5677m・234p・333455sの13枚。くっつき一向聴の聴牌受け入れは？',answer:'4〜9m、2〜7s。12種38枚（自分の手牌だけを除く）。',explanation:'5677mは4mも受ける。索子は333sを面子とする4sのくっつきと、345sを面子とする5sのくっつきを合わせる。'},
 {id:'take-7700-tenpai',type:'tile',scene:'first-725',part:'first',at:725,refs:['shanten','theory'],question:'何切る？',tileQuestion:sourceTiles('5677m234p333450s','7m','7s',0,77,'0m'),answer:'7mを切り、カン6sの聴牌を取る。',explanation:'役あり7700点の聴牌を確保。聴牌を外して得する萬子変化は限られ、索子の多面待ち変化は聴牌を取っても残る。'},
 {id:'seven-tile-upgrades',type:'flashcard',part:'first',at:945,refs:['shanten'],question:'3334557sのカン6s聴牌。3s・4s・5sを引き、いずれも7sを切った後の待ちは？',answer:'3sツモ：2・4・5s。4sツモ：3〜6s。5sツモ：2〜6s。',explanation:'面子と雀頭を置き換えて探す。3sツモ後の3sは4枚使いで和了牌にはならない。講義の「2〜5s」という範囲表現と、実際に和了れる牌を分ける。'},
 {id:'pon-5800',type:'tile',scene:'first-1278',part:'first',at:1278,refs:['theory'],question:'5sをポンした直後、何切る？（ポンには赤5sを1枚含む）',tileQuestion:sourceTiles('5677m234p3334s','7m',undefined,0,81,'0m'),answer:'7m切り。2・4・5sの三面張へ。',explanation:'8枚待ちの5800点を優先。4s切りの4・7m待ちは6枚でドラそば。6mを引く一種の満貫変化だけでは、今の和了りやすさを落とさない。'},
 {id:'ranking-exception-scope',type:'cloze',part:'first',at:1465,refs:['ranking'],question:'「オタ風より孤立1・9を先に切る」逆転条件は、混一色を見る場合と［　］。',choices:['筋で持っている孤立1・9','0面子＋2愚形以上なら無条件','役牌が1枚切れのとき全て','孤立1・9がドラ受けのとき'],correctIndex:0,answer:'筋で持っている孤立1・9。',explanation:'重い手で「役牌＞孤立2・8」となる話とは別。どの二者の序列が逆転するのかを混同しない。'},
 {id:'equal-acceptance-safety',type:'tile',scene:'first-1845',part:'first',at:1845,refs:['theory','shanten'],question:'何切る？（講師の推奨）',tileQuestion:sourceTiles('4m2367788p12367s','7p','5p',1,79,'4p'),answer:'7p。4mより通しやすく、同じ一向聴を維持できる。',explanation:'両方とも聴牌受けは1・4pと5・8s。7pは上家に筋、下家にワンチャンス。先切りの意図がある4mも講師は条件付きで許容したが、推奨は7p。'},
 {id:'keep-sanmenchan',type:'tile',scene:'first-2270',part:'first',at:2270,refs:['shanten'],question:'何切る？',tileQuestion:sourceTiles('234789m67p23667s','3s','6s',2,63,'8s'),answer:'3s切り。三面張を残せるヘッドレス1型へ。',explanation:'6s暗刻を面子とみる1型。7sを残して2・5・8s待ちを作る道を重視する。7s切りの2型も形だけなら微差だが、今回は1sが4枚見え。講師の「余剰牌型」は後で訂正されている。'},
 {id:'kanchan-dama-context',type:'choice',scene:'first-2840',part:'first',at:2890,refs:['theory'],question:'このカン4m・愚形2600点で、講師が立直を許容しつつダマも評価した理由は？',choices:['ドラが1枚ある手は必ずダマだから','中央のカンチャンが和了りにくく、良形化・打点変化が複数あるから','子の愚形は巡目を問わず立直禁止だから','他家全員が聴牌していると確定したから'],correctIndex:1,answer:'待ちの和了りにくさと、複数の有効な変化。',explanation:'1・2・6・7・9mと3sの6種を確認。原典の「立直＋1飜あれば愚形でも立直」は基本線として残し、今回は講師の条件付き判断と区別する。'},
 {id:'dealer-eight-turn',type:'choice',scene:'second-260',part:'second',at:320,refs:['theory'],question:'親の8巡目、1p・3pシャンポンで残り3枚。直前に1pが切れたこの場面で、講師の推奨は？',choices:['好形になるまで必ず聴牌を外す','残り3枚なら役に関係なくベタオリ','今の聴牌で立直する','1pだけを常に固定して待ち替える'],correctIndex:2,answer:'立直。今の聴牌と連荘の機会を生かす。',explanation:'外して望む好形化は3・5mと2pの3種程度で、そこから和了まで遠い。親の先制を生かす。大きなトップ目なら同じ判断とは限らない。'},
 {id:'late-3900-call',type:'choice',scene:'second-850',part:'second',at:850,refs:['theory'],question:'南2局・僅差のこの手で、南以外の両面からもチーする判断が有力になる理由は？',choices:['終盤はどんな安手でも両面から鳴く決まりだから','南バックなら常に全て鳴かなければならないから','両面を鳴けば必ず一発を消せるから','残り局数が少なく、3900点の一和了でトップ目に立つ価値が高いから'],correctIndex:3,answer:'残り局数と点差に対する、3900点の加点価値。',explanation:'手の形だけなら南から鳴くことが多いが、今回は点況で両面発進も有力。講師はチーとスルーの差を微差としており、スルーを大ミスにはしない。'},
 {id:'skip-nine-vs-honors',type:'tile',scene:'second-1105',part:'second',at:1105,refs:['ranking','theory'],question:'何切る？',tileQuestion:sourceTiles('112689m7p225s367z','9m','5s',7,21,'7s','second'),answer:'9m切り。役牌を残す。',explanation:'689mの9mは通常の孤立9mより少し強いが、役牌より上という意味ではない。0面子の重い手では、役牌の重なりと守備力を優先する。'},
 {id:'six-turn-not-forced',type:'choice',part:'second',at:1505,refs:['theory'],question:'6巡目に0面子。西を切っても各家に2〜3枚の安全候補が残ると確認できた。定点チェック上、西を必ず残すべき？',choices:['必須ではない。各家への備えを確認したうえで比較する','0面子なら安全牌以外は全て捨てる','西がある限りは役牌も全て先切りする','0面子でも定点チェックは不要'],correctIndex:0,answer:'必須ではない。将来のリーチへ備えられるかが目的。',explanation:'安全牌を機械的に1枚増やす命令ではない。講師は西を残す案も、既に備えが足りると判断して切る案も許容した。'},
 {id:'four-block-honitsu',type:'tile',scene:'second-2175',part:'second',at:2175,refs:['theory'],question:'何切る？（講師が示した候補を選ぶ）',tileQuestion:sourceTiles('1223688m5p3s1124z','5p3s','1m',8,13,'3s','second'),answer:'5pまたは3s。北は残して混一色を見る。',explanation:'1mツモで11223mが2ブロック、688mと東対子が各1ブロック。染め色と字牌の4ブロックが成立したので、混一色への渡りを残す。'},
 {id:'chiitoi-finisher',type:'flashcard',scene:'second-2280',part:'second',at:2280,refs:['theory'],question:'七対子一向聴のこの場面。南の単騎候補より3sを残すかを比べるとき、3sに最も都合のよいドラ4sを引いた後までどう確認する？',answer:'4sを引いても七対子を続けるなら、3sのくっつき価値は低い。南などのフィニッシャーを残す。',explanation:'面子手へ渡る現実的な手順を先に確かめる。七対子一向聴ではフィニッシャーを2種類以上意識。ただし今回の細かな候補差を全て大ミス扱いにはしない。'},
 {id:'unpushable-dora',type:'choice',scene:'second-2860',part:'second',at:2860,refs:['theory'],question:'面子手の聴牌にはドラ4sを押す必要があるが、そこまで押す価値がないと判断した。今、面子手の一向聴を維持するために危険を増やすべき？',choices:['一向聴の表示を維持できるなら必ず押す','維持する意味は薄い。より安全な3mなどで降りる','ドラは必ず切り飛ばすので関係ない','七対子の道も必ず同時に捨てる'],correctIndex:1,answer:'実際に使えない受けのために危険を増やさない。',explanation:'鳴いても4sを押さず、聴牌を取るつもりがないなら、名目の一向聴を守る価値は低い。形を残す前に、聴牌時の押し牌を確認する。'},
 {id:'time-limited-safety',type:'flashcard',scene:'second-3005',part:'second',at:3005,refs:['theory'],question:'終盤、3pなら形を保てそうだが、時間内に安全度を精査できない。東は現物だと明確に認識できている。このとき講師が許容した実戦対応は？',answer:'東を切る。安全だと確認できない3pを、形だけで選ばない。',explanation:'時間を使えば3pの安全を精査できる場面でも、実戦の処理時間は別。確認できた現物で守る判断を責めない。'},
 {id:'effective-change-quality',type:'cloze',scene:'second-3300',part:'second',at:3300,refs:['theory'],question:'2mが枯れ、7mを引く両面変化はフリテンになる4m・6mシャンポン。手変わりは［　］。',choices:['両面という名前になれば全て強い変化と数える','理論上の種類数だけで評価する','残り枚数とフリテンを反映して質を評価する','ドラがあると全て無効になる'],correctIndex:2,answer:'残り枚数とフリテンを反映して、変化の質を評価する。',explanation:'今回は萬子の両面変化が弱い。立直も、立直しないなら聴牌を外す案も講師は許容した。「聴牌は必ず取る」へ固定しない。'},
 checkpoint,
];
