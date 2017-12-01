var cheerio = require('cheerio');

$ = cheerio.load('<form ><input type="hidden" name="id_modify" value="122167"><input type="text" name="tags" id="tags" value="1212" /></form>');
debugger;
var arr = $.serializeArray;