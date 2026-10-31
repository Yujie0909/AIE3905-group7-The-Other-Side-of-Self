import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recognitionDraft} from '../src/useMicrophoneInput.ts';
// Result-list fixtures test text reconciliation only, not microphone/ASR success.
const result=(text,isFinal)=>({0:{transcript:text},isFinal});
test('interim revisions replace the draft and final results are never duplicated',()=>{
 const prefix='已有文字：';
 assert.equal(recognitionDraft(prefix,[result('想',false)]).text,'已有文字：想');
 assert.equal(recognitionDraft(prefix,[result('想去看海',false)]).text,'已有文字：想去看海');
 const complete=[result('想去看海。',true),result('也想',false)];
 assert.equal(recognitionDraft(prefix,complete).text,'已有文字：想去看海。也想');
 assert.deepEqual(recognitionDraft(prefix,complete),recognitionDraft(prefix,complete));
 assert.equal(recognitionDraft(prefix,[result('想去看海。',true),result('也想休息。',true)]).text,'已有文字：想去看海。也想休息。');
});
test('recognition respects the existing input length limit',()=>{
 const draft=recognitionDraft('前'.repeat(1998),[result('新增文字',true)]);
 assert.equal(draft.text.length,2000);assert.ok(draft.text.endsWith('新增'));
});
