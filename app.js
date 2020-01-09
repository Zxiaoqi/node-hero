const express = require("express"),
  bodyParser = require("body-parser"),
  fs = require("fs"),
  multer = require("multer"),
  cors = require("cors"),
  path = require("path");
//设定multer...(忘记名字了)和formData数据发送限制
const upload = multer({
  //确定储存路径
  storage: multer.diskStorage({
    //保存的路径
    destination: function(req, file, cb) {
      cb(null, path.join(__dirname, "/imgs"));
    },
    //保存的文件名
    filename: function(req, file, cb) {
      cb(null, file.originalname);
    }
  }),
  //限制文件类型
  fileFilter: function(req, file, cb) {
    let reg = /image\/[a-z]{3,4}/;
    if (reg.test(file.mimetype)) {
      req.file = file;
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  //限制文件大小和数量
  limits: {
    fileSize: 1000 * 1000,
    files: 1
  }
}).single("icon");
//服务端
const app = express();

//中间件
//跨域设置
app.use(cors());
//解析application/json
app.use(bodyParser.json());
//解析application/x-www-form-urlencoded
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
//找文件并转json对象
function getFileData(file, defaultData = []) {
  // 同步写法可能会出现读取失败的情况
  try {
    // 通过 path 拼接绝对路径
    const filePath = path.join(__dirname, "/" + file);
    // 把获取到的数据转换成 JS 对象
    return JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    // 如果读取失败
    // 读取失败返回一个空数组
    return defaultData;
  }
}
//路径函数（没什么简化的）但能少写几个
function getPath(url) {
  return path.join(__dirname, "/" + url);
}
//重写数据（传入重写文件基于根目录的路径和处理好的数据）
function rewrite(url, arr) {
  fs.writeFileSync(getPath(url), JSON.stringify(arr));
}
//传入数据
function delImgLink(da) {
  if (da) {
    let str = da.icon;
    let imgfile = str.slice(1, str.length);
    fs.unlinkSync(getPath(imgfile));
  } else {
    console.log(123);
    return false;
  }
}
//login
app.get("/login", (req, res) => {
  //取客户端的数据
  const { username, password } = req.body;
  //获取文件内容
  const data = getFileData("/json/user.json");
  //数组方法，符合条件并返回值
  const user = data.find(item => item.username === username);
  //判断是否有值
  if (username && password) {
    //是否匹配
    res.send(
      user.username === username && user.password === password
        ? {
            code: 200,
            msg: "登录成功"
          }
        : {
            code: 400,
            msg: "用户名或密码错误"
          }
    );
  } else {
    res.send({
      msg: "请输入用户名"
    });
  }
});
//list
app.get("/list", (req, res) => {
  const data = getFileData("json/hero-list.json");
  res.send({
    msg: "获取成功",
    code: 200,
    data
  });
});

//add
app.post("/add", (req, res, next) => {
  //发送文件错误处理
  upload(req, res, err => {
    if (!!err) {
      res.json({
        code: "401",
        type: "icon",
        msg: err.message
      });
      return;
    } else if (!!req.file) {
      //获取数据
      const { name, skill } = req.body;
      let icon = req.file;
      if (name !== "" && skill !== "") {
        //添加到json文件和(数据库)
        const dt = getFileData("json/hero-list.json");
        //添加新项到数组
        let obj = [
          ...dt,
          {
            id: dt.length + 1,
            name,
            skill,
            icon: "/imgs/" + icon.originalname
          }
        ];
        //条用重写函数
        rewrite("json/hero-list.json", obj);
        res.send({
          code: 200,
          msg: "新增成功"
        });
      } else {
        res.send({
          code: 400,
          msg: "参数错误"
        });
      }
    } else {
      res.json({
        code: "413",
        type: "icon",
        msg: "请选择图片"
      });
    }
  });
});
//delete
app.get("/delete", (req, res, next) => {
  //取地址栏id值
  let id = req.query.id;
  if (id === "") {
    res.send({
      code: 400,
      msg: "id不能为空"
    });
  } else {
    const dt = getFileData("json/hero-list.json");
    let isId = dt.find(item => item.id == id);
    //判断id项是否存在
    if (isId) {
      //删除指定文件
      delImgLink(isId);
      const obj = dt.filter(item => item.id != id);
      rewrite("json/hero-list.json", obj);
      res.send({
        code: 200,
        msg: "删除成功"
      });
    } else {
      res.send({
        code: 400,
        msg: "删除失败"
      });
    }
  }
});
//search
app.get("/search", (req, res) => {
  const id = req.query.id;
  const dt = getFileData("json/hero-list/json");
  let data = dt.find(item => item.id == id);
  res.send(
    data
      ? {
          code: 200,
          msg: "查询成功",
          data
        }
      : {
          code: 400,
          msg: "参数错误"
        }
  );
});
//edit
app.post("/edit", (req, res, next) => {
  //编辑与添加和删除结合
  upload(req, res, err => {
    if (!!err) {
      res.json({
        code: "401",
        type: "icon",
        msg: err.message
      });
      return;
    } else if (!!req.file) {
      const { name, skill } = req.body;
      let id = req.query.id;
      let icon = req.file;
      const dt = getFileData("json/hero-list.json");
      let data = dt.find(item => item.id == id);
      if (name !== "" && skill !== "" && data.id !== "") {
        delImgLink(data);
        //map修改了dt数组
        dt.map(item => {
          if (item.id == id) {
            item.name = name;
            item.skill = skill;
            item.icon = "/imgs/" + icon.originalname;
          }
        });
        rewrite("json/hero-list.json", dt);
        res.send({
          code: 200,
          msg: "编辑成功"
        });
      } else {
        res.send({
          code: 400,
          msg: "参数错误"
        });
      }
    } else {
      res.json({
        code: "413",
        type: "icon",
        msg: "请选择图片"
      });
    }
  });
});
//开启服务监听
app.listen(8080, () => {
  console.log("server run in : http://127.0.0.1:8080/");
});
