export type Page = 1|2|3|4|5|6|7;
export interface ExperienceSession {
 sessionId:string; currentPage:Page; idealRawText:string; idealStructuredData:unknown; idealImageUrl:string|null;
 selectedHabitTopics:string[]; habitAnswers:Record<string,string[]>; dailyFreeText:string;
 changeAnalysis:unknown; changeVideoUrl:string|null; reflectionText:string; reflectionKeywords:string[]; sharingConsent:boolean;
 idealPrompt:string; idealWorldSummary:string; approvedText:string; sceneVariant:number;
}
export const createSession=():ExperienceSession=>({sessionId:crypto.randomUUID(),currentPage:1,idealRawText:'',idealStructuredData:null,idealImageUrl:null,selectedHabitTopics:[],habitAnswers:{},dailyFreeText:'',changeAnalysis:null,changeVideoUrl:null,reflectionText:'',reflectionKeywords:[],sharingConsent:false,idealPrompt:'',idealWorldSummary:'',approvedText:'',sceneVariant:0});
export const pages=[
 {title:'欢迎进入心流空间',body:['在这里，暂时放下外界的评价，倾听内心的声音。','这是一场没有标准答案的旅程，也是一段只属于你的故事。'],en:'A QUIET BEGINNING'},
 {title:'如果一切都能够实现，你希望过什么样的生活？',body:['抛开现实的桎梏，描绘你理想中的生活。在那个世界里，你希望成为怎样的自己？'],en:'IMAGINE THE POSSIBLE'},
 {title:'理想中的生活，你好',body:['你所描绘的世界，正在眼前慢慢成形。','现在，走进它，遇见那个理想中的自己。'],en:'A WORLD WITHIN YOU'},
 {title:'再聊聊现在的你',body:['理想之外，日常中也有属于自己的模样。','可以再分享一些你平时的小习惯吗？'],en:'THE RHYTHM OF EVERYDAY'},
 {title:'生活不止由想象书写',body:['那些微不足道的习惯，悄然改变着理想的轨迹。','而日复一日的选择，塑造了我们真正的模样。'],en:'ANOTHER WAY OF SEEING'},
 {title:'与自我重逢',body:['走过想象与现实之间的距离，','此刻，你有什么想对自己说的吗？'],en:'RETURN TO YOURSELF'},
 {title:'你不是孤身一人',body:['原来，也有人怀着与你相似的心情。','这些词语，来自其他参与者留下的真实心声。'],en:'ECHOES OF US'}
];
export const habits:Record<string,string[]>={
 '作息与睡眠':['早睡早起','晚睡晚起','晚睡早起','早睡晚起','作息不固定'],
 '兴趣与爱好':['追剧与电影','阅读与学习','游戏与娱乐','旅行与探索','艺术与创作','其他'],
 '学习与工作':['有规律地安排任务','经常需要赶进度','喜欢挑战新目标','更注重生活与工作的平衡','目前节奏比较自由'],
 '饮食与运动':['经常运动','偶尔运动','喜欢户外活动','喜欢安静的休闲活动','没有固定习惯'],
 '独处与社交':['喜欢独处','喜欢和朋友相处','两种状态都喜欢','视当天心情而定'],
 '心情与压力':['最近比较放松','偶尔感到压力','经常感到忙碌','正在寻找适合自己的生活节奏','不太确定'],'其他':[]};
export function canTransition(from:Page,to:Page):boolean{return to===1 || ({1:[2],2:[3],3:[2,4],4:[5],5:[6],6:[7],7:[1]} as Record<Page,number[]>)[from].includes(to)}
