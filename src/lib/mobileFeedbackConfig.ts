export type StepKey = "identity" | "appearance" | "style" | "element" | "image";

export type FeedbackDimension = {
  key: string;
  title: string;
  hint: string;
  detail: string;
};

export type FeedbackConfig = {
  projectName: string;
  designObject: string;
  region: string;
  style: string;
  dimensions: FeedbackDimension[];
};

export const defaultFeedbackConfig: FeedbackConfig = {
  projectName: "乡村公共IP共创意见收集",
  designObject: "鹅IP",
  region: "四川彭州海窝子古镇",
  style: "轻扁平、年轻化、亲切、有设计感、避免元素堆砌",
  dimensions: [
    { key: "identity", title: "你的身份", hint: "先确认你的参与视角", detail: "参与者选择当地商户、文化研究者、村民、手工艺人或自定义身份。" },
    { key: "appearance", title: "外观倾向", hint: "你希望 IP 看起来像什么？", detail: "收集人物、动物、植物、建筑、美食等 IP 外观方向。" },
    { key: "style", title: "风格倾向", hint: "你喜欢什么样的视觉气质？", detail: "了解写实、卡通、手绘、国潮、乡土等视觉偏好。" },
    { key: "element", title: "代表元素", hint: "什么最能代表咱们乡村？", detail: "引导参与者表达最能代表乡村的符号、场景与记忆。" },
  ],
};
