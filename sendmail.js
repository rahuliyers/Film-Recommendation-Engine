var child_process = require("child_process");

function sendmail(to,subject,message){
	var cmd = 'echo ' + " 'Subject:" + subject + "\nTo:" + to + "\n\n" + message + "\n" + "' | sendmail " + to; 
	child_process.exec(cmd, function(err, stdout, stderr) {
		console.log("While emailing status:");
		console.log("out: " + stdout);
		console.log("err: " + stderr);
	});
}

exports.sendmail = sendmail;
