(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['admin'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = container.invokePartial(lookupProperty(partials,"playersBasic"),depth0,{"name":"playersBasic","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n    <title>Master</title>\r\n    <script src=\"https://code.jquery.com/jquery-3.7.0.js\" integrity=\"sha256-JlqSTELeR4TLqP0OG9dxM7yDPqX1ox/HfgiSLBj8+kM=\" crossorigin=\"anonymous\"></script>\r\n        <script src=\"/socket.io/socket.io.js\"></script>\r\n<!--    <script src=\"https://cdn.socket.io/4.5.4/socket.io.min.js\"></script>-->\r\n    <link rel='stylesheet' href='css/basics.css'>\r\n    <link rel='stylesheet' href='css/master.css'>\r\n</head>\r\n\r\n<body>\r\n    <h1>Master "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"me") || (depth0 != null ? lookupProperty(depth0,"me") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"me","hash":{},"data":data,"loc":{"start":{"line":16,"column":15},"end":{"line":16,"column":21}}}) : helper)))
    + "</h1>\r\n    <p>This is the master client, it listens for player connections</p>\r\n    <p id='message'></p>\r\n    <button id='startSession'>Start Session</button>\r\n    <button id='endSession'>End Session</button>\r\n    <div id='players'></div>\r\n\r\n    <div>\r\n        <div id='controlPaanel'>\r\n            "
    + ((stack1 = lookupProperty(helpers,"with").call(alias1,(depth0 != null ? lookupProperty(depth0,"playersBasic") : depth0),{"name":"with","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":25,"column":12},"end":{"line":25,"column":60}}})) != null ? stack1 : "")
    + "\r\n        </div>\r\n    </div>\r\n\r\n\r\n    <script>\r\n        const socket = io();\r\n        const PINGBTN = `pingbtn-`;\r\n        const RESETBTN = `resetbtn-`;\r\n\r\n        socket.on('connect', () => {\r\n            socket.emit('nowIAmTheMaster');\r\n        });\r\n        socket.on('onPlayerConnect', (msg) => {\r\n            onPlayerConnect(msg);\r\n        });\r\n        socket.on('onGetPlayers', (msg) => {\r\n//            console.log('I hear onGetPlayers')\r\n            onGetPlayers(msg);\r\n        });\r\n        socket.on('onGetPlayerIDs', (msg) => {\r\n//            console.log('I hear onGetPlayerIDs')\r\n            onGetPlayerIDs(msg);\r\n        });\r\n        socket.on('updatePlayers', (arr) => {\r\n//            console.log('I hear updatePlayers')\r\n            onGetPlayerIDs(arr);\r\n        });\r\n        socket.on('newPlayer', (players) => {\r\n            newPlayer(players);\r\n        });\r\n        const buttonSetup = () => {\r\n            let b = document.getElementsByClassName('pingBtn');\r\n            [...b].forEach((bu) => {\r\n                bu.addEventListener('click', (evt) => {\r\n                    let id = evt.target.id.replace(PINGBTN, '');\r\n                    socket.emit('playerPing', id);\r\n                });\r\n            });\r\n            b = document.getElementsByClassName('resetBtn');\r\n            [...b].forEach((bu) => {\r\n                bu.addEventListener('click', (evt) => {\r\n                    let id = evt.target.id.replace(RESETBTN, '');\r\n                    socket.emit('playerReset', id);\r\n                });\r\n            });\r\n        };\r\n        let ssb = document.getElementById('startSession');\r\n        ssb.addEventListener('click', (evt) => {\r\n            console.log('cow');\r\n            socket.emit('startNewSession', function (s) {\r\n                console.log('mooooooooooooooooooooo');\r\n            });\r\n        });\r\n        let esb = document.getElementById('endSession');\r\n        esb.addEventListener('click', (evt) => {\r\n            socket.emit('adminTerminateSession');\r\n        });\r\n        const playerDisplay = (p, i) => {\r\n            var e = document.getElementById('players');\r\n            var s = '';\r\n            s += `<div class='${p.active ? 'active' : 'inactive'}'>${p.id} <button class=\"pingBtn\" id=\"${PINGBTN}${p.id}\">Ping</button>`;\r\n            s += `<button class=\"resetBtn\" id=\"${RESETBTN}${p.id}\">Reset</button></div>`;\r\n            e.innerHTML += s;\r\n        };\r\n        const clearPlayers = () => {\r\n            document.getElementById('players').innerHTML = ``;\r\n        };\r\n        const onPlayerConnect = (msg) => {\r\n            document.getElementById('message').innerHTML += `<p>player ${msg} has connected</p>`;\r\n        };\r\n        const onGetPlayers = (arr) => {\r\n//            console.log('onGetPlayers');\r\n//            console.log(arr);\r\n            clearPlayers();\r\n            document.getElementById('players').innerHTML = '<b>players:</b>';\r\n            for (var i = 0; i < arr.length; i++) {\r\n                playerDisplay(arr[i], i);\r\n//                console.log(players);\r\n//                console.log(arr[i]);\r\n            }\r\n            buttonSetup();\r\n        };\r\n        const onGetPlayerIDsOld = (arr) => {\r\n            console.log('onGetPlayerIDs');\r\n            console.log(arr);\r\n            clearPlayers();\r\n            document.getElementById('players').innerHTML = '<b>players:</b>';\r\n            for (var i = 0; i < arr.length; i++) {\r\n                playerDisplay(arr[i], i);\r\n//                console.log(players);\r\n                console.log(arr[i]);\r\n            }\r\n            buttonSetup();\r\n        };\r\n        const newPlayer = (id) => {\r\n            socket.emit('getPlayerIDs');\r\n        };\r\n        const updateSession = () => {\r\n            socket.emit('updateSession');\r\n        };\r\n        window.updateSession = updateSession;\r\n        socket.emit('getPlayerIDs');\r\n//        socket.emit('getPlayers');\r\n\r\n    </script>\r\n</body>\r\n\r\n</html>\r\n";
},"usePartial":true,"useData":true});
templates['game'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div id='game'>\r\n    <!--    <p>This is the player client, it requires a master before it can init</p>    -->\r\n    <p id='stakeholder'></p>\r\n    <p id='playerID'>playerID: "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"playerID") || (depth0 != null ? lookupProperty(depth0,"playerID") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"playerID","hash":{},"data":data,"loc":{"start":{"line":4,"column":31},"end":{"line":4,"column":43}}}) : helper)))
    + "</p>\r\n    <p id='gameTimer'></p>\r\n    <p id='active'></p>\r\n    <p id='message'></p>\r\n    <p id='votesRemaining'></p>\r\n    <p id='votesReceived'></p>\r\n    <p id='status' style='display: none;'></p>\r\n    <div id='voting' style='display: none;'>\r\n        voting booth:\r\n    </div>\r\n</div>\r\n<script>\r\n    console.log('i am him');\r\n</script>\r\n";
},"useData":true});
templates['newlogin'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div id='login'>\r\n    <p>If you have a session ID you can enter it here to join the session</p>\r\n    <input type='number' id='seshnum' placeholder='enter code...' value='"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"value") || (depth0 != null ? lookupProperty(depth0,"value") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"value","hash":{},"data":data,"loc":{"start":{"line":3,"column":73},"end":{"line":3,"column":82}}}) : helper)))
    + "'><button id='enter'>Join session</button>\r\n</div>\r\n<script>\r\n    console.log('i am him');\r\n    const requestSession = () => {\r\n        socket.emit('requestSession', {session: txt.val(), player: staticID});\r\n    };\r\n    butt = $('#enter');\r\n    txt = $('#seshnum');\r\n    butt.on('click', () => {\r\n        requestSession();\r\n    });\r\n    txt.on('keydown', (ev) => {\r\n        if (ev.keyCode === '13') {\r\n            requestSession();\r\n        }\r\n    });\r\n    txt.focus();\r\n</script>\r\n";
},"useData":true});
templates['playersBasic'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "<p>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</p>\r\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "list of player IDs\r\nThat's insane\r\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"ids") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":3,"column":0},"end":{"line":5,"column":9}}})) != null ? stack1 : "");
},"useData":true});
templates['layouts/backup'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<!DOCTYPE html>\r\n<html>\r\n\r\n<head>\r\n    <title>Default HB template</title>\r\n</head>\r\n\r\n<body>\r\n    <h3>Oh no</h3>\r\n    <p>Looks like you are trying use a Handlebars template which doesn't exist. This is the backup template.</p>\r\n</body>\r\n\r\n</html>\r\n";
},"useData":true});
templates['partials/playersBasic'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "Wow ";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "list of player IDs\r\nThat's insane\r\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"ids") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":3,"column":0},"end":{"line":3,"column":26}}})) != null ? stack1 : "");
},"useData":true});
})();
