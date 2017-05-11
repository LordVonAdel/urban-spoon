teamNames = [
  "Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India",
  "Juliett","Kilo","Lima","Mike","November","Oscar","Papa","Quebec","Romeo",
  "Sierra","Tango","Uniform","Victor","Whiskey","X-Ray","Yankee","Zulu"
];

Lobby = {
  show: function(){
    $('.panel').slideUp(100);
    $('#panelLobby').slideDown(100);
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
            html+="<td>"+playerName
            if(playerReady){
              html += " - ready"
            }
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
        $('#lobbySettings input, #lobbySettings select').filter("[name='"+k+"']").val(data.settings[k]);
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
      var obj = {};
      obj[key] = val;
      socket.emit('lobbySetting',obj);
    });
  }
}