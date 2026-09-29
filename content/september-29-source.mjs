// Full captions and source frames reviewed. Keep substantive decisions, not a question quota.
// Later corrections take precedence; retained card IDs preserve existing learning records.
import { references } from "./september-2026-source.mjs";
export { references };
export const videoId = "CNCAKOAMyqU";
export const lesson = { id: "lesson-20260929-nejimaki", date: "9/29", teacher: "ねじまき鳥", title: "NANAリーグ検討・後半｜点差に合わせた手組と安全度", videoUrl: `https://www.youtube.com/watch?v=${videoId}` };
// Previously published source images remain available even when a question is retired.
export const scenes = {
  "0021": { at: 21, caption: "南1局9巡目：親リーチに7pツモ。1mを押すか" },
  "0030": { at: 30, caption: "南1局9巡目：1mを切った後の13枚。聴牌の先に残る待ちを比較" },
  "0505": { at: 505, caption: "南1局1本場の配牌を再確認。自分は西家で持ち点はマイナス" },
  "0310": { at: 310, caption: "南1局1本場8巡目：5sツモ。西対子を残すか" },
  "0590": { at: 590, caption: "南2局7巡目：上家の発カン・ソーズのチーと河を見て対応を検討" },
  "0710": { at: 710, caption: "南2局9巡目：対面も2副露。自分の手だけでなく相手の進行も再確認" },
  "0724": { at: 724, caption: "南2局10巡目：8sを切った直後。講師が通った牌を確認し直した場面" },
  "0790": { at: 790, caption: "南2局1本場：3p切り直後、4巡目の表示。赤五索と南暗刻を含む13枚" },
  "0830": { at: 830, caption: "南2局1本場8巡目：8sを残し6sを切った後。七対子の道も残している" },
  "0884": { at: 884, caption: "南2局1本場12巡目：9mポン・9s切り後の聴牌形" },
  "0996": { at: 996, caption: "南3局10巡目：6pツモ・8s切り直後。手に残った6sを再検討" },
  "1065": { at: 1065, caption: "南3局12巡目：上家のリーチ後。残った6sの扱いが難しくなった場面" },
  "1176": { at: 1176, caption: "南4局7巡目：4pツモ。7m切りと6p切りを比較" },
};

export const summary = [
  { title: "薄い一向聴は、聴牌後に押せるかまで見る", scene: "0021", at: 48,
    text: "1m押しは許容範囲だが、オリも可。7p・3sの重なりなら残り4枚の6m・9m待ち、6m・9m引きなら単騎になる。聴牌時に切る7p・3sまで押せるとは限らず、一向聴維持の見返りは小さい。" },
  { title: "7500点差なら、3900点の鳴きも捨てない", scene: "0310", at: 239,
    text: "講師は9m切り。上位とは大差でも、3着との差は7500点。西ポン→8p切りの1m・4m聴牌と門前リーチを両方残す。箱下リーチ可能なルールなので、西切りの高打点狙いも大悪手とは断定していない。" },
  { title: "大差の点況では、早い5ブロック化を急がない", scene: "0790", at: 787,
    text: "平たい点棒なら9sを切り、ダブ南＋赤で速度優先。この局は3着まで26900点差なので、3p切りで七対子・四暗刻も残す。次の8s引きでも対子を落とさず6sを切り、七対子と面子手を両立する。" },
  { title: "高打点狙いでも、鳴き聴牌へ切り替える", scene: "0884", at: 876,
    text: "9mポン・9s切りでカン4s聴牌を取り、トイトイ変化を追う。七対子は南暗刻を崩す必要があり、和了まで遠い。打点だけで門前に固定しない。" },
  { title: "6sの上積みは小さい。先に処理して押し返す", scene: "0996", at: 990,
    text: "7sが3枚見えなので、68sを外すなら6sから。5sを引いても薄い4s・7s待ちで、6sなしでも135sのリャンカンは残る。小さい上積みより8s・9sの安全度を取り、リーチ後に6sが捕まるのを避けたい。" },
  { title: "受け入れ4枚と、良形聴牌・鳴きを比較する", scene: "1176", at: 1170,
    text: "7m切りは7pの受けが4枚増え、チーも効く。6p切りは3m引きで両面、6m引きで三面張を残せる。講師は食いタン込みでやや7m寄りだが、6pも可。枚数だけの一択にしない。" },
];

export const questions = [
  { id: "headless-final-waits", type: "flashcard", at: 48, scene: "0021", refs: ["theory"],
    question: "親リーチに1mを押して一向聴を維持するか。オリも有力になる理由を、聴牌後の形から説明して。",
    answer: "良形聴牌が薄く、単騎聴牌ではさらに押す牌が残る。",
    explanation: "7p・3s重なりなら残り4枚の6m・9m待ち。6m・9m引きは単騎で、7pか3sを押す必要がある。1m押しも許容範囲だが、一向聴維持の見返りは小さい。" },
  { id: "west-pon-route", type: "flashcard", at: 313, scene: "0310", refs: [],
    question: "南1局1本場、−1700点で3着まで7500点差。5sツモに、講師は西切りより何を勧めた？　狙う着順と鳴いた後の形も答えて。",
    answer: "9m切り。まず3着を狙い、3900点の鳴きも残す。",
    explanation: "西ポン→8p切りで1m・4m聴牌。門前リーチも残る。なお箱下リーチ可能なルールなので、西切りの高打点狙いも大悪手とは断定しない。" },
  { id: "gap-changes-plan", type: "flashcard", at: 787, scene: "0790", refs: [],
    question: "南2局1本場、3着まで26900点差。赤五索を引いて3pを切った場面。平たい点棒なら9s切りを勧める講師が、ここで方針を変えた理由は？",
    answer: "速度より打点の上振れが必要で、七対子・四暗刻も残したい。",
    explanation: "平場ならダブ南＋赤で十分。今回は早い5ブロック化を急がず、次の8s引きも対子落としではなく6s切りで、七対子と面子手を両立する。" },
  { id: "pon-to-tenpai", type: "flashcard", at: 876, scene: "0884", refs: [],
    question: "同じ南2局1本場。画像は9mポン・9s切り後。高打点を狙っていたのに、七対子を捨てて鳴き聴牌を取ってよい理由は？",
    answer: "七対子は南暗刻を崩す必要があり遠い。鳴けば聴牌し、トイトイ変化も残る。",
    explanation: "カン4sは残り2枚で弱いが、ダブ南＋赤の聴牌を確保できる。門前の最大打点より、聴牌と打点変化の両立を取る。" },
  { id: "five-not-lost", type: "flashcard", at: 996, scene: "0996", refs: [],
    question: "南3局、最後の親番。画像は8s切り直後。講師は6sの先切りを勧めたが、5s引きの両面変化を残す価値が低いのはなぜ？",
    answer: "7sが3枚見えで両面化が弱く、6sを切っても5sは使えるから。",
    explanation: "6sなしでも135sで2s・4s受けが残る。36s両面に当たり得る6sを先に処理し、8sや途中で引く9sの安全度を残した方が、リーチに押し返しやすい。" },
  { id: "seven-man-acceptance", type: "flashcard", at: 1170, scene: "1176", refs: ["theory"],
    question: "南4局、4pツモ。7m切りと6p切りでは何を交換している？　直接受け・聴牌後の待ち・鳴きの3点で比較して。",
    answer: "7m切りは受けと鳴き、6p切りは最終待ちで優る。",
    explanation: "7m切りは7pが4枚増え、チーも効く。6p切りは3m引きで6m・9m、6m引きで3m・6m・9m待ち。講師は食いタン込みでやや7m寄りだが、6pも可。" },
];
