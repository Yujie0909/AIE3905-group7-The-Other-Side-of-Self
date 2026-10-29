import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession,canTransition,pages,habits} from '../src/session.ts';
test('seven act state graph permits complete journey and rejects skipping',()=>{assert.equal(pages.length,7);for(let i=1;i<7;i++)assert.ok(canTransition(i,i+1));assert.equal(canTransition(1,7),false);assert.equal(canTransition(4,2),false);for(let i=1;i<=7;i++)assert.ok(canTransition(i,1))});
test('reset creates an independent session with no private content',()=>{const a=createSession();a.idealRawText='private';a.reflectionText='private';a.habitAnswers['作息与睡眠']=['晚睡晚起'];a.sharingConsent=true;const b=createSession();assert.notEqual(a.sessionId,b.sessionId);assert.equal(b.idealRawText,'');assert.equal(b.reflectionText,'');assert.deepEqual(b.habitAnswers,{});assert.equal(b.sharingConsent,false);assert.equal(b.approvedText,'')});
test('habit topics include all seven neutral categories',()=>assert.equal(Object.keys(habits).length,7));
