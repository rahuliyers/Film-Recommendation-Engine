var child_process = require("child_process");
var fs = require('fs');
var sendmail = require("./sendmail");
var http = require("http");
var url = require("url");
var maintenancePageFileName = './static/maintenance.html';
var isInMaintenanceMode = false;
var server;
var hostname = "";
var targetHostname = "filerecommendations"; //TODO replace in production for different sites.
var isInProduction = false;
var emailAddressForStatusUpdates = "myemailaddress@icloud.com"; //TODO replace in production for diff site

child_process.exec("hostname -f", function(err, stdout, stderr) {
	hostname = stdout.trim();
	console.log("Hostname is:" + hostname);
	var tokens = hostname.split('.');
	if(tokens.length > 2){
		var sl = tokens[tokens.length-2];
		if(sl === targetHostname){
			isInProduction = true;
			console.log("We're in production");
		}
	}
});

function pullUpdate(){
	child_process.exec("/home/nodeuser/update", function(err, stdout, stderr) {
		console.log("While updating files:");
		console.log("out: " + stdout);
		console.log("err: " + stderr);
		quit();
	});
}

function switchToMaintenanceMode(){
	isInMaintenanceMode = true;
	sendStartingMaintenanceMessage();
}

function startServer(route,handle){
	sendStartingUpMessage();
	function onRequest(request, response){
		if(isInMaintenanceMode){
			//TODO Respond to http monitor with "its in maintenance mode request"
			//TODO Need to do the same for production mode too.

			var pathname = url.parse(request.url).pathname;
			if(pathname === '/'){
				fs.readFile(maintenancePageFileName, 'utf8', function(err, data) {
					if (err){ 
						emergencyMaintenanceMessage(request,response);
					}else{
						response.writeHead(200,{"Content-Type": "text/html"});
						response.write(data);
						response.end();
					}
				});
			}else{
				response.writeHead(503, {"Content-Type": "text/plain"});
				response.write("The site is being updated. Will be back soon!");
				response.end();
			}
		}else{
			var pathname = url.parse(request.url).pathname;
			if(pathname === '/extraCrunchyMichaelMunchySuperChowderFlappyWetTowel'){
				console.log("Switching to maintenance");
				switchToMaintenanceMode();
				response.writeHead(404, {"Content-Type": "text/plain"});
				response.write("The page you are looking for does not exist");
				response.end();
				pullUpdate();
				//TODO Output should be just like ordinary 404's
			}else{
				route(handle, pathname, response, request);
			}
		}
	}

	server = http.createServer(onRequest).listen(8888);
}

function emergencyMaintenanceMessage(request,response){
	response.writeHead(200, {"Content-Type": "text/plain"});
	response.write("The site is being updated. Will be back soon!");
	response.end();
}

function mail(to,subject,message){
	if(isInProduction){
		sendmail.sendmail(to,subject,message);
	}else{
		console.log("Pretending to send mail to: " + to + " Regarding: " + subject + " message: " + message);
	}
}

function quit(){
	var now = getDateTime();
	mail(emailAddressForStatusUpdates,"Shutting down","I shut down on purpose at: "+now);
	process.exit();
}

function sendStartingUpMessage(){
	var now = getDateTime();
	mail(emailAddressForStatusUpdates,"Starting up","Starting up at: "+now);
}

function sendStartingMaintenanceMessage(){
	var now = getDateTime();
	mail(emailAddressForStatusUpdates,"Switching to mainenance mode.","Switching to mainenance mode at: "+now);
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

exports.startServer = startServer;