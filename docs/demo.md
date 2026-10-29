# 演示说明

所有画面来自当前前端原型，页面顶部标有模拟状态。群体人数、共识度、AI效果和候选图均为示例。

| 截图 | 展示内容 |
| --- | --- |
| [首页](screenshots/01-home.png) | 项目入口与示例元素库 |
| [意见配置](screenshots/02-setup.png) | 桌面配置与手机问答预览 |
| [分析矩阵](screenshots/03-analysis.png) | 来源、共识与分歧展示 |
| [工作台](screenshots/04-workspace.png) | 初始候选比较 |
| [手机问答](screenshots/05-mobile.png) | 身份、标签与补充表达 |
| [交互进化](screenshots/06-evolution.png) | 连续反馈和标签选择 |
| [群体结果](screenshots/07-group-feedback.png) | 模拟群体反馈与演化关系 |
| [最终摘要](screenshots/08-final-summary.png) | 方案确认与模拟统计 |

本地运行后可访问 `/`、`/start`、`/analysis-preview`、`/workspace`、`/group-feedback`、`/third-round-feedback`、`/fourth-round-feedback`、`/final-confirmation`、`/mobile-feedback`、`/interactive-evolution-demo`、`/mobile-final-summary`。建议从首页顺序演示；直接进入部分结果页会使用预置数据或显示空状态。

工程中未发现演示视频或有效在线演示链接。桌面上的未标注截图尚未确认属于本项目，不收入仓库。后续如提供已授权视频、Figma或在线原型，可补入本页。

手机意见页刷新会丢失未提交内容，提交不产生服务端记录；邀请标记不携带桌面配置。手机交互进化的贡献摘要只在同一浏览器会话内关联。对外展示请使用虚构输入。

## 旧版模型工作流

新增独立可运行demo见[运行说明](../demos/model-workflow/README.md)；新增研究洞察与设计图见[补充材料](design-insights.md)。该demo已接入React分析页，真实推理待配置验证。

新增截图：[后端接口检查](screenshots/09-backend-integration.png)。04-workspace截图已更新为提供的IP；其余早期截图仅用于记录之前界面。
