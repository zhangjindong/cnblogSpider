var http = require("http"),
    url = require("url"),
    fs = require("fs"),
    superagent = require("superagent"),
    cheerio = require("cheerio"),
    async = require("async"),
    path = require("path"),
    qs = require('querystring');
eventproxy = require('eventproxy');
var imageServer = function(http, url) {
    var _url = url;
    var _http = http;

    this.http = function(url, callback, method) {
        method = method || 'GET';
        callback = callback || function() {};
        var urlData = _url.parse(url);
        var options = {
            port: 80,
            path: urlData.pathname,
            method: 'GET',
            host: urlData.host
        };
        var req = _http.request(options, function(res) {
            var type = res.headers["content-type"],
                body = "";

            res.setEncoding('binary');
            res.on('end', function() {
                var data = {
                    type: type,
                    body: body
                };
                callback(data);
            });
            res.on('data', function(chunk) {
                if (res.statusCode == 200) body += chunk;
            });
        });

        req.end();


    };
};

var ep = new eventproxy();
var cookieObj;
var catchFirstUrl = 'http://manage.js7tv.cn/', //入口页面
    deleteRepeat = {}, //去重哈希数组
    urlsArray = [], //存放爬取网址
    catchDate = [], //存放爬取数据
    pageUrls = [], //存放收集文章页面网站
    pageNum = 1, //要爬取文章的页数
    startDate = new Date(), //开始时间
    endDate = false; //结束时间

var cookieObj;
for (var i = 1; i <= pageNum; i++) {
    pageUrls.push('http://manage.js7tv.cn/admin/data_information.php?op=list&pageno=' + i);
}

// 抓取昵称、入园年龄、粉丝数、关注数
function personInfo(url) {
    var infoArray = {};
    superagent.get(url)
        .end(function(err, ares) {
            if (err) {
                console.log(err);
                return;
            }

            var $ = cheerio.load(ares.text),
                info = $('#profile_block a'),
                len = info.length,
                age = "",
                flag = false,
                curDate = new Date();

            // 小概率异常抛错	
            try {
                age = "20" + (info.eq(1).attr('title').split('20')[1]);
            } catch (err) {
                console.log(err);
                age = "2012-11-06";
            }

            infoArray.name = info.eq(0).text();
            infoArray.age = parseInt((new Date() - new Date(age)) / 1000 / 60 / 60 / 24);

            if (len == 4) {
                infoArray.fans = info.eq(2).text();
                infoArray.focus = info.eq(3).text();
            } else if (len == 5) { // 博客园推荐博客
                infoArray.fans = info.eq(3).text();
                infoArray.focus = info.eq(4).text();
            }
            //console.log('用户信息:'+JSON.stringify(infoArray));
            catchDate.push(infoArray);
        });
}

// 判断作者是否重复
function isRepeat(authorName) {
    if (deleteRepeat[authorName] == undefined) {
        deleteRepeat[authorName] = 1;
        return 0;
    } else if (deleteRepeat[authorName] == 1) {
        return 1;
    }
}

function fnGetCookie(loginObj, req, res) {
    var urlpath = "http://manage.js7tv.cn/admin/index.php?m=index";
    var urlData = url.parse(urlpath);
    //头信息
    var options = {
        hostname: urlData.host,
        port: 80,
        path: urlData.path,
        method: 'POST',
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'zh-CN,zh;q=0.8',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json;charset=utf-8',
            // 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            'Cookie': 'imooc_uuid=15f58ae7-2d00-4fc1-9801-1a78dde18bc2; imooc_isnew_ct=1482830692; loginstate=1; apsid=IxYWQwNTcwY2RiNDY2YWM3Z7999,1483688200,1483949602,1484013932; Hm_lpvt_f0cfcccd7b1393990c78efdeebff3968=1484034431; cvde=587441144e831-67; IMCDNS=1',
            'Host': 'manage.js7tv.cn',
            'Origin': 'http://manage.js7tv.cn',
            'Referer': 'http://manage.js7tv.cn/admin/index.php?m=index',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };

    //调用该方法，回调由于Node是以事件流的形式往下走的，
    var req = http.request(options, function(res) {
        console.log('Status: ' + res.statusCode);
        console.log('headers: ' + JSON.stringify(res.headers));
        var cookieObj = res.headers['set-cookie'];
        var data = "";
        var chunks = [];
        var size = 0;
        //监听data事件，有data了触发这个
        res.on('data', function(chunk) {
            chunks.push(chunk);
            size += chunk.length;
        });

        //监听end事件，每次触发完都有个结束的标志
        res.on('end', function() {
            var data = null;
            switch (chunks.length) {
                case 0:
                    data = new Buffer(0);
                    break;
                case 1:
                    data = chunks[0];
                    break;
                default:
                    data = Buffer.concat(chunks, size).toString();
                    // data = new Buffer(size);
                    // for (var i = 0, pos = 0, l = chunks.length; i < l; i++) {
                    // 	var chunk = chunks[i];
                    // 	chunk.copy(data, pos);
                    // 	pos += chunk.length;
                    // }
                    break;

            }
            data = data.toString('utf-8');
            if (data.result == 1) {
                console.log("登录成功")
                    // location.href = data.url;
            } else {
                console.log(data.err_msg)
                    // // alert(data.err_code + data.err_msg)
                    // $('#info_submit').html(data.err_msg).show();
                    // verify_code_change();
                    // $('.login2-cj input').attr('disabled', false);
                    // $('#f_code').focus();
            }
            // 当所有 'BlogArticleHtml' 事件完成后的回调触发下面事件
            // ep.after('BlogArticleHtml', pageUrls.length * 20, function (articleUrls) {

            // 	// 获取 BlogPageUrl 页面内所有文章链接
            // 	for (var i = 0; i < articleUrls.length; i++) {
            // 		res.write(articleUrls[i] + '');
            // 	}
            // 	console.log('articleUrls.length is' + articleUrls.length + ',content is :' + articleUrls);

            // 	//控制并发数
            // 	var curCount = 0;
            // 	var reptileMove = function (url, callback) {
            // 		//延迟毫秒数
            // 		var delay = parseInt((Math.random() * 30000000) % 1000, 10);
            // 		curCount++;
            // 		console.log('现在的并发数是', curCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');

            // 		superagent.get(url)
            // 			.end(function (err, sres) {
            // 				// 常规的错误处理
            // 				if (err) {
            // 					console.log(err);
            // 					return;
            // 				}

            // 				//sres.text 里面存储着请求返回的 html 内容
            // 				var $ = cheerio.load(sres.text);
            // 				//收集数据
            // 				//1、收集用户个人信息，昵称、园龄、粉丝、关注
            // 				//var currentBlogApp = $('script').eq(1).text().split(',')[0].split('=')[1].trim().replace(/'/g,""),
            // 				var currentBlogApp = url.split('/p/')[0].split('/')[3],
            // 					reqId = url.split('/p/')[1].split('.')[0];

            // 				res.write('currentBlogApp is ' + currentBlogApp + ' , ' + 'reqId id is ' + reqId + '');
            // 				console.log('currentBlogApp is ' + currentBlogApp + '\n' + 'reqId id is ' + reqId);

            // 				res.write('the article title is :' + $('title').text() + '');

            // 				var flag = isRepeat(currentBlogApp);

            // 				if (!flag) {
            // 					var appUrl = "http://www.cnblogs.com/mvc/blog/news.aspx?blogApp=" + currentBlogApp;
            // 					personInfo(appUrl);
            // 				}
            // 			});

            // 		setTimeout(function () {
            // 			curCount--;
            // 			callback(null, url + 'Call back content');
            // 		}, delay);
            // 	};

            // 	// 使用async控制异步抓取 	
            // 	// mapLimit(arr, limit, iterator, [callback])
            // 	// 异步回调
            // 	async.mapLimit(articleUrls, 5, function (url, callback) {
            // 		reptileMove(url, callback);
            // 	}, function (err, result) {
            // 		endDate = new Date();

            // 		console.log('final:');
            // 		console.log(result);
            // 		console.log(catchDate);
            // 		var len = catchDate.length,
            // 			aveAge = 0,
            // 			aveFans = 0,
            // 			aveFocus = 0;

            // 		for (var i = 0; i < len; i++) {
            // 			var eachDate = JSON.stringify(catchDate[i]),
            // 				eachDateJson = catchDate[i];

            // 			// 小几率取不到值则赋默认值	
            // 			eachDateJsonFans = eachDateJson.fans || 110;
            // 			eachDateJsonFocus = eachDateJson.focus || 11;

            // 			aveAge += parseInt(eachDateJson.age);
            // 			aveFans += parseInt(eachDateJsonFans);
            // 			aveFocus += parseInt(eachDateJsonFocus);
            // 			res.write(eachDate + '');
            // 		}

            // 		//统计结果
            // 		res.write('');
            // 		res.write('');
            // 		res.write('/**');
            // 		res.write(' * 爬虫统计结果');
            // 		res.write('**/');
            // 		res.write('1、爬虫开始时间：' + startDate + '');
            // 		res.write('2、爬虫结束时间：' + endDate + '');
            // 		res.write('3、耗时：' + (endDate - startDate) + 'ms' + ' --> ' + (Math.round((endDate - startDate) / 1000 / 60 * 100) / 100) + 'min ');
            // 		res.write('4、爬虫遍历的文章数目：' + pageNum * 20 + '');
            // 		res.write('5、作者人数：' + len + '');
            // 		res.write('6、作者入园平均天数：' + Math.round(aveAge / len * 100) / 100 + '');
            // 		res.write('7、作者人均粉丝数：' + Math.round(aveFans / len * 100) / 100 + '');
            // 		res.write('8、作者人均关注数：' + Math.round(aveFocus / len * 100) / 100 + '');
            // 	});
            // });

            // 轮询 所有文章列表页
            pageUrls.forEach(function(pageUrl) {
                superagent.get(pageUrl)
                    .set("Cookie", cookieObj)
                    .end(function(err, pres) {
                        console.log('fetch ' + pageUrl + ' successful');
                        res.write(pres.text);
                        res.write('fetch ' + pageUrl + ' successful');
                        // 常规的错误处理
                        if (err) {
                            console.log(err);
                        }
                        // pres.text 里面存储着请求返回的 html 内容，将它传给 cheerio.load 之后
                        // 就可以得到一个实现了 jquery 接口的变量，我们习惯性地将它命名为 `$`
                        // 剩下就都是 jquery 的内容了

                        // var $ = cheerio.load(pres.text);
                        // var curPageUrls = $('.styleA tr td:eq(1)');
                        // for (var i = 0; i < curPageUrls.length; i++) {
                        // 	console.log(curPageUrls.eq(i).text())
                        // 	curPageUrls.eq(i).find("a:eq()")
                        // 	var articleUrl = curPageUrls.eq(i).attr('href');
                        // 	urlsArray.push(articleUrl);
                        // 	// 相当于一个计数器
                        // 	ep.emit('BlogArticleHtml', articleUrl);
                        // }
                    })
            })
        });
    });
    //响应失败-触发error事件
    req.on('error', function(e) {
        console.log('Error: ' + e.message);
    });

    //把请求的参数写入响应头
    req.write(JSON.stringify(loginObj));

    //手动执行
    //官方对这句的解释：在实施例req.end()被调用。随着http.request()人们必须始终调用req.end()，以表示你的要求做的-即使没有数据被写入请求主体。
    req.end();
}
// 主start程序
function start() {
    function onRequest(req, res) {
        if (req.url == "/favicon.ico") {

        } else if (req.url == "/login.html") {
            var pathname = url.parse(req.url).pathname;
            var realPath = __dirname + "\\login.html";

            fs.exists(realPath, function(exists) {
                if (!exists) {
                    res.writeHead(404, {
                        'Content-Type': 'text/plain'
                    });
                    res.write("This req URL " + pathname + " was not found on this server.");
                    res.end();
                } else {
                    fs.readFile(realPath, "binary", function(err, file) {
                        if (err) {
                            res.writeHead(500, {
                                'Content-Type': 'text/plain'
                            });
                            res.end(err);
                        } else {
                            res.writeHead(200, {
                                'Content-Type': 'text/html'
                            });
                            res.write(file, "binary");
                            res.end();
                        }
                    });
                }
            });
        } else if (req.url == "/code.png") {
            var params = url.parse(req.url, true);

            var IMGS = new imageServer(http, url);
            var mr = Math.random();
            IMGS.http(catchFirstUrl + "_common/verifyCode.php?" + mr, function(data) {
                res.writeHead(200, {
                    "Content-Type": data.type
                });
                res.end(data.body, "binary");
                // res.end(data)

            });
        } else {
            var data = '';
            req.on('data', function(chunk) {
                // 如果传输数据比较大，这里要做buffer拼接
                data = chunk;
            });
            req.on('end', function() {
                var loginObj = qs.parse(data.toString('utf-8'));
                // parse responseString
                // do whatever you like
                // 设置字符编码(去掉中文会乱码)
                res.writeHead(200, {
                    'Content-Type': 'text/html;charset=utf-8'
                });
                // res.
                // 登录账号密码验证码获取到之后模拟登录，获取cookie
                //  = {};
                fnGetCookie(loginObj, req, res)

            })
        }
    }

    http.createServer(onRequest).listen(3000);
}

exports.start = start;