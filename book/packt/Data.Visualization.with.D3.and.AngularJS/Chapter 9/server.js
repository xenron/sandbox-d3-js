/* server.js */
var fs = require('fs');
var app = require('express')();
var http = require('http').Server(app);
var serveStatic = require('serve-static');
var io = require('socket.io')(http);

// Serve all files from the root directory
app.use(serveStatic('.', {'index': ['index.html']}));

// Wait for socket connection
io.on('connection', function(socket){

    var watchers = [];

    // Send the content of a file to the client
    var sendFile = function(name, path) {
        // Read the file
        fs.readFile(path, 'utf8', function (err, data) {
            // Emit the content of the file
            io.emit(name, data);
        });
    };

    // Wait for events on socket
    socket.on('watch', function(obj){
        
        if (!watchers.hasOwnProperty(obj.name)){
        
            console.log("Watching " + obj.name);

            watchers[obj.name] = obj;
            
            sendFile(obj.name, obj.path);

            // Watch the file for changes
            fs.watchFile(obj.path, function (curr, prev) {
                
                sendFile(obj.name, obj.path);
            });
        }
    });

    socket.on('disconnect', function(){
        watchers.forEach(function(obj) {
            fs.unwatchFile(obj.path);
        });
    });
});

http.listen(3000, function(){
    console.log('listening on 0.0.0.0:3000');
});