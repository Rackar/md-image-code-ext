const fs = require("fs");
import axios from "axios";

module.exports.toLocal = async (options: any, file: string, mdFile: string) => {
  let { domain, remotePath, uploadEnable } = options;

  let localFile = file;

  if (/^".+"$/.test(localFile)) {
    localFile = file.substring(1, file.length - 1);
  }

  // // 预设参数值
  // const param = formatParam(localFile, mdFile);
  // // localFile在path下为远程图片路径。

  // //保存的文件名
  // const saveFile = formatString(remotePath + "${ext}", param);

  // let key = param.fileName; //仅文件名

  // if (localFile.indexOf("http") === 0 || localFile.indexOf("https") === 0) {
  //   //远程路径获取并下载
  //   await downloadImage({ url: "" }, localFile, saveFile);
  // } else {
  //   //本地下载
  // }
};

async function downloadImage(album: any, imageSrc: string, fileName: string) {
  let headers = {
    Referer: album.url,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.19 Safari/537.36"
  };
  await axios({
    method: "get",
    url: imageSrc,
    responseType: "stream",
    headers
  })
    .then(function(response: any) {
      response.data.pipe(fs.createWriteStream(fileName));
    })
    .catch(err => {
      console.error(err);
    });
}
