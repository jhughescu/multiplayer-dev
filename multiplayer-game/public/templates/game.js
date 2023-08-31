(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['game.hbs'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div id='game'>\r\n    <!--    <p>This is the player client, it requires a master before it can init</p>    -->\r\n    <p id='stakeholder'></p>\r\n    <p id='playerID'>playerID</p>\r\n    <p id='gameTimer'>timer</p>\r\n    <p id='active'></p>\r\n    <p id='message'></p>\r\n    <p id='votesRemaining'></p>\r\n    <p id='votesReceived'></p>\r\n    <p id='status' style='display: none;'></p>\r\n    <div id='voting' style='display: none;'>\r\n        voting booth:\r\n    </div>\r\n</div>\r\n";
},"useData":true});
})();
