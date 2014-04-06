var socket = io.connect('http://localhost');
$(document).ready(function(){
  $('.chat-widget').hide();
  $('#join-chat').click(function(){
    $('#join-chat').hide();
    $('.chat-widget').show();
    socket.emit('joined', {});
  });
  socket.on('chat', function(data){
    $('#textarea').prepend(data.message);
  });
});
