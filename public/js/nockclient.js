$(document).ready(function(){
  $('.uname').blur(function(e){
    $.ajax({
      type: 'GET',
      url: '/api/user/' + $('#signupuname').val()
    }).done(function(found){
      if(found == '1'){
        $('#imagePlaceHolder').html(
        '<img src="http://spbooks.github.io/nodejs1/cross.png"> Username already taken');
        $('.create-button').addClass('disabled');
      }else{
        $('#imagePlaceHolder').html(
        '<img src="http://spbooks.github.io/nodejs1/tick.png"> ');
        $('.create-button').removeClass('disabled').attr(
          'disabled', false);
      }
    });
  });
});
