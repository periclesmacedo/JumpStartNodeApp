var socket = io.connect('http://localhost');
$(document).ready(function(){
  $('.chat-widget').hide();
  $('#join-chat').click(function(){
    $('#join-chat').hide();
    $('.chat-widget').show();
    socket.emit('joined', {message: "New user to join"});
  });

  socket.on('chat', function(data){
    $('#textarea').append(data.message);
    if(data.username){
      $('#users').append('<span class="label label-success"' + 
        'id="username-' + data.username + '">' + 
        data.username + '</span>');
    }
    if(data.users){
      var userHtml = '';
      data.users.forEach(function(user){
        userHtml += '<span class="label label-success"' + 
          'id="username-' + user + '">' +
          user + '</span>';
      }); 
      $('#users').html(userHtml);
    }
  });

  socket.on('disconnect', function(data){
    $('#username-' + data.username).remove();
  });

  $('#send-chat').click(function(){
    socket.emit('clientChat', {message: $('#input01').val()});
  });
});
