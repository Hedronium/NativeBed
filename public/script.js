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

code_soc.onopen = function () {
    $('#status').html('ready.');
}

code_soc.onmessage = function (msg) {
    var data = JSON.parse(msg.data);
    $('#console').append(data.console);
};

var execute = function () {
    $('#console').html('');

    code_soc.send(JSON.stringify({
        code: editor.getValue(),
        stdin: $('#stdin').val()
    }));
};

$('#run').click(execute);
