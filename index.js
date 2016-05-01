var express = require('express');
var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;

var dir = './tmp';
var processes = {};

var app = express();
var expressWs = require('express-ws')(app);

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/index.htm'));
});

app.ws('/code', function (connection, req) {
    var uid = Math.random() + '' + Math.random() + '' + Math.random();
    console.log(`Client Connected. (${uid})`);

    connection.send(JSON.stringify({
        type: 'uid',
        uid: uid
    }));

    connection.on('message', function (msg) {
        console.log('Code Recieved.');

        if (processes[uid] && processes[uid].kill) {
            processes[uid].kill();
        }

        connection.send(JSON.stringify({
            type: 'code-recieved'
        }));

        var data = JSON.parse(msg);

        fs.writeFile(`./tmp/${uid}.c`, data.code, function(err) {
            if (err) {
                connection.send(JSON.stringify({
                    type: 'file-error'
                }));

                return console.log(err);
            }

            console.log('File written.');

            connection.send(JSON.stringify({
                type: 'file-written'
            }));

            console.log('Compiling...');

            var compiler = spawn('gcc', [
                `./tmp/${uid}.c`, '-o', `./tmp/${uid}`
            ]);

            connection.send(JSON.stringify({
                type: 'compiler-started'
            }));

            compiler.stdout.on('data', (data) => {
                console.info(`compiler: ${data}`);

                connection.send(JSON.stringify({
                    type: 'compiler-output',
                    message: data
                }));
            });

            compiler.stderr.on('data', (data) => {
                console.error(`compiler: ${data}`);

                connection.send(JSON.stringify({
                    type: 'compiler-error',
                    message: data.toString('utf8')
                }));
            });

            compiler.on('close', (code) => {
                console.log(`compiler exited with code ${code}`);

                if (code == 0) {
                    console.log('compiler: Compilation Success.');

                    connection.send(JSON.stringify({
                        type: 'compiler-success'
                    }));
                } else {
                    console.error('compiler: Compilation Error.');

                    connection.send(JSON.stringify({
                        type: 'compiler-error'
                    }));
                }
            });
        });
    });
});

app.ws('/program', function (connection, req) {
    connection.on('message', function (msg) {
        var data = JSON.parse(msg);
        var uid = data.uid;

        if (data.type == 'run') {
            if (processes[uid] && processes[uid].kill) {
                processes[uid].kill();
            }

            var process = spawn('./tmp/'+uid);
            processes[uid] = process;

            connection.send(JSON.stringify({
                type: 'started'
            }));

            process.stdout.on('data', (data) => {
                console.info(`process: ${data}`);

                connection.send(JSON.stringify({
                    type: 'output',
                    message: data.toString('utf8')
                }));
            });

            process.stderr.on('data', (data) => {
                console.error(`process: ${data}`);

                connection.send(JSON.stringify({
                    type: 'error',
                    message: data.toString('utf8')
                }));
            });

            process.on('close', function (code) {
                console.log('Process exited with code:', code);

                if (code == 0) {
                    console.log('Graceful Shutdown.');

                    connection.send(JSON.stringify({
                        type: 'shutdown',
                        code: code
                    }));

                } else {
                    console.error('Shutdown with Error.');

                    connection.send(JSON.stringify({
                        type: 'shutdown-error',
                        code: code
                    }));
                }
            });

        } else if (data.type == 'stop') {

            var process = processes[uid];

            if (processes[uid] && processes[uid].kill) {
                processes[uid].kill();
            }

        } else if (data.type == 'stdin') {
            console.log('Standard Input Recieved...');

            var process = processes[uid];

            if (processes[uid] && processes[uid].stdin) {
                console.log('Writing Standard Input...');

                process.stdin.write(data.message);
                // process.stdin.write('\n');
            }
        }
    });
});

app.listen(8090, function () {
    console.log("cMonkey Server Started. http://localhost:8090/");

    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
});
