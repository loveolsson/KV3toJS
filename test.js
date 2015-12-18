var fs = require('fs');
var kv3 = require('./index.js');



var path = (process.argv[2]) ? process.argv[2] : 'examples/example.kv3';

var file = fs.readFileSync(path, "utf8");
console.log(JSON.stringify(kv3.parse(file), null, "\t"));
