(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
Handlebars.partials['playersBasic'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "Wow ";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "list of player IDs\nThat's insane\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"ids") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":3,"column":0},"end":{"line":3,"column":26}}})) != null ? stack1 : "")
    + "\n";
},"useData":true});
Handlebars.partials['publicvoices'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<tr><td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":6,"column":35},"end":{"line":6,"column":41}}}) : helper)))
    + "</td><td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":6,"column":50},"end":{"line":6,"column":59}}}) : helper)))
    + "</td><td><input class='voteVal' id='voteVal_"
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":6,"column":103},"end":{"line":6,"column":109}}}) : helper)))
    + "' style='width: 40px;' oninput='validateVote(this)' type='number' value='0'><button class='buttonVote' id='buttonVote_"
    + alias4(((helper = (helper = lookupProperty(helpers,"id") || (depth0 != null ? lookupProperty(depth0,"id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data,"loc":{"start":{"line":6,"column":227},"end":{"line":6,"column":233}}}) : helper)))
    + "'>Submit</button></td></tr>";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p>OK, I am a Public Voices thing</p>\r\n<div>Votes remaining: <span id='votes' class='highlight'>"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? lookupProperty(depth0,"teamObj") : depth0)) != null ? lookupProperty(stack1,"votes") : stack1), depth0))
    + "</span></div>\r\n<table>\r\n    <tbody>\r\n        <tr><td><b>id</b></td><td><b>title</b></td><td></td></tr>\r\n        "
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"mainTeams") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":6,"column":8},"end":{"line":6,"column":269}}})) != null ? stack1 : "")
    + "\r\n    </tbody>\r\n</table>\r\n\r\n<script>\r\n    setupPV();\r\n//    let vb = $('.buttonVote');\r\n//    let vv = $('.voteVal');\r\n//    let max = 10;\r\n//    let ls = [];\r\n//    let lid = `pv-${getID()}-vote`;\r\n//    const validateVote = (inp) => {\r\n//        const value = parseFloat(inp.value);\r\n//        if (value > max) {\r\n//            inp.value = max;\r\n//        }\r\n//        if (value < (-1 * max)) {\r\n//            inp.value = (-1 * max);\r\n//        }\r\n//    };\r\n//    const submitVote = function (evt) {\r\n//        const vi = $(this).parent().find('.voteVal');\r\n//        let o = {\r\n//            src: player.id,\r\n//            team: player.stakeholderID,\r\n//            targ: parseInt(vi.attr('id').split('_')[1]),\r\n//            v: parseInt(vi.val())\r\n//        };\r\n////        console.log(o);\r\n//        ls[o.targ] = o.v;\r\n//        console.log(ls);\r\n//        localStorage.setItem(lid, ls);\r\n//        $(this).attr('disabled', true);\r\n//        vi.attr('disabled', true);\r\n//        socket.emit('pvStakeholderScore', o);\r\n//    };\r\n//    const initpv = () => {\r\n//        let s = localStorage.getItem(lid);\r\n//        if (s) {\r\n//            s = s.split(',');\r\n//            console.log(typeof(s));\r\n//            s.forEach((v, i) => {\r\n//                console.log(i, v);\r\n//                if (v !== undefined) {\r\n//                    vv[i].value = v;\r\n//                    $(vv[i]).attr('disabled', true);\r\n//                    $(vb[i]).attr('disabled', true);\r\n//                }\r\n//            });\r\n//        }\r\n//    };\r\n//    $('.buttonVote').on('click', submitVote);\r\n//    socket.on('scoreUpdate', (o) => {\r\n//        socket.emit('getPlayer', o.src, (p) => {\r\n//            let v = p.teamObj.votes;\r\n//            $('#votes').html(v);\r\n//            max = v;\r\n//            vv.each((i, el) => {\r\n//                if (!$(el).prop('disabled')) {\r\n//                    validateVote(el);\r\n//                }\r\n//            })\r\n//            if (v <= 0) {\r\n//                $('#votes').addClass('false');\r\n//                vb.attr('disabled', true);\r\n//                vv.attr('disabled', true);\r\n//            }\r\n//        });\r\n//    });\r\n//    console.log('can we get started?: ' + localStorage.getItem(lid));\r\n//    initpv();\r\n</script>";
},"useData":true});
Handlebars.partials['stakeholder'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "This is the standard stakeholder template";
},"useData":true});
Handlebars.partials['unassigned'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "Oh no, I am NOT ASSIGNED";
},"useData":true});
})();
