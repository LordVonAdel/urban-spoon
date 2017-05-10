teamNames = ["Alpha","Bravo","Charlie","Delta"];

Lobby = {
  show: function(){
    $('.panel').hide(100);
    $('#panelLobby').show(100);
  },
  init: function(){
    socket.on('lobby',function(data){
      var panel = $('#panelLobby') //jQuery object
      var html = "<h2>Lobby - "+data.name+"</h2><table><tr>"
      var maxTeamSize = 0;
      for(var i=0; i<data.teams.length; i++){
        maxTeamSize = Math.max(maxTeamSize,data.teams[i].length);
        html+="<th>"+teamNames[i]+"</th>"
      }
      panel.append("</tr>")
      for(var i=0; i<maxTeamSize; i++){
        html+="<tr>"
        for(var j=0; j<data.teams.length; j++){
          var playerName = data.teams[j][i] || "";
          html+="<td>"+playerName+"</td>"
        }
        html+="</tr>"
      }
      html += "</table>"
      panel.html(html)
    });
  }
}