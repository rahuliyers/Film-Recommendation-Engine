var pn = $("#pn").html();
var pt = $("#pCV").html();
var flm = $("#flm").html();
var pntemplate = Handlebars.compile(pn);
var template = Handlebars.compile(pt);
var flmTemplate = Handlebars.compile(flm);

$.widget("custom.catcomplete", $.ui.autocomplete, {
    _create: function() {
        this._super();
        this.widget().menu("option", "items", "> :not(.ui-autocomplete-category)");
    },
    _renderMenu: function(ul, items) {
        var that = this,
            currentCategory = "";
        $.each(items, function(index, item) {
            var li;
            if (item.category != currentCategory) {
                ul.append("<li class='ui-autocomplete-category'>" + item.category + "</li>");
                currentCategory = item.category;
            }
            li = that._renderItemData(ul, item);
            if (item.category) {
                li.attr("aria-label", item.category + " : " + item.label);
            }
        });
    },
});

$(function() {

    $("#search").catcomplete({
        delay: 0,
        source: "search",
        select: function(event, ui) {
            ajax.get("/displayInfo", {
                a: ui.item.value
            }, displayInfo, true);
        }
    });
});

function onClickLink(resource){
	ajax.get("/displayInfo", {
                a: resource
            }, displayInfo, true);
}

function displayInfo(data) {
    var o = JSON.parse(data);
	var mainNode = document.getElementById("main");
	var totalHtml = " ";
	while (mainNode.firstChild) {
    	mainNode.removeChild(mainNode.firstChild);
	}
 	if(o.m){
 		var roleNames = {};
	 	roleNames['s'] = "Starring";
	 	roleNames['d'] = "Direction";
	 	roleNames['p'] = "Production";
	 	roleNames['m'] = "Music";
	 	roleNames['c'] = "Cinematography";
	 	roleNames['e'] = "Editing";
	 	roleNames['t'] = "Narration";
	 	roleNames['w'] = "Writing";
	 	
	 	
	 	if(o.t==='p'){
		 	//Person
 			var personContext = {name:o.p.n};
			var personContextHtml = pntemplate(personContext);
			totalHtml = "" + personContextHtml;
		 	var urls = o.u;

		 	var out = {};
		 	
		 	for (var pr in o.p){
				if(pr==='s' || pr==='d'|| pr==='p' || pr==='m' || pr==='c' || pr==='e' || pr==='t' ||pr==='w'){
					var films = objectToArray(o.p[pr]);
					var ftr = [];
					var filmsWithoutPosters = [];
					for(var i=0; i<films.length;i++){
						var boo = {};
						var cf = films[i];
						
						boo['r'] = cf.split("_").join(" ");
						if(urls[cf].f){
							boo['u'] = urls[cf]['u'];
							boo['link'] = '"'+addslashes(boo['r'])+'"';
							ftr.push(boo);
						}else{
							boo['u'] = '#';
							boo['link'] = '"'+addslashes(boo['r'])+'"';
							filmsWithoutPosters.push(boo);
						}
					}				
					var context = {role:roleNames[pr],ftr:ftr,wtr:filmsWithoutPosters};
					var html = template(context);
					out[pr] = html;
				}
			}
			
			if(out['s']){
				totalHtml += out['s'];
			}
						if(out['d']){
				totalHtml += out['d'];
			}
						if(out['p']){
				totalHtml += out['p'];
			}
						if(out['m']){
				totalHtml += out['m'];
			}
						if(out['c']){
				totalHtml += out['c'];
			}
						if(out['e']){
				totalHtml += out['e'];
			}
						if(out['t']){
				totalHtml += out['t'];
			}
						if(out['w']){
				totalHtml += out['w'];
			}
	 	}else if(o.t==='f'){
		 	var nme = o.f.n;
		 	var outU = o.u;
		 	var url;
		 	for(var inner in outU){
			 	if(outU[inner].f){
				 	url = outU[inner].u;
				 	break;
			 	}
		 	}
		 	
		 	var roles = [];
		 	for(var pr in o.f){
			 	if(pr==='s' || pr==='d'|| pr==='p' || pr==='m' || pr==='c' || pr==='e' || pr==='t' ||pr==='w'){
				 	var rle = {};
				 	rle['rolename'] = roleNames[pr];
				 	var peeps = o.f[pr];
				 	var prson = [];
				 	for(var j=0;j<peeps.length;j++){
					 	var prs = peeps[j];
					 	prs['link'] = '"'+addslashes(prs['n'])+'"';
					 	prson.push(prs);
				 	}
				 	rle['person'] = prson;
				 	roles.push(rle);
			 	}
		 	}
		 	
		 	var context;
		 	if(typeof url === "undefined"){
			 	context = {name:nme,role:roles,};
		 	}else{
			 	context = {name:nme,role:roles,u:url};
		 	}
		 	
			var html = flmTemplate(context);
			totalHtml += html;
	 	}
 	}else{
	 	//TODO no match.
 	}
 	
 	mainNode.innerHTML = totalHtml;
}

function addslashes( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function objectToArray(object){
	if(!Array.isArray(object)){
		object = [].concat(object);
	}
	return object;
}