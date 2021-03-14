import * as vscode from "vscode";
import axios from "axios";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";

export const getImagePath = function (filePath: string, rawFilename: string, localPath: string) {
  // 图片名称
  let imageFileName = "";
  let now = Date.now();
  if (!rawFilename) {
    imageFileName = now + ".png";
    // imageFileName = moment().format("Y-MM-DD-HH-mm-ss") + ".png";
  } else {
    imageFileName = now + "-" + rawFilename;
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
};

export const createImageDirWithImagePath = function (imagePath: string) {
  return new Promise<string>((resolve, reject) => {
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
};

export function saveClipboardImageToFileAndGetPath(imagePath: string, cb: Function) {
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
      imagePath,
    ]);
    powershell.on("exit", function (code: any, signal: any) { });
    powershell.stdout.on("data", function (data: any) {
      // console.log(data, typeof data, data.toString("utf-8"), data.toJSON());
      let msg = data.toString().trim();
      if (data.toString().trim() === "no image") {
        cb("no image");
      } else {
        cb(imagePath);
      }
    });
  } else if (platform === "darwin") {
    // Mac
    let scriptPath = path.join(__dirname, "../lib/mac.applescript");

    let ascript = spawn("osascript", [scriptPath, imagePath]);
    ascript.on("exit", function (code: any, signal: any) { });

    ascript.stdout.on("data", function (data: any) {
      cb(data.toString().trim());
    });
  } else {
    // Linux

    let scriptPath = path.join(__dirname, "../lib/linux.sh");

    let ascript = spawn("sh", [scriptPath, imagePath]);
    ascript.on("exit", function (code: any, signal: any) { });

    ascript.stdout.on("data", function (data: any) {
      let result = data.toString().trim();
      if (result === "no xclip") {
        vscode.window.showInformationMessage("You need to install xclip command first.");
        return;
      }
      cb(result);
    });
  }
}

export function downloadImage(imageSrc: string, fileName: string) {
  return new Promise((resolve, rejects) => {
    let headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.19 Safari/537.36",
    };
    axios({
      method: "get",
      url: imageSrc,
      responseType: "stream",
      headers,
    })
      .then(function (response: any) {
        response.data.pipe(fs.createWriteStream(fileName));
        resolve(true);
      })
      .catch((err) => {
        console.error(err);
        rejects();
      });
  });
}

module.exports = {
  downloadImage,
  getImagePath,
  createImageDirWithImagePath,
  saveClipboardImageToFileAndGetPath,
};
