exports.start = function start() {

    var sql = require("./sql");
    sql.query("SELECT * FROM js7tvinformation ", function(error, recordsets, affected) {
        // error:错误消息 recordsets:查询的结果 affected
        if (error) {
            console.log(error);
        } else {
            console.log(JSON.stringify(recordsets.recordset))
        }
    });
    /*
    var request = new sql.sqlserver.connect(sql.config).then(pool => {
        return pool.request().query('drop table dong_UserInfoTest')
    }).then(result => {
        console.log(result.rowsAffected);
        sql.sqlserver.close()
        var table = new sql.sqlserver.Table('dong_UserInfoTest');
        table.create = true;
        table.columns.add('codeid', sql.sqlserver.NVarChar(50), { nullable: true });
        table.columns.add('name', sql.sqlserver.NVarChar(50), { nullable: true });
        table.columns.add('pwd', sql.sqlserver.VarChar(200), { nullable: true });
        table.rows.add('1001', '张1', 'jjasdfienf1');
        table.rows.add('1002', '张2', 'jjasdfienf2');
        // table.rows.add('1001', '张3', 'jjasdfienf3');
        table.rows.add('1003', '张4', 'jjasdfienf4');
        sql.bulkInsert(table, function(error, rowcount) {
            debugger;
            sql.sqlserver.close();
            if (error) {
                console.log(error.name, error.message)
            } else {
                console.log(rowcount);

                sql.query("SELECT Name FROM dong_UserInfoTest ", function(error, recordsets, affected) {
                    // error:错误消息 recordsets:查询的结果 affected
                    if (error) {
                        console.log(error);
                    } else {
                        debugger;
                        console.log(JSON.stringify(recordsets.recordset))
                    }
                });
            }
        })

    })*/
}