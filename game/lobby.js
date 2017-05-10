teamNames = [
  "Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India",
  "Juliett","Kilo","Lima","Mike","November","Oscar","Papa","Quebec","Romeo",
  "Sierra","Tango","Uniform","Victor","Whiskey","X-Ray","Yankee","Zulu"
];

Lobby = {
  show: function(){
    $('.panel').hide(100);
    $('#panelLobby').show(100);
  },
  init: function(){
    socket.on('lobby',function(data){
      if(isInLobby == false){
        isInLobby = true;
        Lobby.show();
      }
      $("#lobbyTitle").html("Lobby - "+data.name);
      var html = "<table><tr>"
      var maxTeamSize = 0;
      for(var i=0; i<data.teams.length; i++){
        maxTeamSize = Math.max(maxTeamSize,data.teams[i].length);
        html+="<th>"+teamNames[i]+"</th>";
      }
      html += "</tr>";
      for(var i=0; i<maxTeamSize; i++){
        html+="<tr>";
        for(var j=0; j<data.teams.length; j++){
          var playerName = data.teams[j][i] || "";
          html+="<td>"+playerName+"</td>";
        }
        html+="</tr>";
      }
      html += "</table>";
      $('#lobbyTable').html(html);
    });
  }
}