var express = require('express');
var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;

var dir = './tmp';

var app = express();
var expressWs = require('express-ws')(app);

var processes = {};

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.htm'));
});

app.ws('/code', function (connection, req) {
    var uid = Math.round(Math.random()*10000000)+'';

    console.log('Client Connected.');

    connection.on('close', function () {
        fs.unlink('./tmp/' + uid, function () {});
        fs.unlink('./tmp/' + uid + '.c', function () {});

        if (processes[uid] && processes[uid].kill) {
            processes[uid].kill();
        }
    });

    connection.on('message', function (msg) {
        console.log('Client Messaged.');

        if (processes[uid] && processes[uid].kill) {
            processes[uid].kill();
        }

        var data = JSON.parse(msg);

        fs.writeFile('./tmp/'+uid+'.c', data.code, function(err) {
            if(err) {
                return console.log(err);
            }

            var compiler = spawn('gcc', [
                './tmp/'+uid+'.c', '-o', './tmp/'+uid
            ]);

            compiler.stdout.on('data', function (data) {
                connection.send(JSON.stringify({
                    console: data.toString('utf8')
                }));
            });

            compiler.stderr.on('data', function (data) {
                connection.send(JSON.stringify({
                    console: data.toString('utf8')
                }));
            });

            compiler.on('close', function (code) {
                if (code == 0) {
                    connection.send(JSON.stringify({
                        console: '\nrunning program...\n\n'
                    }));

                    var program = processes[uid] = spawn('./tmp/'+uid);
                    var closed = false;
                    var ended = false;

                    console.log(program.connected);

                    if (program.stdin && !closed && !ended) {
                        try {
                            program.stdin.write(data.stdin);
                        } catch (e) {
                            console.log(e);
                        }
                    }

                    program.stdin.on('error', function () {
                        ended = true;
                    });

                    program.stdout.on('data', function (data) {
                        connection.send(JSON.stringify({
                            console: data.toString('utf8')
                        }));
                    });

                    program.stderr.on('data', function (data) {
                        connection.send(JSON.stringify({
                            console: data.toString('utf8')
                        }));
                    });

                    program.on('close', function (code) {
                        closed = true;

                        connection.send(JSON.stringify({
                            console: '\n\nProgram Shutdown: Code - ' + code
                        }));
                    });
                }
            });
        });
    });
});

app.listen(8090, function () {
    console.log("cMonkey Server Started. http://localhost:8090/");

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
});
