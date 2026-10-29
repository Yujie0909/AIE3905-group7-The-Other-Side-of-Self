import type {Page} from '../session';
import type {SceneDefinition} from '../scenes/types';
import {Scene01Entrance} from '../scenes/Scene01Entrance';
import {Scene02DreamInput} from '../scenes/Scene02DreamInput';
import {Scene03IdealWorld} from '../scenes/Scene03IdealWorld';
import {Scene04DailyLife} from '../scenes/Scene04DailyLife';
import {Scene05WorldEvolution} from '../scenes/Scene05WorldEvolution';
import {Scene06SelfReflection} from '../scenes/Scene06SelfReflection';
import {Scene07CollectiveVoices} from '../scenes/Scene07CollectiveVoices';
export const sceneRegistry:Record<Page,SceneDefinition>={
 1:{id:'scene-01-entrance',component:'Scene01Entrance',asset:'scenes/entrance.jpg',paint:Scene01Entrance,motion:['water reflection','entrance breath','mist']},
 2:{id:'scene-02-dream',component:'Scene02DreamInput',asset:'scenes/dream.jpg',paint:Scene02DreamInput,motion:['horizontal light ribbons','mist','light drift']},
 3:{id:'scene-03-ideal',component:'Scene03IdealWorld',asset:'scenes/ideal.jpg',paint:Scene03IdealWorld,motion:['slow camera advance','light travel','haze']},
 4:{id:'scene-04-daily',component:'Scene04DailyLife',asset:'scenes/daily.jpg',paint:Scene04DailyLife,motion:['curtain fabric undulation','window light','window shadow']},
 5:{id:'scene-05-evolution',component:'Scene05WorldEvolution',asset:'scenes/ideal.jpg',paint:Scene05WorldEvolution,motion:['saved ideal-world / optional video','time-of-day evolution','haze']},
 6:{id:'scene-06-reflection',component:'Scene06SelfReflection',asset:'scenes/mirror.jpg',paint:Scene06SelfReflection,motion:['mirror highlight sweep','warm breath','haze']},
 7:{id:'scene-07-voices',component:'Scene07CollectiveVoices',asset:'scenes/voices.jpg',paint:Scene07CollectiveVoices,motion:['word cloud glyph drift','horizon light','water']}
};
