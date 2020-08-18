var server = require("./server");
var router = require("./router");
var requestHandler = require("./requestHandler");


var handle = {};

function loadHandlers(){
	var pages = requestHandler.getPages();
	for (var page in pages){
// 		console.log("Adding page: " + page);
		handle[page] = requestHandler.page;
	}
	
	var scripts = requestHandler.getScripts();
	for (var script in scripts){
// 		console.log("Adding script: " + script);
		handle[script] = requestHandler.script;
	}
	
	var templates = requestHandler.getTemplates();
	for (var template in templates){
// 		console.log("Adding template: " + template);
		handle[template] = requestHandler.template;
	}
}
loadHandlers();

requestHandler.getReady(isReady);


function isReady(){
	server.startServer(router.route,handle);
	console.log("Film recommender is starting up.");
}

handle["/search"] = requestHandler.search;
handle["/displayInfo"] = requestHandler.displayInfo;
/*
handle["/getMathQuestions"] = requestHandler.getQuestionsForMathTest;
handle["/getPhysicsQuestions"] = requestHandler.getQuestionsForPhysTest;
handle["/getChemistryQuestions"] = requestHandler.getQuestionsForChemTest;
*/

