var http = require('http');
var cachedFilmImageData = {};

function getFilmPosterLinks(films,callback){
	var number = films.length;
	var checked = 0;
	var filmObj = {};
	for(var i=0;i<films.length;i++){
		var film = films[i];
		if(cachedFilmImageData[film]){
			checked++;
			filmObj[film] = cachedFilmImageData[film];

			if(checked===number){
				callback(filmObj);
			}

		}else{
			firstRequest(film,function(data){
				checked++;
				var filmData = {};
				if(data.found){
					filmData['u']=data.url;
				}

				filmData['f'] = data.found;
				filmObj[data.resourceName] = filmData;
				cachedFilmImageData[data.resourceName] = filmData;
				if(checked===number){

					callback(filmObj);
				}
			});
		}

	}
}

function firstRequest(resourceName,callback){
	request(resourceName,callback,'/w/api.php?action=query&titles=','&prop=pageimages&format=json',true,'');
}

function secondRequest(filename,resourceName,callback){
	request(resourceName,callback,'/w/api.php?action=query&titles=File:','&prop=imageinfo&iiprop=url&format=json',false,filename);
}

function request(resourceName,callback,pathPrefix,pathSuffix,isFirst,filename){

	var foo = '';
	if(isFirst){
		foo = resourceName;
	}else{
		foo = filename;
	}

	var request_options =
	{
	    host: 'en.wikipedia.org',
	    headers: {'user-agent': 'MyAwesomeImageDl/1.1 (http://example.com/MyCoolTool/; myemail@icloud.com) BasedOnSuperLib/1.4'},
	    path: pathPrefix+foo+pathSuffix
	};

	http.get(request_options, function(res) {
		var body='';
		res.on('data', function(chunk) {
		    body += chunk;
		});

		res.on('end', function() {
			if(body.length>2){
				var data = JSON.parse(body);
			    if(isFirst){
				    gotFirstRequest(callback,data,resourceName);
			    }else{
				    gotSecondRequest(callback,data,resourceName,filename);
			    }
			}else{
// 				console.log("Missing body for: " + foo + "isFirst:" + isFirst);
				var didntFindObject = {'found':false,'resourceName':resourceName};
				callback(didntFindObject);
			}
		});

	}).on('error', function(e) {
		console.log("Got error: " + e.message);
		var didntFindObject = {'found':false,'resourceName':resourceName};
		callback(didntFindObject);
		//TODO send an email when error occurred.
	});
}

function gotFirstRequest(callback,data,resourceName){
	var found = false;
	if(data.query){
	    if(data.query.pages){
		    for(var property in data.query.pages){
			    if(data.query.pages[property].pageimage){
				    var filename = data.query.pages[property].pageimage;
					found = true;
				    secondRequest(filename,resourceName,callback);
			    }
			    break;
		    }
	    }
    }

    if(!found){
	    var didntFindObject = {'found':false,'resourceName':resourceName};
		callback(didntFindObject);
    }
}

function gotSecondRequest(callback,data,resourceName,filename) {
	var found = false;
    if (data.query) {
        if (data.query.pages) {
            for (var property in data.query.pages) {
                if (data.query.pages[property].imageinfo) {
                    var boo = data.query.pages[property].imageinfo;
                    boo = objectToArray(boo);
                    if (boo.length > 0) {
                        var first = boo[0];
                        if (first.url) {
	                        found = true;
	                        var foundObject = {'found':true,'resourceName':resourceName,'url':first.url};
                            callback(foundObject);
                        }
                    }
                }
                break;
            }
        }
    }

    if(!found){
	    var didntFindObject = {'found':false,'resourceName':resourceName};
		callback(didntFindObject);
    }
}

function objectToArray(object){
	if(!Array.isArray(object)){
		object = [].concat(object);
	}
	return object;
}

exports.getFilmPosterLinks = getFilmPosterLinks;
