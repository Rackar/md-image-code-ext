// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
const { window, commands, workspace } = vscode;
import { uploadV730 } from "./upload";
import { startManger, getQiniuImagesList, deleteQiniuImage } from "./manage";

import {
  getImagePath,
  createImageDirWithImagePath,
  saveClipboardImageToFileAndGetPath,
} from "./image";

let editor: vscode.TextEditor;

function insertImageTag(name: string, url: string) {
  const img = `
![${name}](${url})
`;

  editor.edit((textEditorEdit) => {
    textEditorEdit.insert(editor.selection.active, img);
  });
}
enum cmdType {
  local,
  path,
  copyclip,
  explorer,
}

const upload = (
  config: any,
  fsPath: string,
  type: cmdType = cmdType.local
): any => {
  if (!fsPath) {
    return;
  }
  const uploadEnable = workspace.getConfiguration("qiniu").uploadEnable;
  //无需上传
  if (!uploadEnable) {
    let name = path.basename(fsPath);
    let url = "";
    if (type === cmdType.copyclip) {
      let localPath = config["localPath"];
      url = path.join(localPath, path.basename(fsPath));
      insertImageTag(name, url);
      return;
    } else if (type === cmdType.explorer) {
      let urlMd = path.dirname(editor.document.uri.fsPath);
      let urlPic = path.normalize(fsPath);
      url = path.relative(urlMd, urlPic);
      url = url.replace(/\\/g, "/"); //替换反斜杠为斜杠
      insertImageTag(name, url);
      return;
    }
  }

  const mdFilePath = editor.document.fileName;
  const mdFileName = path.basename(mdFilePath, path.extname(mdFilePath));

  //云端上传
  return uploadV730(config, fsPath, mdFileName)
    .then(
      (obj: any) => {
        let { name, url } = obj;
        console.log("Upload success!");

        insertImageTag(name, url);
      },
      (err: any) => {
        console.log(err);
        return error(err);
      }
    )
    .catch((err: any) => {
      console.log(err);
      return error(err);
    });
};

const error = (err: any) => {
  window.showErrorMessage(err);
};
let sBarUpload: vscode.StatusBarItem;
let sBarSelect: vscode.StatusBarItem;
let sBarClip: vscode.StatusBarItem;
let sBarSwitch: vscode.StatusBarItem;

const showSBars = () => {
  sBarUpload.show();
  sBarSelect.show();
  sBarClip.show();
  sBarSwitch.show();
};

const hideSBars = () => {
  sBarUpload.hide();
  sBarSelect.hide();
  sBarClip.hide();
  sBarSwitch.hide();
};

const initStatusBar = (subscriptions: any, commandObj: any) => {
  let { cmdUpload, cmdSelect, cmdCopy, cmdSwitch } = commandObj;
  const config = workspace.getConfiguration("qiniu");
  sBarSwitch = window.createStatusBarItem(vscode.StatusBarAlignment.Left, 18);
  sBarUpload = window.createStatusBarItem(vscode.StatusBarAlignment.Left, 19);
  sBarSelect = window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
  sBarClip = window.createStatusBarItem(vscode.StatusBarAlignment.Left, 21);

  sBarUpload.text = "img远程";
  sBarSelect.text = "img本地";
  sBarClip.text = "img截图";
  if (config.uploadEnable) {
    sBarSwitch.text = "上传开关：已开";
  } else {
    sBarSwitch.text = "上传开关：已关";
  }

  sBarUpload.tooltip = "将远程URL的图片下载到七牛云并插入本文";
  sBarSelect.tooltip = "将本机的图片上传到七牛云并插入本文";
  sBarClip.tooltip = "将剪贴板中的截图保存到本目录下并上传七牛云后，插入本文";
  sBarSwitch.tooltip = "点击开启/关闭上传";

  sBarUpload.command = cmdUpload;
  sBarSelect.command = cmdSelect;
  sBarClip.command = cmdCopy;
  sBarSwitch.command = cmdSwitch;

  subscriptions.push(sBarUpload);
  subscriptions.push(sBarSelect);
  subscriptions.push(sBarClip);
  subscriptions.push(sBarSwitch);

  showSBars();
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "markdown-image" is now active!'
  );

  const configAll = workspace.getConfiguration("qiniu");

  if (!configAll.enable) {
    return;
  }

  let cmdUpload = "extension.qiniu.upload";
  let cmdSelect = "extension.qiniu.select";
  let cmdCopy = "extension.qiniu.copy";
  let cmdSwitch = "extension.qiniu.switch";
  let cmdAddPath = "extension.qiniu.addPath";
  let cmdManageQiniu = "extension.qiniu.manage";

  initStatusBar(context.subscriptions, {
    cmdUpload,
    cmdSelect,
    cmdCopy,
    cmdSwitch,
  });

  const switchUpload = commands.registerCommand(cmdSwitch, async () => {
    if (!window.activeTextEditor) {
      window.showErrorMessage("没有打开编辑窗口");
      return;
    }
    editor = window.activeTextEditor as vscode.TextEditor;
    let config = workspace.getConfiguration();

    if (config.qiniu.uploadEnable) {
      // config.uploadEnable.set = false;
      // WorkspaceConfiguration 类型的update(section: string, value: any, configurationTarget?: ConfigurationTarget | boolean, overrideInLanguage?: boolean): Thenable<void>
      await config.update(
        "qiniu.uploadEnable",
        false,
        vscode.ConfigurationTarget.Global
      );
      sBarSwitch.text = "上传开关：已关";
      window.showInformationMessage(
        "markdown-image插件上传关闭，图片保存在本地"
      );
    } else {
      await config.update(
        "qiniu.uploadEnable",
        true,
        vscode.ConfigurationTarget.Global
      );
      sBarSwitch.text = "上传开关：已开";
      window.showInformationMessage(
        "markdown-image插件上传开启，图片保存在七牛云"
      );
    }
    console.log(config.qiniu.uploadEnable);
  });

  const inputUpload = commands.registerCommand(cmdUpload, () => {
    if (!window.activeTextEditor) {
      window.showErrorMessage("没有打开编辑窗口");
      return;
    }
    editor = window.activeTextEditor as vscode.TextEditor;
    const config = workspace.getConfiguration("qiniu");

    window
      .showInputBox({
        placeHolder: "输入一个图片地址",
      })
      .then((fsPath) => upload(config, fsPath as string), error);
  });

  const selectUpload = commands.registerCommand(cmdSelect, () => {
    if (!window.activeTextEditor) {
      window.showErrorMessage("没有打开编辑窗口");
      return;
    }
    editor = window.activeTextEditor as vscode.TextEditor;
    const config = workspace.getConfiguration("qiniu");
    window
      .showOpenDialog({
        filters: { Images: ["png", "jpg", "gif", "bmp"] },
      })
      .then((result) => {
        if (result) {
          const { fsPath } = result[0];
          return upload(config, fsPath);
        }
      }, error);
  });

  const copyclipboard = commands.registerCommand(cmdCopy, () => {
    if (!window.activeTextEditor) {
      window.showErrorMessage("没有打开编辑窗口");
      return;
    }
    editor = window.activeTextEditor as vscode.TextEditor;
    pasteImageToQiniu();
  });

  const addPath = commands.registerCommand(cmdAddPath, (uri) => {
    if (!uri) {
      vscode.window.showErrorMessage("复制路径失败，请重试。");

      return;
    }
    // let pathUri = vscode.workspace.asRelativePath(uri);
    let pathUri = uri.fsPath;
    pathUri = pathUri.replace(/\\/g, "/");
    if (!window.activeTextEditor) {
      window.showErrorMessage("没有打开md编辑窗口");
      return;
    }
    const config = workspace.getConfiguration("qiniu");
    editor = window.activeTextEditor as vscode.TextEditor;
    upload(config, pathUri, cmdType.explorer);
  });

  const manageQiniu = commands.registerCommand(cmdManageQiniu, () => {
    editor = window.activeTextEditor as vscode.TextEditor;
    const panel = vscode.window.createWebviewPanel(
      "qiniuManage", // 只供内部使用，这个webview的标识
      "七牛云存储管理", // 给用户显示的面板标题
      vscode.ViewColumn.One, // 给新的webview面板一个编辑器视图
      {
        enableScripts: true,
      } // Webview选项。我们稍后会用上
    );
    // 获取磁盘上的资源路径
    const onDiskPath = vscode.Uri.file(
      path.join(context.extensionPath, "lib", "vue.js")
    );
    const scriptUri = panel.webview.asWebviewUri(onDiskPath);
    // 获取在webview中使用的特殊URI

    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "delete":
            deleteQiniuImage(panel, message.name);
            return;
          case "pull":
            if (message.marker === "") {
              vscode.window.showWarningMessage("已无更多内容。");
              return;
            }
            getQiniuImagesList(panel, message.marker);
            return;
          case "init":
            getQiniuImagesList(panel);
            return;
        }
      },
      undefined,
      context.subscriptions
    );

    startManger(panel, scriptUri);
  });

  context.subscriptions.push(inputUpload);
  context.subscriptions.push(selectUpload);
  context.subscriptions.push(copyclipboard);
  context.subscriptions.push(switchUpload);
  context.subscriptions.push(addPath);
  context.subscriptions.push(manageQiniu);
  // context.subscriptions.push(disposable);
  window.onDidChangeActiveTextEditor(() => {
    if (window.activeTextEditor) {
      let fileLanguage = (window.activeTextEditor as vscode.TextEditor).document
        .languageId;
      if (fileLanguage === "markdown") {
        showSBars();
      } else {
        hideSBars();
      }
      console.log(fileLanguage);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {
  console.log('"markdown-image" is shuting down.');
}

function pasteImageToQiniu() {
  let fileUri = editor.document.uri;
  if (!fileUri) {
    return;
  }

  if (fileUri.scheme === "untitled") {
    window.showInformationMessage("粘贴图片前需要先保存本文件。");
    return;
  }

  let selection = editor.selection;
  let selectText = editor.document.getText(selection);

  if (selectText && !/^[\w\-.]+$/.test(selectText)) {
    window.showInformationMessage("文件名有误");
    return;
  }

  let config = workspace.getConfiguration("qiniu");

  let localPath = config["localPath"];
  if (localPath && localPath.length !== localPath.trim().length) {
    window.showErrorMessage('设置中的本地路径有误"' + localPath + '"');
    return;
  }
  let filePath = fileUri.fsPath;

  let imagePath: string = getImagePath(filePath, "", localPath);
  createImageDirWithImagePath(imagePath)
    .then((imagePath: any) => {
      saveClipboardImageToFileAndGetPath(imagePath, (imagePath: any) => {
        if (!imagePath) {
          return;
        }
        if (imagePath === "no image") {
          return;
        }
        // window.showInformationMessage("imagePath:" + imagePath);
        upload(config, imagePath, cmdType.copyclip)
          .then(() => {
            // window.showInformationMessage("Upload success.");
            console.log("上传成功");
          })
          .catch(() => {
            window.showErrorMessage("上传失败，请检查参数设置");
          });
      });
    })
    .catch((err: any) => {
      window.showErrorMessage("文件夹创建失败");
      return;
    });
}
