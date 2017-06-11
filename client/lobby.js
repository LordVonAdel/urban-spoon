teamNames = [
  "Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India",
  "Juliett","Kilo","Lima","Mike","November","Oscar","Papa","Quebec","Romeo",
  "Sierra","Tango","Uniform","Victor","Whiskey","X-Ray","Yankee","Zulu"
];
teamColors = [
  "#5050dd", "#aa5050", "#50aa50", "#dada40", "#900090","#40dada", "#d4af37", "#401010"
];

Lobby = {
  show: function(){
    $('.panel').slideUp(100);
    $('#panelLobby').slideDown(100);
    $('.loginError').html("");
  },
  init: function(){
    socket.on('lobby',function(data){
      if(isInLobby == false){
        isInLobby = true;
        Lobby.show();
      }
      $("#lobbyTitle").html("Lobby - "+data.name+"<span style='float: right;'>You are "+me.name+"</span>");
      var html = "<table><tr>"
      var maxTeamSize = 0;
      for(var i=0; i<data.teams.length; i++){
        maxTeamSize = Math.max(maxTeamSize,data.teams[i].length);
        html+="<th>"+$("<a team="+i+" class='teamChanger'>"+teamNames[i]+"</a>")[0].outerHTML+"</th>";
      }
      html += "</tr>";
      for(var i=0; i<maxTeamSize; i++){
        html+="<tr>";
        for(var j=0; j<data.teams.length; j++){
          if (i<data.teams[j].length){
            var playerName = data.teams[j][i].name || "";
            var playerReady = data.teams[j][i].ready || "";
            html+="<td><span class='icon-"+(playerReady ? "ready" : "not-ready")+"'></span>"+playerName;
            html+="</td>";
          }else{
            html+="<td></td>";
          }
        }
        html+="</tr>";
      }
      html += "</table>";
      $('#lobbyTable').html(html);
      for(var k in data.settings){
        var element = $('#lobbySettings input, #lobbySettings select').filter("[name='"+k+"']")
        if(element.attr("type")=="checkbox"){
          element.prop('checked', data.settings[k]);
        }else{
          element.val(data.settings[k]);
        }
      }
      $('.teamChanger').click(function(){
        socket.emit('changeTeam',$(this).attr('team')*1);
      });

      if (me.name != data.host){
        $('#lobbySettings input, #lobbySettings select').prop("disabled",true)
      }else{
        $('#lobbySettings input, #lobbySettings select').prop("disabled",false)
      }
    });

    $('#lobbySettings input, #lobbySettings select').on('change',function(){ 
      //if a setting in the lobby are changed send the change to the server
      var key = $(this).attr('name');
      var val = $(this).val();
      if($(this).attr("type")=="checkbox"){
        val = $(this).is(':checked');
      }
      var obj = {};
      obj[key] = val;
      socket.emit('lobbySetting',obj);
    });

    socket.on('end',function(data){
      isInGame = false;
      console.log("Game ends!",data);

      function insertTeams(attr,special){
        var sum = 0;
        for(var i=0; i<teams.length; i++){
          html += "<td style='background-color: "+teamColors[i]+"'>"+teams[i][attr]+(special == 1 ? "%":"")+"</td>";
          sum += teams[i][attr];
        }
        if (special == 1){ //percent values
          html += "<td style='background-color: white; color: black'>"+sum/teams.length+"%</td>";
        }else{
          html += "<td style='background-color: white; color: black'>"+sum+"</td>";
        }
      };

      var html = "<tr><th>Teams</th>"
      var teams = data.teams;
      for(var i=0; i<teams.length; i++){
        html += "<th>"+teamNames[i]+"</th>";
      }
      html+="<th>Total</th></tr>";
      html+="<tr><th>Units build</th>"
      insertTeams("unitsBuild");
      html+="</tr>";
      html+="<tr><th>Units destroyed</th>"
      insertTeams("unitsDestroyed");
      html+="</tr>";
      html+="<tr><th>Units lost</th>"
      insertTeams("unitsLost");
      html+="</tr>";
      html+="<tr><th>Buildings constructed</th>"
      insertTeams("buildingsConstructed");
      html+="</tr>";
      html+="<tr><th>Buildings destroyed</th>"
      insertTeams("buildingsDestroyed");
      html+="</tr>";
      html+="<tr><th>Buildings lost</th>"
      insertTeams("buildingsLost");
      html+="</tr>";
      html+="<tr><th>Damage done</th>"
      insertTeams("damageDone");
      html+="</tr>";
      html+="<tr><th>Damage get</th>"
      insertTeams("damageGet")
      html+="</tr>";
      html+="<tr><th>Energy collected</th>"
      insertTeams("energyCollected");
      html+="</tr>";
      html+="<tr><th>Highest energy level</th>"
      insertTeams("energyHigh");
      html+="</tr>";
      html+="<tr><th>Shots fired</th>"
      insertTeams("shotsFired");
      html+="</tr>";
      html+="<tr><th>Shot accuracy</th>"
      insertTeams("shotAccuracy",1);
      html+="</tr>";

      $('#statsTable').html(html);
      if (data.winner != -1){
        $('#statsWinner').html("The winning team is "+teamNames[data.winner]+"!");
      }else{
        $('#statsWinner').html("No team won!");
      }

      showPanel('panelStats');

    });
  }
}