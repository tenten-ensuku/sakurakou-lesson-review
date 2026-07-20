export const APP_VERSION = 4;
export const STORAGE_KEY = "sakurakou-lesson-review-v1";
export const LESSON_ID = "sakurakou-2026-07-21";
export const LESSON_TITLE = "7/21　てんてん先生　蒼嵐戦　牌譜検討";
export const VIDEO_URL = "https://youtu.be/zhg7AH9aWgk";

/** @typedef {{id:number, kind:"question"|"section"|"note", question:string, answer:string}} LessonCard */

/** @type {ReadonlyArray<LessonCard>} */
export const BASE_CARDS = Object.freeze([
  { id: 1, kind: "question", question: "配牌時に『00物件（ゼロゼロブッケン）』と呼ばれるのは、どのような状態ですか？", answer: "『0メンツ・0両面（両面ターツなし）』という、極めて面子手立直から遠い配牌状態を指します。" },
  { id: 2, kind: "question", question: "『00物件』の出現率は1半荘（ハンチャン）でどの程度ですか？", answer: "約8％です。1半荘に1回程度です。" },
  { id: 3, kind: "question", question: "『00物件』の際、リーチを目指す『面子手リーチ進行』を避けるべき最大の理由は何ですか？", answer: "リーチから最も遠いため、無理に真っ直ぐ進めると他家のリーチに対して『安牌なし・手牌価値なし』という地獄の状態に陥るリスクが高いからです。" },
  { id: 4, kind: "question", question: "『00物件』でも和了を目指したい場合に優先すべき方針は何ですか？", answer: "役牌、混一（ホンイツ）、チャンタなど、鳴いて進められる『役』を確保することです。この際、役牌の価値が通常の強孤立牌と逆転することすらあります。" },
  { id: 5, kind: "question", question: "『先オリ（さきおり）』とは、どのような守備行動を指しますか？", answer: "将来の危険に備え、まだ自分の手が形を保っている段階からメンツを壊してでも安全牌を確保することです。" },
  { id: 6, kind: "question", question: "リーチを受けた際、自分の手が『0メンツ』であればどのような方針をとるべきですか？", answer: "即座に『先降り』を選択します。自分の上がり目がほぼないため、先オリで2件目以降のリーチに備えるのが最善です。" },
  { id: 7, kind: "question", question: "『配牌降り（はいぱいおり）』とは、具体的にどのような手順を踏みますか？", answer: "1巡目から上がりを放棄し、将来危険になりそうな牌を先に切り飛ばしながら、手牌を安全牌（字牌など）だけで埋め尽くす極端な守備策です。" },
  { id: 8, kind: "question", question: "『中膨れ（なかぶくれ）』の形（例：4556）が『超強孤立』とされる理由は何ですか？", answer: "ターツ生成において圧倒的な柔軟性を持つからです。どの方向へ伸びても良形を作りやすく、ブロックの選択肢を広げる上で最強のくっつき強孤立牌です。" },
  { id: 9, kind: "question", question: "『スキップ牌（134の1、235の5等）』の打牌判断基準は何ですか？", answer: "すでに5ブロックが揃っている場合は『不要牌（ゴミ）』と判断します。スキップ牌が使えそうなツモを脳内で想定しても、結局その牌を切ることになる場合は残す価値がありません。" },
  { id: 10, kind: "question", question: "『一手先フォロー牌』とは何ですか？", answer: "現状はフォロー牌にはなっていないが、2種以上の特定の牌を引いた際に、フォロー牌となる牌のこと。序列では『2・8の孤立牌』より価値が高くなります。" },
  { id: 11, kind: "section", question: "セクション2", answer: "牌効率とブロック理論" },
  { id: 12, kind: "question", question: "ポン材＞チー材となる理由は？", answer: "チー材は劣化する（減る）が、ポン材に劣化はありません（減らない）。ポン材はステンレス。" },
  { id: 13, kind: "question", question: "『ポン材は劣化しない』という格言の論理的根拠は何ですか？", answer: "チー材は上家からしか鳴けず他家の打牌を指をくわえて見ているしかありませんが、ポンは誰からでも100％『強奪』できるため、活用できる可能性が一生減らないからです。" },
  { id: 14, kind: "question", question: "『愚形フォローに先切りなし』とは、どのような牌効率の本質を突いた言葉ですか？", answer: "ペンチャンやカンチャン等の弱い部分を補う牌は非常に貴重です。『弱いところをフォローして強いところはフォローいらず』という、不足を補う意識が牌効率の基本です。" },
  { id: 15, kind: "question", question: "リーチ前に切られている牌の周辺の愚形待ちを否定できるのはなぜですか？", answer: "牌効率上、その周辺で待つためのフォロー牌を先に切ることはあり得ないからです。従って、その周辺は『両面待ち』でしか当たらないと論理的に推測できます。愚形フォローに先切り無し。" },
  { id: 16, kind: "question", question: "『3ヘッド（スリーヘッド）』の状態から、安牌を抱えてでも両面を固定すべき理由は何ですか？", answer: "固定しても切った牌の1種類しかロスが出ず、空いたスペースに強孤立牌や安牌を持つことで、良形変化や守備力の向上をノーリスクで狙えるからです。後手強度（押し返し安さ）がUPします。" },
  { id: 17, kind: "question", question: "一向聴（イーシャンテン）において、『将来の良形化（二次変化）』と『ダイレクトのテンパイ待ちの強さ』はどちらを優先しますか？", answer: "『ダイレクトの待ちの強さ』を優先します。" },
  { id: 18, kind: "question", question: "面子手リーチを目指す上で聴牌するまでやってはいけない禁忌（タブー）二つはなんですか？", answer: "①単独暗刻の破壊 ②唯一雀頭の破壊。※七対子は面子手ではないのでOK。" },
  { id: 19, kind: "question", question: "三色同順や一気通貫の『種』が6枚ある場合、打牌序列はどう変化しますか？", answer: "1・9の数牌と役牌の価値が逆転し、役牌を先に切って役の完成を最大限に優先するのがセオリーとなります。" },
  { id: 20, kind: "section", question: "セクション3", answer: "多面張と6枚形・10枚形" },
  { id: 21, kind: "question", question: "6枚形の分類における『21型』とは、どのような構成の形ですか？ 3種類例を挙げて、受け入れ法則を述べよ。", answer: "2枚組と1枚組が二組の6枚形。例は223445m、112234s、234455pなど。一盃口完成となる筋と、端の対子が受け入れ。順に36m・2m、（0）3s・1s、36p・5p。" },
  { id: 22, kind: "question", question: "多面張ドリルにおいて『SSランク』の速度を目指すべき実戦上の意義は何ですか？", answer: "複雑な形を『考える』のではなく『知っている』状態にすることで、余った脳のリソースを相手の読みや押し引きの判断に割くためです。" },
  { id: 23, kind: "question", question: "6枚形ドリルを毎日反復すべき、出現率に関する理由は？", answer: "6枚形は実戦で3局に1回程度出現するため、ここの判断速度・精度がとても大事になるからです。" },
  { id: 24, kind: "question", question: "5連形に1枚加わった6枚形の受け入れ枚数は？", answer: "通常の三面張（例：3-6-9）に、対子の受け入れが加わった形になります。" },
  { id: 25, kind: "section", question: "セクション4", answer: "実戦判断と守備" },
  { id: 26, kind: "question", question: "オーラス（最終局）の方針立てにおいて、最も優先して確認すべき2項目は何ですか？", answer: "①放銃してはいけない相手（着順が入れ替わる相手）の確認、②逆転に必要な条件（打点・着順上昇条件）の確認です。" },
  { id: 27, kind: "note", question: "おわりに：継続学習のアドバイス", answer: "本フラッシュカードの内容を実戦で『武器』にするためには、『毎日1回ドリルを解く』習慣が不可欠です。\n\n潮桜紅氏の対局検討で見られたような、複雑な6枚形や10枚形、そしてオーラスの繊細な判断は、すべて基礎の積み重ねの上に成り立っています。特に多面張は『考える』時間をゼロにし、『視覚的に認知する』レベル（SSランク）まで高めてください。1日10分の反復が、あなたの雀力を劇的に進化させます。" },
]);

export function questionNumber(cards, id) {
  return cards.filter((card) => card.kind === "question" && card.id <= id).length;
}

export function mergeOverrides(overrides = []) {
  const byId = new Map(overrides.filter((item) => item.lessonId === LESSON_ID).map((item) => [item.id, item]));
  return BASE_CARDS.flatMap((card) => {
    const override = byId.get(card.id);
    if (override?.deleted) return [];
    if (override?.question && override?.answer) return [{ ...card, question: override.question, answer: override.answer }];
    return [{ ...card }];
  });
}

export function getRank(rate) {
  if (rate >= 90) return "S";
  if (rate >= 80) return "A";
  if (rate >= 65) return "B";
  if (rate >= 50) return "C";
  return "D";
}
