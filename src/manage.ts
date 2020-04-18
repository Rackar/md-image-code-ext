const qiniu = require("qiniu");

import * as vscode from "vscode";

export const startManger = async (
  panel: vscode.WebviewPanel,
  vueSrc: vscode.Uri
) => {
  panel.webview.html = getWebviewContent(vueSrc);
};

export const getQiniuImagesList = async (
  panel: vscode.WebviewPanel,
  marker = "",
  limit = 10
) => {
  const options = vscode.workspace.getConfiguration("qiniu");
  let { domain } = options;

  // let exOBJ = {
  //   items: [{ key: "1585041424827-202032417175.png", mimeType: "image/png" }],
  //   marker: "eyJjIjowLCJrIjoiMTU4NTE0MzE1NjE0MC0yMDIwMzI1MjEzMjM2LnBuZyJ9",
  // };
  let exOBJ: any = await doFetch(limit, marker);

  let urls = exOBJ.items
    .filter((el: any) => {
      return el.mimeType.substr(0, 5) === "image";
    })
    .map((el: any) => {
      return { url: domain + el.key, name: el.key };
    });

  panel.webview.postMessage({
    command: "getdata",
    urls: urls,
    marker: exOBJ.marker,
  });
};

function doFetch(limit: number, marker: string) {
  return new Promise((resolve, reject) => {
    let { bucketManager, bucket } = getBuckerManager();
    var _options = {
      limit: limit,
      prefix: "",
      marker: marker,
    };
    bucketManager.listPrefix(bucket, _options, function (
      err: any,
      respBody: any,
      respInfo: any
    ) {
      if (err) {
        console.log(err);
        throw err;
      }
      if (respInfo.statusCode === 200) {
        //如果这个nextMarker不为空，那么还有未列举完毕的文件列表，下次调用listPrefix的时候，
        //指定options里面的marker为这个值 eyJjIjowLCJrIjoiMTU4NTE0MzE1NjE0MC0yMDIwMzI1MjEzMjM2LnBuZyJ9
        var nextMarker = respBody.marker;
        var commonPrefixes = respBody.commonPrefixes;
        console.log(nextMarker);
        console.log(commonPrefixes);
        var items = respBody.items;
        items.forEach(function (item: any) {
          console.log(item.key);
          // console.log(item.putTime);
          // console.log(item.hash);
          // console.log(item.fsize);
          // console.log(item.mimeType);
          // console.log(item.endUser);
          // console.log(item.type);
        });
        resolve(respBody);
      } else {
        console.log(respInfo.statusCode);
        console.log(respBody);
        reject(respBody);
      }
    });
  });
}

function getWebviewContent(vueSrc: vscode.Uri) {
  return `
       <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Qiniu Manage</title>
    <script src="${vueSrc}"></script>
  </head>
  <body>
    <div id="app">
      <h3>七牛图片管理</h3>
      <div>
        <button @click="first()">拉取数据</button>
        <button @click="next()" v-show='marker!==""'>下一页</button>
      </div>
      <div v-for="(img,index) in urls" :key="index" style='margin:10px 0;padding:6px 0;'>
        <img :src="img.url" style='max-width:600px; max-height:400px' />
        <div>地址： {{img.url}}
          <button @click="copy(img.url,img.name)">
            复制
          </button>
          <button @click="del(index)">
            删除
          </button>
        </div>
        
      </div>
      <div><button @click="next()" v-show='marker!==""'>下一页</button></div>
      
    </div>

    <script>
      var app = new Vue({
        el: "#app",
        data: {
          urls: [],
          limit: 10,
          marker: "",
          markerList:[],
          currentIndex:0,
          vscode: {},
        },
        created() {
          const vscode = acquireVsCodeApi();
          this.vscode = vscode;
          this.init();
          window.addEventListener("message", (event) => {
            let message = event.data;
            switch (message.command) {
              case "getdata":
                this.getData(message);
                break;
              case "deleteFinish":
                this.delFin(message.name);
                break;
            }
          });
        },
        methods: {
          init: function () {
            
          },
          getData: function (message) {
            console.log('getData go')
            let {  urls,marker } = message;
            
            console.log(urls);
            this.urls = urls;
            this.marker=marker

            
          },
          copy(text,name){
            this.vscode.postMessage({
                command: "copy",
                text: text,
                name:name
              });
          },
          del(i) {
            let name = this.urls[i].name;
            
            this.vscode.postMessage({
              command: "delete",
              name: name,
            });
          },
          delFin(name) {
            this.urls = this.urls.filter((el) => el.name !== name);
          },
          first() {
            this.vscode.postMessage({
              command: "init",
              marker: "",
            });
          },
          next(i) {
              this.vscode.postMessage({
                command: "pull",
                marker: this.marker,
              });
            
          },
        },
      });
    </script>
  </body>
</html>

    `;
}
function getBuckerManager() {
  const options = vscode.workspace.getConfiguration("qiniu");
  let { access_key, secret_key, bucket, zone } = options;

  // qiniu.conf.ACCESS_KEY = access_key;
  // qiniu.conf.SECRET_KEY = secret_key;

  let mac = new qiniu.auth.digest.Mac(access_key, secret_key);

  let config = new qiniu.conf.Config();
  // 空间对应的机房
  config.zone = qiniu.zone[zone];

  let bucketManager = new qiniu.rs.BucketManager(mac, config);
  return { bucketManager, bucket };
}

export const deleteQiniuImage = async (
  panel: vscode.WebviewPanel,
  key: string
) => {
  let { bucketManager, bucket } = getBuckerManager();

  bucketManager.delete(bucket, key, function (
    err: any,
    respBody: any,
    respInfo: any
  ) {
    if (err) {
      console.log(err);
      //throw err;
    } else {
      console.log(respInfo.statusCode);
      console.log(respBody);
      panel.webview.postMessage({ command: "deleteFinish", name: key });
      // vscode.window.showInformationMessage("");
      vscode.window.setStatusBarMessage("图片删除成功", 1500);
    }
  });
};
