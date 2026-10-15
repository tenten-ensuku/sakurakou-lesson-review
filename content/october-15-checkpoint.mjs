// One user-requested application question. Existing question IDs and order stay intact.
export const checkpoint = {
  id: 'six-turn-zero-meld-checkpoint',
  type: 'choice',
  part: 'second',
  at: 1410,
  refs: ['theory'],
  boardIllustration: 'https://sakurakou-lesson-review.pages.dev/materials/boards/20261015-six-turn.svg',
  question: '6巡目のこの手。ここからの方針として適切なのは？',
  choices: [
    '78pの両面があるので、定点チェックの対象外とする',
    '立直して2翻あれば、愚形が残っても目いっぱいに進める',
    '0面子なので定点チェックに該当。各家への安全候補を確認して備える',
    '3対子なので七対子に決め打ちし、安全牌は持たない',
  ],
  correctIndex: 2,
  answer: '0面子は無条件で該当。和了の遠さをシビアに見て、将来の立直に備える。',
  explanation: '配牌は00物件（0面子0両面）。6巡目も0面子なら、222＝「2シャンテン・愚形2つ残り・立直して2ハン」を全て数えるまでもなく該当する（副露手は例外）。安牌をため、誰から立直が来たら何を切るかを確認しつつ七対子などの道を残す。今回は既に安全候補もあり、西残しだけが正解という話ではない。',
};
