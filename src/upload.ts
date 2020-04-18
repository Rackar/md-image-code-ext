const qiniu = require("qiniu");

import * as path from "path";
import * as url from "url";
import { copyFileSync } from "fs";
import * as vscode from "vscode";
const { window, workspace } = vscode;

import {
  downloadImage,
  getImagePath,
  createImageDirWithImagePath,
} from "./image";

// 默认参数
const formatParam = (file: string, mdFileName: string) => {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  const h = dt.getHours();
  const mm = dt.getMinutes();
  const s = dt.getSeconds();

  const date = `${y}${m}${d}`;
  var ext = path.extname(file);

  return {
    date,
    dateTime: `${date}${h}${mm}${s}`,
    fileName: path.win32.basename(file, ext),
    ext,
    mdFileName,
  };
};

const formatString = (tplString: string, data: any) => {
  const keys = Object.keys(data);
  const values = keys.map((k) => data[k]);

  return new Function(keys.join(","), "return `" + tplString + "`").apply(
    null,
    values
  );
};

function saveLocalFile(file: string) {
  const config = workspace.getConfiguration("qiniu");

  if (!config.enable) {
    return;
  }
  let editor = window.activeTextEditor as vscode.TextEditor;
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
  let localPath = config["localPath"];
  if (localPath && localPath.length !== localPath.trim().length) {
    window.showErrorMessage('设置中的本地路径有误"' + localPath + '"');
    return;
  }
  let filePath = fileUri.fsPath;

  let rawName = path.win32.basename(file);
  let imagePath: string = getImagePath(filePath, rawName, localPath);
  //本地复制

  return new Promise((resolve, reject) => {
    createImageDirWithImagePath(imagePath)
      .then(async (imagePath: string) => {
        if (file.indexOf("http") === 0 || file.indexOf("https") === 0) {
          await downloadImage(file, imagePath);
        } else {
          copyFileSync(file, imagePath);
        }

        resolve({
          name: path.win32.basename(imagePath),
          url: path.join(localPath, path.win32.basename(imagePath)),
        });
      })
      .catch((err: any) => {
        console.error(err);
        reject("拷贝图片错误，请检查。error " + err);
      });
  });
}

export const uploadV730 = async (
  options: any,
  file: string,
  mdFile: string
) => {
  let {
    access_key,
    secret_key,
    bucket,
    domain,
    remotePath,
    uploadEnable,
    zone,
  } = options;

  let localFile = file;
  const extra = new qiniu.form_up.PutExtra();

  if (/^".+"$/.test(localFile)) {
    localFile = file.substring(1, file.length - 1);
  }
  // 预设参数值
  const param = formatParam(localFile, mdFile);
  // localFile在path下为远程图片路径。

  //上传到七牛后保存的文件名
  const saveFile = formatString(remotePath + "${ext}", param);

  if (!uploadEnable) {
    return saveLocalFile(localFile);
  }

  qiniu.conf.ACCESS_KEY = access_key;
  qiniu.conf.SECRET_KEY = secret_key;

  let mac = new qiniu.auth.digest.Mac(access_key, secret_key);
  let _options = {
    scope: bucket,
  };
  let _putPolicy = new qiniu.rs.PutPolicy(_options);
  let _uploadToken = _putPolicy.uploadToken(mac);

  let config = new qiniu.conf.Config();
  // 空间对应的机房
  config.zone = qiniu.zone[zone];
  let formUploader = new qiniu.form_up.FormUploader(config);

  if (localFile.indexOf("http") === 0 || localFile.indexOf("https") === 0) {
    //远程路径获取并上传
    return new Promise((resolve, reject) => {
      let bucketManager = new qiniu.rs.BucketManager(mac, config);
      bucketManager.fetch(localFile, bucket, saveFile, function (
        err: any,
        respBody: any,
        respInfo: any
      ) {
        if (err) {
          console.log(err);
          //throw err;
          reject("上传失败，请检查网络连接。error: " + err.message);
        } else {
          if (respInfo.statusCode === 200) {
            console.log(respBody.key);
            console.log(respBody.hash);
            console.log(respBody.fsize);
            console.log(respBody.mimeType);

            let resUrl = url.resolve(domain, saveFile);
            resolve({
              name: saveFile,
              url: resUrl,
            });
          } else {
            console.log(respInfo.statusCode);
            console.log(respBody);
            if (respInfo.statusCode === 404) {
              reject("图片地址找不到。error: " + respBody.error);
            } else {
              reject("上传失败，请检查七牛配置。error: " + respBody.error);
            }
          }
        }
      });
    });
  } else {
    //本地上传
    return new Promise((resolve, reject) => {
      // 文件上传
      formUploader.putFile(_uploadToken, saveFile, localFile, extra, function (
        respErr: any,
        respBody: any,
        respInfo: any
      ) {
        if (respErr) {
          reject("上传失败，请检查网络连接。error: " + respErr.message);
          // throw respErr;
        }
        if (respInfo.statusCode === 200) {
          console.log(respBody);
          resolve({
            name: saveFile,
            url: url.resolve(domain, saveFile),
          });
        } else {
          console.log(respInfo.statusCode);
          console.log(respBody);
          // throw (respBody);
          reject("上传失败，请检查七牛配置。error: " + respBody.error);
        }
      });
    });
  }
};
