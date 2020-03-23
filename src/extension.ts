// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

const path = require("path");
const { window, commands, workspace } = vscode;
const editor = window.activeTextEditor as vscode.TextEditor;
const { uploadV730 } = require("./upload");
// import foo = require("./upload");
// import { fnupload } from "./upload.js";
// const moment = require("moment");
const fs = require("fs");
const { spawn } = require("child_process");

const upload = (config: any, fsPath: string) => {
  if (!fsPath) {
    return;
  }

  const mdFilePath = editor.document.fileName;
  const mdFileName = path.basename(mdFilePath, path.extname(mdFilePath));

  return uploadV730(config, fsPath, mdFileName).then((obj: any) => {
    let { name, url } = obj;
    console.log("Upload success!");

    const img = `
![${name}](${url})
`;

    editor.edit(textEditorEdit => {
      textEditorEdit.insert(editor.selection.active, img);
    });
  });
};

const error = (err: any) => {
  window.showErrorMessage(err);
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "dd" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "extension.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed

      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello vs code!" + new Date().toLocaleString()
      );
    }
  );

  const config = workspace.getConfiguration("qiniu");

  if (!config.enable) {
    return;
  }

  const inputUpload = commands.registerCommand("extension.qiniu.upload", () => {
    if (!window.activeTextEditor) {
      window.showErrorMessage("没有打开编辑窗口");
      return;
    }

    window
      .showInputBox({
        placeHolder: "输入一个图片地址"
      })
      .then(fsPath => upload(config, fsPath as string), error);
  });

  const selectUpload = commands.registerCommand(
    "extension.qiniu.select",
    () => {
      window
        .showOpenDialog({
          filters: { Images: ["png", "jpg", "gif", "bmp"] }
        })
        .then(result => {
          if (result) {
            const { fsPath } = result[0];
            return upload(config, fsPath);
          }
        }, error);
    }
  );

  const copyclipboard = commands.registerCommand("extension.qiniu.copy", () => {
    pasteImageToQiniu();
  });

  context.subscriptions.push(inputUpload);
  context.subscriptions.push(selectUpload);
  context.subscriptions.push(copyclipboard);

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

function pasteImageToQiniu() {
  let fileUri = editor.document.uri;
  if (!fileUri) {
    return;
  }

  if (fileUri.scheme === "untitled") {
    window.showInformationMessage(
      "Before paste image, you need to save current edit file first."
    );
    return;
  }

  let selection = editor.selection;
  let selectText = editor.document.getText(selection);

  if (selectText && !/^[\w\-.]+$/.test(selectText)) {
    window.showInformationMessage("Your selection is not a valid file name!");
    return;
  }

  let config = workspace.getConfiguration("qiniu");

  let localPath = config["localPath"];
  if (localPath && localPath.length !== localPath.trim().length) {
    window.showErrorMessage(
      'The specified path is invalid. "' + localPath + '"'
    );
    return;
  }
  let filePath = fileUri.fsPath;
  let imagePath: string = getImagePath(filePath, selectText, localPath);
  createImageDirWithImagePath(imagePath)
    .then((imagePath: any) => {
      saveClipboardImageToFileAndGetPath(imagePath, (imagePath: any) => {
        if (!imagePath) {
          return;
        }
        if (imagePath === "no image") {
          return;
        }
        window.showInformationMessage("imagePath:" + imagePath);
        upload(config, imagePath)
          .then(() => {
            window.showInformationMessage("Upload success.");
          })
          .catch(() => {
            window.showErrorMessage("Upload error.");
          });
      });
    })
    .catch(err => {
      window.showErrorMessage("Failed make folder.");
      return;
    });
}

function getImagePath(filePath: string, selectText: string, localPath: string) {
  // 图片名称
  let imageFileName = "";
  if (!selectText) {
    let now = Date.now();
    imageFileName = now + ".png";
    // imageFileName = moment().format("Y-MM-DD-HH-mm-ss") + ".png";
  } else {
    imageFileName = selectText + ".png";
  }

  // 图片本地保存路径
  let folderPath = path.dirname(filePath);
  let imagePath = "";
  if (path.isAbsolute(localPath)) {
    imagePath = path.join(localPath, imageFileName);
  } else {
    imagePath = path.join(folderPath, localPath, imageFileName);
  }

  return imagePath;
}

function createImageDirWithImagePath(imagePath: string) {
  return new Promise((resolve, reject) => {
    let imageDir = path.dirname(imagePath);
    fs.exists(imageDir, (exists: any) => {
      if (exists) {
        resolve(imagePath);
        return;
      }
      fs.mkdir(imageDir, (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(imagePath);
      });
    });
  });
}

function saveClipboardImageToFileAndGetPath(imagePath: string, cb: Function) {
  if (!imagePath) {
    return;
  }
  let platform = process.platform;
  if (platform === "win32") {
    // Windows
    const scriptPath = path.join(__dirname, "../lib/pc.ps1");
    const powershell = spawn("powershell", [
      "-noprofile",
      "-noninteractive",
      "-nologo",
      "-sta",
      "-executionpolicy",
      "unrestricted",
      "-windowstyle",
      "hidden",
      "-file",
      scriptPath,
      imagePath
    ]);
    powershell.on("exit", function(code: any, signal: any) {});
    powershell.stdout.on("data", function(data: any) {
      cb(data.toString().trim());
    });
  } else if (platform === "darwin") {
    // Mac
    let scriptPath = path.join(__dirname, "./lib/mac.applescript");

    let ascript = spawn("osascript", [scriptPath, imagePath]);
    ascript.on("exit", function(code: any, signal: any) {});

    ascript.stdout.on("data", function(data: any) {
      cb(data.toString().trim());
    });
  } else {
    // Linux

    let scriptPath = path.join(__dirname, "./lib/linux.sh");

    let ascript = spawn("sh", [scriptPath, imagePath]);
    ascript.on("exit", function(code: any, signal: any) {});

    ascript.stdout.on("data", function(data: any) {
      let result = data.toString().trim();
      if (result === "no xclip") {
        vscode.window.showInformationMessage(
          "You need to install xclip command first."
        );
        return;
      }
      cb(result);
    });
  }
}
