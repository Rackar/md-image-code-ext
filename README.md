# markdown-image README

Import image to Markdown file by 4 ways. Select local file, input remote Url or local path, paste form clipbroad, right click explorer menu. It will be uploaded to Qiniu Cloud, and return image tag and url to your md file.

快速插入图片到 Markdown 文件，支持相对文件路径或自动传图床。本插件可以用四种方式上传图片到七牛云存储，并将外链图片标签写回 md 文件。方式包括本地上传，本地/远程图片路径、截图粘贴和右键菜单。

还有一个设置图片在本机同目录下保存还是上传七牛云的开关。默认关闭上传，本地保存。

新增七牛云图床浏览和管理，快捷键`Ctrl + Alt + 7`。

## 安装插件

VS Code 插件中搜索 `markdown-image` 就可以找到。点击 `Install` 安装。或者使用快捷键`Ctrl+P`，键入 `ext install markdown-image`

![install](https://www.codingyang.com/assets/img/1585053722224.7c74657b.png)

## 使用方法

打开 `.md` 文件后，左下角状态栏有 3 个按钮和一个开关。开关用于切换图片文件保存到本机路径还是上传七牛云。按钮功能如下：

![1585790341995.png](images/1585790341995.png)

1. **img 截图** 剪贴板内的截图上传。快捷键： `Ctrl + Alt +8`

   > 支持 qq，微信等工具的截图功能，会自动在本目录保存图片并上传云端。由于截图是保存在剪贴板，其他复制操作会覆盖截图。

   ![jietu](./images/jietu.gif)

2. **img 本地** 直接弹框选择本机图片上传。快捷键：`Ctrl + Alt +9`

   ![benji](images/benji.gif)

3. **img 远程** 粘贴本地图片路径或远程图片 URL 上传。快捷键：`Ctrl + Alt +0`

   ![path](images/path.gif)

4. **右键添加** 在左侧项目资源管理器中对图片文件右键，选择“将图片加入到 Markdown 文件中”。

   ![youjian.png](images/youjian.gif)

上传成功后，插件会自动返回图片外链地址，并在光标处插入图片代码。如：

```md
![filename](http://img.codingyang.com/filename-2020326111524.png)
```

云端文件命名会根据你设置的参数化命名方式。

## 配置插件自动上传七牛

[七牛云图床申请方法](https://www.codingyang.com/2020/03/getQiniu.html)

首先注册申请七牛云，然后配置 VS Code 参数，也就是上面文章中记录下来的 `外链地址、AK、SK、存储名称`。然后打开上传开关即可。

点击文件 → 首选项 → 设置（快捷键 `Ctrl + Shift + P` open user settings），在用户页找到扩展 → qiniu configuration。

![1585190944532](./images/1585190944532.png)

这里填入各项配置：

```js
{
    // 插件开关，默认打开
    "qiniu.enable": true,

    // 上传开关。如关闭则会复制图片到本机，位置为本项目中location。点击上传开关按钮会修改本值。
    "qiniu.uploadEnable": false,

    // 你的七牛AK: AccessKey
    "qiniu.access_key": "*****************************************",

    // 你的七牛SK: SecretKey
    "qiniu.secret_key": "*****************************************",

    // 七牛地区机房代码，可选项，默认华北。华东:Zone_z0, 华北:Zone_z1, 华南:Zone_z2, 北美:Zone_na0, 东南亚:Zone_as0
    "qiniu.zone":  "Zone_z1",

    // 你的七牛存储名称
    "qiniu.bucket": "i-am-pic",

    // 你的七牛外链地址。注意需要以http://作为开头 /为结尾。
    "qiniu.domain": "http://xxxxx.xxxx.com/",

    // 远程文件命名方式。参数化命名，暂时支持 ${fileName}、${mdFileName}、${date}、${dateTime}
    // 示例：
    //   ${mdFileName}-${dateTime} -> markdownName-20170412222810.jpg
    "qiniu.remotePath": "${fileName}",

    // 图片本地保存路径（因为七牛的api限制，截图上传是先将黏贴板里的图片存储到本地，然后再根据这个路径上传图片
    "qiniu.location": "./img"
}
```

修改以后会自动保存。设置完成后就可以开始使用了。

## 注意事项

1. 只有在编辑 Markdown 文件时插件才可使用。
2. VS Code 在预览界面默认不加载 http 请求的图片，而七牛免费云图床使用 http 协议。要按照下图点击允许请求才能正常预览外链图片。

![tu2](./images/tu2.png)

## 七牛图床管理

新增七牛云图床浏览和管理，快捷键`Ctrl + Alt + 7` 或者`Ctrl + Shift + p` 输入 `Manage qiniu image`。

点击拉取按钮获取图片列表，可以进行删除或者复制地址。

可点击下一页进行翻页。

## 源代码库

本插件源码地址：

https://github.com/Rackar/md-image-code-ext

欢迎报告 Bug、建议以及 PR。

## 参考资料

本插件核心代码参考了下面 3 个库，修改为 qiniu 7.3.0 版 API 的用法，改为 TypeScript 版本。支持开源，尊重原创。

[https://github.com/favers/vscode-qiniu-upload-image](https://github.com/favers/vscode-qiniu-upload-image)

[https://github.com/yscoder/vscode-qiniu-upload-image](https://github.com/yscoder/vscode-qiniu-upload-image)

[https://github.com/gityangge/vscode-qiniu-upload-image-plus](https://github.com/gityangge/vscode-qiniu-upload-image-plus)

### Working with Markdown

**Note:** You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
- Toggle preview (`Shift+CMD+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
- Press `Ctrl+Space` (Windows, Linux) or `Cmd+Space` (macOS) to see a list of Markdown snippets

### For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

### Publish shell

本地打包
`vsce package`

发布到市场
`vsce publish minor` # 中版本
`vsce publish patch` # 小版本

### 从头编辑发布流程备忘

```shell
git clone https://github.com/Rackar/md-image-code-ext
cd ./md-image-code-ext
npm i
npm i vsce typescript -g
```

然后到 https://dev.azure.com/rackar 激活 personal access key, 90 天全部权限，复制出来 token,

输入`vsce publish patch`，命令行提示输入 token 时粘贴。
