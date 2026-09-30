// 79:53 video: full Japanese captions indexed; key source frames individually read.
// No question quota. Recommendations and accepted alternatives remain distinct.
import { references as canonical } from "./september-2026-source.mjs";
export const references = { ranking: canonical.order, theory: canonical.theory, shanten: canonical.shape };
export const videoId = "9Vrexb5RLaM";
export const lesson = { id: "lesson-20260930-tenten", date: "9/30", teacher: "てんてん", title: "大会牌譜検討｜安全度・鳴き・雀頭の残し方", videoUrl: `https://www.youtube.com/watch?v=${videoId}` };
const codes = (value) => [...value.matchAll(/([0-9]+)([mpsz])/g)].flatMap((m) => [...m[1]].map((n) => n + m[2]));
const tiles = (hand, correct, draw, label) => ({ hand: codes(hand), correctTiles: codes(correct), ...(draw ? { draw } : {}), ...(label ? { label } : {}) });
// Manually inspected source pixels. Concealed tiles are contiguous at the
// bottom of the 1280x720 viewer; the separated draw remains separated.
const sourceTiles = (hand, correct, draw) => {
  const data = tiles(hand, correct, draw);
  return { ...data, sourceBoard: { width: 760, height: 614, regions: [...data.hand.map((_, i) => ({ x: 219 + i * 27, y: 530, width: 27, height: 37 })), ...(draw ? [{ x: 585, y: 530, width: 27, height: 37 }] : [])] } };
};
export const scenes = {
  "0230": { at: 230, caption: "東1局：早いリーチを受けた1面子の手。オリながら面子数の変化も見る" },
  "0444": { at: 444, caption: "東1局：鳴きとツモで2面子の一向聴に進んだ場面" },
  "0495": { at: 495, caption: "東1局：9mツモ。3pの4枚見え・8pの通過・5pの見え枚数を確認" },
  "0589": { at: 589, caption: "東1局終盤：残り山19枚。完全形一向聴を維持する価値を再評価" },
  "0733": { at: 733, caption: "東2局序盤：自風の西が出た場面。雀頭と両面があり、西対子を鳴ける" },
  "1005": { at: 1005, caption: "東2局：二件リーチに5sツモ。西と南の残り枚数、宣言牌の筋を比較" },
  "1267": { at: 1267, caption: "東3局：ドラ中を含む手。13sの形になる前の場面" },
  "1299": { at: 1299, caption: "東3局：3m切り後の一向聴。13s・67p・南対子・ドラ中が残る" },
  "1710": { at: 1710, caption: "東4局序盤：6889sと発対子。9sを残す価値を検討（3mが離れて表示）" },
  "1824": { at: 1824, caption: "講師が示した『一手先フォロー牌』の定義。二種以上という条件を確認" },
  "2210": { at: 2210, caption: "南1局：9pツモ。純チャン・三色の打点と、対子を使う速度を比較" },
  "2300": { at: 2300, caption: "南1局：8pツモ。中をポン材と考え、唯一雀頭の88sを残す" },
  "2510": { at: 2510, caption: "南1局：講師が宣言牌の筋を説明。宣言前の先切りと区別する" },
  "2586": { at: 2586, caption: "南2局序盤：6pツモ。中の役と11sの雀頭を残し、東・北の処理を検討" },
  "2985": { at: 2985, caption: "南2局：中ポン直後。雀頭の11sを残したくっつき一向聴の手順を確認" },
  "3146": { at: 3146, caption: "南2局：下家から4pが出た場面。4pポン後の6p切りと5s切りを比較" },
  "3320": { at: 3320, caption: "南3局：3着目の自分、ラス目の親、下家の染め手。親への現物2sも確認" },
  "3769": { at: 3769, caption: "南3局終盤：3pツモ。2pの4枚見えと6pの通過で安全に一向聴を維持" },
  "3929": { at: 3929, caption: "南3局2本場：二件リーチの局。満貫愚形聴牌に取る6s押しを検討" },
  "4238": { at: 4238, caption: "終盤の形式聴牌の価値を説明。聴牌収入とノーテン支出の差を数える" },
  "4380": { at: 4380, caption: "副露対応の基準表。親・高打点・待ち・自手価値の四条件を確認" },
};
export const summary = [
  { title: "オリに決めても、手牌価値は更新する", scene: "0444", at: 444, text: "1面子なら安全優先。鳴きとツモで2面子の一向聴になったら、ローリスクに粘れるかを再判定する。『最初にオリと決めたから最後までオリ』ではない。" },
  { title: "筋だけでなく、否定できる放銃形を数える", scene: "0495", at: 500, text: "3pの4枚見えで25p両面、8pの通過で58p両面を否定。5pは3枚見えでシャボもない。講師は低リスクの5pを推奨する。ただし、この条件だけでカン5p・単騎まで完全には否定できないので『絶対安牌』とは覚えない。" },
  { title: "二件リーチには『筋』の一語で切らない", scene: "1005", at: 1030, text: "講師の最終判断は西。西は残り1枚、南は残り2枚でシャボも残る。2s宣言の筋5sも、246sから6s→2sでカン5sが残る。筋だから5sが安全、とはならない。" },
  { title: "弱い二度受けと、一手先フォロー牌を区別する", scene: "1710", at: 1732, text: "6889sの9sは先に処理。1224の鏡像に当たる弱い二度受けで、役牌より優先して残す形ではない。暗刻化した後も、特定の一種でしかフォローに進化しないなら『二種以上』という一手先フォロー牌の定義を満たさない。" },
  { title: "鳴く役牌対子を、残す雀頭に数えない", scene: "2300", at: 2295, text: "中はポン材。雀頭として使う88sを壊すと、中を鳴いた時にヘッドレスになる。6ブロックの整理なら89pのペンチャンを外し、雀頭を守る。役牌が対子だから頭は二つ、という数え方をしない。" },
  { title: "混一色は枚数だけで強行しない", scene: "2586", at: 2605, text: "この手は中のみ1000点でも局消化に価値がある。11sの雀頭を崩して染めると中ポン後の速度も落ち、混一色にしても満貫は確定しない。『手なりでゴミ手になりそう』という⑪の前半条件まで確認する。講師は東・北の処理を許容し、まず速い役牌手を残す。" },
  { title: "雀頭を守ると、鳴いた後も速い", scene: "2985", at: 2985, text: "中ポン後は北（発も許容）を切り、11sの雀頭を残す。678p・999p・中ポンの3面子があり、4pのくっつき一向聴を保てる。11sを壊してまで染めるとヘッドレスになる。後の4pポンでは6pを切り、残り1枚の6p・9p待ちより5s単騎を選ぶ。" },
  { title: "アシストにも、今切る牌と後で切れる牌がある", scene: "3320", at: 3294, text: "この南3局は親の連荘を避けたい。下家の染め手を助ける発想は講師も評価。ただし親への現物2sは後で切れるので、今のうちに4s・5s・7sから助ける。親が進んだ後まで危険牌でアシストを続けるわけではない。" },
  { title: "満貫聴牌でも、二人への危険牌を再評価する", scene: "3929", at: 3975, text: "二件リーチに対して6sを押すと満貫愚形聴牌。セオリーの基本線は7mを抜いてオリ。ただし大会の最終局でツモれば2着となる条件があり、講師は6s勝負も大悪手とはしていない。通常局の原則と着順条件を混同しない。" },
  { title: "感情ではなく、対応条件をチェックする", scene: "4380", at: 4380, text: "副露対応は『親・高打点・待ちが絞れている・自手価値が低い』の右側条件が二つ以上なら要対応。一つ以下なら自己都合優先。親が一つ鳴いた、というだけで自動的にオリない。" },
];
export const questions = [
  { id: "fold-recheck", scene: "0444", at: 444, question: "オリていた手が2面子の一向聴に進んだ。方針はどう見直す？", answer: "ローリスクに粘れるか、手牌価値を判定し直す。", explanation: "『二面子ある➡ローリスクならば粘りも意識』。当初のオリ方針を固定しない。ただし危険牌を無条件に押す意味ではない。", refs: ["theory"] },
  { id: "safe-five-pin", scene: "0495", at: 503, question: "何を切る？", tileQuestion: sourceTiles("50789m556p23406s", "5p", "9m"), answer: "5p。両面・シャボを否定できる低リスク牌。", explanation: "3pが4枚見えで25p両面、8p通過で58p両面を否定。5pは3枚見えでシャボもない。ただしカン5p・単騎を完全には消せない。講師の『ほぼ安牌』を『絶対安全』と一般化しない。", refs: ["theory"] },
  { id: "late-one-shanten", scene: "0589", at: 599, question: "同じ完全形一向聴でも、河が3段目・残り山19枚になると、維持する価値はどう変わる？", answer: "下がる。聴牌してから和了するまでの残り機会が少ない。", explanation: "『広い一向聴だから押す』で止めない。安全な5pで維持できるなら粘るが、序盤と同じ見返りで危険牌を押せるわけではない。", refs: ["theory", "shanten"] },
  { id: "west-pon", scene: "0733", at: 736, question: "自風の西が出た。1000点でも西をポンする理由は？", answer: "愚形をさばいて向聴数を進められ、雀頭と両面も残るから。", explanation: "『愚形捌いてシャンテンが進むなら鳴いてOK！』。役牌対子を鳴いても別の雀頭がある。この手を、遠い安手だからと一律にスルーしない。", refs: ["theory"] },
  { id: "two-riichi-west", scene: "1005", at: 1037, question: "二件リーチ。何を切る？", tileQuestion: sourceTiles("406699m77p44s233z", "3z", "0s"), answer: "西。南や、宣言牌の筋5sより優先。", explanation: "西は1枚切れ＋手中2枚で残り1枚、南は1枚切れ＋手中1枚で残り2枚。5sも246sから6s→2s宣言ならカン5sに当たる。筋だけで安全扱いしない。", refs: ["theory"] },
  { id: "avoid-riinomi", scene: "1299", at: 1300, question: "58pを引いて中を切ると、待ちはどうなる？ 講師が先に外したいターツは？", answer: "カン2sのリーノミ愚形になる。13sを先に外す。", explanation: "中の重なりや、南ポン後のドラ中単騎も残す。安い愚形聴牌に固定するより、弱い13sを整理する。", refs: ["theory"] },
  { id: "weak-double-uke", scene: "1710", questionImage: false, answerImage: true, at: 1732, question: "6889sの9sと孤立役牌。先に切るのは？", answer: "9s。6889sは弱い二度受け。", explanation: "1224の鏡像。89sと68sは7s受けが重複し、9sを外して7sを引いても678sの面子は完成する。役牌より優先して残さない。", refs: ["ranking"] },
  { id: "follow-definition", scene: "1824", questionImage: false, answerImage: true, at: 1817, question: "一手先フォロー牌の定義は？ 有効牌の種類数も含めて答えて。", answer: "現状はフォロー牌ではなく、二種以上の特定有効牌を引いた際にフォロー牌として機能する牌。", explanation: "『二種以上』が条件。進化するツモが一種だけなら該当しない。", refs: ["ranking"] },
  { id: "nine-pin-speed", scene: "2210", at: 2215, question: "何を切る？", tileQuestion: sourceTiles("223m12p123889s77z", "9p", "9p"), answer: "9p。対子を使うルートを残す。", explanation: "純チャン三色でも鳴けば3900点で、愚形が残りやすい。中はポン材として使い、数牌の対子を頭候補にして速さを取る。", refs: ["theory"] },
  { id: "keep-only-head", scene: "2300", at: 2295, question: "何を切る？", tileQuestion: sourceTiles("23m129p123889s77z", "8p9p", "8p"), answer: "89pのペンチャンを外す。8p・9pのどちらも可。", explanation: "88sは残す雀頭、中は鳴く対子。88sを壊すと中ポン後に頭がなくなる。『役牌対子も頭だから二つある』と数えない。", refs: ["theory"] },
  { id: "declaration-suji", scene: "2510", questionImage: false, at: 2479, question: "『愚形フォローに先切りなし』から、リーチ宣言牌5pの筋8pも安全と断定できる？", answer: "断定できない。宣言前の先切りと、宣言牌は別。", explanation: "57799pから9p→7p→5p宣言なら、79pのカン8pが残る。『5pが切られた』だけでその周辺の愚形を消さない。", refs: ["theory"] },
  { id: "honitsu-conditions", scene: "2586", questionImage: false, at: 2730, question: "混一色を追うセオリー⑨⑩⑪の条件は？ 特に『染色＋字牌9〜10枚』の前に付く条件を落とさず答えて。", answer: "⑨字牌対子2組ある時は2飜役を取りこぼすな！（特に染め、トイトイは強く意識しろ！）\n⑩染め色4ブロックある時ホンイツへの渡りを見落とすな！（3ブロック以下でホンイツを狙いたい時は⑪↓）\n⑪手なりでゴミ手になりそうな配牌時、字牌含めて染め色9～10枚あればオタ風も残してホンイツを意識。ゴミ手は遠くて高い手を目指すと攻守のバランスが取りやすい。", explanation: "セオリー集の原文。枚数だけで⑪を適用せず、元の手の速度と局消化の価値も比較する。", refs: ["theory"] },
  { id: "honitsu-not-force", scene: "2586", at: 2870, question: "局消化を優先。何を切る？", tileQuestion: sourceTiles("47999p114s14577z", "1z4z", "6p"), answer: "東または北。講師は両方を許容。", explanation: "11sを落として染めると、中ポン後に雀頭がなくなり速度が落ちる。混一色でも満貫は確定しない。『9〜10枚あるから染める』だけでは決めない。", refs: ["theory"] },
  { id: "pon-preserve-head", scene: "2985", at: 2988, question: "中をポン。何を切る？", tileQuestion: sourceTiles("4678999p11s45z", "4z5z"), answer: "北。発切りも許容。11sの雀頭を残す。", explanation: "678p・999p・中ポンの3面子＋11sの雀頭がある。北を外せば4p・発のくっつき一向聴。11sを壊してまで染めると速度が落ちる。", refs: ["shanten", "theory"] },
  { id: "four-pin-pon", scene: "3146", at: 3149, question: "4pをポンするなら、何を切る？（画像はポン前）", tileQuestion: sourceTiles("446678999p5s", "6p"), answer: "6p切りで5s単騎。", explanation: "5s切りは6p・9p待ちだが、場に残るのは6pの1枚だけ。安全な6pを切って5s単騎にし、5pを引いた時などに5s勝負で良形へ変えられる。", refs: ["theory"] },
  { id: "assist-order", scene: "3320", at: 3294, question: "南3局、親の連荘を避けて下家の染め手を助ける。親の現物2sと、4s・5s・7sはどちらから使う？", answer: "4s・5s・7sからアシスト。現物2sは後で切れる。", explanation: "親が進むと危険なソーズは切りにくくなる。アシストの発想は良いが、今しか切れない牌から使う。親の進行を無視して最後まで助け続ける意味ではない。", refs: ["theory"] },
  { id: "two-riichi-final", scene: "3929", at: 3975, question: "二件リーチに6sを押せば満貫愚形聴牌。セオリーの基本線は？ また、この大会最終局で講師が勝負も許容した条件は？", answer: "基本線は7mを抜いてオリ。最終局でツモれば2着になる条件があり、6s勝負も許容。", explanation: "6sは二人に対する危険牌。高打点だけで押さない。一方、着順条件のある最終局を通常局と同一には扱わず、講師は勝負を大悪手とはしていない。", refs: ["theory"] },
  { id: "keiten-value", scene: "4238", questionImage: false, at: 4238, question: "形式聴牌を取るかオリるか。『オリなら失点ゼロ』という比較のどこが抜けている？", answer: "聴牌料を得る側とノーテン料を払う側の差が抜けている。", explanation: "他家1〜2人聴牌なら差は2500点、0人・3人なら3000点。これを取る価値と放銃の損を比較する。", refs: ["theory"] },
  { id: "call-response-table", scene: "4380", questionImage: false, answerImage: true, at: 4380, question: "副露対応表の『要対応』側の4条件と、対応を始める条件数は？", answer: "親・高打点・待ちが絞れている・自手価値が低い。二つ以上で要対応、一つ以下なら自己都合優先。", explanation: "『親が一つ鳴いたから怖い』では判定しない。自分の手牌価値も同じ表で確認する。", refs: ["theory"] },
];
