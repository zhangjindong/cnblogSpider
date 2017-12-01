exports.start = function start() {
    var eventproxy = require('eventproxy');
    var superagent = require('superagent');
    var cheerio = require('cheerio');
    var url = require('url');
    var async = require('async');

    var cnodeUrl = 'https://cnodejs.org/';

    
    superagent.get(cnodeUrl)
        .end(function(err, res) {
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