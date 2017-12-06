exports.start = function start() {

    var sql = require("./sql");
    /* sql.query("SELECT * FROM js7tvinformation ", function(error, recordsets, affected) {
        // error:错误消息 recordsets:查询的结果 affected
        if (error) {
            console.log(error);
        } else {
            console.log(JSON.stringify(recordsets.recordset))
        }
    }); */

    const tableName = "UserInfoTest";
    var request = new sql.sqlserver.connect(sql.config).then(pool => {
        return pool.request().query("IF EXISTS (      SELECT  TABLE_NAME FROM INFORMATION_SCHEMA.TABLES      WHERE   TABLE_NAME = '[" + tableName + "]')  DROP TABLE  [" + tableName + "]")
    }).then(result => {
        console.log(result.rowsAffected);
        var infos = [

            { "author": "张力洋", "check_filter": "0", "id_modify": "001" },
            { "author": "张力洋", "check_filter": "0", "id_modify": "002" },
            { "author": "张力洋", "check_filter": "0", "id_modify": "003" }
        ];
        var filds = ["author",
            "check_filter",
            "id_modify"
        ];
        sql.sqlserver.close()
        var table = new sql.sqlserver.Table(tableName);
        table.create = true;
        table.columns.add("idkey", sql.sqlserver.NVarChar(50), {
            nullable: false,
            primary: true
        });
        table.columns.add("author", sql.sqlserver.NVarChar, {
            nullable: true,
            primary: false
        });
        table.columns.add("checkFilter", sql.sqlserver.NVarChar, {
            nullable: true,
            primary: false
        });
        table.columns.add("idModify", sql.sqlserver.NVarChar, {
            nullable: true,
            primary: false
        });
       /*  filds.map(function(fild) {
            table.columns.add(fild, sql.sqlserver.NVarChar, {
                nullable: true,
                primary: false
            });
        }); */
        infos.map(function(info) {
            var infoarr = (filds.map(function(fild) {
                // console.log([info["show_site[13]"], info["show_site[14]"], info["show_site[16]"], info["show_site[11]"]])
                return info[fild];
            }));
            infoarr.unshift(info["id_modify"]);

            // table.rows.add.apply(table.rows, infoarr);
            table.rows.add(infoarr[0], infoarr[1], infoarr[2], infoarr[3])
        });
        table=null
        var table = new sql.sqlserver.Table(tableName);
        table.create = true;
        table.columns.add('name', sql.sqlserver.NVarChar(50), { nullable: true });
        table.columns.add('pwd', sql.sqlserver.VarChar(200), { nullable: true });
        table.rows.add('张1', 'jjasdfienf');
        table.rows.add('张2', 'jjasdfienf');
        table.rows.add('张3', 'jjasdfienf');
        sql.bulkInsert(table, function(error, rowcount) {
            sql.sqlserver.close();
            if (error) {
                console.log(error.name, error.message)
            } else {
                console.log(rowcount);

                sql.query("SELECT Name FROM " + tableName + " ", function(error, recordsets, affected) {
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

    })
}