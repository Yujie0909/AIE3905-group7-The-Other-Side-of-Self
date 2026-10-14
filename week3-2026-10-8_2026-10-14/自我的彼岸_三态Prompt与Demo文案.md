# 《自我的彼岸》三态 Prompt + Demo 叙事文案

---

## 一、三态图像英文 Prompt

> 主题：一个人在海边的理想自我镜像  
> 适配模型：FLUX.1 schnell / FLUX.2 klein 4B  
> 建议尺寸：1024×1024 或 1024×576（16:9 横构图）

---

### State 1 — PERFECT（完美达成）

```
A solitary figure stands at the shore of a vast calm ocean at golden hour, 
gazing into a towering mirror of still water that reflects an idealized version 
of themselves — luminous, whole, wreathed in soft golden light. The real figure 
is rendered in muted earth tones, slightly blurred; the reflection is crystalline, 
saturated, glowing with divine warmth. The sky transitions from deep amber to 
pale rose, with crepuscular rays piercing through scattered clouds. Fine sand 
grains catch the light like powdered gold. The horizon line is perfectly level, 
conveying absolute stillness and harmony. Composition: centered vertical axis, 
the mirror-water occupying the lower third, the figure at the golden ratio point. 
Style: cinematic, hyperreal, painterly undertone reminiscent of Caspar David 
Friedrich meets James Turrell. Mood: transcendence, quiet ecstasy, the sacred 
moment before the crack.
```

---

### State 2 — CRACK（裂隙浮现）

```
The same solitary figure at the same shoreline, but the mirror-water now bears 
a thin fracture running diagonally across its surface — not shattered, but 
disturbed. The reflection of the ideal self is slightly misaligned: the eyes 
no longer meet, one hand drifts out of frame, colors bleed at the edges like 
watercolor left in rain. The golden light has shifted to a cooler, desaturated 
amber with hints of steel blue creeping in from the periphery. The sand is 
duller, some grains scattered as if by a restless wind. Hair and clothing 
ripple as though an unseen current passes through the scene. Subtle chromatic 
aberration at the image edges. The horizon tilts almost imperceptibly — 2 
degrees off level. Composition: figure shifted slightly off-center to the left, 
the crack line running from lower-left to upper-right, dividing the frame. 
Style: photorealistic with selective degradation, like a photograph left too 
long in sunlight. Mood: unease, the first doubt, beauty beginning to 
question itself.
```

---

### State 3 — COLLAPSE（碎裂消散）

```
The figure remains but the mirror is annihilated — the water surface has 
exploded into thousands of suspended shards, each reflecting a different 
fragment of the ideal self: an eye here, a half-smile there, a hand reaching 
out. The shards are dissolving into fine luminous particles that drift upward 
like reverse snow, caught between falling and becoming light. The real figure 
is now sharply focused but diminished, standing alone in a landscape stripped 
of warmth — cold pewter sky, flat grey ocean, barren wet sand. All golden 
light has been extinguished. The particles carry the last traces of color: 
faint gold, rose, amber — bleeding out into monochrome. Debris floats at 
varying depths, creating a parallax sense of space. Composition: the figure 
small in the lower-left quadrant, the shattered mirror field dominating the 
frame, particles creating diagonal flow from center to upper-right void. 
Style: surreal cinematic, volumetric light through particle dust, reminiscent 
of Bill Viola's video installations crossed with Anish Kapoor's void 
sculptures. Mood: grief, dissolution, the self returned to formless water — 
not destruction but transformation through loss.
```

---

## 二、Demo 页面叙事与交互文案

---

### 页面标题

```
自我的彼岸
The Other Side of Self

— 一场关于镜、关于你、关于你未曾成为的那个自己的交互仪式 —
```

---

### 开场引导语（页面首屏，访客进入时渐显）

```
你面前有一面镜子。

它不反射你的脸，
它反射你想成为的那个自己。

走近一步。
对它说一句话——
说说你理想中的自己，
或者你害怕成为的样子。

镜子会回应你。
```

---

### 交互按钮文案

| 交互阶段 | 按钮文案 | 备注 |
|---------|---------|------|
| 首屏 → 开始对话 | 「走近镜子」 | 点击进入语音输入界面 |
| 语音录制中 | 「我在听……」 | 按钮变为脉动状态，不可再次点击 |
| 录音完成 → 等待生成 | 「镜子正在回应」 | 显示加载动画 |
| PERFECT 画面展示 | — | 自动停留 4 秒 |
| PERFECT → CRACK 过渡 | 「你看见裂痕了吗？」 | 文字浮现，随后画面渐变 |
| CRACK 画面展示 | — | 自动停留 3 秒 |
| CRACK → COLLAPSE 过渡 | 「它碎了。」 | 文字短暂停留，随后崩塌特效 |
| COLLAPSE 画面展示 | — | 粒子消散动画，持续 5 秒 |
| 体验结束 → 引导反思 | 「你刚才看见的是你，还是你渴望的你？」 | 点击后进入结尾 |

---

### 三态步骤说明（可用作画面切换时的浮层文字或旁白）

**PERFECT — 完美态**
```
镜子给出了回答。

你看见了那个理想的自己——
站在晨光里，完整、从容、被金色笼罩。
海水平静如镜，天际线纹丝不动。

这就是你告诉镜子的那个故事。
```

**CRACK — 裂隙态**
```
但镜子没有停在那里。

一道裂痕出现了——
很细，几乎看不见。
颜色开始偏移，光线不再均匀。

也许完美的自己从来不是一个静态的画面。
也许裂痕不是失败，
而是真实正在渗透。
```

**COLLAPSE — 崩塌态**
```
然后，一切碎了。

完美的倒影炸裂成无数碎片，
每一片还残留着一点点金色的记忆。
它们向上飘散，像光，像灰，像一声没有出口的叹息。

你站在空荡荡的海边。
镜子不见了。
只剩下你，和一片被搅动过的水。
```

---

### 结尾引导语（体验结束后渐显）

```
你刚才经历的，
不是一段表演，也不是一段动画。

它是你对自己说的一句话，
被一面不撒谎的镜子，
诚实地还给了你。

完美是叙事。
裂痕是过程。
崩塌是——也许——某种更真实的东西。

下次你照镜子的时候，
想想你今天看见的。


                        — 自我的彼岸 / The Other Side of Self —
                        一个关于自我认知与 AI 反射的交互装置
```



