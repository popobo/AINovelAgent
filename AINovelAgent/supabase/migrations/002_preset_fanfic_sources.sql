-- 预置一些热门作品的同人设定
INSERT INTO fanfic_sources (name, type, world_setting, characters, plot_summary) VALUES
(
  '火影忍者',
  'anime',
  '忍者世界，以查克拉为基础的忍术体系。世界分为五大忍村：木叶、砂隐、雾隐、云隐、岩隐。忍者通过修炼查克拉来施展各种忍术、幻术和体术。存在尾兽、血继限界等特殊力量。',
  '[
    {"name": "漩涡�的鸣人", "personality": "热血、乐观、永不放弃", "description": "木叶村的忍者，九尾人柱力，梦想成为火影", "catchphrases": ["这就是我的忍道！", "我要成为火影！"]},
    {"name": "宇智波佐助", "personality": "冷酷、骄傲、追求力量", "description": "宇智波一族的幸存者，拥有写轮眼", "catchphrases": ["太弱了"]},
    {"name": "春野樱", "personality": "聪明、温柔但有些暴躁", "description": "医疗忍者，纲手的弟子", "catchphrases": ["莎拉内！"]},
    {"name": "旗木卡卡西", "personality": "慵懒、睿智、可靠", "description": "第七班的老师，复制忍者", "catchphrases": ["啊，抱歉我迷路了..."]}
  ]',
  '漩涡鸣人从一个被村民排斥的吊车尾，逐渐成长为受人尊敬的忍者，最终实现成为火影的梦想。'
),
(
  '进击的巨人',
  'anime',
  '人类居住在由三道城墙包围的区域内，城墙外是巨人的领地。调查兵团负责城外的探索和巨人研究。存在智慧巨人和九大巨人之力。',
  '[
    {"name": "艾伦·耶格尔", "personality": "冲动、执着、有强烈的自由意志", "description": "主角，拥有进击的巨人之力", "catchphrases": ["我要把巨人从这个世界上驱逐出去！"]},
    {"name": "三笠·阿克曼", "personality": "冷静、强大、对艾伦极度忠诚", "description": "人类最强士兵之一，阿克曼一族", "catchphrases": ["艾伦..."]},
    {"name": "阿尔敏·阿诺德", "personality": "聪明、懦弱但关键时刻很勇敢", "description": "战略天才，艾伦的挚友", "catchphrases": []},
    {"name": "利威尔", "personality": "冷酷、洁癖、极其强大", "description": "人类最强士兵，调查兵团兵长", "catchphrases": ["tsk..."]}
  ]',
  '在巨人袭击故乡后，艾伦立志消灭所有巨人，与同伴一起加入调查兵团，逐渐揭开世界的真相。'
),
(
  '哈利·波特',
  'movie',
  '魔法世界与麻瓜世界并存。霍格沃茨是最著名的魔法学校，分为格兰芬多、斯莱特林、赫奇帕奇、拉文克劳四个学院。魔法师使用魔杖施法，存在各种神奇生物和魔法物品。',
  '[
    {"name": "哈利·波特", "personality": "勇敢、正义、有时冲动", "description": "大难不死的男孩，额头上有闪电形伤疤", "catchphrases": ["Expecto Patronum!"]},
    {"name": "赫敏·格兰杰", "personality": "聪明、好学、有些固执", "description": "最优秀的学生，麻瓜出身的女巫", "catchphrases": ["图书馆！"]},
    {"name": "罗恩·韦斯莱", "personality": "忠诚、幽默、有时自卑", "description": "哈利最好的朋友，韦斯莱家族的小儿子", "catchphrases": ["Bloody hell!"]},
    {"name": "阿不思·邓布利多", "personality": "睿智、神秘、深谋远虑", "description": "霍格沃茨校长，最伟大的巫师", "catchphrases": ["爱是最强大的魔法"]}
  ]',
  '孤儿哈利波特在11岁生日时发现自己是巫师，进入霍格沃茨学习魔法，并多次与黑魔王伏地魔对抗。'
),
(
  '原神',
  'game',
  '提瓦特大陆，由七位神明分别掌管的七个国度组成：蒙德（风）、璃月（岩）、稻妻（雷）、须弥（草）、枫丹（水）、纳塔（火）、至冬（冰）。冒险者可以使用元素之力战斗。',
  '[
    {"name": "旅行者", "personality": "沉默寡言但内心温暖", "description": "来自另一个世界的旅行者，寻找失散的兄弟/姐妹", "catchphrases": ["..."]},
    {"name": "派蒙", "personality": "贪吃、话痨、忠诚", "description": "旅行者的向导，自称最好的伙伴", "catchphrases": ["前面的区域以后再来探索吧！", "派蒙才不是应急食品！"]},
    {"name": "钟离", "personality": "优雅、博学、喜欢讲述历史", "description": "璃月港的顾问，岩王帝君摩拉克斯", "catchphrases": ["天动万象"]},
    {"name": "温迪", "personality": "随性、爱好自由和美酒", "description": "流浪诗人，风神巴巴托斯", "catchphrases": ["风带来了故事的种子"]}
  ]',
  '旅行者为了寻找失散的血亲，在提瓦特大陆各国冒险，结识各路伙伴，逐渐揭开这个世界的秘密。'
),
(
  '庆余年',
  'tv',
  '架空的古代世界，南庆国与北齐国对峙。存在内库、鉴查院、监察院等势力。科技水平接近古代中国，但主角拥有现代知识。',
  '[
    {"name": "范闲", "personality": "聪明、腹黑、有现代人思维", "description": "穿越者，庆帝私生子，继承母亲遗产", "catchphrases": ["我只想平平安安地活着"]},
    {"name": "林婉儿", "personality": "温婉、善良、有主见", "description": "宰相之女，范闲的妻子，患有肺痨", "catchphrases": []},
    {"name": "庆帝", "personality": "深沉、多疑、雄才大略", "description": "南庆皇帝，范闲生父", "catchphrases": []},
    {"name": "陈萍萍", "personality": "阴沉、忠诚、心狠手辣", "description": "监察院院长，轮椅上的权谋者", "catchphrases": []}
  ]',
  '现代青年穿越到古代，凭借前世记忆和现代知识在权谋世界中求生存、谋发展。'
);

