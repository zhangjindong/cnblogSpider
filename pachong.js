var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var url = require('url');
var async = require('async');
const Occurs = 15;
const pageCount = 20;
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
    async.mapLimit(pageListUrls, Occurs, function (pListUrl, callback) {
        concurrencyCount++;
        pres.write("<script>console.log('内容列表：并发数是 " + concurrencyCount + " ," + pListUrl + "')</script>");
        console.log(pListUrl);
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

        console.log('==========================:');
        pres.write("<script>console.log('文章总数：" + infoListUrls.length + "')</script>");
        // 正在并发的数量
        var concurrencyInfoCount = 0;
        async.mapLimit(infoListUrls, Occurs, function (infoUrl, callback) {
            concurrencyInfoCount++;
            pres.write("<script>console.log('文章内容：现在的并发数是" + concurrencyInfoCount + " ," + infoUrl + "')</script>");
            console.log(infoUrl);
            superagent.get(infoUrl)
                .set("Cookie", codeCookie)
                .set("Cookie", cookie)
                .end(function (err, res) {
                    concurrencyInfoCount--;
                    // ep.emit('topic_html', [topicUrl, res.text]);
                    if (res && res.text) {
                        callback(null, res.text)
                    }
                });

        }, function (err, resHTMls) {
            // ep.after('topic_html', results.length, function(topics) {
            resHTMls.map(function (resHTMl) {
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
                info['pic_upload_id'] = form.find("[name='pic_upload_id']").map(function (i, dom) {
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
                info['describe'] = form.find("[name='describe']").map(function (i, dom) {
                    return $(this).val() || $(this).html()
                }).get().join();
                info['editorValue'] = form.find("[name='editorValue']").map(function (i, dom) {
                    return $(this).val() || $(this).html()
                }).get().join();
                info['content'] = form.find("[name='content']").map(function (i, dom) {
                    return $(this).val() || $(this).html()
                }).get().join();
                console.log(info['id_modify'] + ":::" + info['title'])

                pres.write("<li>" + info['id_modify'] + ":::" + info['title'] + "</li>");

            });

            pres.write("</ol>");
            pres.write("<script>console.log('爬虫结束')</script>");
            pres.end();
            // });
        });
        // });
    });
}