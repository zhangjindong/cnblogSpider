var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var url = require('url');
var async = require('async');
var sql = require("./sql");
const Occurs = 15;
const pageCount = 6123;
// 并发保存数据的条数
const saveCount = 200;
const tableName = "jstvinformation";
var express = require('express');
// var multer = require('multer');
var app = express();

var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing application/x-www-form-urlencoded
// app.use(multer()); // for parsing multipart/form-data

app.use(cookieParser());
// 静态
app.use(express.static('public'));

//验证码cookie
var codeCookie = "";
var catchFirstUrl = 'http://manage.js7tv.cn/'; //入口页面
app.get('/code.png', function (req, pres) {
    var mr = Math.random();
    superagent.get(catchFirstUrl + "_common/verifyCode.php?" + mr)
        .accept('png')
        .end(function (err, res) {
            codeCookie = res.headers['set-cookie']
            pres.send(res.body);
        });
});
//模拟登陆
app.post('/', function (req, pres) {
    pres.writeHead(200, {
        'Content-Type': 'text/html;charset=utf-8'
    });

    pres.write("<ol>");
    // console.dir(JSON.stringify(req.body))
    superagent.post(catchFirstUrl + "admin/index.php?m=index")
        .set('Accept', 'application/json, text/javascript, */*; q=0.01')
        .set('Accept-Encoding', 'gzip, deflate')
        .set('Accept-Language', 'zh-CN,zh;q=0.8')
        .set('Connection', 'keep-alive')
        // .set('Content-Type', 'application/json;charset=utf-8')
        .set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
        // .set('Cookie', 'imooc_uuid=15f58ae7-2d00-4fc1-9801-1a78dde18bc2; imooc_isnew_ct=1482830692; loginstate=1; apsid=IxYWQwNTcwY2RiNDY2YWM3Z7999,1483688200,1483949602,1484013932; Hm_lpvt_f0cfcccd7b1393990c78efdeebff3968=1484034431; cvde=587441144e831-67; IMCDNS=1')

        .set("Cookie", codeCookie)
        .set('Host', 'manage.js7tv.cn')
        .set('Origin', 'http://manage.js7tv.cn')
        // .set('Referer', 'http://manage.js7tv.cn/admin/index.php?m=index')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send(req.body)
        .end(function (err, res) {
            var result = JSON.parse(res.text);
            console.dir(result);
            if (!result.result) {
                pres.end(res.text);
            } else {

                var cookie = res.headers['set-cookie']
                pareq(req, pres, cookie)
            }
        });

});
// 首页
app.get('/', function (req, res) {
    res.send('Hello World!');
});

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

exports.start = function start() {
    console.log("爬虫系统：请登陆http://127.0.0.1:3000/login.html登陆之后开始爬")
}
var id = 0;
var pareq = function (req, pres, cookie) {

    var cnodeUrl = catchFirstUrl + "admin/data_information.php?op=modify&id=";
    var pageListUrl = catchFirstUrl + "admin/data_information.php?op=list&pageno=";
    // 打开内容列表页 供6093页
    var pageListUrls = [];

    // 先爬10页
    for (let i = 1; i <= pageCount; i++) {
        pageListUrls.push(pageListUrl + i);
    }
    // 内容列表并发5页，
    // 内容详细页面并发5页；
    var concurrencyCount = 0;
    pres.write("内容列表：并发数是 " + Occurs + "条,共" + pageListUrls.length+"页");
    async.mapLimit(pageListUrls, Occurs, function (pListUrl, callback) {
        concurrencyCount++;
        // pres.write("<script>console.log('内容列表：并发数是 " + concurrencyCount + " ," + pListUrl + "')</script>");
        // console.log(pListUrl);
        superagent.get(pListUrl)
            .set("Cookie", codeCookie)
            .set("Cookie", cookie)
            .end(function (err, resDataInformation) {
                // 内容列表并发5页，
                concurrencyCount--;
                var topicUrls = [];
                var $ = cheerio.load(resDataInformation.text);
                $('.ContTxt .styleA  tbody tr').each(function (idx, element) {

                    var $element = $(element).children().eq(1);
                    var href = cnodeUrl + $element.text();
                    if ($element.text() != "") {
                        topicUrls.push(href);
                    }
                })

                callback(null, topicUrls)
            });

    }, function (err, topicUrlss) {
        var infoListUrls = [];
        // ep.after('topic_html', results.length, function(topics) {
        topicUrlss.map(function (arr) {
            infoListUrls = infoListUrls.concat(arr);
        });
        // topicUrlss[0] ='http://manage.js7tv.cn/admin/data_information.php?op=modify&id=121403' ;

        // console.log('==========================:');
        pres.write("文章总数：" + infoListUrls.length + "");

        var filds = ["author",
            "check_filter",
            "content",
            "content_author",
            "custom_tags",
            "datetime",
            "describe",
            "editorValue",
            "id_group",
            "id_modify",
            "id_navi_tag",
            "id_tags",
            "id_type",
            "images_alt",
            "images_desb",
            "images_index",
            "images_page",
            "images_url",
            "link",
            "media",
            "periods",
            "pic_upload",
            "pic_upload_id",
            "programNO",
            "recommend_status",
            "record",
            "show_site",
            "status",
            "summary",
            "time_char",
            "timing",
            "title",
            "title_short",
            "verify",
            "video"
        ];
        //先清空原始数据，再500条一插入一批数据
        var request = new sql.sqlserver.connect(sql.config).then(pool => {
            return pool.request().query("IF EXISTS (SELECT * FROM sys.objects where name = '" + tableName + "') DROP TABLE " + tableName + "")
        }).then(result => {
            // 详细信息并发到500条，写入一次数据库，此前先记录到resHTMls数组中
            var countInfoUrl = 0;
            var resHTMls = [];
            var countDo = infoListUrls.length;
            // 正在并发的数量
            var concurrencyInfoCount = 0;
            pres.write("'文章内容：并发数是 " + Occurs + "条，供" + countDo+"条");
            async.mapLimit(infoListUrls, Occurs, function (infoUrl, callback) {
                concurrencyInfoCount++;
                // pres.write("<script>console.log('文章内容：现在的并发数是" + concurrencyInfoCount + " ," + infoUrl + "')</script>");
                // console.log(countInfoUrl + " " + infoUrl);
                superagent.get(infoUrl)
                    .set("Cookie", codeCookie)
                    .set("Cookie", cookie)
                    .end(function (err, res) {
                        concurrencyInfoCount--;

                        if (res && res.text) {
                            resHTMls.push(res.text)
                            countInfoUrl++;
                            countDo--;
                            if ((countInfoUrl == saveCount || countDo == 0) && resHTMls.length != 0) {
                                console.log((new Date().toLocaleTimeString()) + "剩余" + countDo + "条")
                                //装入table 中的行数，500行执行一次插入
                                var infos = [];
                                // 循环解析resHTML中的域值

                                console.log((new Date().toLocaleTimeString()) + "循环解析resHTML中的域值")
                                resHTMls.forEach(function (resHTML) {
                                    var $ = cheerio.load(resHTML);
                                    var form = $("#dataform");
                                    var info = {};
                                    filds.forEach(function (fild) {
                                        var fildObj = form.find("[name^='" + fild + "']");
                                        fildObj.map(function (i, dom) {
                                            if ($(dom).attr("name").indexOf("]") > -1 && (!info[fild])) {
                                                info[fild] = [];
                                            }
                                            if ($(dom).attr("name").indexOf("[]") > 0) {
                                                info[fild][info[fild].length] = $(this).val() || $(this).html();
                                            } else if ($(dom).attr("name").indexOf("[") > 0) {
                                                info[fild][+($(dom).attr("name").match(/\[\S*\]/)[0].slice(1, -1))] = $(this).val() || $(this).html();
                                            } else {
                                                if (info[fild] && (info[fild] instanceof Array)) {
                                                    info[fild][info[fild].length] = $(this).val() || $(this).html();
                                                } else {
                                                    if (!info[fild])
                                                        info[fild] = $(this).val() || $(this).html()
                                                }
                                            }
                                        })
                                    });
                                    resHTMls = null;
                                    resHTMls = [];
                                    filds.forEach(function (fild) {
                                        if (info[fild] instanceof Array) {
                                            info[fild] = info[fild].join();
                                        }
                                        if (info[fild] == undefined) {
                                            info[fild] = "";
                                        }
                                    });
                                    infos[infos.length] = info;
                                })
/* // 解析图片路径
var imgPath = [];
                                console.log((new Date().toLocaleTimeString()) + "解析图片路径")
infos.forEach(info => {
    imgPath.push(info['pic_upload']);
    imgPath = imgPath.concat(info['images_url'].split(""))
}); */

                                console.log((new Date().toLocaleTimeString()) + "循环构建Table")
                                // 每500条数据执行一次插入操作
                                sql.sqlserver.close()
                                var table = new sql.sqlserver.Table(tableName);
                                table.create = true;
                                table.columns.add("idkey", sql.sqlserver.NVarChar(50), {
                                    nullable: false,
                                    primary: true
                                });
                                filds.map(function (fild) {
                                    table.columns.add(fild, sql.sqlserver.NVarChar(sql.sqlserver.MAX), {
                                        nullable: true
                                    });
                                });

                                infos.map(function (info) {
                                    var infoarr = (filds.map(function (fild) {
                                        // console.log([info["show_site[13]"], info["show_site[14]"], info["show_site[16]"], info["show_site[11]"]])
                                        return info[fild];
                                    }));
                                    // infoarr.unshift(info["id_modify"]);
                                    id++;
                                    infoarr.unshift(""+id);

                                    table.rows.add.apply(table.rows, infoarr);
                                });

                                console.log((new Date().toLocaleTimeString()) + "执行插入操作")
                                sql.bulkInsert(table, function (error, rowcount) {
                                    if (error) {
                                        console.log(error.name, error.message)
                                    } else {
                                        console.log((new Date().toLocaleTimeString()) + "插入数据：" + rowcount.rowsAffected + "条");

                                        pres.write((new Date().toLocaleTimeString()) + "插入数据：" + rowcount.rowsAffected + "条<br/>");

                                        sql.sqlserver.close();
                                        infos = undefined;
                                        infos = [];
                                        countInfoUrl = 0;
                                        callback(null, 1)
                                    }
                                });
                            } else {
                                callback(null, 1)
                            }
                        }
                    });
            }, function (err, results) {
                var count = 0;
                results.forEach(function (result) {
                    count += result;
                })

                pres.write("<hr>共保存" + count + "条数据,明细如下：");
                sql.sqlserver.close();
                // sql.query("SELECT id_modify FROM " + tableName + " ", function (error, recordsets, affected) {
                //     // error:错误消息 recordsets:查询的结果 affected
                //     if (error) {
                //         console.log(error);
                //     } else {
                //         pres.write(JSON.stringify(recordsets.recordset) + "<hr>");
                //         console.log(JSON.stringify(recordsets.recordset))

                //         pres.write("<script>console.log('爬虫结束')</script>");
                //         pres.write("</ol>");

                //         sql.sqlserver.close();
                //         pres.end();
                //     }
                // });
            });
            // });
        });
        // });
    });
}