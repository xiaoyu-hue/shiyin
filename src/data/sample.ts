import type { Song, Theme, PlaySet } from './types'

// 6 套内置主题，与 PRD §5.11 一致。
export const themes: Theme[] = [
  { slug: 'sakura', name: '樱粉暖阳', accent: '#B83D5A', bg: '#FFF2EB', bgEnd: '#FFD9DE' },
  { slug: 'amber', name: '琥珀秋意', accent: '#9B4E10', bg: '#FFF5DF', bgEnd: '#FFDECA' },
  { slug: 'bamboo', name: '青竹薄雾', accent: '#127C77', bg: '#EAFBF6', bgEnd: '#D5EEF3' },
  { slug: 'lake', name: '晨雾湖蓝', accent: '#365FA3', bg: '#EFF6FF', bgEnd: '#DCE8FF' },
  { slug: 'wisteria', name: '紫藤梦境', accent: '#7C4DA1', bg: '#F5EFFF', bgEnd: '#EADCF6' },
  { slug: 'wood', name: '原木暖棕', accent: '#7B5738', bg: '#FFF8EC', bgEnd: '#EEE2D4' },
]

// 默认主题：原木暖棕（索引 5）。
export const DEFAULT_THEME_INDEX = 5

// 8 首内置示例曲目，元信息取自 PRD §7.6；本期 audioSrc 为 null（模拟进度）。
// 歌词为示例文本（行级时间戳，均匀分布于时长），阶段二接入真实音频后替换。
export const songs: Song[] = [
  {
    id: 1, name: '晚风遇见海', artist: '陈默', album: '晚风合集', dur: 213, color: '#365FA3', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '晚风遇见海' },
      { t: '00:16', text: '把心事都交给浪花' },
      { t: '00:32', text: '我们在黄昏里沉默' },
      { t: '00:48', text: '等月亮慢慢升起' },
      { t: '01:05', text: '潮声替我说出想念' },
      { t: '01:22', text: '走过无人沙滩' },
      { t: '01:40', text: '脚印被海水抹平' },
      { t: '01:58', text: '像那些没讲完的话' },
      { t: '02:16', text: '风把头发吹乱' },
      { t: '02:34', text: '你笑得像晚霞' },
      { t: '02:52', text: '这一刻不必回答' },
      { t: '03:10', text: '让晚风替我拥抱你' },
      { t: '03:28', text: '在海与天之间' },
    ],
  },
  {
    id: 2, name: '城市漫游', artist: '林一', album: '夜行记录', dur: 198, color: '#127C77', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '城市漫游' },
      { t: '00:15', text: '霓虹点亮了街角' },
      { t: '00:30', text: '我沿着灯火走' },
      { t: '00:46', text: '影子被路灯拉长' },
      { t: '01:02', text: '便利店还亮着灯' },
      { t: '01:18', text: '买一瓶冰镇月光' },
      { t: '01:34', text: '地铁载着困倦的人' },
      { t: '01:50', text: '驶向各自的远方' },
      { t: '02:06', text: '我数着站牌经过' },
      { t: '02:22', text: '把孤独走成风景' },
      { t: '02:38', text: '城市在夜里呼吸' },
      { t: '02:54', text: '我也慢慢融入其中' },
    ],
  },
  {
    id: 3, name: '橘子汽水', artist: '苏打计划', album: '夏日限定', dur: 176, color: '#9B4E10', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '橘子汽水' },
      { t: '00:12', text: '气泡冒上来的夏天' },
      { t: '00:24', text: '冰镇的快乐刚刚好' },
      { t: '00:36', text: '阳光洒在瓶身上' },
      { t: '00:50', text: '折射出橘色光斑' },
      { t: '01:04', text: '蝉鸣吵醒了午后' },
      { t: '01:18', text: '你靠在树荫下' },
      { t: '01:32', text: '喝一口就笑了' },
      { t: '01:46', text: '汽水冒出的甜' },
      { t: '02:00', text: '是十七岁的味道' },
      { t: '02:14', text: '把夏天装进口袋' },
      { t: '02:28', text: '一起走到日落' },
    ],
  },
  {
    id: 4, name: '深夜频道', artist: '周野', album: '不眠频率', dur: 227, color: '#7C4DA1', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '深夜频道' },
      { t: '00:18', text: '调频到无人接听' },
      { t: '00:36', text: '我和影子在对话' },
      { t: '00:54', text: '电流声轻轻作响' },
      { t: '01:12', text: '城市已经睡去' },
      { t: '01:30', text: '只有我还醒着' },
      { t: '01:48', text: '收音机放着老歌' },
      { t: '02:06', text: '陪我熬过凌晨' },
      { t: '02:24', text: '给孤独一个频率' },
      { t: '02:42', text: '在夜里悄悄播放' },
      { t: '03:00', text: '如果你也睡不着' },
      { t: '03:18', text: '就把收音机打开' },
    ],
  },
  {
    id: 5, name: '林间小路', artist: '何青', album: '自然呼吸', dur: 205, color: '#127C77', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '林间小路' },
      { t: '00:14', text: '阳光穿过树叶' },
      { t: '00:28', text: '脚步踩碎了安静' },
      { t: '00:42', text: '鸟鸣在枝头回响' },
      { t: '00:56', text: '风带来松针香' },
      { t: '01:10', text: '溪水漫过脚踝' },
      { t: '01:24', text: '凉意顺着风来' },
      { t: '01:38', text: '野花开在路边' },
      { t: '01:52', text: '不问为谁而开' },
      { t: '02:06', text: '我走过这条小路' },
      { t: '02:20', text: '把喧嚣留在身后' },
      { t: '02:34', text: '听见自然在呼吸' },
    ],
  },
  {
    id: 6, name: '夜行列车', artist: '方屿', album: '远方车票', dur: 231, color: '#365FA3', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '夜行列车' },
      { t: '00:16', text: '窗外的灯火向后退' },
      { t: '00:32', text: '载我去未知的站牌' },
      { t: '00:48', text: '车厢摇晃着困意' },
      { t: '01:04', text: '有人已经睡着' },
      { t: '01:20', text: '我把额头贴上玻璃' },
      { t: '01:36', text: '看星星一路跟随' },
      { t: '01:52', text: '它们陪我到天亮' },
      { t: '02:08', text: '铁轨唱着单调的歌' },
      { t: '02:24', text: '把远方慢慢折叠' },
      { t: '02:40', text: '每一次到站' },
      { t: '02:56', text: '都是新的开始' },
    ],
  },
  {
    id: 7, name: '雨天备忘录', artist: '苏晚', album: '天气随笔', dur: 189, color: '#7B5738', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '雨天备忘录' },
      { t: '00:13', text: '记下每一滴的落点' },
      { t: '00:27', text: '屋檐下读一封旧信' },
      { t: '00:41', text: '字迹被雨水洇开' },
      { t: '00:55', text: '像模糊的从前' },
      { t: '01:09', text: '咖啡凉了一半' },
      { t: '01:23', text: '窗外的世界很安静' },
      { t: '01:37', text: '雨声盖过所有答案' },
      { t: '01:51', text: '我把想念写下来' },
      { t: '02:05', text: '折进这页备忘录' },
      { t: '02:19', text: '等天晴了再打开' },
      { t: '02:33', text: '或许就已经释怀' },
    ],
  },
  {
    id: 8, name: '星轨', artist: '陈默', album: '夜空观察', dur: 219, color: '#7C4DA1', audioSrc: null,
    lyrics: [
      { t: '00:00', text: '星轨' },
      { t: '00:20', text: '划过漫长的夜' },
      { t: '00:42', text: '我们把愿望藏进光里' },
      { t: '01:00', text: '等一颗流星坠落' },
      { t: '01:18', text: '银河旋转着沉默' },
      { t: '01:36', text: '时间在这里变慢' },
      { t: '01:54', text: '你的名字被写进星图' },
      { t: '02:12', text: '在黑暗中发亮' },
      { t: '02:30', text: '每一次仰望' },
      { t: '02:48', text: '都像和你重逢' },
      { t: '03:06', text: '星轨绕着夜空' },
      { t: '03:20', text: '画一个永不完结的圆' },
    ],
  },
]

// 5 个内置示例歌单，数据取自 PRD §7.7。
export const playSets: PlaySet[] = [
  { name: '华语深夜自留地', meta: '28 首 · 适合睡前', color: '#365FA3' },
  { name: '通勤轻快节奏', meta: '36 首 · 路上听', color: '#127C77' },
  { name: '午后咖啡馆', meta: '22 首 · 慵懒爵士', color: '#9B4E10' },
  { name: '独处时光', meta: '19 首 · 安静治愈', color: '#7C4DA1' },
  { name: '运动慢跑', meta: '31 首 · 律动节拍', color: '#B83D5A' },
]
