var editor = ace.edit("editor");
editor.setTheme("ace/theme/twilight");
editor.getSession().setMode("ace/mode/c_cpp");
editor.getSession().setTabSize(4);

editor.commands.addCommand({
    name: "run",
    bindKey: {win: "Ctrl-Enter", mac: "Command-Enter"},
    exec: function () {
        execute()
    }
});

$('#status').html('Connecting...');
var code_soc = new WebSocket('ws://localhost:8090/code');
var program_soc = new WebSocket('ws://localhost:8090/program');

code_soc.onopen = function () {
    $('#status').html('code server connected.');
}

program_soc.onopen = function () {
    $('#status').html('program server connected.');
}

var uid = 0;

code_soc.onmessage = function (data) {
    var data = JSON.parse(data.data);

    if (data.type === 'uid') {

        uid = data.uid;

    } else if (data.type === 'code-recieved') {

        $('#status').html('code sent.');

    } else if (data.type === 'file-error') {

        $('#status').html('error saving file.');

    } else if (data.type === 'file-written') {

        $('#status').html('file written.');

    } else if (data.type === 'compiler-started') {

        $('#status').html('compiling...');

    } else if (data.type === 'compiler-success') {

        $('#status').html('successful compile.');
        run();

    } else if (data.type === 'compiler-error') {

        $('#status').html('compile error.');
        $('#console').append(data.message);

    } else if (data.type === 'compiler-output') {

        $('#status').html('Compiling...');
        console.log(data.message);

    }
}

program_soc.onmessage = function (data) {
    var data = JSON.parse(data.data);

    if (data.type === 'output' || data.type === 'error') {
        $('#console').append(data.message);
    } else if (data.type === 'started') {
        $('#status').append('Program running... \n');
        sendStdIn();
    } else {
        $('#status').html(`Event Occured: ${data.type}`);
    }
}

var sendStdIn = function () {
    $('#status').html('Sending Standard Input...');

    program_soc.send(JSON.stringify({
        type: 'stdin',
        uid: uid,
        message: $('#stdin').val()
    }));
};

var run = function () {
    program_soc.send(JSON.stringify({
        type: 'run',
        uid: uid
    }));
};

var execute = function () {
    $('#console').html('');
    code_soc.send(JSON.stringify({
        code: editor.getValue()
    }));
};

$('#run').click(execute);
