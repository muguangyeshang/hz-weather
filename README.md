# hz-weather · 杭州天气 CDN 源

给杭州行程页用的「绕道实时天气」。解决一件事：**页面在手机流量下直连 Open-Meteo 连不上**。

## 原理

```
GitHub Actions（境外，能连 Open-Meteo）
    └─ 每 3 小时抓一次 → commit hangzhou.json
                              ↓
                        jsDelivr CDN（国内有镜像，CORS 为 *）
                              ↓
                        你的行程页（手机流量也能读到）
```

实测（2026-09-29）：`cdn.jsdelivr.net` 219ms、`fastly.jsdelivr.net` 994ms，都通且 `Access-Control-Allow-Origin: *`。
而国内免 key 天气源几乎全废——中国气象局 nmc.cn 全部路径返空或 404（`rest/weather` 返回 `{"data":""}`，`rest/real` 字段全空串）、weather.com.cn 403、和风/彩云需 key——所以国内直连这条路走不通。

## 本地已就绪，只差两条命令

仓库已 `git init` + 首次提交完成（分支 `master`，4 个文件）。你只需要：

```bash
# 1. GitHub 上新建一个空仓库（public，名字建议 hz-weather），然后回来：
cd hz-weather-repo
git remote add origin https://github.com/<你的用户名>/hz-weather.git
git push -u origin master

# 2. 手动跑一次 workflow 生成 hangzhou.json
#    GitHub 仓库页 → Actions → 「抓取杭州天气」→ Run workflow
```

推上去后把用户名告诉助手，重新生成页面时会填入 CDN 地址。

## 告诉页面去哪读

把你的用户名告诉助手，重新生成页面时会填入：

```
https://cdn.jsdelivr.net/gh/<你的用户名>/hz-weather@main/hangzhou.json
```

页面源优先级会自动变成：`CDN → Open-Meteo → met.no → wttr.in → 缓存 → 离线快照`。

## 不上 GitHub 也能用

页面已内置五层降级，其中第三源 **met.no（挪威气象局）** 是免 key、全球覆盖、实测 CORS=* 的独立服务商：

- 与 Open-Meteo 交叉验证：温度偏差平均 **0.10°C**（最大 0.50°C），雨窗判断一致率 **88%**
- 已知偏差：对毛毛雨不敏感（会漏报 0.1mm 级降水），页面已按保守档位调高概率并如实标注

所以 GitHub 这条是**锦上添花**（国内最稳），不是必需。

## 注意

- jsDelivr 缓存约 5–7 小时，所以数据可能滞后一次抓取周期；页面里超过 6 小时会判定过期并降级。
- 仓库必须 **public**，jsDelivr 才能读。
- 只是天气数据，不含任何个人信息，放心公开。

## 本地试跑

```bash
node fetch.mjs     # Node 22+，会生成 hangzhou.json
```
