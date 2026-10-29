export type Page = 1|2|3|4|5|6|7;
export interface ExperienceSession {
 sessionId:string; currentPage:Page; idealRawText:string; idealStructuredData:unknown; idealImageUrl:string|null;
 selectedHabitTopics:string[]; habitAnswers:Record<string,string[]>; dailyFreeText:string;
 changeAnalysis:unknown; changeVideoUrl:string|null; reflectionText:string; reflectionKeywords:string[]; sharingConsent:boolean;
 idealPrompt:string; idealWorldSummary:string; approvedText:string; sceneVariant:number;
}
export const createSession=():ExperienceSession=>({sessionId:crypto.randomUUID(),currentPage:1,idealRawText:'',idealStructuredData:null,idealImageUrl:null,selectedHabitTopics:[],habitAnswers:{},dailyFreeText:'',changeAnalysis:null,changeVideoUrl:null,reflectionText:'',reflectionKeywords:[],sharingConsent:false,idealPrompt:'',idealWorldSummary:'',approvedText:'',sceneVariant:0});
export const pages=[
 {title:'欢迎进入心流空间',body:['在这里，你可以暂时放下外界的声音，与自己相遇。','这段旅程没有标准答案，只有关于你的独一无二的故事。'],en:'A QUIET BEGINNING'},
 {title:'如果一切都可以实现，\n你想要什么样的生活？',body:['抛却现实的限制，试着描述那个让你感到期待和向往的自己。'],en:'IMAGINE THE POSSIBLE'},
 {title:'你好，理想的世界',body:['基于你的描述，我们为你搭建了一个属于你的想象空间。'],en:'A WORLD WITHIN YOU'},
 {title:'再聊聊现在的你',body:['为了让这个故事更完整，可以和我分享一些你日常生活中的小习惯吗？'],en:'THE RHYTHM OF EVERYDAY'},
 {title:'当一切趋于完美',body:['随着时间的推移，一些细微的变化开始出现。','它不一定是坏事，也许只是另一种可能的视角。'],en:'ANOTHER WAY OF SEEING'},
 {title:'再次与自己相遇',body:['经历这一段旅程后，你现在有什么新的感受或者想对自己说的话？'],en:'RETURN TO YOURSELF'},
 {title:'你并不孤单',body:['许多人也分享了类似的感受与期待。','这里将逐渐汇聚愿意分享的心声。','不同的故事，相似的期待。你并不孤单。'],en:'ECHOES OF US'}
];
export const habits:Record<string,string[]>={
 '作息与睡眠':['早睡早起','晚睡晚起','晚睡早起','早睡晚起','作息不固定'],
 '兴趣与爱好':['追剧与电影','阅读与学习','游戏与娱乐','旅行与探索','艺术与创作','其他'],
 '学习与工作':['有规律地安排任务','经常需要赶进度','喜欢挑战新目标','更注重生活与工作的平衡','目前节奏比较自由'],
 '饮食与运动':['经常运动','偶尔运动','喜欢户外活动','喜欢安静的休闲活动','没有固定习惯'],
 '独处与社交':['喜欢独处','喜欢和朋友相处','两种状态都喜欢','视当天心情而定'],
 '心情与压力':['最近比较放松','偶尔感到压力','经常感到忙碌','正在寻找适合自己的生活节奏','不太确定'],'其他':[]};
export function canTransition(from:Page,to:Page):boolean{return to===1 || ({1:[2],2:[3],3:[2,4],4:[5],5:[6],6:[7],7:[1]} as Record<Page,number[]>)[from].includes(to)}
