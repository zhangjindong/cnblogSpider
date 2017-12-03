exports.start = function start() {
    var async = require('async');
    var arr = [];
    var a = 0;
    for (let i = 0; i <= 100; i++) {
        arr[arr.length] = i;
    }
    async.mapLimit(arr, 10, function(obj, callback) {
        a++;
        setTimeout(() => {
            a--;
            console.log(obj + "-" + a)
            callback(null, obj)
        }, 1000);

    }, function(err, objs) {
        console.log("==========" + objs)
            // });
    });
}