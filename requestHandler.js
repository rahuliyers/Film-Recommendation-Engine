var fs = require('fs');
var url = require("url");
var wpapi = require("./wpapi");
var sendmail = require("./sendmail");
var pages = {'/':'./static/index.html','/robots.txt':'./static/robots.txt'};
var scripts = {'/ajax.js':'./scripts/ajax.js','/main.js':'./scripts/main.js'};
var templates = {};
var images = {};

var mimeTypes = {'html':'text/html','js':'application/javascript','handleBarTemplate':"text/x-handlebars-template"};
var ppl;
var flm;

function getImages(){
	return templates;
}

function getTemplates(){
	return templates;
}

function getPages(){
	return pages;
}

function getScripts(){
	return scripts;
}

function loadData(callback){
/*
	if (fs.existsSync('./data/ppl.json') && fs.existsSync('./data/flm.json')) {
		console.log("Data files exist");
*/
		ppl = require("./data/ppl.json");
		flm = require("./data/flm.json");
		callback();
/*
	}else{
		console.log("Data files missing.Creating...");
		createSmallerPersonFile(callback);
	}
*/
// 		createSmallerPersonFile(callback);
}

function displayInfo(response,request){
	var url_parts = url.parse(request.url, true);
	var query = url_parts.query;
	var rp = {};
	rp['m'] = false;
	if(query.a){
		var lc = query.a.toString().toLowerCase();
		if(lc in ppl.personNamesToResource){
			var i = ppl.personNamesToResource[lc];
			var pd = ppl.people[i];
			rp['m'] = true;
			rp['t'] = 'p'; // so the responder needs to categorize by role, and show all film posters.
			rp['p'] = pd;
			var tmpFilmSet = {};
			var filmArrayToGetPosters = [];
			var filmData = {};
			for (var prop in pd){
				if(prop === 'd'||prop ==='s'||prop ==='p'||prop ==='m'||prop ==='c'||prop ==='e'||prop ==='t'||prop ==='w'){
					var ob = objectToArray(pd[prop]);
// 					console.log(prop + ":::" + pd[prop]);

					for(var i=0;i<ob.length;i++){
						tmpFilmSet[ob[i]] = " ";
					}
				}
			}
			
			for(var prop in tmpFilmSet){
				filmArrayToGetPosters.push(prop);
			}
			
			wpapi.getFilmPosterLinks(filmArrayToGetPosters,function(data){
				rp['u'] = data;
				response.writeHead(200, {"Content-Type": "application/json"});
				response.write(JSON.stringify(rp));
				response.end();
			});
		}else if(lc in flm.filmsNamesToResource){
			var i = flm.filmsNamesToResource[lc];
			var fd = flm.films[i];
/*
			console.log("fd:"+JSON.stringify(fd,null,4));
			console.log("fdd:"+fd['d'].length);
			console.log("fds:"+fd['s'].length);
*/


			rp['m'] = true;
			rp['t'] = 'f'; // so the responder needs to display film + cast & crew.
			var outFilm = {};
			for(var pr in fd){
				if(pr==='r' || pr==='n'){
					outFilm[pr] = fd[pr];
				}else if(pr==='s' || pr==='d'|| pr==='p' || pr==='m' || pr==='c' || pr==='e' || pr==='t' ||pr==='w'){
/*
					console.log("pr:"+pr);
					console.log("fdprleng: "+fd[pr].length);
					console.log("fdpr: "+fd[pr]);
					console.log("outFilm:"+outFilm);
*/
// 					var oldArray = objectToArray(fd[pr]);
// 					console.log(oldArray);
					var newArray = [];
					for(var j=0;j<fd[pr].length;j++){
						var person = ppl.people[fd[pr][j]];
						var subset = {};
						subset['r'] = person['r'];
						subset['n'] = person['n'];
// 						console.log("subset:"+JSON.stringify(subset,null,4));
						newArray.push(subset);
					}
					outFilm[pr] = newArray;
				}
			}
// 			console.log("outFilm:"+ JSON.stringify(outFilm,null,4));
			rp['f'] = outFilm;
			filmArrayToGetPosters = [fd['r']];
			wpapi.getFilmPosterLinks(filmArrayToGetPosters,function(data){
				rp['u'] = data;
				response.writeHead(200, {"Content-Type": "application/json"});
				response.write(JSON.stringify(rp));
				response.end();
			});
		}else{
			console.log("not matched:" + JSON.stringify(query,null,4));
			//TODO send some kind of error response in the object.
		}
		//Check for people that match (there must be exact match)
			//If person matches, then response type is that of a person
		//Check for movies that match (exact match)
			//If movie matches then response type is that of a movie
	}else{
		response.writeHead(200, {"Content-Type": "application/json"});
		response.write(JSON.stringify(rp));
		response.end();
	}
}

function search(response,request){
	var url_parts = url.parse(request.url, true);
	var query = url_parts.query;
	var lc = "";
	if(query.term){
		lc = query.term.toLowerCase();
	}	
	//TODO What happens why query.a is empty. test various scenarios
	var peopleSuggestions = [];
	suggestMatchesFrom(ppl.people,peopleSuggestions,lc);
	var filmSuggestions = [];
	suggestMatchesFrom(flm.films,filmSuggestions,lc);
/*
	console.log(peopleSuggestions);
	console.log(filmSuggestions);
	console.log(query);
*/
	var suggestions = [];
/*
	suggestions['people'] = peopleSuggestions;
	suggestions['films'] = filmSuggestions;
*/
	
	for (var i=0; i<peopleSuggestions.length;i++){
		var sugg = {};
		sugg['label'] = peopleSuggestions[i];
		sugg['category'] = 'People';
		suggestions.push(sugg);
	}
	
	for (var i=0; i<filmSuggestions.length;i++){
		var sugg = {};
		sugg['label'] = filmSuggestions[i];
		sugg['category'] = 'Films';
		suggestions.push(sugg);
	}
	
	response.writeHead(200, {"Content-Type": "application/json"});
	response.write(JSON.stringify(suggestions));
	response.end();
}

function suggestMatchesFrom(sourceArray,suggestions,query){
	if(query){
		
		var foundPerson = false;
		var max = sourceArray.length - 1;
		var min = 0;
		var closest = -1;
		while(max>=min){
			var mid = Math.floor((max + min)/2);
			var person = sourceArray[mid];
			while(typeof person.n === "undefined"){
				mid +=1;
				person = sourceArray[mid];
				if(mid>max){
					break;
				}
			}
			
			if(typeof person.n === "undefined"){
// 				console.log("Breaking because couldn't find name.");
				break;
			}else{
				if(closest === -1){
					closest = mid;
				}
			}
			
// 			console.log("lcing: " + person.n);
			var lc = person.n.toLowerCase();
			if(lc < query){
				min = mid + 1;
// 				console.log("Examining: " + person.n + " is too low");

			}else if(lc > query){
				max = mid - 1;
// 				console.log("Examining: " + person.n + " is too high");
			}else {
				foundPerson = true;
				break;
			}
			
			closest = mid;
		}
		
		if(foundPerson){
			//TODO Add some results to the returned object
			for(var i=0; i<10;i++){
				if(mid+i > sourceArray.length -1){
					break;
				}
				suggestions.push(sourceArray[mid+i].n);
			}
		}else{
			for(var i=0; i<10;i++){
				if(closest+i > sourceArray.length -1){
					break;
				}
				suggestions.push(sourceArray[closest+i].n);
			}
		}
	}
}

function createSmallerFilmFile(callback){
	var filmDataFileName = './data/filmdata.json';
	fs.readFile(filmDataFileName,'utf8',function(err,data){
		if(err){
			console.log("Shut down due to error reading film data file:"+err);
			process.exit();
		}else{
			var filmData = JSON.parse(data);
			var filmArray = filmData.films.film;
			
			var filmNamesToResource = {};
			var filmResourceNameToResource = {};
			var films = [];
			for(var i=0; i<filmArray.length;i++){
				var f = {};
				var film = filmArray[i];
				for (var property in film){
					if(property==='resource'){
						f['r'] = film.resource;
						f['n'] = decodeURIComponent((film.resource.toString().split("_").join(" ")).toLowerCase());

					}else if(property==='director'){
						f['d'] = stripResourcesFromFilmObjectAndReturnArray(film.director);
					}else if(property==='name'){
/*
						var name = objectToArray(film.name)[0].resource;
						name = cleanFilmName(name);
						f['n'] = name;
*/
					}else if(property==='starring'){
						f['s'] = stripResourcesFromFilmObjectAndReturnArray(film.starring);
					}else if(property==='producer'){
						f['p'] = stripResourcesFromFilmObjectAndReturnArray(film.producer);
					}else if(property==='musicComposer'){
						f['m'] = stripResourcesFromFilmObjectAndReturnArray(film.musicComposer);
					}else if(property==='cinematography'){
						f['c'] = stripResourcesFromFilmObjectAndReturnArray(film.cinematography);
					}else if(property==='editing'){
						f['e'] = stripResourcesFromFilmObjectAndReturnArray(film.editing);
					}else if(property==='narrator'){
						f['t'] = stripResourcesFromFilmObjectAndReturnArray(film.narrator);
					}else if(property==='writer'){
						f['w'] = stripResourcesFromFilmObjectAndReturnArray(film.writer);
					}
				}
				films.push(f);
			}

			films.sort(compareNames);
			for(var i=0;i<films.length;i++){
				if(films[i].n){
					filmNamesToResource[films[i].n] = i;
				}
				filmResourceNameToResource[films[i].r] = i;
			}

			var flmFile = {};
			flmFile['films'] = films;
			flmFile['filmsNamesToResource'] = filmNamesToResource;
			flmFile['filmResourceNameToResource'] = filmResourceNameToResource;

			fs.writeFile("./data/flm.json", JSON.stringify(flmFile), function(err3) {
			    if(err3) {
			        console.log(err3);
			        process.exit();
			    } else {
			        console.log("The film file was saved!");
			        flm = require("./data/flm.json");
			        callback();
			    }
			}); 
		}
	});
}

function cleanFilmName(object){
	var qTokens = object.split("\"");
	var out = "";
	for(var i=1;i<qTokens.length-1;i++){
		out+=qTokens[i];
	}
	
	return out;
}

function stripResourcesFromFilmObjectAndReturnArray(object){
	var abject = objectToArray(object);
	var array = [];
	for (var i=0; i<abject.length;i++){
		var current = abject[i].resource;
		var splitOnSlash = current.split('/');
		if(splitOnSlash.length > 0){
			var last = splitOnSlash[splitOnSlash.length-1];
			var afterRemovingTriangle = last.substring(0,last.length-1);
			var personIndex = ppl.personResourceNameToResource[afterRemovingTriangle];
			array.push(personIndex);
		}
	}

	return array;
}

function createSmallerPersonFile(callback){
	var personDataFileName = './data/peopleData.json';
	fs.readFile(personDataFileName,'utf8',function(err2,data2){
		if(err2){
			console.log("Shut down due to error reading person data file:"+err2);
			process.exit();
		}else{
			var personNamesToResource = {};
			var personResourceNameToResource = {};
			var people = [];
			var personData = JSON.parse(data2);
			var persons = personData.persons.person;
			for(var i=0; i<persons.length;i++){
				var person = persons[i];
				var p = {};
				for (var property in person){
					if(property === 'resource'){
						p['r'] = person.resource;
						p['n'] = decodeURIComponent((person.resource.split("_").join(" ")).toLowerCase());
					}else if(property === 'name'){
/*
						var name = person.name;
						if(name!=""){
							var tokens = name.split("\"");
							if(tokens.length>0){
								name = tokens[1];
								personNamesToResource[name] = i;
								p['n'] = name;
							}
						}
*/
					}else if(property === 'birthDate'){
						if(person.birthDate!=""){
							var bd = person.birthDate;
							var splitOnQuotes = bd.split("\"");
							if(splitOnQuotes.length>0){
								bd = splitOnQuotes[1];
								var splitOnDash = bd.split("-");
								if(splitOnDash.length>0){
									bd = splitOnDash[0];
									if(bd.length===4){
										p['b']=bd;
									}
								}
							}
						}
					}else if(property==='director'){
						var ds = objectToArray(person.director.film);
						p['d'] = filmObjectToArray(ds);
					}else if(property==='producer'){
						var pr = objectToArray(person.producer.film);
						p['p'] = filmObjectToArray(pr);
					}else if(property==='writer'){
						var wr = objectToArray(person.writer.film);
						p['w'] = filmObjectToArray(wr);
					}else if(property==='starring'){
						var st = objectToArray(person.starring.film);
						p['s'] = filmObjectToArray(st);
					}else if(property==='musicComposer'){
						var mc = objectToArray(person.musicComposer.film)
						p['m'] = filmObjectToArray(mc);
					}else if(property==='narrator'){
						var nr = objectToArray(person.narrator.film);
						p['t'] = filmObjectToArray(nr);
					}else if(property==='cinematography'){
						var cn = objectToArray(person.cinematography.film);
						p['c'] = filmObjectToArray(cn); 
					}else if(property==='editing'){
						var ed = objectToArray(person.editing.film);
						p['e'] = filmObjectToArray(ed);
					}
				}
				people.push(p);
			}
			
			people.sort(compareNames);
			for(var i=0;i<people.length;i++){
				if(people[i].n){
					personNamesToResource[people[i].n] = i;
				}
				personResourceNameToResource[people[i].r] = i;
			}
			var pplFile = {};
			pplFile['people'] = people;
			pplFile['personNamesToResource'] = personNamesToResource;
			pplFile['personResourceNameToResource'] = personResourceNameToResource;
			
			fs.writeFile("./data/ppl.json", JSON.stringify(pplFile), function(err3) {
			    if(err3) {
			        console.log(err3);
			        process.exit();
			    } else {
			        console.log("The file was saved!");
			        ppl = require("./data/ppl.json");
					createSmallerFilmFile(callback)
			    }
			}); 

		}
	});
}

function compareNames(a,b) {
	
	if(!a.n&&!b.n){
		return 0;
	}else if(!a.n){
		return -1;
	}else if(!b.n){
		return 1;
	}
	
	if (a.n < b.n)
		return -1;
	if (a.n > b.n)
		return 1;
	return 0;
}

function staticResource(response,request,mimeType,dictionary){
	var pathname = url.parse(request.url).pathname;
// 	console.log("Received request for: " + pathname);
	if (pathname in dictionary){
		var fileName = dictionary[pathname];
		fs.readFile(fileName, 'utf8', function(err, data) {
			if (err){ 
				console.log("Error reading" + fileName +": " + err);
				response.writeHead(500,{"Content-Type": "text/plain"});
				response.write("There was an internal server error.");
				response.end();
			}else{
				response.writeHead(200,{"Content-Type": + mimeType});
				response.write(data);
				response.end();
			}
		});
	}else{
		console.log("Request for missing path:" + pathname);
		//TODO Need to update this. Add 404 page or something.
		response.writeHead(404, {"Content-Type": "text/plain"});
		response.write("404 Not Found");
		response.end();
	}
}

function script(response,request){
	staticResource(response,request,mimeTypes['js'],scripts);
}

function page(response,request){
	staticResource(response,request,mimeTypes['html'],pages);
}

function template(response,request){
	staticResource(response,request,mimeTypes["text/x-handlebars-template"],templates);
}

function objectToArray(object){
	if(!Array.isArray(object)){
		object = [].concat(object);
	}
	return object;
}

function filmObjectToArray(object){
	var des = [];
	for (var i=0; i<object.length;i++){
		des.push(object[i].resource)
	}
	return des;
}

exports.page = page;
exports.getPages = getPages;
exports.script = script;
exports.getScripts = getScripts;
/*
exports.getQuestionsForMathTest = getQuestionsForMathTest;
exports.getQuestionsForChemTest = getQuestionsForChemTest;
exports.getQuestionsForPhysTest = getQuestionsForPhysTest;
*/
exports.getTemplates = getTemplates;
exports.template = template;
exports.getReady = loadData;
exports.search = search;
exports.displayInfo = displayInfo;