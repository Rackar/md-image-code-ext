const qiniu = require("qiniu");
const path = require("path");
const url = require("url");

const PutPolicy = qiniu.rs.PutPolicy;

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
    mdFileName
  };
};

const formatString = (tplString: string, data: any) => {
  const keys = Object.keys(data);
  const values = keys.map(k => data[k]);

  return new Function(keys.join(","), "return `" + tplString + "`").apply(
    null,
    values
  );
};

module.exports.uploadV730 = (options: any, file: string, mdFile: string) => {
  let { access_key, secret_key, bucket, domain, remotePath } = options;

  qiniu.conf.ACCESS_KEY = access_key;
  qiniu.conf.SECRET_KEY = secret_key;

  let mac = new qiniu.auth.digest.Mac(access_key, secret_key);
  let _options = {
    scope: bucket
  };
  let _putPolicy = new qiniu.rs.PutPolicy(_options);
  let _uploadToken = _putPolicy.uploadToken(mac);

  let config = new qiniu.conf.Config();
  // 空间对应的机房
  config.zone = qiniu.zone.Zone_z1;
  let formUploader = new qiniu.form_up.FormUploader(config);

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

  let key = param.fileName; //仅文件名

  if (localFile.indexOf("http") === 0 || localFile.indexOf("https") === 0) {
    //远程路径获取并上传
    return new Promise((resolve, reject) => {
      let bucketManager = new qiniu.rs.BucketManager(mac, config);
      bucketManager.fetch(localFile, bucket, saveFile, function(
        err: any,
        respBody: any,
        respInfo: any
      ) {
        if (err) {
          console.log(err);
          //throw err;
        } else {
          if (respInfo.statusCode === 200) {
            console.log(respBody.key);
            console.log(respBody.hash);
            console.log(respBody.fsize);
            console.log(respBody.mimeType);

            let resUrl = url.resolve(domain, saveFile);

            if (!err) {
              resolve({
                name: path.win32.basename(respBody.key, param.ext),
                url: resUrl
              });
            } else {
              console.log(respInfo.statusCode);
              console.log(respBody);
              reject(respBody);
            }
          }
        }
      });
    });
  } else {
    //本地上传
    return new Promise((resolve, reject) => {
      // 文件上传
      formUploader.putFile(_uploadToken, saveFile, localFile, extra, function(
        respErr: any,
        respBody: any,
        respInfo: any
      ) {
        if (respErr) {
          throw respErr;
        }
        if (respInfo.statusCode === 200) {
          console.log(respBody);
          resolve({
            name: path.win32.basename(key, param.ext),
            url: url.resolve(domain, saveFile)
          });
        } else {
          console.log(respInfo.statusCode);
          console.log(respBody);
          reject(respBody);
        }
      });
    });
  }
};
