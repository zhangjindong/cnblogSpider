var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var url = require('url');
var async = require('async');
var sql = require("./sql");
const Occurs = 15;
const pageCount = 3;
// 并发保存数据的条数
const saveCount = 500;
const tableName = "js7tvinformation";
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
app.get('/code.png', function(req, pres) {
    var mr = Math.random();
    superagent.get(catchFirstUrl + "_common/verifyCode.php?" + mr)
        .accept('png')
        .end(function(err, res) {
            codeCookie = res.headers['set-cookie']
            pres.send(res.body);
        });
});
//模拟登陆
app.post('/', function(req, pres) {
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
        .end(function(err, res) {
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
app.get('/', function(req, res) {
    res.send('Hello World!');
});

var server = app.listen(3000, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

exports.start = function start() {
    console.log("爬虫系统：请登陆http://127.0.0.1:3000/login.html登陆之后开始爬")
}
var pareq = function(req, pres, cookie) {

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
    async.mapLimit(pageListUrls, Occurs, function(pListUrl, callback) {
        concurrencyCount++;
        pres.write("<script>console.log('内容列表：并发数是 " + concurrencyCount + " ," + pListUrl + "')</script>");
        console.log(pListUrl);
        superagent.get(pListUrl)
            .set("Cookie", codeCookie)
            .set("Cookie", cookie)
            .end(function(err, resDataInformation) {
                // 内容列表并发5页，
                concurrencyCount--;
                var topicUrls = [];
                var $ = cheerio.load(resDataInformation.text);
                $('.ContTxt .styleA  tbody tr').each(function(idx, element) {

                    var $element = $(element).children().eq(1);
                    var href = cnodeUrl + $element.text();
                    if ($element.text() != "") {
                        topicUrls.push(href);
                    }
                })

                callback(null, topicUrls)
            });

    }, function(err, topicUrlss) {
        var infoListUrls = [];
        // ep.after('topic_html', results.length, function(topics) {
        topicUrlss.map(function(arr) {
            infoListUrls = infoListUrls.concat(arr);
        });
        // topicUrlss[0] ='http://manage.js7tv.cn/admin/data_information.php?op=modify&id=121403' ;

        console.log('==========================:');
        pres.write("<script>console.log('文章总数：" + infoListUrls.length + "')</script>");
        // 正在并发的数量
        var concurrencyInfoCount = 0;
        async.mapLimit(infoListUrls, Occurs, function(infoUrl, callback) {
            concurrencyInfoCount++;
            pres.write("<script>console.log('文章内容：现在的并发数是" + concurrencyInfoCount + " ," + infoUrl + "')</script>");
            console.log(infoUrl);
            superagent.get(infoUrl)
                .set("Cookie", codeCookie)
                .set("Cookie", cookie)
                .end(function(err, res) {
                    concurrencyInfoCount--;
                    // ep.emit('topic_html', [topicUrl, res.text]);
                    if (res && res.text) {
                        callback(null, res.text)
                    }
                });

        }, function(err, resHTMls) {
            // ep.after('topic_html', results.length, function(topics) {
            /*
            resHTMls.map(function(resHTMl) {
                var $ = cheerio.load(resHTMl);
                var form = $("#dataform");
                var info = {};
                info['id_modify'] = form.find("[name='id_modify']").val();
                info['id_type'] = form.find("[name='id_type']").val();
                info['id_navi_tag'] = form.find("[name='id_navi_tag']").val();
                info['periods'] = form.find("[name='periods']").val();
                info['programNO'] = form.find("[name='programNO']").val();
                info['title'] = form.find("[name='title']").val();
                info['title_short'] = form.find("[name='title_short']").val();
                info['link'] = form.find("[name='link']").val();
                info['recommend_status'] = form.find("[name='recommend_status']").val();
                info['id_tags[5]'] = form.find("[name='id_tags[5]']").val();
                info['show_site[5]'] = form.find("[name='show_site[5]']").val();
                info['id_tags[6]'] = form.find("[name='id_tags[6]']").val();
                info['show_site[6]'] = form.find("[name='show_site[6]']").val();
                info['id_tags[11]'] = form.find("[name='id_tags[11]']").val();
                info['show_site[11]'] = form.find("[name='show_site[11]']").val();
                info['id_tags[13]'] = form.find("[name='id_tags[13]']").val();
                info['show_site[13]'] = form.find("[name='show_site[13]']").val();
                info['id_tags[14]'] = form.find("[name='id_tags[14]']").val();
                info['show_site[14]'] = form.find("[name='show_site[14]']").val();
                info['id_tags[16]'] = form.find("[name='id_tags[16]']").val();
                info['show_site[16]'] = form.find("[name='show_site[16]']").val();
                info['id_tags[17]'] = form.find("[name='id_tags[17]']").val();
                info['show_site[17]'] = form.find("[name='show_site[17]']").val();
                info['id_tags[18]'] = form.find("[name='id_tags[18]']").val();
                info['show_site[18]'] = form.find("[name='show_site[18]']").val();
                info['id_tags[19]'] = form.find("[name='id_tags[19]']").val();
                info['show_site[19]'] = form.find("[name='show_site[19]']").val();
                info['id_tags[20]'] = form.find("[name='id_tags[20]']").val();
                info['show_site[20]'] = form.find("[name='show_site[20]']").val();
                info['id_tags[21]'] = form.find("[name='id_tags[21]']").val();
                info['show_site[21]'] = form.find("[name='show_site[21]']").val();
                info['id_tags[22]'] = form.find("[name='id_tags[22]']").val();
                info['show_site[22]'] = form.find("[name='show_site[22]']").val();
                info['id_tags[23]'] = form.find("[name='id_tags[23]']").val();
                info['show_site[23]'] = form.find("[name='show_site[23]']").val();
                info['id_tags[24]'] = form.find("[name='id_tags[24]']").val();
                info['show_site[24]'] = form.find("[name='show_site[24]']").val();
                info['id_tags[25]'] = form.find("[name='id_tags[25]']").val();
                info['show_site[25]'] = form.find("[name='show_site[25]']").val();
                info['id_tags[26]'] = form.find("[name='id_tags[26]']").val();
                info['show_site[26]'] = form.find("[name='show_site[26]']").val();
                info['id_tags[27]'] = form.find("[name='id_tags[27]']").val();
                info['show_site[27]'] = form.find("[name='show_site[27]']").val();
                info['id_tags[28]'] = form.find("[name='id_tags[28]']").val();
                info['show_site[28]'] = form.find("[name='show_site[28]']").val();
                info['id_tags[29]'] = form.find("[name='id_tags[29]']").val();
                info['show_site[29]'] = form.find("[name='show_site[29]']").val();
                info['show_site'] = form.find("[name='show_site']").val();
                info['media'] = form.find("[name='media']").val();
                info['content_author'] = form.find("[name='content_author']").val();
                info['custom_tags'] = form.find("[name='custom_tags']").val();
                info['author'] = form.find("[name='author']").val();
                info['pic_upload_id'] = form.find("[name='pic_upload_id']").map(function(i, dom) {
                    return $(this).val() || $(this).html()
                }).get().join();
                info['pic_upload'] = form.find("[name='pic_upload']").val();
                info['video'] = form.find("[name='video']").val();
                info['time_char'] = form.find("[name='time_char']").val();
                info['summary'] = form.find("[name='summary']").val();
                info['timing'] = form.find("[name='timing']").val();
                info['record'] = form.find("[name='record']").val();
                info['status'] = form.find("[name='status']").val();
                info['check_filter'] = form.find("[name='check_filter']").val();
                info['verify'] = form.find("[name='verify']").val();
                info['datetime'] = form.find("[name='datetime']").val();
                info['describe'] = form.find("[name='describe']").map(function(i, dom) {
                    return $(this).val() || $(this).html()
                }).get().join();
                info['editorValue'] = form.find("[name='editorValue']").map(function(i, dom) {
                    return $(this).val() || $(this).html()
                }).get().join();
                info['content'] = form.find("[name='content']").map(function(i, dom) {
                    return $(this).val() || $(this).html()
                }).get().join();
                console.log(info['id_modify'] + ":::" + info['title'])

                pres.write("<li>" + info['id_modify'] + ":::" + info['title'] + "</li>");

            });
            */
            //先清空原始数据，再500条一插入一批数据
            var request = new sql.sqlserver.connect(sql.config).then(pool => {
                return pool.request().query("IF EXISTS (      SELECT  TABLE_NAME FROM INFORMATION_SCHEMA.TABLES      WHERE   TABLE_NAME = '[" + tableName + "]')  DROP TABLE  [" + tableName + "]")
            }).then(result => {
                console.log("248")
                    //装入table 中的行数，500行执行一次插入
                var countLoad = 0;
                var infos = [];
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
                // 循环解析resHTML中的域值
                async.mapLimit(resHTMls, saveCount, function(resHTMl, callback) {
                    countLoad++;
                    var $ = cheerio.load(resHTMl);
                    var form = $("#dataform");
                    var info = {};
                    filds.map(function(fild) {
                        var fildObj = form.find("[name^='" + fild + "']");
                        fildObj.map(function(i, dom) {
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
                    filds.map(function(fild) {
                        if (info[fild] instanceof Array) {
                            info[fild] = info[fild].join();
                        }
                        if (info[fild] == undefined) {
                            info[fild] = "";
                        }
                    });
                    infos[infos.length] = info;
                    if (resHTMls.length == countLoad || countLoad == 500) {

                        // 每500条数据执行一次插入操作
                        sql.sqlserver.close()
                        var table = new sql.sqlserver.Table(tableName);
                        table.create = true;

                        table.columns.add("idkey", sql.sqlserver.NVarChar(50), {
                            nullable: false,
                            primary: true
                        });
                        filds.map(function(fild) {
                            table.columns.add(fild, sql.sqlserver.VarChar, {
                                nullable: true
                            });
                        });
                        // table.columns.add('codeid', sql.sqlserver.NVarChar(50), { nullable: true });
                        // table.columns.add('name', sql.sqlserver.NVarChar(50), { nullable: true });
                        // table.columns.add('pwd', sql.sqlserver.VarChar(200), { nullable: true });
                        // table.rows.add('1001', '张1', 'jjasdfienf1');
                        // table.rows.add('1002', '张2', 'jjasdfienf2');
                        table.rows.add("122592",
                            "张力洋",
                            "0",
                            "张小军 程佳兴",
                            "张小军 程佳兴",
                            "军营,青春,橄榄绿",
                            "2017-12-04 21:57:34",
                            '<p>　　军营再响驼铃曲，战友惜别泪两行。11月30日，武警甘肃省森林总队张掖市支队23名战士脱下戎装退出现役，踏上人生新征程。</p><p>　　11月退伍季，该支队23名战士将戴上“退伍光荣”的大红花踏上返乡的列车，回忆入伍时曾戴大红花离家远行的场景还历历在目，此时此刻再戴上承载着青春的大红花将要踏上归途，心里的滋味却与入伍时截然不同，从军路上的酸甜苦辣，寒冬中站岗执勤、酷暑中摸爬滚打……一幕幕、一件件，点点滴滴恍如昨日。铁打的营盘流水的兵，他们5年、8年，12年不等的军旅生涯即将在这一刻尘封，把青春最宝贵的岁月留在了军营，带走的是最美丽的橄榄绿印记。</p><p style="text - align: right;">责编：张力洋<br/></p>',
                            "",
                            "0",
                            "122592",
                            "18",
                            ",,,,,,,,,,,,,,,,,,,,,22222,,,,,,,,",
                            "2",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "中国军视网",
                            "0000-00-00",
                            "http://files.js7tv.cn/www/images/2017-12/04/115_59261512395845.jpg",
                            "",
                            "0",
                            "1",
                            '\n\t\t\t\t\t\t<option value="">&#x6682;&#x65E0;</option>\n\t\t\t\t\t',
                            ",,,,,,,,,,,,,,,,,,,,,99,,,,,,,,,99",
                            "-1",
                            "　　军营再响驼铃曲，战友惜别泪两行。11月30日，武警甘肃省森林总队张掖市支队23名战士脱下戎装退出现役，踏上人生新征程。",
                            "",
                            "2017-12-04 21:57:34",
                            "青春留在军营 带走最美的橄榄绿印",
                            "青春留在军营 带走最美橄榄绿印",
                            "0",
                            "")
                        infos.map(function(info) {
                            var infoarr = (filds.map(function(fild) {
                                // console.log([info["show_site[13]"], info["show_site[14]"], info["show_site[16]"], info["show_site[11]"]])
                                return info[fild];
                            }));
                            infoarr.unshift(info["id_modify"]);

                            table.rows.add.apply(table.rows, infoarr);
                        });
                        sql.bulkInsert(table, function(error, rowcount) {
                            sql.sqlserver.close();
                            if (error) {
                                console.log(error.name, error.message)
                            } else {
                                console.log("插入数据：" + rowcount + "条");

                                pres.write("插入数据：" + rowcount + "条");
                                // sql.query("SELECT Name FROM dong_UserInfoTest ", function(error, recordsets, affected) {
                                //     // error:错误消息 recordsets:查询的结果 affected
                                //     if (error) {
                                //         console.log(error);
                                //     } else {
                                //         debugger;
                                //         console.log(JSON.stringify(recordsets.recordset))
                                //     }
                                // });
                            }
                        });
                        countLoad = 0;
                        infos = undefined;
                        infos = [];
                    }


                }, function(err, resHTMls) {

                    pres.write("</ol>");
                    pres.write("<script>console.log('爬虫结束')</script>");
                    pres.end();
                    // });
                });
            });
            // });
        });
        // });
    });
}