// scripts/test-images-core.mjs — protocol §4 acceptance tests
import { ladder, relevance, units } from './lib/images-core.mjs';
let fails = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  → ' + detail : ''}`);
  if (!cond) fails++;
};
const EX = ['exercise', 'gym', 'workout'];
const FOOD = ['food', 'dessert', 'cooking', 'ingredient'];

// ladder shapes
check('ladder wall push-up', ladder('wall push-up').steps.join(' | ') === 'wall push-up | push-up', ladder('wall push-up').steps.join(' | '));
check('ladder dip black chocolate', ladder('dip black chocolate').steps.join(' | ') === 'dip black chocolate | black chocolate | chocolate', ladder('dip black chocolate').steps.join(' | '));

// test 1
let q = ladder('wall push-up');
let r1 = relevance({ title: 'Yoga mats in shop', desc: 'rolled yoga mats for sale', categories: ['Yoga'] }, { step: q.steps[0], units: units('wall push-up'), head: q.head, context: EX });
check('T1 yoga mats REJECTED (head)', !r1.ok && /head word/.test(r1.reason), r1.reason);
let r2 = relevance({ title: 'Wall push-up', desc: 'a person doing a wall push-up at the gym', categories: ['Exercise'] }, { step: q.steps[0], units: units('wall push-up'), head: q.head, context: EX });
check('T1 wall push-up ACCEPTED', r2.ok && r2.score >= 5, 'score ' + r2.score);

// test 2
q = ladder('chair dip');
let r3 = relevance({ title: 'Spinach dip', desc: 'a bowl of spinach dip', categories: ['Food'] }, { step: 'dip', units: units('chair dip'), head: 'dip', context: EX });
check('T2 spinach dip REJECTED (single generic)', !r3.ok && /single generic/.test(r3.reason), r3.reason);
let r4 = relevance({ title: 'Triceps dips', desc: 'dips on parallel bars at a gym', categories: ['Exercise'] }, { step: 'dip', units: units('chair dip'), head: 'dip', context: EX });
check('T2 triceps dips ACCEPTED', r4.ok, 'score ' + r4.score);
let r5 = relevance({ title: 'Yoga mats', desc: 'coloured yoga mats on a floor', categories: ['Yoga'] }, { step: 'dip', units: units('chair dip'), head: 'dip', context: EX });
check('T2 yoga mats REJECTED (head)', !r5.ok && /head word/.test(r5.reason), r5.reason);

// test 3
q = ladder('standing band reverse fly');
let r6 = relevance({ title: 'Black latex sheet', desc: 'a black latex sheet', categories: ['Materials'] }, { step: q.steps[0], units: units('standing band reverse fly'), head: q.head, context: EX });
check('T3 latex sheet REJECTED', !r6.ok, r6.reason);
let r7 = relevance({ title: 'Fly on flower', desc: 'a fly on a flower', categories: ['Insects'] }, { step: 'fly', units: units('standing band reverse fly'), head: 'fly', context: EX });
check('T3 fly on flower REJECTED (single generic)', !r7.ok && /single generic/.test(r7.reason), r7.reason);
let r8 = relevance({ title: 'Reverse fly', desc: 'reverse fly exercise performed with dumbbells at a gym', categories: ['Weight training'] }, { step: 'reverse fly', units: units('standing band reverse fly'), head: 'fly', context: EX });
check('T3 reverse fly ACCEPTED', r8.ok, 'score ' + r8.score);

// test 4
q = ladder('dip black chocolate');
let r9 = relevance({ title: 'Black chocolate bar', desc: 'a bar of black chocolate on a table', categories: ['Chocolate'] }, { step: q.steps[0], units: units('dip black chocolate'), head: q.head, context: FOOD });
check('T4 step1 rejected (phrase not in text)', !r9.ok && /search phrase/.test(r9.reason), r9.reason);
let r10 = relevance({ title: 'Black chocolate bar', desc: 'a bar of black chocolate on a table', categories: ['Chocolate'] }, { step: q.steps[1], units: units('dip black chocolate'), head: q.head, context: FOOD });
check('T4 accepted at step "black chocolate"', r10.ok, 'score ' + r10.score);

console.log(fails ? `\n${fails} TEST(S) FAILED` : '\nALL TESTS PASS');
process.exit(fails ? 1 : 0);