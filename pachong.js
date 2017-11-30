var eventproxy = require('eventproxy');
var superagent = require('superagent');
var cheerio = require('cheerio');
var url = require('url');
var async = require('async');

var express = require('express');
// var multer = require('multer');
var app = express();

var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
// app.use(multer()); // for parsing multipart/form-data

app.use(cookieParser());
var catchFirstUrl = 'http://manage.js7tv.cn/'; //入口页面
app.use(express.static('public'));

app.get('/code.png', function(req, pres) {
    var mr = Math.random();
    superagent.get(catchFirstUrl + "_common/verifyCode.php?" + mr)
        .accept('png')
        .end(function(err, res) {
            pres.send(res.body);
        });
});
//模拟登陆
app.post('/', function(req, pres) {
    superagent.post(catchFirstUrl + "admin/index.php?m=index")
        .send(req.body)
        .end(function(err, res) {
            var cookie = res.headers['set-cookie']
            pareq(req, pres, cookie)
        });
});
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
var pareq = function(req, res, cookie) {
    var cnodeUrl = catchFirstUrl + "admin/index.php?m=index";

    superagent.get(cnodeUrl)
        .set("Cookie", cookie[0])
        .end(function(err, res) {
            debugger;
            if (err) {
                return console.error(err);
            }
            var topicUrls = [];
            var $ = cheerio.load(res.text);
            $('#topic_list .topic_title').each(function(idx, element) {
                var $element = $(element);
                var href = url.resolve(cnodeUrl, $element.attr('href'));
                topicUrls.push(href);
            });

            var ep = new eventproxy();


            // 正在并发的数量
            console.log(topicUrls.length);
            var concurrencyCount = 0;
            async.mapLimit(topicUrls, 5, function(topicUrl, callback) {
                concurrencyCount++;
                var delay = parseInt((Math.random() * 10000000) % 2000, 10);
                console.log('现在的并发数是', concurrencyCount, '，正在抓取的是', topicUrl, '，耗时' + delay + '毫秒');
                superagent.get(topicUrl)
                    .end(function(err, res) {
                        concurrencyCount--;
                        console.log('fetch ' + topicUrl + ' successful');
                        // ep.emit('topic_html', [topicUrl, res.text]);
                        callback(null, [topicUrl, res.text])
                    });

            }, function(err, topics) {
                // ep.after('topic_html', results.length, function(topics) {
                topics = topics.map(function(topicPair) {
                    var topicUrl = topicPair[0];
                    var topicHtml = topicPair[1];
                    var $ = cheerio.load(topicHtml);
                    return ({
                        title: $('.topic_full_title').text().trim(),
                        href: topicUrl,
                        comment1: $('.reply_content').eq(0).text().trim(),
                    });
                });

                console.log('final:');
                console.log(topics);
                // });
            });
            // topicUrls.forEach(function(topicUrl) {
            //     superagent.get(topicUrl)
            //         .end(function(err, res) {
            //             console.log('fetch ' + topicUrl + ' successful');
            //             ep.emit('topic_html', [topicUrl, res.text]);
            //         });
            // });
        });
}